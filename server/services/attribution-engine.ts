/**
 * Attribution Engine Service
 *
 * Phase 7B: Outcome Stream & Attribution
 *
 * Provides real-time attribution of outcomes to prior engagement actions,
 * supporting multiple attribution models and decay functions for accurate
 * feedback loop learning.
 */

import { db } from "../db";
import { eq, and, gte, lte, desc, sql, isNull, lt } from "drizzle-orm";
import {
  stimuliEvents,
  outcomeEvents,
  attributionConfig,
  predictionStaleness,
  outcomeAttributions,
  hcpProfiles,
  type Channel,
  type AttributionModel,
  type DecayFunction,
  type AttributableAction,
  type AttributionResult,
  type StalenessReport,
  type OutcomeVelocity,
  type InsertOutcomeEvent,
  type InsertOutcomeAttribution,
  type InsertPredictionStaleness,
  type RecordOutcomeWithAttributionRequest,
  type OutcomeType,
  type PredictionType,
  outcomeTypes,
  predictionTypes,
} from "@shared/schema";

// Default attribution config values per channel
const DEFAULT_ATTRIBUTION_CONFIG: Record<
  string,
  { windowDays: number; decayFunction: DecayFunction; multiTouchModel: AttributionModel }
> = {
  email: { windowDays: 7, decayFunction: "exponential", multiTouchModel: "time_decay" },
  rep_visit: { windowDays: 30, decayFunction: "linear", multiTouchModel: "position_based" },
  webinar: { windowDays: 14, decayFunction: "exponential", multiTouchModel: "last_touch" },
  conference: { windowDays: 30, decayFunction: "none", multiTouchModel: "first_touch" },
  digital_ad: { windowDays: 7, decayFunction: "exponential", multiTouchModel: "linear" },
  phone: { windowDays: 14, decayFunction: "linear", multiTouchModel: "last_touch" },
};

// ============================================================================
// Attribution Engine Interface
// ============================================================================

export interface IAttributionEngine {
  // Record and attribute outcomes
  recordOutcome(outcome: RecordOutcomeWithAttributionRequest): Promise<{ outcomeId: string; attribution: AttributionResult }>;

  // Find actions to attribute to
  findAttributableActions(hcpId: string, outcomeType: string, occurredAt: Date): Promise<AttributableAction[]>;

  // Apply attribution model
  attributeOutcome(outcomeId: string, actions: AttributableAction[], channel: string): Promise<AttributionResult>;

  // Multi-touch attribution
  calculateContributions(
    actions: AttributableAction[],
    model: AttributionModel,
    config: { firstTouchWeight?: number; lastTouchWeight?: number; middleTouchWeight?: number }
  ): Record<string, number>;

  // Decay functions
  applyDecay(daysSinceAction: number, decayFunction: DecayFunction, halfLifeDays?: number): number;

  // Staleness tracking
  calculateStaleness(hcpId: string, predictionType: PredictionType): Promise<number>;
  markRefreshNeeded(hcpId: string, predictionType: PredictionType, reason: string): Promise<void>;
  getStalenessReport(): Promise<StalenessReport>;

  // Velocity metrics
  getOutcomeVelocity(periodStart: Date, periodEnd: Date): Promise<OutcomeVelocity>;

  // Attribution config management
  getAttributionConfig(channel: string): Promise<typeof attributionConfig.$inferSelect | null>;
  upsertAttributionConfig(channel: string, config: Partial<typeof attributionConfig.$inferInsert>): Promise<void>;
}

// ============================================================================
// Attribution Engine Implementation
// ============================================================================

