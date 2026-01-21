/**
 * Competitive Insight Engine
 *
 * Phase 12A: Transforms competitive data into actionable insights.
 *
 * Capabilities:
 * - Generate competitive alerts based on CPI thresholds
 * - Flag HCPs requiring defensive intervention
 * - Integrate with NBA engine for CPI-aware recommendations
 * - Export competitive data for planning
 */

import { competitiveStorage } from "../storage/competitive-storage";
import { cpiToRiskLevel } from "../storage/competitive-storage";
import type {
  HcpCompetitiveSummary,
  HcpCompetitiveSignal,
  CompetitiveOrbitData,
  HCPProfile,
  ResolvedAlertThresholds,
} from "@shared/schema";

// ============================================================================
// ALERT TYPES AND CONFIGURATION
// ============================================================================

export const alertSeverities = ["info", "warning", "critical"] as const;
export type AlertSeverity = (typeof alertSeverities)[number];

export const competitiveAlertTypes = [
  "high_cpi_detected",           // CPI crosses threshold
  "cpi_trending_up",             // CPI increasing over time
  "engagement_asymmetry",        // Competitor more engaged than us
  "share_erosion",               // Losing market share to competitor
  "defensive_intervention",      // High CPI + declining engagement
  "competitive_opportunity",     // Competitor weakness detected
] as const;

export type CompetitiveAlertType = (typeof competitiveAlertTypes)[number];

export interface CompetitiveAlert {
  id: string;
  hcpId: string;
  hcpName?: string;
  competitorId: string;
  competitorName?: string;
  alertType: CompetitiveAlertType;
  severity: AlertSeverity;
  cpi: number;
  message: string;
  recommendation: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export interface AlertThresholds {
  criticalCpi: number;      // CPI above this = critical alert
  warningCpi: number;       // CPI above this = warning alert
  cpiTrendThreshold: number; // QoQ change above this = trending alert
  engagementAsymmetryThreshold: number; // Asymmetry above this triggers alert
  shareErosionThreshold: number; // Share loss % that triggers alert
}

const defaultThresholds: AlertThresholds = {
  criticalCpi: 75,
  warningCpi: 50,
  cpiTrendThreshold: 10, // 10% QoQ increase
  engagementAsymmetryThreshold: 20, // 20 point difference
  shareErosionThreshold: 5, // 5% share loss
};

// ============================================================================
// INSIGHT FLAGS
// ============================================================================

export interface CompetitiveFlag {
  type: "defensive_intervention" | "low_risk" | "competitive_opportunity" | "watch";
  label: string;
  description: string;
  priority: number; // 1 = highest
  color: string;
}

export const competitiveFlags: Record<string, CompetitiveFlag> = {
  defensive_intervention: {
    type: "defensive_intervention",
    label: "Defensive Intervention Required",
    description: "High CPI with declining engagement - immediate action needed",
    priority: 1,
    color: "#DC2626", // red-600
  },
  competitive_opportunity: {
    type: "competitive_opportunity",
    label: "Competitive Opportunity",
    description: "Competitor weakness detected - potential to gain share",
    priority: 2,
    color: "#059669", // emerald-600
  },
  watch: {
    type: "watch",
    label: "Watch List",
    description: "Elevated competitive pressure - monitor closely",
    priority: 3,
    color: "#D97706", // amber-600
  },
  low_risk: {
    type: "low_risk",
    label: "Low Risk Zone",
    description: "Low CPI with stable engagement - maintain current approach",
    priority: 4,
    color: "#0284C7", // sky-600
  },
};

// ============================================================================
// COMPETITIVE INSIGHT ENGINE
// ============================================================================

export class CompetitiveInsightEngine {
  private thresholds: AlertThresholds;

  constructor(thresholds: AlertThresholds = defaultThresholds) {
    this.thresholds = thresholds;
  }

