import { createMcpHandler } from "mcp-handler";
import { getMcpUser } from "@/lib/mcp/auth";
import { allTools } from "@/lib/mcp/tools";

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
          const msg: string = err.message ?? "Unknown error";
          const code =
            msg === "NOT_FOUND" ? "NOT_FOUND"
            : msg === "Unauthorized" ? "UNAUTHORIZED"
            : msg.startsWith("CONFLICT:") ? "INVALID_REQUEST"
            : msg.startsWith("VALIDATION_ERROR:") ? "INVALID_PARAMS"
            : msg.startsWith("EXTERNAL_ERROR:") ? "INTERNAL_ERROR"
            : "INTERNAL_ERROR";
          return {
            content: [{ type: "text" as const, text: JSON.stringify({ error: msg, code }) }],
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