class AttributionEngine implements IAttributionEngine {
  /**
   * Record an outcome event and automatically attribute it to prior actions
   */
  async recordOutcome(
    request: RecordOutcomeWithAttributionRequest
  ): Promise<{ outcomeId: string; attribution: AttributionResult }> {
    const eventDate = request.eventDate ? new Date(request.eventDate) : new Date();

    // Insert the outcome event
    const [insertedOutcome] = await db
      .insert(outcomeEvents)
      .values({
        hcpId: request.hcpId,
        outcomeType: request.outcomeType,
        channel: request.channel,
        outcomeValue: request.outcomeValue,
        qualityScore: request.qualityScore,
        contentId: request.contentId,
        contentName: request.contentName,
        eventDate,
        campaignId: request.campaignId,
        stimulusId: request.stimulusId,
        attributionType: request.stimulusId ? "direct" : "assisted",
        attributionWeight: 1.0,
      } as InsertOutcomeEvent)
      .returning();

    // Find attributable actions
    const actions = await this.findAttributableActions(request.hcpId, request.outcomeType, eventDate);

    // If explicit stimulus provided, ensure it's in the list
    if (request.stimulusId && !actions.find((a) => a.stimulusId === request.stimulusId)) {
      const explicitAction = await db.query.stimuliEvents.findFirst({
        where: eq(stimuliEvents.id, request.stimulusId),
      });
      if (explicitAction) {
        const daysSince = Math.floor(
          (eventDate.getTime() - new Date(explicitAction.eventDate).getTime()) / (1000 * 60 * 60 * 24)
        );
        actions.unshift({
          stimulusId: explicitAction.id,
          hcpId: explicitAction.hcpId,
          channel: explicitAction.channel,
          stimulusType: explicitAction.stimulusType,
          eventDate: explicitAction.eventDate.toISOString(),
          daysSinceAction: daysSince,
          predictedEngagementDelta: explicitAction.predictedEngagementDelta,
          predictedConversionDelta: explicitAction.predictedConversionDelta,
        });
      }
    }

    // Attribute the outcome
    const attribution = await this.attributeOutcome(insertedOutcome.id, actions, request.channel);

    // Update prediction staleness for this HCP
    await this.updateStalenessAfterOutcome(request.hcpId, request.outcomeType);

    return { outcomeId: insertedOutcome.id, attribution };
  }

  /**
   * Find actions that could have caused an outcome within the attribution window
   */
  async findAttributableActions(hcpId: string, outcomeType: string, occurredAt: Date): Promise<AttributableAction[]> {
    // Get the channel for this outcome type to determine the attribution window
    const channel = this.getChannelFromOutcomeType(outcomeType);
    const config = await this.getAttributionConfig(channel);
    const windowDays = config?.windowDays ?? DEFAULT_ATTRIBUTION_CONFIG[channel]?.windowDays ?? 14;

    const windowStart = new Date(occurredAt);
    windowStart.setDate(windowStart.getDate() - windowDays);

    // Find all stimuli events for this HCP within the attribution window
    const events = await db
      .select()
      .from(stimuliEvents)
      .where(
        and(
          eq(stimuliEvents.hcpId, hcpId),
          gte(stimuliEvents.eventDate, windowStart),
          lte(stimuliEvents.eventDate, occurredAt)
        )
      )
      .orderBy(desc(stimuliEvents.eventDate));

    return events.map((event) => ({
      stimulusId: event.id,
      hcpId: event.hcpId,
      channel: event.channel,
      stimulusType: event.stimulusType,
      eventDate: event.eventDate.toISOString(),
      daysSinceAction: Math.floor(
        (occurredAt.getTime() - new Date(event.eventDate).getTime()) / (1000 * 60 * 60 * 24)
      ),
      predictedEngagementDelta: event.predictedEngagementDelta,
      predictedConversionDelta: event.predictedConversionDelta,
    }));
  }

