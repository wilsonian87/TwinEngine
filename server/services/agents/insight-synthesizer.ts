/**
 * Insight Synthesizer Agent
 *
 * Phase 6D: Strategic Insight Aggregation
 *
 * This agent:
 * - Aggregates insights from multiple data sources (channel health, NBAs, simulations, alerts)
 * - Identifies patterns and trends across the HCP portfolio
 * - Generates strategic recommendations for engagement optimization
 * - Creates executive summary documents
 * - Integrates with existing NBA engine for personalized recommendations
 */

import {
  BaseAgent,
  AgentType,
  AgentInput,
  AgentOutput,
  AgentContext,
  AgentInsight,
  AgentAlert,
  ProposedAgentAction,
} from "./base-agent";
import {
  generateNBAs,
  getNBASummary,
  prioritizeNBAs,
  type NextBestAction,
  type NBAConfig,
} from "../nba-engine";
import {
  classifyCohortChannelHealth,
  getHealthSummary,
  type CohortChannelHealth,
} from "../channel-health";
import type { HCPProfile, SimulationResult, Alert as StoredAlert, AgentRun } from "@shared/schema";

// Input configuration for the insight synthesizer
export interface InsightSynthesizerInput extends AgentInput {
  // Time period for analysis (days)
  analysisWindowDays?: number;
  // Focus areas for synthesis
  focusAreas?: ("channel_health" | "engagement" | "prescribing" | "simulation")[];
  // Tier filter
  tierFilter?: ("Tier 1" | "Tier 2" | "Tier 3")[];
  // Include NBA recommendations
  includeNBARecommendations?: boolean;
  // Maximum number of strategic recommendations to generate
  maxRecommendations?: number;
  // Whether to generate executive summary
  generateExecutiveSummary?: boolean;
  // Whether to send results to Slack
  sendSlackSummary?: boolean;
  // Slack channel for summary
  slackChannel?: string;
}

// Aggregated data from various sources
export interface AggregatedData {
  hcps: HCPProfile[];
  channelHealth: CohortChannelHealth[];
  nbas: NextBestAction[];
  recentAlerts: StoredAlert[];
  recentAgentRuns: AgentRun[];
  recentSimulations: SimulationResult[];
}

// Strategic pattern identified by the synthesizer
export interface StrategicPattern {
  type: "opportunity" | "risk" | "trend" | "anomaly";
  category: string;
  title: string;
  description: string;
  evidence: string[];
  impact: "high" | "medium" | "low";
  affectedHcpCount: number;
  affectedHcpPct: number;
  confidence: number;
  suggestedAction?: string;
}

// Strategic recommendation
export interface StrategicRecommendation {
  id: string;
  priority: number;
  title: string;
  rationale: string;
  expectedImpact: string;
  actionItems: string[];
  metrics: {
    affectedHcps: number;
    potentialReach: number;
    urgency: "immediate" | "short_term" | "medium_term";
  };
  relatedPatterns: string[];
}

// Executive summary structure
export interface ExecutiveSummary {
  generatedAt: Date;
  analysisWindow: { start: Date; end: Date };
  portfolioOverview: {
    totalHcps: number;
    tierDistribution: Record<string, number>;
    healthScore: number;
    healthTrend: "improving" | "stable" | "declining";
  };
  keyFindings: string[];
  topRisks: StrategicPattern[];
  topOpportunities: StrategicPattern[];
  recommendations: StrategicRecommendation[];
  actionPriorities: {
    immediate: string[];
    shortTerm: string[];
    mediumTerm: string[];
  };
}

/**
 * Insight Synthesizer Agent
 */
export class InsightSynthesizerAgent extends BaseAgent<InsightSynthesizerInput> {
  readonly type: AgentType = "insight_synthesizer";
  readonly name = "Insight Synthesizer";
  readonly description =
    "Aggregates insights from multiple data sources and generates strategic recommendations for HCP engagement optimization.";
  readonly version = "1.0.0";

  // Data stores (injected during execution)
  private hcps: HCPProfile[] = [];
  private recentAlerts: StoredAlert[] = [];
  private recentAgentRuns: AgentRun[] = [];
  private recentSimulations: SimulationResult[] = [];

