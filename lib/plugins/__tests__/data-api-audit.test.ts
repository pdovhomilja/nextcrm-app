const delegate = {
  findUnique: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
};
const writeAuditLog = jest.fn();
jest.mock("@/lib/prisma", () => ({ prismadb: { crm_Accounts: delegate, crm_Contacts: delegate, crm_Leads: delegate, crm_Opportunities: delegate } }));
jest.mock("@/inngest/client", () => ({ inngest: { send: jest.fn().mockResolvedValue(undefined) } }));
jest.mock("@/lib/audit-log", () => ({ ...jest.requireActual("@/lib/audit-log"), writeAuditLog: (...a: unknown[]) => writeAuditLog(...a) }));

import { createDataApi } from "@/lib/plugins/data-api";

const MARKER = { field: "plugin", old: null, new: "demo" };
const ENTITIES = [
  ["accounts", "account"],
  ["contacts", "contact"],
  ["leads", "lead"],
  ["opportunities", "opportunity"],
] as const;

beforeEach(() => jest.clearAllMocks());

it.each(ENTITIES)("a plugin create of %s writes a created audit row marked with the plugin", async (api, entityType) => {
  delegate.create.mockResolvedValue({ id: "r1", name: "Acme" });
  const data = createDataApi("demo", [`${api}:write`]);
  await data[api].create({ name: "Acme" });
  expect(writeAuditLog).toHaveBeenCalledWith({ entityType, entityId: "r1", action: "created", changes: [MARKER], userId: null });
});

it.each(ENTITIES)("a plugin update of %s writes an updated audit row: plugin marker first, then the field diff", async (api, entityType) => {
  delegate.findUnique.mockResolvedValue({ id: "r1", name: "Old", status: "Open", deletedAt: null, updatedAt: new Date("2026-01-01") });
  delegate.update.mockResolvedValue({ id: "r1", name: "New", status: "Open", deletedAt: null, updatedAt: new Date("2026-02-01") });
  const data = createDataApi("demo", [`${api}:write`]);
  await data[api].update("r1", { name: "New" });
  expect(writeAuditLog).toHaveBeenCalledWith({
    entityType, entityId: "r1", action: "updated", userId: null,
    changes: [MARKER, { field: "name", old: "Old", new: "New" }],
  });
});

it.each(ENTITIES)("a plugin update that sets deletedAt on %s writes a deleted audit row", async (api, entityType) => {
  delegate.findUnique.mockResolvedValue({ id: "r1", name: "Acme", deletedAt: null });
  delegate.update.mockResolvedValue({ id: "r1", name: "Acme", deletedAt: new Date("2026-02-01") });
  const data = createDataApi("demo", [`${api}:write`]);
  await data[api].update("r1", { deletedAt: new Date("2026-02-01") });
  expect(writeAuditLog).toHaveBeenCalledWith({ entityType, entityId: "r1", action: "deleted", changes: [MARKER], userId: null });
});

it.each(ENTITIES)("a plugin update that clears deletedAt on %s writes a restored audit row", async (api, entityType) => {
  delegate.findUnique.mockResolvedValue({ id: "r1", name: "Acme", deletedAt: new Date("2026-02-01") });
  delegate.update.mockResolvedValue({ id: "r1", name: "Acme", deletedAt: null });
  const data = createDataApi("demo", [`${api}:write`]);
  await data[api].update("r1", { deletedAt: null });
  expect(writeAuditLog).toHaveBeenCalledWith({ entityType, entityId: "r1", action: "restored", changes: [MARKER], userId: null });
});
