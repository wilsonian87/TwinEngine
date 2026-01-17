/**
 * Uncertainty Calculator Service
 *
 * Phase 7C: Uncertainty Quantification
 *
 * Provides richer uncertainty modeling for exploration vs. exploitation decisions,
 * including epistemic/aleatoric decomposition, data quality assessment,
 * feature drift detection, and exploration value calculation.
 */

import { db } from "../db";
import { eq, and, gte, lte, desc, sql, isNull } from "drizzle-orm";
import {
  uncertaintyMetrics,
  explorationHistory,
  explorationConfig,
  hcpProfiles,
  stimuliEvents,
  outcomeEvents,
  predictionStaleness,
  type Channel,
  type InsertUncertaintyMetrics,
  type InsertExplorationHistory,
  type UncertaintyMetricsDB,
  type DataQualityReport,
  type DriftReport,
  type UncertaintySummary,
  type ExplorationStatistics,
  channels,
} from "@shared/schema";

// ============================================================================
// Uncertainty Calculator Interface
// ============================================================================

export interface IUncertaintyCalculator {
  // Full uncertainty calculation
  calculateUncertainty(hcpId: string, channel?: string, predictionType?: string): Promise<UncertaintyMetricsDB>;

  // Component calculations
  calculateEpistemicUncertainty(hcpId: string, channel?: string): Promise<number>;
  calculateAleatoricUncertainty(hcpId: string, channel?: string): Promise<number>;

  // Data quality
  assessDataQuality(hcpId: string): Promise<DataQualityReport>;

  // Drift detection
  detectFeatureDrift(hcpId: string, since?: Date): Promise<DriftReport>;

  // Exploration value (UCB-style)
  calculateExplorationValue(hcpId: string, channel: string): Promise<number>;

  // Batch calculation
  calculateBatchUncertainty(hcpIds: string[], channel?: string): Promise<UncertaintyMetricsDB[]>;

  // Summary and statistics
  getUncertaintySummary(): Promise<UncertaintySummary>;
  getExplorationStatistics(): Promise<ExplorationStatistics>;
}

// ============================================================================
// Uncertainty Calculator Implementation
// ============================================================================

