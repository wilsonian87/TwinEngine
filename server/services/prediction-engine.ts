/**
 * PredictionEngine - Pure functions for prediction algorithms
 *
 * This module contains the core prediction logic for:
 * - Stimuli impact prediction
 * - Similarity scoring (lookalike modeling)
 * - Simulation engine
 * - Counterfactual analysis
 */

import type {
  HCPProfile,
  Channel,
  StimulusType,
  InsertSimulationScenario,
  ChannelPerformance,
  BaselineComparison,
  CounterfactualOutcome,
  UpliftDelta,
  ConfidenceInterval,
  HCPCounterfactualResult,
  CreateCounterfactualRequest,
} from '@shared/schema';

// Type for simulation engine result
export type SimulationEngineResult = {
  predictedEngagementRate: number;
  predictedResponseRate: number;
  predictedRxLift: number;
  predictedReach: number;
  efficiencyScore: number;
  channelPerformance: ChannelPerformance[];
  vsBaseline: BaselineComparison;
};

// Type for stimuli impact prediction result
export type StimuliImpactResult = {
  engagementDelta: number;
  conversionDelta: number;
  confidenceLower: number;
  confidenceUpper: number;
};

// Type for counterfactual analysis result
export type CounterfactualAnalysisResult = {
  baselineOutcome: CounterfactualOutcome;
  counterfactualOutcome: CounterfactualOutcome;
  upliftDelta: UpliftDelta;
  confidenceInterval: ConfidenceInterval;
  hcpLevelResults: HCPCounterfactualResult[] | null;
};

// Random helpers
const randomFloat = (min: number, max: number, decimals: number = 1) =>
  parseFloat((Math.random() * (max - min) + min).toFixed(decimals));

/**
 * Predicts the impact of a stimulus on an HCP
 */
export function predictStimuliImpact(
  hcp: HCPProfile,
  stimulusType: StimulusType,
  channel: Channel,
  contentType?: string,
  callToAction?: string
): StimuliImpactResult {
  // Base impact weights by stimulus type
  const stimulusWeights: Record<StimulusType, { engagement: number; conversion: number }> = {
    rep_visit: { engagement: 8, conversion: 5 },
    email_send: { engagement: 3, conversion: 1 },
    email_open: { engagement: 5, conversion: 2 },
    email_click: { engagement: 8, conversion: 4 },
    webinar_invite: { engagement: 4, conversion: 2 },
    webinar_attend: { engagement: 12, conversion: 6 },
    conference_meeting: { engagement: 15, conversion: 8 },
    phone_call: { engagement: 6, conversion: 3 },
    digital_ad_impression: { engagement: 1, conversion: 0.5 },
    digital_ad_click: { engagement: 4, conversion: 2 },
    sample_delivery: { engagement: 10, conversion: 7 },
    content_download: { engagement: 7, conversion: 4 },
  };

  // Channel affinity modifier based on HCP's preference
  const channelAffinityModifier = hcp.channelPreference === channel ? 1.3 : 0.9;

  // Tier modifier (Tier 1 typically more responsive)
  const tierModifier = hcp.tier === 'Tier 1' ? 1.2 : hcp.tier === 'Tier 2' ? 1.0 : 0.85;

  // Engagement score modifier (highly engaged HCPs respond better)
  const engagementModifier = 0.7 + (hcp.overallEngagementScore / 100) * 0.6;

  // Content type modifier
  const contentModifiers: Record<string, number> = {
    educational: 1.1,
    clinical_data: 1.15,
    promotional: 0.95,
    savings: 1.2,
    mixed: 1.0,
  };
  const contentModifier = contentType ? (contentModifiers[contentType] || 1.0) : 1.0;

  // CTA optimization (certain phrases historically perform better)
  let ctaModifier = 1.0;
  if (callToAction) {
    const cta = callToAction.toLowerCase();
    if (cta.includes('save') || cta.includes('savings')) ctaModifier = 1.15;
    else if (cta.includes('patient') || cta.includes('outcomes')) ctaModifier = 1.12;
    else if (cta.includes('learn') || cta.includes('discover')) ctaModifier = 1.05;
    else if (cta.includes('free') || cta.includes('trial')) ctaModifier = 1.08;
  }

  const baseWeight = stimulusWeights[stimulusType] || { engagement: 5, conversion: 2 };

  // Calculate predicted deltas
  const engagementDelta = baseWeight.engagement * channelAffinityModifier * tierModifier * engagementModifier * contentModifier * ctaModifier;
  const conversionDelta = baseWeight.conversion * channelAffinityModifier * tierModifier * engagementModifier * contentModifier * ctaModifier;

  // Calculate confidence interval (wider for less common interactions)
  const baseVariance = 0.25;
  const confidenceRange = Math.max(engagementDelta * baseVariance, 2);

  return {
    engagementDelta: parseFloat(engagementDelta.toFixed(2)),
    conversionDelta: parseFloat(conversionDelta.toFixed(2)),
    confidenceLower: parseFloat(Math.max(0, engagementDelta - confidenceRange).toFixed(2)),
    confidenceUpper: parseFloat((engagementDelta + confidenceRange).toFixed(2)),
  };
}

