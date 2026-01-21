/**
 * NBO Learning Loop Service
 *
 * Phase 12C.4: Feedback collection and model learning
 *
 * Tracks recommendation outcomes to:
 * - Measure recommendation accuracy
 * - Identify patterns in successful/failed recommendations
 * - Provide insights for model improvement
 * - Calculate calibration metrics
 */

import { db } from "../db";
import { eq, and, gte, lte, sql, desc, count } from "drizzle-orm";
import {
  nboFeedbackFact,
  nextBestOrbitRecommendationFact,
  hcpProfiles,
  type NBOFeedbackDB,
  type InsertNBOFeedback,
  type RecordNBOFeedbackRequest,
  type MeasureNBOOutcomeRequest,
  type NBOLearningMetrics,
  type NBOModelPerformance,
  type NBOFeedbackType,
  type NBOOutcomeType,
  type NBOActionType,
  type Channel,
  nboActionTypes,
  channels,
} from "@shared/schema";

// ============================================================================
// FEEDBACK RECORDING
// ============================================================================

/**
 * Record user feedback on an NBO recommendation
 */
export async function recordNBOFeedback(
  request: RecordNBOFeedbackRequest
): Promise<NBOFeedbackDB> {
  // Get the original recommendation
  const [recommendation] = await db
    .select()
    .from(nextBestOrbitRecommendationFact)
    .where(eq(nextBestOrbitRecommendationFact.id, request.recommendationId))
    .limit(1);

  if (!recommendation) {
    throw new Error(`Recommendation not found: ${request.recommendationId}`);
  }

  // Get current HCP metrics for baseline
  const [hcp] = await db
    .select()
    .from(hcpProfiles)
    .where(eq(hcpProfiles.id, recommendation.hcpId))
    .limit(1);

  const feedbackData: InsertNBOFeedback = {
    recommendationId: request.recommendationId,
    hcpId: recommendation.hcpId,
    recommendedAction: recommendation.actionType,
    recommendedChannel: recommendation.recommendedChannel,
    recommendedTheme: recommendation.recommendedTheme,
    originalConfidence: recommendation.confidence,
    feedbackType: request.feedbackType,
    feedbackBy: request.feedbackBy ?? null,
    feedbackAt: new Date(),
    feedbackReason: request.feedbackReason ?? null,
    executedAction: request.executedAction ?? null,
    executedChannel: request.executedChannel ?? null,
    executedTheme: request.executedTheme ?? null,
    executedAt: request.feedbackType === "executed" ? new Date() : null,
    outcomeType: "pending",
    engagementBefore: hcp?.overallEngagementScore ?? null,
    // MSI and CPI would come from saturation/competitive summaries
    msiBefore: null,
    cpiBefore: null,
  };

  const [feedback] = await db
    .insert(nboFeedbackFact)
    .values(feedbackData)
    .returning();

  // Update the recommendation status
  await db
    .update(nextBestOrbitRecommendationFact)
    .set({
      status: mapFeedbackToStatus(request.feedbackType),
      acceptedAt: request.feedbackType === "accepted" ? new Date() : undefined,
      acceptedBy: request.feedbackBy,
    })
    .where(eq(nextBestOrbitRecommendationFact.id, request.recommendationId));

  return feedback;
}

function mapFeedbackToStatus(feedbackType: NBOFeedbackType): string {
  switch (feedbackType) {
    case "accepted":
    case "executed":
      return "accepted";
    case "rejected":
      return "rejected";
    case "modified":
      return "overridden";
    case "deferred":
      return "deferred";
    case "expired":
      return "expired";
    default:
      return "pending";
  }
}

/**
 * Record the measured outcome of an executed recommendation
 */
export async function measureNBOOutcome(
  request: MeasureNBOOutcomeRequest
): Promise<NBOFeedbackDB> {
  const [updated] = await db
    .update(nboFeedbackFact)
    .set({
      outcomeType: request.outcomeType,
      outcomeValue: request.outcomeValue ?? null,
      outcomeMeasuredAt: new Date(),
      engagementAfter: request.engagementAfter ?? null,
      msiAfter: request.msiAfter ?? null,
      cpiAfter: request.cpiAfter ?? null,
    })
    .where(eq(nboFeedbackFact.id, request.feedbackId))
    .returning();

  if (!updated) {
    throw new Error(`Feedback not found: ${request.feedbackId}`);
  }

  return updated;
}

