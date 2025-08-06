import { createMcpHandler } from "@vercel/mcp-adapter";
import { auth } from "@/auth";

const handler = createMcpHandler(
  async (server) => {
    // Create task tool - simplified placeholder
    server.tool(
      "create_task",
      "Create a new task in the specified board section",
      {},
      async () => {
        const session = await auth();
        if (!session?.user) {
          throw new Error("Unauthorized");
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  message:
                    "Create task tool - placeholder until MCP schema issue is resolved",
                  status: "MCP functionality temporarily disabled",
                  note: "Use REST API or web interface for task creation",
                  suggestion:
                    "POST /api/tasks endpoint available for task creation",
                },
                null,
                2
              ),
            },
          ],
        };
      }
    );

    // Search tasks tool - simplified placeholder
    server.tool(
      "search_tasks",
      "Search and filter tasks with semantic and traditional search",
      {},
      async () => {
        const session = await auth();
        if (!session?.user) {
          throw new Error("Unauthorized");
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  message:
                    "Search tasks tool - placeholder until MCP schema issue is resolved",
                  status: "MCP functionality temporarily disabled",
                  note: "Use semantic search MCP server for task search functionality",
                  suggestion:
                    "Use /api/mcp/search server for advanced search capabilities",
                },
                null,
                2
              ),
            },
          ],
        };
      }
    );

    // Update task tool - simplified placeholder
    server.tool("update_task", "Update an existing task", {}, async () => {
      const session = await auth();
      if (!session?.user) {
        throw new Error("Unauthorized");
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                message:
                  "Update task tool - placeholder until MCP schema issue is resolved",
                status: "MCP functionality temporarily disabled",
                note: "Use REST API or web interface for task updates",
                suggestion:
                  "PUT /api/tasks/{id} endpoint available for task updates",
              },
              null,
              2
            ),
          },
        ],
      };
    });
  },
  {
    capabilities: {
      tools: {
        create_task: { description: "Create new task (placeholder)" },
        search_tasks: { description: "Search tasks (placeholder)" },
        update_task: { description: "Update task (placeholder)" },
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