class UncertaintyCalculator implements IUncertaintyCalculator {
  /**
   * Calculate full uncertainty metrics for an HCP/channel/prediction type
   */
  async calculateUncertainty(
    hcpId: string,
    channel?: string,
    predictionType: string = "engagement"
  ): Promise<UncertaintyMetricsDB> {
    // Get HCP profile
    const hcp = await db.query.hcpProfiles.findFirst({
      where: eq(hcpProfiles.id, hcpId),
    });

    if (!hcp) {
      throw new Error(`HCP ${hcpId} not found`);
    }

    // Calculate data quality metrics
    const dataQuality = await this.assessDataQuality(hcpId);

    // Get historical outcomes for this HCP
    const outcomes = await db
      .select()
      .from(outcomeEvents)
      .where(
        channel
          ? and(eq(outcomeEvents.hcpId, hcpId), eq(outcomeEvents.channel, channel))
          : eq(outcomeEvents.hcpId, hcpId)
      )
      .orderBy(desc(outcomeEvents.eventDate));

    // Get historical stimuli for sample size
    const stimuli = await db
      .select()
      .from(stimuliEvents)
      .where(
        channel
          ? and(eq(stimuliEvents.hcpId, hcpId), eq(stimuliEvents.channel, channel))
          : eq(stimuliEvents.hcpId, hcpId)
      );

    const sampleSize = stimuli.length;

    // Calculate epistemic uncertainty (reducible with more data)
    const epistemicUncertainty = await this.calculateEpistemicUncertainty(hcpId, channel);

    // Calculate aleatoric uncertainty (irreducible noise)
    const aleatoricUncertainty = await this.calculateAleatoricUncertainty(hcpId, channel);

    // Total uncertainty (combined)
    const totalUncertainty = Math.sqrt(
      Math.pow(epistemicUncertainty, 2) + Math.pow(aleatoricUncertainty, 2)
    );

    // Calculate predicted value based on HCP engagement score
    const predictedValue = this.calculatePredictedValue(hcp, channel, predictionType);

    // Calculate confidence interval
    const ciWidth = totalUncertainty * 1.96 * 2; // 95% CI
    const ciLower = Math.max(0, predictedValue - ciWidth / 2);
    const ciUpper = Math.min(100, predictedValue + ciWidth / 2);

    // Calculate data recency
    const lastOutcome = outcomes[0];
    const dataRecency = lastOutcome
      ? Math.floor(
          (Date.now() - new Date(lastOutcome.eventDate).getTime()) / (1000 * 60 * 60 * 24)
        )
      : null;

    // Get prediction staleness
    const staleness = await db.query.predictionStaleness.findFirst({
      where: and(
        eq(predictionStaleness.hcpId, hcpId),
        eq(predictionStaleness.predictionType, predictionType)
      ),
    });

    const predictionAge = staleness
      ? Math.floor(
          (Date.now() - new Date(staleness.lastPredictedAt).getTime()) / (1000 * 60 * 60 * 24)
        )
      : 0;

    const lastValidationAge = staleness?.lastValidatedAt
      ? Math.floor(
          (Date.now() - new Date(staleness.lastValidatedAt).getTime()) / (1000 * 60 * 60 * 24)
        )
      : null;

    // Detect feature drift
    const driftReport = await this.detectFeatureDrift(hcpId);

    // Calculate exploration value
    const explorationValue = await this.calculateExplorationValue(hcpId, channel || "email");

    // Determine if exploration is recommended
    const config = await this.getExplorationConfig(channel);
    const uncertaintyThreshold = config?.uncertaintyThreshold ?? 0.7;
    const minSampleSize = config?.minSampleSize ?? 5;
    const recommendExploration =
      totalUncertainty > uncertaintyThreshold || sampleSize < minSampleSize;

    // Upsert the uncertainty metrics
    const existing = await db.query.uncertaintyMetrics.findFirst({
      where: and(
        eq(uncertaintyMetrics.hcpId, hcpId),
        channel ? eq(uncertaintyMetrics.channel, channel) : isNull(uncertaintyMetrics.channel),
        eq(uncertaintyMetrics.predictionType, predictionType)
      ),
    });

    const metricsData: InsertUncertaintyMetrics = {
      hcpId,
      channel: channel || null,
      predictionType,
      predictedValue,
      ciLower,
      ciUpper,
      ciWidth,
      epistemicUncertainty,
      aleatoricUncertainty,
      totalUncertainty,
      sampleSize,
      dataRecency,
      featureCompleteness: dataQuality.profileCompleteness,
      predictionAge,
      lastValidationAge,
      featureDriftScore: driftReport.overallDriftScore,
      driftFeatures: driftReport.driftedFeatures.map((f) => f.feature),
      explorationValue,
      recommendExploration,
    };

    let result: UncertaintyMetricsDB;

    if (existing) {
      const [updated] = await db
        .update(uncertaintyMetrics)
        .set({ ...metricsData, calculatedAt: new Date() })
        .where(eq(uncertaintyMetrics.id, existing.id))
        .returning();
      result = updated;
    } else {
      const [inserted] = await db
        .insert(uncertaintyMetrics)
        .values(metricsData)
        .returning();
      result = inserted;
    }

    return result;
  }

  /**
   * Calculate epistemic uncertainty (reducible with more data)
   * Based on sample size and prediction variance
   */
  async calculateEpistemicUncertainty(hcpId: string, channel?: string): Promise<number> {
    // Get sample size for this HCP/channel
    const stimuli = await db
      .select()
      .from(stimuliEvents)
      .where(
        channel
          ? and(eq(stimuliEvents.hcpId, hcpId), eq(stimuliEvents.channel, channel))
          : eq(stimuliEvents.hcpId, hcpId)
      );

    const sampleSize = stimuli.length;

    // Epistemic uncertainty decreases with sample size
    // Using a Bayesian-inspired formula: 1 / sqrt(n + 1)
    const baseSampleUncertainty = 1 / Math.sqrt(sampleSize + 1);

    // Also consider prediction variance from historical data
    const predictions = stimuli
      .filter((s) => s.predictedEngagementDelta !== null)
      .map((s) => s.predictedEngagementDelta!);

    let predictionVariance = 0;
    if (predictions.length > 1) {
      const mean = predictions.reduce((a, b) => a + b, 0) / predictions.length;
      predictionVariance =
        predictions.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / predictions.length;
      // Normalize to 0-1 scale (assuming max variance of 100)
      predictionVariance = Math.min(1, Math.sqrt(predictionVariance) / 10);
    }

    // Combine sample-based and variance-based epistemic uncertainty
    const epistemicUncertainty = 0.6 * baseSampleUncertainty + 0.4 * predictionVariance;

    return Math.min(1, Math.max(0, epistemicUncertainty));
  }