  /**
   * Apply attribution model to distribute credit among actions
   */
  async attributeOutcome(
    outcomeId: string,
    actions: AttributableAction[],
    channel: string
  ): Promise<AttributionResult> {
    if (actions.length === 0) {
      return {
        outcomeEventId: outcomeId,
        primaryAttributedActionId: null,
        primaryAttributionConfidence: 0,
        totalContributingActions: 0,
        attributions: [],
        attributionModel: "last_touch",
        windowDays: 14,
      };
    }

    const config = await this.getAttributionConfig(channel);
    const model: AttributionModel = (config?.multiTouchModel as AttributionModel) ??
      DEFAULT_ATTRIBUTION_CONFIG[channel]?.multiTouchModel ?? "last_touch";
    const decayFn: DecayFunction = (config?.decayFunction as DecayFunction) ??
      DEFAULT_ATTRIBUTION_CONFIG[channel]?.decayFunction ?? "none";
    const halfLifeDays = config?.decayHalfLifeDays ?? 7;
    const windowDays = config?.windowDays ?? DEFAULT_ATTRIBUTION_CONFIG[channel]?.windowDays ?? 14;

    // Calculate base contributions based on model
    const baseContributions = this.calculateContributions(actions, model, {
      firstTouchWeight: config?.firstTouchWeight ?? 0.4,
      lastTouchWeight: config?.lastTouchWeight ?? 0.4,
      middleTouchWeight: config?.middleTouchWeight ?? 0.2,
    });

    // Apply decay to contributions
    const decayedContributions: Record<string, { weight: number; decayFactor: number }> = {};
    let totalDecayedWeight = 0;

    for (const action of actions) {
      const decayFactor = this.applyDecay(action.daysSinceAction, decayFn, halfLifeDays);
      const decayedWeight = (baseContributions[action.stimulusId] || 0) * decayFactor;
      decayedContributions[action.stimulusId] = { weight: decayedWeight, decayFactor };
      totalDecayedWeight += decayedWeight;
    }

    // Normalize contributions to sum to 1
    const attributions: AttributionResult["attributions"] = [];
    let primaryId: string | null = null;
    let primaryConfidence = 0;

    for (let i = 0; i < actions.length; i++) {
      const action = actions[i];
      const { weight, decayFactor } = decayedContributions[action.stimulusId];
      const normalizedWeight = totalDecayedWeight > 0 ? weight / totalDecayedWeight : 0;

      // Calculate confidence based on weight and prediction quality
      const confidence = this.calculateAttributionConfidence(action, normalizedWeight);

      if (normalizedWeight > primaryConfidence) {
        primaryConfidence = normalizedWeight;
        primaryId = action.stimulusId;
      }

      // Determine touch position (1 = first, -1 = last, others are middle)
      let touchPosition: number;
      if (i === 0) touchPosition = -1; // Most recent = last touch
      else if (i === actions.length - 1) touchPosition = 1; // Oldest = first touch
      else touchPosition = 0; // Middle

      attributions.push({
        stimulusId: action.stimulusId,
        contributionWeight: normalizedWeight,
        decayFactor,
        confidence,
        touchPosition,
      });

      // Store attribution record
      if (normalizedWeight > 0) {
        await db.insert(outcomeAttributions).values({
          outcomeEventId: outcomeId,
          stimulusId: action.stimulusId,
          attributionModel: model,
          contributionWeight: normalizedWeight,
          daysBetweenTouchAndOutcome: action.daysSinceAction,
          touchPosition,
          totalTouchesInWindow: actions.length,
          decayFactor,
          attributionConfidence: confidence,
        } as InsertOutcomeAttribution);
      }
    }

    // Update the outcome event with primary attribution
    if (primaryId) {
      await db
        .update(outcomeEvents)
        .set({
          stimulusId: primaryId,
          attributionWeight: primaryConfidence,
          touchesInWindow: actions.length,
        })
        .where(eq(outcomeEvents.id, outcomeId));
    }

    return {
      outcomeEventId: outcomeId,
      primaryAttributedActionId: primaryId,
      primaryAttributionConfidence: primaryConfidence,
      totalContributingActions: actions.length,
      attributions,
      attributionModel: model,
      windowDays,
    };
  }

