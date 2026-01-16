/**
 * MCP (Model Context Protocol) Client Wrapper
 *
 * Provides a generic interface for MCP-compatible integrations.
 * Falls back to direct API calls when MCP servers are not available.
 *
 * MCP is an emerging standard for AI-to-tool communication.
 * See: https://modelcontextprotocol.io/
 */

import type { IntegrationConfig, IntegrationType } from "@shared/schema";

// MCP Tool definition
export interface MCPTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

// MCP Tool call result
export interface MCPToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

// Connection status
export interface MCPConnectionStatus {
  connected: boolean;
  serverVersion?: string;
  availableTools?: MCPTool[];
  lastCheck: Date;
  error?: string;
}

/**
 * Generic MCP Client that wraps MCP protocol communication.
 *
 * In Phase 6A, this provides a foundation for MCP integration.
 * Currently implements direct API fallback since most MCP servers
 * are still in development.
 *
 * Future enhancements:
 * - Full MCP protocol implementation when servers mature
 * - Auto-discovery of MCP server capabilities
 * - Connection pooling for high-volume operations
 */
export class MCPClient {
  private endpoint?: string;
  private connected: boolean = false;
  private tools: MCPTool[] = [];
  private integrationType: IntegrationType;

  constructor(
    integrationType: IntegrationType,
    endpoint?: string
  ) {
    this.integrationType = integrationType;
    this.endpoint = endpoint;
  }

