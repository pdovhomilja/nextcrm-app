import type { AfterInput, RecordData } from "@nextcrm/plugin-sdk";
import { odooPrice } from "./compare";
import type { M2O } from "./map";
import { findOrCreateCustomer, findOrCreateDelivery, salesperson } from "./odoo-partners";
import { jsonClient, type OdooClient } from "./odoo";
import { FinalError, failKind } from "./orders-errors";
import { localTime, tell, type Ctx } from "./settings";
import { K, type CreatedRecord, type OrderLink, type PriceListLink, type SendState } from "./store";

const CLAIM_MS = 30 * 60_000;   // review I6: longer than any send, even with slow Odoo
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
  // Review I1: the link first, so statuses come back even if the price check below never finishes.
  const link: OrderLink = {
    odooId: sale.id, name: sale.name, state: "draft", sentAt: now.toISOString(), total: null, totalDiffers: false,
    priceDiffs: [], deliveries: [], invoices: [],
    created: [...(customer.created ? ["customer" as const] : []), ...(shipping.created ? ["delivery" as const] : [])], checkedAt: now.toISOString(),
  };
  await ctx.store.set(K.order(id), link);
  await ctx.store.set(K.odooOrder(sale.id), { orderId: id });
  await ctx.store.delete(K.send(id));
  const diffs = await priceDiffs(ctx, client, list, lines, odooLines);
  if (diffs.length) await ctx.store.set(K.order(id), { ...((await ctx.store.get<OrderLink>(K.order(id))) ?? link), priceDiffs: diffs });
  ctx.log.info(`Order ${number} sent to Odoo as ${sale.name}`, { orderId: id, odooId: sale.id });
}

const MAX_ATTEMPTS = 5;
const STUCK_MS = 24 * 3_600_000;

export type SendResult = "sent" | "skipped" | "unreachable" | "denied" | "refused" | "final";

/** Spec § 5: unreachable waits, denied pauses everything, refused counts; 5 refusals or a final error → SYNC_FAILED. */
async function failed(ctx: Ctx, order: RecordData, e: unknown, now: Date): Promise<SendResult> {
  const id = order.id as string;
  const number = String(order.number);
  const reason = e instanceof Error ? e.message : String(e);
  const kind = e instanceof FinalError ? "final" : failKind(e);
  const prev = (await ctx.store.get<SendState>(K.send(id))) ?? { attempts: 0, lastError: null, waitingSince: null };
  if (kind === "unreachable" || kind === "denied") {
    const waitingSince = prev.waitingSince ?? now.toISOString();
    // Review I4: an order that keeps failing as "unreachable" (e.g. a 500 from an Odoo add-on) is reported once after a day.
    const stuck = kind === "unreachable" && !prev.stuckNotified && now.getTime() - Date.parse(waitingSince) > STUCK_MS;
    await ctx.store.set(K.send(id), { ...prev, lastError: reason, waitingSince, ...(stuck ? { stuckNotified: true } : {}) } satisfies SendState);
    ctx.log.warn(`Order ${number} waits for Odoo: ${reason}`, { orderId: id });
    if (stuck) await tell(ctx, { roles: ["admin"], subject: ctx.t("mail.stuckSubject", { number }), text: ctx.t("mail.stuckText", { number, since: localTime(ctx, waitingSince), error: reason }) });
    if (kind === "denied" && !(await ctx.store.get(K.sendPaused))) {
      await ctx.store.set(K.sendPaused, { at: now.toISOString(), reason });
      await tell(ctx, { roles: ["admin"], subject: ctx.t("mail.pausedSubject"), text: ctx.t("mail.pausedText", { error: reason }) });
    }
    return kind;
  }
  const attempts = kind === "final" ? MAX_ATTEMPTS : prev.attempts + 1;
  if (attempts < MAX_ATTEMPTS) {
    await ctx.store.set(K.send(id), { ...prev, attempts, lastError: reason } satisfies SendState);
    ctx.log.warn(`Order ${number}: Odoo refused attempt ${attempts} of ${MAX_ATTEMPTS}: ${reason}`, { orderId: id });
    return "refused";
  }
  try { await ctx.data.orders.update(id, { status: "SYNC_FAILED" }); } catch (err) { ctx.log.warn(`Order ${number}: ${String(err)}`); }
  await ctx.store.set(K.failed(id), { reason, at: now.toISOString() });
  await ctx.store.delete(K.send(id));
  ctx.log.error(`Order ${number} could not be sent: ${reason}`, { orderId: id });
  await tell(ctx, { roles: ["admin"], subject: ctx.t("mail.orderFailedSubject", { number }), text: ctx.t("mail.orderFailedText", { number, error: reason }) });
  return kind === "final" ? "final" : "refused";
}

const sendable = (o: RecordData | null) => !!o && o.status === "READY" && !o.externalRef;

/** Spec § 4.1: one sender per order (claim), re-read before any write; Retry starts over (failed: removed). */
export async function sendOrder(ctx: Ctx, client: OdooClient, orderId: string, now: Date): Promise<SendResult> {
  if (!ctx.settings.sendOrders || await ctx.store.get(K.sendPaused)) return "skipped";
  if (!sendable(await ctx.data.orders.get(orderId))) return "skipped";   // cheap no-op for the connector's own status writes
  if (ctx.settings.dryRun) {
    const o = await ctx.data.orders.get(orderId);
    ctx.log.info("Dry run: would send order", { orderId, number: o?.number ?? null });
    return "skipped";
  }
  if (!(await ctx.store.claim(K.sending(orderId), CLAIM_MS))) return "skipped";
  try {
    const order = await ctx.data.orders.get(orderId);
    if (!sendable(order)) return "skipped";
    await ctx.store.delete(K.failed(orderId));
    try { await send(ctx, client, order!, now); return "sent"; } catch (e) { return await failed(ctx, order!, e, now); }
  } finally {
    await ctx.store.delete(K.sending(orderId));
  }
}

/**
 * Spec § 4.1: every cron run sends READY orders without an Odoo id. Not in dry run (plan Ruling 5).
 * Review I5: fresh orders before ones already waiting, and stop at the first "unreachable" or "denied" so a down Odoo cannot stall the cron.
 */
export async function sweepOrders(ctx: Ctx, client: OdooClient, now: Date): Promise<number> {
  if (!ctx.settings.sendOrders || ctx.settings.dryRun) return 0;
  const rows = await ctx.data.orders.find({ where: { status: "READY", externalRef: null }, orderBy: { createdAt: "asc" }, take: 200 });
  const waiting = new Set((await ctx.store.list("send:")).map((e) => e.key.slice(5)));
  const queue = [...rows.filter((o) => !waiting.has(o.id as string)), ...rows.filter((o) => waiting.has(o.id as string))];
  let tried = 0;
  for (const o of queue) {
    tried++;
    const r = await sendOrder(ctx, client, o.id as string, now);
    if (r === "unreachable" || r === "denied") break;
  }
  return tried;
}

/** Plan Ruling 1: core's after-write hook fires for Submit, Approve and Retry; sendOrder ignores everything but READY. */
export async function onOrderUpdated(input: AfterInput, ctx: Ctx): Promise<void> {
  // An order that leaves READY or SYNC_FAILED (reopened, cancelled) drops its old state, so a resubmit starts at attempt 1.
  const o = await ctx.data.orders.get(input.recordId);
  if (o && o.status !== "READY") await ctx.store.delete(K.send(input.recordId));
  if (o && o.status !== "SYNC_FAILED") await ctx.store.delete(K.failed(input.recordId));
  await sendOrder(ctx, jsonClient(ctx), input.recordId, new Date());
}