  /**
   * Calculate aleatoric uncertainty (irreducible noise)
   * Based on historical outcome variance
   */
  async calculateAleatoricUncertainty(hcpId: string, channel?: string): Promise<number> {
    // Get historical outcomes with actual values
    const stimuliWithOutcomes = await db
      .select()
      .from(stimuliEvents)
      .where(
        channel
          ? and(
              eq(stimuliEvents.hcpId, hcpId),
              eq(stimuliEvents.channel, channel),
              sql`${stimuliEvents.actualEngagementDelta} IS NOT NULL`
            )
          : and(
              eq(stimuliEvents.hcpId, hcpId),
              sql`${stimuliEvents.actualEngagementDelta} IS NOT NULL`
            )
      );

    if (stimuliWithOutcomes.length < 2) {
      // Not enough data to estimate aleatoric uncertainty
      // Return a conservative estimate
      return 0.5;
    }

    // Calculate variance in actual outcomes relative to predictions
    const errors = stimuliWithOutcomes
      .filter((s) => s.predictedEngagementDelta !== null && s.actualEngagementDelta !== null)
      .map((s) => s.actualEngagementDelta! - s.predictedEngagementDelta!);

    if (errors.length < 2) {
      return 0.5;
    }

    // Calculate standard deviation of errors
    const meanError = errors.reduce((a, b) => a + b, 0) / errors.length;
    const varianceError =
      errors.reduce((sum, e) => sum + Math.pow(e - meanError, 2), 0) / errors.length;
    const stdError = Math.sqrt(varianceError);

    // Normalize to 0-1 scale (assuming max std of 20)
    const aleatoricUncertainty = Math.min(1, stdError / 20);

    return Math.max(0, aleatoricUncertainty);
  }

  /**
   * Assess data quality for an HCP
   */
  async assessDataQuality(hcpId: string): Promise<DataQualityReport> {
    const hcp = await db.query.hcpProfiles.findFirst({
      where: eq(hcpProfiles.id, hcpId),
    });

    if (!hcp) {
      throw new Error(`HCP ${hcpId} not found`);
    }

    // Check profile completeness
    const requiredFields = [
      "name",
      "specialty",
      "tier",
      "segment",
      "region",
      "channelPreference",
    ];
    const optionalFields = [
      "institution",
      "city",
      "state",
      "prescribingPattern",
    ];

    const missingFields: string[] = [];
    let filledRequired = 0;
    let filledOptional = 0;

    for (const field of requiredFields) {
      if ((hcp as Record<string, unknown>)[field]) {
        filledRequired++;
      } else {
        missingFields.push(field);
      }
    }

    for (const field of optionalFields) {
      if ((hcp as Record<string, unknown>)[field]) {
        filledOptional++;
      } else {
        missingFields.push(field);
      }
    }

    const profileCompleteness =
      (filledRequired / requiredFields.length) * 0.7 +
      (filledOptional / optionalFields.length) * 0.3;

    // Get engagement history
    const stimuli = await db
      .select()
      .from(stimuliEvents)
      .where(eq(stimuliEvents.hcpId, hcpId))
      .orderBy(desc(stimuliEvents.eventDate));

    const outcomes = await db
      .select()
      .from(outcomeEvents)
      .where(eq(outcomeEvents.hcpId, hcpId))
      .orderBy(desc(outcomeEvents.eventDate));

    const lastEngagementDays = stimuli[0]
      ? Math.floor(
          (Date.now() - new Date(stimuli[0].eventDate).getTime()) / (1000 * 60 * 60 * 24)
        )
      : null;

    const lastOutcomeDays = outcomes[0]
      ? Math.floor(
          (Date.now() - new Date(outcomes[0].eventDate).getTime()) / (1000 * 60 * 60 * 24)
        )
      : null;

    // Check channel coverage
    const channelCoverage: Record<string, boolean> = {};
    for (const channel of channels) {
      channelCoverage[channel] = stimuli.some((s) => s.channel === channel);
    }

    // Calculate overall score
    const recencyScore =
      lastEngagementDays !== null ? Math.max(0, 1 - lastEngagementDays / 90) : 0;
    const historyScore = Math.min(1, stimuli.length / 10);
    const coverageScore =
      Object.values(channelCoverage).filter(Boolean).length / channels.length;

    const overallScore =
      profileCompleteness * 0.3 + recencyScore * 0.3 + historyScore * 0.2 + coverageScore * 0.2;

    return {
      hcpId,
      overallScore,
      profileCompleteness,
      engagementHistory: stimuli.length,
      outcomeHistory: outcomes.length,
      lastEngagementDays,
      lastOutcomeDays,
      channelCoverage,
      missingFields,
    };
  }

