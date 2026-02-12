/**
 * Next Best Orbit (NBO) Engine
 *
 * Phase 12C.1: Decision Logic Formalization
 *
 * Generates personalized engagement recommendations by integrating:
 * - Engagement trajectory (20%)
 * - Adoption stage (15%)
 * - Channel affinity (20%)
 * - Message saturation / MSI (20%)
 * - Competitive pressure / CPI (15%)
 * - Recent touch history (10%)
 *
 * Key Principles:
 * - Every recommendation includes human-readable rationale
 * - Confidence scores are meaningful and auditable
 * - Decision logic is transparent and adjustable
 */

import type {
  HCPProfile,
  Channel,
  AdoptionStage,
  SaturationRiskLevel,
  NBOActionType,
  NBOConfidenceLevel,
  NBOInputWeights,
  NBOInputSnapshot,
  NBOComponentScores,
  NBORecommendation,
  NBODecisionRule,
  HcpMessageSaturationSummary,
  HcpCompetitiveSummary,
  DEFAULT_NBO_WEIGHTS,
} from "@shared/schema";
import { classifyChannelHealth, type ChannelHealth, type HealthStatus } from "./channel-health";

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_WEIGHTS: NBOInputWeights = {
  engagementTrajectory: 0.20,
  adoptionStage: 0.15,
  channelAffinity: 0.20,
  messageSaturation: 0.20,
  competitivePressure: 0.15,
  recentTouchHistory: 0.10,
};

// Confidence thresholds
const CONFIDENCE_THRESHOLDS = {
  HIGH: 0.75,
  MEDIUM: 0.50,
};

// Action type priorities (lower = more urgent)
const ACTION_PRIORITIES: Record<NBOActionType, number> = {
  defend: 1,
  reactivate: 2,
  engage: 3,
  expand: 4,
  reinforce: 5,
  nurture: 6,
  pause: 7,
};

// ============================================================================
// DECISION RULES (Rule-based fast path)
// ============================================================================

const DECISION_RULES: NBODecisionRule[] = [
  // Rule 1: Critical competitive threat - immediate defense
  {
    id: "rule-defend-critical",
    name: "Defend Against Critical Threat",
    description: "High CPI with recent competitor activity requires immediate defensive action",
    priority: 1,
    conditions: {
      cpiRange: { min: 80 },
    },
    outcome: {
      actionType: "defend",
      confidenceBoost: 0.15,
      rationaleTemplate: "URGENT: High competitive pressure (CPI: {cpi}) detected. {competitor} activity requires immediate defensive engagement.",
    },
    isActive: true,
  },

  // Rule 2: Critical saturation - pause
  {
    id: "rule-pause-saturated",
    name: "Pause Saturated Messaging",
    description: "Very high MSI indicates message fatigue - reduce frequency",
    priority: 2,
    conditions: {
      msiRange: { min: 85 },
    },
    outcome: {
      actionType: "pause",
      confidenceBoost: 0.10,
      rationaleTemplate: "PAUSE RECOMMENDED: Message saturation is critical (MSI: {msi}). Reduce touch frequency to prevent engagement decline.",
    },
    isActive: true,
  },

  // Rule 3: Dormant HCP - reactivate
  {
    id: "rule-reactivate-dormant",
    name: "Reactivate Dormant HCP",
    description: "No contact in 60+ days with previously active HCP",
    priority: 3,
    conditions: {
      daysSinceLastTouchRange: { min: 90 },
      channelHealthStatus: ["declining", "dark"],
    },
    outcome: {
      actionType: "reactivate",
      confidenceBoost: 0.05,
      rationaleTemplate: "RE-ENGAGEMENT NEEDED: No contact in {daysSinceLastTouch} days. Relationship at risk of going dormant.",
    },
    isActive: true,
  },

  // Rule 4: High opportunity - expand
  {
    id: "rule-expand-opportunity",
    name: "Expand Multi-Channel",
    description: "Strong single-channel engagement presents expansion opportunity",
    priority: 4,
    conditions: {
      channelHealthStatus: ["opportunity"],
      msiRange: { max: 40 },
    },
    outcome: {
      actionType: "expand",
      confidenceBoost: 0.10,
      rationaleTemplate: "EXPANSION OPPORTUNITY: Strong affinity on {preferredChannel} with low saturation. Ideal time to introduce additional channels.",
    },
    isActive: true,
  },

  // Rule 5: New awareness stage - engage
  {
    id: "rule-engage-awareness",
    name: "Engage New Prospects",
    description: "Awareness stage HCPs need active engagement",
    priority: 5,
    conditions: {
      adoptionStages: ["awareness"],
      msiRange: { max: 50 },
    },
    outcome: {
      actionType: "engage",
      confidenceBoost: 0.05,
      rationaleTemplate: "ENGAGE: HCP is in awareness stage with room for messaging (MSI: {msi}). Active engagement recommended.",
    },
    isActive: true,
  },

  // Rule 6: Loyal prescriber - nurture
  {
    id: "rule-nurture-loyal",
    name: "Nurture Loyal Prescribers",
    description: "Loyalty stage with stable engagement - maintain relationship",
    priority: 6,
    conditions: {
      adoptionStages: ["loyalty"],
      msiRange: { max: 60 },
      engagementTrend: "stable",
    },
    outcome: {
      actionType: "nurture",
      confidenceBoost: 0.05,
      rationaleTemplate: "MAINTAIN: Loyal prescriber with stable engagement. Continue relationship-building with measured frequency.",
    },
    isActive: true,
  },
];

