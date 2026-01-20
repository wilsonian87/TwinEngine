/**
 * Agent Executor Service
 *
 * Phase 12D.3: Tool Invocation & Autonomy Framework
 *
 * This service:
 * - Defines agent action capabilities (generate views, run scenarios, create reports)
 * - Executes approved actions against platform services
 * - Logs all executions for audit trail
 * - Implements human-in-the-loop controls
 * - Enforces compliance guardrails
 */

import { storage } from "../../storage";
import { competitiveStorage } from "../../storage/competitive-storage";
import type { AgentAction, InsertAuditLog } from "@shared/schema";

// ============================================================================
// ACTION TYPES & CAPABILITIES
// ============================================================================

/**
 * Supported action categories for agent execution
 */
export const actionCategories = [
  "query",           // Read-only data queries
  "report",          // Generate reports and exports
  "notification",    // Send alerts and notifications
  "simulation",      // Run what-if scenarios
  "recommendation",  // Generate NBO/NBA recommendations
  "configuration",   // Modify system settings (requires approval)
  "integration",     // External system interactions
] as const;

export type ActionCategory = (typeof actionCategories)[number];

/**
 * Specific action types with their properties
 */
export interface ActionCapability {
  type: string;
  category: ActionCategory;
  name: string;
  description: string;
  requiresApproval: boolean;
  riskLevel: "low" | "medium" | "high";
  maxAffectedEntities?: number;      // Auto-approve threshold
  rateLimitPerHour?: number;         // Rate limiting
  auditLevel: "minimal" | "standard" | "detailed";
}

/**
 * Registry of all available agent actions
 */
