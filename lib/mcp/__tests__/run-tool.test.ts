jest.mock("@/lib/plugins/i18n", () => ({
  translatePluginMessage: (pluginId: string | null, key: string, _p: unknown, locale: string) => `${pluginId}:${key}:${locale}`,
}));

import { runMcpToolCall } from "@/lib/mcp/run-tool";
import { currentActorFrame } from "@/lib/plugins/actor";
import { PluginRuleError } from "@/lib/plugins/errors";

const user = { id: "u1", role: "member" as const };
const parse = (r: { content: { text: string }[] }) => JSON.parse(r.content[0].text);

it("runs the tool as the token's user (actor propagation)", async () => {
  const res = await runMcpToolCall(async () => user as never, (u) => ({ actor: currentActorFrame()?.actor, userId: u.id }));
  expect(res.isError).toBeUndefined();
  expect(parse(res)).toEqual({ actor: { type: "token", userId: "u1", role: "member" }, userId: "u1" });
});

it("maps a PluginRuleError to RULE_REJECTED with the translated message", async () => {
  const res = await runMcpToolCall(async () => user as never, () => { throw new PluginRuleError("guard", "rules.locked", { n: 1 }); });
  expect(res.isError).toBe(true);
  expect(parse(res)).toEqual({ error: "guard:rules.locked:en", code: "RULE_REJECTED" });
});

it("keeps the existing error codes for other failures", async () => {
  const unauth = await runMcpToolCall(async () => { throw new Error("Unauthorized"); }, () => "never");
  expect(parse(unauth)).toEqual({ error: "Unauthorized", code: "UNAUTHORIZED" });
  const notFound = await runMcpToolCall(async () => user as never, async () => { throw new Error("NOT_FOUND"); });
  expect(parse(notFound)).toEqual({ error: "NOT_FOUND", code: "NOT_FOUND" });
});
