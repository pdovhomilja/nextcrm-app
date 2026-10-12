jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
const db: Record<string, any> = {
  crm_Orders: { findFirst: jest.fn(), updateMany: jest.fn() },
  crm_OrderLines: { deleteMany: jest.fn(), createMany: jest.fn() },
  crm_Products: { findFirst: jest.fn() },
  crm_SystemSettings: { findUnique: jest.fn() },
  users: { findMany: jest.fn(), findUnique: jest.fn() },
  exchangeRate: { findMany: jest.fn() },
};
db.$transaction = jest.fn(async (fn: (tx: unknown) => unknown) => fn(db));
jest.mock("@/lib/prisma", () => ({ prismadb: db }));
jest.mock("@/lib/audit-log", () => ({ writeAuditLog: jest.fn() }));
const send = jest.fn();
jest.mock("@/lib/resend", () => ({ __esModule: true, default: jest.fn(async () => ({ emails: { send } })) }));
jest.mock("@/lib/pricing/get-price", () => ({ ...jest.requireActual("@/lib/pricing/get-price"), getPrice: jest.fn() }));

import { Decimal } from "decimal.js";
import { getPrice } from "@/lib/pricing/get-price";
import { writeAuditLog } from "@/lib/audit-log";
import { changeStatus, decideApproval, submitOrder } from "@/lib/orders/workflow";

const rep = { id: "rep", role: "user" as const };
const manager = { id: "m", role: "manager" as const };
const line = (over = {}) => ({ productId: "p1", quantity: new Decimal(1), unitPrice: new Decimal(49), unitPriceOverridden: false, listPrice: new Decimal(49), ...over });
const order = (over = {}) => ({ id: "o1", number: "ORD-2026-0001", status: "DRAFT", source: "CRM", createdBy: "rep", externalRef: null, accountId: "acc", priceListId: "L", currency: "CZK", lines: [line()], ...over });
const listPrice = (v: string) => (getPrice as jest.Mock).mockResolvedValue({ price: new Decimal(v), currency: "CZK", listPrice: new Decimal(100), ruleId: "r", steps: [] });

beforeEach(() => {
  jest.clearAllMocks();
  db.crm_Products.findFirst.mockResolvedValue({ id: "p1", name: "Tea", sku: null, unit: null, status: "ACTIVE", tax_rate: null });
  db.crm_Orders.updateMany.mockResolvedValue({ count: 1 });
  db.crm_SystemSettings.findUnique.mockResolvedValue(null);
  db.users.findMany.mockResolvedValue([{ email: "boss@x.test" }]);
  db.users.findUnique.mockResolvedValue({ email: "rep@x.test" });
  listPrice("49");
});

const statusUpdate = () => [...db.crm_Orders.updateMany.mock.calls].reverse().find((c: any[]) => "status" in c[0].data)[0];

it("sends a rep's below-list order to approval and emails managers", async () => {
  db.crm_Orders.findFirst.mockResolvedValue(order({ lines: [line({ unitPrice: new Decimal(45), unitPriceOverridden: true })] }));
  await expect(submitOrder(rep, "o1")).resolves.toEqual({ status: "PENDING_APPROVAL" });
  expect(statusUpdate()).toMatchObject({ where: { id: "o1", status: "DRAFT" }, data: { status: "PENDING_APPROVAL", approvalRequestedAt: expect.any(Date) } });
  expect(send).toHaveBeenCalledWith(expect.objectContaining({ to: ["boss@x.test"] }));
  expect(writeAuditLog).toHaveBeenCalledWith(expect.objectContaining({ entityType: "order", changes: [{ field: "status", old: "DRAFT", new: "PENDING_APPROVAL" }] }));
});

it("lets managers' own below-list prices through", async () => {
  db.crm_Orders.findFirst.mockResolvedValue(order({ createdBy: "m", lines: [line({ unitPrice: new Decimal(1), unitPriceOverridden: true })] }));
  await expect(submitOrder(manager, "o1")).resolves.toEqual({ status: "READY" });
  expect(send).not.toHaveBeenCalled();
});

it("re-prices an old draft on submit; typed prices stay (Review Focus 2)", async () => {
  listPrice("55");
  db.crm_Orders.findFirst.mockResolvedValue(order({ lines: [line(), line({ unitPrice: new Decimal(50), unitPriceOverridden: true })] }));
  await expect(submitOrder(rep, "o1")).resolves.toEqual({ status: "PENDING_APPROVAL" });
  const saved = db.crm_OrderLines.createMany.mock.calls[0][0].data;
  expect(saved.map((l: any) => [l.listPrice.toFixed(2), l.unitPrice.toFixed(2)])).toEqual([["55.00", "55.00"], ["55.00", "50.00"]]);
});

it("refuses an empty order", async () => {
  db.crm_Orders.findFirst.mockResolvedValue(order({ lines: [] }));
  await expect(submitOrder(rep, "o1")).rejects.toMatchObject({ code: "noLines" });
});

