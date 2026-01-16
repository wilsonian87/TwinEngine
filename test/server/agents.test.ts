/**
 * Agent Infrastructure Tests
 *
 * Phase 6C-D: Agent Testing
 *
 * Tests:
 * - Base agent class
 * - Channel health monitor agent
 * - Insight synthesizer agent
 * - Agent registry
 * - Agent scheduler
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  BaseAgent,
  AgentRegistry,
  createAgentRunRecord,
  agentTypes,
  type AgentType,
  type AgentOutput,
  type AgentContext,
  type AgentInsight,
  type AgentAlert,
} from "../../server/services/agents/base-agent";
import {
  ChannelHealthMonitorAgent,
  channelHealthMonitor,
  type ChannelHealthMonitorInput,
} from "../../server/services/agents/channel-health-monitor";
import {
  InsightSynthesizerAgent,
  insightSynthesizer,
  type InsightSynthesizerInput,
} from "../../server/services/agents/insight-synthesizer";
import {
  OrchestratorAgent,
  orchestrator,
  ApprovalWorkflowService,
  approvalWorkflow,
  defaultApprovalRules,
  type OrchestratorInput,
  type ApprovalRule,
} from "../../server/services/agents/orchestrator";
import {
  initializeAgents,
  getAgent,
  getAllAgents,
} from "../../server/services/agents";

describe("Agent Infrastructure", () => {
  describe("agentTypes", () => {
    it("should define all agent types", () => {
      expect(agentTypes).toContain("channel_health_monitor");
      expect(agentTypes).toContain("insight_synthesizer");
      expect(agentTypes).toContain("engagement_optimizer");
      expect(agentTypes).toContain("alert_manager");
    });
  });

  describe("AgentRegistry", () => {
    it("should be a singleton", () => {
      const registry1 = AgentRegistry.getInstance();
      const registry2 = AgentRegistry.getInstance();
      expect(registry1).toBe(registry2);
    });

    it("should register agents", () => {
      const registry = AgentRegistry.getInstance();
      registry.register(channelHealthMonitor);
      expect(registry.has("channel_health_monitor")).toBe(true);
    });

    it("should retrieve registered agents", () => {
      const registry = AgentRegistry.getInstance();
      const agent = registry.get("channel_health_monitor");
      expect(agent).toBeDefined();
      expect(agent?.type).toBe("channel_health_monitor");
    });

    it("should return undefined for unregistered agents", () => {
      const registry = AgentRegistry.getInstance();
      const agent = registry.get("nonexistent" as AgentType);
      expect(agent).toBeUndefined();
    });

    it("should list all registered agents", () => {
      const registry = AgentRegistry.getInstance();
      const agents = registry.getAll();
      expect(agents.length).toBeGreaterThan(0);
      expect(agents.some(a => a.type === "channel_health_monitor")).toBe(true);
    });
  });

  describe("initializeAgents", () => {
    it("should initialize and return the registry", () => {
      const registry = initializeAgents();
      expect(registry).toBeDefined();
      expect(registry.has("channel_health_monitor")).toBe(true);
      expect(registry.has("insight_synthesizer")).toBe(true);
    });

    it("should register insight synthesizer agent", () => {
      const registry = initializeAgents();
      const agent = registry.get("insight_synthesizer");
      expect(agent).toBeDefined();
      expect(agent?.type).toBe("insight_synthesizer");
    });
  });

  describe("getAgent", () => {
    it("should retrieve agent by type", () => {
      initializeAgents();
      const agent = getAgent("channel_health_monitor");
      expect(agent).toBeDefined();
      expect(agent?.type).toBe("channel_health_monitor");
    });
  });

  describe("getAllAgents", () => {
    it("should retrieve all registered agents", () => {
      initializeAgents();
      const agents = getAllAgents();
      expect(agents.length).toBeGreaterThan(0);
    });
  });
});

describe("ChannelHealthMonitorAgent", () => {
  let agent: ChannelHealthMonitorAgent;

  beforeEach(() => {
    agent = new ChannelHealthMonitorAgent();
  });

  describe("Agent Properties", () => {
    it("should have correct type", () => {
      expect(agent.type).toBe("channel_health_monitor");
    });

    it("should have correct name", () => {
      expect(agent.name).toBe("Channel Health Monitor");
    });

    it("should have a description", () => {
      expect(agent.description).toBeDefined();
      expect(agent.description.length).toBeGreaterThan(0);
    });

    it("should have a version", () => {
      expect(agent.version).toBeDefined();
      expect(agent.version).toMatch(/^\d+\.\d+\.\d+$/);
    });
  });

  describe("Input Schema", () => {
    it("should provide input schema", () => {
      const schema = agent.getInputSchema();
      expect(schema).toBeDefined();
      expect(schema.blockedAlertThreshold).toBeDefined();
      expect(schema.decliningAlertThresholdPct).toBeDefined();
    });

    it("should define all expected input fields", () => {
      const schema = agent.getInputSchema();
      expect(schema.tierFilter).toBeDefined();
      expect(schema.specialtyFilter).toBeDefined();
      expect(schema.createJiraTickets).toBeDefined();
      expect(schema.sendSlackNotifications).toBeDefined();
      expect(schema.slackChannel).toBeDefined();
    });
  });

  describe("Default Input", () => {
    it("should provide default input values", () => {
      const defaults = agent.getDefaultInput();
      expect(defaults).toBeDefined();
      expect(defaults.blockedAlertThreshold).toBeDefined();
      expect(defaults.decliningAlertThresholdPct).toBeDefined();
    });

    it("should have sensible defaults", () => {
      const defaults = agent.getDefaultInput();
      expect(defaults.blockedAlertThreshold).toBe(5);
      expect(defaults.decliningAlertThresholdPct).toBe(20);
      expect(defaults.createJiraTickets).toBe(true);
      expect(defaults.sendSlackNotifications).toBe(true);
    });
  });

  describe("Input Validation", () => {
    it("should validate valid input", () => {
      const input: ChannelHealthMonitorInput = {
        blockedAlertThreshold: 5,
        decliningAlertThresholdPct: 20,
        createJiraTickets: true,
        sendSlackNotifications: false,
      };
      const result = agent.validate(input);
      expect(result.valid).toBe(true);
    });

    it("should reject negative blockedAlertThreshold", () => {
      const input: ChannelHealthMonitorInput = {
        blockedAlertThreshold: -1,
      };
      const result = agent.validate(input);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("blockedAlertThreshold must be >= 0");
    });

    it("should reject decliningAlertThresholdPct over 100", () => {
      const input: ChannelHealthMonitorInput = {
        decliningAlertThresholdPct: 150,
      };
      const result = agent.validate(input);
      expect(result.valid).toBe(false);
    });

    it("should reject negative decliningAlertThresholdPct", () => {
      const input: ChannelHealthMonitorInput = {
        decliningAlertThresholdPct: -10,
      };
      const result = agent.validate(input);
      expect(result.valid).toBe(false);
    });
  });

  describe("Agent Execution with Empty Data", () => {
    it("should handle empty HCP data gracefully", async () => {
      agent.setHcpData([]);
      const input = agent.getDefaultInput() as ChannelHealthMonitorInput;
      const result = await agent.run(input, "test-user", "on_demand");

      expect(result.status).toBe("completed");
      expect(result.output.success).toBe(true);
      expect(result.output.summary).toContain("No HCPs");
    });
  });
});

describe("createAgentRunRecord", () => {
  it("should create a valid run record", () => {
    const agent = channelHealthMonitor;
    const context: AgentContext = {
      agentId: "agent-channel_health_monitor",
      runId: "run-test-123",
      triggeredBy: "test-user",
      triggerType: "on_demand",
      startTime: new Date(),
    };
    const output: AgentOutput = {
      success: true,
      summary: "Test run completed",
      insights: [
        {
          type: "health_summary",
          title: "Test Insight",
          description: "Test description",
          severity: "info",
        },
      ],
      alerts: [
        {
          severity: "warning",
          title: "Test Alert",
          message: "Test alert message",
        },
      ],
      metrics: { testMetric: 100 },
    };

    const record = createAgentRunRecord(agent, context, output, "completed", 1000);

    expect(record).toBeDefined();
    expect(record.agentId).toBe("agent-channel_health_monitor");
    expect(record.agentType).toBe("channel_health_monitor");
    expect(record.triggerType).toBe("on_demand");
    expect(record.triggeredBy).toBe("test-user");
    expect(record.status).toBe("completed");
    expect(record.executionTimeMs).toBe(1000);
    expect(record.outputs).toBeDefined();
    expect(record.outputs?.alerts).toHaveLength(1);
    expect(record.outputs?.recommendations).toHaveLength(1);
  });

  it("should handle failed runs", () => {
    const agent = channelHealthMonitor;
    const context: AgentContext = {
      agentId: "agent-channel_health_monitor",
      runId: "run-test-456",
      triggeredBy: "test-user",
      triggerType: "on_demand",
      startTime: new Date(),
    };
    const output: AgentOutput = {
      success: false,
      summary: "Run failed",
      error: "Test error message",
    };

    const record = createAgentRunRecord(agent, context, output, "failed", 500);

    expect(record.status).toBe("failed");
    expect(record.errorMessage).toBe("Test error message");
  });

  it("should handle output without alerts or insights", () => {
    const agent = channelHealthMonitor;
    const context: AgentContext = {
      agentId: "agent-channel_health_monitor",
      runId: "run-test-789",
      triggeredBy: "system",
      triggerType: "scheduled",
      startTime: new Date(),
    };
    const output: AgentOutput = {
      success: true,
      summary: "No issues found",
    };

    const record = createAgentRunRecord(agent, context, output, "completed", 200);

    expect(record.outputs?.alerts).toBeUndefined();
    expect(record.outputs?.recommendations).toBeUndefined();
    expect(record.actionsProposed).toBe(0);
  });
});

describe("Agent Alert Types", () => {
  it("should support info severity", () => {
    const alert: AgentAlert = {
      severity: "info",
      title: "Information",
      message: "Informational message",
    };
    expect(alert.severity).toBe("info");
  });

  it("should support warning severity", () => {
    const alert: AgentAlert = {
      severity: "warning",
      title: "Warning",
      message: "Warning message",
    };
    expect(alert.severity).toBe("warning");
  });

  it("should support critical severity", () => {
    const alert: AgentAlert = {
      severity: "critical",
      title: "Critical",
      message: "Critical message",
    };
    expect(alert.severity).toBe("critical");
  });

  it("should support affected entities", () => {
    const alert: AgentAlert = {
      severity: "warning",
      title: "Warning with entities",
      message: "Message",
      affectedEntities: {
        type: "hcp",
        ids: ["hcp-1", "hcp-2"],
        count: 2,
      },
    };
    expect(alert.affectedEntities).toBeDefined();
    expect(alert.affectedEntities?.count).toBe(2);
  });

  it("should support suggested actions", () => {
    const alert: AgentAlert = {
      severity: "warning",
      title: "Warning with actions",
      message: "Message",
      suggestedActions: [
        {
          type: "review",
          label: "Review HCPs",
          payload: { filter: "declining" },
        },
      ],
    };
    expect(alert.suggestedActions).toBeDefined();
    expect(alert.suggestedActions).toHaveLength(1);
  });
});

describe("Agent Insight Types", () => {
  it("should support insight with basic properties", () => {
    const insight: AgentInsight = {
      type: "health_summary",
      title: "Test Insight",
      description: "Test description",
      severity: "info",
    };
    expect(insight.type).toBe("health_summary");
    expect(insight.severity).toBe("info");
  });

  it("should support insight with affected entities", () => {
    const insight: AgentInsight = {
      type: "segment_analysis",
      title: "Segment Analysis",
      description: "Analysis results",
      severity: "warning",
      affectedEntities: {
        type: "segment",
        ids: ["seg-1"],
        count: 1,
      },
    };
    expect(insight.affectedEntities).toBeDefined();
  });

  it("should support insight with metrics", () => {
    const insight: AgentInsight = {
      type: "performance_metric",
      title: "Performance",
      description: "Metrics overview",
      severity: "info",
      metrics: {
        healthScore: 75,
        engagementRate: "85%",
      },
    };
    expect(insight.metrics).toBeDefined();
    expect(insight.metrics?.healthScore).toBe(75);
  });

  it("should support insight with recommendation", () => {
    const insight: AgentInsight = {
      type: "actionable_insight",
      title: "Action Required",
      description: "Some action is needed",
      severity: "warning",
      recommendation: "Consider re-engaging these HCPs",
    };
    expect(insight.recommendation).toBeDefined();
  });
});

describe("Agent Definition", () => {
  it("should generate agent definition", () => {
    const agent = channelHealthMonitor;
    const definition = agent.getDefinition({
      scheduled: { enabled: true, cron: "0 8 * * 1-5" },
      onDemand: true,
    });

    expect(definition.type).toBe("channel_health_monitor");
    expect(definition.name).toBe("Channel Health Monitor");
    expect(definition.version).toBe("1.0.0");
    expect(definition.triggers.scheduled?.enabled).toBe(true);
    expect(definition.triggers.onDemand).toBe(true);
    expect(definition.status).toBe("active");
  });

  it("should include input schema in definition", () => {
    const agent = channelHealthMonitor;
    const definition = agent.getDefinition({});

    expect(definition.inputSchema).toBeDefined();
    expect(definition.defaultInputs).toBeDefined();
  });
});

describe("InsightSynthesizerAgent", () => {
  let agent: InsightSynthesizerAgent;

  beforeEach(() => {
    agent = new InsightSynthesizerAgent();
  });

  describe("Agent Properties", () => {
    it("should have correct type", () => {
      expect(agent.type).toBe("insight_synthesizer");
    });

    it("should have correct name", () => {
      expect(agent.name).toBe("Insight Synthesizer");
    });

    it("should have a description", () => {
      expect(agent.description).toBeDefined();
      expect(agent.description.length).toBeGreaterThan(0);
    });

    it("should have a version", () => {
      expect(agent.version).toBeDefined();
      expect(agent.version).toMatch(/^\d+\.\d+\.\d+$/);
    });
  });

  describe("Input Schema", () => {
    it("should provide input schema", () => {
      const schema = agent.getInputSchema();
      expect(schema).toBeDefined();
      expect(schema.analysisWindowDays).toBeDefined();
      expect(schema.focusAreas).toBeDefined();
    });

    it("should define all expected input fields", () => {
      const schema = agent.getInputSchema();
      expect(schema.tierFilter).toBeDefined();
      expect(schema.includeNBARecommendations).toBeDefined();
      expect(schema.maxRecommendations).toBeDefined();
      expect(schema.generateExecutiveSummary).toBeDefined();
      expect(schema.sendSlackSummary).toBeDefined();
      expect(schema.slackChannel).toBeDefined();
    });
  });

  describe("Default Input", () => {
    it("should provide default input values", () => {
      const defaults = agent.getDefaultInput();
      expect(defaults).toBeDefined();
      expect(defaults.analysisWindowDays).toBeDefined();
      expect(defaults.focusAreas).toBeDefined();
    });

    it("should have sensible defaults", () => {
      const defaults = agent.getDefaultInput();
      expect(defaults.analysisWindowDays).toBe(30);
      expect(defaults.includeNBARecommendations).toBe(true);
      expect(defaults.generateExecutiveSummary).toBe(true);
      expect(defaults.maxRecommendations).toBe(5);
    });
  });

  describe("Input Validation", () => {
    it("should validate valid input", () => {
      const input: InsightSynthesizerInput = {
        analysisWindowDays: 30,
        includeNBARecommendations: true,
        maxRecommendations: 5,
      };
      const result = agent.validate(input);
      expect(result.valid).toBe(true);
    });

    it("should reject analysisWindowDays less than 1", () => {
      const input: InsightSynthesizerInput = {
        analysisWindowDays: 0,
      };
      const result = agent.validate(input);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("analysisWindowDays must be >= 1");
    });

    it("should reject analysisWindowDays greater than 365", () => {
      const input: InsightSynthesizerInput = {
        analysisWindowDays: 400,
      };
      const result = agent.validate(input);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("analysisWindowDays must be <= 365");
    });

    it("should reject maxRecommendations less than 1", () => {
      const input: InsightSynthesizerInput = {
        maxRecommendations: 0,
      };
      const result = agent.validate(input);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("maxRecommendations must be >= 1");
    });
  });

  describe("Agent Execution with Empty Data", () => {
    it("should handle empty HCP data gracefully", async () => {
      agent.setData({ hcps: [] });
      const input = agent.getDefaultInput() as InsightSynthesizerInput;
      const result = await agent.run(input, "test-user", "on_demand");

      expect(result.status).toBe("completed");
      expect(result.output.success).toBe(true);
      expect(result.output.summary).toContain("No HCPs");
    });

    it("should handle data with no alerts", async () => {
      agent.setData({
        hcps: [],
        recentAlerts: [],
        recentAgentRuns: [],
        recentSimulations: [],
      });
      const input = agent.getDefaultInput() as InsightSynthesizerInput;
      const result = await agent.run(input, "test-user", "on_demand");

      expect(result.status).toBe("completed");
      expect(result.output.success).toBe(true);
    });
  });

  describe("Agent Definition", () => {
    it("should generate agent definition", () => {
      const definition = agent.getDefinition({
        scheduled: { enabled: true, cron: "0 6 * * 1" },
        onDemand: true,
      });

      expect(definition.type).toBe("insight_synthesizer");
      expect(definition.name).toBe("Insight Synthesizer");
      expect(definition.version).toBe("1.0.0");
      expect(definition.triggers.scheduled?.enabled).toBe(true);
      expect(definition.triggers.onDemand).toBe(true);
      expect(definition.status).toBe("active");
    });

    it("should include input schema in definition", () => {
      const definition = agent.getDefinition({});

      expect(definition.inputSchema).toBeDefined();
      expect(definition.defaultInputs).toBeDefined();
    });
  });

  describe("Singleton Instance", () => {
    it("should export singleton insightSynthesizer", () => {
      expect(insightSynthesizer).toBeDefined();
      expect(insightSynthesizer.type).toBe("insight_synthesizer");
    });
  });
});

describe("OrchestratorAgent", () => {
  let agent: OrchestratorAgent;

  beforeEach(() => {
    agent = new OrchestratorAgent();
  });

  describe("Agent Properties", () => {
    it("should have correct type", () => {
      expect(agent.type).toBe("alert_manager");
    });

    it("should have correct name", () => {
      expect(agent.name).toBe("Orchestrator");
    });

    it("should have a description", () => {
      expect(agent.description).toBeDefined();
      expect(agent.description.length).toBeGreaterThan(0);
    });

    it("should have a version", () => {
      expect(agent.version).toBeDefined();
      expect(agent.version).toMatch(/^\d+\.\d+\.\d+$/);
    });
  });

  describe("Input Schema", () => {
    it("should provide input schema", () => {
      const schema = agent.getInputSchema();
      expect(schema).toBeDefined();
      expect(schema.agentsToRun).toBeDefined();
      expect(schema.processPendingActions).toBeDefined();
    });

    it("should define all expected input fields", () => {
      const schema = agent.getInputSchema();
      expect(schema.runApprovalWorkflow).toBeDefined();
      expect(schema.customApprovalRules).toBeDefined();
      expect(schema.maxActionsToProcess).toBeDefined();
      expect(schema.sendNotifications).toBeDefined();
    });
  });

  describe("Default Input", () => {
    it("should provide default input values", () => {
      const defaults = agent.getDefaultInput();
      expect(defaults).toBeDefined();
      expect(defaults.processPendingActions).toBeDefined();
      expect(defaults.runApprovalWorkflow).toBeDefined();
    });

    it("should have sensible defaults", () => {
      const defaults = agent.getDefaultInput();
      expect(defaults.processPendingActions).toBe(true);
      expect(defaults.runApprovalWorkflow).toBe(true);
      expect(defaults.maxActionsToProcess).toBe(100);
      expect(defaults.sendNotifications).toBe(true);
    });
  });

  describe("Input Validation", () => {
    it("should validate valid input", () => {
      const input: OrchestratorInput = {
        processPendingActions: true,
        maxActionsToProcess: 50,
      };
      const result = agent.validate(input);
      expect(result.valid).toBe(true);
    });

    it("should reject maxActionsToProcess less than 1", () => {
      const input: OrchestratorInput = {
        maxActionsToProcess: 0,
      };
      const result = agent.validate(input);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("maxActionsToProcess must be >= 1");
    });
  });

  describe("Approval Rules", () => {
    it("should get approval rules", () => {
      const rules = agent.getApprovalRules();
      expect(rules).toBeDefined();
      expect(rules.length).toBeGreaterThan(0);
    });

    it("should set custom approval rules", () => {
      const customRules: ApprovalRule[] = [
        {
          id: "custom-rule",
          name: "Custom Rule",
          description: "Test rule",
          priority: 1,
          conditions: [{ field: "riskLevel", operator: "eq", value: "low" }],
          action: "auto_approve",
          enabled: true,
        },
      ];
      agent.setApprovalRules(customRules);
      const rules = agent.getApprovalRules();
      expect(rules.length).toBe(1);
      expect(rules[0].id).toBe("custom-rule");
    });
  });

  describe("Agent Definition", () => {
    it("should generate agent definition", () => {
      const definition = agent.getDefinition({
        onDemand: true,
      });

      expect(definition.type).toBe("alert_manager");
      expect(definition.name).toBe("Orchestrator");
      expect(definition.version).toBe("1.0.0");
      expect(definition.triggers.onDemand).toBe(true);
      expect(definition.status).toBe("active");
    });
  });

  describe("Singleton Instance", () => {
    it("should export singleton orchestrator", () => {
      expect(orchestrator).toBeDefined();
      expect(orchestrator.type).toBe("alert_manager");
    });
  });
});

describe("ApprovalWorkflowService", () => {
  let service: ApprovalWorkflowService;

  beforeEach(() => {
    service = new ApprovalWorkflowService();
  });

  describe("Default Rules", () => {
    it("should have default approval rules", () => {
      expect(defaultApprovalRules).toBeDefined();
      expect(defaultApprovalRules.length).toBeGreaterThan(0);
    });

    it("should include auto-approve low risk rule", () => {
      const rule = defaultApprovalRules.find(r => r.id === "rule-auto-approve-low-risk");
      expect(rule).toBeDefined();
      expect(rule?.action).toBe("auto_approve");
    });

    it("should include review high risk rule", () => {
      const rule = defaultApprovalRules.find(r => r.id === "rule-review-high-risk");
      expect(rule).toBeDefined();
      expect(rule?.action).toBe("require_review");
    });
  });

  describe("Rule Management", () => {
    it("should get rules", () => {
      const rules = service.getRules();
      expect(rules.length).toBe(defaultApprovalRules.length);
    });

    it("should get enabled rules", () => {
      const rules = service.getEnabledRules();
      expect(rules.every(r => r.enabled)).toBe(true);
    });

    it("should get enabled rules sorted by priority", () => {
      const rules = service.getEnabledRules();
      for (let i = 1; i < rules.length; i++) {
        expect(rules[i].priority).toBeGreaterThanOrEqual(rules[i - 1].priority);
      }
    });

    it("should add a new rule", () => {
      const newRule: ApprovalRule = {
        id: "test-rule",
        name: "Test Rule",
        description: "A test rule",
        priority: 100,
        conditions: [{ field: "riskLevel", operator: "eq", value: "low" }],
        action: "auto_approve",
        enabled: true,
      };
      service.addRule(newRule);
      const rules = service.getRules();
      expect(rules.find(r => r.id === "test-rule")).toBeDefined();
    });

    it("should update a rule", () => {
      const updatedRule = service.updateRule("rule-auto-approve-low-risk", {
        enabled: false,
      });
      expect(updatedRule).toBeDefined();
      expect(updatedRule?.enabled).toBe(false);
    });

    it("should return undefined when updating non-existent rule", () => {
      const result = service.updateRule("non-existent", { enabled: false });
      expect(result).toBeUndefined();
    });

    it("should delete a rule", () => {
      const initialCount = service.getRules().length;
      const deleted = service.deleteRule("rule-auto-approve-low-risk");
      expect(deleted).toBe(true);
      expect(service.getRules().length).toBe(initialCount - 1);
    });

    it("should return false when deleting non-existent rule", () => {
      const deleted = service.deleteRule("non-existent");
      expect(deleted).toBe(false);
    });
  });

  describe("Action Evaluation", () => {
    it("should evaluate low risk action as auto-approve", () => {
      const action = {
        actionType: "send_notification",
        actionName: "Test Action",
        description: "Test",
        reasoning: "Test",
        confidence: 0.9,
        riskLevel: "low" as const,
        impactScope: "individual" as const,
        affectedEntityCount: 1,
        payload: {},
        requiresApproval: false,
      };
      const result = service.evaluateProposedAction(action);
      expect(result.decision).toBe("auto_approve");
    });

    it("should evaluate high risk action as require review", () => {
      const action = {
        actionType: "update_data",
        actionName: "Test Action",
        description: "Test",
        reasoning: "Test",
        confidence: 0.7,
        riskLevel: "high" as const,
        impactScope: "portfolio" as const,
        affectedEntityCount: 50, // Keep below 100 to avoid triggering escalation rule
        payload: {},
        requiresApproval: true,
      };
      const result = service.evaluateProposedAction(action);
      expect(result.decision).toBe("require_review");
    });

    it("should evaluate medium risk action as require review", () => {
      const action = {
        actionType: "update_data",
        actionName: "Test Action",
        description: "Test",
        reasoning: "Test",
        confidence: 0.7,
        riskLevel: "medium" as const,
        impactScope: "segment" as const,
        affectedEntityCount: 10,
        payload: {},
        requiresApproval: true,
      };
      const result = service.evaluateProposedAction(action);
      expect(result.decision).toBe("require_review");
    });

    it("should evaluate slack notification action as auto-approve", () => {
      const action = {
        actionType: "send_slack",
        actionName: "Slack Notification",
        description: "Test",
        reasoning: "Test",
        confidence: 0.8,
        riskLevel: "low" as const,
        impactScope: "individual" as const,
        affectedEntityCount: 1,
        payload: {},
        requiresApproval: false,
      };
      const result = service.evaluateProposedAction(action);
      expect(result.decision).toBe("auto_approve");
    });
  });

  describe("Singleton Instance", () => {
    it("should export singleton approvalWorkflow", () => {
      expect(approvalWorkflow).toBeDefined();
      expect(approvalWorkflow.getRules).toBeDefined();
    });
  });
});
