import { definePlugin } from "@nextcrm/plugin-sdk";

const db = {
  $queryRaw: jest.fn(async () => [{ locked: true }]),
  $executeRaw: jest.fn(),
  installedPlugin: { findMany: jest.fn(), update: jest.fn() },
};
jest.mock("@/lib/prisma-base", () => ({ prismaBase: db }));
jest.mock("@/lib/audit-log", () => ({ writeAuditLog: jest.fn() }));
jest.mock("@/lib/plugins/context", () => ({ createPluginContext: jest.fn(async () => ({})) }));
jest.mock("@/lib/plugins/state", () => ({ invalidatePluginCache: jest.fn() }));
jest.mock("@/lib/plugins/log", () => ({ writePluginLog: jest.fn() }));
const onUpgrade = jest.fn();
const failing = jest.fn(async () => { throw new Error("bad"); });
const mk = (id: string, version: string, fn: any) => ({ source: "public", messages: {}, definition: definePlugin({ id, name: id, version, sdk: "^0.1.0", description: "", permissions: [], extensions: () => {}, onUpgrade: fn }) });
jest.mock("@/lib/plugins/registry", () => ({ getRegistry: () => [mk("up", "1.1.0", onUpgrade), mk("same", "1.0.0", onUpgrade), mk("broken", "2.0.0", failing)] }));

import { runPluginUpgrades } from "@/lib/plugins/upgrade";

it("runs onUpgrade for newer image versions, disables on failure, ignores missing", async () => {
  db.installedPlugin.findMany.mockResolvedValue([
    { id: "up", version: "1.0.0", status: "ENABLED" },
    { id: "same", version: "1.0.0", status: "ENABLED" },
    { id: "broken", version: "1.0.0", status: "ENABLED" },
    { id: "ghost", version: "1.0.0", status: "ENABLED" },
  ]);
  await runPluginUpgrades();
  expect(onUpgrade).toHaveBeenCalledTimes(1);
  expect(onUpgrade).toHaveBeenCalledWith({}, "1.0.0");
  expect(db.installedPlugin.update).toHaveBeenCalledWith({ where: { id: "up" }, data: { version: "1.1.0" } });
  expect(db.installedPlugin.update).toHaveBeenCalledWith({ where: { id: "broken" }, data: { status: "DISABLED" } });
  expect(db.$executeRaw).toHaveBeenCalled(); // unlock
});

it("does nothing when another replica holds the lock", async () => {
  db.$queryRaw.mockResolvedValueOnce([{ locked: false }]);
  db.installedPlugin.findMany.mockClear();
  await runPluginUpgrades();
  expect(db.installedPlugin.findMany).not.toHaveBeenCalled();
});