  /**
   * Calculate base contribution weights based on attribution model
   */
  calculateContributions(
    actions: AttributableAction[],
    model: AttributionModel,
    config: { firstTouchWeight?: number; lastTouchWeight?: number; middleTouchWeight?: number }
  ): Record<string, number> {
    const contributions: Record<string, number> = {};
    const n = actions.length;

    if (n === 0) return contributions;

    switch (model) {
      case "first_touch":
        // All credit to the first (oldest) action
        contributions[actions[n - 1].stimulusId] = 1.0;
        break;

      case "last_touch":
        // All credit to the last (most recent) action
        contributions[actions[0].stimulusId] = 1.0;
        break;

      case "linear":
        // Equal credit to all actions
        const equalShare = 1.0 / n;
        for (const action of actions) {
          contributions[action.stimulusId] = equalShare;
        }
        break;

      case "position_based":
        // First and last get higher weight, middle split the rest
        const firstWeight = config.firstTouchWeight ?? 0.4;
        const lastWeight = config.lastTouchWeight ?? 0.4;
        const middleWeight = config.middleTouchWeight ?? 0.2;

        if (n === 1) {
          contributions[actions[0].stimulusId] = 1.0;
        } else if (n === 2) {
          contributions[actions[0].stimulusId] = lastWeight / (firstWeight + lastWeight);
          contributions[actions[1].stimulusId] = firstWeight / (firstWeight + lastWeight);
        } else {
          const middleCount = n - 2;
          const middleShare = middleWeight / middleCount;

          contributions[actions[0].stimulusId] = lastWeight; // Most recent = last touch
          contributions[actions[n - 1].stimulusId] = firstWeight; // Oldest = first touch

          for (let i = 1; i < n - 1; i++) {
            contributions[actions[i].stimulusId] = middleShare;
          }
        }
        break;

      case "time_decay":
        // More recent actions get higher weight (applied separately via decay function)
        // Base distribution is linear, decay is applied later
        const baseShare = 1.0 / n;
        for (const action of actions) {
          contributions[action.stimulusId] = baseShare;
        }
        break;

      default:
        // Default to last touch
        contributions[actions[0].stimulusId] = 1.0;
    }

    return contributions;
  }

  /**
   * Apply decay function to adjust contribution based on time since action
   */
  applyDecay(daysSinceAction: number, decayFunction: DecayFunction, halfLifeDays?: number): number {
    switch (decayFunction) {
      case "none":
        return 1.0;

      case "linear":
        // Linear decay from 1.0 to 0.0 over the half-life period
        const linearDecay = Math.max(0, 1 - daysSinceAction / (halfLifeDays ?? 14));
        return linearDecay;

      case "exponential":
        // Exponential decay: e^(-lambda * t) where lambda = ln(2) / halfLife
        const lambda = Math.log(2) / (halfLifeDays ?? 7);
        return Math.exp(-lambda * daysSinceAction);

      default:
        return 1.0;
    }
  }

  /**
   * Calculate staleness score for a prediction
   */
  async calculateStaleness(hcpId: string, predictionType: PredictionType): Promise<number> {
    // Get existing staleness record
    const existing = await db.query.predictionStaleness.findFirst({
      where: and(
        eq(predictionStaleness.hcpId, hcpId),
        eq(predictionStaleness.predictionType, predictionType)
      ),
    });

    if (!existing) {
      return 0;
    }

    const now = new Date();
    const predictionAge = Math.floor(
      (now.getTime() - new Date(existing.lastPredictedAt).getTime()) / (1000 * 60 * 60 * 24)
    );

    let validationAge = null;
    if (existing.lastValidatedAt) {
      validationAge = Math.floor(
        (now.getTime() - new Date(existing.lastValidatedAt).getTime()) / (1000 * 60 * 60 * 24)
      );
    }

    // Calculate staleness score components
    const ageComponent = Math.min(1, predictionAge / 30); // Max staleness at 30 days
    const validationComponent = validationAge !== null ? Math.min(1, validationAge / 14) : 0.5;
    const driftComponent = existing.featureDriftDetected ? 0.3 : 0;

    // Weighted combination
    const stalenessScore = Math.min(1, ageComponent * 0.4 + validationComponent * 0.4 + driftComponent * 0.2);

    // Update the record
    await db
      .update(predictionStaleness)
      .set({
        predictionAgeDays: predictionAge,
        validationAgeDays: validationAge,
        stalenessScore,
        recommendRefresh: stalenessScore > 0.7,
        refreshReason: stalenessScore > 0.7 ? `Staleness score ${(stalenessScore * 100).toFixed(0)}% exceeds threshold` : null,
        updatedAt: new Date(),
      })
      .where(eq(predictionStaleness.id, existing.id));

    return stalenessScore;
  }

