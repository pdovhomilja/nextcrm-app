import { createMcpHandler } from "@vercel/mcp-adapter";
import { getMcpUser } from "@/lib/mcp/auth";
import { accountTools } from "@/lib/mcp/tools/accounts";
import { contactTools } from "@/lib/mcp/tools/contacts";
import { leadTools } from "@/lib/mcp/tools/leads";
import { opportunityTools } from "@/lib/mcp/tools/opportunities";
import { targetTools } from "@/lib/mcp/tools/targets";

const allTools = [
  ...accountTools,
  ...contactTools,
  ...leadTools,
  ...opportunityTools,
  ...targetTools,
];

const handler = createMcpHandler(
  (server) => {
    for (const tool of allTools) {
      server.tool(tool.name, tool.description, tool.schema.shape, async (args: Record<string, unknown>) => {
        try {
          const mcpUser = await getMcpUser();
          const result = await tool.handler(args as any, mcpUser.id);
          return {
            content: [{ type: "text" as const, text: JSON.stringify(result) }],
          };
        } catch (err: any) {
          const code = err.message === "NOT_FOUND" ? "NOT_FOUND"
            : err.message === "Unauthorized" ? "UNAUTHORIZED"
            : "INTERNAL_ERROR";
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({ error: err.message ?? "Unknown error", code }),
              },
            ],
            isError: true,
          };
        }
      });
    }
  },
  {
    capabilities: { tools: {} },
  }
);

export { handler as GET, handler as POST };