  /**
   * Generate alerts for a single HCP based on competitive signals
   */
  generateAlertsForHcp(
    summary: HcpCompetitiveSummary,
    hcpEngagementTrend?: "improving" | "stable" | "declining"
  ): CompetitiveAlert[] {
    const alerts: CompetitiveAlert[] = [];
    const timestamp = new Date().toISOString();

    for (const signal of summary.signals) {
      const cpi = signal.cpi ?? 0;
      const cpiDirection = signal.cpiDirection;
      const shareChangeQoQ = signal.shareChangeQoQ ?? 0;
      const engagementAsymmetry = signal.engagementAsymmetry ?? 0;

      // High CPI Alert
      if (cpi >= this.thresholds.criticalCpi) {
        alerts.push({
          id: `alert-${signal.hcpId}-${signal.competitorId}-critical`,
          hcpId: signal.hcpId,
          hcpName: summary.hcpName,
          competitorId: signal.competitorId,
          competitorName: signal.competitorName,
          alertType: "high_cpi_detected",
          severity: "critical",
          cpi,
          message: `Critical competitive pressure (CPI: ${cpi.toFixed(0)}) from ${signal.competitorName}`,
          recommendation: "Immediate defensive outreach recommended. Consider value messaging reinforcement.",
          createdAt: timestamp,
          metadata: { shareOfBrand: signal.shareOfBrand, cpiDirection },
        });
      } else if (cpi >= this.thresholds.warningCpi) {
        alerts.push({
          id: `alert-${signal.hcpId}-${signal.competitorId}-warning`,
          hcpId: signal.hcpId,
          hcpName: summary.hcpName,
          competitorId: signal.competitorId,
          competitorName: signal.competitorName,
          alertType: "high_cpi_detected",
          severity: "warning",
          cpi,
          message: `Elevated competitive pressure (CPI: ${cpi.toFixed(0)}) from ${signal.competitorName}`,
          recommendation: "Increase engagement frequency and monitor closely.",
          createdAt: timestamp,
          metadata: { shareOfBrand: signal.shareOfBrand, cpiDirection },
        });
      }

      // CPI Trending Up Alert
      if (cpiDirection === "increasing" && shareChangeQoQ >= this.thresholds.cpiTrendThreshold) {
        alerts.push({
          id: `alert-${signal.hcpId}-${signal.competitorId}-trending`,
          hcpId: signal.hcpId,
          hcpName: summary.hcpName,
          competitorId: signal.competitorId,
          competitorName: signal.competitorName,
          alertType: "cpi_trending_up",
          severity: cpi >= this.thresholds.warningCpi ? "warning" : "info",
          cpi,
          message: `${signal.competitorName} gaining momentum (+${shareChangeQoQ.toFixed(1)}% QoQ)`,
          recommendation: "Proactive engagement to counter competitive momentum.",
          createdAt: timestamp,
          metadata: { shareChangeQoQ, trend: "increasing" },
        });
      }

      // Engagement Asymmetry Alert
      if (engagementAsymmetry >= this.thresholds.engagementAsymmetryThreshold) {
        alerts.push({
          id: `alert-${signal.hcpId}-${signal.competitorId}-engagement`,
          hcpId: signal.hcpId,
          hcpName: summary.hcpName,
          competitorId: signal.competitorId,
          competitorName: signal.competitorName,
          alertType: "engagement_asymmetry",
          severity: "warning",
          cpi,
          message: `${signal.competitorName} has ${engagementAsymmetry.toFixed(0)} point engagement advantage`,
          recommendation: "Increase touchpoint frequency and content relevance.",
          createdAt: timestamp,
          metadata: { engagementAsymmetry, competitorEngagementScore: signal.competitorEngagementScore },
        });
      }

      // Share Erosion Alert
      if (shareChangeQoQ >= this.thresholds.shareErosionThreshold) {
        alerts.push({
          id: `alert-${signal.hcpId}-${signal.competitorId}-share`,
          hcpId: signal.hcpId,
          hcpName: summary.hcpName,
          competitorId: signal.competitorId,
          competitorName: signal.competitorName,
          alertType: "share_erosion",
          severity: shareChangeQoQ >= 10 ? "critical" : "warning",
          cpi,
          message: `Losing ${shareChangeQoQ.toFixed(1)}% market share to ${signal.competitorName}`,
          recommendation: "Immediate value proposition reinforcement needed.",
          createdAt: timestamp,
          metadata: { shareChangeQoQ, shareOfBrand: signal.shareOfBrand },
        });
      }

      // Defensive Intervention - combination of high CPI and declining engagement
      if (cpi >= this.thresholds.warningCpi && hcpEngagementTrend === "declining") {
        alerts.push({
          id: `alert-${signal.hcpId}-${signal.competitorId}-defensive`,
          hcpId: signal.hcpId,
          hcpName: summary.hcpName,
          competitorId: signal.competitorId,
          competitorName: signal.competitorName,
          alertType: "defensive_intervention",
          severity: "critical",
          cpi,
          message: `Defensive intervention required: High competitive pressure + declining engagement`,
          recommendation: "Prioritize this HCP for immediate personalized outreach. Consider rep visit or executive engagement.",
          createdAt: timestamp,
          metadata: { engagementTrend: "declining", cpiDirection },
        });
      }

      // Competitive Opportunity - competitor weakness
      if (cpiDirection === "decreasing" && cpi < this.thresholds.warningCpi) {
        alerts.push({
          id: `alert-${signal.hcpId}-${signal.competitorId}-opportunity`,
          hcpId: signal.hcpId,
          hcpName: summary.hcpName,
          competitorId: signal.competitorId,
          competitorName: signal.competitorName,
          alertType: "competitive_opportunity",
          severity: "info",
          cpi,
          message: `${signal.competitorName} losing ground - opportunity to gain share`,
          recommendation: "Increase engagement to capitalize on competitor weakness.",
          createdAt: timestamp,
          metadata: { cpiDirection, shareChangeQoQ },
        });
      }
    }

    // Deduplicate and sort by severity
    const severityOrder: Record<AlertSeverity, number> = { critical: 0, warning: 1, info: 2 };
    return alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
  }