  /**
   * Mark a prediction as needing refresh
   */
  async markRefreshNeeded(hcpId: string, predictionType: PredictionType, reason: string): Promise<void> {
    const existing = await db.query.predictionStaleness.findFirst({
      where: and(
        eq(predictionStaleness.hcpId, hcpId),
        eq(predictionStaleness.predictionType, predictionType)
      ),
    });

    if (existing) {
      await db
        .update(predictionStaleness)
        .set({
          recommendRefresh: true,
          refreshReason: reason,
          updatedAt: new Date(),
        })
        .where(eq(predictionStaleness.id, existing.id));
    } else {
      await db.insert(predictionStaleness).values({
        hcpId,
        predictionType,
        lastPredictedAt: new Date(),
        recommendRefresh: true,
        refreshReason: reason,
      } as InsertPredictionStaleness);
    }
  }

  /**
   * Get staleness report across all predictions
   */
  async getStalenessReport(): Promise<StalenessReport> {
    const allRecords = await db.select().from(predictionStaleness);
    const hcpCount = await db.select({ count: sql<number>`count(distinct ${hcpProfiles.id})` }).from(hcpProfiles);

    const totalHcps = Number(hcpCount[0]?.count ?? 0);
    const hcpsNeedingRefresh = allRecords.filter((r) => r.recommendRefresh).length;
    const avgStalenessScore =
      allRecords.length > 0
        ? allRecords.reduce((sum, r) => sum + (r.stalenessScore ?? 0), 0) / allRecords.length
        : 0;

    // Group by prediction type
    const byType: Record<string, { count: number; totalStaleness: number; refreshCount: number }> = {};
    for (const record of allRecords) {
      const type = record.predictionType;
      if (!byType[type]) {
        byType[type] = { count: 0, totalStaleness: 0, refreshCount: 0 };
      }
      byType[type].count++;
      byType[type].totalStaleness += record.stalenessScore ?? 0;
      if (record.recommendRefresh) byType[type].refreshCount++;
    }

    const stalenessByType = Object.entries(byType).map(([type, data]) => ({
      predictionType: type,
      count: data.count,
      avgStaleness: data.count > 0 ? data.totalStaleness / data.count : 0,
      refreshRecommended: data.refreshCount,
    }));

    const driftDetected = allRecords.filter((r) => r.featureDriftDetected).length;
    const recentlyValidated = allRecords.filter((r) => {
      if (!r.lastValidatedAt) return false;
      const daysSince = Math.floor(
        (Date.now() - new Date(r.lastValidatedAt).getTime()) / (1000 * 60 * 60 * 24)
      );
      return daysSince <= 7;
    }).length;

    return {
      totalHcps,
      hcpsNeedingRefresh,
      avgStalenessScore,
      stalenessByType,
      driftDetected,
      recentlyValidated,
    };
  }

