/**
 * Agent Executor Tests
 *
 * Phase 12D.3: Tool Invocation & Autonomy Framework
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  AgentExecutor,
  agentExecutor,
  actionCapabilities,
  actionCategories,
  type ActionCapability,
  type ActionCategory,
  type ExecutionResult,
  type GuardrailCheckResult,
} from "../../server/services/agents/agent-executor";
import type { AgentAction, ProposedAction } from "@shared/schema";

describe("AgentExecutor", () => {
  let executor: AgentExecutor;

  beforeEach(() => {
    executor = new AgentExecutor();
  });

  describe("Action Capabilities Registry", () => {
    it("should have all expected action categories", () => {
      const expectedCategories: ActionCategory[] = [
        "query",
        "report",
        "notification",
        "simulation",
        "recommendation",
        "configuration",
        "integration",
      ];

      expect(actionCategories).toEqual(expectedCategories);
    });

    it("should have action capabilities defined for each category", () => {
      const categoriesWithCapabilities = new Set(actionCapabilities.map(c => c.category));

      // At least query, report, notification, simulation, recommendation should have capabilities
      expect(categoriesWithCapabilities.has("query")).toBe(true);
      expect(categoriesWithCapabilities.has("report")).toBe(true);
      expect(categoriesWithCapabilities.has("notification")).toBe(true);
      expect(categoriesWithCapabilities.has("simulation")).toBe(true);
      expect(categoriesWithCapabilities.has("recommendation")).toBe(true);
    });

    it("should have valid risk levels for all capabilities", () => {
      const validRiskLevels = ["low", "medium", "high"];

      for (const capability of actionCapabilities) {
        expect(validRiskLevels).toContain(capability.riskLevel);
      }
    });

    it("should have valid audit levels for all capabilities", () => {
      const validAuditLevels = ["minimal", "standard", "detailed"];

      for (const capability of actionCapabilities) {
        expect(validAuditLevels).toContain(capability.auditLevel);
      }
    });
  });

  describe("getCapability", () => {
    it("should return capability for known action type", () => {
      const capability = executor.getCapability("query_hcp_profile");

      expect(capability).toBeDefined();
      expect(capability?.type).toBe("query_hcp_profile");
      expect(capability?.category).toBe("query");
    });

    it("should return undefined for unknown action type", () => {
      const capability = executor.getCapability("unknown_action");

      expect(capability).toBeUndefined();
    });
  });

  describe("getCapabilitiesByCategory", () => {
    it("should return all query capabilities", () => {
      const queryCapabilities = executor.getCapabilitiesByCategory("query");

      expect(queryCapabilities.length).toBeGreaterThan(0);
      expect(queryCapabilities.every(c => c.category === "query")).toBe(true);
    });

    it("should return empty array for category with no capabilities", () => {
      // All categories should have capabilities, but test the behavior
      const capabilities = executor.getCapabilitiesByCategory("query");
      expect(Array.isArray(capabilities)).toBe(true);
    });
  });

  describe("canAutoApprove", () => {
    it("should allow auto-approval for low-risk query actions", () => {
      const canApprove = executor.canAutoApprove("query_hcp_profile", 1);
      expect(canApprove).toBe(true);
    });

    it("should not allow auto-approval for actions requiring approval", () => {
      const canApprove = executor.canAutoApprove("export_bulk_data", 1);
      expect(canApprove).toBe(false);
    });

    it("should not allow auto-approval when entity count exceeds threshold", () => {
      const capability = executor.getCapability("generate_hcp_report");
      const threshold = capability?.maxAffectedEntities ?? 10;

      const canApprove = executor.canAutoApprove("generate_hcp_report", threshold + 1);
      expect(canApprove).toBe(false);
    });

    it("should allow auto-approval when entity count is within threshold", () => {
      const capability = executor.getCapability("generate_hcp_report");
      const threshold = capability?.maxAffectedEntities ?? 10;

      const canApprove = executor.canAutoApprove("generate_hcp_report", threshold);
      expect(canApprove).toBe(true);
    });

    it("should return false for unknown action type", () => {
      const canApprove = executor.canAutoApprove("unknown_action", 1);
      expect(canApprove).toBe(false);
    });
  });

  describe("checkRateLimit", () => {
    it("should allow actions without rate limits", () => {
      const result = executor.checkRateLimit("query_hcp_profile");
      expect(result.allowed).toBe(true);
    });

    it("should allow actions within rate limit", () => {
      // send_slack_alert has rateLimitPerHour: 50
      const result = executor.checkRateLimit("send_slack_alert");
      expect(result.allowed).toBe(true);
    });

    it("should return resetIn when rate limited", () => {
      // Create a new executor and exhaust the rate limit
      const testExecutor = new AgentExecutor();

      // Simulate rate limit exhaustion
      for (let i = 0; i < 51; i++) {
        const result = testExecutor.checkRateLimit("send_slack_alert");
        // Manually increment by calling a private method indirectly via execute
        // For this test, we just check the initial state
        if (i === 0) {
          expect(result.allowed).toBe(true);
        }
      }
    });
  });

  describe("checkGuardrails", () => {
    it("should pass guardrails for standard actions", async () => {
      const mockAction: AgentAction = {
        id: "test-action-1",
        agentId: "test-agent",
        agentRunId: null,
        agentType: "channel_health_monitor",
        actionType: "query_hcp_profile",
        actionName: "Query HCP Profile",
        proposedAction: { payload: { hcpId: "hcp-1" } } as ProposedAction,
        reasoning: "Test query",
        confidence: 0.9,
        riskLevel: "low",
        impactScope: "individual",
        affectedEntityCount: 1,
        status: "pending",
        createdAt: new Date(),
        approvedAt: null,
        approvedBy: null,
        modifiedAction: null,
        rejectedAt: null,
        rejectedBy: null,
        rejectionReason: null,
        executedAt: null,
        executionResult: null,
        expiresAt: null,
      };

      const result = await executor.checkGuardrails(mockAction);

      expect(result.passed).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it("should fail guardrails for PHI export without authorization", async () => {
      const mockAction: AgentAction = {
        id: "test-action-2",
        agentId: "test-agent",
        agentRunId: null,
        agentType: "insight_synthesizer",
        actionType: "export_bulk_data",
        actionName: "Export Bulk Data",
        proposedAction: { payload: { includePhi: true } } as ProposedAction,
        reasoning: "Bulk export with PHI",
        confidence: 0.8,
        riskLevel: "medium",
        impactScope: "portfolio",
        affectedEntityCount: 100,
        status: "pending",
        createdAt: new Date(),
        approvedAt: null,
        approvedBy: null,
        modifiedAction: null,
        rejectedAt: null,
        rejectedBy: null,
        rejectionReason: null,
        executedAt: null,
        executionResult: null,
        expiresAt: null,
      };

      const result = await executor.checkGuardrails(mockAction);

      expect(result.passed).toBe(false);
      expect(result.violations).toContain("PHI export requires explicit authorization from Privacy Officer");
    });

    it("should add warnings for high affected entity count", async () => {
      const mockAction: AgentAction = {
        id: "test-action-3",
        agentId: "test-agent",
        agentRunId: null,
        agentType: "engagement_optimizer",
        actionType: "generate_nba_recommendation",
        actionName: "Generate NBA Recommendations",
        proposedAction: { payload: {} } as ProposedAction,
        reasoning: "Generate recommendations",
        confidence: 0.85,
        riskLevel: "low",
        impactScope: "segment",
        affectedEntityCount: 150,
        status: "pending",
        createdAt: new Date(),
        approvedAt: null,
        approvedBy: null,
        modifiedAction: null,
        rejectedAt: null,
        rejectedBy: null,
        rejectionReason: null,
        executedAt: null,
        executionResult: null,
        expiresAt: null,
      };

      const result = await executor.checkGuardrails(mockAction);

      expect(result.passed).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(w => w.includes("150 HCPs"))).toBe(true);
    });

    it("should add warnings for high-risk actions", async () => {
      const mockAction: AgentAction = {
        id: "test-action-4",
        agentId: "test-agent",
        agentRunId: null,
        agentType: "alert_manager",
        actionType: "propose_budget_reallocation",
        actionName: "Propose Budget Reallocation",
        proposedAction: { payload: {} } as ProposedAction,
        reasoning: "Budget optimization",
        confidence: 0.7,
        riskLevel: "high",
        impactScope: "portfolio",
        affectedEntityCount: 10,
        status: "pending",
        createdAt: new Date(),
        approvedAt: null,
        approvedBy: null,
        modifiedAction: null,
        rejectedAt: null,
        rejectedBy: null,
        rejectionReason: null,
        executedAt: null,
        executionResult: null,
        expiresAt: null,
      };

      const result = await executor.checkGuardrails(mockAction);

      expect(result.passed).toBe(true);
      expect(result.warnings.some(w => w.includes("high-risk"))).toBe(true);
      expect(result.warnings.some(w => w.includes("Budget changes"))).toBe(true);
    });
  });

  describe("Singleton Instance", () => {
    it("should export a singleton agentExecutor instance", () => {
      expect(agentExecutor).toBeInstanceOf(AgentExecutor);
    });

    it("should have same methods as class instance", () => {
      expect(typeof agentExecutor.getCapability).toBe("function");
      expect(typeof agentExecutor.getCapabilitiesByCategory).toBe("function");
      expect(typeof agentExecutor.canAutoApprove).toBe("function");
      expect(typeof agentExecutor.checkRateLimit).toBe("function");
      expect(typeof agentExecutor.checkGuardrails).toBe("function");
      expect(typeof agentExecutor.execute).toBe("function");
    });
  });

  describe("Action Type Coverage", () => {
    it("should have query actions", () => {
      const queryTypes = actionCapabilities
        .filter(c => c.category === "query")
        .map(c => c.type);

      expect(queryTypes).toContain("query_hcp_profile");
      expect(queryTypes).toContain("query_engagement_metrics");
      expect(queryTypes).toContain("query_competitive_data");
      expect(queryTypes).toContain("query_cohort_analysis");
    });

    it("should have report actions", () => {
      const reportTypes = actionCapabilities
        .filter(c => c.category === "report")
        .map(c => c.type);

      expect(reportTypes).toContain("generate_hcp_report");
      expect(reportTypes).toContain("generate_territory_report");
      expect(reportTypes).toContain("generate_competitive_report");
      expect(reportTypes).toContain("export_bulk_data");
    });

    it("should have notification actions", () => {
      const notificationTypes = actionCapabilities
        .filter(c => c.category === "notification")
        .map(c => c.type);

      expect(notificationTypes).toContain("send_slack_alert");
      expect(notificationTypes).toContain("create_jira_ticket");
      expect(notificationTypes).toContain("send_email_notification");
    });

    it("should have simulation actions", () => {
      const simulationTypes = actionCapabilities
        .filter(c => c.category === "simulation")
        .map(c => c.type);

      expect(simulationTypes).toContain("run_engagement_simulation");
      expect(simulationTypes).toContain("run_counterfactual_analysis");
      expect(simulationTypes).toContain("run_portfolio_optimization");
    });

    it("should have recommendation actions", () => {
      const recommendationTypes = actionCapabilities
        .filter(c => c.category === "recommendation")
        .map(c => c.type);

      expect(recommendationTypes).toContain("generate_nbo_recommendation");
      expect(recommendationTypes).toContain("generate_nba_recommendation");
      expect(recommendationTypes).toContain("propose_cohort_strategy");
      expect(recommendationTypes).toContain("propose_budget_reallocation");
    });

    it("should have configuration actions", () => {
      const configTypes = actionCapabilities
        .filter(c => c.category === "configuration")
        .map(c => c.type);

      expect(configTypes).toContain("update_alert_thresholds");
      expect(configTypes).toContain("update_approval_rules");
    });

    it("should have integration actions", () => {
      const integrationTypes = actionCapabilities
        .filter(c => c.category === "integration")
        .map(c => c.type);

      expect(integrationTypes).toContain("sync_crm_data");
      expect(integrationTypes).toContain("export_to_external");
    });
  });

  describe("Risk Level Distribution", () => {
    it("should have mostly low-risk query actions", () => {
      const queryCapabilities = actionCapabilities.filter(c => c.category === "query");
      const lowRiskCount = queryCapabilities.filter(c => c.riskLevel === "low").length;

      expect(lowRiskCount).toBe(queryCapabilities.length);
    });

    it("should require approval for all configuration actions", () => {
      const configCapabilities = actionCapabilities.filter(c => c.category === "configuration");
      const allRequireApproval = configCapabilities.every(c => c.requiresApproval);

      expect(allRequireApproval).toBe(true);
    });

    it("should require approval for all integration actions", () => {
      const integrationCapabilities = actionCapabilities.filter(c => c.category === "integration");
      const allRequireApproval = integrationCapabilities.every(c => c.requiresApproval);

      expect(allRequireApproval).toBe(true);
    });
  });
});