  /**
   * Set data for analysis
   */
  setData(data: {
    hcps: HCPProfile[];
    recentAlerts?: StoredAlert[];
    recentAgentRuns?: AgentRun[];
    recentSimulations?: SimulationResult[];
  }): void {
    this.hcps = data.hcps;
    this.recentAlerts = data.recentAlerts || [];
    this.recentAgentRuns = data.recentAgentRuns || [];
    this.recentSimulations = data.recentSimulations || [];
  }

  getDefaultInput(): Partial<InsightSynthesizerInput> {
    return {
      analysisWindowDays: 30,
      focusAreas: ["channel_health", "engagement"],
      includeNBARecommendations: true,
      maxRecommendations: 5,
      generateExecutiveSummary: true,
      sendSlackSummary: false,
      slackChannel: "#insights-reports",
    };
  }

  getInputSchema(): Record<string, { type: string; required: boolean; description: string }> {
    return {
      analysisWindowDays: {
        type: "number",
        required: false,
        description: "Number of days to include in the analysis window",
      },
      focusAreas: {
        type: "array",
        required: false,
        description: "Areas to focus synthesis on (channel_health, engagement, prescribing, simulation)",
      },
      tierFilter: {
        type: "array",
        required: false,
        description: "Filter HCPs by tier (Tier 1, Tier 2, Tier 3)",
      },
      includeNBARecommendations: {
        type: "boolean",
        required: false,
        description: "Whether to include NBA-based recommendations",
      },
      maxRecommendations: {
        type: "number",
        required: false,
        description: "Maximum number of strategic recommendations to generate",
      },
      generateExecutiveSummary: {
        type: "boolean",
        required: false,
        description: "Whether to generate a full executive summary document",
      },
      sendSlackSummary: {
        type: "boolean",
        required: false,
        description: "Whether to send summary to Slack",
      },
      slackChannel: {
        type: "string",
        required: false,
        description: "Slack channel for summary notifications",
      },
    };
  }

