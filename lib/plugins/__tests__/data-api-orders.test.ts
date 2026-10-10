jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
const db: Record<string, any> = {
  crm_Orders: { findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn(), updateMany: jest.fn(), update: jest.fn() },
  crm_OrderLines: { deleteMany: jest.fn(), createMany: jest.fn() },
  crm_Accounts: { findFirst: jest.fn() },
  crm_Products: { findFirst: jest.fn() },
  $queryRaw: jest.fn(),
};
db.$transaction = jest.fn(async (fn: (tx: unknown) => unknown) => fn(db));
jest.mock("@/lib/prisma", () => ({ prismadb: db }));
jest.mock("@/inngest/client", () => ({ inngest: { send: jest.fn().mockResolvedValue(undefined) } }));
jest.mock("@/lib/audit-log", () => ({ writeAuditLog: jest.fn() }));
jest.mock("@/lib/currency", () => ({ getDefaultCurrency: jest.fn().mockResolvedValue("CZK") }));
jest.mock("@/lib/resend", () => ({ __esModule: true, default: jest.fn() }));

import { Decimal } from "decimal.js";
import { createDataApi } from "@/lib/plugins/data-api";
import { MODEL_TO_ENTITY } from "@/lib/plugins/rules";
import { SDK_VERSION } from "@nextcrm/plugin-sdk";

beforeEach(() => {
  jest.clearAllMocks();
  db.crm_Accounts.findFirst.mockResolvedValue({ id: "acc", assigned_to: "rep", pricelist_id: null });
  db.crm_Products.findFirst.mockResolvedValue({ id: "p1", name: "Tea", sku: "T", unit: "pcs", tax_rate: new Decimal(12) });
  db.$queryRaw.mockResolvedValue([{ id: "s1", template: "ORD-{YYYY}-{####}", counter: 5, currentYear: 2026 }]);
  db.crm_Orders.create.mockImplementation(async ({ data }: any) => ({ id: "o1", ...data }));
  db.crm_Orders.updateMany.mockResolvedValue({ count: 1 });
});

it("maps crm_Orders to the order entity", () => {
  expect(MODEL_TO_ENTITY.crm_Orders).toBe("order");
});

it("needs the orders permissions", async () => {
  const api = createDataApi("conn", []);
  await expect(api.orders.get("o1")).rejects.toThrow();
  await expect(api.orders.create({ accountId: "acc", externalRef: "SO1", status: "CONFIRMED", lines: [] })).rejects.toThrow();
});

it("creates EXTERNAL orders with plugin prices that are never below list", async () => {
  const api = createDataApi("conn", ["orders:write"]);
  await api.orders.create({ accountId: "acc", externalRef: "SO1", status: "CONFIRMED", lines: [{ productId: "p1", quantity: 2, unitPrice: "10.5" }] });
  const data = db.crm_Orders.create.mock.calls[0][0].data;
  expect(data).toMatchObject({ source: "EXTERNAL", externalRef: "SO1", status: "CONFIRMED", ownerId: "rep", number: expect.stringMatching(/^ORD-\d{4}-0005$/), currency: "CZK" });
  expect(data.lines.create[0]).toMatchObject({ unitPriceOverridden: false });
  expect(data.lines.create[0].listPrice.toFixed(2)).toBe("10.50");
  expect(data.lines.create[0].unitPrice.toFixed(2)).toBe("10.50");
});

it("lets a plugin move READY → SENT but not approve or touch drafts (Review Focus 4)", async () => {
  const api = createDataApi("conn", ["orders:write"]);
  db.crm_Orders.findUnique.mockResolvedValue({ id: "o1", status: "READY", source: "CRM", createdBy: "rep", externalRef: null });
  await api.orders.update("o1", { status: "SENT", externalRef: "SO1" });
  expect(db.crm_Orders.updateMany.mock.calls[0][0]).toMatchObject({ where: { id: "o1", status: "READY" }, data: { status: "SENT", externalRef: "SO1", updatedBy: null } });
  db.crm_Orders.findUnique.mockResolvedValue({ id: "o1", status: "DRAFT", source: "CRM", createdBy: "rep", externalRef: null });
  await expect(api.orders.update("o1", { status: "SENT" })).rejects.toThrow("cannot set SENT on a DRAFT order");
  db.crm_Orders.findUnique.mockResolvedValue({ id: "o1", status: "PENDING_APPROVAL", source: "CRM", createdBy: "rep", externalRef: null });
  await expect(api.orders.update("o1", { status: "READY" as never })).rejects.toThrow();
});

