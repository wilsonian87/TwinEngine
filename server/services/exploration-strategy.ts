/**
 * Exploration Strategy Service
 *
 * Phase 7C: Uncertainty Quantification
 *
 * Implements exploration vs. exploitation strategies including epsilon-greedy,
 * Upper Confidence Bound (UCB), and Thompson Sampling for optimal action selection.
 */

import { db } from "../db";
import { eq, and, desc, sql, isNull, gte } from "drizzle-orm";
import {
  explorationHistory,
  explorationConfig,
  uncertaintyMetrics,
  stimuliEvents,
  outcomeEvents,
  hcpProfiles,
  type Channel,
  type ExplorationMode,
  type ExplorationDecision,
  type ExplorationAction,
  type InsertExplorationHistory,
  type InsertExplorationConfig,
  explorationModes,
  channels,
} from "@shared/schema";
import { uncertaintyCalculator } from "./uncertainty-calculator";

// ============================================================================
// Exploration Strategy Interface
// ============================================================================

export interface IExplorationStrategy {
  // Should we explore or exploit?
  shouldExplore(hcpId: string, channel: string): Promise<ExplorationDecision>;

  // Suggest exploration action
  suggestExplorationAction(hcpId: string): Promise<ExplorationAction | null>;

  // Calculate exploration budget
  calculateExplorationBudget(totalBudget: number, explorationRate?: number): number;

  // Track exploration outcomes
  recordExplorationOutcome(stimulusId: string, outcomeId: string, actualValue: number): Promise<void>;

  // Adapt exploration rate based on learning
  adaptExplorationRate(channel?: string): Promise<number>;

  // Config management
  getExplorationConfig(channel?: string | null): Promise<typeof explorationConfig.$inferSelect | null>;
  upsertExplorationConfig(config: InsertExplorationConfig): Promise<typeof explorationConfig.$inferSelect>;

  // Record exploration decision
  recordExplorationDecision(
    hcpId: string,
    channel: string,
    stimulusId: string,
    wasExploration: boolean,
    mode: ExplorationMode,
    score: number
  ): Promise<void>;
}

// ============================================================================
// Exploration Strategy Implementation
// ============================================================================

class ExplorationStrategy implements IExplorationStrategy {
  /**
   * Decide whether to explore or exploit for a given HCP/channel
   */
  async shouldExplore(hcpId: string, channel: string): Promise<ExplorationDecision> {
    const config = await this.getExplorationConfig(channel);
    const mode: ExplorationMode = (config?.explorationMode as ExplorationMode) || "epsilon_greedy";

    // Get uncertainty metrics for this HCP/channel
    let uncertainty = await db.query.uncertaintyMetrics.findFirst({
      where: and(
        eq(uncertaintyMetrics.hcpId, hcpId),
        eq(uncertaintyMetrics.channel, channel)
      ),
    });

    // If no metrics exist, calculate them
    if (!uncertainty) {
      uncertainty = await uncertaintyCalculator.calculateUncertainty(hcpId, channel);
    }

    // Get exploitation score (expected value)
    const exploitationScore = uncertainty.predictedValue / 100; // Normalize to 0-1

    let shouldExplore = false;
    let explorationScore = 0;
    let reason = "";

    switch (mode) {
      case "epsilon_greedy":
        const result = await this.epsilonGreedyDecision(config, uncertainty);
        shouldExplore = result.shouldExplore;
        explorationScore = result.explorationScore;
        reason = result.reason;
        break;

      case "ucb":
        const ucbResult = await this.ucbDecision(hcpId, channel, config, uncertainty);
        shouldExplore = ucbResult.shouldExplore;
        explorationScore = ucbResult.explorationScore;
        reason = ucbResult.reason;
        break;

      case "thompson_sampling":
        const tsResult = await this.thompsonSamplingDecision(hcpId, channel, config);
        shouldExplore = tsResult.shouldExplore;
        explorationScore = tsResult.explorationScore;
        reason = tsResult.reason;
        break;
    }

    // Get suggested action if exploring
    let suggestedAction = null;
    if (shouldExplore) {
      const action = await this.suggestExplorationAction(hcpId);
      if (action) {
        suggestedAction = {
          actionType: action.actionType,
          expectedInformationGain: action.expectedInformationGain,
          estimatedCost: action.estimatedCost,
        };
      }
    }

    return {
      hcpId,
      channel,
      shouldExplore,
      explorationMode: mode,
      explorationScore,
      exploitationScore,
      reason,
      suggestedAction,
    };
  }

