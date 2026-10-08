import { definePlugin } from "@nextcrm/plugin-sdk";

const created: any[] = [];
jest.mock("@/inngest/client", () => ({
  inngest: { createFunction: jest.fn((cfg: any, handler: any) => { created.push({ cfg, handler }); return { cfg, handler }; }) },
}));
const state = jest.fn();
jest.mock("@/lib/plugins/state", () => ({ getPluginState: (...a: unknown[]) => state(...a), invalidatePluginCache: jest.fn() }));
jest.mock("@/lib/plugins/context", () => ({ createPluginContext: jest.fn(async () => ({ log: { error: jest.fn() } })) }));
jest.mock("@/lib/plugins/log", () => ({ writePluginLog: jest.fn() }));
jest.mock("@/lib/prisma-base", () => ({ prismaBase: { pluginLog: { deleteMany: jest.fn() }, installedPlugin: { update: jest.fn(), updateMany: jest.fn(async () => ({ count: 0 })) } } }));
jest.mock("@/lib/audit-log", () => ({ writeAuditLog: jest.fn() }));

const installing: Record<string, any> = {};
jest.mock("@/lib/plugins/registry", () => ({ getRegistry: () => [], findPlugin: (id: string) => installing[id] }));

import { buildPluginFunctions, pluginInstallFunction } from "@/lib/plugins/inngest";
import { prismaBase } from "@/lib/prisma-base";
import { writePluginLog } from "@/lib/plugins/log";

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

it("disables the plugin when onInstall throws (spec § 10)", async () => {
  installing.demo = { ...plugin, definition: { ...plugin.definition, onInstall: jest.fn(async () => { throw new Error("boom"); }) } };
  const run = (pluginInstallFunction as any).handler;
  await expect(run({ event: { data: { pluginId: "demo" } } })).resolves.toEqual({ status: "failed" });
  expect(prismaBase.installedPlugin.updateMany).toHaveBeenCalledWith({ where: { id: "demo" }, data: { status: "DISABLED" } });
  expect(writePluginLog).toHaveBeenCalledWith("demo", "error", expect.stringContaining("onInstall failed: Error: boom"));
});

it("leaves the plugin enabled when onInstall succeeds", async () => {
  const onInstall = jest.fn();
  installing.demo = { ...plugin, definition: { ...plugin.definition, onInstall } };
  await expect((pluginInstallFunction as any).handler({ event: { data: { pluginId: "demo" } } })).resolves.toEqual({ status: "ok" });
  expect(onInstall).toHaveBeenCalledTimes(1);
  expect(prismaBase.installedPlugin.updateMany).not.toHaveBeenCalled();
});

it("install job: onInstall failure on an already-uninstalled plugin does not throw and is audited (M12)", async () => {
  installing.gone = { ...plugin, definition: { ...plugin.definition, id: "gone", onInstall: async () => { throw new Error("boom"); } } };
  const res = await (pluginInstallFunction as any).handler({ event: { data: { pluginId: "gone" } } });
  expect(res).toEqual({ status: "failed" });
  expect((prismaBase.installedPlugin as any).updateMany).toHaveBeenCalledWith({ where: { id: "gone" }, data: { status: "DISABLED" } });
  const { writeAuditLog } = jest.requireMock("@/lib/audit-log");
  expect(writeAuditLog).toHaveBeenCalledWith({ entityType: "plugin", entityId: "gone", action: "disabled", changes: null, userId: null });
});