  /**
   * Get outcome velocity metrics
   */
  async getOutcomeVelocity(periodStart: Date, periodEnd: Date): Promise<OutcomeVelocity> {
    const outcomes = await db
      .select()
      .from(outcomeEvents)
      .where(and(gte(outcomeEvents.eventDate, periodStart), lte(outcomeEvents.eventDate, periodEnd)));

    const totalOutcomes = outcomes.length;
    const hoursInPeriod = (periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60);
    const daysInPeriod = hoursInPeriod / 24;

    const outcomesPerHour = hoursInPeriod > 0 ? totalOutcomes / hoursInPeriod : 0;
    const outcomesPerDay = daysInPeriod > 0 ? totalOutcomes / daysInPeriod : 0;

    // Calculate attribution rate
    const attributedOutcomes = outcomes.filter((o) => o.stimulusId !== null).length;
    const attributionRate = totalOutcomes > 0 ? attributedOutcomes / totalOutcomes : 0;

    // Calculate average latency
    let totalLatencyHours = 0;
    let latencyCount = 0;
    for (const outcome of outcomes) {
      if (outcome.daysSinceLastTouch !== null) {
        totalLatencyHours += outcome.daysSinceLastTouch * 24;
        latencyCount++;
      }
    }
    const avgLatencyHours = latencyCount > 0 ? totalLatencyHours / latencyCount : 0;

    // Group by channel
    const byChannel: Record<string, { outcomes: number; attributed: number; totalLatency: number; latencyCount: number }> = {};
    for (const outcome of outcomes) {
      const ch = outcome.channel;
      if (!byChannel[ch]) {
        byChannel[ch] = { outcomes: 0, attributed: 0, totalLatency: 0, latencyCount: 0 };
      }
      byChannel[ch].outcomes++;
      if (outcome.stimulusId) byChannel[ch].attributed++;
      if (outcome.daysSinceLastTouch !== null) {
        byChannel[ch].totalLatency += outcome.daysSinceLastTouch * 24;
        byChannel[ch].latencyCount++;
      }
    }

    const channelMetrics = Object.entries(byChannel).map(([channel, data]) => ({
      channel,
      outcomes: data.outcomes,
      attributionRate: data.outcomes > 0 ? data.attributed / data.outcomes : 0,
      avgLatencyHours: data.latencyCount > 0 ? data.totalLatency / data.latencyCount : 0,
    }));

    // Group by outcome type
    const byType: Record<string, { count: number; attributed: number }> = {};
    for (const outcome of outcomes) {
      const type = outcome.outcomeType;
      if (!byType[type]) {
        byType[type] = { count: 0, attributed: 0 };
      }
      byType[type].count++;
      if (outcome.stimulusId) byType[type].attributed++;
    }

    const typeMetrics = Object.entries(byType).map(([outcomeType, data]) => ({
      outcomeType,
      count: data.count,
      attributionRate: data.count > 0 ? data.attributed / data.count : 0,
    }));

    return {
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
      totalOutcomes,
      outcomesPerHour,
      outcomesPerDay,
      attributionRate,
      avgLatencyHours,
      byChannel: channelMetrics,
      byOutcomeType: typeMetrics,
    };
  }

  /**
   * Get attribution config for a channel
   */
  async getAttributionConfig(channel: string): Promise<typeof attributionConfig.$inferSelect | null> {
    const config = await db.query.attributionConfig.findFirst({
      where: eq(attributionConfig.channel, channel),
    });
    return config ?? null;
  }