// ============================================================================
// SCORE CALCULATORS
// ============================================================================

/**
 * Calculate engagement trajectory score (-1 to 1)
 * Positive = improving, Negative = declining
 */
function calculateEngagementScore(hcp: HCPProfile): { score: number; trend: "improving" | "stable" | "declining" } {
  // Use overall engagement score
  const avgEngagement = hcp.overallEngagementScore;

  // Normalize to 0-1 range
  const normalizedEngagement = avgEngagement / 100;

  // Calculate total touches from channel engagements
  const totalTouches = hcp.channelEngagements.reduce((sum, ch) => sum + ch.totalTouches, 0);

  // Estimate trend from touchpoint density
  // Higher touchpoints with maintained engagement = improving
  const touchDensity = Math.min(totalTouches / 50, 1); // Cap at 50 touches

  let trend: "improving" | "stable" | "declining";
  if (normalizedEngagement > 0.6 && touchDensity > 0.5) {
    trend = "improving";
  } else if (normalizedEngagement < 0.4 || touchDensity < 0.2) {
    trend = "declining";
  } else {
    trend = "stable";
  }

  // Convert to -1 to 1 scale
  const score = (normalizedEngagement - 0.5) * 2;

  return { score, trend };
}

/**
 * Calculate adoption stage score (-1 to 1)
 * Higher stages = more valuable relationships
 */
function calculateAdoptionScore(stage: AdoptionStage | null): number {
  const stageScores: Record<AdoptionStage, number> = {
    awareness: -0.3,      // Early stage, needs nurturing
    consideration: 0.0,   // Neutral, evaluating
    trial: 0.3,           // Positive progress
    loyalty: 0.7,         // Highly valuable
  };

  return stageScores[stage || "consideration"];
}

/**
 * Calculate channel affinity score (-1 to 1)
 * Based on channel health status and preference alignment
 */
