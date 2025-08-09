import { experimental_createMCPClient } from "ai";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

export interface MCPServer {
  name: string;
  url: string;
  description: string;
  healthStatus: "healthy" | "unhealthy" | "unknown";
  lastHealthCheck: Date;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tools: Record<string, any>;
}

export interface MCPConnectionConfig {
  maxRetries: number;
  retryDelay: number;
  healthCheckInterval: number;
  connectionTimeout: number;
}

export class MCPClientPool {
  private static instance: MCPClientPool;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private clients: Map<string, any> = new Map();
  private servers: Map<string, MCPServer> = new Map();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private tools: Map<string, any> = new Map();
  private healthCheckInterval?: NodeJS.Timeout;
  private isInitialized = false;

  private config: MCPConnectionConfig = {
    maxRetries: 3,
    retryDelay: 1000,
    healthCheckInterval: 30000, // 30 seconds
    connectionTimeout: 10000, // 10 seconds
  };

  static getInstance(): MCPClientPool {
    if (!MCPClientPool.instance) {
      MCPClientPool.instance = new MCPClientPool();
    }
    return MCPClientPool.instance;
  }

  /**
   * Initialize MCP server configurations (without connecting)
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log("MCP Client Pool already initialized");
      return;
    }

    // Check if MCP tools are enabled
    if (process.env.MCP_TOOLS_ENABLED !== "true") {
      console.log("MCP tools are disabled - skipping initialization");
      this.isInitialized = true;
      return;
    }

    console.log("Initializing MCP Client Pool configuration...");

    const serverConfigs = [
      {
        name: "tasks",
        url: "/api/mcp/tasks/sse",
        description: "Task management operations",
      },
      {
        name: "search",
        url: "/api/mcp/search/sse",
        description: "Vector and semantic search",
      },
      {
        name: "analytics",
        url: "/api/mcp/analytics/sse",
        description: "Project analytics and insights",
      },
      {
        name: "boards",
        url: "/api/mcp/boards/sse",
        description: "Board and section management",
      },
    ];

    // Initialize server configs without connecting
    for (const config of serverConfigs) {
      this.servers.set(config.name, {
        ...config,
        healthStatus: "unknown",
        lastHealthCheck: new Date(),
        tools: {},
      });
    }

    this.isInitialized = true;
    console.log("MCP Client Pool configuration initialized (connections will be made on-demand with authentication)");
  }

  /**
   * Initialize connections with authentication context
   */
  async initializeConnections(): Promise<void> {
    if (!this.isInitialized) {
      console.log("MCP Client Pool not initialized - initializing configuration first");
      await this.initialize();
    }

    console.log("Initializing MCP connections with authentication context...");
    await this.connectToAllServers();
    
    // Start health monitoring only after successful initialization
    this.startHealthMonitoring();
    
    console.log("MCP Client Pool connections initialized");
  }

  /**
   * Connect to all configured MCP servers
   */
  private async connectToAllServers(): Promise<void> {
    const connectionPromises = Array.from(this.servers.keys()).map(
      (serverName) => this.connectToServer(serverName, 1)
    );

    const results = await Promise.allSettled(connectionPromises);

    results.forEach((result, index) => {
      const serverName = Array.from(this.servers.keys())[index];
      if (result.status === "rejected") {
        console.error(
          `Failed to connect to MCP server ${serverName}:`,
          result.reason
        );
        this.updateServerHealth(serverName, "unhealthy");
      }
    });
  }

