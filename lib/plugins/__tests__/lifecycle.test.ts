import { definePlugin, z } from "@nextcrm/plugin-sdk";

const db = {
  installedPlugin: { create: jest.fn(), update: jest.fn(), delete: jest.fn(), findUnique: jest.fn() },
  pluginData: { deleteMany: jest.fn(), count: jest.fn(async () => 5), findMany: jest.fn(async () => [{ entityType: "account", entityId: "a1", key: "k", value: 1 }]), groupBy: jest.fn(async () => [{ entityType: "account", entityId: "a1" }, { entityType: "account", entityId: "a2" }]) },
  pluginLog: { deleteMany: jest.fn(), count: jest.fn(async () => 7) },
};
jest.mock("@/lib/prisma-base", () => ({ prismaBase: db }));
jest.mock("@/lib/audit-log", () => ({ writeAuditLog: jest.fn() }));
jest.mock("@/inngest/client", () => ({ inngest: { send: jest.fn() } }));
jest.mock("@/lib/email-crypto", () => ({ encrypt: (s: string) => `enc:${s}`, decrypt: (s: string) => s.replace(/^enc:/, "") }));
const onUninstall = jest.fn();
const plugin = {
  source: "public" as const, messages: {},
  definition: definePlugin({
    id: "demo", name: "Demo", version: "1.0.0", sdk: "^0.1.0", description: "", permissions: [],
    settings: z.object({ days: z.number().default(90) }), secrets: z.object({ apiKey: z.string() }),
    extensions: () => {}, onUninstall,
  }),
};
const old = { ...plugin, definition: { ...plugin.definition, id: "old-sdk", sdk: "^9.0.0" } };
jest.mock("@/lib/plugins/registry", () => ({ findPlugin: (id: string) => ({ demo: plugin, "old-sdk": old } as any)[id] }));
const getPluginState = jest.fn();
jest.mock("@/lib/plugins/state", () => ({ getPluginState: (...a: unknown[]) => getPluginState(...a), invalidatePluginCache: jest.fn() }));
jest.mock("@/lib/plugins/context", () => ({ createPluginContext: jest.fn(async () => ({})) }));

import { exportPluginData, getUninstallSummary, installPlugin, savePluginSettings, uninstallPlugin } from "@/lib/plugins/lifecycle";
import { inngest } from "@/inngest/client";

beforeEach(() => jest.clearAllMocks());

it("installs with parsed settings and encrypted secrets, then queues onInstall", async () => {
  getPluginState.mockResolvedValue(undefined);
  await installPlugin("demo", "u1", { settings: {}, secrets: { apiKey: "k" } });
  expect(db.installedPlugin.create).toHaveBeenCalledWith({ data: {
    id: "demo", version: "1.0.0", status: "ENABLED", settings: { days: 90 }, secrets: 'enc:{"apiKey":"k"}', installedBy: "u1",
  } });
  expect(inngest.send).toHaveBeenCalledWith({ name: "plugin/installed", data: { pluginId: "demo" } });
});

it("refuses unknown, duplicate and incompatible plugins", async () => {
  getPluginState.mockResolvedValue(undefined);
  await expect(installPlugin("nope", "u1", { settings: {}, secrets: {} })).rejects.toThrow("Plugin not found");
  await expect(installPlugin("old-sdk", "u1", { settings: {}, secrets: { apiKey: "k" } })).rejects.toThrow("Incompatible SDK: requires ^9.0.0, running 0.1.0");
  getPluginState.mockResolvedValue({ id: "demo" });
  await expect(installPlugin("demo", "u1", { settings: {}, secrets: {} })).rejects.toThrow("Plugin already installed");
});

it("keeps existing secrets when a secret field is submitted empty", async () => {
  getPluginState.mockResolvedValue({ id: "demo", secrets: 'enc:{"apiKey":"old"}', settings: {} });
  await savePluginSettings("demo", "u1", { settings: { days: 30 }, secrets: { apiKey: "" } });
  expect(db.installedPlugin.update).toHaveBeenCalledWith({ where: { id: "demo" }, data: { settings: { days: 30 }, secrets: 'enc:{"apiKey":"old"}' } });
});

it("summarises, exports and uninstalls", async () => {
  getPluginState.mockResolvedValue({ id: "demo", settings: { days: 90 }, secrets: null });
  await expect(getUninstallSummary("demo")).resolves.toEqual({ entries: 5, records: 2, logLines: 7 });
  const exp = await exportPluginData("demo");
  expect(exp).toMatchObject({ pluginId: "demo", settings: { days: 90 }, data: [{ entityType: "account", entityId: "a1", key: "k", value: 1 }] });
  await uninstallPlugin("demo", "u1");
  expect(onUninstall).toHaveBeenCalled();
  expect(db.pluginData.deleteMany).toHaveBeenCalledWith({ where: { pluginId: "demo" } });
  expect(db.pluginLog.deleteMany).toHaveBeenCalledWith({ where: { pluginId: "demo" } });
  expect(db.installedPlugin.delete).toHaveBeenCalledWith({ where: { id: "demo" } });
});

it("uninstalls a missing plugin without calling code (Review Focus 2)", async () => {
  getPluginState.mockResolvedValue({ id: "ghost", settings: {}, secrets: null });
  await uninstallPlugin("ghost", "u1");
  expect(db.installedPlugin.delete).toHaveBeenCalledWith({ where: { id: "ghost" } });
});
