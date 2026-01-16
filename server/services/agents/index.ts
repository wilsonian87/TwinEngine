/**
 * Agent Services Module
 *
 * Phase 6C-E: Agentic Infrastructure for TwinEngine
 *
 * Exports:
 * - Base agent class and utilities
 * - Channel Health Monitor agent
 * - Insight Synthesizer agent
 * - Orchestrator agent and approval workflow
 * - Agent registry for managing agents
 */

// Base agent infrastructure
export {
  BaseAgent,
  AgentRegistry,
  createAgentRunRecord,
  agentTypes,
  type AgentType,
  type AgentInput,
  type AgentOutput,
  type AgentContext,
  type AgentInsight,
  type AgentAlert,
  type ProposedAgentAction,
  type AgentTriggerConfig,
  type AgentLogger,
} from "./base-agent";

// Channel Health Monitor Agent
export {
  ChannelHealthMonitorAgent,
  channelHealthMonitor,
  type ChannelHealthMonitorInput,
  type ChannelHealthReport,
} from "./channel-health-monitor";

// Insight Synthesizer Agent
export {
  InsightSynthesizerAgent,
  insightSynthesizer,
  type InsightSynthesizerInput,
  type AggregatedData,
  type StrategicPattern,
  type StrategicRecommendation,
  type ExecutiveSummary,
} from "./insight-synthesizer";

// Orchestrator Agent and Approval Workflow
export {
  OrchestratorAgent,
  orchestrator,
  ApprovalWorkflowService,
  approvalWorkflow,
  defaultApprovalRules,
  type OrchestratorInput,
  type ApprovalRule,
  type ApprovalCondition,
  type ApprovalRuleType,
  type ActionEvaluationResult,
  type OrchestrationResult,
} from "./orchestrator";

// Agent Scheduler
export {
  AgentScheduler,
  agentScheduler,
  initializeScheduler,
  type SchedulerConfig,
  type ScheduledJob,
  type SchedulerState,
} from "./scheduler";

// Initialize and register agents
import { AgentRegistry } from "./base-agent";
import { channelHealthMonitor } from "./channel-health-monitor";
import { insightSynthesizer } from "./insight-synthesizer";
import { orchestrator } from "./orchestrator";

/**
 * Initialize all agents and register them
 */
export function initializeAgents(): AgentRegistry {
  const registry = AgentRegistry.getInstance();

  // Register Channel Health Monitor
  registry.register(channelHealthMonitor);

  // Register Insight Synthesizer
  registry.register(insightSynthesizer);

  // Register Orchestrator (uses alert_manager type)
  registry.register(orchestrator);

  return registry;
}

/**
 * Get agent by type
 */
export function getAgent(type: string) {
  return AgentRegistry.getInstance().get(type as any);
}

/**
 * Get all registered agents
 */
export function getAllAgents() {
  return AgentRegistry.getInstance().getAll();
}
