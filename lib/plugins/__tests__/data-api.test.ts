const delegate = {
  findUnique: jest.fn().mockResolvedValue({ id: "u1" }),
  findMany: jest.fn().mockResolvedValue([]),
  create: jest.fn(),
  update: jest.fn().mockResolvedValue({ id: "a1" }),
};
const send = jest.fn().mockRejectedValue(new Error("inngest down"));
const writePluginLog = jest.fn();
jest.mock("@/lib/prisma", () => ({ prismadb: { users: delegate, crm_Accounts: delegate, crm_Contacts: delegate, crm_Leads: delegate, crm_Opportunities: delegate, crm_Activities: delegate, crm_Products: delegate } }));
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

it("refuses relation filters and password filters (M9)", async () => {
  const api = createDataApi("demo", ["accounts:read", "users:read"]);
  await expect(api.accounts.find({ where: { assigned_to_user: { password: { startsWith: "$2" } } } } as never)).rejects.toThrow("Invalid filter field: assigned_to_user");
  await expect(api.users.find({ where: { password: { startsWith: "$2" } } } as never)).rejects.toThrow("Invalid filter field: password");
  await expect(api.users.find({ orderBy: { password: "asc" } } as never)).rejects.toThrow("Invalid filter field: password");
  await expect(api.accounts.find({ where: { OR: [{ name: "A" }, { assigned_to_user: { email: "x" } }] } } as never)).rejects.toThrow("Invalid filter field: assigned_to_user");
  expect(delegate.findMany).not.toHaveBeenCalled();
});

it("allows scalar filters with operators and caps take at 100 (M9)", async () => {
  const api = createDataApi("demo", ["accounts:read"]);
  await api.accounts.find({ where: { name: { contains: "Acme" }, AND: [{ status: "Active" }] }, orderBy: [{ createdAt: "desc" }], take: 5000 } as never);
  const arg = delegate.findMany.mock.calls[0][0];
  expect(arg.take).toBe(100);
  expect(arg.where).toEqual({ name: { contains: "Acme" }, AND: [{ status: "Active" }] });
});

it("resolves a non-empty scalar field set for every read API (M9)", async () => {
  const api = createDataApi("demo", ["accounts:read", "contacts:read", "leads:read", "opportunities:read", "activities:read", "users:read", "products:read"]);
  for (const a of [api.accounts, api.contacts, api.leads, api.opportunities, api.activities, api.users, api.products]) {
    await expect(a.find({ where: { id: "x" } })).resolves.toEqual([]);
  }
});
