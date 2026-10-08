const delegate = {
  findUnique: jest.fn().mockResolvedValue({ id: "u1" }),
  findMany: jest.fn().mockResolvedValue([]),
  create: jest.fn(),
  update: jest.fn().mockResolvedValue({ id: "a1" }),
};
const send = jest.fn().mockRejectedValue(new Error("inngest down"));
const writePluginLog = jest.fn();
jest.mock("@/lib/prisma", () => ({ prismadb: { users: delegate, crm_Accounts: delegate } }));
jest.mock("@/inngest/client", () => ({ inngest: { send: (...a: unknown[]) => send(...a) } }));
jest.mock("@/lib/plugins/log", () => ({ writePluginLog: (...a: unknown[]) => writePluginLog(...a) }));

import { createDataApi } from "@/lib/plugins/data-api";

beforeEach(() => jest.clearAllMocks());

it("never selects the password for users, even when the caller asks", async () => {
  const api = createDataApi("demo", ["users:read"]);
  await api.users.get("u1");
  expect(delegate.findUnique).toHaveBeenCalledWith({ where: { id: "u1" }, omit: { password: true } });
  await api.users.find({ where: { role: "admin" }, select: { password: true }, omit: { password: false } } as never);
  const arg = delegate.findMany.mock.calls[0][0];
  expect(arg.omit).toEqual({ password: true });
  expect(arg.select).toBeUndefined();
  expect(arg.where).toEqual({ role: "admin" });
});

it("catches and logs a failed saved-event emit", async () => {
  send.mockRejectedValue(new Error("inngest down"));
  const api = createDataApi("demo", ["accounts:write"]);
  await api.accounts.update("a1", { name: "x" });
  await new Promise((r) => setImmediate(r));
  expect(writePluginLog).toHaveBeenCalledWith("demo", "error", "Failed to emit saved event", expect.objectContaining({ recordId: "a1" }));
});

it("tags saved events with the writing plugin as source (I2)", async () => {
  send.mockResolvedValue(undefined);
  const api = createDataApi("demo", ["accounts:write"]);
  await api.accounts.update("a1", { name: "x" });
  expect(send).toHaveBeenCalledWith({ name: "crm/account.saved", data: { record_id: "a1", source: "demo" } });
});

it("drops include/select on every entity so relations cannot leak users credentials (M9)", async () => {
  const api = createDataApi("demo", ["accounts:read", "users:read"]);
  await api.accounts.find({ where: { name: "A" }, include: { assigned_to_user: true }, select: { assigned_to_user: { select: { password: true } } } } as never);
  expect(delegate.findMany).toHaveBeenLastCalledWith({ where: { name: "A" }, orderBy: undefined, take: 100, skip: undefined });
  await api.users.find();
  expect(delegate.findMany).toHaveBeenLastCalledWith(expect.objectContaining({ take: 100, omit: { password: true } }));
});
