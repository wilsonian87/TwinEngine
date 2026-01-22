/**
 * Agent Scheduler Service
 *
 * Phase 6C: Agentic Infrastructure for TwinEngine
 *
 * Manages scheduled agent execution using node-cron.
 * Features:
 * - Cron-based scheduling for agents
 * - Runtime control (start/stop/pause)
 * - Concurrent execution management
 * - Logging and monitoring
 */

import cron, { ScheduledTask } from "node-cron";
import { AgentRegistry, type BaseAgent, type AgentOutput, type AgentAlert } from "./base-agent";
import { storage } from "../../storage";
import { createJiraIntegration, isJiraConfigured, defaultTicketTemplates } from "../integrations";
import { debugLog } from "../../utils/config";

// Scheduler configuration
export interface SchedulerConfig {
  enabled: boolean;
  timezone: string;
  maxConcurrentRuns: number;
  runOnStartup: boolean;
  jiraAutoTicket: {
    enabled: boolean;
    severities: Array<"critical" | "warning" | "info">;
    projectKey?: string;
  };
}

// Scheduled job info
export interface ScheduledJob {
  agentType: string;
  cronExpression: string;
  task: ScheduledTask;
  lastRunAt?: Date;
  nextRunAt?: Date;
  isRunning: boolean;
  runCount: number;
}

// Scheduler state
export interface SchedulerState {
  isRunning: boolean;
  jobs: Map<string, ScheduledJob>;
  config: SchedulerConfig;
}

/**
 * Agent Scheduler
 *
 * Singleton class that manages scheduled agent execution.
 */
export class AgentScheduler {
  private static instance: AgentScheduler;
  private state: SchedulerState;
  private activeRuns: Set<string> = new Set();

  private constructor() {
    this.state = {
      isRunning: false,
      jobs: new Map(),
      config: {
        enabled: process.env.AGENT_SCHEDULER_ENABLED === "true",
        timezone: process.env.AGENT_DEFAULT_TIMEZONE || "America/New_York",
        maxConcurrentRuns: parseInt(process.env.AGENT_MAX_CONCURRENT_RUNS || "3", 10),
        runOnStartup: process.env.AGENT_RUN_ON_STARTUP === "true",
        jiraAutoTicket: {
          enabled: process.env.AGENT_JIRA_AUTO_TICKET === "true",
          severities: (process.env.AGENT_JIRA_SEVERITIES?.split(",") || ["critical"]) as Array<"critical" | "warning" | "info">,
          projectKey: process.env.JIRA_PROJECT_KEY,
        },
      },
    };
  }

  static getInstance(): AgentScheduler {
    if (!AgentScheduler.instance) {
      AgentScheduler.instance = new AgentScheduler();
    }
    return AgentScheduler.instance;
  }

  /**
   * Initialize the scheduler with registered agents
   */
  async initialize(): Promise<void> {
    const registry = AgentRegistry.getInstance();
    const agents = registry.getAll();

    debugLog("Scheduler", `Initializing with ${agents.length} agents`);

    for (const agent of agents) {
      await this.scheduleAgent(agent);
    }

    if (this.state.config.enabled) {
      this.start();
    }

    debugLog("Scheduler", `Initialization complete. Enabled: ${this.state.config.enabled}`);
  }

  /**
   * Schedule an agent based on its definition
   */
  private async scheduleAgent(agent: BaseAgent): Promise<void> {
    // Get agent definition from storage or use defaults
    const definition = await storage.getAgentDefinitionByType(agent.type);
    const triggers = definition?.triggers;

    if (!triggers?.scheduled?.enabled || !triggers.scheduled.cron) {
      debugLog("Scheduler", `Agent ${agent.type} has no scheduled trigger - skipping`);
      return;
    }

    const cronExpression = triggers.scheduled.cron;
    const timezone = triggers.scheduled.timezone || this.state.config.timezone;

    // Validate cron expression
    if (!cron.validate(cronExpression)) {
      console.error(`[Scheduler] Invalid cron expression for ${agent.type}: ${cronExpression}`);
      return;
    }

    // Create the scheduled task (v4 API - tasks start automatically, we'll stop them after creation)
    const task = cron.schedule(
      cronExpression,
      () => this.executeAgent(agent.type),
      {
        timezone,
        name: `agent-${agent.type}`,
      }
    );
    // Stop the task immediately - we'll start it when scheduler starts
    task.stop();

    const job: ScheduledJob = {
      agentType: agent.type,
      cronExpression,
      task,
      isRunning: false,
      runCount: 0,
    };

    this.state.jobs.set(agent.type, job);
    debugLog("Scheduler", `Scheduled agent ${agent.type} with cron: ${cronExpression}`);
  }

