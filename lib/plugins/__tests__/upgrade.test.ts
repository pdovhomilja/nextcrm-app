import { definePlugin } from "@nextcrm/plugin-sdk";

type TxClient = { $queryRaw: jest.Mock; installedPlugin: { findMany: jest.Mock } };
const db = {
  $queryRaw: jest.fn(async (..._args: unknown[]) => [{ locked: true }]),
  $transaction: jest.fn(async (cb: (tx: TxClient) => Promise<unknown>): Promise<unknown> => cb(db)),
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
  expect(String(db.$queryRaw.mock.calls[0][0])).toContain("pg_try_advisory_xact_lock");
});

it("does nothing when another replica holds the lock", async () => {
  db.$queryRaw.mockResolvedValueOnce([{ locked: false }]);
  db.installedPlugin.findMany.mockResolvedValue([{ id: "up", version: "1.0.0", status: "ENABLED" }]);
  db.installedPlugin.update.mockClear();
  onUpgrade.mockClear();
  await runPluginUpgrades();
  expect(db.installedPlugin.update).not.toHaveBeenCalled();
  expect(onUpgrade).not.toHaveBeenCalled();
});

describe("pre-check outside the transaction", () => {
  beforeEach(() => {
    db.$transaction.mockClear();
    db.$queryRaw.mockClear();
    db.installedPlugin.findMany.mockReset();
    db.installedPlugin.update.mockClear();
    onUpgrade.mockClear();
  });

  it("opens no transaction when nothing is installed: one plain query", async () => {
    db.installedPlugin.findMany.mockResolvedValue([]);
    await runPluginUpgrades();
    expect(db.installedPlugin.findMany).toHaveBeenCalledTimes(1);
    expect(db.$transaction).not.toHaveBeenCalled();
    expect(db.$queryRaw).not.toHaveBeenCalled();
  });

  it("opens no transaction when installed rows are current or unknown to the registry", async () => {
    db.installedPlugin.findMany.mockResolvedValue([
      { id: "same", version: "1.0.0", status: "ENABLED" },
      { id: "up", version: "1.1.0", status: "ENABLED" },
      { id: "ghost", version: "0.1.0", status: "ENABLED" },
    ]);
    await runPluginUpgrades();
    expect(db.$transaction).not.toHaveBeenCalled();
    expect(db.installedPlugin.update).not.toHaveBeenCalled();
  });

  it("takes the lock and upgrades when a row is behind, re-reading rows on the transaction client", async () => {
    const txFindMany = jest.fn(async () => [{ id: "up", version: "1.0.0", status: "ENABLED" }]);
    const tx = { $queryRaw: db.$queryRaw, installedPlugin: { findMany: txFindMany } };
    db.$transaction.mockImplementationOnce(async (cb) => cb(tx));
    db.installedPlugin.findMany.mockResolvedValue([{ id: "up", version: "1.0.0", status: "ENABLED" }]);
    await runPluginUpgrades();
    expect(db.$transaction).toHaveBeenCalledTimes(1);
    expect(txFindMany).toHaveBeenCalledTimes(1);
    expect(onUpgrade).toHaveBeenCalledWith({}, "1.0.0");
    expect(db.installedPlugin.update).toHaveBeenCalledWith({ where: { id: "up" }, data: { version: "1.1.0" } });
  });

  it("does not upgrade when another replica already did between the pre-check and the lock", async () => {
    const tx = { $queryRaw: db.$queryRaw, installedPlugin: { findMany: jest.fn(async () => [{ id: "up", version: "1.1.0", status: "ENABLED" }]) } };
    db.$transaction.mockImplementationOnce(async (cb) => cb(tx));
    db.installedPlugin.findMany.mockResolvedValue([{ id: "up", version: "1.0.0", status: "ENABLED" }]);
    await runPluginUpgrades();
    expect(onUpgrade).not.toHaveBeenCalled();
    expect(db.installedPlugin.update).not.toHaveBeenCalled();
  });
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
