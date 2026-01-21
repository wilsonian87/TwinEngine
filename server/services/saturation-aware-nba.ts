/**
 * Saturation-Aware NBA Engine
 *
 * Phase 12B.3: Integrates Message Saturation Index (MSI) into Next Best Action recommendations.
 *
 * Features:
 * - MSI-aware recommendation scoring
 * - Contextual warnings for saturated themes
 * - Theme simulation for planning scenarios
 * - Alternative theme suggestions when saturation is high
 */

import type { HCPProfile, MessageExposure, SaturationRiskLevel, AdoptionStage, MessageTheme, HcpMessageSaturationSummary } from "@shared/schema";
import type { NextBestAction, ActionType, NBAConfig } from "./nba-engine";
import { generateNBA, actionTypeConfig } from "./nba-engine";
import { classifyChannelHealth } from "./channel-health";
import { calculateMsiComponents, calculateMsi, msiToRiskLevel, determineMsiDirection } from "../storage/message-saturation-storage";

// ============================================================================
// TYPES
// ============================================================================

/**
 * Saturation warning types
 */
export type SaturationWarningType =
  | "do_not_push"           // MSI > 80: Stop pushing this theme
  | "shift_to_alternative"  // MSI 65-80: Recommend alternative themes
  | "approaching_saturation"// MSI 50-65: Caution, monitor closely
  | "safe_to_reinforce"     // MSI < 40: Safe to continue
  | "underexposed";         // MSI < 20: Opportunity to increase exposure

/**
 * Saturation warning with contextual information
 */
export interface SaturationWarning {
  type: SaturationWarningType;
  severity: "critical" | "warning" | "info";
  themeId: string;
  themeName: string;
  currentMsi: number;
  message: string;
  recommendedAction: string;
  alternativeThemes?: {
    id: string;
    name: string;
    msi: number;
    category: string;
  }[];
}

/**
 * Theme score modifier for NBA adjustments
 */
export interface ThemeScoreModifier {
  themeId: string;
  themeName: string;
  scoreAdjustment: number; // -50 to +30
  reason: string;
  msi: number;
  riskLevel: SaturationRiskLevel;
}

/**
 * Theme simulation result
 */
export interface ThemeSimulationResult {
  themeId: string;
  themeName: string;
  currentMsi: number;
  projectedMsi: number;
  msiChange: number;
  pauseDays: number;
  riskLevelBefore: SaturationRiskLevel;
  riskLevelAfter: SaturationRiskLevel;
  recommendation: string;
  decayCurve: { day: number; projectedMsi: number }[];
}

/**
 * Extended NBA with saturation context
 */
