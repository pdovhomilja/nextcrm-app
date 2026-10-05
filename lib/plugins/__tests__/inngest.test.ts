import { definePlugin } from "@nextcrm/plugin-sdk";

const created: any[] = [];
jest.mock("@/inngest/client", () => ({
  inngest: { createFunction: jest.fn((cfg: any, handler: any) => { created.push({ cfg, handler }); return { cfg, handler }; }) },
}));
const state = jest.fn();
jest.mock("@/lib/plugins/state", () => ({ getPluginState: (...a: unknown[]) => state(...a), invalidatePluginCache: jest.fn() }));
jest.mock("@/lib/plugins/context", () => ({ createPluginContext: jest.fn(async () => ({ log: { error: jest.fn() } })) }));
jest.mock("@/lib/plugins/log", () => ({ writePluginLog: jest.fn() }));
jest.mock("@/lib/prisma-base", () => ({ prismaBase: { pluginLog: { deleteMany: jest.fn() }, installedPlugin: { update: jest.fn() } } }));

import { buildPluginFunctions } from "@/lib/plugins/inngest";

const cron = jest.fn();
const onSaved = jest.fn();
const after = jest.fn();
const plugin = {
  source: "public" as const, messages: {},
  definition: definePlugin({
    id: "demo", name: "Demo", version: "1.0.0", sdk: "^0.1.0", description: "", permissions: [],
    extensions: (x) => {
      x.cron("nightly", "0 3 * * *", cron);
      x.on("crm/account.saved", onSaved);
      x.after("account", "created", after);
    },
  }),
};

beforeEach(() => { created.length = 0; jest.clearAllMocks(); });

it("registers one function per cron and event plus one after-dispatcher", () => {
  buildPluginFunctions([plugin]);
  expect(created.map((c) => c.cfg.id)).toEqual(["plugin-demo-cron-nightly", "plugin-demo-on-crm-account-saved", "plugin-demo-after"]);
  expect(created[0].cfg.triggers).toEqual([{ cron: "0 3 * * *" }]);
  expect(created[2].cfg.triggers).toEqual([{ event: "plugin/demo/after" }]);
  expect(created.every((c) => c.cfg.retries === 3)).toBe(true);
});

it("skips handlers while the plugin is disabled or not installed", async () => {
  buildPluginFunctions([plugin]);
  state.mockResolvedValue({ status: "DISABLED" });
  await expect(created[0].handler({ event: { data: {} } })).resolves.toEqual({ status: "skipped:disabled" });
  state.mockResolvedValue(undefined);
  await expect(created[1].handler({ event: { data: { record_id: "a" } } })).resolves.toEqual({ status: "skipped:disabled" });
  expect(cron).not.toHaveBeenCalled();
  expect(onSaved).not.toHaveBeenCalled();
});

it("dispatches after-actions by entity and operation", async () => {
  buildPluginFunctions([plugin]);
  state.mockResolvedValue({ status: "ENABLED" });
  await created[2].handler({ event: { data: { entity: "account", operation: "created", recordId: "a1" } } });
  await created[2].handler({ event: { data: { entity: "account", operation: "updated", recordId: "a1" } } });
  expect(after).toHaveBeenCalledTimes(1);
  expect(after).toHaveBeenCalledWith({ entity: "account", operation: "created", recordId: "a1" }, expect.anything());
});

it("skips on-handlers for events the same plugin caused; runs them for other sources (I2)", async () => {
  buildPluginFunctions([plugin]);
  state.mockResolvedValue({ status: "ENABLED" });
  await expect(created[1].handler({ event: { data: { record_id: "a1", source: "demo" } } })).resolves.toEqual({ status: "skipped:self" });
  expect(onSaved).not.toHaveBeenCalled();
  await created[1].handler({ event: { data: { record_id: "a1", source: "other" } } });
  await created[1].handler({ event: { data: { record_id: "a1" } } });
  expect(onSaved).toHaveBeenCalledTimes(2);
});