/**
 * Calculates similarity score between two HCPs for lookalike modeling
 */
export function calculateSimilarityScore(hcp1: HCPProfile, hcp2: HCPProfile): number {
  let score = 0;

  // Same specialty (high weight)
  if (hcp1.specialty === hcp2.specialty) score += 30;

  // Same tier (medium weight)
  if (hcp1.tier === hcp2.tier) score += 20;

  // Same segment (medium weight)
  if (hcp1.segment === hcp2.segment) score += 20;

  // Similar engagement score (within 15 points)
  const engagementDiff = Math.abs(hcp1.overallEngagementScore - hcp2.overallEngagementScore);
  if (engagementDiff <= 15) score += 15 - engagementDiff;

  // Similar Rx volume (within 20%)
  const rxRatio = Math.min(hcp1.monthlyRxVolume, hcp2.monthlyRxVolume) /
                  Math.max(hcp1.monthlyRxVolume, hcp2.monthlyRxVolume);
  score += rxRatio * 10;

  // Same channel preference
  if (hcp1.channelPreference === hcp2.channelPreference) score += 5;

  return score;
}

/**
 * Runs the simulation engine to predict campaign outcomes
 */
export function runSimulationEngine(
  scenario: InsertSimulationScenario,
  hcpCount: number
): SimulationEngineResult {
  // Channel weights based on industry benchmarks
  const channelWeights: Record<Channel, number> = {
    email: 0.7,
    rep_visit: 1.2,
    webinar: 0.9,
    conference: 1.0,
    digital_ad: 0.6,
    phone: 0.8,
  };

  const contentWeights: Record<string, number> = {
    educational: 1.1,
    promotional: 0.9,
    clinical_data: 1.15,
    mixed: 1.0,
  };

  // Calculate weighted channel score
  let channelScore = 0;
  const channelPerformance: ChannelPerformance[] = Object.entries(scenario.channelMix).map(([channel, allocation]) => {
    const weight = channelWeights[channel as Channel];
    const contribution = (allocation / 100) * weight;
    channelScore += contribution;

    return {
      channel: channel as Channel,
      allocation,
      predictedResponse: randomFloat(15, 45) * weight,
      contribution: contribution * 100,
    };
  });

  // Calculate predicted outcomes with enhanced algorithms
  const frequency = scenario.frequency ?? 4;
  const duration = scenario.duration ?? 3;
  const contentType = scenario.contentType ?? 'mixed';
  const frequencyFactor = Math.min(1.5, 0.5 + frequency * 0.1);
  const durationFactor = Math.min(1.3, 0.7 + duration * 0.05);
  const contentFactor = contentWeights[contentType] || 1.0;

  // Base rates with variance
  const baseEngagement = 45 + randomFloat(-5, 10);
  const baseResponse = 25 + randomFloat(-3, 8);
  const baseRxLift = 8 + randomFloat(-2, 5);

  const predictedEngagementRate = Math.min(95, baseEngagement * channelScore * frequencyFactor * contentFactor);
  const predictedResponseRate = Math.min(70, baseResponse * channelScore * durationFactor);
  const predictedRxLift = Math.min(25, baseRxLift * channelScore * durationFactor * contentFactor);
  const predictedReach = Math.floor(hcpCount * (0.7 + Math.random() * 0.25));

  const efficiencyScore = Math.floor(
    (predictedEngagementRate * 0.3 + predictedResponseRate * 0.4 + predictedRxLift * 2) * 0.8
  );

  // Baseline comparison (historical average)
  const baselineEngagement = 42;
  const baselineResponse = 22;
  const baselineRxLift = 6;

  const vsBaseline: BaselineComparison = {
    engagementDelta: predictedEngagementRate - baselineEngagement,
    responseDelta: predictedResponseRate - baselineResponse,
    rxLiftDelta: predictedRxLift - baselineRxLift,
  };

  return {
    predictedEngagementRate,
    predictedResponseRate,
    predictedRxLift,
    predictedReach,
    efficiencyScore: Math.min(100, efficiencyScore),
    channelPerformance,
    vsBaseline,
  };
}

/**
 * Runs counterfactual analysis to predict outcomes under different scenarios
 */