  validate(input: InsightSynthesizerInput): { valid: boolean; errors?: string[] } {
    const errors: string[] = [];

    if (input.analysisWindowDays !== undefined && input.analysisWindowDays < 1) {
      errors.push("analysisWindowDays must be >= 1");
    }

    if (input.analysisWindowDays !== undefined && input.analysisWindowDays > 365) {
      errors.push("analysisWindowDays must be <= 365");
    }

    if (input.maxRecommendations !== undefined && input.maxRecommendations < 1) {
      errors.push("maxRecommendations must be >= 1");
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Execute the insight synthesis logic
   */
  async execute(
    input: InsightSynthesizerInput,
    context: AgentContext
  ): Promise<AgentOutput> {
    this.logger.info("Starting insight synthesis", {
      hcpCount: this.hcps.length,
      focusAreas: input.focusAreas,
      analysisWindow: input.analysisWindowDays,
    });

    // Apply tier filter
    let filteredHcps = this.hcps;
    if (input.tierFilter && input.tierFilter.length > 0) {
      filteredHcps = filteredHcps.filter((hcp) =>
        input.tierFilter!.includes(hcp.tier as "Tier 1" | "Tier 2" | "Tier 3")
      );
    }

    if (filteredHcps.length === 0) {
      return {
        success: true,
        summary: "No HCPs match the specified filters. No analysis performed.",
        insights: [],
        alerts: [],
        metrics: { hcpsAnalyzed: 0 },
      };
    }

    // Aggregate data from all sources
    const aggregatedData = this.aggregateData(filteredHcps, input);

    // Identify strategic patterns
    const patterns = this.identifyPatterns(aggregatedData, input);

    // Generate strategic recommendations
    const recommendations = this.generateRecommendations(patterns, aggregatedData, input);

    // Generate insights from patterns
    const insights = this.generateInsights(patterns, recommendations, input);

    // Generate alerts for critical findings
    const alerts = this.generateAlerts(patterns, input);

    // Generate proposed actions
    const proposedActions = this.generateProposedActions(recommendations, input);

    // Generate executive summary if requested
    let executiveSummary: ExecutiveSummary | undefined;
    if (input.generateExecutiveSummary) {
      executiveSummary = this.generateExecutiveSummary(
        aggregatedData,
        patterns,
        recommendations,
        input
      );
    }

    const summary = this.generateSummaryText(patterns, recommendations, insights, alerts);

    this.logger.info("Insight synthesis completed", {
      hcpsAnalyzed: filteredHcps.length,
      patternsFound: patterns.length,
      recommendations: recommendations.length,
      insights: insights.length,
      alerts: alerts.length,
    });

    return {
      success: true,
      summary,
      insights,
      alerts,
      proposedActions,
      metrics: {
        hcpsAnalyzed: filteredHcps.length,
        patternsIdentified: patterns.length,
        risksFound: patterns.filter((p) => p.type === "risk").length,
        opportunitiesFound: patterns.filter((p) => p.type === "opportunity").length,
        recommendationsGenerated: recommendations.length,
        alertsGenerated: alerts.length,
      },
    };
  }

  /**
   * Aggregate data from multiple sources
   */
  private aggregateData(
    hcps: HCPProfile[],
    input: InsightSynthesizerInput
  ): AggregatedData {
    // Get channel health for cohort
    const channelHealth = classifyCohortChannelHealth(hcps);

    // Generate NBAs for all HCPs
    const nbaConfig: NBAConfig = {
      prioritizeOpportunities: true,
      addressBlocked: true,
      reEngageThresholdDays: 60,
      minConfidenceThreshold: 40,
    };
    const nbas = input.includeNBARecommendations ? generateNBAs(hcps, nbaConfig) : [];

    // Filter data by analysis window
    const windowStart = new Date();
    windowStart.setDate(windowStart.getDate() - (input.analysisWindowDays || 30));

    const recentAlerts = this.recentAlerts.filter(
      (a) => new Date(a.createdAt) >= windowStart
    );

    const recentAgentRuns = this.recentAgentRuns.filter(
      (r) => new Date(r.createdAt) >= windowStart
    );

    const recentSimulations = this.recentSimulations.filter(
      (s) => new Date(s.runAt) >= windowStart
    );

    return {
      hcps,
      channelHealth,
      nbas,
      recentAlerts,
      recentAgentRuns,
      recentSimulations,
    };
  }

  /**
   * Identify strategic patterns from aggregated data
   */
  private identifyPatterns(
    data: AggregatedData,
    input: InsightSynthesizerInput
  ): StrategicPattern[] {
    const patterns: StrategicPattern[] = [];
    const totalHcps = data.hcps.length;

    // Pattern 1: Channel Health Risks
    for (const channelHealth of data.channelHealth) {
      const blockedPct = channelHealth.distribution.blocked;
      const decliningPct = channelHealth.distribution.declining;

      // High blocked rate risk
      if (blockedPct > 10) {
        const affectedCount = Math.round((blockedPct / 100) * totalHcps);
        patterns.push({
          type: "risk",
          category: "channel_fatigue",
          title: `High ${channelHealth.channel.replace("_", " ")} Blocking Rate`,
          description: `${blockedPct.toFixed(1)}% of HCPs are not responding to ${channelHealth.channel.replace("_", " ")} engagement.`,
          evidence: [
            `${affectedCount} HCPs showing no response to outreach`,
            `Active rate: ${channelHealth.distribution.active.toFixed(1)}%`,
            `Response rate significantly below benchmark`,
          ],
          impact: blockedPct > 20 ? "high" : "medium",
          affectedHcpCount: affectedCount,
          affectedHcpPct: blockedPct,
          confidence: 85,
          suggestedAction: `Reduce ${channelHealth.channel.replace("_", " ")} frequency and consider messaging refresh`,
        });
      }

      // Declining engagement risk
      if (decliningPct > 15) {
        const affectedCount = Math.round((decliningPct / 100) * totalHcps);
        patterns.push({
          type: "risk",
          category: "engagement_decline",
          title: `Declining ${channelHealth.channel.replace("_", " ")} Engagement`,
          description: `${decliningPct.toFixed(1)}% of HCPs show declining ${channelHealth.channel.replace("_", " ")} engagement.`,
          evidence: [
            `${affectedCount} HCPs with decreasing response rates`,
            `Trend indicates potential relationship erosion`,
          ],
          impact: decliningPct > 25 ? "high" : "medium",
          affectedHcpCount: affectedCount,
          affectedHcpPct: decliningPct,
          confidence: 80,
          suggestedAction: `Launch targeted re-engagement campaign for declining HCPs`,
        });
      }

      // Opportunity pattern
      const opportunityPct = channelHealth.distribution.opportunity;
      if (opportunityPct > 20) {
        const affectedCount = Math.round((opportunityPct / 100) * totalHcps);
        patterns.push({
          type: "opportunity",
          category: "untapped_potential",
          title: `${channelHealth.channel.replace("_", " ")} Growth Opportunity`,
          description: `${opportunityPct.toFixed(1)}% of HCPs show high affinity for ${channelHealth.channel.replace("_", " ")} but low engagement.`,
          evidence: [
            `${affectedCount} HCPs with high channel affinity`,
            `Current engagement below potential`,
            `Channel preference alignment identified`,
          ],
          impact: opportunityPct > 30 ? "high" : "medium",
          affectedHcpCount: affectedCount,
          affectedHcpPct: opportunityPct,
          confidence: 75,
          suggestedAction: `Increase ${channelHealth.channel.replace("_", " ")} touchpoints for high-affinity HCPs`,
        });
      }
    }

    // Pattern 2: NBA-based patterns
    if (data.nbas.length > 0) {
      const nbaSummary = getNBASummary(data.nbas);

      // High urgency actions pattern
      const highUrgencyPct = (nbaSummary.byUrgency.high / nbaSummary.totalActions) * 100;
      if (highUrgencyPct > 20) {
        patterns.push({
          type: "risk",
          category: "urgent_actions",
          title: "High Volume of Urgent Actions Required",
          description: `${highUrgencyPct.toFixed(1)}% of HCPs require high-urgency engagement actions.`,
          evidence: [
            `${nbaSummary.byUrgency.high} HCPs need immediate attention`,
            `Average confidence score: ${nbaSummary.avgConfidence}%`,
            `Primary action types: ${Object.entries(nbaSummary.byActionType)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 2)
              .map(([type]) => type)
              .join(", ")}`,
          ],
          impact: highUrgencyPct > 30 ? "high" : "medium",
          affectedHcpCount: nbaSummary.byUrgency.high,
          affectedHcpPct: highUrgencyPct,
          confidence: 82,
          suggestedAction: "Prioritize high-urgency HCPs in next engagement cycle",
        });
      }

      // Re-engagement opportunity pattern
      const reEngageCount = nbaSummary.byActionType.re_engage || 0;
      const reEngagePct = (reEngageCount / nbaSummary.totalActions) * 100;
      if (reEngagePct > 15) {
        patterns.push({
          type: "opportunity",
          category: "re_engagement",
          title: "Re-engagement Campaign Opportunity",
          description: `${reEngageCount} HCPs (${reEngagePct.toFixed(1)}%) are candidates for re-engagement.`,
          evidence: [
            `Significant portion of portfolio showing declining engagement`,
            `Re-engagement actions recommended by NBA engine`,
            `Potential to recover relationships before they go dark`,
          ],
          impact: reEngagePct > 25 ? "high" : "medium",
          affectedHcpCount: reEngageCount,
          affectedHcpPct: reEngagePct,
          confidence: 78,
          suggestedAction: "Launch targeted re-engagement campaign with personalized content",
        });
      }
    }

    // Pattern 3: Alert-based patterns
    if (this.recentAlerts.length > 0) {
      const criticalAlerts = this.recentAlerts.filter((a) => a.severity === "critical");
      if (criticalAlerts.length >= 3) {
        patterns.push({
          type: "risk",
          category: "recurring_issues",
          title: "Recurring Critical Issues Detected",
          description: `${criticalAlerts.length} critical alerts in the analysis period indicate systemic issues.`,
          evidence: criticalAlerts.slice(0, 3).map((a) => a.title),
          impact: "high",
          affectedHcpCount: 0,
          affectedHcpPct: 0,
          confidence: 90,
          suggestedAction: "Conduct root cause analysis of recurring critical alerts",
        });
      }
    }

    // Pattern 4: Tier-specific patterns
    const tierDistribution = this.calculateTierDistribution(data.hcps);
    const tier1Hcps = data.hcps.filter((h) => h.tier === "Tier 1");
    if (tier1Hcps.length > 0) {
      const tier1Health = classifyCohortChannelHealth(tier1Hcps);
      const avgBlockedPct = tier1Health.reduce((sum, ch) => sum + ch.distribution.blocked, 0) / tier1Health.length;

      if (avgBlockedPct > 5) {
        patterns.push({
          type: "risk",
          category: "tier1_health",
          title: "Tier 1 HCP Engagement Risk",
          description: `${avgBlockedPct.toFixed(1)}% average blocking rate among high-value Tier 1 HCPs.`,
          evidence: [
            `${tier1Hcps.length} Tier 1 HCPs in portfolio`,
            `Higher blocking rate indicates relationship risks with key accounts`,
            `Potential revenue impact from disengaged tier 1 HCPs`,
          ],
          impact: "high",
          affectedHcpCount: Math.round((avgBlockedPct / 100) * tier1Hcps.length),
          affectedHcpPct: avgBlockedPct,
          confidence: 88,
          suggestedAction: "Implement personalized outreach strategy for blocked Tier 1 HCPs",
        });
      }
    }

    // Sort patterns by impact and confidence
    return patterns.sort((a, b) => {
      const impactOrder = { high: 0, medium: 1, low: 2 };
      const impactDiff = impactOrder[a.impact] - impactOrder[b.impact];
      if (impactDiff !== 0) return impactDiff;
      return b.confidence - a.confidence;
    });
  }

  /**
   * Generate strategic recommendations based on patterns
   */
  private generateRecommendations(
    patterns: StrategicPattern[],
    data: AggregatedData,
    input: InsightSynthesizerInput
  ): StrategicRecommendation[] {
    const recommendations: StrategicRecommendation[] = [];
    const maxRecs = input.maxRecommendations || 5;

    // Recommendation 1: Address highest-impact risks
    const highImpactRisks = patterns.filter((p) => p.type === "risk" && p.impact === "high");
    if (highImpactRisks.length > 0) {
      const topRisk = highImpactRisks[0];
      recommendations.push({
        id: `rec-${Date.now()}-risk`,
        priority: 1,
        title: `Address ${topRisk.category.replace("_", " ")}`,
        rationale: topRisk.description,
        expectedImpact: `Reduce risk exposure for ${topRisk.affectedHcpCount} HCPs (${topRisk.affectedHcpPct.toFixed(1)}% of portfolio)`,
        actionItems: [
          topRisk.suggestedAction || "Develop mitigation strategy",
          "Identify root causes through detailed analysis",
          "Monitor progress with weekly check-ins",
        ],
        metrics: {
          affectedHcps: topRisk.affectedHcpCount,
          potentialReach: topRisk.affectedHcpCount * 3,
          urgency: "immediate",
        },
        relatedPatterns: [topRisk.title],
      });
    }

    // Recommendation 2: Capitalize on opportunities
    const opportunities = patterns.filter((p) => p.type === "opportunity");
    if (opportunities.length > 0) {
      const topOpportunity = opportunities[0];
      recommendations.push({
        id: `rec-${Date.now()}-opp`,
        priority: 2,
        title: `Capitalize on ${topOpportunity.category.replace("_", " ")}`,
        rationale: topOpportunity.description,
        expectedImpact: `Potential reach increase of ${topOpportunity.affectedHcpCount * 3} additional touchpoints`,
        actionItems: [
          topOpportunity.suggestedAction || "Develop expansion strategy",
          "Create targeted content for opportunity segment",
          "Set up tracking metrics for campaign performance",
        ],
        metrics: {
          affectedHcps: topOpportunity.affectedHcpCount,
          potentialReach: topOpportunity.affectedHcpCount * 3,
          urgency: "short_term",
        },
        relatedPatterns: [topOpportunity.title],
      });
    }

    // Recommendation 3: NBA-based recommendation
    if (data.nbas.length > 0) {
      const highUrgencyNBAs = prioritizeNBAs(data.nbas, 10).filter((n) => n.urgency === "high");
      if (highUrgencyNBAs.length > 0) {
        recommendations.push({
          id: `rec-${Date.now()}-nba`,
          priority: 3,
          title: "Execute Priority Engagement Actions",
          rationale: `${highUrgencyNBAs.length} HCPs require high-urgency engagement based on NBA analysis.`,
          expectedImpact: `Improve engagement scores for top-priority HCPs with average confidence of ${Math.round(highUrgencyNBAs.reduce((sum, n) => sum + n.confidence, 0) / highUrgencyNBAs.length)}%`,
          actionItems: [
            "Review and approve recommended actions in action queue",
            "Coordinate with field team for personalized outreach",
            "Track engagement response within 2 weeks",
          ],
          metrics: {
            affectedHcps: highUrgencyNBAs.length,
            potentialReach: highUrgencyNBAs.length * 2,
            urgency: "immediate",
          },
          relatedPatterns: ["High Volume of Urgent Actions Required"],
        });
      }
    }

    // Recommendation 4: Channel optimization
    const channelRisks = patterns.filter((p) => p.category === "channel_fatigue" || p.category === "engagement_decline");
    if (channelRisks.length > 0) {
      const totalAffected = channelRisks.reduce((sum, p) => sum + p.affectedHcpCount, 0);
      recommendations.push({
        id: `rec-${Date.now()}-channel`,
        priority: 4,
        title: "Optimize Channel Mix Strategy",
        rationale: `Multiple channels showing fatigue or decline affecting ${totalAffected} HCPs.`,
        expectedImpact: "Improved channel effectiveness and reduced fatigue across portfolio",
        actionItems: [
          "Audit current channel frequency by tier",
          "Implement channel rotation strategy for at-risk segments",
          "Test alternative channels for blocked HCPs",
          "Refresh messaging content for declining channels",
        ],
        metrics: {
          affectedHcps: totalAffected,
          potentialReach: totalAffected * 2,
          urgency: "short_term",
        },
        relatedPatterns: channelRisks.map((p) => p.title),
      });
    }

    // Recommendation 5: Tier 1 focus
    const tier1Risks = patterns.filter((p) => p.category === "tier1_health");
    if (tier1Risks.length > 0) {
      const tier1Risk = tier1Risks[0];
      recommendations.push({
        id: `rec-${Date.now()}-tier1`,
        priority: 5,
        title: "Strengthen Tier 1 Relationships",
        rationale: tier1Risk.description,
        expectedImpact: "Protect and grow relationships with highest-value HCPs",
        actionItems: [
          "Conduct individual account reviews for blocked Tier 1 HCPs",
          "Develop personalized engagement plans",
          "Assign dedicated resources for relationship recovery",
          "Schedule executive sponsorship outreach where appropriate",
        ],
        metrics: {
          affectedHcps: tier1Risk.affectedHcpCount,
          potentialReach: tier1Risk.affectedHcpCount * 5,
          urgency: "immediate",
        },
        relatedPatterns: [tier1Risk.title],
      });
    }

    return recommendations.slice(0, maxRecs);
  }

  /**
   * Generate insights from patterns and recommendations
   */
  private generateInsights(
    patterns: StrategicPattern[],
    recommendations: StrategicRecommendation[],
    input: InsightSynthesizerInput
  ): AgentInsight[] {
    const insights: AgentInsight[] = [];

    // Summary insight
    insights.push({
      type: "synthesis_summary",
      title: "Portfolio Insight Synthesis",
      description: `Analyzed ${this.hcps.length} HCPs and identified ${patterns.length} strategic patterns with ${recommendations.length} actionable recommendations.`,
      severity: patterns.some((p) => p.impact === "high" && p.type === "risk") ? "warning" : "info",
      metrics: {
        totalPatterns: patterns.length,
        risks: patterns.filter((p) => p.type === "risk").length,
        opportunities: patterns.filter((p) => p.type === "opportunity").length,
        recommendations: recommendations.length,
      },
    });

    // Top pattern insights
    for (const pattern of patterns.slice(0, 5)) {
      insights.push({
        type: "strategic_pattern",
        title: pattern.title,
        description: pattern.description,
        severity: pattern.impact === "high" ? (pattern.type === "risk" ? "critical" : "warning") : "info",
        affectedEntities: {
          type: "hcp",
          ids: [],
          count: pattern.affectedHcpCount,
        },
        metrics: {
          confidence: `${pattern.confidence}%`,
          affectedPct: `${pattern.affectedHcpPct.toFixed(1)}%`,
          impact: pattern.impact,
        },
        recommendation: pattern.suggestedAction,
      });
    }

    return insights;
  }

  /**
   * Generate alerts for critical findings
   */
  private generateAlerts(
    patterns: StrategicPattern[],
    input: InsightSynthesizerInput
  ): AgentAlert[] {
    const alerts: AgentAlert[] = [];

    // Alert for high-impact risks
    const criticalRisks = patterns.filter((p) => p.type === "risk" && p.impact === "high");
    for (const risk of criticalRisks.slice(0, 3)) {
      alerts.push({
        severity: "warning",
        title: risk.title,
        message: `${risk.description} Recommended action: ${risk.suggestedAction}`,
        affectedEntities: {
          type: "hcp",
          ids: [],
          count: risk.affectedHcpCount,
        },
        suggestedActions: [
          {
            type: "view_details",
            label: "View affected HCPs",
            payload: { category: risk.category },
          },
          {
            type: "create_campaign",
            label: "Create remediation campaign",
            payload: { patternType: risk.type, category: risk.category },
          },
        ],
      });
    }

    // Critical alert if multiple high-impact risks
    if (criticalRisks.length >= 3) {
      alerts.push({
        severity: "critical",
        title: "Multiple Critical Portfolio Risks Identified",
        message: `${criticalRisks.length} high-impact risks require immediate attention. Strategic review recommended.`,
        suggestedActions: [
          {
            type: "schedule_review",
            label: "Schedule strategy review",
            payload: { urgency: "immediate" },
          },
        ],
      });
    }

    return alerts;
  }

  /**
   * Generate proposed actions
   */
  private generateProposedActions(
    recommendations: StrategicRecommendation[],
    input: InsightSynthesizerInput
  ): ProposedAgentAction[] {
    const actions: ProposedAgentAction[] = [];

    // Propose Slack summary if enabled
    if (input.sendSlackSummary) {
      actions.push({
        actionType: "send_slack",
        actionName: "Send Insight Synthesis Report",
        description: `Send executive summary to ${input.slackChannel || "#insights-reports"}`,
        reasoning: "Weekly/periodic insight synthesis provides strategic visibility to leadership.",
        confidence: 0.95,
        riskLevel: "low",
        impactScope: "portfolio",
        affectedEntityCount: this.hcps.length,
        payload: {
          channel: input.slackChannel || "#insights-reports",
          summary: `Insight synthesis complete: ${recommendations.length} strategic recommendations generated.`,
        },
        requiresApproval: false,
      });
    }

    // Propose follow-up actions for top recommendations
    for (const rec of recommendations.slice(0, 2)) {
      if (rec.metrics.urgency === "immediate") {
        actions.push({
          actionType: "create_task",
          actionName: rec.title,
          description: `Create task to implement: ${rec.actionItems[0]}`,
          reasoning: rec.rationale,
          confidence: 0.8,
          riskLevel: "medium",
          impactScope: rec.metrics.affectedHcps > 50 ? "portfolio" : "segment",
          affectedEntityCount: rec.metrics.affectedHcps,
          payload: {
            recommendationId: rec.id,
            priority: rec.priority,
            actionItems: rec.actionItems,
          },
          requiresApproval: true,
        });
      }
    }

    return actions;
  }

  /**
   * Generate executive summary document
   */
  private generateExecutiveSummary(
    data: AggregatedData,
    patterns: StrategicPattern[],
    recommendations: StrategicRecommendation[],
    input: InsightSynthesizerInput
  ): ExecutiveSummary {
    const windowDays = input.analysisWindowDays || 30;
    const windowStart = new Date();
    windowStart.setDate(windowStart.getDate() - windowDays);

    // Calculate overall health score
    const healthScore = this.calculateOverallHealthScore(data.channelHealth);
    const healthTrend = this.determineHealthTrend(patterns);

    // Categorize recommendations by urgency
    const immediate = recommendations
      .filter((r) => r.metrics.urgency === "immediate")
      .map((r) => r.title);
    const shortTerm = recommendations
      .filter((r) => r.metrics.urgency === "short_term")
      .map((r) => r.title);
    const mediumTerm = recommendations
      .filter((r) => r.metrics.urgency === "medium_term")
      .map((r) => r.title);

    return {
      generatedAt: new Date(),
      analysisWindow: {
        start: windowStart,
        end: new Date(),
      },
      portfolioOverview: {
        totalHcps: data.hcps.length,
        tierDistribution: this.calculateTierDistribution(data.hcps),
        healthScore,
        healthTrend,
      },
      keyFindings: this.generateKeyFindings(patterns, data),
      topRisks: patterns.filter((p) => p.type === "risk").slice(0, 3),
      topOpportunities: patterns.filter((p) => p.type === "opportunity").slice(0, 3),
      recommendations,
      actionPriorities: {
        immediate,
        shortTerm,
        mediumTerm,
      },
    };
  }

  /**
   * Calculate tier distribution
   */
  private calculateTierDistribution(hcps: HCPProfile[]): Record<string, number> {
    const distribution: Record<string, number> = {
      "Tier 1": 0,
      "Tier 2": 0,
      "Tier 3": 0,
    };

    for (const hcp of hcps) {
      if (hcp.tier in distribution) {
        distribution[hcp.tier]++;
      }
    }

    return distribution;
  }

  /**
   * Calculate overall health score
   */
  private calculateOverallHealthScore(channelHealth: CohortChannelHealth[]): number {
    if (channelHealth.length === 0) return 100;

    const weights = {
      active: 100,
      opportunity: 80,
      dark: 50,
      declining: 30,
      blocked: 0,
    };

    let totalScore = 0;
    let totalWeight = 0;

    for (const channel of channelHealth) {
      for (const [status, pct] of Object.entries(channel.distribution)) {
        const weight = weights[status as keyof typeof weights] || 50;
        totalScore += weight * pct;
        totalWeight += pct;
      }
    }

    return totalWeight > 0 ? Math.round(totalScore / totalWeight) : 100;
  }

  /**
   * Determine health trend based on patterns
   */
  private determineHealthTrend(patterns: StrategicPattern[]): "improving" | "stable" | "declining" {
    const risks = patterns.filter((p) => p.type === "risk");
    const opportunities = patterns.filter((p) => p.type === "opportunity");

    const highRisks = risks.filter((p) => p.impact === "high").length;
    const highOpportunities = opportunities.filter((p) => p.impact === "high").length;

    if (highRisks > highOpportunities + 1) return "declining";
    if (highOpportunities > highRisks + 1) return "improving";
    return "stable";
  }

  /**
   * Generate key findings summary
   */
  private generateKeyFindings(
    patterns: StrategicPattern[],
    data: AggregatedData
  ): string[] {
    const findings: string[] = [];

    // Portfolio size
    findings.push(`Portfolio includes ${data.hcps.length} HCPs across ${Object.keys(this.calculateTierDistribution(data.hcps)).length} tiers.`);

    // Top risk
    const topRisk = patterns.find((p) => p.type === "risk" && p.impact === "high");
    if (topRisk) {
      findings.push(`Primary risk: ${topRisk.title} affecting ${topRisk.affectedHcpPct.toFixed(1)}% of portfolio.`);
    }

    // Top opportunity
    const topOpportunity = patterns.find((p) => p.type === "opportunity");
    if (topOpportunity) {
      findings.push(`Key opportunity: ${topOpportunity.title} with ${topOpportunity.affectedHcpCount} potential HCPs.`);
    }

    // NBA summary
    if (data.nbas.length > 0) {
      const summary = getNBASummary(data.nbas);
      findings.push(`${summary.byUrgency.high} HCPs require high-urgency engagement actions.`);
    }

    // Alert status
    const criticalAlerts = data.recentAlerts.filter((a) => a.severity === "critical" && a.status === "active");
    if (criticalAlerts.length > 0) {
      findings.push(`${criticalAlerts.length} critical alerts require immediate attention.`);
    }

    return findings;
  }

  /**
   * Generate summary text
   */
  private generateSummaryText(
    patterns: StrategicPattern[],
    recommendations: StrategicRecommendation[],
    insights: AgentInsight[],
    alerts: AgentAlert[]
  ): string {
    const parts = [
      `Synthesized insights from ${this.hcps.length} HCPs.`,
      `Identified ${patterns.length} strategic patterns (${patterns.filter((p) => p.type === "risk").length} risks, ${patterns.filter((p) => p.type === "opportunity").length} opportunities).`,
      `Generated ${recommendations.length} actionable recommendations.`,
    ];

    if (alerts.length > 0) {
      parts.push(`Created ${alerts.length} alerts for critical findings.`);
    }

    return parts.join(" ");
  }
}

// Export singleton instance
export const insightSynthesizer = new InsightSynthesizerAgent();