it("refuses line changes on CRM orders", async () => {
  const api = createDataApi("conn", ["orders:write"]);
  db.crm_Orders.findUnique.mockResolvedValue({ id: "o1", status: "SENT", source: "CRM", createdBy: "rep", externalRef: "SO1" });
  await expect(api.orders.update("o1", { lines: [] })).rejects.toThrow("only EXTERNAL orders");
});

it("leaves lines alone when the status change is refused, and writes lines + status together (review I4)", async () => {
  const api = createDataApi("conn", ["orders:write"]);
  db.crm_Orders.findUnique.mockResolvedValue({ id: "o1", status: "DRAFT", source: "EXTERNAL", createdBy: null, externalRef: "SO1" });
  await expect(api.orders.update("o1", { status: "SENT", lines: [{ productId: "p1", quantity: 1, unitPrice: 5 }] })).rejects.toThrow();
  expect(db.crm_OrderLines.deleteMany).not.toHaveBeenCalled();
  db.crm_Orders.findUnique.mockResolvedValue({ id: "o1", status: "SENT", source: "EXTERNAL", createdBy: null, externalRef: "SO1" });
  db.crm_Orders.updateMany.mockResolvedValue({ count: 0 });
  await expect(api.orders.update("o1", { status: "CONFIRMED", lines: [{ productId: "p1", quantity: 1, unitPrice: 5 }] })).rejects.toThrow();
  expect(db.$transaction).toHaveBeenCalled();
  expect(db.crm_OrderLines.createMany).not.toHaveBeenCalled();
});

it("refuses to create EXTERNAL orders in statuses plugins may not set (review I5)", async () => {
  const api = createDataApi("conn", ["orders:write"]);
  for (const status of ["DRAFT", "PENDING_APPROVAL", "READY", "SYNC_FAILED"]) {
    await expect(api.orders.create({ accountId: "acc", externalRef: "SO2", status: status as never, lines: [] })).rejects.toThrow(`cannot create an order as ${status}`);
  }
  expect(db.crm_Orders.create).not.toHaveBeenCalled();
});

it("is SDK 0.2.3 (additive)", () => expect(SDK_VERSION).toBe("0.2.3"));

it("takes the external order date on create and update, EXTERNAL only", async () => {
  const api = createDataApi("conn", ["orders:write"]);
  await api.orders.create({ accountId: "acc", externalRef: "SO7", status: "CONFIRMED", orderDate: "2025-03-31", lines: [] });
  expect(db.crm_Orders.create.mock.calls[0][0].data.orderDate).toEqual(new Date("2025-03-31T00:00:00Z"));
  db.crm_Orders.findUnique.mockResolvedValue({ id: "o1", status: "CONFIRMED", source: "EXTERNAL", createdBy: null, externalRef: "SO7" });
  await api.orders.update("o1", { orderDate: "2025-04-01" });
  expect(db.crm_Orders.update.mock.calls.at(-1)[0].data).toMatchObject({ orderDate: new Date("2025-04-01T00:00:00Z") });
  db.crm_Orders.findUnique.mockResolvedValue({ id: "o2", status: "CONFIRMED", source: "CRM", createdBy: "rep", externalRef: "SO8" });
  await expect(api.orders.update("o2", { orderDate: "2025-04-01" })).rejects.toThrow("only EXTERNAL orders");
});

it("refuses malformed order dates (Review Focus 5)", async () => {
  const api = createDataApi("conn", ["orders:write"]);
  for (const orderDate of ["2026-13-40", "yesterday", "2026-02-30"]) {
    await expect(api.orders.create({ accountId: "acc", externalRef: "SO9", status: "CONFIRMED", orderDate, lines: [] })).rejects.toThrow("Invalid orderDate");
  }
  expect(db.crm_Orders.create).not.toHaveBeenCalled();
});
