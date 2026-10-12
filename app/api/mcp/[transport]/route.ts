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
  }
);

// The legacy SSE transport (/api/mcp/sse + /api/mcp/message) keeps session
// state in Redis; mcp-handler throws without REDIS_URL/KV_URL. Answer with a
// clear error instead and point clients at Streamable HTTP (/api/mcp/mcp).
function route(req: Request) {
  const transport = new URL(req.url).pathname.split("/").pop();
  const isSse = transport === "sse" || transport === "message";
  if (isSse && !process.env.REDIS_URL && !process.env.KV_URL) {
    return Response.json(
      {
        error:
          "SSE transport is not available: set REDIS_URL (or KV_URL) to enable it, or use the Streamable HTTP endpoint /api/mcp/mcp.",
      },
      { status: 501 }
    );
  }
  return handler(req);
}

export { route as GET, route as POST };