  /**
   * Generate alerts using configurable thresholds from the database
   *
   * This method fetches the appropriate thresholds based on the context
   * (therapeutic area or competitor) and uses them for alert generation.
   */
  async generateAlertsWithConfigurableThresholds(
    summary: HcpCompetitiveSummary,
    hcpEngagementTrend?: "improving" | "stable" | "declining",
    therapeuticArea?: string,
    competitorId?: string
  ): Promise<{
    alerts: CompetitiveAlert[];
    thresholdsUsed: ResolvedAlertThresholds;
  }> {
    // Resolve thresholds from database
    const resolvedThresholds = await competitiveStorage.resolveAlertThresholds(
      therapeuticArea,
      competitorId
    );

    // Create a temporary engine with resolved thresholds
    const engineWithThresholds = new CompetitiveInsightEngine({
      criticalCpi: resolvedThresholds.criticalCpi,
      warningCpi: resolvedThresholds.warningCpi,
      cpiTrendThreshold: resolvedThresholds.cpiTrendThreshold,
      shareErosionThreshold: resolvedThresholds.shareErosionThreshold,
      engagementAsymmetryThreshold: resolvedThresholds.engagementAsymmetryThreshold,
    });

    const alerts = engineWithThresholds.generateAlertsForHcp(summary, hcpEngagementTrend);

    return {
      alerts,
      thresholdsUsed: resolvedThresholds,
    };
  }

  /**
   * Get the current threshold values (useful for debugging/display)
   */
  getThresholds(): AlertThresholds {
    return { ...this.thresholds };
  }

  /**
   * Update thresholds at runtime (useful for testing)
   */
  setThresholds(thresholds: Partial<AlertThresholds>): void {
    this.thresholds = { ...this.thresholds, ...thresholds };
  }