  /**
   * Execute an agent
   */
  private async executeAgent(agentType: string): Promise<void> {
    const job = this.state.jobs.get(agentType);
    if (!job) {
      console.error(`[Scheduler] Job not found for agent: ${agentType}`);
      return;
    }

    // Check concurrent execution limit
    if (this.activeRuns.size >= this.state.config.maxConcurrentRuns) {
      console.warn(`[Scheduler] Max concurrent runs reached. Skipping ${agentType}`);
      return;
    }

    // Check if already running
    if (job.isRunning) {
      console.warn(`[Scheduler] Agent ${agentType} is already running. Skipping.`);
      return;
    }

    const registry = AgentRegistry.getInstance();
    const agent = registry.get(agentType as any);

    if (!agent) {
      console.error(`[Scheduler] Agent not found: ${agentType}`);
      return;
    }

    debugLog("Scheduler", `Starting scheduled run for ${agentType}`);

    job.isRunning = true;
    job.lastRunAt = new Date();
    this.activeRuns.add(agentType);

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
        // Get recent simulations
        const recentSimulations = await storage.getSimulationHistory();
        insightSynthesizer.setData({
          hcps,
          recentAlerts,
          recentAgentRuns,
          recentSimulations: recentSimulations.slice(0, 20),
        });
      }

      const input = agent.getDefaultInput();
      const result = await agent.run(input, "scheduler", "scheduled");

      // Store the run record
      await storage.createAgentRun({
        agentId: result.runId,
        agentType: agent.type,
        agentVersion: agent.version,
        triggerType: "scheduled",
        triggeredBy: "scheduler",
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

      // Create alerts if any
      if (result.output.alerts && result.output.alerts.length > 0) {
        for (const alert of result.output.alerts) {
          const storedAlert = await storage.createAlert({
            agentId: result.runId,
            severity: alert.severity,
            title: alert.title,
            message: alert.message,
            affectedEntities: alert.affectedEntities ? {
              type: alert.affectedEntities.type as "channel" | "segment" | "audience" | "hcp",
              ids: alert.affectedEntities.ids,
              count: alert.affectedEntities.count,
            } : undefined,
            status: "active",
          });

          // Create Jira ticket if configured for this severity
          await this.createJiraTicketForAlert(alert, storedAlert.id, agentType);
        }
      }

      job.runCount++;
      debugLog("Scheduler", `Completed scheduled run for ${agentType}. Status: ${result.status}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[Scheduler] Error running agent ${agentType}:`, errorMessage);
    } finally {
      job.isRunning = false;
      this.activeRuns.delete(agentType);
    }
  }

  /**
   * Start the scheduler
   */
  start(): void {
    if (this.state.isRunning) {
      debugLog("Scheduler", "Scheduler is already running");
      return;
    }

    debugLog("Scheduler", `Starting scheduler with ${this.state.jobs.size} jobs`);

    const jobEntries = Array.from(this.state.jobs.entries());
    for (const [agentType, job] of jobEntries) {
      job.task.start();
      debugLog("Scheduler", `Started job for ${agentType}`);
    }

    this.state.isRunning = true;

    // Run agents on startup if configured
    if (this.state.config.runOnStartup) {
      debugLog("Scheduler", "Running agents on startup...");
      const agentTypes = Array.from(this.state.jobs.keys());
      for (const agentType of agentTypes) {
        this.executeAgent(agentType);
      }
    }
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    if (!this.state.isRunning) {
      debugLog("Scheduler", "Scheduler is not running");
      return;
    }

    debugLog("Scheduler", "Stopping scheduler...");

    const jobEntries = Array.from(this.state.jobs.entries());
    for (const [agentType, job] of jobEntries) {
      job.task.stop();
      debugLog("Scheduler", `Stopped job for ${agentType}`);
    }

    this.state.isRunning = false;
  }