function calculateChannelScore(
  hcp: HCPProfile,
  channelHealth: ChannelHealth[]
): { score: number; bestChannel: Channel; healthMap: Record<Channel, HealthStatus> } {
  const healthMap: Record<Channel, HealthStatus> = {} as Record<Channel, HealthStatus>;

  // Find best channel
  let bestChannel: Channel = hcp.channelPreference;
  let bestScore = -1;

  for (const ch of channelHealth) {
    healthMap[ch.channel] = ch.status;

    // Score based on health status
    const statusScores: Record<HealthStatus, number> = {
      opportunity: 1.0,
      active: 0.7,
      declining: 0.0,
      dark: -0.3,
      blocked: -0.7,
    };

    const channelScore = statusScores[ch.status];
    if (channelScore > bestScore) {
      bestScore = channelScore;
      bestChannel = ch.channel;
    }
  }

  // Boost if best channel matches preference
  if (bestChannel === hcp.channelPreference) {
    bestScore = Math.min(1, bestScore + 0.2);
  }

  return { score: bestScore, bestChannel, healthMap };
}

/**
 * Calculate saturation score (-1 to 1)
 * Negative = saturated (bad), Positive = fresh opportunity
 */
function calculateSaturationScore(
  saturationSummary: HcpMessageSaturationSummary | null
): { score: number; msi: number; riskLevel: SaturationRiskLevel; saturatedThemes: string[]; availableThemes: string[] } {
  if (!saturationSummary) {
    return {
      score: 0.5, // No data = assume moderate opportunity
      msi: 0,
      riskLevel: "low",
      saturatedThemes: [],
      availableThemes: [],
    };
  }

  const msi = saturationSummary.overallMsi;

  // Invert MSI to score (100 MSI = -1, 0 MSI = 1)
  const score = 1 - (msi / 50); // 0-100 MSI maps to 1 to -1

  // Identify saturated vs available themes
  const saturatedThemes = saturationSummary.exposures
    .filter((e) => (e.msi ?? 0) >= 65)
    .map((e) => e.themeName || "Unknown");

  const availableThemes = saturationSummary.exposures
    .filter((e) => (e.msi ?? 0) < 40)
    .map((e) => e.themeName || "Unknown");

  return {
    score: Math.max(-1, Math.min(1, score)),
    msi,
    riskLevel: saturationSummary.riskLevel,
    saturatedThemes,
    availableThemes,
  };
}

/**
 * Calculate competitive pressure score (-1 to 1)
 * Positive = under competitive threat (needs action)
 */
function calculateCompetitiveScore(
  competitiveSummary: HcpCompetitiveSummary | null
): { score: number; cpi: number; riskLevel: "low" | "medium" | "high" | "critical"; topCompetitor: string | null; flag: string | null } {
  if (!competitiveSummary) {
    return {
      score: 0,
      cpi: 0,
      riskLevel: "low",
      topCompetitor: null,
      flag: null,
    };
  }

  const cpi = competitiveSummary.overallCpi;

  // High CPI = positive score (needs defensive action)
  const score = (cpi - 50) / 50; // 0-100 CPI maps to -1 to 1

  return {
    score: Math.max(-1, Math.min(1, score)),
    cpi,
    riskLevel: competitiveSummary.riskLevel,
    topCompetitor: competitiveSummary.topCompetitor?.name ?? null,
    flag: null, // Would come from competitive insight engine
  };
}

/**
 * Calculate recency score (-1 to 1)
 * Based on days since last touch
 */