/**
 * Get feedback for a specific recommendation
 */
export async function getNBOFeedback(
  recommendationId: string
): Promise<NBOFeedbackDB | null> {
  const [feedback] = await db
    .select()
    .from(nboFeedbackFact)
    .where(eq(nboFeedbackFact.recommendationId, recommendationId))
    .limit(1);

  return feedback || null;
}

/**
 * Get all feedback for an HCP
 */
export async function getHcpNBOFeedback(
  hcpId: string,
  limit: number = 50
): Promise<NBOFeedbackDB[]> {
  return db
    .select()
    .from(nboFeedbackFact)
    .where(eq(nboFeedbackFact.hcpId, hcpId))
    .orderBy(desc(nboFeedbackFact.feedbackAt))
    .limit(limit);
}

// ============================================================================
// LEARNING METRICS
// ============================================================================

/**
 * Calculate learning metrics for a time period
 */
export async function calculateLearningMetrics(
  startDate: Date,
  endDate: Date = new Date()
): Promise<NBOLearningMetrics> {
  // Get all feedback in period
  const feedback = await db
    .select()
    .from(nboFeedbackFact)
    .where(
      and(
        gte(nboFeedbackFact.feedbackAt, startDate),
        lte(nboFeedbackFact.feedbackAt, endDate)
      )
    );

  // Calculate volume metrics
  const totalRecommendations = feedback.length;
  const acceptedCount = feedback.filter((f) => f.feedbackType === "accepted" || f.feedbackType === "executed").length;
  const rejectedCount = feedback.filter((f) => f.feedbackType === "rejected").length;
  const modifiedCount = feedback.filter((f) => f.feedbackType === "modified").length;
  const expiredCount = feedback.filter((f) => f.feedbackType === "expired").length;

  // Acceptance rate
  const overallAcceptanceRate = totalRecommendations > 0
    ? acceptedCount / totalRecommendations
    : 0;

  // Acceptance by action
  const acceptanceByAction: Record<string, number> = {};
  for (const action of nboActionTypes) {
    const actionFeedback = feedback.filter((f) => f.recommendedAction === action);
    const actionAccepted = actionFeedback.filter((f) => f.feedbackType === "accepted" || f.feedbackType === "executed").length;
    acceptanceByAction[action] = actionFeedback.length > 0
      ? actionAccepted / actionFeedback.length
      : 0;
  }

  // Acceptance by confidence level
  const highConfFeedback = feedback.filter((f) => f.originalConfidence >= 0.75);
  const medConfFeedback = feedback.filter((f) => f.originalConfidence >= 0.5 && f.originalConfidence < 0.75);
  const lowConfFeedback = feedback.filter((f) => f.originalConfidence < 0.5);

  const acceptanceByConfidence = {
    high: highConfFeedback.length > 0
      ? highConfFeedback.filter((f) => f.feedbackType === "accepted" || f.feedbackType === "executed").length / highConfFeedback.length
      : 0,
    medium: medConfFeedback.length > 0
      ? medConfFeedback.filter((f) => f.feedbackType === "accepted" || f.feedbackType === "executed").length / medConfFeedback.length
      : 0,
    low: lowConfFeedback.length > 0
      ? lowConfFeedback.filter((f) => f.feedbackType === "accepted" || f.feedbackType === "executed").length / lowConfFeedback.length
      : 0,
  };

  // Outcome metrics
  const measuredFeedback = feedback.filter((f) => f.outcomeType && f.outcomeType !== "pending");
  const measuredCount = measuredFeedback.length;

  const positiveOutcomes = ["engagement_improved", "competitive_defended", "channel_activated", "relationship_reactivated", "saturation_reduced"];
  const positiveCount = measuredFeedback.filter((f) => positiveOutcomes.includes(f.outcomeType!)).length;
  const positiveOutcomeRate = measuredCount > 0 ? positiveCount / measuredCount : 0;

  // Calculate avg changes
  const withEngagementChange = measuredFeedback.filter((f) => f.engagementBefore != null && f.engagementAfter != null);
  const avgEngagementChange = withEngagementChange.length > 0
    ? withEngagementChange.reduce((sum, f) => sum + (f.engagementAfter! - f.engagementBefore!), 0) / withEngagementChange.length
    : 0;

  const withMsiChange = measuredFeedback.filter((f) => f.msiBefore != null && f.msiAfter != null);
  const avgMsiChange = withMsiChange.length > 0
    ? withMsiChange.reduce((sum, f) => sum + (f.msiAfter! - f.msiBefore!), 0) / withMsiChange.length
    : 0;

  // Confidence calibration
  const calibrationByBucket = calculateCalibration(measuredFeedback);
  const calibrationScore = calculateCalibrationScore(calibrationByBucket);

  // Action effectiveness
  const actionEffectiveness = nboActionTypes.map((action) => {
    const actionFeedback = feedback.filter((f) => f.recommendedAction === action);
    const executed = actionFeedback.filter((f) => f.feedbackType === "accepted" || f.feedbackType === "executed");
    const measured = executed.filter((f) => f.outcomeType && f.outcomeType !== "pending");
    const positive = measured.filter((f) => positiveOutcomes.includes(f.outcomeType!));

    return {
      action,
      recommendedCount: actionFeedback.length,
      executedCount: executed.length,
      positiveOutcomeCount: positive.length,
      avgOutcomeValue: measured.length > 0
        ? measured.reduce((sum, f) => sum + (f.outcomeValue || 0), 0) / measured.length
        : 0,
    };
  });

  // Channel effectiveness
  const channelEffectiveness = channels.map((channel) => {
    const channelFeedback = feedback.filter((f) => f.recommendedChannel === channel);
    const executed = channelFeedback.filter((f) => f.feedbackType === "accepted" || f.feedbackType === "executed");
    const measured = executed.filter((f) => f.outcomeType && f.outcomeType !== "pending");
    const positive = measured.filter((f) => positiveOutcomes.includes(f.outcomeType!));

    return {
      channel,
      recommendedCount: channelFeedback.length,
      executedCount: executed.length,
      positiveOutcomeCount: positive.length,
      avgOutcomeValue: measured.length > 0
        ? measured.reduce((sum, f) => sum + (f.outcomeValue || 0), 0) / measured.length
        : 0,
    };
  });

  const period = `${startDate.toISOString().split("T")[0]} to ${endDate.toISOString().split("T")[0]}`;

  return {
    period,
    totalRecommendations,
    acceptedCount,
    rejectedCount,
    modifiedCount,
    expiredCount,
    overallAcceptanceRate,
    acceptanceByAction: acceptanceByAction as Record<NBOActionType, number>,
    acceptanceByConfidence,
    measuredCount,
    positiveOutcomeRate,
    avgEngagementChange,
    avgMsiChange,
    calibrationScore,
    calibrationByBucket,
    actionEffectiveness: actionEffectiveness as any,
    channelEffectiveness: channelEffectiveness as any,
    generatedAt: new Date().toISOString(),
  };
}

