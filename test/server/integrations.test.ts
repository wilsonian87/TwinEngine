/**
 * Integration Service Tests
 *
 * Tests for Phase 6A: Integration Foundation
 * - Slack integration service
 * - Jira integration service
 * - Integration storage methods
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  SlackIntegration,
  createSlackIntegration,
} from "../../server/services/integrations/slack";
import {
  JiraIntegration,
  createJiraIntegration,
  defaultTicketTemplates,
} from "../../server/services/integrations/jira";
import type { IntegrationConfig } from "@shared/schema";

// Mock fetch for Slack API calls
global.fetch = vi.fn();

// Mock the storage module to avoid database access in unit tests
vi.mock("../../server/storage", () => ({
  storage: {
    createActionExport: vi.fn().mockResolvedValue({
      id: "mock-export-id",
      sourceType: "test",
      sourceId: "test-123",
      integrationId: "mock-integration-id",
      destinationType: "slack_message",
      status: "pending",
      payload: {},
      exportedAt: new Date(),
      completedAt: null,
      destinationRef: null,
      destinationUrl: null,
      errorMessage: null,
    }),
    updateActionExportStatus: vi.fn().mockResolvedValue({}),
    updateIntegrationStatus: vi.fn().mockResolvedValue({}),
  },
}));

describe("Integration Services", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Slack Integration", () => {
    const mockConfig: IntegrationConfig = {
      id: "slack-test-id",
      type: "slack",
      name: "Test Slack",
      description: null,
      credentials: {
        type: "slack",
        botToken: "xoxb-test-token",
        defaultChannel: "#general",
      },
      mcpEndpoint: null,
      status: "active",
      defaultSettings: null,
      lastHealthCheck: null,
      lastError: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    describe("SlackIntegration", () => {
      it("should create a Slack integration", () => {
        const slack = new SlackIntegration(mockConfig);
        expect(slack).toBeDefined();
      });

      it("should format NBA as Slack blocks", () => {
        const slack = new SlackIntegration(mockConfig);
        const blocks = slack.formatNBAAsBlocks({
          hcpName: "Dr. Smith",
          recommendedChannel: "Email",
          reasoning: "High email engagement rate",
          confidence: 85,
          urgency: "high",
        });

        expect(Array.isArray(blocks)).toBe(true);
        expect(blocks.length).toBeGreaterThan(0);
        expect(blocks[0].type).toBe("header");
      });

      it("should format NBA summary as Slack blocks", () => {
        const slack = new SlackIntegration(mockConfig);
        const nbas = [
          { hcpName: "Dr. Smith", recommendedChannel: "Email", confidence: 85 },
          { hcpName: "Dr. Jones", recommendedChannel: "Phone", confidence: 70 },
        ];

        const blocks = slack.formatNBASummaryAsBlocks(nbas, "High Value HCPs");

        expect(Array.isArray(blocks)).toBe(true);
        expect(blocks[0].type).toBe("header");
        expect(JSON.stringify(blocks)).toContain("High Value HCPs");
      });

      it("should limit summary blocks to 10 NBAs", () => {
        const slack = new SlackIntegration(mockConfig);
        const nbas = Array.from({ length: 15 }, (_, i) => ({
          hcpName: `Dr. Test ${i}`,
          recommendedChannel: "Email",
          confidence: 80,
        }));

        const blocks = slack.formatNBASummaryAsBlocks(nbas);

        // Should have context block about remaining items
        const contextBlock = blocks.find(
          (b) =>
            b.type === "context" &&
            JSON.stringify(b).includes("5 more recommendations")
        );
        expect(contextBlock).toBeDefined();
      });
    });

    describe("createSlackIntegration", () => {
      it("should create Slack integration from config", () => {
        const slack = createSlackIntegration(mockConfig);
        expect(slack).toBeInstanceOf(SlackIntegration);
      });

      it("should throw error for non-Slack config", () => {
        const jiraConfig = { ...mockConfig, type: "jira" };
        expect(() => createSlackIntegration(jiraConfig)).toThrow(
          "Invalid integration type"
        );
      });
    });

    describe("sendMessage", () => {
      it("should simulate sending message without credentials in dev mode", async () => {
        // Config without bot token
        const devConfig: IntegrationConfig = {
          ...mockConfig,
          credentials: { type: "slack" },
        };

        const slack = new SlackIntegration(devConfig);

        const result = await slack.sendMessage({
          integrationId: devConfig.id,
          message: { text: "Test message" },
          sourceType: "test",
          sourceId: "test-123",
          channel: "#test",
        });

        // Dev mode returns simulated success without calling Slack API
        expect(result.success).toBe(true);
        expect(result.messageTs).toContain("dev-");
      });

      it("should return error when no channel specified and no default", async () => {
        const noDefaultConfig: IntegrationConfig = {
          ...mockConfig,
          credentials: { type: "slack", botToken: "xoxb-test" },
        };

        const slack = new SlackIntegration(noDefaultConfig);

        const result = await slack.sendMessage({
          integrationId: noDefaultConfig.id,
          message: { text: "Test message" },
          sourceType: "test",
          sourceId: "test-123",
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain("No channel specified");
      });

      it("should call Slack API when credentials are present", async () => {
        const mockFetch = vi.mocked(fetch);
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ ok: true, ts: "12345.67890", channel: "C123" }),
        } as Response);

        const slack = new SlackIntegration(mockConfig);

        const result = await slack.sendMessage({
          integrationId: mockConfig.id,
          message: { text: "Test message" },
          sourceType: "nba",
          sourceId: "nba-123",
          channel: "#general",
        });

        expect(mockFetch).toHaveBeenCalledWith(
          "https://slack.com/api/chat.postMessage",
          expect.objectContaining({
            method: "POST",
            headers: expect.objectContaining({
              Authorization: "Bearer xoxb-test-token",
            }),
          })
        );

        expect(result.success).toBe(true);
        expect(result.messageTs).toBe("12345.67890");
      });

      it("should handle Slack API error response", async () => {
        const mockFetch = vi.mocked(fetch);
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ ok: false, error: "channel_not_found" }),
        } as Response);

        const slack = new SlackIntegration(mockConfig);

        const result = await slack.sendMessage({
          integrationId: mockConfig.id,
          message: { text: "Test" },
          sourceType: "test",
          sourceId: "test-123",
          channel: "#nonexistent",
        });

        expect(result.success).toBe(false);
        expect(result.error).toBe("channel_not_found");
      });

      it("should handle network errors", async () => {
        const mockFetch = vi.mocked(fetch);
        mockFetch.mockRejectedValueOnce(new Error("Network error"));

        const slack = new SlackIntegration(mockConfig);

        const result = await slack.sendMessage({
          integrationId: mockConfig.id,
          message: { text: "Test" },
          sourceType: "test",
          sourceId: "test-123",
          channel: "#general",
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain("Network error");
      });
    });

    describe("healthCheck", () => {
      it("should return unhealthy when no bot token", async () => {
        const noTokenConfig: IntegrationConfig = {
          ...mockConfig,
          credentials: { type: "slack" },
        };

        const slack = new SlackIntegration(noTokenConfig);
        const result = await slack.healthCheck();

        expect(result.healthy).toBe(false);
        expect(result.error).toContain("No bot token");
      });

      it("should call auth.test endpoint", async () => {
        const mockFetch = vi.mocked(fetch);
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            ok: true,
            user_id: "U123",
            team_id: "T123",
            user: "twinengine-bot",
          }),
        } as Response);

        const slack = new SlackIntegration(mockConfig);
        const result = await slack.healthCheck();

        expect(mockFetch).toHaveBeenCalledWith(
          "https://slack.com/api/auth.test",
          expect.any(Object)
        );

        expect(result.healthy).toBe(true);
        expect(result.botInfo).toBeDefined();
        expect(result.botInfo?.botName).toBe("twinengine-bot");
      });

      it("should handle auth.test failure", async () => {
        const mockFetch = vi.mocked(fetch);
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ ok: false, error: "invalid_auth" }),
        } as Response);

        const slack = new SlackIntegration(mockConfig);
        const result = await slack.healthCheck();

        expect(result.healthy).toBe(false);
        expect(result.error).toBe("invalid_auth");
      });
    });
  });

  describe("Jira Integration", () => {
    const mockJiraConfig: IntegrationConfig = {
      id: "jira-test-id",
      type: "jira",
      name: "Test Jira",
      description: null,
      credentials: {
        type: "jira",
        baseUrl: "https://test.atlassian.net",
        email: "test@example.com",
        apiToken: "test-token",
      },
      mcpEndpoint: null,
      status: "active",
      defaultSettings: null,
      lastHealthCheck: null,
      lastError: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    describe("JiraIntegration", () => {
      it("should create a Jira integration", () => {
        const jira = new JiraIntegration(mockJiraConfig);
        expect(jira).toBeDefined();
      });

      it("should format NBA as Jira issue request", () => {
        const jira = new JiraIntegration(mockJiraConfig);
        const nba = {
          hcpId: "hcp-123",
          hcpName: "Dr. Smith",
          recommendedChannel: "email" as const,
          actionType: "reach_out",
          urgency: "high",
          confidence: 85,
          reasoning: "High email engagement rate",
          suggestedTiming: "Morning - 9 AM to 11 AM",
          metrics: {
            channelScore: 75,
            responseRate: 42,
            lastContactDays: 14,
          },
        };

        const issueRequest = jira.formatNBAAsIssue(nba, "TWIN");

        expect(issueRequest.projectKey).toBe("TWIN");
        expect(issueRequest.issueType).toBe("Task");
        expect(issueRequest.summary).toContain("NBA");
        expect(issueRequest.summary).toContain("Dr. Smith");
        expect(issueRequest.description).toContain("Dr. Smith");
        expect(issueRequest.description).toContain("85%");
        expect(issueRequest.labels).toContain("twinengine");
        expect(issueRequest.labels).toContain("nba");
        expect(issueRequest.sourceType).toBe("nba");
        expect(issueRequest.sourceId).toBe("hcp-123");
      });

      it("should format simulation as Jira issue request", () => {
        const jira = new JiraIntegration(mockJiraConfig);
        const simulation = {
          id: "sim-123",
          scenarioName: "Q1 Campaign",
          predictedEngagementRate: 65.5,
          predictedResponseRate: 32.1,
          predictedRxLift: 8.5,
          predictedReach: 1500,
          costPerEngagement: 2.5,
          efficiencyScore: 78,
          vsBaseline: {
            engagement: "+5.2%",
            response: "+3.1%",
            rxVolume: "+2.0%",
          },
          runAt: new Date().toISOString(),
        };

        const issueRequest = jira.formatSimulationAsIssue(simulation, "MKT");

        expect(issueRequest.projectKey).toBe("MKT");
        expect(issueRequest.issueType).toBe("Task");
        expect(issueRequest.summary).toContain("Simulation");
        expect(issueRequest.summary).toContain("Q1 Campaign");
        expect(issueRequest.description).toContain("65.5%");
        expect(issueRequest.description).toContain("8.5%");
        expect(issueRequest.labels).toContain("twinengine");
        expect(issueRequest.labels).toContain("simulation");
        expect(issueRequest.sourceType).toBe("simulation");
        expect(issueRequest.sourceId).toBe("sim-123");
      });

      it("should map urgency to priority correctly", () => {
        const jira = new JiraIntegration(mockJiraConfig);

        const highUrgencyNBA = {
          hcpId: "hcp-1",
          hcpName: "Dr. A",
          recommendedChannel: "email" as const,
          actionType: "reach_out",
          urgency: "high",
          confidence: 80,
          reasoning: "Test",
          suggestedTiming: "Morning",
          metrics: { channelScore: 70, responseRate: 40 },
        };

        const lowUrgencyNBA = {
          ...highUrgencyNBA,
          hcpId: "hcp-2",
          hcpName: "Dr. B",
          urgency: "low",
        };

        const highResult = jira.formatNBAAsIssue(highUrgencyNBA, "TWIN");
        const lowResult = jira.formatNBAAsIssue(lowUrgencyNBA, "TWIN");

        expect(highResult.priority).toBe("High");
        expect(lowResult.priority).toBe("Low");
      });
    });

    describe("createJiraIntegration", () => {
      it("should create Jira integration from config", () => {
        const jira = createJiraIntegration(mockJiraConfig);
        expect(jira).toBeInstanceOf(JiraIntegration);
      });

      it("should throw error for non-Jira config", () => {
        const slackConfig = { ...mockJiraConfig, type: "slack" };
        expect(() => createJiraIntegration(slackConfig)).toThrow(
          "Invalid integration type"
        );
      });
    });

    describe("createIssue", () => {
      it("should simulate creating issue without credentials in dev mode", async () => {
        // Config without credentials
        const devConfig: IntegrationConfig = {
          ...mockJiraConfig,
          credentials: { type: "jira" },
        };

        const jira = new JiraIntegration(devConfig);

        const result = await jira.createIssue({
          integrationId: devConfig.id,
          projectKey: "TWIN",
          issueType: "Task",
          summary: "Test issue",
          description: "Test description",
          sourceType: "test",
          sourceId: "test-123",
        });

        // Dev mode returns simulated success without calling Jira API
        expect(result.success).toBe(true);
        expect(result.issueKey).toContain("TWIN-");
        expect(result.issueId).toContain("dev-");
      });

      it("should call Jira API when credentials are present", async () => {
        const mockFetch = vi.mocked(fetch);
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            key: "TWIN-123",
            id: "12345",
            self: "https://test.atlassian.net/rest/api/3/issue/12345",
          }),
        } as Response);

        const jira = new JiraIntegration(mockJiraConfig);

        const result = await jira.createIssue({
          integrationId: mockJiraConfig.id,
          projectKey: "TWIN",
          issueType: "Task",
          summary: "Test issue",
          description: "Test description",
          sourceType: "nba",
          sourceId: "nba-123",
        });

        expect(mockFetch).toHaveBeenCalledWith(
          "https://test.atlassian.net/rest/api/3/issue",
          expect.objectContaining({
            method: "POST",
            headers: expect.objectContaining({
              "Content-Type": "application/json",
            }),
          })
        );

        expect(result.success).toBe(true);
        expect(result.issueKey).toBe("TWIN-123");
        expect(result.issueUrl).toContain("browse/TWIN-123");
      });

      it("should handle Jira API error response", async () => {
        const mockFetch = vi.mocked(fetch);
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            errorMessages: ["Project does not exist"],
            errors: {},
          }),
        } as Response);

        const jira = new JiraIntegration(mockJiraConfig);

        const result = await jira.createIssue({
          integrationId: mockJiraConfig.id,
          projectKey: "INVALID",
          issueType: "Task",
          summary: "Test",
          sourceType: "test",
          sourceId: "test-123",
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain("Project does not exist");
      });

      it("should handle network errors", async () => {
        const mockFetch = vi.mocked(fetch);
        mockFetch.mockRejectedValueOnce(new Error("Network error"));

        const jira = new JiraIntegration(mockJiraConfig);

        const result = await jira.createIssue({
          integrationId: mockJiraConfig.id,
          projectKey: "TWIN",
          issueType: "Task",
          summary: "Test",
          sourceType: "test",
          sourceId: "test-123",
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain("Network error");
      });
    });

    describe("getIssue", () => {
      it("should return mock issue in dev mode", async () => {
        const devConfig: IntegrationConfig = {
          ...mockJiraConfig,
          credentials: { type: "jira" },
        };

        const jira = new JiraIntegration(devConfig);
        const result = await jira.getIssue("TWIN-123");

        expect(result.success).toBe(true);
        expect(result.issue).toBeDefined();
        expect(result.issue?.key).toBe("TWIN-123");
        expect(result.issue?.fields.status.name).toBe("To Do");
      });

      it("should call Jira API when credentials are present", async () => {
        const mockFetch = vi.mocked(fetch);
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: "12345",
            key: "TWIN-123",
            self: "https://test.atlassian.net/rest/api/3/issue/12345",
            fields: {
              summary: "Test issue",
              status: { name: "In Progress", statusCategory: { key: "indeterminate", name: "In Progress" } },
              issuetype: { name: "Task" },
              created: new Date().toISOString(),
              updated: new Date().toISOString(),
            },
          }),
        } as Response);

        const jira = new JiraIntegration(mockJiraConfig);
        const result = await jira.getIssue("TWIN-123");

        expect(mockFetch).toHaveBeenCalledWith(
          "https://test.atlassian.net/rest/api/3/issue/TWIN-123",
          expect.any(Object)
        );

        expect(result.success).toBe(true);
        expect(result.issue?.key).toBe("TWIN-123");
      });
    });

    describe("updateIssue", () => {
      it("should simulate update in dev mode", async () => {
        const devConfig: IntegrationConfig = {
          ...mockJiraConfig,
          credentials: { type: "jira" },
        };

        const jira = new JiraIntegration(devConfig);

        const result = await jira.updateIssue({
          integrationId: devConfig.id,
          issueKey: "TWIN-123",
          fields: { summary: "Updated summary" },
        });

        // Dev mode returns simulated success without calling Jira API
        expect(result.success).toBe(true);
        expect(result.issueKey).toBe("TWIN-123");
      });

      it("should call Jira API when credentials are present", async () => {
        const mockFetch = vi.mocked(fetch);
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 204,
          json: async () => ({}),
        } as Response);

        const jira = new JiraIntegration(mockJiraConfig);

        const result = await jira.updateIssue({
          integrationId: mockJiraConfig.id,
          issueKey: "TWIN-123",
          fields: { summary: "Updated summary" },
        });

        expect(mockFetch).toHaveBeenCalledWith(
          "https://test.atlassian.net/rest/api/3/issue/TWIN-123",
          expect.objectContaining({
            method: "PUT",
          })
        );

        expect(result.success).toBe(true);
      });
    });

    describe("healthCheck", () => {
      it("should return unhealthy when no credentials", async () => {
        const noCredsConfig: IntegrationConfig = {
          ...mockJiraConfig,
          credentials: { type: "jira" },
        };

        const jira = new JiraIntegration(noCredsConfig);
        const result = await jira.healthCheck();

        expect(result.healthy).toBe(false);
        expect(result.error).toContain("credentials not configured");
      });

      it("should call serverInfo endpoint", async () => {
        const mockFetch = vi.mocked(fetch);
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            baseUrl: "https://test.atlassian.net",
            version: "9.0.0",
            serverTitle: "Test Jira",
          }),
        } as Response);

        const jira = new JiraIntegration(mockJiraConfig);
        const result = await jira.healthCheck();

        expect(mockFetch).toHaveBeenCalledWith(
          "https://test.atlassian.net/rest/api/3/serverInfo",
          expect.any(Object)
        );

        expect(result.healthy).toBe(true);
        expect(result.serverInfo).toBeDefined();
      });
    });

    describe("getProjects", () => {
      it("should return mock projects in dev mode", async () => {
        const devConfig: IntegrationConfig = {
          ...mockJiraConfig,
          credentials: { type: "jira" },
        };

        const jira = new JiraIntegration(devConfig);
        const projects = await jira.getProjects();

        expect(projects.length).toBeGreaterThan(0);
        expect(projects[0]).toHaveProperty("key");
        expect(projects[0]).toHaveProperty("name");
      });

      it("should call Jira API when credentials are present", async () => {
        const mockFetch = vi.mocked(fetch);
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            values: [
              { key: "TWIN", name: "TwinEngine" },
              { key: "MKT", name: "Marketing" },
            ],
          }),
        } as Response);

        const jira = new JiraIntegration(mockJiraConfig);
        const projects = await jira.getProjects();

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining("/rest/api/3/project/search"),
          expect.any(Object)
        );

        expect(projects.length).toBe(2);
        expect(projects[0].key).toBe("TWIN");
      });
    });

    describe("getIssueTypes", () => {
      it("should return common issue types in dev mode", async () => {
        const devConfig: IntegrationConfig = {
          ...mockJiraConfig,
          credentials: { type: "jira" },
        };

        const jira = new JiraIntegration(devConfig);
        const issueTypes = await jira.getIssueTypes("TWIN");

        expect(issueTypes.length).toBeGreaterThan(0);
        expect(issueTypes.find((t) => t.name === "Task")).toBeDefined();
        expect(issueTypes.find((t) => t.name === "Bug")).toBeDefined();
      });
    });

    describe("defaultTicketTemplates", () => {
      it("should have NBA action template", () => {
        expect(defaultTicketTemplates.nba_action).toBeDefined();
        expect(defaultTicketTemplates.nba_action.type).toBe("nba_action");
        expect(defaultTicketTemplates.nba_action.issueType).toBe("Task");
        expect(defaultTicketTemplates.nba_action.summaryTemplate).toContain("NBA");
      });

      it("should have simulation result template", () => {
        expect(defaultTicketTemplates.simulation_result).toBeDefined();
        expect(defaultTicketTemplates.simulation_result.type).toBe("simulation_result");
        expect(defaultTicketTemplates.simulation_result.issueType).toBe("Task");
        expect(defaultTicketTemplates.simulation_result.summaryTemplate).toContain("Simulation");
      });

      it("should have channel alert template", () => {
        expect(defaultTicketTemplates.channel_alert).toBeDefined();
        expect(defaultTicketTemplates.channel_alert.type).toBe("channel_alert");
        expect(defaultTicketTemplates.channel_alert.issueType).toBe("Bug");
        expect(defaultTicketTemplates.channel_alert.defaultPriority).toBe("High");
      });

      it("should have custom template", () => {
        expect(defaultTicketTemplates.custom).toBeDefined();
        expect(defaultTicketTemplates.custom.type).toBe("custom");
      });
    });
  });
});
