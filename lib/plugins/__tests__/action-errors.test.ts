jest.mock("next-intl/server", () => ({ getLocale: jest.fn(async () => "cz") }));
jest.mock("@/lib/plugins/i18n", () => ({ translatePluginMessage: (p: string | null, k: string, _x: unknown, l: string) => `${l}|${p}|${k}` }));
import { pluginRuleErrorMessage } from "@/lib/plugins/action-errors";
import { PluginRuleError } from "@/lib/plugins/errors";

it("translates plugin rule errors in the request locale", async () => {
  expect(await pluginRuleErrorMessage(new PluginRuleError("demo", "err.taken"))).toBe("cz|demo|err.taken");
  expect(await pluginRuleErrorMessage(new Error("other"))).toBeNull();
});
