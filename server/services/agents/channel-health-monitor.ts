/**
 * Channel Health Monitor Agent
 *
 * Phase 6C: Autonomous monitoring of channel health across HCP portfolio
 *
 * This agent:
 * - Monitors channel engagement health for all HCPs
 * - Identifies declining, blocked, and opportunity channels
 * - Generates alerts for significant issues
 * - Proposes actions (Slack notifications, Jira tickets)
 * - Runs on a configurable schedule
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
  classifyChannelHealth,
  classifyCohortChannelHealth,
  getHealthSummary,
  type ChannelHealth,
  type CohortChannelHealth,
  type HealthStatus,
  healthStatusConfig,
} from "../channel-health";
import type { HCPProfile, Channel } from "@shared/schema";

// Input configuration for the channel health monitor
export interface ChannelHealthMonitorInput extends AgentInput {
  // Filter HCPs by tier (optional)
  tierFilter?: ("Tier 1" | "Tier 2" | "Tier 3")[];
  // Filter HCPs by specialty (optional)
  specialtyFilter?: string[];
  // Minimum number of blocked HCPs to trigger an alert
  blockedAlertThreshold?: number;
  // Minimum percentage of declining HCPs to trigger an alert
  decliningAlertThresholdPct?: number;
  // Whether to create Jira tickets for critical issues
  createJiraTickets?: boolean;
  // Whether to send Slack notifications
  sendSlackNotifications?: boolean;
  // Slack channel for notifications
  slackChannel?: string;
}

// Detailed health report output
export interface ChannelHealthReport {
  timestamp: Date;
  totalHcpsAnalyzed: number;
  channelSummaries: CohortChannelHealth[];
  criticalIssues: {
    channel: Channel;
    issue: HealthStatus;
    affectedCount: number;
    affectedPct: number;
    topAffectedHcps: { id: string; name: string; status: HealthStatus }[];
  }[];
  opportunities: {
    channel: Channel;
    opportunityCount: number;
    opportunityPct: number;
    potentialReachIncrease: number;
  }[];
  overallHealthScore: number;
  trend: "improving" | "stable" | "declining";
}

/**
 * Channel Health Monitor Agent
 */
export class ChannelHealthMonitorAgent extends BaseAgent<ChannelHealthMonitorInput> {
  readonly type: AgentType = "channel_health_monitor";
  readonly name = "Channel Health Monitor";
  readonly description =
    "Monitors channel engagement health across the HCP portfolio, identifies issues, and proposes remediation actions.";
  readonly version = "1.0.0";

  // Store for HCP data (injected during execution)
  private hcps: HCPProfile[] = [];

  /**
   * Set HCP data for analysis
   * This should be called before execute() with data from the database
   */
  setHcpData(hcps: HCPProfile[]): void {
    this.hcps = hcps;
  }

  getDefaultInput(): Partial<ChannelHealthMonitorInput> {
    return {
      blockedAlertThreshold: 5,
      decliningAlertThresholdPct: 20,
      createJiraTickets: true,
      sendSlackNotifications: true,
      slackChannel: "#channel-health-alerts",
    };
  }

  getInputSchema(): Record<string, { type: string; required: boolean; description: string }> {
    return {
      tierFilter: {
        type: "array",
        required: false,
        description: "Filter HCPs by tier (Tier 1, Tier 2, Tier 3)",
      },
      specialtyFilter: {
        type: "array",
        required: false,
        description: "Filter HCPs by specialty",
      },
      blockedAlertThreshold: {
        type: "number",
        required: false,
        description: "Minimum number of blocked HCPs to trigger alert",
      },
      decliningAlertThresholdPct: {
        type: "number",
        required: false,
        description: "Minimum percentage of declining HCPs to trigger alert",
      },
      createJiraTickets: {
        type: "boolean",
        required: false,
        description: "Whether to create Jira tickets for critical issues",
      },
      sendSlackNotifications: {
        type: "boolean",
        required: false,
        description: "Whether to send Slack notifications",
      },
      slackChannel: {
        type: "string",
        required: false,
        description: "Slack channel for notifications",
      },
    };
  }

