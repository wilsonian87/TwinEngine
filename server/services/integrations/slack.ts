/**
 * Slack Integration Service
 *
 * Provides Slack messaging capabilities for TwinEngine.
 * Uses direct Slack Web API with MCP client wrapper for future compatibility.
 *
 * Features:
 * - Send messages to channels
 * - Format NBA recommendations as Slack blocks
 * - Health check for connection status
 * - Graceful fallback when credentials are missing
 */

import type {
  IntegrationConfig,
  SlackSendRequest,
  ActionExport,
  InsertActionExport,
} from "@shared/schema";
import { storage } from "../../storage";
import { MCPClient, createMCPClient } from "./mcp-client";

// Slack API response types
interface SlackApiResponse {
  ok: boolean;
  error?: string;
  ts?: string; // Message timestamp (acts as message ID)
  channel?: string;
}

// Slack message block types (subset of Block Kit)
export interface SlackBlock {
  type: "section" | "divider" | "header" | "context" | "actions";
  text?: {
    type: "plain_text" | "mrkdwn";
    text: string;
    emoji?: boolean;
  };
  fields?: Array<{
    type: "plain_text" | "mrkdwn";
    text: string;
  }>;
  elements?: Array<unknown>;
  accessory?: unknown;
}

// Send result
export interface SlackSendResult {
  success: boolean;
  messageTs?: string;
  channel?: string;
  error?: string;
  actionExportId?: string;
}

// Health check result
export interface SlackHealthCheckResult {
  healthy: boolean;
  botInfo?: {
    userId: string;
    teamId: string;
    botName: string;
  };
  error?: string;
  lastCheck: Date;
}

/**
 * Slack Integration Service
 *
 * Handles all Slack-related operations for TwinEngine.
 */
export class SlackIntegration {
  private config: IntegrationConfig;
  private mcpClient: MCPClient;
  private botToken?: string;

  constructor(config: IntegrationConfig) {
    this.config = config;
    this.mcpClient = createMCPClient(config);

    // Extract bot token from credentials
    if (config.credentials && typeof config.credentials === "object") {
      const creds = config.credentials as { type: string; botToken?: string };
      if (creds.type === "slack" && creds.botToken) {
        this.botToken = creds.botToken;
      }
    }
  }

