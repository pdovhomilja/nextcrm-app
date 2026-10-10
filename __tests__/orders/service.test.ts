jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
const db: Record<string, any> = {
  crm_Products: { findFirst: jest.fn() },
  crm_Accounts: { findFirst: jest.fn() },
  crm_Contacts: { findFirst: jest.fn() },
  crm_PriceLists: { findUnique: jest.fn() },
  crm_Orders: { create: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(), count: jest.fn(), updateMany: jest.fn(), deleteMany: jest.fn() },
  crm_OrderLines: { deleteMany: jest.fn(), createMany: jest.fn() },
  exchangeRate: { findMany: jest.fn() },
  $queryRaw: jest.fn(),
};
db.$transaction = jest.fn(async (fn: (tx: unknown) => unknown) => fn(db));
jest.mock("@/lib/prisma", () => ({ prismadb: db }));
jest.mock("@/lib/audit-log", () => ({ writeAuditLog: jest.fn() }));
jest.mock("@/lib/currency", () => ({ getDefaultCurrency: jest.fn().mockResolvedValue("CZK") }));
jest.mock("@/lib/pricing/get-price", () => ({
  ...jest.requireActual("@/lib/pricing/get-price"),
  getPrice: jest.fn(),
  resolvePriceListId: jest.fn(),
}));
jest.mock("@/lib/authz/scopes/crm", () => ({
  ...jest.requireActual("@/lib/authz/scopes/crm"),
  assertCanWriteAccount: jest.fn(),
  assertCanReadAccount: jest.fn(),
}));

import { Decimal } from "decimal.js";
import { getPrice, resolvePriceListId } from "@/lib/pricing/get-price";
import { MissingRateError } from "@/lib/pricing/errors";
import { assertCanWriteAccount } from "@/lib/authz/scopes/crm";
import { AuthorizationError } from "@/lib/authz/errors";
import { writeAuditLog } from "@/lib/audit-log";
import { createOrder, deleteDraft, loadOrder, priceLine, updateDraft } from "@/lib/orders/service";
import { OrderError } from "@/lib/orders/types";

const rep = { id: "rep", role: "user" as const };
const product = { id: "p1", name: "Green tea", sku: "GT", unit: "pcs", status: "ACTIVE", tax_rate: new Decimal(12), deletedAt: null };
const account = { id: "acc", name: "Café", assigned_to: "rep", deletedAt: null, shipping_street: null, shipping_city: null, shipping_state: null, shipping_postal_code: null, shipping_country: null, billing_street: "Main 1", billing_city: "Praha", billing_state: null, billing_postal_code: "11000", billing_country: "CZ" };
const draft = (over = {}) => ({ id: "o1", number: "ORD-2026-0001", status: "DRAFT", source: "CRM", createdBy: "rep", externalRef: null, accountId: "acc", priceListId: "L", currency: "CZK", lines: [], ...over });

beforeEach(() => {
  jest.clearAllMocks();
  db.crm_Products.findFirst.mockResolvedValue(product);
  db.crm_Accounts.findFirst.mockResolvedValue(account);
  db.crm_PriceLists.findUnique.mockResolvedValue({ currency: "CZK" });
  (resolvePriceListId as jest.Mock).mockResolvedValue("L");
  (getPrice as jest.Mock).mockResolvedValue({ price: new Decimal("49.004"), currency: "CZK", listPrice: new Decimal(100), ruleId: "r1", steps: [] });
  db.$queryRaw.mockResolvedValue([{ id: "s1", template: "ORD-{YYYY}-{####}", counter: 1, currentYear: 2026 }]);
  db.crm_Orders.create.mockImplementation(async ({ data }: any) => ({ id: "o1", ...data }));
  db.crm_Orders.updateMany.mockResolvedValue({ count: 1 });
  db.crm_Orders.deleteMany.mockResolvedValue({ count: 1 });
});

it("prices a line from the list and follows it unless a price was typed", async () => {
  const ctx = { priceListId: "L", currency: "CZK" };
  const follow = await priceLine(ctx, { productId: "p1", quantity: 3 }, 0);
  expect([follow.listPrice.toFixed(2), follow.unitPrice.toFixed(2), follow.unitPriceOverridden, follow.priceRuleId]).toEqual(["49.00", "49.00", false, "r1"]);
  expect([follow.vatRate.toFixed(2), follow.lineSubtotal.toFixed(2), follow.lineVat.toFixed(2)]).toEqual(["12.00", "147.00", "17.64"]);
  expect([follow.productName, follow.sku, follow.unit]).toEqual(["Green tea", "GT", "pcs"]);
  const typed = await priceLine(ctx, { productId: "p1", quantity: 3, unitPrice: "45" }, 1);
  expect([typed.unitPrice.toFixed(2), typed.unitPriceOverridden]).toEqual(["45.00", true]);
});

it("converts a product price into the order currency (Review Focus 5)", async () => {
  (getPrice as jest.Mock).mockResolvedValue({ price: new Decimal(4), currency: "EUR", listPrice: new Decimal(4), ruleId: null, steps: [] });
  db.exchangeRate.findMany.mockResolvedValue([{ fromCurrency: "CZK", toCurrency: "EUR", rate: "0.04" }]);
  const line = await priceLine({ priceListId: null, currency: "CZK" }, { productId: "p1", quantity: 1 }, 0);
  expect(line.listPrice.toFixed(2)).toBe("100.00");
  db.exchangeRate.findMany.mockResolvedValue([]);
  await expect(priceLine({ priceListId: null, currency: "CZK" }, { productId: "p1", quantity: 1 }, 0)).rejects.toEqual(new OrderError("pricing", new MissingRateError("EUR", "CZK").message));
});