  /**
   * Suggest an exploration action for an HCP
   */
  async suggestExplorationAction(hcpId: string): Promise<ExplorationAction | null> {
    // Get HCP profile
    const hcp = await db.query.hcpProfiles.findFirst({
      where: eq(hcpProfiles.id, hcpId),
    });

    if (!hcp) return null;

    // Find the channel with highest exploration value
    const uncertaintyRecords = await db
      .select()
      .from(uncertaintyMetrics)
      .where(eq(uncertaintyMetrics.hcpId, hcpId))
      .orderBy(desc(uncertaintyMetrics.explorationValue));

    let bestChannel = hcp.channelPreference as Channel;
    let bestExplorationValue = 0;
    let bestUncertainty = 0;

    if (uncertaintyRecords.length > 0) {
      const best = uncertaintyRecords[0];
      bestChannel = (best.channel as Channel) || hcp.channelPreference as Channel;
      bestExplorationValue = best.explorationValue ?? 0;
      bestUncertainty = best.totalUncertainty;
    } else {
      // Calculate exploration value for channels we haven't tried much
      for (const channel of channels) {
        const explorationValue = await uncertaintyCalculator.calculateExplorationValue(hcpId, channel);
        if (explorationValue > bestExplorationValue) {
          bestExplorationValue = explorationValue;
          bestChannel = channel as Channel;
        }
      }
    }

    // Determine action type based on channel
    const actionTypeMap: Record<string, string> = {
      email: "email_send",
      rep_visit: "rep_visit",
      webinar: "webinar_invite",
      conference: "conference_meeting",
      digital_ad: "digital_ad_impression",
      phone: "phone_call",
    };

    const actionType = actionTypeMap[bestChannel] || "email_send";

    // Estimate information gain based on current uncertainty
    const expectedInformationGain = bestUncertainty * bestExplorationValue;

    return {
      hcpId,
      channel: bestChannel,
      actionType,
      reason: `High exploration value (${(bestExplorationValue * 100).toFixed(0)}%) for ${bestChannel} channel`,
      expectedInformationGain,
      currentUncertainty: bestUncertainty,
      estimatedCost: this.estimateActionCost(bestChannel, actionType),
    };
  }

  /**
   * Calculate exploration budget allocation
   */
  calculateExplorationBudget(totalBudget: number, explorationRate?: number): number {
    const rate = explorationRate ?? 0.1; // Default 10%
    return totalBudget * rate;
  }

  /**
   * Record outcome of an exploration
   */
  async recordExplorationOutcome(
    stimulusId: string,
    outcomeId: string,
    actualValue: number
  ): Promise<void> {
    // Find the exploration history record for this stimulus
    const exploration = await db.query.explorationHistory.findFirst({
      where: eq(explorationHistory.stimulusId, stimulusId),
    });

    if (!exploration) {
      console.warn(`No exploration record found for stimulus ${stimulusId}`);
      return;
    }

    // Calculate prediction error
    const predictionError = exploration.priorPredictedValue
      ? actualValue - exploration.priorPredictedValue
      : null;

    // Calculate information gain (reduction in uncertainty)
    const currentUncertainty = await this.getCurrentUncertainty(
      exploration.hcpId,
      exploration.channel
    );
    const informationGain = exploration.priorUncertainty
      ? exploration.priorUncertainty - currentUncertainty
      : null;

    // Update the exploration record
    await db
      .update(explorationHistory)
      .set({
        outcomeId,
        actualValue,
        predictionError,
        informationGain,
        posteriorUncertainty: currentUncertainty,
      })
      .where(eq(explorationHistory.id, exploration.id));
  }