export function runCounterfactualAnalysis(
  hcps: HCPProfile[],
  changedVariables: CreateCounterfactualRequest['changedVariables'],
  analysisType: 'aggregate' | 'individual' | 'both'
): CounterfactualAnalysisResult {
  // Calculate baseline metrics from current HCP data
  const totalHcps = hcps.length;
  const baselineEngagement = hcps.reduce((sum, h) => sum + h.overallEngagementScore, 0) / totalHcps;
  const baselineConversion = hcps.reduce((sum, h) => sum + h.conversionLikelihood, 0) / totalHcps;
  const baselineResponse = hcps.reduce((sum, h) => {
    const avgResponse = h.channelEngagements.reduce((s, c) => s + c.responseRate, 0) / h.channelEngagements.length;
    return sum + avgResponse;
  }, 0) / totalHcps;

  // Apply counterfactual changes to predict new outcomes
  let engagementMultiplier = 1.0;
  let responseMultiplier = 1.0;
  let conversionMultiplier = 1.0;
  let rxLiftMultiplier = 1.0;

  for (const variable of changedVariables) {
    switch (variable.variableType) {
      case 'call_to_action':
        const ctaNew = String(variable.counterfactualValue).toLowerCase();
        if (ctaNew.includes('patient') || ctaNew.includes('save') || ctaNew.includes('outcomes')) {
          responseMultiplier *= 1.18;
          conversionMultiplier *= 1.12;
        }
        break;

      case 'channel_mix':
        const origMix = variable.originalValue as Record<string, number>;
        const newMix = variable.counterfactualValue as Record<string, number>;
        const repVisitDelta = ((newMix.rep_visit || 0) - (origMix.rep_visit || 0)) / 100;
        engagementMultiplier += repVisitDelta * 0.3;
        const digitalDelta = ((newMix.digital_ad || 0) + (newMix.email || 0) - (origMix.digital_ad || 0) - (origMix.email || 0)) / 100;
        responseMultiplier += digitalDelta * 0.1;
        break;

      case 'frequency':
        const freqOrig = Number(variable.originalValue);
        const freqNew = Number(variable.counterfactualValue);
        const freqRatio = freqNew / freqOrig;
        engagementMultiplier *= Math.pow(freqRatio, 0.4);
        break;

      case 'content_type':
        if (variable.counterfactualValue === 'clinical_data') {
          responseMultiplier *= 1.15;
          conversionMultiplier *= 1.1;
        } else if (variable.counterfactualValue === 'educational') {
          engagementMultiplier *= 1.08;
        }
        break;

      case 'messaging':
        responseMultiplier *= 1.05;
        break;

      case 'timing':
        responseMultiplier *= 1.07;
        break;

      case 'budget':
        const budgetRatio = Number(variable.counterfactualValue) / Number(variable.originalValue);
        engagementMultiplier *= Math.pow(budgetRatio, 0.3);
        break;
    }
  }

  // Calculate counterfactual outcomes
  const cfEngagement = Math.min(100, baselineEngagement * engagementMultiplier);
  const cfResponse = Math.min(100, baselineResponse * responseMultiplier);
  const cfConversion = Math.min(100, baselineConversion * conversionMultiplier);
  const cfRxLift = 8 * rxLiftMultiplier * (cfConversion / baselineConversion);

  const baselineOutcome: CounterfactualOutcome = {
    engagementRate: parseFloat(baselineEngagement.toFixed(2)),
    responseRate: parseFloat(baselineResponse.toFixed(2)),
    conversionRate: parseFloat(baselineConversion.toFixed(2)),
    rxLift: 8,
    totalReach: totalHcps,
  };

  const counterfactualOutcome: CounterfactualOutcome = {
    engagementRate: parseFloat(cfEngagement.toFixed(2)),
    responseRate: parseFloat(cfResponse.toFixed(2)),
    conversionRate: parseFloat(cfConversion.toFixed(2)),
    rxLift: parseFloat(cfRxLift.toFixed(2)),
    totalReach: totalHcps,
  };

  const percentageImprovement = ((cfConversion - baselineConversion) / baselineConversion) * 100;

  const upliftDelta: UpliftDelta = {
    engagementDelta: parseFloat((cfEngagement - baselineEngagement).toFixed(2)),
    responseDelta: parseFloat((cfResponse - baselineResponse).toFixed(2)),
    conversionDelta: parseFloat((cfConversion - baselineConversion).toFixed(2)),
    rxLiftDelta: parseFloat((cfRxLift - 8).toFixed(2)),
    percentageImprovement: parseFloat(percentageImprovement.toFixed(2)),
  };

  const confidenceInterval: ConfidenceInterval = {
    lower: parseFloat((percentageImprovement - 5).toFixed(2)),
    upper: parseFloat((percentageImprovement + 5).toFixed(2)),
    confidenceLevel: 0.95,
  };

  // Calculate per-HCP results if requested
  let hcpLevelResults: HCPCounterfactualResult[] | null = null;
  if (analysisType === 'individual' || analysisType === 'both') {
    hcpLevelResults = hcps.slice(0, 50).map(hcp => {
      const baseScore = hcp.overallEngagementScore;
      const delta = (cfEngagement - baselineEngagement) * (0.8 + Math.random() * 0.4);
      const cfScore = Math.min(100, baseScore + delta);

      return {
        hcpId: hcp.id,
        baselineScore: baseScore,
        counterfactualScore: parseFloat(cfScore.toFixed(2)),
        delta: parseFloat(delta.toFixed(2)),
        confidenceLower: parseFloat((delta - 3).toFixed(2)),
        confidenceUpper: parseFloat((delta + 3).toFixed(2)),
      };
    });
  }

  return {
    baselineOutcome,
    counterfactualOutcome,
    upliftDelta,
    confidenceInterval,
    hcpLevelResults,
  };
}
