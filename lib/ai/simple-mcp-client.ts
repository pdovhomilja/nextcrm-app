import { mcpAuthService } from "./mcp-auth";

export interface SimpleMCPServer {
  name: string;
  url: string;
  description: string;
  healthStatus: "healthy" | "unhealthy" | "unknown";
  lastHealthCheck: Date;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tools: Record<string, any>;
}

export interface MCPToolCall {
  method: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  params: Record<string, any>;
  id: string | number;
}

export interface MCPResponse {
  jsonrpc: string;
  id: string | number | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  result?: any;
  error?: {
    code: number;
    message: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data?: any;
  };
}

/**
 * Simplified MCP Client Pool that works with our REST/JSON-RPC MCP endpoints
 * This bypasses the SSE connection issues by using direct HTTP calls
 */
export class SimpleMCPClientPool {
  private static instance: SimpleMCPClientPool;
  private servers: Map<string, SimpleMCPServer> = new Map();
  private isInitialized = false;

  static getInstance(): SimpleMCPClientPool {
    if (!SimpleMCPClientPool.instance) {
      SimpleMCPClientPool.instance = new SimpleMCPClientPool();
    }
    return SimpleMCPClientPool.instance;
  }

  /**
   * Initialize MCP server configurations
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    // Check if MCP tools are enabled
    if (process.env.MCP_TOOLS_ENABLED !== "true") {
      console.log("MCP tools are disabled - skipping initialization");
      this.isInitialized = true;
      return;
    }

    console.log("Initializing Simple MCP Client Pool...");

    const serverConfigs = [
      {
        name: "tasks",
        url: "/api/mcp/tasks/sse",
        description: "Task management operations",
        tools: {
          create_task: {
            description: "Create a new task in the specified board section",
          },
          search_tasks: { description: "Search and filter tasks" },
          update_task: { description: "Update an existing task" },
          get_tasks: { description: "Get tasks for a board or section" },
          delete_task: { description: "Delete a task" },
          get_boards: { description: "Get all boards for the current user" },
          get_board_sections: { description: "Get sections within a board" },
        },
      },
      {
        name: "search",
        url: "/api/mcp/search/sse",
        description: "Vector and semantic search",
        tools: {
          semantic_search: {
            description: "Perform semantic search across tasks",
          },
          vector_search: { description: "Vector-based similarity search" },
          keyword_search: { description: "Traditional keyword-based search" },
          search_history: {
            description: "Search through conversation history",
          },
          contextual_search: {
            description: "Context-aware search with RAG integration",
          },
        },
      },
      {
        name: "analytics",
        url: "/api/mcp/analytics/sse",
        description: "Project analytics and insights",
        tools: {
          project_health: { description: "Analyze overall project health" },
          task_analytics: { description: "Generate task completion analytics" },
          team_productivity: { description: "Analyze team productivity" },
          bottleneck_analysis: { description: "Identify workflow bottlenecks" },
          progress_forecasting: { description: "Forecast project completion" },
        },
      },
      {
        name: "boards",
        url: "/api/mcp/boards/sse",
        description: "Board and section management",
        tools: {
          create_board: { description: "Create a new project board" },
          update_board: { description: "Update board details" },
          delete_board: { description: "Delete a project board" },
          get_boards: { description: "Get all boards for the user" },
          create_board_section: {
            description: "Create a new section in a board",
          },
          board_permissions: { description: "Manage board access permissions" },
        },
      },
    ];

    // Initialize server configs
    for (const config of serverConfigs) {
      this.servers.set(config.name, {
        name: config.name,
        url: config.url,
        description: config.description,
        healthStatus: "unknown",
        lastHealthCheck: new Date(),
        tools: config.tools,
      });
    }

    this.isInitialized = true;
    console.log(
      `Simple MCP Client Pool initialized with ${this.servers.size} servers`,
    );
  }

  /**
   * Call an MCP tool method with authentication
   */
  async callTool(
    serverName: string,
    method: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    params: Record<string, any> = {},
    userId?: string,
  ): Promise<MCPResponse> {
    const server = this.servers.get(serverName);
    if (!server) {
      return {
        jsonrpc: "2.0",
        id: Date.now(),
        error: {
          code: -32000,
          message: `Server '${serverName}' not found`,
        },
      };
    }

    const requestId = Date.now();
    const payload: MCPToolCall = {
      method,
      params,
      id: requestId,
    };

    try {
      // Get authentication headers - userId is required for proper authentication
      if (!userId) {
        console.error("MCP tool call missing userId for authentication");
        return {
          jsonrpc: "2.0",
          id: requestId,
          error: {
            code: -32001,
            message: "Authentication required - no userId provided",
          },
        };
      }

      const authHeaders = await mcpAuthService.getMCPAuthHeaders(userId);

      console.log(`MCP tool call: ${serverName}.${method} for user ${userId}`);

      const baseUrl =
        process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const response = await fetch(`${baseUrl}${server.url}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          ...payload,
        }),
      });

      const result = (await response.json()) as MCPResponse;

      console.log(`MCP Response for ${serverName}.${method}:`, {
        status: response.status,
        result: result,
        hasError: !!result.error,
      });

      // Update server health based on response
      if (response.ok) {
        this.updateServerHealth(serverName, "healthy");
      } else {
        this.updateServerHealth(serverName, "unhealthy");
      }

      return result;
    } catch (error) {
      console.error(`MCP call failed for ${serverName}.${method}:`, error);
      this.updateServerHealth(serverName, "unhealthy");

      return {
        jsonrpc: "2.0",
        id: requestId,
        error: {
          code: -32603,
          message: "Internal error",
          data: error instanceof Error ? error.message : "Unknown error",
        },
      };
    }
  }

  /**
   * Get all available tools from all healthy servers
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getTools(serverName?: string): Promise<Record<string, any>> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (serverName) {
      const server = this.servers.get(serverName);
      if (server) {
        // Return tools with prefixed names
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const prefixedTools: Record<string, any> = {};
        Object.entries(server.tools).forEach(([toolName, tool]) => {
          prefixedTools[`${serverName}_${toolName}`] = tool;
        });
        return prefixedTools;
      }
      return {};
    }

    // Return all tools from all servers with prefixed names
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const allTools: Record<string, any> = {};

    for (const [serverName, server] of this.servers.entries()) {
      Object.entries(server.tools).forEach(([toolName, tool]) => {
        allTools[`${serverName}_${toolName}`] = {
          ...tool,
          serverName,
          toolName,
          fullName: `${serverName}_${toolName}`,
        };
      });
    }

    return allTools;
  }

  /**
   * Update server health status
   */
  private updateServerHealth(
    serverName: string,
    status: "healthy" | "unhealthy",
  ): void {
    const server = this.servers.get(serverName);
    if (server) {
      server.healthStatus = status;
      server.lastHealthCheck = new Date();
    }
  }

  /**
   * Get server status information
   */
  getServerStatus(): Array<{
    name: string;
    status: string;
    description: string;
    toolCount: number;
    lastHealthCheck: Date;
  }> {
    return Array.from(this.servers.values()).map((server) => ({
      name: server.name,
      status: server.healthStatus,
      description: server.description,
      toolCount: Object.keys(server.tools).length,
      lastHealthCheck: server.lastHealthCheck,
    }));
  }

  /**
   * Check if MCP tools are available
   */
  async hasTools(): Promise<boolean> {
    const tools = await this.getTools();
    return Object.keys(tools).length > 0;
  }

  /**
   * Health check for all servers
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    serverCount: number;
    healthyServers: number;
    issues: string[];
  }> {
    const issues: string[] = [];
    const serverCount = this.servers.size;
    let healthyServers = 0;

    for (const [serverName, server] of this.servers.entries()) {
      if (server.healthStatus === "healthy") {
        healthyServers++;
      } else if (server.healthStatus === "unhealthy") {
        issues.push(`Server '${serverName}' is unhealthy`);
      } else {
        issues.push(`Server '${serverName}' status unknown`);
      }
    }

    return {
      healthy: healthyServers > 0,
      serverCount,
      healthyServers,
      issues,
    };
  }
}

export const simpleMCPClientPool = SimpleMCPClientPool.getInstance();