  /**
   * Adapt exploration rate based on recent learning
   */
  async adaptExplorationRate(channel?: string): Promise<number> {
    const config = await this.getExplorationConfig(channel);
    if (!config) return 0.1;

    const epsilon = config.epsilon ?? 0.1;
    const decay = config.epsilonDecay ?? 0.995;
    const minEpsilon = config.minEpsilon ?? 0.01;

    // Count recent explorations
    const recentExplorations = await db
      .select()
      .from(explorationHistory)
      .where(
        and(
          channel ? eq(explorationHistory.channel, channel) : sql`1=1`,
          eq(explorationHistory.wasExploration, true),
          gte(explorationHistory.createdAt, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
        )
      );

    // Apply decay for each exploration
    let newEpsilon = epsilon;
    for (let i = 0; i < recentExplorations.length; i++) {
      newEpsilon = Math.max(minEpsilon, newEpsilon * decay);
    }

    // Update the config
    await db
      .update(explorationConfig)
      .set({ epsilon: newEpsilon, updatedAt: new Date() })
      .where(eq(explorationConfig.id, config.id));

    return newEpsilon;
  }

  /**
   * Get exploration config for a channel (or global)
   */
  async getExplorationConfig(
    channel?: string | null
  ): Promise<typeof explorationConfig.$inferSelect | null> {
    // First try channel-specific config
    if (channel) {
      const channelConfig = await db.query.explorationConfig.findFirst({
        where: eq(explorationConfig.channel, channel),
      });
      if (channelConfig) return channelConfig;
    }

    // Fall back to global config
    const globalConfig = await db.query.explorationConfig.findFirst({
      where: isNull(explorationConfig.channel),
    });

    return globalConfig ?? null;
  }

  /**
   * Create or update exploration config
   */
  async upsertExplorationConfig(
    config: InsertExplorationConfig
  ): Promise<typeof explorationConfig.$inferSelect> {
    const existing = config.channel
      ? await db.query.explorationConfig.findFirst({
          where: eq(explorationConfig.channel, config.channel),
        })
      : await db.query.explorationConfig.findFirst({
          where: isNull(explorationConfig.channel),
        });

    if (existing) {
      const [updated] = await db
        .update(explorationConfig)
        .set({ ...config, updatedAt: new Date() })
        .where(eq(explorationConfig.id, existing.id))
        .returning();
      return updated;
    } else {
      const [inserted] = await db.insert(explorationConfig).values(config).returning();
      return inserted;
    }
  }

  /**
   * Record an exploration decision
   */
  async recordExplorationDecision(
    hcpId: string,
    channel: string,
    stimulusId: string,
    wasExploration: boolean,
    mode: ExplorationMode,
    score: number
  ): Promise<void> {
    // Get current uncertainty
    const uncertainty = await this.getCurrentUncertainty(hcpId, channel);

    // Get predicted value
    const metrics = await db.query.uncertaintyMetrics.findFirst({
      where: and(
        eq(uncertaintyMetrics.hcpId, hcpId),
        eq(uncertaintyMetrics.channel, channel)
      ),
    });

    const history: InsertExplorationHistory = {
      hcpId,
      channel,
      stimulusId,
      wasExploration,
      explorationMode: mode,
      explorationScore: score,
      priorUncertainty: uncertainty,
      priorPredictedValue: metrics?.predictedValue ?? null,
    };

    await db.insert(explorationHistory).values(history);
  }

  // ============================================================================
  // Private Strategy Implementations
  // ============================================================================

  /**
   * Epsilon-greedy decision
   */
  private async epsilonGreedyDecision(
    config: typeof explorationConfig.$inferSelect | null,
    uncertainty: typeof uncertaintyMetrics.$inferSelect
  ): Promise<{ shouldExplore: boolean; explorationScore: number; reason: string }> {
    const epsilon = config?.epsilon ?? 0.1;
    const minSampleSize = config?.minSampleSize ?? 5;

    // Always explore if sample size is too small
    if (uncertainty.sampleSize < minSampleSize) {
      return {
        shouldExplore: true,
        explorationScore: 1.0,
        reason: `Insufficient samples (${uncertainty.sampleSize} < ${minSampleSize})`,
      };
    }

    // Random exploration with probability epsilon
    const random = Math.random();
    const shouldExplore = random < epsilon;

    return {
      shouldExplore,
      explorationScore: epsilon,
      reason: shouldExplore
        ? `Random exploration (epsilon=${(epsilon * 100).toFixed(1)}%)`
        : `Exploiting best known action`,
    };
  }

  /**
   * Upper Confidence Bound (UCB) decision
   */
  private async ucbDecision(
    hcpId: string,
    channel: string,
    config: typeof explorationConfig.$inferSelect | null,
    uncertainty: typeof uncertaintyMetrics.$inferSelect
  ): Promise<{ shouldExplore: boolean; explorationScore: number; reason: string }> {
    const ucbC = config?.ucbC ?? 1.41;

    // Get sample counts
    const channelSamples = await db
      .select({ count: sql<number>`count(*)` })
      .from(stimuliEvents)
      .where(and(eq(stimuliEvents.hcpId, hcpId), eq(stimuliEvents.channel, channel)));

    const totalSamples = await db
      .select({ count: sql<number>`count(*)` })
      .from(stimuliEvents)
      .where(eq(stimuliEvents.hcpId, hcpId));

    const n = Number(channelSamples[0]?.count ?? 0);
    const N = Number(totalSamples[0]?.count ?? 1);

    // Calculate UCB score
    const exploitValue = uncertainty.predictedValue / 100;
    const explorationBonus = n > 0 ? ucbC * Math.sqrt(Math.log(N + 1) / n) : 2.0;
    const ucbScore = exploitValue + explorationBonus;

    // Compare UCB scores across channels to decide
    const shouldExplore = explorationBonus > exploitValue * 0.5; // Explore if bonus is significant

    return {
      shouldExplore,
      explorationScore: Math.min(1, explorationBonus),
      reason: shouldExplore
        ? `UCB exploration bonus (${(explorationBonus * 100).toFixed(0)}%) exceeds threshold`
        : `UCB favors exploitation (score=${ucbScore.toFixed(2)})`,
    };
  }

  /**
   * Thompson Sampling decision
   */
  private async thompsonSamplingDecision(
    hcpId: string,
    channel: string,
    config: typeof explorationConfig.$inferSelect | null
  ): Promise<{ shouldExplore: boolean; explorationScore: number; reason: string }> {
    const priorAlpha = config?.priorAlpha ?? 1.0;
    const priorBeta = config?.priorBeta ?? 1.0;

    // Get success/failure counts for this HCP/channel
    const outcomes = await db
      .select()
      .from(outcomeEvents)
      .where(and(eq(outcomeEvents.hcpId, hcpId), eq(outcomeEvents.channel, channel)));

    // Count positive outcomes (simplified: any outcome is positive)
    const successes = outcomes.length;

    // Get total attempts
    const attempts = await db
      .select({ count: sql<number>`count(*)` })
      .from(stimuliEvents)
      .where(and(eq(stimuliEvents.hcpId, hcpId), eq(stimuliEvents.channel, channel)));

    const totalAttempts = Number(attempts[0]?.count ?? 0);
    const failures = Math.max(0, totalAttempts - successes);

    // Beta distribution parameters
    const alpha = priorAlpha + successes;
    const beta = priorBeta + failures;

    // Sample from Beta distribution (using simple approximation)
    const sample = this.sampleBeta(alpha, beta);

    // Compare to samples from other channels
    const otherSamples: { channel: string; sample: number }[] = [];
    for (const ch of channels) {
      if (ch !== channel) {
        const chOutcomes = await db
          .select({ count: sql<number>`count(*)` })
          .from(outcomeEvents)
          .where(and(eq(outcomeEvents.hcpId, hcpId), eq(outcomeEvents.channel, ch)));

        const chAttempts = await db
          .select({ count: sql<number>`count(*)` })
          .from(stimuliEvents)
          .where(and(eq(stimuliEvents.hcpId, hcpId), eq(stimuliEvents.channel, ch)));

        const chSuccesses = Number(chOutcomes[0]?.count ?? 0);
        const chTotal = Number(chAttempts[0]?.count ?? 0);
        const chAlpha = priorAlpha + chSuccesses;
        const chBeta = priorBeta + Math.max(0, chTotal - chSuccesses);

        otherSamples.push({ channel: ch, sample: this.sampleBeta(chAlpha, chBeta) });
      }
    }

    // Find best sample
    const allSamples = [{ channel, sample }, ...otherSamples];
    const best = allSamples.reduce((a, b) => (a.sample > b.sample ? a : b));

    // Explore if this channel has the highest sample
    const shouldExplore = best.channel === channel && totalAttempts < 10;

    return {
      shouldExplore,
      explorationScore: sample,
      reason: shouldExplore
        ? `Thompson Sampling selected ${channel} (sample=${sample.toFixed(3)})`
        : `Thompson Sampling favors ${best.channel} (sample=${best.sample.toFixed(3)})`,
    };
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private async getCurrentUncertainty(hcpId: string, channel: string): Promise<number> {
    const metrics = await db.query.uncertaintyMetrics.findFirst({
      where: and(
        eq(uncertaintyMetrics.hcpId, hcpId),
        eq(uncertaintyMetrics.channel, channel)
      ),
    });
    return metrics?.totalUncertainty ?? 0.5;
  }

  private estimateActionCost(channel: string, actionType: string): number | null {
    // Estimated costs per action type
    const costMap: Record<string, number> = {
      email_send: 0.5,
      rep_visit: 200,
      webinar_invite: 2,
      conference_meeting: 500,
      digital_ad_impression: 0.1,
      phone_call: 25,
    };
    return costMap[actionType] ?? null;
  }

  /**
   * Simple Beta distribution sampling using the Gamma trick
   * Beta(a, b) = Gamma(a) / (Gamma(a) + Gamma(b))
   */
  private sampleBeta(alpha: number, beta: number): number {
    const x = this.sampleGamma(alpha);
    const y = this.sampleGamma(beta);
    return x / (x + y);
  }

  /**
   * Simple Gamma distribution sampling using Marsaglia and Tsang's method
   */
  private sampleGamma(shape: number): number {
    if (shape < 1) {
      // Use the transformation for shape < 1
      return this.sampleGamma(shape + 1) * Math.pow(Math.random(), 1 / shape);
    }

    const d = shape - 1 / 3;
    const c = 1 / Math.sqrt(9 * d);

    while (true) {
      let x: number;
      let v: number;

      do {
        x = this.sampleNormal();
        v = 1 + c * x;
      } while (v <= 0);

      v = v * v * v;
      const u = Math.random();

      if (u < 1 - 0.0331 * x * x * x * x) {
        return d * v;
      }

      if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) {
        return d * v;
      }
    }
  }

  /**
   * Sample from standard normal distribution using Box-Muller transform
   */
  private sampleNormal(): number {
    const u1 = Math.random();
    const u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }
}

// Export singleton instance
export const explorationStrategy = new ExplorationStrategy();

// Export class for testing
export { ExplorationStrategy };