function calculateRecencyScore(
  hcp: HCPProfile
): { score: number; daysSinceLastTouch: number; touchesLast30Days: number; touchesLast90Days: number } {
  // Find the most recent contact from channel engagements
  let daysSinceLastTouch = 999;
  const now = Date.now();
  for (const ch of hcp.channelEngagements) {
    if (ch.lastContact) {
      const lastContactDate = new Date(ch.lastContact);
      const days = Math.floor((now - lastContactDate.getTime()) / (1000 * 60 * 60 * 24));
      if (days >= 0 && days < daysSinceLastTouch) {
        daysSinceLastTouch = days;
      }
    }
  }

  // Calculate total touches
  const totalTouches = hcp.channelEngagements.reduce((sum, ch) => sum + ch.totalTouches, 0);

  // Score based on recency
  // 0-7 days = 1.0, 7-30 days = 0.5, 30-60 days = 0, 60+ days = negative
  let score: number;
  if (daysSinceLastTouch <= 7) {
    score = 1.0;
  } else if (daysSinceLastTouch <= 30) {
    score = 1 - (daysSinceLastTouch - 7) / 46; // Linear decay to 0.5
  } else if (daysSinceLastTouch <= 60) {
    score = 0.5 - (daysSinceLastTouch - 30) / 60; // Linear decay to 0
  } else {
    score = -Math.min(1, (daysSinceLastTouch - 60) / 90); // Negative for dormant
  }

  // Estimate touch counts (simplified)
  const touchesLast30Days = Math.max(0, totalTouches - Math.floor(daysSinceLastTouch / 30) * 3);
  const touchesLast90Days = totalTouches;

  return {
    score,
    daysSinceLastTouch,
    touchesLast30Days: Math.min(touchesLast30Days, totalTouches),
    touchesLast90Days,
  };
}

// ============================================================================
// DECISION LOGIC
// ============================================================================

/**
 * Determine action type based on component scores and rules
 */
function determineActionType(
  componentScores: NBOComponentScores,
  inputs: NBOInputSnapshot,
  rules: NBODecisionRule[]
): { actionType: NBOActionType; matchedRule: NBODecisionRule | null; confidenceBoost: number } {
  // Check rules in priority order
  for (const rule of rules.filter((r) => r.isActive).sort((a, b) => a.priority - b.priority)) {
    if (matchesRule(rule, inputs)) {
      return {
        actionType: rule.outcome.actionType,
        matchedRule: rule,
        confidenceBoost: rule.outcome.confidenceBoost,
      };
    }
  }

  // Fallback to score-based decision
  const { compositeScore, saturationScore, competitiveScore, engagementScore, channelScore } = componentScores;

  // Decision matrix based on dominant signals
  if (competitiveScore > 0.5) {
    return { actionType: "defend", matchedRule: null, confidenceBoost: 0 };
  }

  if (saturationScore < -0.5) {
    return { actionType: "pause", matchedRule: null, confidenceBoost: 0 };
  }

  if (engagementScore < -0.3 && componentScores.recencyScore < -0.3) {
    return { actionType: "reactivate", matchedRule: null, confidenceBoost: 0 };
  }

  if (channelScore > 0.7 && saturationScore > 0.3) {
    return { actionType: "expand", matchedRule: null, confidenceBoost: 0 };
  }

  if (inputs.adoptionStage === "awareness" || inputs.adoptionStage === "consideration") {
    return { actionType: "engage", matchedRule: null, confidenceBoost: 0 };
  }

  if (inputs.adoptionStage === "loyalty" && engagementScore > 0) {
    return { actionType: "nurture", matchedRule: null, confidenceBoost: 0 };
  }

  // Default to reinforce
  return { actionType: "reinforce", matchedRule: null, confidenceBoost: 0 };
}

/**
 * Check if inputs match a decision rule's conditions
 */
function matchesRule(rule: NBODecisionRule, inputs: NBOInputSnapshot): boolean {
  const { conditions } = rule;

  if (conditions.msiRange) {
    const msi = inputs.overallMsi ?? 0;
    if (conditions.msiRange.min !== undefined && msi < conditions.msiRange.min) return false;
    if (conditions.msiRange.max !== undefined && msi > conditions.msiRange.max) return false;
  }

  if (conditions.cpiRange) {
    const cpi = inputs.cpi ?? 0;
    if (conditions.cpiRange.min !== undefined && cpi < conditions.cpiRange.min) return false;
    if (conditions.cpiRange.max !== undefined && cpi > conditions.cpiRange.max) return false;
  }

  if (conditions.adoptionStages && inputs.adoptionStage) {
    if (!conditions.adoptionStages.includes(inputs.adoptionStage)) return false;
  }

  if (conditions.channelHealthStatus && inputs.channelHealth) {
    const healthValues = Object.values(inputs.channelHealth);
    const hasMatchingStatus = healthValues.some((h) =>
      conditions.channelHealthStatus!.includes(h as any)
    );
    if (!hasMatchingStatus) return false;
  }

  if (conditions.daysSinceLastTouchRange) {
    const days = inputs.daysSinceLastTouch ?? 0;
    if (conditions.daysSinceLastTouchRange.min !== undefined && days < conditions.daysSinceLastTouchRange.min) return false;
    if (conditions.daysSinceLastTouchRange.max !== undefined && days > conditions.daysSinceLastTouchRange.max) return false;
  }

  if (conditions.engagementTrend && inputs.engagementTrend !== conditions.engagementTrend) {
    return false;
  }

  return true;
}