  /**
   * Connect to an MCP server (placeholder for future MCP implementation)
   *
   * Currently logs connection attempt and returns success for local testing.
   * Will implement actual MCP handshake when servers are available.
   */
  async connect(): Promise<MCPConnectionStatus> {
    try {
      if (!this.endpoint) {
        // No MCP endpoint - will use direct API fallback
        return {
          connected: false,
          lastCheck: new Date(),
          error: "No MCP endpoint configured - using direct API",
        };
      }

      // TODO: Implement actual MCP protocol handshake
      // For now, simulate successful connection for development
      console.log(`[MCP] Attempting connection to ${this.integrationType} at ${this.endpoint}`);

      // In production, this would:
      // 1. Open WebSocket/HTTP connection to MCP server
      // 2. Perform capability negotiation
      // 3. Retrieve available tools

      this.connected = true;
      return {
        connected: true,
        serverVersion: "1.0.0",
        availableTools: this.tools,
        lastCheck: new Date(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown connection error";
      return {
        connected: false,
        lastCheck: new Date(),
        error: errorMessage,
      };
    }
  }

  /**
   * Disconnect from MCP server
   */
  async disconnect(): Promise<void> {
    this.connected = false;
    console.log(`[MCP] Disconnected from ${this.integrationType}`);
  }

  /**
   * List available tools from the MCP server
   */
  async listTools(): Promise<MCPTool[]> {
    if (!this.connected) {
      console.log(`[MCP] Not connected to ${this.integrationType} - returning empty tool list`);
      return [];
    }

    // TODO: Query actual tools from MCP server
    // For now, return tools based on integration type
    return this.getDefaultToolsForType(this.integrationType);
  }

  /**
   * Call a tool on the MCP server
   */
  async callTool(toolName: string, params: Record<string, unknown>): Promise<MCPToolResult> {
    if (!this.connected && this.endpoint) {
      return {
        success: false,
        error: "Not connected to MCP server",
      };
    }

    try {
      // TODO: Implement actual MCP tool call
      console.log(`[MCP] Calling tool ${toolName} on ${this.integrationType}`, params);

      // Return placeholder result for development
      return {
        success: true,
        data: {
          message: `Tool ${toolName} called successfully`,
          params,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Check if MCP connection is healthy
   */
  async healthCheck(): Promise<MCPConnectionStatus> {
    if (!this.connected) {
      return this.connect();
    }

    // TODO: Implement actual health check
    return {
      connected: this.connected,
      lastCheck: new Date(),
    };
  }

  /**
   * Get connection status without attempting to reconnect
   */
  getStatus(): MCPConnectionStatus {
    return {
      connected: this.connected,
      availableTools: this.tools,
      lastCheck: new Date(),
    };
  }

  /**
   * Get default tools based on integration type.
   * These represent the expected capabilities of each integration.
   */
  private getDefaultToolsForType(type: IntegrationType): MCPTool[] {
    const toolDefinitions: Record<IntegrationType, MCPTool[]> = {
      slack: [
        {
          name: "send_message",
          description: "Send a message to a Slack channel",
          inputSchema: {
            type: "object",
            properties: {
              channel: { type: "string", description: "Channel ID or name" },
              text: { type: "string", description: "Message text" },
              blocks: { type: "array", description: "Slack Block Kit blocks" },
            },
            required: ["channel", "text"],
          },
        },
        {
          name: "list_channels",
          description: "List available Slack channels",
          inputSchema: {
            type: "object",
            properties: {
              types: { type: "string", description: "Channel types to list" },
            },
          },
        },
      ],
      jira: [
        {
          name: "create_issue",
          description: "Create a new Jira issue",
          inputSchema: {
            type: "object",
            properties: {
              summary: { type: "string" },
              description: { type: "string" },
              issueType: { type: "string" },
              projectKey: { type: "string" },
            },
            required: ["summary", "projectKey"],
          },
        },
        {
          name: "get_issue",
          description: "Get a Jira issue by key",
          inputSchema: {
            type: "object",
            properties: {
              issueKey: { type: "string" },
            },
            required: ["issueKey"],
          },
        },
        {
          name: "update_issue",
          description: "Update a Jira issue",
          inputSchema: {
            type: "object",
            properties: {
              issueKey: { type: "string" },
              fields: { type: "object" },
            },
            required: ["issueKey"],
          },
        },
      ],
      teams: [
        {
          name: "send_message",
          description: "Send a message to a Teams channel",
          inputSchema: {
            type: "object",
            properties: {
              teamId: { type: "string" },
              channelId: { type: "string" },
              content: { type: "string" },
            },
            required: ["teamId", "channelId", "content"],
          },
        },
      ],
      box: [
        {
          name: "upload_file",
          description: "Upload a file to Box",
          inputSchema: {
            type: "object",
            properties: {
              folderId: { type: "string" },
              fileName: { type: "string" },
              content: { type: "string" },
            },
            required: ["folderId", "fileName", "content"],
          },
        },
        {
          name: "create_folder",
          description: "Create a folder in Box",
          inputSchema: {
            type: "object",
            properties: {
              parentId: { type: "string" },
              name: { type: "string" },
            },
            required: ["parentId", "name"],
          },
        },
      ],
      confluence: [
        {
          name: "create_page",
          description: "Create a Confluence page",
          inputSchema: {
            type: "object",
            properties: {
              spaceKey: { type: "string" },
              title: { type: "string" },
              content: { type: "string" },
            },
            required: ["spaceKey", "title", "content"],
          },
        },
      ],
      veeva: [
        {
          name: "get_hcp",
          description: "Get HCP information from Veeva CRM",
          inputSchema: {
            type: "object",
            properties: {
              hcpId: { type: "string" },
            },
            required: ["hcpId"],
          },
        },
      ],
      email: [
        {
          name: "send_email",
          description: "Send an email",
          inputSchema: {
            type: "object",
            properties: {
              to: { type: "array", items: { type: "string" } },
              subject: { type: "string" },
              body: { type: "string" },
              html: { type: "boolean" },
            },
            required: ["to", "subject", "body"],
          },
        },
      ],
    };

    return toolDefinitions[type] || [];
  }
}

/**
 * Factory function to create MCP clients for different integration types
 */
export function createMCPClient(config: IntegrationConfig): MCPClient {
  return new MCPClient(
    config.type as IntegrationType,
    config.mcpEndpoint || undefined
  );
}

/**
 * Check if an integration supports MCP
 * Returns true if MCP is the preferred protocol for this integration
 */
export function supportsMCP(integrationType: IntegrationType): boolean {
  // Current MCP availability status
  // This will evolve as MCP ecosystem matures
  const mcpSupport: Record<IntegrationType, "full" | "community" | "none"> = {
    slack: "community",      // Community MCP servers available
    jira: "full",            // Official Atlassian MCP
    confluence: "full",      // Official Atlassian MCP
    teams: "community",      // Emerging support
    box: "none",             // No MCP server yet
    veeva: "none",           // Pharma-specific, unlikely to have MCP
    email: "none",           // Direct SMTP preferred
  };

  return mcpSupport[integrationType] !== "none";
}

/**
 * Get the recommended integration approach for a type
 */
export function getIntegrationApproach(integrationType: IntegrationType): "mcp" | "direct_api" {
  // For now, use direct API for most integrations
  // Will switch to MCP as servers mature
  const preferMCP = ["jira", "confluence"];
  return preferMCP.includes(integrationType) ? "mcp" : "direct_api";
}
