/**
 * Orchestrator Agent
 *
 * Phase 6E: Agent Coordination & Approval Workflow
 *
 * This agent:
 * - Coordinates execution of other agents
 * - Evaluates proposed actions against approval rules
 * - Auto-approves low-risk actions based on configurable rules
 * - Queues high-risk actions for human review
 * - Processes batch actions
 * - Manages agent execution pipelines
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
  AgentRegistry,
} from "./base-agent";
import { storage } from "../../storage";
import type { AgentAction, AgentRun, InsertAgentAction } from "@shared/schema";

// Approval rule types
export type ApprovalRuleType =
  | "auto_approve"
  | "require_review"
  | "escalate"
  | "reject";

// Approval rule condition
export interface ApprovalCondition {
  field: "riskLevel" | "impactScope" | "confidence" | "actionType" | "affectedEntityCount";
  operator: "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "in" | "not_in";
  value: string | number | string[] | number[];
}

// Approval rule definition
export interface ApprovalRule {
  id: string;
  name: string;
  description: string;
  priority: number; // Lower = higher priority
  conditions: ApprovalCondition[];
  action: ApprovalRuleType;
  notifyOnMatch?: string[]; // Slack channels or user IDs
  requiresReviewBy?: string[]; // Required reviewer roles/IDs
  maxAutoApprovePerHour?: number;
  enabled: boolean;
}

// Default approval rules
export const defaultApprovalRules: ApprovalRule[] = [
  {
    id: "rule-auto-approve-low-risk",
    name: "Auto-approve Low Risk Actions",
    description: "Automatically approve actions with low risk and high confidence",
    priority: 1,
    conditions: [
      { field: "riskLevel", operator: "eq", value: "low" },
      { field: "confidence", operator: "gte", value: 0.8 },
    ],
    action: "auto_approve",
    maxAutoApprovePerHour: 50,
    enabled: true,
  },
  {
    id: "rule-auto-approve-notifications",
    name: "Auto-approve Notifications",
    description: "Automatically approve Slack notifications",
    priority: 2,
    conditions: [
      { field: "actionType", operator: "eq", value: "send_slack" },
      { field: "riskLevel", operator: "in", value: ["low", "medium"] },
    ],
    action: "auto_approve",
    maxAutoApprovePerHour: 100,
    enabled: true,
  },
  {
    id: "rule-review-medium-risk",
    name: "Review Medium Risk Actions",
    description: "Require review for medium risk actions",
    priority: 3,
    conditions: [
      { field: "riskLevel", operator: "eq", value: "medium" },
    ],
    action: "require_review",
    enabled: true,
  },
  {
    id: "rule-escalate-high-impact",
    name: "Escalate High Impact Actions",
    description: "Escalate actions affecting many entities",
    priority: 4,
    conditions: [
      { field: "affectedEntityCount", operator: "gte", value: 100 },
    ],
    action: "escalate",
    notifyOnMatch: ["#agent-escalations"],
    enabled: true,
  },
  {
    id: "rule-review-high-risk",
    name: "Review High Risk Actions",
    description: "Always require review for high risk actions",
    priority: 5,
    conditions: [
      { field: "riskLevel", operator: "eq", value: "high" },
    ],
    action: "require_review",
    requiresReviewBy: ["admin", "manager"],
    enabled: true,
  },
  {
    id: "rule-reject-portfolio-wide",
    name: "Reject Unreviewed Portfolio Actions",
    description: "Reject portfolio-wide actions without explicit approval",
    priority: 6,
    conditions: [
      { field: "impactScope", operator: "eq", value: "portfolio" },
      { field: "riskLevel", operator: "eq", value: "high" },
    ],
    action: "reject",
    enabled: false, // Disabled by default - can be enabled for stricter governance
  },
];

// Orchestrator input configuration
export interface OrchestratorInput extends AgentInput {
  // Which agents to run in this orchestration cycle
  agentsToRun?: AgentType[];
  // Whether to process pending actions
  processPendingActions?: boolean;
  // Whether to run approval workflow
  runApprovalWorkflow?: boolean;
  // Custom approval rules (override defaults)
  customApprovalRules?: ApprovalRule[];
  // Max actions to process in this run
  maxActionsToProcess?: number;
  // Whether to send notifications for approvals
  sendNotifications?: boolean;
}

// Action evaluation result
export interface ActionEvaluationResult {
  actionId: string;
  matchedRule: ApprovalRule | null;
  decision: ApprovalRuleType;
  reasoning: string;
  autoApproved: boolean;
  requiresReview: boolean;
  escalated: boolean;
  rejected: boolean;
}

// Orchestration result
export interface OrchestrationResult {
  agentsRun: {
    agentType: AgentType;
    runId: string;
    status: string;
    actionsProposed: number;
  }[];
  actionsEvaluated: ActionEvaluationResult[];
  actionsAutoApproved: number;
  actionsQueued: number;
  actionsEscalated: number;
  actionsRejected: number;
}

/**
 * Orchestrator Agent
 */