/**
 * Calculate confidence level from composite score
 */
function calculateConfidence(
  compositeScore: number,
  boost: number,
  hasConflictingSignals: boolean
): { confidence: number; level: NBOConfidenceLevel } {
  // Base confidence from composite score (0-100 -> 0-1)
  let confidence = compositeScore / 100 + boost;

  // Reduce confidence if signals conflict
  if (hasConflictingSignals) {
    confidence *= 0.8;
  }

  confidence = Math.max(0, Math.min(1, confidence));

  let level: NBOConfidenceLevel;
  if (confidence >= CONFIDENCE_THRESHOLDS.HIGH) {
    level = "high";
  } else if (confidence >= CONFIDENCE_THRESHOLDS.MEDIUM) {
    level = "medium";
  } else {
    level = "low";
  }

  return { confidence, level };
}

/**
 * Generate human-readable rationale
 */
function generateRationale(
  actionType: NBOActionType,
  inputs: NBOInputSnapshot,
  componentScores: NBOComponentScores,
  matchedRule: NBODecisionRule | null
): { rationale: string; keyFactors: string[] } {
  const keyFactors: string[] = [];

  // Build key factors list
  if (inputs.cpi && inputs.cpi >= 50) {
    keyFactors.push(`Competitive pressure: CPI ${Math.round(inputs.cpi)}${inputs.topCompetitor ? ` (${inputs.topCompetitor})` : ""}`);
  }

  if (inputs.overallMsi && inputs.overallMsi >= 50) {
    keyFactors.push(`Message saturation: MSI ${Math.round(inputs.overallMsi)} (${inputs.msiRiskLevel} risk)`);
  } else if (inputs.overallMsi && inputs.overallMsi < 25) {
    keyFactors.push(`Low saturation: MSI ${Math.round(inputs.overallMsi)} - opportunity for increased messaging`);
  }

  if (inputs.adoptionStage) {
    keyFactors.push(`Adoption stage: ${inputs.adoptionStage}`);
  }

  if (inputs.preferredChannel) {
    keyFactors.push(`Preferred channel: ${inputs.preferredChannel}`);
  }

  if (inputs.daysSinceLastTouch && inputs.daysSinceLastTouch > 30) {
    keyFactors.push(`Last contact: ${inputs.daysSinceLastTouch} days ago`);
  }

  if (inputs.engagementTrend) {
    keyFactors.push(`Engagement trend: ${inputs.engagementTrend}`);
  }

  // Generate rationale
  let rationale: string;

  if (matchedRule) {
    // Use rule template
    rationale = matchedRule.outcome.rationaleTemplate
      .replace("{cpi}", String(Math.round(inputs.cpi ?? 0)))
      .replace("{msi}", String(Math.round(inputs.overallMsi ?? 0)))
      .replace("{competitor}", inputs.topCompetitor || "competitor")
      .replace("{daysSinceLastTouch}", String(inputs.daysSinceLastTouch ?? 0))
      .replace("{preferredChannel}", inputs.preferredChannel || "primary channel");
  } else {
    // Generate based on action type
    const actionRationales: Record<NBOActionType, string> = {
      defend: `Competitive activity requires defensive engagement. ${inputs.topCompetitor ? `Counter ${inputs.topCompetitor} presence.` : "Strengthen relationship."}`,
      pause: `High message saturation (MSI: ${Math.round(inputs.overallMsi ?? 0)}) indicates fatigue risk. Reduce frequency and diversify messaging.`,
      reactivate: `No recent engagement detected (${inputs.daysSinceLastTouch} days). Re-establish connection before relationship goes dormant.`,
      expand: `Strong engagement on ${inputs.preferredChannel}. Opportunity to expand to additional channels for deeper relationship.`,
      engage: `${inputs.adoptionStage === "awareness" ? "New prospect" : "Active consideration"} with capacity for engagement (MSI: ${Math.round(inputs.overallMsi ?? 0)}).`,
      nurture: `Loyal prescriber with stable engagement. Maintain relationship with measured, value-added touchpoints.`,
      reinforce: `Continue building relationship through consistent engagement on preferred channels.`,
    };

    rationale = actionRationales[actionType];
  }

  return { rationale, keyFactors };
}

