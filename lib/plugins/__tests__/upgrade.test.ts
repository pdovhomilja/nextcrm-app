import { definePlugin } from "@nextcrm/plugin-sdk";

const db: any = {
  $queryRaw: jest.fn(async () => [{ locked: true }]),
  $transaction: jest.fn(async (cb: any) => cb(db)),
  installedPlugin: { findMany: jest.fn(), update: jest.fn() },
};
jest.mock("@/lib/prisma-base", () => ({ prismaBase: db }));
jest.mock("@/lib/audit-log", () => ({ writeAuditLog: jest.fn() }));
jest.mock("@/lib/plugins/context", () => ({ createPluginContext: jest.fn(async () => ({})) }));
jest.mock("@/lib/plugins/state", () => ({ invalidatePluginCache: jest.fn() }));
jest.mock("@/lib/plugins/log", () => ({ writePluginLog: jest.fn() }));
const onUpgrade = jest.fn();
const failing = jest.fn(async () => { throw new Error("bad"); });
const mk = (id: string, version: string, fn: any) => ({ source: "public", messages: {}, definition: definePlugin({ id, name: id, version, sdk: "^0.2.0", description: "", permissions: [], extensions: () => {}, onUpgrade: fn }) });
let emptyRegistry = false;
jest.mock("@/lib/plugins/registry", () => ({ getRegistry: () => emptyRegistry ? [] : [mk("up", "1.1.0", onUpgrade), mk("same", "1.0.0", onUpgrade), mk("broken", "2.0.0", failing)] }));

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
  const { writeAuditLog } = jest.requireMock("@/lib/audit-log");
  expect(writeAuditLog).toHaveBeenCalledWith({ entityType: "plugin", entityId: "broken", action: "disabled", changes: null, userId: null });
  expect(String((db.$queryRaw.mock.calls[0] as any[])[0])).toContain("pg_try_advisory_xact_lock");
});

it("does nothing when another replica holds the lock", async () => {
  db.$queryRaw.mockResolvedValueOnce([{ locked: false }]);
  db.installedPlugin.findMany.mockClear();
  db.installedPlugin.update.mockClear();
  await runPluginUpgrades();
  expect(db.installedPlugin.findMany).not.toHaveBeenCalled();
  expect(db.installedPlugin.update).not.toHaveBeenCalled();
});

it("returns without a transaction or query when the registry is empty (M1)", async () => {
  emptyRegistry = true;
  db.$transaction.mockClear();
  db.$queryRaw.mockClear();
  db.installedPlugin.findMany.mockClear();
  await runPluginUpgrades();
  expect(db.$transaction).not.toHaveBeenCalled();
  expect(db.$queryRaw).not.toHaveBeenCalled();
  expect(db.installedPlugin.findMany).not.toHaveBeenCalled();
  emptyRegistry = false;
});
