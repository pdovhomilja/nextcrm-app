"use server";
import { prismadb } from "@/lib/prisma";
import { requireAuthenticated, isManagerOrAdmin, accountReadScopeWhere, orderReadScopeWhere } from "@/lib/authz";
import { listOrders, loadOrder, pricingContextForAccount } from "@/lib/orders/service";
import { serializeOrder } from "@/lib/orders/serialize";
import { toActor } from "@/lib/orders/transitions";
import { OrderError } from "@/lib/orders/types";

export async function getOrders(filters: { status?: string; ownerId?: string; accountId?: string } = {}) {
  const user = await requireAuthenticated();
  return (await listOrders(user, { ...filters, limit: 200, offset: 0 })).data;
}

export async function getOrder(id: string) {
  const user = await requireAuthenticated();
  try {
    return serializeOrder(await loadOrder(user, id), toActor(user));
  } catch (e) {
    if (e instanceof OrderError && e.code === "notFound") return null;
    throw e;
  }
}
export type OrderDetail = NonNullable<Awaited<ReturnType<typeof getOrder>>>;

export async function getOrderFormData(accountId: string) {
  const user = await requireAuthenticated();
  const account = await prismadb.crm_Accounts.findFirst({ where: { id: accountId, ...accountReadScopeWhere(user) } });
  if (!account) return null;
  const [contacts, ctx] = await Promise.all([
    prismadb.crm_Contacts.findMany({ where: { accountsIDs: accountId }, select: { id: true, first_name: true, last_name: true }, orderBy: { last_name: "asc" } }),
    pricingContextForAccount(accountId),
  ]);
  const list = ctx.priceListId ? await prismadb.crm_PriceLists.findUnique({ where: { id: ctx.priceListId }, select: { name: true } }) : null;
  const useShipping = !!(account.shipping_street || account.shipping_city);
  const a = account as unknown as Record<string, string | null>;
  const pick = (k: string) => a[useShipping ? `shipping_${k}` : `billing_${k}`] ?? null;
  return {
    accountId, accountName: account.name, priceListName: list?.name ?? null, currency: ctx.currency,
    contacts: contacts.map((c) => ({ id: c.id, name: [c.first_name, c.last_name].filter(Boolean).join(" ") })),
    shipping: { shipping_street: pick("street"), shipping_city: pick("city"), shipping_state: pick("state"), shipping_postal_code: pick("postal_code"), shipping_country: pick("country") },
  };
}
export type OrderFormData = NonNullable<Awaited<ReturnType<typeof getOrderFormData>>>;

export async function getProductOptions() {
  await requireAuthenticated();
  return prismadb.crm_Products.findMany({ where: { deletedAt: null, status: "ACTIVE" }, select: { id: true, name: true, sku: true }, orderBy: { name: "asc" } });
}
export type ProductOption = Awaited<ReturnType<typeof getProductOptions>>[number];

export async function getOwnerOptions() {
  const user = await requireAuthenticated();
  if (!isManagerOrAdmin(user)) return [];
  return prismadb.users.findMany({ where: { userStatus: "ACTIVE" }, select: { id: true, name: true }, orderBy: { name: "asc" } });
}

export async function getPendingOrderApprovals() {
  const user = await requireAuthenticated();
  if (!isManagerOrAdmin(user)) return [];
  return (await listOrders(user, { status: "PENDING_APPROVAL", limit: 200, offset: 0 })).data;
}

export async function getAccountOrders(accountId: string) {
  const user = await requireAuthenticated();
  return (await listOrders(user, { accountId, limit: 200, offset: 0 })).data;
}

export async function getOrderHistory(id: string) {
  const user = await requireAuthenticated();
  const visible = await prismadb.crm_Orders.findFirst({ where: { id, ...orderReadScopeWhere(user) }, select: { id: true } });
  if (!visible) return [];
  const rows = await prismadb.crm_AuditLog.findMany({ where: { entityType: "order", entityId: id }, orderBy: { createdAt: "desc" }, take: 100, include: { user: { select: { name: true } } } });
  return rows.map((r) => ({ id: r.id, action: r.action, changes: r.changes as unknown, userName: r.user?.name ?? null, createdAt: r.createdAt.toISOString() }));
}
export type OrderHistoryEntry = Awaited<ReturnType<typeof getOrderHistory>>[number];