export class OrchestratorAgent extends BaseAgent<OrchestratorInput> {
  readonly type: AgentType = "alert_manager"; // Using alert_manager as orchestrator type
  readonly name = "Orchestrator";
  readonly description =
    "Coordinates agent execution and manages the approval workflow for proposed actions.";
  readonly version = "1.0.0";

  private approvalRules: ApprovalRule[] = defaultApprovalRules;
  private autoApproveCount: Map<string, { count: number; resetAt: Date }> = new Map();

  getDefaultInput(): Partial<OrchestratorInput> {
    return {
      processPendingActions: true,
      runApprovalWorkflow: true,
      maxActionsToProcess: 100,
      sendNotifications: true,
    };
  }

  getInputSchema(): Record<string, { type: string; required: boolean; description: string }> {
    return {
      agentsToRun: {
        type: "array",
        required: false,
        description: "List of agent types to run in this orchestration cycle",
      },
      processPendingActions: {
        type: "boolean",
        required: false,
        description: "Whether to process pending actions in the queue",
      },
      runApprovalWorkflow: {
        type: "boolean",
        required: false,
        description: "Whether to run the approval workflow",
      },
      customApprovalRules: {
        type: "array",
        required: false,
        description: "Custom approval rules to use instead of defaults",
      },
      maxActionsToProcess: {
        type: "number",
        required: false,
        description: "Maximum number of actions to process in this run",
      },
      sendNotifications: {
        type: "boolean",
        required: false,
        description: "Whether to send notifications for approvals/escalations",
      },
    };
  }

