import { allow, definePlugin, modify, reject } from "@nextcrm/plugin-sdk";
import type { RuleInput } from "@nextcrm/plugin-sdk";
import { runBeforeRules } from "@/lib/plugins/rules";
import { PluginRuleError } from "@/lib/plugins/errors";
import { runAsActor } from "@/lib/plugins/actor";

jest.mock("@/lib/plugins/log", () => ({ writePluginLog: jest.fn() }));
jest.mock("@/lib/plugins/i18n", () => ({ translatePluginMessage: (p: string | null, k: string) => `${p ?? "core"}:${k}` }));

const reg = (id: string, build: Parameters<typeof definePlugin>[0]["extensions"]) => ({
  source: "public" as const, messages: {},
  definition: definePlugin({ id, name: id, version: "1.0.0", sdk: "^0.2.0", description: "", permissions: [], extensions: build }),
});

const input: RuleInput = { entity: "account", operation: "beforeCreate", recordId: null, data: { name: "Acme" }, existing: null };
const deps = (plugins: ReturnType<typeof reg>[]) => ({
  getEnabledPlugins: async () => plugins,
  createPluginContext: async () => ({}) as any,
  resolveActor: async () => ({ type: "system" as const }),
  timeoutMs: 50,
});

it("applies modify patches in priority order", async () => {
  const p1 = reg("p-one", (x) => x.rule("account", "beforeCreate", () => modify({ name: "B" }), { priority: 200 }));
  const p2 = reg("p-two", (x) => x.rule("account", "beforeCreate", (i) => modify({ name: `${i.data.name}-A` }), { priority: 10 }));
  await expect(runBeforeRules(input, deps([p1, p2]))).resolves.toEqual({ name: "B" });
});

it("stops at the first reject", async () => {
  const later = jest.fn(() => allow());
  const p1 = reg("p-one", (x) => x.rule("account", "beforeCreate", () => reject("err.taken", { date: "1. 1." })));
  const p2 = reg("p-two", (x) => x.rule("account", "beforeCreate", later, { priority: 500 }));
  const err = await runBeforeRules(input, deps([p1, p2])).catch((e) => e);
  expect(err).toBeInstanceOf(PluginRuleError);
  expect(err).toMatchObject({ pluginId: "p-one", messageKey: "err.taken", params: { date: "1. 1." } });
  expect(later).not.toHaveBeenCalled();
});

it("onError allow lets the write through; block rejects within the timeout (Review Focus 5)", async () => {
  const hang = () => new Promise<never>(() => {});
  const allowing = reg("p-allow", (x) => x.rule("account", "beforeCreate", hang));
  await expect(runBeforeRules(input, deps([allowing]))).resolves.toEqual({ name: "Acme" });
  const blocking = reg("p-block", (x) => x.rule("account", "beforeCreate", () => { throw new Error("boom"); }, { onError: "block" }));
  const started = Date.now();
  const err = await runBeforeRules(input, deps([blocking])).catch((e) => e);
  expect(err).toMatchObject({ pluginId: null, messageKey: "ruleUnavailable" });
  const hanging = reg("p-hang", (x) => x.rule("account", "beforeCreate", hang, { onError: "block" }));
  await expect(runBeforeRules(input, deps([hanging]))).rejects.toMatchObject({ messageKey: "ruleUnavailable" });
  expect(Date.now() - started).toBeLessThan(500);
});

it("skips the writing plugin's own rules and caps depth (Review Focus 3)", async () => {
  const own = jest.fn(() => reject("own"));
  const other = jest.fn(() => allow());
  const pA = reg("p-a", (x) => x.rule("account", "beforeCreate", own));
  const pB = reg("p-b", (x) => x.rule("account", "beforeCreate", other));
  const d = { ...deps([pA, pB]), resolveActor: async () => ({ type: "plugin" as const, pluginId: "p-a" }) };
  await runAsActor({ type: "plugin", pluginId: "p-a" }, () => runBeforeRules(input, d));
  expect(own).not.toHaveBeenCalled();
  expect(other).toHaveBeenCalled();
  const deep = () =>
    runAsActor({ type: "plugin", pluginId: "p-a" }, () =>
      runAsActor({ type: "plugin", pluginId: "p-b" }, () =>
        runAsActor({ type: "plugin", pluginId: "p-a" }, () =>
          runAsActor({ type: "plugin", pluginId: "p-b" }, () => runBeforeRules(input, d)))));
  await expect(deep()).rejects.toThrow("Plugin write depth exceeded (max 3)");
});

it("ignores rules for other entities and operations", async () => {
  const fn = jest.fn(() => reject("x"));
  const p = reg("p-one", (x) => { x.rule("lead", "beforeCreate", fn); x.rule("account", "beforeUpdate", fn); });
  await expect(runBeforeRules(input, deps([p]))).resolves.toEqual({ name: "Acme" });
  expect(fn).not.toHaveBeenCalled();
});

it("a hanging createPluginContext with onError block rejects within the timeout", async () => {
  const p = reg("p-block", (x) => x.rule("account", "beforeCreate", () => allow(), { onError: "block" }));
  const d = { ...deps([p]), createPluginContext: () => new Promise<never>(() => {}) };
  const started = Date.now();
  await expect(runBeforeRules(input, d)).rejects.toMatchObject({ pluginId: null, messageKey: "ruleUnavailable" });
  expect(Date.now() - started).toBeLessThan(500);
});

it("gives rules the request locale so they can format dates for the user", async () => {
  const createPluginContext = jest.fn(async () => ({}) as any);
  const p = reg("p-one", (x) => x.rule("account", "beforeCreate", () => allow()));
  await runBeforeRules(input, { ...deps([p]), createPluginContext, resolveLocale: async () => "cz" as const });
  expect(createPluginContext).toHaveBeenCalledWith(expect.objectContaining({ locale: "cz" }));
});
