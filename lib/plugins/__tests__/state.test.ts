import { definePlugin } from "@nextcrm/plugin-sdk";

const findMany = jest.fn();
let mockEmptyRegistry = false;
jest.mock("@/lib/prisma-base", () => ({ prismaBase: { installedPlugin: { findMany: (...a: unknown[]) => findMany(...a) } } }));
jest.mock("@/lib/plugins/registry", () => {
  const mk = (id: string) => ({ source: "public", messages: {}, definition: definePlugin({ id, name: id.toUpperCase(), version: "1.0.0", sdk: "^0.2.0", description: "d", permissions: [], extensions: () => {} }) });
  const reg = [mk("alpha"), mk("beta"), mk("gamma")];
  return { getRegistry: () => (mockEmptyRegistry ? [] : reg), findPlugin: (id: string) => reg.find((p) => p.definition.id === id) };
});

import { getEnabledPlugins, getPluginStates, invalidatePluginCache, listPluginsForAdmin } from "@/lib/plugins/state";

const row = (id: string, status: "ENABLED" | "DISABLED", version = "1.0.0") =>
  ({ id, version, status, settings: {}, secrets: null, installedAt: new Date(), installedBy: null });

beforeEach(() => { mockEmptyRegistry = false; findMany.mockReset(); invalidatePluginCache(); jest.useRealTimers(); });

it("returns only enabled plugins that exist in the registry", async () => {
  findMany.mockResolvedValue([row("alpha", "ENABLED"), row("beta", "DISABLED"), row("ghost", "ENABLED")]);
  const enabled = await getEnabledPlugins();
  expect(enabled.map((p) => p.definition.id)).toEqual(["alpha"]);
});

it("caches state for 10 seconds", async () => {
  jest.useFakeTimers();
  findMany.mockResolvedValue([row("alpha", "ENABLED")]);
  await getPluginStates();
  await getPluginStates();
  expect(findMany).toHaveBeenCalledTimes(1);
  jest.advanceTimersByTime(10_001);
  await getPluginStates();
  expect(findMany).toHaveBeenCalledTimes(2);
});

it("lists available, installed and missing plugins for admin", async () => {
  findMany.mockResolvedValue([row("alpha", "ENABLED"), row("beta", "DISABLED", "0.9.0"), row("ghost", "ENABLED", "2.0.0")]);
  const rows = await listPluginsForAdmin();
  expect(rows).toEqual([
    expect.objectContaining({ id: "alpha", status: "ENABLED", installedVersion: "1.0.0" }),
    expect.objectContaining({ id: "beta", status: "DISABLED", installedVersion: "0.9.0", version: "1.0.0" }),
    expect.objectContaining({ id: "gamma", status: "NOT_INSTALLED", installedVersion: null }),
    expect.objectContaining({ id: "ghost", status: "MISSING", name: "ghost", source: null }),
  ]);
});

it("makes no state query when the registry is empty", async () => {
  mockEmptyRegistry = true;
  await expect(getEnabledPlugins()).resolves.toEqual([]);
  expect(findMany).not.toHaveBeenCalled();
});