function calculateCalibration(
  measuredFeedback: NBOFeedbackDB[]
): Array<{ confidenceRange: string; predictedSuccessRate: number; actualSuccessRate: number; sampleSize: number }> {
  const buckets = [
    { min: 0, max: 0.5, range: "0-50%" },
    { min: 0.5, max: 0.65, range: "50-65%" },
    { min: 0.65, max: 0.75, range: "65-75%" },
    { min: 0.75, max: 0.85, range: "75-85%" },
    { min: 0.85, max: 1.01, range: "85-100%" },
  ];

  const positiveOutcomes = ["engagement_improved", "competitive_defended", "channel_activated", "relationship_reactivated", "saturation_reduced"];

  return buckets.map((bucket) => {
    const inBucket = measuredFeedback.filter(
      (f) => f.originalConfidence >= bucket.min && f.originalConfidence < bucket.max
    );
    const positiveInBucket = inBucket.filter((f) => positiveOutcomes.includes(f.outcomeType!));

    return {
      confidenceRange: bucket.range,
      predictedSuccessRate: (bucket.min + bucket.max) / 2,
      actualSuccessRate: inBucket.length > 0 ? positiveInBucket.length / inBucket.length : 0,
      sampleSize: inBucket.length,
    };
  });
}

function calculateCalibrationScore(
  calibrationByBucket: Array<{ predictedSuccessRate: number; actualSuccessRate: number; sampleSize: number }>
): number {
  // Brier-like score: lower is better, we invert to 0-1 where 1 is perfect
  const totalSamples = calibrationByBucket.reduce((sum, b) => sum + b.sampleSize, 0);
  if (totalSamples === 0) return 0;

  const weightedError = calibrationByBucket.reduce((sum, bucket) => {
    if (bucket.sampleSize === 0) return sum;
    const error = Math.abs(bucket.predictedSuccessRate - bucket.actualSuccessRate);
    return sum + error * bucket.sampleSize;
  }, 0);

  const avgError = weightedError / totalSamples;
  return Math.max(0, 1 - avgError * 2); // Scale so 0.5 error = 0 score
}