export const actionCapabilities: ActionCapability[] = [
  // Query Actions (Auto-approve, low risk)
  {
    type: "query_hcp_profile",
    category: "query",
    name: "Query HCP Profile",
    description: "Retrieve HCP profile data for analysis",
    requiresApproval: false,
    riskLevel: "low",
    auditLevel: "minimal",
  },
  {
    type: "query_engagement_metrics",
    category: "query",
    name: "Query Engagement Metrics",
    description: "Retrieve engagement scores and history",
    requiresApproval: false,
    riskLevel: "low",
    auditLevel: "minimal",
  },
  {
    type: "query_competitive_data",
    category: "query",
    name: "Query Competitive Data",
    description: "Retrieve CPI, competitor signals, and orbit data",
    requiresApproval: false,
    riskLevel: "low",
    auditLevel: "minimal",
  },
  {
    type: "query_cohort_analysis",
    category: "query",
    name: "Query Cohort Analysis",
    description: "Analyze HCP segments and cohort metrics",
    requiresApproval: false,
    riskLevel: "low",
    auditLevel: "standard",
  },

  // Report Actions (Auto-approve for small scope)
  {
    type: "generate_hcp_report",
    category: "report",
    name: "Generate HCP Report",
    description: "Create detailed HCP profile report",
    requiresApproval: false,
    riskLevel: "low",
    maxAffectedEntities: 10,
    auditLevel: "standard",
  },
  {
    type: "generate_territory_report",
    category: "report",
    name: "Generate Territory Report",
    description: "Create territory performance summary",
    requiresApproval: false,
    riskLevel: "low",
    auditLevel: "standard",
  },
  {
    type: "generate_competitive_report",
    category: "report",
    name: "Generate Competitive Report",
    description: "Create competitive landscape analysis",
    requiresApproval: false,
    riskLevel: "low",
    auditLevel: "standard",
  },
  {
    type: "export_bulk_data",
    category: "report",
    name: "Export Bulk Data",
    description: "Export large datasets for external analysis",
    requiresApproval: true,
    riskLevel: "medium",
    maxAffectedEntities: 100,
    auditLevel: "detailed",
  },

  // Notification Actions (Auto-approve for internal)
  {
    type: "send_slack_alert",
    category: "notification",
    name: "Send Slack Alert",
    description: "Send notification to internal Slack channel",
    requiresApproval: false,
    riskLevel: "low",
    rateLimitPerHour: 50,
    auditLevel: "standard",
  },
  {
    type: "create_jira_ticket",
    category: "notification",
    name: "Create Jira Ticket",
    description: "Create ticket for follow-up action",
    requiresApproval: false,
    riskLevel: "low",
    rateLimitPerHour: 20,
    auditLevel: "standard",
  },
  {
    type: "send_email_notification",
    category: "notification",
    name: "Send Email Notification",
    description: "Send email to internal stakeholders",
    requiresApproval: true,
    riskLevel: "medium",
    auditLevel: "detailed",
  },

  // Simulation Actions (Auto-approve)
  {
    type: "run_engagement_simulation",
    category: "simulation",
    name: "Run Engagement Simulation",
    description: "Simulate campaign impact on HCP engagement",
    requiresApproval: false,
    riskLevel: "low",
    auditLevel: "standard",
  },
  {
    type: "run_counterfactual_analysis",
    category: "simulation",
    name: "Run Counterfactual Analysis",
    description: "Analyze what-if scenarios",
    requiresApproval: false,
    riskLevel: "low",
    auditLevel: "standard",
  },
  {
    type: "run_portfolio_optimization",
    category: "simulation",
    name: "Run Portfolio Optimization",
    description: "Optimize resource allocation across portfolio",
    requiresApproval: false,
    riskLevel: "low",
    auditLevel: "standard",
  },

  // Recommendation Actions
  {
    type: "generate_nbo_recommendation",
    category: "recommendation",
    name: "Generate NBO Recommendation",
    description: "Generate Next Best Orbit recommendation for HCP",
    requiresApproval: false,
    riskLevel: "low",
    auditLevel: "standard",
  },
  {
    type: "generate_nba_recommendation",
    category: "recommendation",
    name: "Generate NBA Recommendation",
    description: "Generate Next Best Action recommendation",
    requiresApproval: false,
    riskLevel: "low",
    auditLevel: "standard",
  },
  {
    type: "propose_cohort_strategy",
    category: "recommendation",
    name: "Propose Cohort Strategy",
    description: "Propose engagement strategy for HCP cohort",
    requiresApproval: true,
    riskLevel: "medium",
    maxAffectedEntities: 50,
    auditLevel: "detailed",
  },
  {
    type: "propose_budget_reallocation",
    category: "recommendation",
    name: "Propose Budget Reallocation",
    description: "Recommend budget changes across channels",
    requiresApproval: true,
    riskLevel: "high",
    auditLevel: "detailed",
  },

  // Configuration Actions (Always require approval)
  {
    type: "update_alert_thresholds",
    category: "configuration",
    name: "Update Alert Thresholds",
    description: "Modify CPI/MSI alert thresholds",
    requiresApproval: true,
    riskLevel: "medium",
    auditLevel: "detailed",
  },
  {
    type: "update_approval_rules",
    category: "configuration",
    name: "Update Approval Rules",
    description: "Modify agent approval workflow rules",
    requiresApproval: true,
    riskLevel: "high",
    auditLevel: "detailed",
  },

  // Integration Actions
  {
    type: "sync_crm_data",
    category: "integration",
    name: "Sync CRM Data",
    description: "Synchronize data with external CRM",
    requiresApproval: true,
    riskLevel: "medium",
    auditLevel: "detailed",
  },
  {
    type: "export_to_external",
    category: "integration",
    name: "Export to External System",
    description: "Export data to external analytics platform",
    requiresApproval: true,
    riskLevel: "high",
    auditLevel: "detailed",
  },
];

// ============================================================================
// EXECUTION CONTEXT & RESULT TYPES
// ============================================================================

/**
 * Context for action execution
 */
export interface ExecutionContext {
  actionId: string;
  agentId: string;
  agentRunId?: string;
  executedBy: string;            // User or "system" for auto-approved
  executionMode: "auto" | "approved" | "manual";
  startTime: Date;
}

/**
 * Result of action execution
 */