  /**
   * Determine the competitive flag for an HCP
   */
  getCompetitiveFlag(
    summary: HcpCompetitiveSummary,
    hcpEngagementTrend?: "improving" | "stable" | "declining"
  ): CompetitiveFlag {
    const cpi = summary.overallCpi;
    const riskLevel = summary.riskLevel;

    // Defensive intervention: high/critical risk + declining engagement
    if ((riskLevel === "high" || riskLevel === "critical") && hcpEngagementTrend === "declining") {
      return competitiveFlags.defensive_intervention;
    }

    // Competitive opportunity: check if any competitor is weakening
    const hasOpportunity = summary.signals.some(
      s => s.cpiDirection === "decreasing" && (s.cpi ?? 0) < this.thresholds.warningCpi
    );
    if (hasOpportunity && riskLevel !== "critical") {
      return competitiveFlags.competitive_opportunity;
    }

    // Watch list: medium/high risk
    if (riskLevel === "medium" || riskLevel === "high") {
      return competitiveFlags.watch;
    }

    // Low risk: default
    return competitiveFlags.low_risk;
  }

  /**
   * Generate NBA modification based on competitive pressure
   * Returns adjustment factors for the NBA engine
   */
  getNBACompetitiveAdjustment(
    summary: HcpCompetitiveSummary
  ): {
    urgencyBoost: number; // 0-1, add to urgency calculation
    confidenceAdjustment: number; // -20 to +20
    recommendedAction?: string;
    competitorContext?: string;
  } {
    const cpi = summary.overallCpi;
    const riskLevel = summary.riskLevel;
    const topCompetitor = summary.topCompetitor;

    // Critical risk: maximum urgency boost
    if (riskLevel === "critical") {
      return {
        urgencyBoost: 1.0,
        confidenceAdjustment: 15,
        recommendedAction: "defensive_outreach",
        competitorContext: topCompetitor
          ? `Critical competitive pressure from ${topCompetitor.name} (CPI: ${topCompetitor.cpi.toFixed(0)})`
          : "Critical competitive pressure detected",
      };
    }

    // High risk: significant urgency boost
    if (riskLevel === "high") {
      return {
        urgencyBoost: 0.7,
        confidenceAdjustment: 10,
        recommendedAction: "proactive_engagement",
        competitorContext: topCompetitor
          ? `High competitive pressure from ${topCompetitor.name} (CPI: ${topCompetitor.cpi.toFixed(0)})`
          : "High competitive pressure detected",
      };
    }

    // Medium risk: moderate adjustment
    if (riskLevel === "medium") {
      return {
        urgencyBoost: 0.3,
        confidenceAdjustment: 5,
        competitorContext: topCompetitor
          ? `Moderate competitive activity from ${topCompetitor.name}`
          : undefined,
      };
    }

    // Low risk: no adjustment
    return {
      urgencyBoost: 0,
      confidenceAdjustment: 0,
    };
  }