  validate(input: ChannelHealthMonitorInput): { valid: boolean; errors?: string[] } {
    const errors: string[] = [];

    if (input.blockedAlertThreshold !== undefined && input.blockedAlertThreshold < 0) {
      errors.push("blockedAlertThreshold must be >= 0");
    }

    if (
      input.decliningAlertThresholdPct !== undefined &&
      (input.decliningAlertThresholdPct < 0 || input.decliningAlertThresholdPct > 100)
    ) {
      errors.push("decliningAlertThresholdPct must be between 0 and 100");
    }

    return { valid: errors.length === 0, errors };
  }

  protected getOutputCapabilities(): string[] {
    return ["insights", "alerts", "jira_tickets", "slack_notifications"];
  }

  protected getPermissions(): string[] {
    return ["read_hcp_data", "create_alerts", "send_slack", "create_jira"];
  }

  /**
   * Execute the channel health monitoring logic
   */
  async execute(
    input: ChannelHealthMonitorInput,
    context: AgentContext
  ): Promise<AgentOutput> {
    this.logger.info("Starting channel health analysis", {
      hcpCount: this.hcps.length,
      filters: { tier: input.tierFilter, specialty: input.specialtyFilter },
    });

    // Apply filters
    let filteredHcps = this.hcps;

    if (input.tierFilter && input.tierFilter.length > 0) {
      filteredHcps = filteredHcps.filter((hcp) =>
        input.tierFilter!.includes(hcp.tier as "Tier 1" | "Tier 2" | "Tier 3")
      );
    }

    if (input.specialtyFilter && input.specialtyFilter.length > 0) {
      filteredHcps = filteredHcps.filter((hcp) =>
        input.specialtyFilter!.includes(hcp.specialty)
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

    // Analyze channel health for cohort
    const cohortHealth = classifyCohortChannelHealth(filteredHcps);

    // Analyze individual HCPs for detailed insights
    const individualAnalysis = this.analyzeIndividualHcps(filteredHcps);

    // Generate report
    const report = this.generateHealthReport(
      filteredHcps,
      cohortHealth,
      individualAnalysis
    );

    // Generate insights
    const insights = this.generateInsights(report, input);

    // Generate alerts based on thresholds
    const alerts = this.generateAlerts(report, input);

    // Propose actions based on findings
    const proposedActions = this.generateProposedActions(report, input);

    // Calculate overall health score (0-100)
    const healthScore = this.calculateHealthScore(cohortHealth);

    const summary = this.generateSummary(report, insights, alerts);

    this.logger.info("Channel health analysis completed", {
      hcpsAnalyzed: filteredHcps.length,
      insights: insights.length,
      alerts: alerts.length,
      proposedActions: proposedActions.length,
      healthScore,
    });

    return {
      success: true,
      summary,
      insights,
      alerts,
      proposedActions,
      metrics: {
        hcpsAnalyzed: filteredHcps.length,
        healthScore,
        blockedChannels: report.criticalIssues.filter((i) => i.issue === "blocked").length,
        decliningChannels: report.criticalIssues.filter((i) => i.issue === "declining").length,
        opportunityChannels: report.opportunities.length,
        alertsGenerated: alerts.length,
        actionsProposed: proposedActions.length,
      },
    };
  }

  /**
   * Analyze individual HCPs and group by issue type
   */
  private analyzeIndividualHcps(hcps: HCPProfile[]): Map<Channel, Map<HealthStatus, HCPProfile[]>> {
    const analysis = new Map<Channel, Map<HealthStatus, HCPProfile[]>>();

    for (const hcp of hcps) {
      const channelHealths = classifyChannelHealth(hcp);

      for (const health of channelHealths) {
        if (!analysis.has(health.channel)) {
          analysis.set(health.channel, new Map());
        }

        const channelMap = analysis.get(health.channel)!;
        if (!channelMap.has(health.status)) {
          channelMap.set(health.status, []);
        }

        channelMap.get(health.status)!.push(hcp);
      }
    }

    return analysis;
  }

  /**
   * Generate comprehensive health report
   */
  private generateHealthReport(
    hcps: HCPProfile[],
    cohortHealth: CohortChannelHealth[],
    individualAnalysis: Map<Channel, Map<HealthStatus, HCPProfile[]>>
  ): ChannelHealthReport {
    const criticalIssues: ChannelHealthReport["criticalIssues"] = [];
    const opportunities: ChannelHealthReport["opportunities"] = [];

    for (const channelHealth of cohortHealth) {
      const channel = channelHealth.channel;
      const channelAnalysis = individualAnalysis.get(channel);

      // Check for blocked issues
      const blockedHcps = channelAnalysis?.get("blocked") || [];
      if (blockedHcps.length > 0) {
        criticalIssues.push({
          channel,
          issue: "blocked",
          affectedCount: blockedHcps.length,
          affectedPct: Math.round((blockedHcps.length / hcps.length) * 100),
          topAffectedHcps: blockedHcps.slice(0, 5).map((hcp) => ({
            id: hcp.id,
            name: `Dr. ${hcp.firstName} ${hcp.lastName}`,
            status: "blocked" as HealthStatus,
          })),
        });
      }

      // Check for declining issues
      const decliningHcps = channelAnalysis?.get("declining") || [];
      if (decliningHcps.length > 0) {
        criticalIssues.push({
          channel,
          issue: "declining",
          affectedCount: decliningHcps.length,
          affectedPct: Math.round((decliningHcps.length / hcps.length) * 100),
          topAffectedHcps: decliningHcps.slice(0, 5).map((hcp) => ({
            id: hcp.id,
            name: `Dr. ${hcp.firstName} ${hcp.lastName}`,
            status: "declining" as HealthStatus,
          })),
        });
      }

      // Check for opportunities
      const opportunityHcps = channelAnalysis?.get("opportunity") || [];
      if (opportunityHcps.length > 0) {
        opportunities.push({
          channel,
          opportunityCount: opportunityHcps.length,
          opportunityPct: Math.round((opportunityHcps.length / hcps.length) * 100),
          potentialReachIncrease: opportunityHcps.length * 3, // Estimate: 3 additional touches per HCP
        });
      }
    }

    // Sort by severity
    criticalIssues.sort((a, b) => {
      // Blocked is more critical than declining
      if (a.issue === "blocked" && b.issue !== "blocked") return -1;
      if (b.issue === "blocked" && a.issue !== "blocked") return 1;
      // Then by affected count
      return b.affectedCount - a.affectedCount;
    });

    opportunities.sort((a, b) => b.opportunityCount - a.opportunityCount);

    // Calculate overall health score
    const healthScore = this.calculateHealthScore(cohortHealth);

    // Determine trend (simplified - would need historical data for real trend)
    const blockedPct = criticalIssues
      .filter((i) => i.issue === "blocked")
      .reduce((sum, i) => sum + i.affectedPct, 0) / 6; // Average across 6 channels
    const trend: "improving" | "stable" | "declining" =
      blockedPct > 15 ? "declining" : blockedPct > 5 ? "stable" : "improving";

    return {
      timestamp: new Date(),
      totalHcpsAnalyzed: hcps.length,
      channelSummaries: cohortHealth,
      criticalIssues,
      opportunities,
      overallHealthScore: healthScore,
      trend,
    };
  }

  /**
   * Calculate overall health score (0-100)
   */
  private calculateHealthScore(cohortHealth: CohortChannelHealth[]): number {
    if (cohortHealth.length === 0) return 100;

    // Weight: active=100, opportunity=80, dark=50, declining=30, blocked=0
    const weights: Record<HealthStatus, number> = {
      active: 100,
      opportunity: 80,
      dark: 50,
      declining: 30,
      blocked: 0,
    };

    let totalScore = 0;
    let totalWeight = 0;

    for (const channel of cohortHealth) {
      for (const [status, pct] of Object.entries(channel.distribution)) {
        totalScore += weights[status as HealthStatus] * pct;
        totalWeight += pct;
      }
    }

    return totalWeight > 0 ? Math.round(totalScore / totalWeight) : 100;
  }

  /**
   * Generate insights from the health report
   */
  private generateInsights(
    report: ChannelHealthReport,
    input: ChannelHealthMonitorInput
  ): AgentInsight[] {
    const insights: AgentInsight[] = [];

    // Overall health insight
    insights.push({
      type: "health_score",
      title: "Portfolio Channel Health Score",
      description: `Overall channel health score is ${report.overallHealthScore}/100 across ${report.totalHcpsAnalyzed} HCPs.`,
      severity: report.overallHealthScore >= 70 ? "info" : report.overallHealthScore >= 50 ? "warning" : "critical",
      metrics: {
        score: report.overallHealthScore,
        trend: report.trend,
        hcpsAnalyzed: report.totalHcpsAnalyzed,
      },
      recommendation:
        report.trend === "declining"
          ? "Health is declining. Review blocked channels and consider re-engagement strategies."
          : report.trend === "stable"
          ? "Health is stable. Focus on converting opportunities to active engagement."
          : "Health is improving. Continue current engagement strategies.",
    });

    // Critical issues insights
    for (const issue of report.criticalIssues.slice(0, 3)) {
      const channelLabel = issue.channel.replace("_", " ");
      const statusConfig = healthStatusConfig[issue.issue];

      insights.push({
        type: "channel_issue",
        title: `${statusConfig.label} ${channelLabel} Channel`,
        description: `${issue.affectedCount} HCPs (${issue.affectedPct}%) have ${issue.issue} ${channelLabel} engagement.`,
        severity: issue.issue === "blocked" ? "critical" : "warning",
        affectedEntities: {
          type: "hcp",
          ids: issue.topAffectedHcps.map((h) => h.id),
          count: issue.affectedCount,
        },
        metrics: {
          affectedCount: issue.affectedCount,
          affectedPct: `${issue.affectedPct}%`,
        },
        recommendation:
          issue.issue === "blocked"
            ? `Reduce ${channelLabel} frequency or change messaging approach for blocked HCPs.`
            : `Re-engage ${channelLabel} channel with personalized outreach for declining HCPs.`,
      });
    }

    // Opportunity insights
    for (const opportunity of report.opportunities.slice(0, 2)) {
      const channelLabel = opportunity.channel.replace("_", " ");

      insights.push({
        type: "opportunity",
        title: `${channelLabel} Opportunity`,
        description: `${opportunity.opportunityCount} HCPs (${opportunity.opportunityPct}%) show high affinity for ${channelLabel} but low engagement.`,
        severity: "info",
        affectedEntities: {
          type: "hcp",
          ids: [], // Would need to track IDs for full implementation
          count: opportunity.opportunityCount,
        },
        metrics: {
          opportunityCount: opportunity.opportunityCount,
          potentialReach: opportunity.potentialReachIncrease,
        },
        recommendation: `Increase ${channelLabel} touchpoints for these HCPs to capture engagement opportunity.`,
      });
    }

    return insights;
  }

  /**
   * Generate alerts based on thresholds
   */
  private generateAlerts(
    report: ChannelHealthReport,
    input: ChannelHealthMonitorInput
  ): AgentAlert[] {
    const alerts: AgentAlert[] = [];
    const blockedThreshold = input.blockedAlertThreshold ?? 5;
    const decliningThreshold = input.decliningAlertThresholdPct ?? 20;

    // Check for blocked channel alerts
    for (const issue of report.criticalIssues.filter((i) => i.issue === "blocked")) {
      if (issue.affectedCount >= blockedThreshold) {
        const channelLabel = issue.channel.replace("_", " ");

        alerts.push({
          severity: "critical",
          title: `Blocked ${channelLabel} Alert`,
          message: `${issue.affectedCount} HCPs are not responding to ${channelLabel} engagement despite ${issue.affectedPct >= 10 ? "significant" : "repeated"} outreach attempts.`,
          channel: issue.channel,
          affectedEntities: {
            type: "hcp",
            ids: issue.topAffectedHcps.map((h) => h.id),
            count: issue.affectedCount,
          },
          suggestedActions: [
            {
              type: "reduce_frequency",
              label: `Reduce ${channelLabel} frequency`,
              payload: { channel: issue.channel, action: "reduce_frequency" },
            },
            {
              type: "create_jira",
              label: "Create Jira ticket",
              payload: { channel: issue.channel, issue: "blocked", count: issue.affectedCount },
            },
          ],
        });
      }
    }

    // Check for declining channel alerts
    for (const issue of report.criticalIssues.filter((i) => i.issue === "declining")) {
      if (issue.affectedPct >= decliningThreshold) {
        const channelLabel = issue.channel.replace("_", " ");

        alerts.push({
          severity: "warning",
          title: `Declining ${channelLabel} Engagement`,
          message: `${issue.affectedPct}% of HCPs show declining ${channelLabel} engagement. Re-engagement recommended.`,
          channel: issue.channel,
          affectedEntities: {
            type: "hcp",
            ids: issue.topAffectedHcps.map((h) => h.id),
            count: issue.affectedCount,
          },
          suggestedActions: [
            {
              type: "re_engagement_campaign",
              label: `Launch ${channelLabel} re-engagement`,
              payload: { channel: issue.channel, action: "re_engage" },
            },
          ],
        });
      }
    }

    // Overall health alert if score is critical
    if (report.overallHealthScore < 50) {
      alerts.push({
        severity: "critical",
        title: "Portfolio Health Critical",
        message: `Overall channel health score is ${report.overallHealthScore}/100. Multiple channels require immediate attention.`,
        suggestedActions: [
          {
            type: "review_strategy",
            label: "Review engagement strategy",
            payload: { action: "strategy_review" },
          },
        ],
      });
    }

    return alerts;
  }

  /**
   * Generate proposed actions based on findings
   */
  private generateProposedActions(
    report: ChannelHealthReport,
    input: ChannelHealthMonitorInput
  ): ProposedAgentAction[] {
    const actions: ProposedAgentAction[] = [];

    // Propose Slack notification for critical issues
    if (input.sendSlackNotifications && report.criticalIssues.length > 0) {
      const blockedIssues = report.criticalIssues.filter((i) => i.issue === "blocked");
      if (blockedIssues.length > 0) {
        actions.push({
          actionType: "send_slack",
          actionName: "Send Channel Health Alert to Slack",
          description: `Notify team about ${blockedIssues.length} blocked channel(s) affecting ${blockedIssues.reduce((sum, i) => sum + i.affectedCount, 0)} HCPs.`,
          reasoning: `Blocked channels indicate HCPs are not responding to outreach. Team needs to be alerted for strategy adjustment.`,
          confidence: 0.9,
          riskLevel: "low",
          impactScope: "portfolio",
          affectedEntityCount: blockedIssues.reduce((sum, i) => sum + i.affectedCount, 0),
          payload: {
            channel: input.slackChannel || "#channel-health-alerts",
            message: this.formatSlackMessage(report),
            blocks: this.formatSlackBlocks(report),
          },
          requiresApproval: false, // Low risk - just a notification
        });
      }
    }

    // Propose Jira tickets for critical blocked issues
    if (input.createJiraTickets) {
      for (const issue of report.criticalIssues.filter((i) => i.issue === "blocked" && i.affectedCount >= 10)) {
        const channelLabel = issue.channel.replace("_", " ");

        actions.push({
          actionType: "create_jira",
          actionName: `Create Jira Ticket: Blocked ${channelLabel}`,
          description: `Create a Jira ticket to investigate and remediate blocked ${channelLabel} engagement for ${issue.affectedCount} HCPs.`,
          reasoning: `${issue.affectedPct}% of HCPs are blocked on ${channelLabel}. This requires investigation and a remediation plan.`,
          confidence: 0.85,
          riskLevel: "low",
          impactScope: "segment",
          affectedEntityCount: issue.affectedCount,
          payload: {
            templateType: "channel_alert",
            channel: issue.channel,
            issueType: issue.issue,
            affectedCount: issue.affectedCount,
            affectedPct: issue.affectedPct,
            topHcps: issue.topAffectedHcps,
          },
          requiresApproval: true, // Require approval for creating tickets
        });
      }
    }

    return actions;
  }

  /**
   * Format a summary message for Slack
   */
  private formatSlackMessage(report: ChannelHealthReport): string {
    const lines = [
      `*Channel Health Report* - ${report.timestamp.toLocaleDateString()}`,
      `Portfolio Health Score: ${report.overallHealthScore}/100 (${report.trend})`,
      `HCPs Analyzed: ${report.totalHcpsAnalyzed}`,
      "",
    ];

    if (report.criticalIssues.length > 0) {
      lines.push("*Critical Issues:*");
      for (const issue of report.criticalIssues.slice(0, 3)) {
        const channelLabel = issue.channel.replace("_", " ");
        lines.push(`- ${issue.issue} ${channelLabel}: ${issue.affectedCount} HCPs (${issue.affectedPct}%)`);
      }
    }

    if (report.opportunities.length > 0) {
      lines.push("", "*Opportunities:*");
      for (const opp of report.opportunities.slice(0, 2)) {
        const channelLabel = opp.channel.replace("_", " ");
        lines.push(`- ${channelLabel}: ${opp.opportunityCount} HCPs with growth potential`);
      }
    }

    return lines.join("\n");
  }

  /**
   * Format Slack blocks for rich message
   */
  private formatSlackBlocks(report: ChannelHealthReport): unknown[] {
    const blocks: unknown[] = [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: "Channel Health Monitor Report",
        },
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*Health Score:*\n${report.overallHealthScore}/100`,
          },
          {
            type: "mrkdwn",
            text: `*Trend:*\n${report.trend}`,
          },
          {
            type: "mrkdwn",
            text: `*HCPs Analyzed:*\n${report.totalHcpsAnalyzed}`,
          },
          {
            type: "mrkdwn",
            text: `*Issues Found:*\n${report.criticalIssues.length}`,
          },
        ],
      },
    ];

    if (report.criticalIssues.length > 0) {
      blocks.push({ type: "divider" });
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: "*Critical Issues*",
        },
      });

      for (const issue of report.criticalIssues.slice(0, 3)) {
        const emoji = issue.issue === "blocked" ? ":red_circle:" : ":large_yellow_circle:";
        const channelLabel = issue.channel.replace("_", " ");

        blocks.push({
          type: "section",
          text: {
            type: "mrkdwn",
            text: `${emoji} *${channelLabel}* - ${issue.affectedCount} HCPs ${issue.issue} (${issue.affectedPct}%)`,
          },
        });
      }
    }

    blocks.push({
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `Generated by TwinEngine Channel Health Monitor | ${report.timestamp.toISOString()}`,
        },
      ],
    });

    return blocks;
  }

  /**
   * Generate summary text for the run
   */
  private generateSummary(
    report: ChannelHealthReport,
    insights: AgentInsight[],
    alerts: AgentAlert[]
  ): string {
    const parts = [
      `Analyzed ${report.totalHcpsAnalyzed} HCPs.`,
      `Health score: ${report.overallHealthScore}/100 (${report.trend}).`,
    ];

    if (report.criticalIssues.length > 0) {
      parts.push(`Found ${report.criticalIssues.length} critical issues.`);
    }

    if (report.opportunities.length > 0) {
      parts.push(`Identified ${report.opportunities.length} growth opportunities.`);
    }

    if (alerts.length > 0) {
      parts.push(`Generated ${alerts.length} alerts.`);
    }

    return parts.join(" ");
  }
}

// Export singleton instance
export const channelHealthMonitor = new ChannelHealthMonitorAgent();