// ============================================================================
// MODEL PERFORMANCE
// ============================================================================

/**
 * Get overall model performance and health
 */
export async function getModelPerformance(): Promise<NBOModelPerformance> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const metrics = await calculateLearningMetrics(thirtyDaysAgo);

  // Calculate health indicators
  const indicators = [
    {
      name: "Acceptance Rate",
      value: Math.round(metrics.overallAcceptanceRate * 100),
      trend: determineTrend(metrics.overallAcceptanceRate, 0.5), // target 50%
      target: 50,
      status: getIndicatorStatus(metrics.overallAcceptanceRate, 0.4, 0.3),
    },
    {
      name: "Positive Outcome Rate",
      value: Math.round(metrics.positiveOutcomeRate * 100),
      trend: determineTrend(metrics.positiveOutcomeRate, 0.6),
      target: 60,
      status: getIndicatorStatus(metrics.positiveOutcomeRate, 0.5, 0.4),
    },
    {
      name: "Calibration Score",
      value: Math.round(metrics.calibrationScore * 100),
      trend: determineTrend(metrics.calibrationScore, 0.7),
      target: 70,
      status: getIndicatorStatus(metrics.calibrationScore, 0.6, 0.5),
    },
    {
      name: "Avg Engagement Change",
      value: Math.round(metrics.avgEngagementChange * 10) / 10,
      trend: metrics.avgEngagementChange > 0 ? "improving" : metrics.avgEngagementChange < 0 ? "declining" : "stable",
      target: 5,
      status: metrics.avgEngagementChange >= 3 ? "on_track" : metrics.avgEngagementChange >= 0 ? "warning" : "critical",
    },
  ];

  // Calculate overall health
  const healthScore = indicators.reduce((sum, ind) => {
    const score = ind.status === "on_track" ? 100 : ind.status === "warning" ? 60 : 20;
    return sum + score;
  }, 0) / indicators.length;

  const overallHealth: "excellent" | "good" | "fair" | "poor" =
    healthScore >= 80 ? "excellent" :
    healthScore >= 60 ? "good" :
    healthScore >= 40 ? "fair" : "poor";

  // Generate improvement suggestions
  const improvementSuggestions = generateImprovementSuggestions(metrics, indicators);

  // Training readiness
  const [feedbackCount] = await db
    .select({ count: count() })
    .from(nboFeedbackFact)
    .where(eq(nboFeedbackFact.usedForTraining, false));

  const newFeedbackSinceLastTraining = feedbackCount?.count || 0;
  const minFeedbackForTraining = 100;

  return {
    overallHealth,
    healthScore: Math.round(healthScore),
    indicators: indicators as any,
    improvementSuggestions,
    trainingReadiness: {
      newFeedbackSinceLastTraining,
      minFeedbackForTraining,
      isReadyForTraining: newFeedbackSinceLastTraining >= minFeedbackForTraining,
      estimatedImprovementPotential: newFeedbackSinceLastTraining >= minFeedbackForTraining ? 5 : undefined,
    },
    lastUpdated: new Date().toISOString(),
  };
}

function determineTrend(value: number, target: number): "improving" | "stable" | "declining" {
  const diff = value - target;
  if (diff > 0.05) return "improving";
  if (diff < -0.1) return "declining";
  return "stable";
}

function getIndicatorStatus(value: number, warningThreshold: number, criticalThreshold: number): "on_track" | "warning" | "critical" {
  if (value >= warningThreshold) return "on_track";
  if (value >= criticalThreshold) return "warning";
  return "critical";
}