  /**
   * Generate portfolio-level competitive insights
   */
  async generatePortfolioInsights(): Promise<{
    totalHcpsAnalyzed: number;
    hcpsAtRisk: number;
    criticalAlerts: number;
    topThreats: Array<{
      competitorName: string;
      avgCpi: number;
      affectedHcps: number;
    }>;
    recommendations: string[];
  }> {
    const orbitData = await competitiveStorage.getCompetitiveOrbitData();

    if (!orbitData || orbitData.competitors.length === 0) {
      return {
        totalHcpsAnalyzed: 0,
        hcpsAtRisk: 0,
        criticalAlerts: 0,
        topThreats: [],
        recommendations: ["No competitive data available. Consider seeding competitive signals."],
      };
    }

    const hcpsAtRisk = orbitData.summary.totalHcpsUnderPressure;
    const avgCpi = orbitData.summary.avgOverallCpi;

    // Get top threats (sorted by avg CPI)
    const topThreats = orbitData.competitors
      .sort((a, b) => b.avgCpi - a.avgCpi)
      .slice(0, 3)
      .map(c => ({
        competitorName: c.name,
        avgCpi: c.avgCpi,
        affectedHcps: c.affectedHcpCount,
      }));

    // Count critical-level CPIs
    const criticalAlerts = orbitData.competitors.filter(c => c.avgCpi >= this.thresholds.criticalCpi).length;

    // Generate recommendations
    const recommendations: string[] = [];

    if (avgCpi >= this.thresholds.criticalCpi) {
      recommendations.push("Portfolio-wide defensive strategy recommended. Consider broad value messaging campaign.");
    } else if (avgCpi >= this.thresholds.warningCpi) {
      recommendations.push("Elevated competitive pressure across portfolio. Prioritize high-CPI HCPs for outreach.");
    }

    if (topThreats.length > 0) {
      recommendations.push(
        `Focus defensive efforts on ${topThreats[0].competitorName} which has highest average CPI (${topThreats[0].avgCpi.toFixed(0)}).`
      );
    }

    if (hcpsAtRisk > 0 && hcpsAtRisk <= 20) {
      recommendations.push(`${hcpsAtRisk} HCPs under significant pressure - manageable for targeted intervention.`);
    } else if (hcpsAtRisk > 20) {
      recommendations.push(`${hcpsAtRisk} HCPs under pressure - consider segmented approach by competitor.`);
    }

    return {
      totalHcpsAnalyzed: orbitData.competitors.reduce((sum, c) => sum + c.affectedHcpCount, 0),
      hcpsAtRisk,
      criticalAlerts,
      topThreats,
      recommendations,
    };
  }
}

// ============================================================================
// CSV EXPORT UTILITIES
// ============================================================================

/**
 * Convert competitive signals to CSV format
 */
export function competitiveSignalsToCSV(signals: HcpCompetitiveSignal[]): string {
  const headers = [
    "HCP ID",
    "Competitor ID",
    "Competitor Name",
    "Share of Brand (%)",
    "Share Change QoQ (%)",
    "Share Change MoM (%)",
    "Competitive Rx Velocity",
    "Our Rx Velocity",
    "Competitor Engagement Score",
    "Engagement Asymmetry",
    "CPI",
    "CPI Direction",
    "Risk Level",
    "Measurement Date",
    "Data Source",
    "Confidence Level",
  ];

  const rows = signals.map(s => [
    s.hcpId,
    s.competitorId,
    s.competitorName ?? "",
    s.shareOfBrand?.toFixed(2) ?? "",
    s.shareChangeQoQ?.toFixed(2) ?? "",
    s.shareChangeMoM?.toFixed(2) ?? "",
    s.competitiveRxVelocity?.toFixed(2) ?? "",
    s.ourRxVelocity?.toFixed(2) ?? "",
    s.competitorEngagementScore?.toString() ?? "",
    s.engagementAsymmetry?.toFixed(2) ?? "",
    s.cpi?.toFixed(2) ?? "",
    s.cpiDirection ?? "",
    cpiToRiskLevel(s.cpi ?? 0),
    s.measurementDate,
    s.dataSource ?? "",
    s.confidenceLevel?.toFixed(2) ?? "",
  ]);

  return [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
}

/**
 * Convert competitive alerts to CSV format
 */
export function competitiveAlertsToCSV(alerts: CompetitiveAlert[]): string {
  const headers = [
    "Alert ID",
    "HCP ID",
    "HCP Name",
    "Competitor ID",
    "Competitor Name",
    "Alert Type",
    "Severity",
    "CPI",
    "Message",
    "Recommendation",
    "Created At",
  ];

  const rows = alerts.map(a => [
    a.id,
    a.hcpId,
    a.hcpName ?? "",
    a.competitorId,
    a.competitorName ?? "",
    a.alertType,
    a.severity,
    a.cpi.toFixed(2),
    `"${a.message.replace(/"/g, '""')}"`,
    `"${a.recommendation.replace(/"/g, '""')}"`,
    a.createdAt,
  ]);

  return [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
}

// Singleton instance
export const competitiveInsightEngine = new CompetitiveInsightEngine();