  /**
   * Send a message to a Slack channel
   */
  async sendMessage(request: SlackSendRequest): Promise<SlackSendResult> {
    // Determine target channel
    const channel = request.channel || this.getDefaultChannel();

    if (!channel) {
      return {
        success: false,
        error: "No channel specified and no default channel configured",
      };
    }

    // Create action export record to track the operation
    const actionExport = await this.createExportRecord(request, channel);

    try {
      // Check if we have credentials
      if (!this.botToken) {
        // Development mode - simulate success
        console.log("[Slack] No bot token - simulating message send:", {
          channel,
          text: request.message.text.substring(0, 100) + "...",
        });

        await this.updateExportSuccess(actionExport.id, "dev-mode-ts", channel);

        return {
          success: true,
          messageTs: `dev-${Date.now()}`,
          channel,
          actionExportId: actionExport.id,
        };
      }

      // Build the message payload
      const payload = this.buildMessagePayload(channel, request.message);

      // Send via Slack API
      const result = await this.callSlackApi("chat.postMessage", payload);

      if (result.ok) {
        await this.updateExportSuccess(actionExport.id, result.ts || "", channel);

        return {
          success: true,
          messageTs: result.ts,
          channel: result.channel,
          actionExportId: actionExport.id,
        };
      } else {
        await this.updateExportFailure(actionExport.id, result.error || "Unknown Slack error");

        return {
          success: false,
          error: result.error || "Unknown Slack error",
          actionExportId: actionExport.id,
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      await this.updateExportFailure(actionExport.id, errorMessage);

      return {
        success: false,
        error: errorMessage,
        actionExportId: actionExport.id,
      };
    }
  }

  /**
   * Check if Slack connection is healthy
   */
  async healthCheck(): Promise<SlackHealthCheckResult> {
    if (!this.botToken) {
      return {
        healthy: false,
        error: "No bot token configured",
        lastCheck: new Date(),
      };
    }

    try {
      const result = await this.callSlackApi("auth.test", {});

      if (result.ok) {
        // Update integration status to active
        await storage.updateIntegrationStatus(this.config.id, "active");

        return {
          healthy: true,
          botInfo: {
            userId: (result as any).user_id,
            teamId: (result as any).team_id,
            botName: (result as any).user,
          },
          lastCheck: new Date(),
        };
      } else {
        await storage.updateIntegrationStatus(this.config.id, "error", result.error);

        return {
          healthy: false,
          error: result.error,
          lastCheck: new Date(),
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      await storage.updateIntegrationStatus(this.config.id, "error", errorMessage);

      return {
        healthy: false,
        error: errorMessage,
        lastCheck: new Date(),
      };
    }
  }

  /**
   * Format an NBA recommendation as Slack blocks
   */
  formatNBAAsBlocks(nba: {
    hcpName: string;
    recommendedChannel: string;
    reasoning: string;
    confidence: number;
    urgency?: string;
  }): SlackBlock[] {
    const confidenceEmoji = nba.confidence >= 80 ? ":white_check_mark:" : nba.confidence >= 60 ? ":large_yellow_circle:" : ":red_circle:";
    const urgencyEmoji = nba.urgency === "high" ? ":rotating_light:" : nba.urgency === "medium" ? ":clock3:" : "";

    return [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `${urgencyEmoji} Next Best Action Recommendation`,
          emoji: true,
        },
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*HCP:*\n${nba.hcpName}`,
          },
          {
            type: "mrkdwn",
            text: `*Recommended Channel:*\n${nba.recommendedChannel}`,
          },
          {
            type: "mrkdwn",
            text: `*Confidence:*\n${confidenceEmoji} ${nba.confidence}%`,
          },
        ],
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Reasoning:*\n${nba.reasoning}`,
        },
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `Sent from TwinEngine | ${new Date().toLocaleString()}`,
          },
        ],
      } as SlackBlock,
    ];
  }

  /**
   * Format multiple NBAs as a summary message
   */
  formatNBASummaryAsBlocks(nbas: Array<{
    hcpName: string;
    recommendedChannel: string;
    confidence: number;
  }>, audienceName?: string): SlackBlock[] {
    const blocks: SlackBlock[] = [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `:clipboard: NBA Summary${audienceName ? ` - ${audienceName}` : ""}`,
          emoji: true,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*${nbas.length} recommendations* exported from TwinEngine:`,
        },
      },
      {
        type: "divider",
      },
    ];

    // Add up to 10 NBAs as fields
    const displayNbas = nbas.slice(0, 10);
    for (const nba of displayNbas) {
      blocks.push({
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*${nba.hcpName}*`,
          },
          {
            type: "mrkdwn",
            text: `${nba.recommendedChannel} (${nba.confidence}%)`,
          },
        ],
      });
    }

    if (nbas.length > 10) {
      blocks.push({
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `_...and ${nbas.length - 10} more recommendations_`,
          },
        ],
      } as SlackBlock);
    }

    blocks.push({
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `Exported from TwinEngine | ${new Date().toLocaleString()}`,
        },
      ],
    } as SlackBlock);

    return blocks;
  }

  /**
   * Get the default channel from configuration
   */
  private getDefaultChannel(): string | undefined {
    if (this.config.credentials && typeof this.config.credentials === "object") {
      const creds = this.config.credentials as { defaultChannel?: string };
      return creds.defaultChannel;
    }
    return undefined;
  }

  /**
   * Build the Slack API payload for posting a message
   */
  private buildMessagePayload(
    channel: string,
    message: SlackSendRequest["message"]
  ): Record<string, unknown> {
    const payload: Record<string, unknown> = {
      channel,
      text: message.text,
    };

    if (message.blocks) {
      payload.blocks = message.blocks;
    }

    if (message.attachments) {
      payload.attachments = message.attachments;
    }

    return payload;
  }

  /**
   * Make a call to the Slack Web API
   */
  private async callSlackApi(
    method: string,
    payload: Record<string, unknown>
  ): Promise<SlackApiResponse> {
    if (!this.botToken) {
      return { ok: false, error: "No bot token configured" };
    }

    try {
      const response = await fetch(`https://slack.com/api/${method}`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.botToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        return {
          ok: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      return await response.json() as SlackApiResponse;
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Network error",
      };
    }
  }

  /**
   * Create an action export record for tracking
   */
  private async createExportRecord(
    request: SlackSendRequest,
    channel: string
  ): Promise<ActionExport> {
    const exportData: InsertActionExport = {
      sourceType: request.sourceType,
      sourceId: request.sourceId,
      integrationId: this.config.id,
      destinationType: "slack_message",
      payload: {
        channel,
        text: request.message.text,
        hasBlocks: !!request.message.blocks,
      },
      status: "pending",
    };

    return storage.createActionExport(exportData);
  }

  /**
   * Update export record on success
   */
  private async updateExportSuccess(
    exportId: string,
    messageTs: string,
    channel: string
  ): Promise<void> {
    const slackUrl = `https://slack.com/archives/${channel}/p${messageTs.replace(".", "")}`;
    await storage.updateActionExportStatus(exportId, "success", messageTs, slackUrl);
  }

  /**
   * Update export record on failure
   */
  private async updateExportFailure(exportId: string, error: string): Promise<void> {
    await storage.updateActionExportStatus(exportId, "failed", undefined, undefined, error);
  }
}

/**
 * Factory function to create a Slack integration from config
 */
export function createSlackIntegration(config: IntegrationConfig): SlackIntegration {
  if (config.type !== "slack") {
    throw new Error(`Invalid integration type: ${config.type}. Expected 'slack'.`);
  }
  return new SlackIntegration(config);
}

/**
 * Get or create a Slack integration instance
 */
export async function getSlackIntegration(): Promise<SlackIntegration | null> {
  const config = await storage.getIntegrationByType("slack");
  if (!config) {
    return null;
  }
  return new SlackIntegration(config);
}

/**
 * Check if Slack integration is configured
 */
export async function isSlackConfigured(): Promise<boolean> {
  const config = await storage.getIntegrationByType("slack");
  return config !== undefined && config.status === "active";
}