it("refuses inactive products, bad quantities and negative prices", async () => {
  db.crm_Products.findFirst.mockResolvedValue({ ...product, status: "DRAFT" });
  await expect(priceLine({ priceListId: "L", currency: "CZK" }, { productId: "p1", quantity: 1 }, 0)).rejects.toMatchObject({ code: "productInactive" });
  db.crm_Products.findFirst.mockResolvedValue(product);
  await expect(priceLine({ priceListId: "L", currency: "CZK" }, { productId: "p1", quantity: 0 }, 0)).rejects.toMatchObject({ code: "invalid" });
  await expect(priceLine({ priceListId: "L", currency: "CZK" }, { productId: "p1", quantity: 1, unitPrice: -1 }, 0)).rejects.toMatchObject({ code: "invalid" });
});

it("creates a numbered draft with the owner, list, currency and billing address fallback", async () => {
  await expect(createOrder(rep, { accountId: "acc", lines: [{ productId: "p1", quantity: 2 }] })).resolves.toEqual({ id: "o1", number: "ORD-2026-0001" });
  const data = db.crm_Orders.create.mock.calls[0][0].data;
  expect(data).toMatchObject({ number: "ORD-2026-0001", seriesId: "s1", accountId: "acc", ownerId: "rep", priceListId: "L", currency: "CZK", createdBy: "rep", shipping_street: "Main 1", shipping_city: "Praha", shipping_postal_code: "11000", shipping_country: "CZ" });
  expect(data.subtotal.toFixed(2)).toBe("98.00");
  expect(data.lines.create).toHaveLength(1);
  expect(writeAuditLog).toHaveBeenCalledWith(expect.objectContaining({ entityType: "order", action: "created", entityId: "o1" }));
});

it("hides accounts the user cannot write and contacts from other accounts", async () => {
  (assertCanWriteAccount as jest.Mock).mockRejectedValueOnce(new AuthorizationError());
  await expect(createOrder(rep, { accountId: "acc", lines: [] })).rejects.toMatchObject({ code: "notFound" });
  db.crm_Contacts.findFirst.mockResolvedValue({ id: "c1", accountsIDs: "other" });
  await expect(createOrder(rep, { accountId: "acc", contactId: "c1", lines: [] })).rejects.toMatchObject({ code: "contactNotOnAccount" });
});

it("returns not found for orders outside the scope (Review Focus 3)", async () => {
  db.crm_Orders.findFirst.mockResolvedValue(null);
  await expect(loadOrder(rep, "o9")).rejects.toMatchObject({ code: "notFound" });
  expect(db.crm_Orders.findFirst.mock.calls[0][0].where).toMatchObject({ id: "o9", OR: expect.any(Array) });
});

it("edits only drafts, replaces lines and reports a concurrent change", async () => {
  db.crm_Orders.findFirst.mockResolvedValue(draft());
  await updateDraft(rep, "o1", { note: "rush", lines: [{ productId: "p1", quantity: 1 }] });
  expect(db.crm_Orders.updateMany.mock.calls[0][0]).toMatchObject({ where: { id: "o1", status: "DRAFT" }, data: { note: "rush", updatedBy: "rep" } });
  expect(db.crm_OrderLines.deleteMany).toHaveBeenCalledWith({ where: { orderId: "o1" } });
  expect(db.crm_OrderLines.createMany.mock.calls[0][0].data[0]).toMatchObject({ orderId: "o1", productId: "p1", position: 0 });
  db.crm_Orders.updateMany.mockResolvedValue({ count: 0 });
  await expect(updateDraft(rep, "o1", { lines: [] })).rejects.toMatchObject({ code: "changed" });
  db.crm_Orders.findFirst.mockResolvedValue(draft({ status: "READY" }));
  await expect(updateDraft(rep, "o1", { lines: [] })).rejects.toMatchObject({ code: "forbidden" });
});

it("deletes drafts only", async () => {
  db.crm_Orders.findFirst.mockResolvedValue(draft());
  await expect(deleteDraft(rep, "o1")).resolves.toEqual({ id: "o1" });
  expect(db.crm_Orders.deleteMany).toHaveBeenCalledWith({ where: { id: "o1", status: "DRAFT" } });
  db.crm_Orders.findFirst.mockResolvedValue(draft({ status: "CANCELLED" }));
  await expect(deleteDraft(rep, "o1")).rejects.toMatchObject({ code: "forbidden" });
});

it("audits only the header fields that changed", async () => {
  db.crm_Orders.findFirst.mockResolvedValue(draft({ note: "rush", contactId: null, shipping_city: "Praha", requestedDeliveryDate: new Date("2026-10-20T00:00:00Z") }));
  await updateDraft(rep, "o1", { note: "rush", contactId: null, shipping_city: "Brno", requestedDeliveryDate: "2026-10-20", lines: [] });
  const changes = (writeAuditLog as jest.Mock).mock.calls.at(-1)[0].changes;
  expect(changes).toEqual([{ field: "shipping_city", old: "Praha", new: "Brno" }, { field: "lines", old: 0, new: 0 }]);
});