  /**
   * Create a Jira ticket for an alert if configured
   */
  private async createJiraTicketForAlert(
    alert: AgentAlert,
    alertId: string,
    agentType: string
  ): Promise<void> {
    const { jiraAutoTicket } = this.state.config;

    // Check if Jira auto-ticket is enabled and alert severity qualifies
    if (!jiraAutoTicket.enabled) {
      return;
    }

    if (!jiraAutoTicket.severities.includes(alert.severity)) {
      debugLog("Scheduler", `Skipping Jira ticket for ${alert.severity} alert (not in configured severities)`);
      return;
    }

    // Check if Jira is configured
    const jiraConfigured = await isJiraConfigured();
    if (!jiraConfigured) {
      debugLog("Scheduler", "Jira not configured - skipping ticket creation");
      return;
    }

    try {
      // Get Jira integration
      const integration = await storage.getIntegrationByType("jira");
      if (!integration) {
        debugLog("Scheduler", "No Jira integration found");
        return;
      }

      const jiraIntegration = createJiraIntegration(integration);

      // Use the channel_alert template
      const template = defaultTicketTemplates.channel_alert;

      // Build ticket description
      const descriptionParts = [
        `*Alert Details:*`,
        `- Severity: ${alert.severity.toUpperCase()}`,
        `- Source: ${agentType}`,
        `- Alert ID: ${alertId}`,
        ``,
        `*Message:*`,
        alert.message,
      ];

      if (alert.affectedEntities) {
        descriptionParts.push(
          ``,
          `*Affected Entities:*`,
          `- Type: ${alert.affectedEntities.type}`,
          `- Count: ${alert.affectedEntities.count}`,
          `- IDs: ${alert.affectedEntities.ids.slice(0, 10).join(", ")}${alert.affectedEntities.ids.length > 10 ? "..." : ""}`
        );
      }

      if (alert.suggestedActions && alert.suggestedActions.length > 0) {
        descriptionParts.push(
          ``,
          `*Suggested Actions:*`
        );
        for (const action of alert.suggestedActions) {
          descriptionParts.push(`- ${action.label}`);
        }
      }

      // Determine priority based on severity
      const priorityMap: Record<string, string> = {
        critical: "Highest",
        warning: "High",
        info: "Medium",
      };

      // Create issue using the JiraCreateIssueRequest format
      const result = await jiraIntegration.createIssue({
        integrationId: integration.id,
        projectKey: jiraAutoTicket.projectKey || "TWIN",
        issueType: template.issueType || "Task",
        summary: `[${alert.severity.toUpperCase()}] ${alert.title}`,
        description: descriptionParts.join("\n"),
        priority: priorityMap[alert.severity] || "Medium",
        labels: [
          "agent-alert",
          `severity-${alert.severity}`,
          `agent-${agentType}`,
        ],
        sourceType: "alert",
        sourceId: alertId,
      });

      if (result.success && result.issueKey) {
        debugLog("Scheduler", `Created Jira ticket ${result.issueKey} for alert ${alertId}`);
      } else {
        console.error(`[Scheduler] Failed to create Jira ticket: ${result.error}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[Scheduler] Failed to create Jira ticket for alert ${alertId}:`, errorMessage);
    }
  }

  /**
   * Trigger an agent manually
   */
  async triggerAgent(agentType: string): Promise<void> {
    await this.executeAgent(agentType);
  }

  /**
   * Get scheduler status
   */
  getStatus(): {
    isRunning: boolean;
    config: SchedulerConfig;
    jobs: Array<{
      agentType: string;
      cronExpression: string;
      lastRunAt?: Date;
      isRunning: boolean;
      runCount: number;
    }>;
    activeRuns: number;
  } {
    const jobs = Array.from(this.state.jobs.values()).map(job => ({
      agentType: job.agentType,
      cronExpression: job.cronExpression,
      lastRunAt: job.lastRunAt,
      isRunning: job.isRunning,
      runCount: job.runCount,
    }));

    return {
      isRunning: this.state.isRunning,
      config: this.state.config,
      jobs,
      activeRuns: this.activeRuns.size,
    };
  }

  /**
   * Update scheduler configuration
   */
  updateConfig(config: Partial<SchedulerConfig>): void {
    this.state.config = { ...this.state.config, ...config };
    debugLog("Scheduler", "Configuration updated", this.state.config);
  }
}

// Singleton instance
export const agentScheduler = AgentScheduler.getInstance();

/**
 * Initialize the agent scheduler
 */
export async function initializeScheduler(): Promise<AgentScheduler> {
  await agentScheduler.initialize();
  return agentScheduler;
}