export interface SaturationAwareNBA extends NextBestAction {
  saturationContext?: {
    warnings: SaturationWarning[];
    themeModifiers: ThemeScoreModifier[];
    suggestedThemes: {
      id: string;
      name: string;
      msi: number;
      category: string;
      reason: string;
    }[];
    blockedThemes: {
      id: string;
      name: string;
      msi: number;
      reason: string;
    }[];
    overallSaturationRisk: SaturationRiskLevel;
    confidenceAdjustment: number;
  };
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * MSI thresholds for warnings
 */
const MSI_THRESHOLDS = {
  DO_NOT_PUSH: 80,
  SHIFT_ALTERNATIVE: 65,
  APPROACHING_SATURATION: 50,
  SAFE_THRESHOLD: 40,
  UNDEREXPOSED: 20,
};

/**
 * Score adjustments based on MSI
 */
const SCORE_ADJUSTMENTS = {
  CRITICAL: -50,    // MSI >= 80
  HIGH: -30,        // MSI 65-79
  ELEVATED: -15,    // MSI 50-64
  OPTIMAL: 0,       // MSI 26-49
  UNDEREXPOSED: 20, // MSI 0-25 (opportunity)
};

/**
 * MSI decay rate per day when theme is paused
 * Based on industry research: ~2-3 points per week of no contact
 */
const MSI_DAILY_DECAY_RATE = 0.4;

// ============================================================================
// SATURATION WARNING GENERATION
// ============================================================================

/**
 * Generate saturation warning for a theme exposure
 */
export function generateSaturationWarning(
  exposure: MessageExposure,
  alternativeThemes?: MessageExposure[]
): SaturationWarning {
  const msi = exposure.msi ?? 0;
  const themeName = exposure.themeName || "Unknown Theme";

  let type: SaturationWarningType;
  let severity: "critical" | "warning" | "info";
  let message: string;
  let recommendedAction: string;

  if (msi >= MSI_THRESHOLDS.DO_NOT_PUSH) {
    type = "do_not_push";
    severity = "critical";
    message = `STOP: "${themeName}" is critically saturated (MSI: ${Math.round(msi)}). Further messaging will damage engagement.`;
    recommendedAction = "Immediately pause this theme. Shift to alternative messaging strategies.";
  } else if (msi >= MSI_THRESHOLDS.SHIFT_ALTERNATIVE) {
    type = "shift_to_alternative";
    severity = "warning";
    message = `WARNING: "${themeName}" is approaching saturation (MSI: ${Math.round(msi)}). Consider rotating to alternatives.`;
    recommendedAction = "Reduce frequency by 50% and introduce alternative themes.";
  } else if (msi >= MSI_THRESHOLDS.APPROACHING_SATURATION) {
    type = "approaching_saturation";
    severity = "warning";
    message = `CAUTION: "${themeName}" showing early fatigue signs (MSI: ${Math.round(msi)}). Monitor engagement closely.`;
    recommendedAction = "Diversify channels and track engagement response rates.";
  } else if (msi < MSI_THRESHOLDS.UNDEREXPOSED) {
    type = "underexposed";
    severity = "info";
    message = `OPPORTUNITY: "${themeName}" is underexposed (MSI: ${Math.round(msi)}). Safe to increase touchpoints.`;
    recommendedAction = "Increase touch frequency to build awareness without saturation risk.";
  } else {
    type = "safe_to_reinforce";
    severity = "info";
    message = `SAFE: "${themeName}" is in optimal range (MSI: ${Math.round(msi)}). Continue current strategy.`;
    recommendedAction = "Maintain current cadence. Monitor for changes.";
  }

  // Find alternative themes with low MSI
  const alternatives = alternativeThemes
    ?.filter((t) => t.messageThemeId !== exposure.messageThemeId && (t.msi ?? 100) < MSI_THRESHOLDS.SAFE_THRESHOLD)
    .sort((a, b) => (a.msi ?? 0) - (b.msi ?? 0))
    .slice(0, 3)
    .map((t) => ({
      id: t.messageThemeId,
      name: t.themeName || "Unknown",
      msi: t.msi ?? 0,
      category: t.themeCategory || "general",
    }));

  return {
    type,
    severity,
    themeId: exposure.messageThemeId,
    themeName,
    currentMsi: msi,
    message,
    recommendedAction,
    alternativeThemes: type === "shift_to_alternative" || type === "do_not_push" ? alternatives : undefined,
  };
}

/**
 * Generate all saturation warnings for an HCP
 */
export function generateHcpSaturationWarnings(
  exposures: MessageExposure[]
): SaturationWarning[] {
  return exposures
    .filter((e) => e.msi !== null)
    .map((e) => generateSaturationWarning(e, exposures))
    .sort((a, b) => b.currentMsi - a.currentMsi);
}

// ============================================================================
// RECOMMENDATION MODIFIERS
// ============================================================================

/**
 * Calculate theme score modifier based on MSI
 */
export function calculateThemeModifier(exposure: MessageExposure): ThemeScoreModifier {
  const msi = exposure.msi ?? 0;
  const riskLevel = msiToRiskLevel(msi);

  let scoreAdjustment: number;
  let reason: string;

  if (msi >= MSI_THRESHOLDS.DO_NOT_PUSH) {
    scoreAdjustment = SCORE_ADJUSTMENTS.CRITICAL;
    reason = "Theme critically saturated - strongly penalized";
  } else if (msi >= MSI_THRESHOLDS.SHIFT_ALTERNATIVE) {
    scoreAdjustment = SCORE_ADJUSTMENTS.HIGH;
    reason = "Theme approaching saturation - penalized";
  } else if (msi >= MSI_THRESHOLDS.APPROACHING_SATURATION) {
    scoreAdjustment = SCORE_ADJUSTMENTS.ELEVATED;
    reason = "Theme showing early fatigue - slightly penalized";
  } else if (msi < MSI_THRESHOLDS.UNDEREXPOSED) {
    scoreAdjustment = SCORE_ADJUSTMENTS.UNDEREXPOSED;
    reason = "Theme underexposed - boosted as opportunity";
  } else {
    scoreAdjustment = SCORE_ADJUSTMENTS.OPTIMAL;
    reason = "Theme in optimal range - no adjustment";
  }

  return {
    themeId: exposure.messageThemeId,
    themeName: exposure.themeName || "Unknown",
    scoreAdjustment,
    reason,
    msi,
    riskLevel,
  };
}

/**
 * Calculate aggregate confidence adjustment based on HCP's overall saturation
 */
export function calculateConfidenceAdjustment(
  exposures: MessageExposure[]
): number {
  if (exposures.length === 0) return 0;

  const avgMsi =
    exposures.reduce((sum, e) => sum + (e.msi ?? 0), 0) / exposures.length;

  // High overall saturation reduces confidence in any recommendation
  if (avgMsi >= 70) return -20;
  if (avgMsi >= 55) return -10;
  if (avgMsi >= 40) return -5;
  if (avgMsi < 25) return 10; // Low saturation boosts confidence
  return 0;
}

// ============================================================================
// THEME SIMULATION
// ============================================================================

/**
 * Simulate MSI decay if theme is paused for N days
 *
 * Models exponential decay: MSI_new = MSI_old * e^(-k*days)
 * Where k is calibrated to ~0.4 points/day (industry benchmark)
 */
export function simulateThemePause(
  exposure: MessageExposure,
  pauseDays: number
): ThemeSimulationResult {
  const currentMsi = exposure.msi ?? 0;
  const decayRate = MSI_DAILY_DECAY_RATE;

  // Calculate projected MSI with exponential decay
  // Using linear approximation for simplicity: MSI_new = MSI_old - (decayRate * days)
  // But capped at minimum 5 (some residual saturation always remains)
  const projectedMsi = Math.max(5, currentMsi - decayRate * pauseDays);

  const riskLevelBefore = msiToRiskLevel(currentMsi);
  const riskLevelAfter = msiToRiskLevel(projectedMsi);

  // Generate decay curve for visualization
  const decayCurve: { day: number; projectedMsi: number }[] = [];
  for (let day = 0; day <= pauseDays; day += Math.max(1, Math.floor(pauseDays / 10))) {
    decayCurve.push({
      day,
      projectedMsi: Math.max(5, currentMsi - decayRate * day),
    });
  }
  // Ensure final day is included
  if (decayCurve[decayCurve.length - 1].day !== pauseDays) {
    decayCurve.push({ day: pauseDays, projectedMsi });
  }

  // Generate recommendation based on improvement
  let recommendation: string;
  if (projectedMsi < MSI_THRESHOLDS.SAFE_THRESHOLD && currentMsi >= MSI_THRESHOLDS.SAFE_THRESHOLD) {
    recommendation = `Pausing for ${pauseDays} days will bring MSI below safe threshold. Recommended.`;
  } else if (riskLevelAfter !== riskLevelBefore) {
    recommendation = `Pausing will move from ${riskLevelBefore} to ${riskLevelAfter} risk. ${riskLevelAfter === "low" || riskLevelAfter === "medium" ? "Recommended." : "Partial improvement."}`;
  } else if (currentMsi - projectedMsi > 10) {
    recommendation = `Significant MSI reduction (${Math.round(currentMsi - projectedMsi)} points). Worth considering.`;
  } else {
    recommendation = `Limited impact expected. Consider longer pause or alternative strategies.`;
  }

  return {
    themeId: exposure.messageThemeId,
    themeName: exposure.themeName || "Unknown",
    currentMsi,
    projectedMsi: Math.round(projectedMsi),
    msiChange: Math.round(projectedMsi - currentMsi),
    pauseDays,
    riskLevelBefore,
    riskLevelAfter,
    recommendation,
    decayCurve,
  };
}

/**
 * Find optimal pause duration to reach target MSI
 */
export function calculateOptimalPauseDuration(
  currentMsi: number,
  targetMsi: number = MSI_THRESHOLDS.SAFE_THRESHOLD
): number {
  if (currentMsi <= targetMsi) return 0;

  // Linear model: days = (currentMsi - targetMsi) / decayRate
  const days = (currentMsi - targetMsi) / MSI_DAILY_DECAY_RATE;
  return Math.ceil(days);
}

// ============================================================================
// SATURATION-AWARE NBA GENERATION
// ============================================================================

/**
 * Generate NBA with saturation awareness
 *
 * This function:
 * 1. Generates base NBA from channel health
 * 2. Overlays saturation context for the HCP
 * 3. Adjusts confidence based on overall saturation risk
 * 4. Adds warnings and alternative theme suggestions
 */
export function generateSaturationAwareNBA(
  hcp: HCPProfile,
  saturationSummary: HcpMessageSaturationSummary | null,
  allThemes?: MessageTheme[],
  config?: NBAConfig
): SaturationAwareNBA {
  // Generate base NBA
  const baseNBA = generateNBA(hcp, undefined, config);

  // If no saturation data, return base NBA
  if (!saturationSummary || saturationSummary.exposures.length === 0) {
    return baseNBA;
  }

  // Generate warnings for all themes
  const warnings = generateHcpSaturationWarnings(saturationSummary.exposures);

  // Calculate modifiers for each theme
  const themeModifiers = saturationSummary.exposures
    .filter((e) => e.msi !== null)
    .map((e) => calculateThemeModifier(e));

  // Calculate overall confidence adjustment
  const confidenceAdjustment = calculateConfidenceAdjustment(saturationSummary.exposures);

  // Identify suggested themes (low MSI - opportunities)
  const suggestedThemes = saturationSummary.exposures
    .filter((e) => (e.msi ?? 100) < MSI_THRESHOLDS.SAFE_THRESHOLD)
    .sort((a, b) => (a.msi ?? 0) - (b.msi ?? 0))
    .slice(0, 3)
    .map((e) => ({
      id: e.messageThemeId,
      name: e.themeName || "Unknown",
      msi: e.msi ?? 0,
      category: e.themeCategory || "general",
      reason: e.msi! < MSI_THRESHOLDS.UNDEREXPOSED ? "Underexposed opportunity" : "Safe to reinforce",
    }));

  // If we have all themes, add ones not yet exposed to this HCP
  if (allThemes) {
    const exposedThemeIds = new Set(saturationSummary.exposures.map((e) => e.messageThemeId));
    const unexposedThemes = allThemes
      .filter((t) => !exposedThemeIds.has(t.id) && t.isActive)
      .slice(0, 2)
      .map((t) => ({
        id: t.id,
        name: t.name,
        msi: 0,
        category: t.category || "general",
        reason: "Not yet exposed - fresh opportunity",
      }));
    suggestedThemes.push(...unexposedThemes);
  }

  // Identify blocked themes (high MSI - avoid)
  const blockedThemes = saturationSummary.exposures
    .filter((e) => (e.msi ?? 0) >= MSI_THRESHOLDS.SHIFT_ALTERNATIVE)
    .sort((a, b) => (b.msi ?? 0) - (a.msi ?? 0))
    .map((e) => ({
      id: e.messageThemeId,
      name: e.themeName || "Unknown",
      msi: e.msi ?? 0,
      reason: e.msi! >= MSI_THRESHOLDS.DO_NOT_PUSH ? "BLOCKED: Critical saturation" : "WARNING: High saturation",
    }));

  // Adjust confidence
  const newConfidence = Math.max(0, Math.min(100, baseNBA.confidence + confidenceAdjustment));

  // Enhance reasoning if there are critical warnings
  let enhancedReasoning = baseNBA.reasoning;
  const criticalWarnings = warnings.filter((w) => w.severity === "critical");
  if (criticalWarnings.length > 0) {
    enhancedReasoning += ` | SATURATION ALERT: ${criticalWarnings.length} theme(s) blocked due to fatigue.`;
  } else if (blockedThemes.length > 0) {
    enhancedReasoning += ` | Saturation: ${blockedThemes.length} theme(s) should be avoided.`;
  }

  // Adjust urgency if overall saturation is critical
  let newUrgency = baseNBA.urgency;
  if (saturationSummary.riskLevel === "critical" && baseNBA.urgency !== "high") {
    newUrgency = "high";
    enhancedReasoning += " High saturation risk requires immediate attention.";
  }

  return {
    ...baseNBA,
    confidence: newConfidence,
    reasoning: enhancedReasoning,
    urgency: newUrgency,
    saturationContext: {
      warnings,
      themeModifiers,
      suggestedThemes,
      blockedThemes,
      overallSaturationRisk: saturationSummary.riskLevel,
      confidenceAdjustment,
    },
  };
}

/**
 * Generate saturation-aware NBAs for multiple HCPs
 */
export function generateSaturationAwareNBAs(
  hcps: HCPProfile[],
  saturationSummaries: Map<string, HcpMessageSaturationSummary | null>,
  allThemes?: MessageTheme[],
  config?: NBAConfig
): SaturationAwareNBA[] {
  return hcps.map((hcp) => {
    const summary = saturationSummaries.get(hcp.id) || null;
    return generateSaturationAwareNBA(hcp, summary, allThemes, config);
  });
}

/**
 * Prioritize NBAs with saturation taken into account
 */
export function prioritizeSaturationAwareNBAs(
  nbas: SaturationAwareNBA[],
  limit?: number,
  prioritizeLowSaturation: boolean = true
): SaturationAwareNBA[] {
  const urgencyOrder = { high: 0, medium: 1, low: 2 };
  const riskOrder = { critical: 0, high: 1, medium: 2, low: 3 };

  const sorted = [...nbas].sort((a, b) => {
    // If prioritizing low saturation (i.e., HCPs where we have messaging headroom)
    if (prioritizeLowSaturation) {
      const aRisk = a.saturationContext?.overallSaturationRisk || "low";
      const bRisk = b.saturationContext?.overallSaturationRisk || "low";

      // Low saturation HCPs get priority (reverse order)
      if (riskOrder[aRisk] !== riskOrder[bRisk]) {
        return riskOrder[bRisk] - riskOrder[aRisk]; // Lower risk = higher priority
      }
    }

    // Then by urgency
    const urgencyDiff = urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
    if (urgencyDiff !== 0) return urgencyDiff;

    // Then by confidence
    return b.confidence - a.confidence;
  });

  return limit ? sorted.slice(0, limit) : sorted;
}

/**
 * Get summary statistics for saturation-aware NBAs
 */
export function getSaturationAwareNBASummary(nbas: SaturationAwareNBA[]): {
  totalActions: number;
  byUrgency: Record<string, number>;
  avgConfidence: number;
  saturationSummary: {
    hcpsWithSaturationData: number;
    bySaturationRisk: Record<string, number>;
    totalWarnings: number;
    criticalWarnings: number;
    blockedThemes: number;
    suggestedOpportunities: number;
  };
} {
  const byUrgency: Record<string, number> = { high: 0, medium: 0, low: 0 };
  let totalConfidence = 0;

  const bySaturationRisk: Record<string, number> = { low: 0, medium: 0, high: 0, critical: 0 };
  let hcpsWithSaturationData = 0;
  let totalWarnings = 0;
  let criticalWarnings = 0;
  let blockedThemes = 0;
  let suggestedOpportunities = 0;

  for (const nba of nbas) {
    byUrgency[nba.urgency]++;
    totalConfidence += nba.confidence;

    if (nba.saturationContext) {
      hcpsWithSaturationData++;
      bySaturationRisk[nba.saturationContext.overallSaturationRisk]++;
      totalWarnings += nba.saturationContext.warnings.length;
      criticalWarnings += nba.saturationContext.warnings.filter((w) => w.severity === "critical").length;
      blockedThemes += nba.saturationContext.blockedThemes.length;
      suggestedOpportunities += nba.saturationContext.suggestedThemes.length;
    }
  }

  return {
    totalActions: nbas.length,
    byUrgency,
    avgConfidence: nbas.length > 0 ? Math.round(totalConfidence / nbas.length) : 0,
    saturationSummary: {
      hcpsWithSaturationData,
      bySaturationRisk,
      totalWarnings,
      criticalWarnings,
      blockedThemes,
      suggestedOpportunities,
    },
  };
}

// ============================================================================
// THEME RECOMMENDATION UTILITIES
// ============================================================================

/**
 * Get recommended themes for an HCP based on saturation analysis
 */
export function getRecommendedThemes(
  saturationSummary: HcpMessageSaturationSummary,
  allThemes: MessageTheme[]
): {
  recommended: { theme: MessageTheme; msi: number; reason: string }[];
  avoid: { theme: MessageTheme; msi: number; reason: string }[];
} {
  const exposureMap = new Map(
    saturationSummary.exposures.map((e) => [e.messageThemeId, e])
  );

  const recommended: { theme: MessageTheme; msi: number; reason: string }[] = [];
  const avoid: { theme: MessageTheme; msi: number; reason: string }[] = [];

  for (const theme of allThemes) {
    if (!theme.isActive) continue;

    const exposure = exposureMap.get(theme.id);
    const msi = exposure?.msi ?? 0;

    if (msi >= MSI_THRESHOLDS.DO_NOT_PUSH) {
      avoid.push({
        theme,
        msi,
        reason: "BLOCKED: Critical saturation. Do not use.",
      });
    } else if (msi >= MSI_THRESHOLDS.SHIFT_ALTERNATIVE) {
      avoid.push({
        theme,
        msi,
        reason: "WARNING: Approaching saturation. Use sparingly.",
      });
    } else if (msi < MSI_THRESHOLDS.UNDEREXPOSED) {
      recommended.push({
        theme,
        msi,
        reason: msi === 0 ? "Not yet exposed. Fresh opportunity." : "Underexposed. Safe to increase.",
      });
    } else if (msi < MSI_THRESHOLDS.SAFE_THRESHOLD) {
      recommended.push({
        theme,
        msi,
        reason: "Optimal range. Safe to continue.",
      });
    }
  }

  // Sort by MSI (lowest first for recommended)
  recommended.sort((a, b) => a.msi - b.msi);
  avoid.sort((a, b) => b.msi - a.msi);

  return { recommended, avoid };
}

/**
 * Check if a specific theme should be blocked for an HCP
 */
export function isThemeBlocked(
  themeId: string,
  saturationSummary: HcpMessageSaturationSummary | null
): { blocked: boolean; reason?: string; msi?: number } {
  if (!saturationSummary) {
    return { blocked: false };
  }

  const exposure = saturationSummary.exposures.find((e) => e.messageThemeId === themeId);
  if (!exposure || exposure.msi === null) {
    return { blocked: false };
  }

  if (exposure.msi >= MSI_THRESHOLDS.DO_NOT_PUSH) {
    return {
      blocked: true,
      reason: `Theme "${exposure.themeName}" is critically saturated (MSI: ${Math.round(exposure.msi)}). Further messaging will damage engagement.`,
      msi: exposure.msi,
    };
  }

  return { blocked: false, msi: exposure.msi };
}