/**
 * Calculate expected impact range
 */
function calculateExpectedImpact(
  actionType: NBOActionType,
  confidence: number,
  adoptionStage: AdoptionStage | null
): { min: number; max: number; description: string } {
  // Base impact ranges by action type (in engagement % points)
  const impactRanges: Record<NBOActionType, { min: number; max: number }> = {
    defend: { min: 5, max: 20 },
    reactivate: { min: 10, max: 30 },
    engage: { min: 5, max: 25 },
    expand: { min: 10, max: 35 },
    reinforce: { min: 3, max: 15 },
    nurture: { min: 2, max: 10 },
    pause: { min: 0, max: 5 }, // Prevents decline
  };

  const base = impactRanges[actionType];

  // Adjust by confidence
  const confidenceMultiplier = 0.5 + confidence * 0.5;
  const min = Math.round(base.min * confidenceMultiplier);
  const max = Math.round(base.max * confidenceMultiplier);

  // Description
  let description: string;
  if (actionType === "pause") {
    description = "Prevents potential engagement decline of 5-15%";
  } else {
    description = `Expected engagement improvement: ${min}-${max}%`;
  }

  return { min, max, description };
}

// ============================================================================
// URGENCY BUCKETING & POWER-LAW SCORING
// ============================================================================

export type UrgencyBucket = "act-now" | "this-week" | "backlog";

/**
 * Apply power-law transformation to create genuine score variance.
 *
 * Without this, most scores cluster around 40-60 (the mean).
 * The power-law transformation spreads scores into:
 * - Top 5%: act-now (critical items)
 * - Middle 20%: this-week
 * - Bottom 75%: backlog
 */
function applyPowerLawScoring(compositeScore: number): number {
  // Normalize 0-100 to 0-1
  const normalized = compositeScore / 100;

  // Apply power function to create right-skew (most scores lower, few very high)
  // exponent < 1 compresses the bottom, stretches the top
  const transformed = Math.pow(normalized, 0.7);

  // Re-scale to 0-100
  return Math.round(transformed * 100);
}

/**
 * Determine urgency bucket from power-law score and confidence.
 */
export function getUrgencyBucket(
  compositeScore: number,
  confidence: number,
  actionType: NBOActionType
): UrgencyBucket {
  const powerScore = applyPowerLawScoring(compositeScore);

  // Rule-based overrides take priority
  if (actionType === "defend" && confidence >= 0.75) return "act-now";
  if (actionType === "pause" && confidence >= 0.80) return "act-now";

  // Power-law distribution buckets — target ~15% act-now, ~35% this-week, ~50% backlog
  if (powerScore >= 80 && confidence >= 0.72) return "act-now";
  if (powerScore >= 65 && confidence >= 0.60) return "this-week";
  if (powerScore >= 55 && confidence >= 0.55) return "this-week";
  return "backlog";
}

// ============================================================================
// MAIN ENGINE
// ============================================================================

