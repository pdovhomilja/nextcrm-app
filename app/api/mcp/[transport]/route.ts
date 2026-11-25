import { createMcpHandler } from "mcp-handler";
import { getMcpUser } from "@/lib/mcp/auth";
import { allTools } from "@/lib/mcp/tools";
import { runMcpToolCall } from "@/lib/mcp/run-tool";

const handler = createMcpHandler(
  (server) => {
    for (const tool of allTools) {
      // Pass userId (2nd arg, used by owner-scoped CRM tools) and the full
      // authz user (3rd arg, used by role-aware campaign tools — GHSA-c9vg-c532-ppqx).
      server.tool(tool.name, tool.description, tool.schema.shape, async (args: Record<string, unknown>) =>
        runMcpToolCall(getMcpUser, (mcpUser) => (tool.handler as any)(args as any, mcpUser.id, mcpUser)));
    }
  },
  {
    capabilities: { tools: {} },
  },
  {
    basePath: "/api/mcp",
    disableSse: true,
  }
);

// The legacy SSE transport (/api/mcp/sse + /api/mcp/message) is not served:
// clients use Streamable HTTP (/api/mcp/mcp).
function route(req: Request) {
  const transport = new URL(req.url).pathname.split("/").pop();
  if (transport === "sse" || transport === "message") {
    return Response.json(
      { error: "SSE transport is not supported. Use the Streamable HTTP endpoint /api/mcp/mcp." },
      { status: 501 }
    );
  }
  return handler(req);
}

export { route as GET, route as POST };