export interface ExecutionResult {
  success: boolean;
  actionId: string;
  executionTimeMs: number;
  output?: Record<string, unknown>;
  error?: string;
  auditLogId?: string;
}

/**
 * Guardrail check result
 */
export interface GuardrailCheckResult {
  passed: boolean;
  violations: string[];
  warnings: string[];
}

// ============================================================================
// AGENT EXECUTOR SERVICE
// ============================================================================

/**
 * AgentExecutor handles the execution of approved agent actions
 */
export class AgentExecutor {
  private rateLimits: Map<string, { count: number; resetAt: Date }> = new Map();

  /**
   * Get capability definition for an action type
   */
  getCapability(actionType: string): ActionCapability | undefined {
    return actionCapabilities.find(c => c.type === actionType);
  }

  /**
   * Get all capabilities for a category
   */
  getCapabilitiesByCategory(category: ActionCategory): ActionCapability[] {
    return actionCapabilities.filter(c => c.category === category);
  }

  /**
   * Check if an action can be auto-approved based on its type and scope
   */
  canAutoApprove(actionType: string, affectedEntityCount: number = 0): boolean {
    const capability = this.getCapability(actionType);
    if (!capability) return false;

    // Explicitly requires approval
    if (capability.requiresApproval) return false;

    // Check entity count threshold
    if (capability.maxAffectedEntities !== undefined &&
        affectedEntityCount > capability.maxAffectedEntities) {
      return false;
    }

    return true;
  }

  /**
   * Check rate limiting for an action type
   */
  checkRateLimit(actionType: string): { allowed: boolean; resetIn?: number } {
    const capability = this.getCapability(actionType);
    if (!capability?.rateLimitPerHour) {
      return { allowed: true };
    }

    const key = `rate_${actionType}`;
    const now = new Date();
    let state = this.rateLimits.get(key);

    if (!state || state.resetAt <= now) {
      const resetAt = new Date(now.getTime() + 60 * 60 * 1000);
      state = { count: 0, resetAt };
      this.rateLimits.set(key, state);
    }

    if (state.count >= capability.rateLimitPerHour) {
      return {
        allowed: false,
        resetIn: Math.ceil((state.resetAt.getTime() - now.getTime()) / 1000)
      };
    }

    return { allowed: true };
  }

  /**
   * Increment rate limit counter
   */
  private incrementRateLimit(actionType: string): void {
    const key = `rate_${actionType}`;
    const state = this.rateLimits.get(key);
    if (state) {
      state.count++;
    }
  }

  /**
   * Validate action against compliance guardrails
   */
  async checkGuardrails(action: AgentAction): Promise<GuardrailCheckResult> {
    const violations: string[] = [];
    const warnings: string[] = [];

    // PHI check - never export PHI without explicit authorization
    if (action.actionType === "export_bulk_data" || action.actionType === "export_to_external") {
      const payload = action.proposedAction?.payload as Record<string, unknown> | undefined;
      if (payload?.includePhi === true) {
        violations.push("PHI export requires explicit authorization from Privacy Officer");
      }
    }

    // Contact limit check for recommendations affecting HCPs
    if (action.actionType.includes("recommendation") && action.affectedEntityCount) {
      if (action.affectedEntityCount > 100) {
        warnings.push(`Action affects ${action.affectedEntityCount} HCPs - consider breaking into smaller batches`);
      }
    }

    // High-risk action warnings
    const capability = this.getCapability(action.actionType);
    if (capability?.riskLevel === "high") {
      warnings.push("This is a high-risk action - execution will be logged in detail");
    }

    // Budget/financial action check
    if (action.actionType === "propose_budget_reallocation") {
      warnings.push("Budget changes require manager approval and will be audited");
    }

    return {
      passed: violations.length === 0,
      violations,
      warnings,
    };
  }