  /**
   * Connect to a specific MCP server with retry logic
   */
  private async connectToServer(
    serverName: string,
    attempt = 1,
  ): Promise<boolean> {
    const server = this.servers.get(serverName);
    if (!server) {
      console.error(`Server configuration not found: ${serverName}`);
      return false;
    }

    try {
      console.log(
        `Connecting to MCP server: ${serverName} (attempt ${attempt})`
      );

      const transport = new SSEClientTransport(
        new URL(server.url, process.env.NEXT_PUBLIC_APP_URL!)
      );

      // Set connection timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(
          () => reject(new Error("Connection timeout")),
          this.config.connectionTimeout
        );
      });

      const clientPromise = experimental_createMCPClient({ transport });
      const client = (await Promise.race([
        clientPromise,
        timeoutPromise,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ])) as any;

      // Get available tools
      const tools = await client.tools();

      // Store client and tools
      this.clients.set(serverName, client);
      server.tools = tools;

      // Register tools with prefixed names
      Object.entries(tools).forEach(([toolName, tool]) => {
        this.tools.set(`${serverName}_${toolName}`, tool);
      });

      this.updateServerHealth(serverName, "healthy");
      console.log(`Successfully connected to MCP server: ${serverName}`);

      return true;
    } catch (error) {
      console.error(
        `Connection attempt ${attempt} failed for ${serverName}:`,
        error
      );

      // Check if it's a 404 error (endpoint doesn't exist)
      const errorObj = error as Error & { code?: number; event?: { code?: number } };
      const is404Error = errorObj.code === 404 || 
                         errorObj.event?.code === 404 ||
                         errorObj.message?.includes('404') ||
                         errorObj.message?.includes('Non-200 status code (404)');

      if (is404Error) {
        console.log(`MCP server ${serverName} endpoint not available (404) - skipping retries`);
        this.updateServerHealth(serverName, "unhealthy");
        return false;
      }

      if (attempt < this.config.maxRetries) {
        console.log(
          `Retrying connection to ${serverName} in ${this.config.retryDelay}ms`
        );
        await new Promise((resolve) =>
          setTimeout(resolve, this.config.retryDelay)
        );
        return this.connectToServer(serverName, attempt + 1);
      }

      this.updateServerHealth(serverName, "unhealthy");
      return false;
    }
  }

  /**
   * Update server health status
   */
  private updateServerHealth(
    serverName: string,
    status: "healthy" | "unhealthy"
  ): void {
    const server = this.servers.get(serverName);
    if (server) {
      server.healthStatus = status;
      server.lastHealthCheck = new Date();
    }
  }

  /**
   * Start periodic health monitoring
   */
  private startHealthMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthChecks();
    }, this.config.healthCheckInterval);
  }

  /**
   * Perform health checks on all servers
   */
  private async performHealthChecks(): Promise<void> {
    const healthPromises = Array.from(this.servers.keys()).map((serverName) =>
      this.checkServerHealth(serverName)
    );

    await Promise.allSettled(healthPromises);
  }

  /**
   * Check health of a specific server
   */
  private async checkServerHealth(serverName: string): Promise<boolean> {
    const client = this.clients.get(serverName);
    if (!client) {
      this.updateServerHealth(serverName, "unhealthy");
      return false;
    }

    try {
      // Try to call a health check tool or list tools
      await Promise.race([
        client.tools(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Health check timeout")), 5000)
        ),
      ]);

      this.updateServerHealth(serverName, "healthy");
      return true;
    } catch (error) {
      console.error(`Health check failed for ${serverName}:`, error);
      this.updateServerHealth(serverName, "unhealthy");

      // Attempt to reconnect unhealthy servers
      await this.connectToServer(serverName);
      return false;
    }
  }

  /**
   * Get all available tools from all servers (returns empty if no connections)
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getTools(serverName?: string): Promise<Record<string, any>> {
    if (!this.isInitialized) {
      console.log("MCP Client Pool not initialized - returning empty tools");
      return {};
    }

    // Return tools only if connections are established and healthy
    if (this.clients.size === 0) {
      console.log("No MCP connections established - tools will be available after authentication");
      return {};
    }

    if (serverName) {
      const server = this.servers.get(serverName);
      if (server && server.healthStatus === "healthy") {
        return Object.fromEntries(
          Array.from(this.tools.entries()).filter(([name]) =>
            name.startsWith(`${serverName}_`)
          )
        );
      }
      return {};
    }

    // Return tools only from healthy servers
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const healthyTools: Record<string, any> = {};

    for (const [toolName, tool] of this.tools.entries()) {
      const serverName = toolName.split("_")[0];
      const server = this.servers.get(serverName);

      if (server?.healthStatus === "healthy") {
        healthyTools[toolName] = tool;
      }
    }

    return healthyTools;
  }

  /**
   * Get specific MCP client
   */
  getClient(serverName: string): unknown | null {
    const server = this.servers.get(serverName);
    if (server?.healthStatus === "healthy") {
      return this.clients.get(serverName) || null;
    }
    return null;
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
   * Gracefully close all connections
   */
  async close(): Promise<void> {
    console.log("Closing MCP Client Pool...");

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    const closePromises = Array.from(this.clients.values()).map((client) => {
      try {
        return client.close?.();
      } catch (error) {
        console.error("Error closing MCP client:", error);
        return Promise.resolve();
      }
    });

    await Promise.allSettled(closePromises);

    this.clients.clear();
    this.tools.clear();
    this.isInitialized = false;

    console.log("MCP Client Pool closed");
  }

  /**
   * Force reconnection to a specific server
   */
  async reconnectServer(serverName: string): Promise<boolean> {
    console.log(`Force reconnecting to server: ${serverName}`);

    // Close existing connection if any
    const existingClient = this.clients.get(serverName);
    if (existingClient) {
      try {
        await existingClient.close();
      } catch (error) {
        console.error(
          `Error closing existing connection to ${serverName}:`,
          error
        );
      }
      this.clients.delete(serverName);
    }

    // Remove old tools
    const toolsToRemove = Array.from(this.tools.keys()).filter((toolName) =>
      toolName.startsWith(`${serverName}_`)
    );

    toolsToRemove.forEach((toolName) => this.tools.delete(toolName));

    // Reconnect
    return await this.connectToServer(serverName);
  }
}

export const mcpClientPool = MCPClientPool.getInstance();