function generateImprovementSuggestions(
  metrics: NBOLearningMetrics,
  indicators: Array<{ name: string; value: number; status: string }>
): Array<{ area: string; issue: string; suggestion: string; priority: "high" | "medium" | "low" }> {
  const suggestions: Array<{ area: string; issue: string; suggestion: string; priority: "high" | "medium" | "low" }> = [];

  // Low acceptance rate
  if (metrics.overallAcceptanceRate < 0.4) {
    suggestions.push({
      area: "Acceptance Rate",
      issue: `Only ${Math.round(metrics.overallAcceptanceRate * 100)}% of recommendations are being accepted`,
      suggestion: "Review rejected recommendations to identify common patterns. Consider adjusting confidence thresholds.",
      priority: "high",
    });
  }

  // Low positive outcome rate
  if (metrics.positiveOutcomeRate < 0.5) {
    suggestions.push({
      area: "Outcome Quality",
      issue: `Only ${Math.round(metrics.positiveOutcomeRate * 100)}% of executed recommendations show positive outcomes`,
      suggestion: "Analyze failed recommendations to identify decision rule gaps. Consider adding more context signals.",
      priority: "high",
    });
  }

  // Poor calibration
  if (metrics.calibrationScore < 0.6) {
    suggestions.push({
      area: "Confidence Calibration",
      issue: "Model confidence scores don't align well with actual outcomes",
      suggestion: "High confidence recommendations should have higher success rates. Retrain confidence scoring.",
      priority: "medium",
    });
  }

  // Low action-specific acceptance
  const lowAcceptanceActions = Object.entries(metrics.acceptanceByAction)
    .filter(([_, rate]) => rate < 0.3)
    .map(([action]) => action);

  if (lowAcceptanceActions.length > 0) {
    suggestions.push({
      area: "Action Types",
      issue: `Low acceptance for: ${lowAcceptanceActions.join(", ")}`,
      suggestion: "Review decision rules for these action types. Users may not find them relevant.",
      priority: "medium",
    });
  }

  // Insufficient measurement
  if (metrics.measuredCount < metrics.acceptedCount * 0.5) {
    suggestions.push({
      area: "Outcome Tracking",
      issue: "Many executed recommendations lack outcome measurements",
      suggestion: "Implement automated outcome tracking to improve learning data quality.",
      priority: "low",
    });
  }

  return suggestions;
}

// ============================================================================
// BATCH OUTCOME MEASUREMENT
// ============================================================================

/**
 * Automatically measure outcomes for recommendations that are past their measurement period
 */
export async function measurePendingOutcomes(): Promise<{ measured: number; errors: number }> {
  // Get feedback that needs measurement (executed 30+ days ago, no outcome yet)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const pendingFeedback = await db
    .select()
    .from(nboFeedbackFact)
    .where(
      and(
        eq(nboFeedbackFact.outcomeType, "pending"),
        lte(nboFeedbackFact.executedAt, thirtyDaysAgo)
      )
    );

  let measured = 0;
  let errors = 0;

  for (const feedback of pendingFeedback) {
    try {
      // Get current HCP state
      const [hcp] = await db
        .select()
        .from(hcpProfiles)
        .where(eq(hcpProfiles.id, feedback.hcpId))
        .limit(1);

      if (!hcp) continue;

      const engagementChange = hcp.overallEngagementScore - (feedback.engagementBefore || hcp.overallEngagementScore);

      // Determine outcome type based on changes
      let outcomeType: NBOOutcomeType;
      if (engagementChange >= 5) {
        outcomeType = "engagement_improved";
      } else if (engagementChange <= -5) {
        outcomeType = "engagement_declined";
      } else {
        outcomeType = "engagement_stable";
      }

      await db
        .update(nboFeedbackFact)
        .set({
          outcomeType,
          outcomeValue: engagementChange,
          engagementAfter: hcp.overallEngagementScore,
          outcomeMeasuredAt: new Date(),
        })
        .where(eq(nboFeedbackFact.id, feedback.id));

      measured++;
    } catch (error) {
      console.error(`Error measuring outcome for feedback ${feedback.id}:`, error);
      errors++;
    }
  }

  return { measured, errors };
}

// Export service
export const nboLearningService = {
  recordFeedback: recordNBOFeedback,
  measureOutcome: measureNBOOutcome,
  getFeedback: getNBOFeedback,
  getHcpFeedback: getHcpNBOFeedback,
  calculateMetrics: calculateLearningMetrics,
  getModelPerformance,
  measurePendingOutcomes,
};