  /**
   * Execute an approved action
   */
  async execute(action: AgentAction, executedBy: string): Promise<ExecutionResult> {
    const startTime = new Date();
    const context: ExecutionContext = {
      actionId: action.id,
      agentId: action.agentId,
      agentRunId: action.agentRunId ?? undefined,
      executedBy,
      executionMode: action.status === "auto_approved" ? "auto" : "approved",
      startTime,
    };

    // Pre-execution checks
    const capability = this.getCapability(action.actionType);
    if (!capability) {
      return this.createErrorResult(context, `Unknown action type: ${action.actionType}`);
    }

    // Rate limit check
    const rateCheck = this.checkRateLimit(action.actionType);
    if (!rateCheck.allowed) {
      return this.createErrorResult(
        context,
        `Rate limit exceeded for ${action.actionType}. Try again in ${rateCheck.resetIn} seconds.`
      );
    }

    // Guardrail check
    const guardrailCheck = await this.checkGuardrails(action);
    if (!guardrailCheck.passed) {
      return this.createErrorResult(
        context,
        `Guardrail violations: ${guardrailCheck.violations.join("; ")}`
      );
    }

    // Log warnings
    if (guardrailCheck.warnings.length > 0) {
      console.log(`[AgentExecutor] Warnings for action ${action.id}:`, guardrailCheck.warnings);
    }

    try {
      // Execute the action based on type
      const output = await this.executeAction(action, context);

      // Update rate limit counter
      this.incrementRateLimit(action.actionType);

      // Mark action as executed
      await storage.executeAgentAction(action.id, {
        success: true,
        responseData: output,
        executionTimeMs: new Date().getTime() - startTime.getTime(),
      });

      // Create audit log
      const auditLogId = await this.createAuditLog(context, capability, output);

      const endTime = new Date();
      return {
        success: true,
        actionId: action.id,
        executionTimeMs: endTime.getTime() - startTime.getTime(),
        output,
        auditLogId,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return this.createErrorResult(context, errorMessage);
    }
  }

  /**
   * Execute specific action type
   */
  private async executeAction(
    action: AgentAction,
    _context: ExecutionContext
  ): Promise<Record<string, unknown>> {
    const payload = action.proposedAction?.payload as Record<string, unknown> | undefined;

    switch (action.actionType) {
      // Query actions
      case "query_hcp_profile":
        return this.executeQueryHcpProfile(payload);
      case "query_engagement_metrics":
        return this.executeQueryEngagementMetrics(payload);
      case "query_competitive_data":
        return this.executeQueryCompetitiveData(payload);
      case "query_cohort_analysis":
        return this.executeQueryCohortAnalysis(payload);

      // Report actions
      case "generate_hcp_report":
        return this.executeGenerateHcpReport(payload);
      case "generate_territory_report":
        return this.executeGenerateTerritoryReport(payload);
      case "generate_competitive_report":
        return this.executeGenerateCompetitiveReport(payload);

      // Simulation actions
      case "run_engagement_simulation":
        return this.executeRunSimulation(payload);
      case "run_counterfactual_analysis":
        return this.executeRunCounterfactual(payload);

      // Recommendation actions
      case "generate_nbo_recommendation":
        return this.executeGenerateNboRecommendation(payload);
      case "generate_nba_recommendation":
        return this.executeGenerateNbaRecommendation(payload);

      // Notification actions (stubs - would integrate with actual services)
      case "send_slack_alert":
        return this.executeSendSlackAlert(payload);
      case "create_jira_ticket":
        return this.executeCreateJiraTicket(payload);

      default:
        return {
          status: "executed",
          message: `Action ${action.actionType} executed (stub implementation)`,
          actionId: action.id,
          timestamp: new Date().toISOString(),
        };
    }
  }

  // ============================================================================
  // ACTION IMPLEMENTATIONS
  // ============================================================================

  private async executeQueryHcpProfile(payload?: Record<string, unknown>): Promise<Record<string, unknown>> {
    const hcpId = payload?.hcpId as string | undefined;
    const npi = payload?.npi as string | undefined;

    if (hcpId) {
      const hcp = await storage.getHcpById(hcpId);
      return { hcp, found: !!hcp };
    }
    if (npi) {
      const hcp = await storage.getHcpByNpi(npi);
      return { hcp, found: !!hcp };
    }

    return { error: "Either hcpId or npi required" };
  }

  private async executeQueryEngagementMetrics(payload?: Record<string, unknown>): Promise<Record<string, unknown>> {
    const hcpIds = payload?.hcpIds as string[] | undefined;
    const specialties = payload?.specialties as string[] | undefined;

    if (hcpIds && hcpIds.length > 0) {
      const hcps = await Promise.all(hcpIds.map(id => storage.getHcpById(id)));
      const validHcps = hcps.filter(h => h !== undefined);
      const metrics = validHcps.map(hcp => ({
        hcpId: hcp.id,
        overallEngagementScore: hcp.overallEngagementScore,
        tier: hcp.tier,
        segment: hcp.segment,
      }));
      return { metrics, count: metrics.length };
    }

    if (specialties && specialties.length > 0) {
      const hcps = await storage.filterHcps({ specialties: specialties as never });
      const metrics = hcps.map(hcp => ({
        hcpId: hcp.id,
        overallEngagementScore: hcp.overallEngagementScore,
        tier: hcp.tier,
        segment: hcp.segment,
      }));
      return { metrics, count: metrics.length, specialties };
    }

    return { error: "Either hcpIds or specialties required" };
  }

  private async executeQueryCompetitiveData(payload?: Record<string, unknown>): Promise<Record<string, unknown>> {
    const hcpId = payload?.hcpId as string | undefined;
    const therapeuticArea = payload?.therapeuticArea as string | undefined;

    const results: Record<string, unknown> = {};

    if (hcpId) {
      const signals = await competitiveStorage.getCompetitiveSignalsForHcp(hcpId);
      results.signals = signals;
      results.signalCount = signals.length;
    }

    if (therapeuticArea) {
      const competitors = await competitiveStorage.getCompetitorsByTherapeuticArea(therapeuticArea);
      results.competitors = competitors;
      results.competitorCount = competitors.length;
    }

    // Get overall orbit data
    const orbitData = await competitiveStorage.getCompetitiveOrbitData();
    results.orbitSummary = {
      competitorCount: orbitData.competitors.length,
      avgCpi: orbitData.summary.avgOverallCpi,
      totalHcpsUnderPressure: orbitData.summary.totalHcpsUnderPressure,
    };

    return results;
  }

  private async executeQueryCohortAnalysis(payload?: Record<string, unknown>): Promise<Record<string, unknown>> {
    const specialties = payload?.specialties as string[] | undefined;
    const tiers = payload?.tiers as string[] | undefined;
    const segments = payload?.segments as string[] | undefined;

    const hcps = await storage.filterHcps({
      specialties: specialties as never,
      tiers: tiers as never,
      segments: segments as never,
    });

    // Calculate cohort metrics
    const engagementScores = hcps.map(h => h.overallEngagementScore ?? 0);
    const avgEngagement = engagementScores.length > 0
      ? engagementScores.reduce((a, b) => a + b, 0) / engagementScores.length
      : 0;

    const specialtyBreakdown: Record<string, number> = {};
    hcps.forEach(h => {
      if (h.specialty) {
        specialtyBreakdown[h.specialty] = (specialtyBreakdown[h.specialty] || 0) + 1;
      }
    });

    return {
      cohortSize: hcps.length,
      avgEngagement: parseFloat(avgEngagement.toFixed(2)),
      specialtyBreakdown,
      criteria: { specialties, tiers, segments },
    };
  }

  private async executeGenerateHcpReport(payload?: Record<string, unknown>): Promise<Record<string, unknown>> {
    const hcpIds = payload?.hcpIds as string[] | undefined;
    if (!hcpIds || hcpIds.length === 0) {
      return { error: "hcpIds required" };
    }

    const hcps = await Promise.all(hcpIds.map(id => storage.getHcpById(id)));
    const validHcps = hcps.filter(h => h !== undefined);

    const report = {
      generatedAt: new Date().toISOString(),
      hcpCount: validHcps.length,
      profiles: validHcps.map(hcp => ({
        id: hcp.id,
        npi: hcp.npi,
        name: `${hcp.firstName} ${hcp.lastName}`,
        specialty: hcp.specialty,
        overallEngagementScore: hcp.overallEngagementScore,
        tier: hcp.tier,
        segment: hcp.segment,
      })),
    };

    return { report, format: "json" };
  }

  private async executeGenerateTerritoryReport(payload?: Record<string, unknown>): Promise<Record<string, unknown>> {
    const states = payload?.states as string[] | undefined;

    const hcps = await storage.filterHcps({ states });

    const report = {
      generatedAt: new Date().toISOString(),
      states: states || ["All"],
      hcpCount: hcps.length,
      avgEngagement: hcps.length > 0
        ? hcps.reduce((sum, h) => sum + (h.overallEngagementScore ?? 0), 0) / hcps.length
        : 0,
      tierBreakdown: {} as Record<string, number>,
    };

    hcps.forEach(h => {
      if (h.tier) {
        report.tierBreakdown[h.tier] = (report.tierBreakdown[h.tier] || 0) + 1;
      }
    });

    return { report };
  }

  private async executeGenerateCompetitiveReport(payload?: Record<string, unknown>): Promise<Record<string, unknown>> {
    const therapeuticArea = payload?.therapeuticArea as string | undefined;

    const orbitData = therapeuticArea
      ? await competitiveStorage.getCompetitiveOrbitDataByTA(therapeuticArea)
      : await competitiveStorage.getCompetitiveOrbitData();

    const report = {
      generatedAt: new Date().toISOString(),
      therapeuticArea: therapeuticArea || "All",
      competitorCount: orbitData.competitors.length,
      competitors: orbitData.competitors.map(c => ({
        name: c.name,
        avgCpi: c.avgCpi,
        affectedHcpCount: c.affectedHcpCount,
        marketShare: c.marketShare,
      })),
      summary: orbitData.summary,
    };

    return { report };
  }

  private async executeRunSimulation(payload?: Record<string, unknown>): Promise<Record<string, unknown>> {
    const hcpId = payload?.hcpId as string | undefined;
    const stimuli = payload?.stimuli as Array<{
      type?: string;
      channel?: string;
    }> | undefined;

    if (hcpId && stimuli) {
      const hcp = await storage.getHcpById(hcpId);
      if (!hcp) return { error: "HCP not found" };

      // Import and use prediction engine
      const { predictStimuliImpact } = await import("../prediction-engine");

      // Run simulation with stimuli - requires stimulusType and channel
      const predictions = stimuli.map(s => {
        const stimulusType = (s.type || "email_send") as Parameters<typeof predictStimuliImpact>[1];
        const channel = (s.channel || "email") as Parameters<typeof predictStimuliImpact>[2];
        return {
          stimulus: s,
          impact: predictStimuliImpact(hcp, stimulusType, channel),
        };
      });

      return {
        hcpId,
        currentEngagement: hcp.overallEngagementScore,
        simulations: predictions,
      };
    }

    return { error: "hcpId and stimuli required for simulation" };
  }

  private async executeRunCounterfactual(payload?: Record<string, unknown>): Promise<Record<string, unknown>> {
    const hcpId = payload?.hcpId as string | undefined;
    const scenario = payload?.scenario as Record<string, unknown> | undefined;

    if (!hcpId || !scenario) {
      return { error: "hcpId and scenario required" };
    }

    const hcp = await storage.getHcpById(hcpId);
    if (!hcp) return { error: "HCP not found" };

    // Simplified counterfactual analysis
    return {
      hcpId,
      scenario,
      currentState: {
        overallEngagementScore: hcp.overallEngagementScore,
        tier: hcp.tier,
      },
      counterfactual: {
        message: "Counterfactual analysis completed",
        // Real implementation would use the composable simulation engine
      },
    };
  }

  private async executeGenerateNboRecommendation(payload?: Record<string, unknown>): Promise<Record<string, unknown>> {
    const hcpId = payload?.hcpId as string | undefined;
    if (!hcpId) return { error: "hcpId required" };

    const hcp = await storage.getHcpById(hcpId);
    if (!hcp) return { error: "HCP not found" };

    // Import NBO engine function
    const { generateNBORecommendation } = await import("../next-best-orbit-engine");

    // Get competitive data for the HCP (may be undefined if no data exists)
    const competitiveSummary = await competitiveStorage.getHcpCompetitiveSummary(hcpId) ?? null;

    const recommendation = generateNBORecommendation({
      hcp,
      saturationSummary: null,  // Would be fetched from message saturation storage
      competitiveSummary,
    });

    return {
      hcpId,
      recommendation: {
        actionType: recommendation.actionType,
        urgency: recommendation.urgency,
        confidence: recommendation.confidence,
        rationale: recommendation.rationale,
        recommendedChannel: recommendation.recommendedChannel,
        keyFactors: recommendation.keyFactors,
      },
    };
  }

  private async executeGenerateNbaRecommendation(payload?: Record<string, unknown>): Promise<Record<string, unknown>> {
    const hcpId = payload?.hcpId as string | undefined;
    if (!hcpId) return { error: "hcpId required" };

    const hcp = await storage.getHcpById(hcpId);
    if (!hcp) return { error: "HCP not found" };

    // Import NBA engine function
    const { generateNBA } = await import("../nba-engine");

    const nba = generateNBA(hcp);

    return {
      hcpId,
      recommendation: nba,
    };
  }

  private async executeSendSlackAlert(payload?: Record<string, unknown>): Promise<Record<string, unknown>> {
    const channel = payload?.channel as string | undefined;
    const message = payload?.message as string | undefined;

    if (!channel || !message) {
      return { error: "channel and message required" };
    }

    // Stub - would integrate with Slack integration service
    return {
      status: "queued",
      channel,
      messagePreview: message.substring(0, 100),
      timestamp: new Date().toISOString(),
    };
  }

  private async executeCreateJiraTicket(payload?: Record<string, unknown>): Promise<Record<string, unknown>> {
    const project = payload?.project as string | undefined;
    const summary = payload?.summary as string | undefined;
    const description = payload?.description as string | undefined;

    if (!project || !summary) {
      return { error: "project and summary required" };
    }

    // Stub - would integrate with Jira integration service
    return {
      status: "queued",
      project,
      summary,
      description: description?.substring(0, 100),
      timestamp: new Date().toISOString(),
    };
  }

  // ============================================================================
  // AUDIT LOGGING
  // ============================================================================

  private async createAuditLog(
    context: ExecutionContext,
    capability: ActionCapability,
    output: Record<string, unknown>
  ): Promise<string | undefined> {
    try {
      const auditEntry: InsertAuditLog = {
        userId: context.executedBy === "system" ? undefined : context.executedBy,
        action: `agent_action_executed:${capability.type}`,
        entityType: "agent_action",
        entityId: context.actionId,
        details: {
          agentId: context.agentId,
          agentRunId: context.agentRunId,
          actionType: capability.type,
          category: capability.category,
          riskLevel: capability.riskLevel,
          executionMode: context.executionMode,
          outputSummary: capability.auditLevel === "detailed" ? output : { status: "executed" },
        },
      };

      await storage.logAction(auditEntry);
      // Return a generated ID since logAction doesn't return the log
      return `audit-${context.actionId}-${Date.now()}`;
    } catch (error) {
      console.error("[AgentExecutor] Failed to create audit log:", error);
      return undefined;
    }
  }

  private createErrorResult(context: ExecutionContext, error: string): ExecutionResult {
    const endTime = new Date();
    return {
      success: false,
      actionId: context.actionId,
      executionTimeMs: endTime.getTime() - context.startTime.getTime(),
      error,
    };
  }
}

// Export singleton instance
export const agentExecutor = new AgentExecutor();