export interface NBOEngineInput {
  hcp: HCPProfile;
  saturationSummary: HcpMessageSaturationSummary | null;
  competitiveSummary: HcpCompetitiveSummary | null;
  channelHealth?: ChannelHealth[];
  weights?: Partial<NBOInputWeights>;
  rules?: NBODecisionRule[];
}

/**
 * Generate Next Best Orbit recommendation for a single HCP
 */
export function generateNBORecommendation(input: NBOEngineInput): NBORecommendation {
  const { hcp, saturationSummary, competitiveSummary, weights: customWeights, rules = DECISION_RULES } = input;

  // Merge weights
  const weights: NBOInputWeights = { ...DEFAULT_WEIGHTS, ...customWeights };

  // Get channel health
  const channelHealth = input.channelHealth || classifyChannelHealth(hcp);

  // Calculate component scores
  const engagementResult = calculateEngagementScore(hcp);
  const adoptionScore = calculateAdoptionScore(saturationSummary?.exposures[0]?.adoptionStage ?? null);
  const channelResult = calculateChannelScore(hcp, channelHealth);
  const saturationResult = calculateSaturationScore(saturationSummary);
  const competitiveResult = calculateCompetitiveScore(competitiveSummary);
  const recencyResult = calculateRecencyScore(hcp);

  // Build component scores object
  const componentScores: NBOComponentScores = {
    engagementScore: engagementResult.score,
    adoptionScore,
    channelScore: channelResult.score,
    saturationScore: saturationResult.score,
    competitiveScore: competitiveResult.score,
    recencyScore: recencyResult.score,
    compositeScore: 0, // Calculated below
  };

  // Calculate weighted composite score
  const weightedSum =
    engagementResult.score * weights.engagementTrajectory +
    adoptionScore * weights.adoptionStage +
    channelResult.score * weights.channelAffinity +
    saturationResult.score * weights.messageSaturation +
    competitiveResult.score * weights.competitivePressure +
    recencyResult.score * weights.recentTouchHistory;

  // Normalize to 0-100
  componentScores.compositeScore = Math.round((weightedSum + 1) * 50);

  // Build input snapshot
  const inputSnapshot: NBOInputSnapshot = {
    engagementScore: Math.round((engagementResult.score + 1) * 50),
    engagementTrend: engagementResult.trend,
    responseRate: null,
    adoptionStage: saturationSummary?.exposures[0]?.adoptionStage ?? null,
    stageConfidence: null,
    preferredChannel: channelResult.bestChannel,
    channelScores: null,
    channelHealth: channelResult.healthMap,
    overallMsi: saturationResult.msi,
    msiRiskLevel: saturationResult.riskLevel,
    saturatedThemes: saturationResult.saturatedThemes,
    availableThemes: saturationResult.availableThemes,
    cpi: competitiveResult.cpi,
    cpiRiskLevel: competitiveResult.riskLevel,
    topCompetitor: competitiveResult.topCompetitor,
    competitiveFlag: competitiveResult.flag,
    daysSinceLastTouch: recencyResult.daysSinceLastTouch,
    touchesLast30Days: recencyResult.touchesLast30Days,
    touchesLast90Days: recencyResult.touchesLast90Days,
    weights,
    capturedAt: new Date().toISOString(),
  };

  // Determine action type
  const { actionType, matchedRule, confidenceBoost } = determineActionType(
    componentScores,
    inputSnapshot,
    rules
  );

  // Check for conflicting signals
  const hasConflictingSignals =
    (saturationResult.score < -0.3 && competitiveResult.score > 0.5) || // Need to act but saturated
    (engagementResult.score > 0.5 && recencyResult.score < -0.5); // Good engagement but dormant

  // Calculate confidence
  const { confidence, level: confidenceLevel } = calculateConfidence(
    componentScores.compositeScore,
    confidenceBoost,
    hasConflictingSignals
  );

  // Generate rationale
  const { rationale, keyFactors } = generateRationale(actionType, inputSnapshot, componentScores, matchedRule);

  // Calculate expected impact
  const expectedImpact = calculateExpectedImpact(actionType, confidence, inputSnapshot.adoptionStage);

  // Select recommended theme (prefer available themes)
  const recommendedTheme =
    saturationResult.availableThemes.length > 0
      ? saturationResult.availableThemes[0]
      : null;

  // Determine urgency
  let urgency: "high" | "medium" | "low";
  if (actionType === "defend" || actionType === "reactivate") {
    urgency = "high";
  } else if (actionType === "pause" || actionType === "engage") {
    urgency = "medium";
  } else {
    urgency = "low";
  }

  // Phase 15: Urgency bucketing for Direct Mode temporal display
  const urgencyBucket = getUrgencyBucket(componentScores.compositeScore, confidence, actionType);

  return {
    id: `nbo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    hcpId: hcp.id,
    hcpName: `${hcp.firstName} ${hcp.lastName}`,
    recommendedChannel: channelResult.bestChannel,
    recommendedTheme,
    actionType,
    confidence,
    confidenceLevel,
    compositeScore: componentScores.compositeScore,
    componentScores,
    rationale,
    keyFactors,
    expectedImpact,
    inputs: inputSnapshot,
    status: "pending",
    generatedAt: new Date().toISOString(),
    validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
    urgency,
    urgencyBucket,
  };
}

/**
 * Generate NBO recommendations for multiple HCPs
 */
export function generateBatchNBORecommendations(
  inputs: NBOEngineInput[]
): NBORecommendation[] {
  return inputs.map((input) => generateNBORecommendation(input));
}

/**
 * Prioritize NBO recommendations
 */
export function prioritizeNBORecommendations(
  recommendations: NBORecommendation[],
  limit?: number
): NBORecommendation[] {
  const sorted = [...recommendations].sort((a, b) => {
    // First by urgency
    const urgencyOrder = { high: 0, medium: 1, low: 2 };
    const urgencyDiff = urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
    if (urgencyDiff !== 0) return urgencyDiff;

    // Then by action priority
    const actionDiff = ACTION_PRIORITIES[a.actionType] - ACTION_PRIORITIES[b.actionType];
    if (actionDiff !== 0) return actionDiff;

    // Then by confidence
    return b.confidence - a.confidence;
  });

  return limit ? sorted.slice(0, limit) : sorted;
}

/**
 * Get summary statistics for NBO recommendations
 */
export function getNBOSummary(recommendations: NBORecommendation[]): {
  total: number;
  byConfidence: Record<NBOConfidenceLevel, number>;
  byAction: Record<NBOActionType, number>;
  byChannel: Record<Channel, number>;
  avgConfidence: number;
  avgCompositeScore: number;
} {
  const byConfidence: Record<NBOConfidenceLevel, number> = { high: 0, medium: 0, low: 0 };
  const byAction: Record<NBOActionType, number> = {
    engage: 0, reinforce: 0, defend: 0, nurture: 0, expand: 0, pause: 0, reactivate: 0,
  };
  const byChannel: Record<Channel, number> = {
    email: 0, phone: 0, rep_visit: 0, webinar: 0, conference: 0, digital_ad: 0,
  };

  let totalConfidence = 0;
  let totalComposite = 0;

  for (const rec of recommendations) {
    byConfidence[rec.confidenceLevel]++;
    byAction[rec.actionType]++;
    byChannel[rec.recommendedChannel]++;
    totalConfidence += rec.confidence;
    totalComposite += rec.compositeScore;
  }

  return {
    total: recommendations.length,
    byConfidence,
    byAction,
    byChannel,
    avgConfidence: recommendations.length > 0 ? totalConfidence / recommendations.length : 0,
    avgCompositeScore: recommendations.length > 0 ? totalComposite / recommendations.length : 0,
  };
}

// Export decision rules for external use
export { DECISION_RULES, DEFAULT_WEIGHTS, applyPowerLawScoring };
