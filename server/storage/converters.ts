/**
 * Database row to API type converters
 *
 * Converts Drizzle database rows to typed API responses.
 */
import {
  hcpProfiles,
  simulationResults,
  auditLogs,
  stimuliEvents,
  counterfactualScenarios,
  nlQueryLogs,
  modelEvaluations,
  type HCPProfile,
  type SimulationResult,
  type AuditLog,
  type StimuliEvent,
  type CounterfactualScenario,
  type NLQueryResponse,
  type ModelEvaluation,
  type Channel,
  type Specialty,
  type Tier,
  type Segment,
  type StimulusType,
} from "@shared/schema";

export function dbRowToHcpProfile(row: typeof hcpProfiles.$inferSelect): HCPProfile {
  return {
    id: row.id,
    npi: row.npi,
    firstName: row.firstName,
    lastName: row.lastName,
    specialty: row.specialty as Specialty,
    tier: row.tier as Tier,
    segment: row.segment as Segment,
    organization: row.organization,
    city: row.city,
    state: row.state,
    overallEngagementScore: row.overallEngagementScore,
    channelPreference: row.channelPreference as Channel,
    channelEngagements: row.channelEngagements,
    monthlyRxVolume: row.monthlyRxVolume,
    yearlyRxVolume: row.yearlyRxVolume,
    marketSharePct: row.marketSharePct,
    prescribingTrend: row.prescribingTrend,
    conversionLikelihood: row.conversionLikelihood,
    churnRisk: row.churnRisk,
    lastUpdated: row.lastUpdated.toISOString(),
  };
}

export function dbRowToSimulationResult(row: typeof simulationResults.$inferSelect): SimulationResult {
  return {
    id: row.id,
    scenarioId: row.scenarioId,
    scenarioName: row.scenarioName,
    predictedEngagementRate: row.predictedEngagementRate,
    predictedResponseRate: row.predictedResponseRate,
    predictedRxLift: row.predictedRxLift,
    predictedReach: row.predictedReach,
    costPerEngagement: row.costPerEngagement ?? undefined,
    efficiencyScore: row.efficiencyScore,
    channelPerformance: row.channelPerformance,
    vsBaseline: row.vsBaseline,
    runAt: row.runAt.toISOString(),
  };
}

export function dbRowToAuditLog(row: typeof auditLogs.$inferSelect): AuditLog {
  return {
    id: row.id,
    action: row.action,
    entityType: row.entityType,
    entityId: row.entityId,
    details: row.details as Record<string, unknown> | null,
    userId: row.userId,
    ipAddress: row.ipAddress,
    createdAt: row.createdAt.toISOString(),
  };
}

export function dbRowToStimuliEvent(row: typeof stimuliEvents.$inferSelect): StimuliEvent {
  return {
    id: row.id,
    hcpId: row.hcpId,
    stimulusType: row.stimulusType as StimulusType,
    channel: row.channel as Channel,
    contentType: row.contentType,
    messageVariant: row.messageVariant,
    callToAction: row.callToAction,
    predictedEngagementDelta: row.predictedEngagementDelta,
    predictedConversionDelta: row.predictedConversionDelta,
    confidenceLower: row.confidenceLower,
    confidenceUpper: row.confidenceUpper,
    actualEngagementDelta: row.actualEngagementDelta,
    actualConversionDelta: row.actualConversionDelta,
    outcomeRecordedAt: row.outcomeRecordedAt?.toISOString() ?? null,
    status: row.status as "predicted" | "confirmed" | "rejected",
    eventDate: row.eventDate.toISOString(),
    createdAt: row.createdAt.toISOString(),
  };
}

export function dbRowToCounterfactualScenario(row: typeof counterfactualScenarios.$inferSelect): CounterfactualScenario {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    originalScenarioId: row.originalScenarioId,
    originalCampaignData: row.originalCampaignData as Record<string, unknown> | null,
    targetHcpIds: row.targetHcpIds,
    changedVariables: row.changedVariables,
    baselineOutcome: row.baselineOutcome,
    counterfactualOutcome: row.counterfactualOutcome,
    upliftDelta: row.upliftDelta ?? null,
    confidenceInterval: row.confidenceInterval ?? null,
    hcpLevelResults: row.hcpLevelResults ?? null,
    analysisType: row.analysisType as "aggregate" | "individual" | "both",
    status: row.status as "pending" | "running" | "completed" | "failed",
    createdAt: row.createdAt.toISOString(),
    completedAt: row.completedAt?.toISOString() ?? null,
  };
}

export function dbRowToNLQueryResponse(row: typeof nlQueryLogs.$inferSelect): NLQueryResponse {
  return {
    id: row.id,
    query: row.query,
    parsedIntent: row.parsedIntent,
    filters: row.extractedFilters ?? null,
    resultCount: row.resultCount ?? 0,
    recommendations: row.recommendations ?? undefined,
    executionTimeMs: row.executionTimeMs ?? 0,
    createdAt: row.createdAt.toISOString(),
  };
}

export function dbRowToModelEvaluation(row: typeof modelEvaluations.$inferSelect): ModelEvaluation {
  return {
    id: row.id,
    periodStart: row.periodStart.toISOString(),
    periodEnd: row.periodEnd.toISOString(),
    predictionType: row.predictionType as "stimuli_impact" | "counterfactual" | "conversion" | "engagement",
    totalPredictions: row.totalPredictions,
    predictionsWithOutcomes: row.predictionsWithOutcomes,
    meanAbsoluteError: row.meanAbsoluteError,
    rootMeanSquaredError: row.rootMeanSquaredError,
    meanAbsolutePercentError: row.meanAbsolutePercentError,
    r2Score: row.r2Score,
    calibrationSlope: row.calibrationSlope,
    calibrationIntercept: row.calibrationIntercept,
    ciCoverageRate: row.ciCoverageRate,
    avgCiWidth: row.avgCiWidth,
    segmentMetrics: row.segmentMetrics,
    channelMetrics: row.channelMetrics,
    modelVersion: row.modelVersion,
    evaluatedAt: row.evaluatedAt.toISOString(),
  };
}