  /**
   * Create or update attribution config for a channel
   */
  async upsertAttributionConfig(
    channel: string,
    config: Partial<typeof attributionConfig.$inferInsert>
  ): Promise<void> {
    const existing = await this.getAttributionConfig(channel);

    if (existing) {
      await db
        .update(attributionConfig)
        .set({ ...config, updatedAt: new Date() })
        .where(eq(attributionConfig.id, existing.id));
    } else {
      await db.insert(attributionConfig).values({
        channel,
        windowDays: config.windowDays ?? DEFAULT_ATTRIBUTION_CONFIG[channel]?.windowDays ?? 14,
        decayFunction: config.decayFunction ?? DEFAULT_ATTRIBUTION_CONFIG[channel]?.decayFunction ?? "none",
        multiTouchModel: config.multiTouchModel ?? DEFAULT_ATTRIBUTION_CONFIG[channel]?.multiTouchModel ?? "last_touch",
        ...config,
      });
    }
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private getChannelFromOutcomeType(outcomeType: string): string {
    const channelMap: Record<string, string> = {
      email_open: "email",
      email_click: "email",
      webinar_register: "webinar",
      webinar_attend: "webinar",
      content_download: "digital_ad",
      sample_request: "rep_visit",
      meeting_scheduled: "rep_visit",
      meeting_completed: "rep_visit",
      rx_written: "rep_visit",
      form_submit: "digital_ad",
      call_completed: "phone",
      referral: "conference",
    };
    return channelMap[outcomeType] ?? "email";
  }

  private calculateAttributionConfidence(action: AttributableAction, contributionWeight: number): number {
    // Base confidence from contribution weight
    let confidence = contributionWeight;

    // Boost confidence if there's a prediction that was close
    if (action.predictedEngagementDelta !== null && action.predictedEngagementDelta > 0) {
      confidence = Math.min(1, confidence * 1.2);
    }

    // Reduce confidence for very old actions
    if (action.daysSinceAction > 21) {
      confidence *= 0.8;
    }

    return Math.min(1, Math.max(0, confidence));
  }

  private async updateStalenessAfterOutcome(hcpId: string, outcomeType: string): Promise<void> {
    // Map outcome type to prediction types that should be validated
    const predictionTypeMap: Record<string, PredictionType[]> = {
      email_open: ["engagement", "channel_response"],
      email_click: ["engagement", "channel_response", "conversion"],
      webinar_attend: ["engagement", "conversion"],
      rx_written: ["conversion"],
      meeting_completed: ["engagement"],
    };

    const typesToUpdate = predictionTypeMap[outcomeType] ?? ["engagement"];

    for (const predictionType of typesToUpdate) {
      const existing = await db.query.predictionStaleness.findFirst({
        where: and(
          eq(predictionStaleness.hcpId, hcpId),
          eq(predictionStaleness.predictionType, predictionType)
        ),
      });

      if (existing) {
        await db
          .update(predictionStaleness)
          .set({
            lastValidatedAt: new Date(),
            outcomeCount: (existing.outcomeCount ?? 0) + 1,
            updatedAt: new Date(),
          })
          .where(eq(predictionStaleness.id, existing.id));
      }
    }
  }

  // ============================================================================
  // Feedback Loop Integration
  // ============================================================================

  /**
   * Update a stimuli event with actual outcome values after attribution
   * This closes the feedback loop between predictions and actual results
   */
  async updateStimulusWithOutcome(
    stimulusId: string,
    actualEngagementDelta: number,
    actualConversionDelta?: number
  ): Promise<void> {
    const stimulus = await db.query.stimuliEvents.findFirst({
      where: eq(stimuliEvents.id, stimulusId),
    });

    if (!stimulus) {
      console.warn(`Stimulus ${stimulusId} not found for outcome update`);
      return;
    }

    // Update the stimulus with actual outcomes
    await db
      .update(stimuliEvents)
      .set({
        actualEngagementDelta,
        actualConversionDelta: actualConversionDelta ?? null,
      })
      .where(eq(stimuliEvents.id, stimulusId));

    // Calculate prediction error for model evaluation
    const predictionError = Math.abs(
      (stimulus.predictedEngagementDelta ?? 0) - actualEngagementDelta
    );

    // If prediction error is high, mark for model refresh
    if (predictionError > 15) {
      // 15 point threshold
      await this.markRefreshNeeded(
        stimulus.hcpId,
        "engagement",
        `High prediction error: predicted ${stimulus.predictedEngagementDelta}, actual ${actualEngagementDelta}`
      );
    }
  }

  /**
   * Register a new prediction for staleness tracking
   */
  async registerPrediction(
    hcpId: string,
    predictionType: PredictionType,
    predictedValue: number,
    confidence: number
  ): Promise<void> {
    const existing = await db.query.predictionStaleness.findFirst({
      where: and(
        eq(predictionStaleness.hcpId, hcpId),
        eq(predictionStaleness.predictionType, predictionType)
      ),
    });

    if (existing) {
      await db
        .update(predictionStaleness)
        .set({
          lastPredictedAt: new Date(),
          lastPredictedValue: predictedValue,
          predictionConfidence: confidence,
          predictionAgeDays: 0,
          stalenessScore: 0,
          recommendRefresh: false,
          refreshReason: null,
          updatedAt: new Date(),
        })
        .where(eq(predictionStaleness.id, existing.id));
    } else {
      await db.insert(predictionStaleness).values({
        hcpId,
        predictionType,
        lastPredictedAt: new Date(),
        lastPredictedValue: predictedValue,
        predictionConfidence: confidence,
        stalenessScore: 0,
        recommendRefresh: false,
      } as InsertPredictionStaleness);
    }
  }

  /**
   * Get aggregated attribution statistics for model calibration
   */
  async getAttributionStatistics(
    channel?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalOutcomes: number;
    attributedOutcomes: number;
    attributionRate: number;
    avgContributionWeight: number;
    avgDaysToOutcome: number;
    modelDistribution: Record<string, number>;
  }> {
    const conditions = [];
    if (startDate) {
      conditions.push(gte(outcomeAttributions.createdAt, startDate));
    }
    if (endDate) {
      conditions.push(lte(outcomeAttributions.createdAt, endDate));
    }

    const attributions = await db
      .select()
      .from(outcomeAttributions)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    const outcomes = await db
      .select()
      .from(outcomeEvents)
      .where(
        conditions.length > 0
          ? and(
              startDate ? gte(outcomeEvents.eventDate, startDate) : undefined,
              endDate ? lte(outcomeEvents.eventDate, endDate) : undefined
            )
          : undefined
      );

    const totalOutcomes = outcomes.length;
    const attributedOutcomes = new Set(attributions.map((a) => a.outcomeEventId)).size;

    const avgContributionWeight =
      attributions.length > 0
        ? attributions.reduce((sum, a) => sum + a.contributionWeight, 0) / attributions.length
        : 0;

    const avgDaysToOutcome =
      attributions.length > 0
        ? attributions.reduce((sum, a) => sum + a.daysBetweenTouchAndOutcome, 0) / attributions.length
        : 0;

    // Model distribution
    const modelDistribution: Record<string, number> = {};
    for (const attr of attributions) {
      modelDistribution[attr.attributionModel] = (modelDistribution[attr.attributionModel] || 0) + 1;
    }

    return {
      totalOutcomes,
      attributedOutcomes,
      attributionRate: totalOutcomes > 0 ? attributedOutcomes / totalOutcomes : 0,
      avgContributionWeight,
      avgDaysToOutcome,
      modelDistribution,
    };
  }

  /**
   * Batch update staleness scores for all HCPs
   * Should be run periodically (e.g., daily) to keep staleness scores current
   */
  async refreshAllStalenessScores(): Promise<{ updated: number; errors: number }> {
    const records = await db.select().from(predictionStaleness);
    let updated = 0;
    let errors = 0;

    for (const record of records) {
      try {
        await this.calculateStaleness(record.hcpId, record.predictionType as PredictionType);
        updated++;
      } catch (err) {
        console.error(`Error updating staleness for ${record.hcpId}/${record.predictionType}:`, err);
        errors++;
      }
    }

    return { updated, errors };
  }
}

// Export singleton instance
export const attributionEngine = new AttributionEngine();

// Export class for testing
export { AttributionEngine };
