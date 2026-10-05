import type { McpUser } from "@/lib/mcp/auth";
import { runAsActor } from "@/lib/plugins/actor";
import { PluginRuleError } from "@/lib/plugins/errors";
import { translatePluginMessage } from "@/lib/plugins/i18n";

type ToolResult = { content: { type: "text"; text: string }[]; isError?: true };

/** Runs one MCP tool call as the token's user and maps failures to the MCP error envelope. */
export async function runMcpToolCall(getUser: () => Promise<McpUser>, call: (user: McpUser) => unknown): Promise<ToolResult> {
  try {
    const mcpUser = await getUser();
    const result = await runAsActor({ type: "token", userId: mcpUser.id, role: mcpUser.role }, () => call(mcpUser));
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result) }],
    };
  } catch (err: any) {
    if (err instanceof PluginRuleError) {
      const message = translatePluginMessage(err.pluginId, err.messageKey, err.params, "en");
      return { content: [{ type: "text" as const, text: JSON.stringify({ error: message, code: "RULE_REJECTED" }) }], isError: true };
    }
    const msg: string = err.message ?? "Unknown error";
    const code =
      msg === "NOT_FOUND" ? "NOT_FOUND"
      : msg === "FORBIDDEN" ? "FORBIDDEN"
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
}