  validate(input: OrchestratorInput): { valid: boolean; errors?: string[] } {
    const errors: string[] = [];

    if (input.maxActionsToProcess !== undefined && input.maxActionsToProcess < 1) {
      errors.push("maxActionsToProcess must be >= 1");
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Set custom approval rules
   */
  setApprovalRules(rules: ApprovalRule[]): void {
    this.approvalRules = rules;
  }

  /**
   * Get current approval rules
   */
  getApprovalRules(): ApprovalRule[] {
    return this.approvalRules;
  }

  /**
   * Execute the orchestration logic
   */
  async execute(
    input: OrchestratorInput,
    context: AgentContext
  ): Promise<AgentOutput> {
    this.logger.info("Starting orchestration", {
      agentsToRun: input.agentsToRun,
      processPendingActions: input.processPendingActions,
      runApprovalWorkflow: input.runApprovalWorkflow,
    });

    const result: OrchestrationResult = {
      agentsRun: [],
      actionsEvaluated: [],
      actionsAutoApproved: 0,
      actionsQueued: 0,
      actionsEscalated: 0,
      actionsRejected: 0,
    };

    // Use custom rules if provided
    if (input.customApprovalRules) {
      this.approvalRules = input.customApprovalRules;
    }

    // Step 1: Run specified agents
    if (input.agentsToRun && input.agentsToRun.length > 0) {
      for (const agentType of input.agentsToRun) {
        const agentResult = await this.runAgent(agentType);
        if (agentResult) {
          result.agentsRun.push(agentResult);
        }
      }
    }

    // Step 2: Process pending actions through approval workflow
    if (input.processPendingActions && input.runApprovalWorkflow) {
      const pendingActions = await storage.getPendingAgentActions();
      const actionsToProcess = pendingActions.slice(0, input.maxActionsToProcess || 100);

      this.logger.info(`Processing ${actionsToProcess.length} pending actions`);

      for (const action of actionsToProcess) {
        const evaluation = await this.evaluateAction(action);
        result.actionsEvaluated.push(evaluation);

        if (evaluation.autoApproved) {
          result.actionsAutoApproved++;
        } else if (evaluation.escalated) {
          result.actionsEscalated++;
        } else if (evaluation.rejected) {
          result.actionsRejected++;
        } else if (evaluation.requiresReview) {
          result.actionsQueued++;
        }
      }
    }

    // Generate insights
    const insights = this.generateInsights(result);

    // Generate alerts for escalations
    const alerts = this.generateAlerts(result);

    const summary = this.generateSummary(result);

    this.logger.info("Orchestration completed", {
      agentsRun: result.agentsRun.length,
      actionsEvaluated: result.actionsEvaluated.length,
      autoApproved: result.actionsAutoApproved,
      queued: result.actionsQueued,
      escalated: result.actionsEscalated,
      rejected: result.actionsRejected,
    });

    return {
      success: true,
      summary,
      insights,
      alerts,
      metrics: {
        agentsRun: result.agentsRun.length,
        actionsEvaluated: result.actionsEvaluated.length,
        actionsAutoApproved: result.actionsAutoApproved,
        actionsQueued: result.actionsQueued,
        actionsEscalated: result.actionsEscalated,
        actionsRejected: result.actionsRejected,
      },
    };
  }

  /**
   * Run a specific agent
   */
  private async runAgent(agentType: AgentType): Promise<OrchestrationResult["agentsRun"][0] | null> {
    const registry = AgentRegistry.getInstance();
    const agent = registry.get(agentType);

    if (!agent) {
      this.logger.warn(`Agent not found: ${agentType}`);
      return null;
    }

    try {
      // Load data for specific agents
      if (agentType === "channel_health_monitor") {
        const { channelHealthMonitor } = await import("./channel-health-monitor");
        const hcps = await storage.getAllHcps();
        channelHealthMonitor.setHcpData(hcps);
      } else if (agentType === "insight_synthesizer") {
        const { insightSynthesizer } = await import("./insight-synthesizer");
        const [hcps, recentAlerts, recentAgentRuns] = await Promise.all([
          storage.getAllHcps(),
          storage.listAlerts(undefined, 100),
          storage.listAgentRuns(undefined, 50),
        ]);
        const recentSimulations = await storage.getSimulationHistory();
        insightSynthesizer.setData({
          hcps,
          recentAlerts,
          recentAgentRuns,
          recentSimulations: recentSimulations.slice(0, 20),
        });
      }

      const input = agent.getDefaultInput();
      const result = await agent.run(input, "orchestrator", "on_demand");

      // Store the run
      await storage.createAgentRun({
        agentId: result.runId,
        agentType: agent.type,
        agentVersion: agent.version,
        triggerType: "on_demand",
        triggeredBy: "orchestrator",
        inputs: input,
        outputs: {
          alerts: result.output.alerts?.map((a, idx) => ({
            id: `alert-${result.runId}-${idx}`,
            severity: a.severity,
            title: a.title,
            message: a.message,
          })),
          recommendations: result.output.insights?.map((i, idx) => ({
            id: `insight-${result.runId}-${idx}`,
            type: i.type,
            description: i.description,
            confidence: 0.8,
          })),
          metrics: result.output.metrics,
          raw: { summary: result.output.summary },
        },
        status: result.status,
        startedAt: new Date(Date.now() - result.duration),
        completedAt: new Date(),
        executionTimeMs: result.duration,
        actionsProposed: result.output.proposedActions?.length || 0,
        errorMessage: result.output.error,
      });

      // Store proposed actions
      if (result.output.proposedActions) {
        for (const proposedAction of result.output.proposedActions) {
          await storage.createAgentAction({
            agentId: `agent-${agent.type}`,
            agentRunId: result.runId,
            agentType: agent.type,
            actionType: proposedAction.actionType,
            actionName: proposedAction.actionName,
            proposedAction: {
              payload: proposedAction.payload,
              destination: {
                type: proposedAction.actionType,
                integrationId: "default",
              },
            },
            reasoning: proposedAction.reasoning,
            confidence: proposedAction.confidence,
            riskLevel: proposedAction.riskLevel,
            impactScope: proposedAction.impactScope,
            affectedEntityCount: proposedAction.affectedEntityCount,
            status: proposedAction.requiresApproval ? "pending" : "auto_approved",
          });
        }
      }

      return {
        agentType,
        runId: result.runId,
        status: result.status,
        actionsProposed: result.output.proposedActions?.length || 0,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to run agent ${agentType}:`, { error: errorMessage });
      return null;
    }
  }

  /**
   * Evaluate an action against approval rules
   */
  private async evaluateAction(action: AgentAction): Promise<ActionEvaluationResult> {
    const enabledRules = this.approvalRules
      .filter((r) => r.enabled)
      .sort((a, b) => a.priority - b.priority);

    let matchedRule: ApprovalRule | null = null;
    let decision: ApprovalRuleType = "require_review"; // Default decision

    for (const rule of enabledRules) {
      if (this.matchesRule(action, rule)) {
        matchedRule = rule;
        decision = rule.action;
        break;
      }
    }

    const result: ActionEvaluationResult = {
      actionId: action.id,
      matchedRule,
      decision,
      reasoning: matchedRule
        ? `Matched rule: ${matchedRule.name}`
        : "No matching rule - defaulting to require review",
      autoApproved: false,
      requiresReview: false,
      escalated: false,
      rejected: false,
    };

    // Apply the decision
    switch (decision) {
      case "auto_approve":
        if (this.canAutoApprove(matchedRule!)) {
          await storage.approveAgentAction(action.id, "orchestrator");
          result.autoApproved = true;
          result.reasoning += " - Auto-approved";
          this.incrementAutoApproveCount(matchedRule!.id);
        } else {
          result.requiresReview = true;
          result.reasoning += " - Auto-approve limit reached, queued for review";
        }
        break;

      case "require_review":
        result.requiresReview = true;
        // Action stays in pending status
        break;

      case "escalate":
        result.escalated = true;
        result.requiresReview = true;
        // TODO: Send escalation notification
        break;

      case "reject":
        await storage.rejectAgentAction(action.id, "orchestrator", result.reasoning);
        result.rejected = true;
        break;
    }

    return result;
  }

  /**
   * Check if an action matches a rule
   */
  private matchesRule(action: AgentAction, rule: ApprovalRule): boolean {
    return rule.conditions.every((condition) => {
      const fieldValue = this.getActionFieldValue(action, condition.field);
      return this.evaluateCondition(fieldValue, condition.operator, condition.value);
    });
  }

  /**
   * Get field value from action for condition evaluation
   */
  private getActionFieldValue(
    action: AgentAction,
    field: ApprovalCondition["field"]
  ): string | number | undefined {
    switch (field) {
      case "riskLevel":
        return action.riskLevel ?? undefined;
      case "impactScope":
        return action.impactScope ?? undefined;
      case "confidence":
        return action.confidence ?? undefined;
      case "actionType":
        return action.actionType;
      case "affectedEntityCount":
        return action.affectedEntityCount ?? undefined;
      default:
        return undefined;
    }
  }

  /**
   * Evaluate a condition
   */
  private evaluateCondition(
    fieldValue: string | number | undefined,
    operator: ApprovalCondition["operator"],
    conditionValue: ApprovalCondition["value"]
  ): boolean {
    if (fieldValue === undefined) return false;

    switch (operator) {
      case "eq":
        return fieldValue === conditionValue;
      case "neq":
        return fieldValue !== conditionValue;
      case "gt":
        return typeof fieldValue === "number" && fieldValue > (conditionValue as number);
      case "gte":
        return typeof fieldValue === "number" && fieldValue >= (conditionValue as number);
      case "lt":
        return typeof fieldValue === "number" && fieldValue < (conditionValue as number);
      case "lte":
        return typeof fieldValue === "number" && fieldValue <= (conditionValue as number);
      case "in":
        return Array.isArray(conditionValue) && conditionValue.includes(fieldValue as never);
      case "not_in":
        return Array.isArray(conditionValue) && !conditionValue.includes(fieldValue as never);
      default:
        return false;
    }
  }

  /**
   * Check if we can auto-approve based on rate limits
   */
  private canAutoApprove(rule: ApprovalRule): boolean {
    if (!rule.maxAutoApprovePerHour) return true;

    const now = new Date();
    const ruleState = this.autoApproveCount.get(rule.id);

    if (!ruleState || ruleState.resetAt <= now) {
      // Reset the counter
      const resetAt = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
      this.autoApproveCount.set(rule.id, { count: 0, resetAt });
      return true;
    }

    return ruleState.count < rule.maxAutoApprovePerHour;
  }

  /**
   * Increment auto-approve count for a rule
   */
  private incrementAutoApproveCount(ruleId: string): void {
    const ruleState = this.autoApproveCount.get(ruleId);
    if (ruleState) {
      ruleState.count++;
    }
  }

  /**
   * Generate insights from orchestration result
   */
  private generateInsights(result: OrchestrationResult): AgentInsight[] {
    const insights: AgentInsight[] = [];

    // Summary insight
    insights.push({
      type: "orchestration_summary",
      title: "Orchestration Cycle Complete",
      description: `Ran ${result.agentsRun.length} agents, evaluated ${result.actionsEvaluated.length} actions.`,
      severity: "info",
      metrics: {
        agentsRun: result.agentsRun.length,
        actionsEvaluated: result.actionsEvaluated.length,
        autoApproved: result.actionsAutoApproved,
        queued: result.actionsQueued,
      },
    });

    // Agent run insights
    for (const agentRun of result.agentsRun) {
      insights.push({
        type: "agent_run",
        title: `${agentRun.agentType} Run Complete`,
        description: `Agent completed with status: ${agentRun.status}. Proposed ${agentRun.actionsProposed} actions.`,
        severity: agentRun.status === "completed" ? "info" : "warning",
        metrics: {
          status: agentRun.status,
          actionsProposed: agentRun.actionsProposed,
        },
      });
    }

    // Auto-approval insight
    if (result.actionsAutoApproved > 0) {
      insights.push({
        type: "auto_approval",
        title: "Actions Auto-Approved",
        description: `${result.actionsAutoApproved} low-risk actions were automatically approved.`,
        severity: "info",
        metrics: {
          count: result.actionsAutoApproved,
        },
      });
    }

    // Escalation insight
    if (result.actionsEscalated > 0) {
      insights.push({
        type: "escalation",
        title: "Actions Escalated",
        description: `${result.actionsEscalated} high-impact actions require escalated review.`,
        severity: "warning",
        metrics: {
          count: result.actionsEscalated,
        },
        recommendation: "Review escalated actions in the approval queue.",
      });
    }

    return insights;
  }

  /**
   * Generate alerts for escalations and rejections
   */
  private generateAlerts(result: OrchestrationResult): AgentAlert[] {
    const alerts: AgentAlert[] = [];

    // Alert for escalations
    if (result.actionsEscalated > 0) {
      const escalatedActions = result.actionsEvaluated.filter((e) => e.escalated);
      alerts.push({
        severity: "warning",
        title: "Actions Require Escalated Review",
        message: `${result.actionsEscalated} high-impact actions have been escalated for review.`,
        suggestedActions: [
          {
            type: "view_queue",
            label: "View Approval Queue",
            payload: { filter: "escalated" },
          },
        ],
      });
    }

    // Alert for rejections
    if (result.actionsRejected > 0) {
      alerts.push({
        severity: "info",
        title: "Actions Automatically Rejected",
        message: `${result.actionsRejected} actions were rejected based on approval rules.`,
        suggestedActions: [
          {
            type: "view_rejected",
            label: "View Rejected Actions",
            payload: { filter: "rejected" },
          },
        ],
      });
    }

    // Alert for pending review queue growth
    if (result.actionsQueued > 10) {
      alerts.push({
        severity: "info",
        title: "Large Approval Queue",
        message: `${result.actionsQueued} actions are pending review. Consider reviewing the approval queue.`,
        suggestedActions: [
          {
            type: "view_queue",
            label: "Review Pending Actions",
            payload: { filter: "pending" },
          },
        ],
      });
    }

    return alerts;
  }

  /**
   * Generate summary text
   */
  private generateSummary(result: OrchestrationResult): string {
    const parts = [`Orchestration complete.`];

    if (result.agentsRun.length > 0) {
      parts.push(`Ran ${result.agentsRun.length} agent(s).`);
    }

    if (result.actionsEvaluated.length > 0) {
      parts.push(`Evaluated ${result.actionsEvaluated.length} action(s).`);
    }

    if (result.actionsAutoApproved > 0) {
      parts.push(`Auto-approved: ${result.actionsAutoApproved}.`);
    }

    if (result.actionsQueued > 0) {
      parts.push(`Queued for review: ${result.actionsQueued}.`);
    }

    if (result.actionsEscalated > 0) {
      parts.push(`Escalated: ${result.actionsEscalated}.`);
    }

    if (result.actionsRejected > 0) {
      parts.push(`Rejected: ${result.actionsRejected}.`);
    }

    return parts.join(" ");
  }
}

// Export singleton instance
export const orchestrator = new OrchestratorAgent();

/**
 * Approval Workflow Service
 *
 * Standalone service for managing the approval workflow outside of orchestrator runs.
 */
export class ApprovalWorkflowService {
  private rules: ApprovalRule[] = defaultApprovalRules;

  constructor(customRules?: ApprovalRule[]) {
    if (customRules) {
      this.rules = customRules;
    }
  }

  /**
   * Set approval rules
   */
  setRules(rules: ApprovalRule[]): void {
    this.rules = rules;
  }

  /**
   * Get approval rules
   */
  getRules(): ApprovalRule[] {
    return this.rules;
  }

  /**
   * Get enabled rules sorted by priority
   */
  getEnabledRules(): ApprovalRule[] {
    return this.rules
      .filter((r) => r.enabled)
      .sort((a, b) => a.priority - b.priority);
  }

  /**
   * Add a new rule
   */
  addRule(rule: ApprovalRule): void {
    this.rules.push(rule);
  }

  /**
   * Update a rule
   */
  updateRule(ruleId: string, updates: Partial<ApprovalRule>): ApprovalRule | undefined {
    const index = this.rules.findIndex((r) => r.id === ruleId);
    if (index === -1) return undefined;

    this.rules[index] = { ...this.rules[index], ...updates };
    return this.rules[index];
  }

  /**
   * Delete a rule
   */
  deleteRule(ruleId: string): boolean {
    const index = this.rules.findIndex((r) => r.id === ruleId);
    if (index === -1) return false;

    this.rules.splice(index, 1);
    return true;
  }

  /**
   * Evaluate a proposed action and determine the appropriate decision
   */
  evaluateProposedAction(action: ProposedAgentAction): {
    decision: ApprovalRuleType;
    matchedRule: ApprovalRule | null;
    reasoning: string;
  } {
    const enabledRules = this.getEnabledRules();

    for (const rule of enabledRules) {
      if (this.matchesProposedAction(action, rule)) {
        return {
          decision: rule.action,
          matchedRule: rule,
          reasoning: `Matched rule: ${rule.name} - ${rule.description}`,
        };
      }
    }

    return {
      decision: "require_review",
      matchedRule: null,
      reasoning: "No matching rule - defaulting to require review",
    };
  }

  /**
   * Check if a proposed action matches a rule
   */
  private matchesProposedAction(action: ProposedAgentAction, rule: ApprovalRule): boolean {
    return rule.conditions.every((condition) => {
      const fieldValue = this.getProposedActionFieldValue(action, condition.field);
      return this.evaluateCondition(fieldValue, condition.operator, condition.value);
    });
  }

  /**
   * Get field value from proposed action
   */
  private getProposedActionFieldValue(
    action: ProposedAgentAction,
    field: ApprovalCondition["field"]
  ): string | number | undefined {
    switch (field) {
      case "riskLevel":
        return action.riskLevel;
      case "impactScope":
        return action.impactScope;
      case "confidence":
        return action.confidence;
      case "actionType":
        return action.actionType;
      case "affectedEntityCount":
        return action.affectedEntityCount;
      default:
        return undefined;
    }
  }

  /**
   * Evaluate a condition
   */
  private evaluateCondition(
    fieldValue: string | number | undefined,
    operator: ApprovalCondition["operator"],
    conditionValue: ApprovalCondition["value"]
  ): boolean {
    if (fieldValue === undefined) return false;

    switch (operator) {
      case "eq":
        return fieldValue === conditionValue;
      case "neq":
        return fieldValue !== conditionValue;
      case "gt":
        return typeof fieldValue === "number" && fieldValue > (conditionValue as number);
      case "gte":
        return typeof fieldValue === "number" && fieldValue >= (conditionValue as number);
      case "lt":
        return typeof fieldValue === "number" && fieldValue < (conditionValue as number);
      case "lte":
        return typeof fieldValue === "number" && fieldValue <= (conditionValue as number);
      case "in":
        return Array.isArray(conditionValue) && conditionValue.includes(fieldValue as never);
      case "not_in":
        return Array.isArray(conditionValue) && !conditionValue.includes(fieldValue as never);
      default:
        return false;
    }
  }

  /**
   * Batch approve actions
   */
  async batchApprove(
    actionIds: string[],
    approvedBy: string
  ): Promise<{ approved: string[]; failed: string[] }> {
    const approved: string[] = [];
    const failed: string[] = [];

    for (const actionId of actionIds) {
      try {
        const result = await storage.approveAgentAction(actionId, approvedBy);
        if (result) {
          approved.push(actionId);
        } else {
          failed.push(actionId);
        }
      } catch {
        failed.push(actionId);
      }
    }

    return { approved, failed };
  }

  /**
   * Batch reject actions
   */
  async batchReject(
    actionIds: string[],
    rejectedBy: string,
    reason?: string
  ): Promise<{ rejected: string[]; failed: string[] }> {
    const rejected: string[] = [];
    const failed: string[] = [];

    for (const actionId of actionIds) {
      try {
        const result = await storage.rejectAgentAction(actionId, rejectedBy, reason);
        if (result) {
          rejected.push(actionId);
        } else {
          failed.push(actionId);
        }
      } catch {
        failed.push(actionId);
      }
    }

    return { rejected, failed };
  }

  /**
   * Get approval queue statistics
   */
  async getQueueStats(): Promise<{
    pending: number;
    approved: number;
    rejected: number;
    executed: number;
    byRiskLevel: Record<string, number>;
    byActionType: Record<string, number>;
  }> {
    const [pending, approved, rejected, executed] = await Promise.all([
      storage.listAgentActions("pending"),
      storage.listAgentActions("approved"),
      storage.listAgentActions("rejected"),
      storage.listAgentActions("executed"),
    ]);

    const byRiskLevel: Record<string, number> = {};
    const byActionType: Record<string, number> = {};

    for (const action of pending) {
      const riskLevel = action.riskLevel || "unknown";
      byRiskLevel[riskLevel] = (byRiskLevel[riskLevel] || 0) + 1;
      byActionType[action.actionType] = (byActionType[action.actionType] || 0) + 1;
    }

    return {
      pending: pending.length,
      approved: approved.length,
      rejected: rejected.length,
      executed: executed.length,
      byRiskLevel,
      byActionType,
    };
  }
}

// Export singleton workflow service
export const approvalWorkflow = new ApprovalWorkflowService();
