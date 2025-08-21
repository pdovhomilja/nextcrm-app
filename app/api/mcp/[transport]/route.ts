import { createMcpHandler } from "@vercel/mcp-adapter";
import { auth } from "@/auth";

const handler = createMcpHandler(
  async (server) => {
    // Health check tool
    server.tool(
      "health_check",
      "Check server health and connectivity",
      {},
      async () => {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                status: "healthy",
                timestamp: new Date().toISOString(),
                server: "base-mcp",
                features: {
                  aiEnabled: process.env.AI_FEATURES_ENABLED === "true",
                  mcpEnabled: process.env.MCP_TOOLS_ENABLED === "true",
                  pgvectorEnabled: process.env.PGVECTOR_ENABLED === "true",
                },
              }),
            },
          ],
        };
      }
    );

    // Server info tool
    server.tool(
      "server_info",
      "Get server configuration and capabilities",
      {},
      async () => {
        const session = await auth();

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  serverName: "TaskHQ Base MCP Server",
                  version: "1.0.0",
                  authenticated: !!session?.user,
                  userId: session?.user?.id || null,
                  companyId: session?.user?.activeCompanyId || null,
                  capabilities: ["health_check", "server_info"],
                  environment: {
                    nodeEnv: process.env.NODE_ENV,
                    aiModel: process.env.AI_MODEL,
                    embeddingModel: process.env.EMBEDDING_MODEL,
                  },
                },
                null,
                2
              ),
            },
          ],
        };
      }
    );
  },
  {
    capabilities: {
      tools: {
        health_check: { description: "Check server health" },
        server_info: { description: "Get server configuration" },
      },
    },
  },
  {
    basePath: "",
    verboseLogs: process.env.MCP_VERBOSE_LOGS === "true",
    maxDuration: parseInt(process.env.MCP_MAX_DURATION || "800"),
  }
);

export { handler as GET, handler as POST, handler as DELETE };
