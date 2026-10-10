import type { RecordData } from "@nextcrm/plugin-sdk";
import { odooPrice } from "./compare";
import type { M2O } from "./map";
import { findOrCreateCustomer, findOrCreateDelivery, salesperson } from "./odoo-partners";
import type { OdooClient } from "./odoo";
import { FinalError } from "./orders-errors";
import type { Ctx } from "./settings";
import { K, type CreatedRecord, type OrderLink, type PriceListLink } from "./store";

const CLAIM_MS = 10 * 60_000;
const TOLERANCE = 1;

type OdooLine = { product_id: number; product_uom_qty: number; price_unit: number };
interface PriceList { id: number; currencyId: number }

async function remember(ctx: Ctx, now: Date, kind: CreatedRecord["kind"], odooId: number, name: string, orderNumber: string) {
  const list = (await ctx.store.get<CreatedRecord[]>(K.created)) ?? [];
  await ctx.store.set(K.created, [{ at: now.toISOString(), kind, odooId, name, orderNumber }, ...list].slice(0, 20));
}

/** Spec § 4.2 step 4: the order's list when it came from Odoo, else the customer's; its currency must be the order's. */
async function priceListFor(ctx: Ctx, client: OdooClient, order: RecordData, partnerId: number): Promise<PriceList> {
  let id: number | null = null;
  if (order.priceListId) {
    for (const e of await ctx.store.list("pricelist:")) if ((e.value as PriceListLink).priceListId === order.priceListId) id = Number(e.key.slice(10));
  }
  if (!id) {
    const [p] = await client.call<{ property_product_pricelist?: M2O }[]>("res.partner", "read", { ids: [partnerId], fields: ["property_product_pricelist"] });
    id = p?.property_product_pricelist ? p.property_product_pricelist[0] : null;
  }
  if (!id) throw new FinalError(ctx.t("orders.noPriceList"));
  const [l] = await client.call<{ id: number; currency_id: M2O }[]>("product.pricelist", "read", { ids: [id], fields: ["currency_id"] });
  const code = l?.currency_id ? l.currency_id[1] : "";
  if (code !== order.currency) throw new FinalError(ctx.t("orders.currency", { order: String(order.currency), list: code }));
  return { id, currencyId: (l.currency_id as [number, string])[0] };
}

async function partnerUser(client: OdooClient, partnerId: number): Promise<number | false> {
  const [p] = await client.call<{ user_id?: M2O }[]>("res.partner", "read", { ids: [partnerId], fields: ["user_id"] });
  return p?.user_id ? p.user_id[0] : false;
}

async function sameLines(client: OdooClient, saleId: number, want: OdooLine[]): Promise<boolean> {
  const have = await client.call<{ product_id: M2O; product_uom_qty: number; price_unit: number }[]>("sale.order.line", "search_read", {
    domain: [["order_id", "=", saleId], ["display_type", "=", false]], fields: ["product_id", "product_uom_qty", "price_unit"],
  });
  const key = (p: number, q: number, u: number) => `${p}|${q.toFixed(4)}|${u.toFixed(2)}`;
  const a = have.map((l) => key(l.product_id ? l.product_id[0] : 0, l.product_uom_qty, l.price_unit)).sort();
  const b = want.map((l) => key(l.product_id, l.product_uom_qty, l.price_unit)).sort();
  return a.join(",") === b.join(",");
}