  /**
   * Detect feature drift for an HCP
   */
  async detectFeatureDrift(hcpId: string, since?: Date): Promise<DriftReport> {
    const hcp = await db.query.hcpProfiles.findFirst({
      where: eq(hcpProfiles.id, hcpId),
    });

    if (!hcp) {
      throw new Error(`HCP ${hcpId} not found`);
    }

    // For drift detection, we compare current values against baseline
    // In a real system, this would compare against stored prediction-time features
    // For now, we simulate drift detection based on recent engagement changes

    const driftedFeatures: Array<{
      feature: string;
      previousValue: unknown;
      currentValue: unknown;
      driftMagnitude: number;
    }> = [];

    // Check engagement score drift
    // We use recent outcomes to detect behavioral drift
    const recentOutcomes = await db
      .select()
      .from(outcomeEvents)
      .where(
        and(
          eq(outcomeEvents.hcpId, hcpId),
          gte(outcomeEvents.eventDate, since || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
        )
      );

    const olderOutcomes = await db
      .select()
      .from(outcomeEvents)
      .where(
        and(
          eq(outcomeEvents.hcpId, hcpId),
          lte(outcomeEvents.eventDate, since || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
        )
      )
      .limit(20);

    // Compare response rates
    const recentResponseRate = recentOutcomes.length > 0 ? 1 : 0;
    const olderResponseRate = olderOutcomes.length > 0 ? olderOutcomes.length / 20 : 0;

    if (Math.abs(recentResponseRate - olderResponseRate) > 0.3) {
      driftedFeatures.push({
        feature: "response_rate",
        previousValue: olderResponseRate,
        currentValue: recentResponseRate,
        driftMagnitude: Math.abs(recentResponseRate - olderResponseRate),
      });
    }

    // Check engagement score against historical average
    const engagementDrift = this.detectEngagementDrift(hcp);
    if (engagementDrift) {
      driftedFeatures.push(engagementDrift);
    }

    // Calculate overall drift score
    const overallDriftScore =
      driftedFeatures.length > 0
        ? driftedFeatures.reduce((sum, f) => sum + f.driftMagnitude, 0) / driftedFeatures.length
        : 0;

    const significantDrift = overallDriftScore > 0.3;

    return {
      hcpId,
      overallDriftScore,
      significantDrift,
      driftedFeatures,
      recommendRecompute: significantDrift,
      lastCheckedAt: new Date().toISOString(),
    };
  }

  /**
   * Calculate exploration value using Upper Confidence Bound (UCB)
   */
  async calculateExplorationValue(hcpId: string, channel: string): Promise<number> {
    // Get exploration config
    const config = await this.getExplorationConfig(channel);
    const ucbC = config?.ucbC ?? 1.41; // sqrt(2) is a common choice

    // Get sample size for this HCP/channel
    const stimuli = await db
      .select()
      .from(stimuliEvents)
      .where(and(eq(stimuliEvents.hcpId, hcpId), eq(stimuliEvents.channel, channel)));

    const n = stimuli.length;

    // Get total samples across all HCPs for this channel (for UCB calculation)
    const totalStimuli = await db
      .select({ count: sql<number>`count(*)` })
      .from(stimuliEvents)
      .where(eq(stimuliEvents.channel, channel));

    const N = Number(totalStimuli[0]?.count ?? 1);

    // UCB exploration bonus: c * sqrt(ln(N) / n)
    // Higher when n is small (we've tried this HCP/channel less)
    const explorationBonus = n > 0 ? ucbC * Math.sqrt(Math.log(N) / n) : ucbC * 2; // High bonus for untried combinations

    // Normalize to 0-1 scale
    const normalizedExplorationValue = Math.min(1, explorationBonus / 3);

    return normalizedExplorationValue;
  }

  /**
   * Batch calculate uncertainty for multiple HCPs
   */
  async calculateBatchUncertainty(
    hcpIds: string[],
    channel?: string
  ): Promise<UncertaintyMetricsDB[]> {
    const results: UncertaintyMetricsDB[] = [];

    for (const hcpId of hcpIds) {
      try {
        const metrics = await this.calculateUncertainty(hcpId, channel);
        results.push(metrics);
      } catch (err) {
        console.error(`Error calculating uncertainty for ${hcpId}:`, err);
      }
    }

    return results;
  }

  /**
   * Get uncertainty summary across all HCPs
   */
  async getUncertaintySummary(): Promise<UncertaintySummary> {
    const allMetrics = await db.select().from(uncertaintyMetrics);
    const hcpCount = await db.select({ count: sql<number>`count(distinct ${hcpProfiles.id})` }).from(hcpProfiles);

    const totalHcps = Number(hcpCount[0]?.count ?? 0);

    if (allMetrics.length === 0) {
      return {
        totalHcps,
        avgEpistemicUncertainty: 0,
        avgAleatoricUncertainty: 0,
        avgTotalUncertainty: 0,
        highUncertaintyCount: 0,
        recommendExplorationCount: 0,
        byChannel: [],
        byPredictionType: [],
        recentDriftDetected: 0,
      };
    }

    const avgEpistemicUncertainty =
      allMetrics.reduce((sum, m) => sum + m.epistemicUncertainty, 0) / allMetrics.length;
    const avgAleatoricUncertainty =
      allMetrics.reduce((sum, m) => sum + m.aleatoricUncertainty, 0) / allMetrics.length;
    const avgTotalUncertainty =
      allMetrics.reduce((sum, m) => sum + m.totalUncertainty, 0) / allMetrics.length;

    const highUncertaintyCount = allMetrics.filter((m) => m.totalUncertainty > 0.7).length;
    const recommendExplorationCount = allMetrics.filter((m) => m.recommendExploration).length;

    // Group by channel
    const byChannelMap: Record<string, { total: number; count: number; exploration: number }> = {};
    for (const m of allMetrics) {
      const ch = m.channel || "unknown";
      if (!byChannelMap[ch]) {
        byChannelMap[ch] = { total: 0, count: 0, exploration: 0 };
      }
      byChannelMap[ch].total += m.totalUncertainty;
      byChannelMap[ch].count++;
      if (m.recommendExploration) byChannelMap[ch].exploration++;
    }

    const byChannel = Object.entries(byChannelMap).map(([channel, data]) => ({
      channel,
      avgUncertainty: data.count > 0 ? data.total / data.count : 0,
      hcpCount: data.count,
      explorationRecommended: data.exploration,
    }));

    // Group by prediction type
    const byTypeMap: Record<string, { total: number; count: number }> = {};
    for (const m of allMetrics) {
      const type = m.predictionType;
      if (!byTypeMap[type]) {
        byTypeMap[type] = { total: 0, count: 0 };
      }
      byTypeMap[type].total += m.totalUncertainty;
      byTypeMap[type].count++;
    }

    const byPredictionType = Object.entries(byTypeMap).map(([predictionType, data]) => ({
      predictionType,
      avgUncertainty: data.count > 0 ? data.total / data.count : 0,
      hcpCount: data.count,
    }));

    const recentDriftDetected = allMetrics.filter(
      (m) => m.featureDriftScore !== null && m.featureDriftScore > 0.3
    ).length;

    return {
      totalHcps,
      avgEpistemicUncertainty,
      avgAleatoricUncertainty,
      avgTotalUncertainty,
      highUncertaintyCount,
      recommendExplorationCount,
      byChannel,
      byPredictionType,
      recentDriftDetected,
    };
  }

  /**
   * Get exploration statistics
   */
  async getExplorationStatistics(): Promise<ExplorationStatistics> {
    const history = await db.select().from(explorationHistory);
    const config = await this.getExplorationConfig();

    const explorations = history.filter((h) => h.wasExploration);
    const successfulExplorations = explorations.filter((e) => e.outcomeId !== null).length;

    const avgInformationGain =
      explorations.length > 0
        ? explorations
            .filter((e) => e.informationGain !== null)
            .reduce((sum, e) => sum + (e.informationGain ?? 0), 0) / explorations.length
        : 0;

    const avgPredictionError =
      explorations.length > 0
        ? explorations
            .filter((e) => e.predictionError !== null)
            .reduce((sum, e) => sum + Math.abs(e.predictionError ?? 0), 0) / explorations.length
        : 0;

    // Group by channel
    const byChannelMap: Record<string, { count: number; totalGain: number }> = {};
    for (const e of explorations) {
      if (!byChannelMap[e.channel]) {
        byChannelMap[e.channel] = { count: 0, totalGain: 0 };
      }
      byChannelMap[e.channel].count++;
      byChannelMap[e.channel].totalGain += e.informationGain ?? 0;
    }

    const explorationByChannel = Object.entries(byChannelMap).map(([channel, data]) => ({
      channel,
      count: data.count,
      avgInformationGain: data.count > 0 ? data.totalGain / data.count : 0,
    }));

    // Group by mode
    const byModeMap: Record<string, { count: number; totalGain: number }> = {};
    for (const e of explorations) {
      const mode = e.explorationMode || "unknown";
      if (!byModeMap[mode]) {
        byModeMap[mode] = { count: 0, totalGain: 0 };
      }
      byModeMap[mode].count++;
      byModeMap[mode].totalGain += e.informationGain ?? 0;
    }

    const explorationByMode = Object.entries(byModeMap).map(([mode, data]) => ({
      mode,
      count: data.count,
      avgInformationGain: data.count > 0 ? data.totalGain / data.count : 0,
    }));

    const currentEpsilon = config?.epsilon ?? 0.1;
    const budgetUtilization = 0; // Would need budget tracking to calculate

    return {
      totalExplorations: explorations.length,
      successfulExplorations,
      avgInformationGain,
      avgPredictionError,
      explorationByChannel,
      explorationByMode,
      currentEpsilon,
      budgetUtilization,
    };
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private async getExplorationConfig(
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

  private calculatePredictedValue(
    hcp: typeof hcpProfiles.$inferSelect,
    channel: string | undefined,
    predictionType: string
  ): number {
    // Simple predicted value based on HCP characteristics
    let baseValue = hcp.overallEngagementScore;

    // Adjust based on channel preference
    if (channel && hcp.channelPreference === channel) {
      baseValue *= 1.2;
    }

    // Adjust based on tier
    if (hcp.tier === "Tier 1") {
      baseValue *= 1.15;
    } else if (hcp.tier === "Tier 3") {
      baseValue *= 0.85;
    }

    // Cap at 100
    return Math.min(100, Math.max(0, baseValue));
  }

  private detectEngagementDrift(
    hcp: typeof hcpProfiles.$inferSelect
  ): { feature: string; previousValue: unknown; currentValue: unknown; driftMagnitude: number } | null {
    // Compare current engagement score to segment average
    // This is a simplified version - in production, you'd compare to historical values
    const segmentAverages: Record<string, number> = {
      "Rising Star": 70,
      Champion: 80,
      "Steady Performer": 60,
      Disengaging: 40,
      Lapsed: 30,
    };

    const expectedScore = segmentAverages[hcp.segment] || 50;
    const drift = Math.abs(hcp.overallEngagementScore - expectedScore) / 100;

    if (drift > 0.2) {
      return {
        feature: "engagement_score",
        previousValue: expectedScore,
        currentValue: hcp.overallEngagementScore,
        driftMagnitude: drift,
      };
    }

    return null;
  }
}

// Export singleton instance
export const uncertaintyCalculator = new UncertaintyCalculator();

// Export class for testing
export { UncertaintyCalculator };