it("approves and rejects with a required note, emailing the creator", async () => {
  db.crm_Orders.findFirst.mockResolvedValue(order({ status: "PENDING_APPROVAL" }));
  await expect(decideApproval(rep, "o1", "APPROVED")).rejects.toMatchObject({ code: "forbidden" });
  await expect(decideApproval(manager, "o1", "REJECTED", "  ")).rejects.toMatchObject({ code: "noteRequired" });
  await expect(decideApproval(manager, "o1", "REJECTED", "Too cheap")).resolves.toEqual({ status: "DRAFT" });
  expect(statusUpdate()).toMatchObject({ data: { status: "DRAFT", approvalNote: "Too cheap", approvalRequestedAt: null } });
  expect(send).toHaveBeenCalledWith(expect.objectContaining({ to: ["rep@x.test"] }));
  jest.clearAllMocks();
  db.crm_Orders.updateMany.mockResolvedValue({ count: 1 });
  await expect(decideApproval(manager, "o1", "APPROVED")).resolves.toEqual({ status: "READY" });
  expect(statusUpdate()).toMatchObject({ data: { status: "READY", approvedBy: "m", approvedAt: expect.any(Date) } });
});

it("lets exactly one of two parallel decisions win (Review Focus 1)", async () => {
  db.crm_Orders.findFirst.mockResolvedValue(order({ status: "PENDING_APPROVAL" }));
  db.crm_Orders.updateMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 });
  const results = await Promise.allSettled([decideApproval(manager, "o1", "APPROVED"), changeStatus(rep, "o1", "withdraw")]);
  expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  expect(results.find((r) => r.status === "rejected")).toMatchObject({ reason: { code: "changed" } });
});

it("does not email when the setting is off, and a mail failure never undoes the move", async () => {
  db.crm_SystemSettings.findUnique.mockResolvedValue({ value: "false" });
  db.crm_Orders.findFirst.mockResolvedValue(order({ lines: [line({ unitPrice: new Decimal(1), unitPriceOverridden: true })] }));
  await submitOrder(rep, "o1");
  expect(send).not.toHaveBeenCalled();
  db.crm_SystemSettings.findUnique.mockResolvedValue(null);
  send.mockRejectedValueOnce(new Error("smtp down"));
  await expect(submitOrder(rep, "o1")).resolves.toEqual({ status: "PENDING_APPROVAL" });
});

it("withdraws, reopens (clearing approval), cancels, retries and advances", async () => {
  db.crm_Orders.findFirst.mockResolvedValue(order({ status: "PENDING_APPROVAL" }));
  await expect(changeStatus(rep, "o1", "withdraw")).resolves.toEqual({ status: "DRAFT" });
  db.crm_Orders.findFirst.mockResolvedValue(order({ status: "READY" }));
  await expect(changeStatus(rep, "o1", "reopen")).resolves.toEqual({ status: "DRAFT" });
  expect(statusUpdate()).toMatchObject({ data: { approvedBy: null, approvedAt: null, approvalRequestedAt: null } });
  await expect(changeStatus(rep, "o1", "advance", "SENT")).rejects.toMatchObject({ code: "forbidden" });
  await expect(changeStatus(manager, "o1", "advance", "DELIVERED")).resolves.toEqual({ status: "DELIVERED" });
  await expect(changeStatus(manager, "o1", "advance", "DRAFT" as never)).rejects.toMatchObject({ code: "forbidden" });
  await expect(changeStatus(rep, "o1", "cancel")).resolves.toEqual({ status: "CANCELLED" });
  db.crm_Orders.findFirst.mockResolvedValue(order({ status: "SYNC_FAILED" }));
  await expect(changeStatus(manager, "o1", "retry")).resolves.toEqual({ status: "READY" });
});

it("re-prices and changes status in one conditional write (review I1)", async () => {
  db.crm_Orders.findFirst.mockResolvedValue(order({ lines: [line({ unitPrice: new Decimal(45), unitPriceOverridden: true })] }));
  await submitOrder(rep, "o1");
  expect(db.crm_Orders.updateMany).toHaveBeenCalledTimes(1);
  expect(db.crm_Orders.updateMany.mock.calls[0][0]).toMatchObject({ where: { id: "o1", status: "DRAFT" }, data: { status: "PENDING_APPROVAL", subtotal: expect.anything() } });
});

it("refuses an approval for a version the manager did not see (review I2)", async () => {
  const seen = new Date("2026-10-10T08:00:00Z");
  db.crm_Orders.findFirst.mockResolvedValue(order({ status: "PENDING_APPROVAL", updatedAt: new Date("2026-10-10T08:05:00Z") }));
  await expect(decideApproval(manager, "o1", "APPROVED", null, seen.toISOString())).rejects.toMatchObject({ code: "changed" });
  expect(db.crm_Orders.updateMany).not.toHaveBeenCalled();
  db.crm_Orders.findFirst.mockResolvedValue(order({ status: "PENDING_APPROVAL", updatedAt: seen }));
  await decideApproval(manager, "o1", "APPROVED", null, seen.toISOString());
  expect(statusUpdate()).toMatchObject({ where: { id: "o1", status: "PENDING_APPROVAL", updatedAt: seen } });
});