/** Spec § 4.2 step 6: read-only; a failure here is logged and never fails the send. */
async function priceDiffs(ctx: Ctx, client: OdooClient, list: PriceList, lines: RecordData[], odooLines: OdooLine[]) {
  const out: OrderLink["priceDiffs"] = [];
  for (let i = 0; i < odooLines.length; i++) {
    try {
      const odoo = await odooPrice(client, { pricelistId: list.id, currencyId: list.currencyId, productId: odooLines[i].product_id, quantity: odooLines[i].product_uom_qty });
      if (Math.abs(odoo - odooLines[i].price_unit) > TOLERANCE) out.push({ sku: String(lines[i].sku ?? lines[i].productName), crm: odooLines[i].price_unit, odoo });
    } catch (e) {
      ctx.log.warn(`Price check failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return out;
}

async function send(ctx: Ctx, client: OdooClient, order: RecordData, now: Date): Promise<void> {
  const id = order.id as string;
  const number = String(order.number);
  const lines = (order.lines ?? []) as RecordData[];
  const account = await ctx.data.accounts.get(order.accountId as string);
  if (!account?.name) throw new FinalError(ctx.t("orders.noAccount"));
  const odooLines: OdooLine[] = [];
  for (const l of lines) {
    const p = await ctx.data.products.get(l.productId as string);
    const ref = p?.source === "EXTERNAL" ? Number(p.externalRef) : NaN;
    if (!ref || !(await ctx.store.get(K.product(ref)))) throw new FinalError(ctx.t("orders.notOdooProduct", { product: String(l.sku ?? l.productName) }));
    odooLines.push({ product_id: ref, product_uom_qty: Number(l.quantity), price_unit: Number(l.unitPrice) });
  }
  const user = await salesperson(ctx, client, (order.ownerId as string | null) ?? null);
  const customer = await findOrCreateCustomer(ctx, client, account, user, now);
  if (customer.created) await remember(ctx, now, "customer", customer.partnerId, String(account.name), number);
  const seller = user || (await partnerUser(client, customer.partnerId));   // spec § 4.2: else the customer's salesperson
  const shipping = await findOrCreateDelivery(ctx, client, customer.partnerId, order);
  if (shipping.created) await remember(ctx, now, "delivery", shipping.shippingId, String(account.name), number);
  const list = await priceListFor(ctx, client, order, customer.partnerId);

  const [found] = await client.call<{ id: number; name: string }[]>("sale.order", "search_read", {
    domain: [["origin", "=", number], ["state", "!=", "cancel"]], fields: ["id", "name"], limit: 1,
  });
  let sale = found;
  if (found) {
    if (!(await sameLines(client, found.id, odooLines))) throw new FinalError(ctx.t("orders.otherLines", { name: found.name }));
  } else {
    const owner = order.ownerId ? await ctx.data.users.get(order.ownerId as string) : null;
    const note = [owner?.name ? String(owner.name) : null, order.note ? String(order.note) : null].filter(Boolean).join("\n") || false;
    const day = order.requestedDeliveryDate ? `${new Date(order.requestedDeliveryDate as string).toISOString().slice(0, 10)} 00:00:00` : false;
    const [saleId] = await client.call<number[]>("sale.order", "create", { vals_list: [{
      partner_id: customer.partnerId, partner_shipping_id: shipping.shippingId, pricelist_id: list.id, origin: number,
      user_id: seller, commitment_date: day, note, order_line: odooLines.map((l) => [0, 0, l]),
    }] }, { once: true });
    const [row] = await client.call<{ name: string }[]>("sale.order", "read", { ids: [saleId], fields: ["name"] });
    sale = { id: saleId, name: row?.name ?? String(saleId) };
  }

  await ctx.data.orders.update(id, { status: "SENT", externalRef: String(sale.id) });
  const link: OrderLink = {
    odooId: sale.id, name: sale.name, state: "draft", sentAt: now.toISOString(), total: null, totalDiffers: false,
    priceDiffs: await priceDiffs(ctx, client, list, lines, odooLines), deliveries: [], invoices: [],
    created: [...(customer.created ? ["customer" as const] : []), ...(shipping.created ? ["delivery" as const] : [])], checkedAt: now.toISOString(),
  };
  await ctx.store.set(K.order(id), link);
  await ctx.store.delete(K.send(id));
  ctx.log.info(`Order ${number} sent to Odoo as ${sale.name}`, { orderId: id, odooId: sale.id });
}

/** Task 4: every failure is final. Task 5 sorts them into unreachable, denied and refused (spec § 5). */
async function failed(ctx: Ctx, order: RecordData, e: unknown, now: Date): Promise<void> {
  const id = order.id as string;
  const reason = e instanceof Error ? e.message : String(e);
  try { await ctx.data.orders.update(id, { status: "SYNC_FAILED" }); } catch (err) { ctx.log.warn(`Order ${String(order.number)}: ${String(err)}`); }
  await ctx.store.set(K.failed(id), { reason, at: now.toISOString() });
  await ctx.store.delete(K.send(id));
  ctx.log.error(`Order ${String(order.number)} could not be sent: ${reason}`, { orderId: id });
  await ctx.notify({ roles: ["admin"], subject: ctx.t("mail.orderFailedSubject", { number: String(order.number) }), text: ctx.t("mail.orderFailedText", { number: String(order.number), error: reason }) });
}

const sendable = (o: RecordData | null) => !!o && o.status === "READY" && !o.externalRef;

/** Spec § 4.1: one sender per order (claim), re-read before any write; Retry starts over (failed: removed). */
export async function sendOrder(ctx: Ctx, client: OdooClient, orderId: string, now: Date): Promise<void> {
  if (!ctx.settings.sendOrders || await ctx.store.get(K.sendPaused)) return;
  if (!sendable(await ctx.data.orders.get(orderId))) return;   // cheap no-op for the connector's own status writes
  if (ctx.settings.dryRun) {
    const o = await ctx.data.orders.get(orderId);
    ctx.log.info("Dry run: would send order", { orderId, number: o?.number ?? null });
    return;
  }
  if (!(await ctx.store.claim(K.sending(orderId), CLAIM_MS))) return;
  try {
    const order = await ctx.data.orders.get(orderId);
    if (!sendable(order)) return;
    await ctx.store.delete(K.failed(orderId));
    try { await send(ctx, client, order!, now); } catch (e) { await failed(ctx, order!, e, now); }
  } finally {
    await ctx.store.delete(K.sending(orderId));
  }
}
