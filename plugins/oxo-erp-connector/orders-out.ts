import type { AfterInput, RecordData } from "@nextcrm/plugin-sdk";
import { countryName, sameAddress } from "./map";
import { OxoError, oxoClient, type OxoAddress, type OxoClient, type OxoOrder } from "./oxo";
import { findAll, localTime, msg, tell, type Ctx } from "./settings";
import { K, type AccountLink, type FailedState, type OrderLink, type PriceListLink, type ProductLink, type SendState } from "./store";

const CLAIM_MS = 10 * 60_000;
const STUCK_MS = 24 * 3_600_000;

/** A failure no retry can fix: the order goes to SYNC_FAILED at once. */
export class FinalError extends Error {
  constructor(message: string) { super(message); this.name = "FinalError"; }
}

const val = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);
/** At most 4 decimals, as OXO ERP stores them; the same order always gives the same string, so a repeat matches. */
const dec = (v: unknown) => String(Number(Number(v).toFixed(4)));
/** Lines in the order's own position order: a repeat must send them in the same order (OXO ERP compares line by line). */
const byPosition = (order: RecordData) => [...((order.lines ?? []) as RecordData[])].sort((a, b) => Number(a.position ?? 0) - Number(b.position ?? 0));
const clean = <T extends Record<string, unknown>>(o: T) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as Partial<T>;

/** Spec § 4.5: the CRM order as OXO ERP's POST /orders body. */
export async function orderBody(ctx: Ctx, order: RecordData): Promise<Record<string, unknown>> {
  const account = await ctx.data.accounts.get(order.accountId as string);
  if (!account?.name) throw new FinalError(ctx.t("orders.noAccount"));
  const link = await ctx.store.get<AccountLink>(K.account(account.id as string));
  const lines: { productId: number; quantity: string; unitPrice: string }[] = [];
  for (const l of byPosition(order)) {
    const p = await ctx.store.get<ProductLink>(K.product(l.productId as string));
    if (!p) throw new FinalError(ctx.t("orders.notOxoProduct", { product: String(l.sku ?? l.productName ?? l.productId) }));
    lines.push({ productId: p.oxoId, quantity: dec(l.quantity), unitPrice: dec(l.unitPrice) });
  }
  const customer = link ? { customerId: link.customerId } : { customer: clean({
    name: String(account.name).slice(0, 200), ico: val(account.company_id), dic: val(account.vat), street: val(account.billing_street), city: val(account.billing_city),
    zip: val(account.billing_postal_code), country: countryName(val(account.billing_country) ?? null) ?? undefined, email: val(account.email), phone: val(account.office_phone),
  }) };
  const ship = { street: val(order.shipping_street), city: val(order.shipping_city), zip: val(order.shipping_postal_code) };
  let delivery: Record<string, unknown> = {};
  if (ship.street || ship.city) {
    const hit = link?.addresses.find((a) => sameAddress(a, ship));
    delivery = hit ? { deliveryAddressId: hit.id } : { deliveryAddress: clean({ name: String(account.name).slice(0, 200), ...ship, country: countryName(val(order.shipping_country) ?? null) ?? undefined }) };
  }
  let priceListId: number | undefined;
  if (order.priceListId) for (const e of await ctx.store.list("pricelist:")) if ((e.value as PriceListLink).priceListId === order.priceListId) priceListId = Number(e.key.slice(10));
  const owner = order.ownerId ? await ctx.data.users.get(order.ownerId as string) : null;
  return clean({
    crmNumber: String(order.number), ...customer, ...delivery, priceListId, currency: String(order.currency),
    requestedDate: order.requestedDeliveryDate ? new Date(order.requestedDeliveryDate as string).toISOString().slice(0, 10) : undefined,
    note: val(order.note)?.slice(0, 2000), salesRep: val(owner?.name)?.slice(0, 100), lines,
  });
}

/** The answer tells us the OXO ERP customer (new or matched) and a new delivery address: the account keeps both. */
async function linkCustomer(ctx: Ctx, accountId: string, o: OxoOrder, body: Record<string, unknown>, now: Date): Promise<void> {
  const prev = await ctx.store.get<AccountLink>(K.account(accountId));
  const link: AccountLink = prev ?? { customerId: o.customerId, syncedAt: now.toISOString(), priceListId: o.priceListId, addresses: [] };
  const sent = body.deliveryAddress as { name: string; street?: string; city?: string; zip?: string; country?: string } | undefined;
  if (sent && o.deliveryAddressId != null && !link.addresses.some((a) => a.id === o.deliveryAddressId)) {
    link.addresses = [...link.addresses, { id: o.deliveryAddressId, odooId: null, name: sent.name, street: sent.street ?? null, city: sent.city ?? null, zip: sent.zip ?? null, country: sent.country ?? null, active: true } satisfies OxoAddress];
  }
  if (!prev && !(await ctx.store.get(K.customer(o.customerId)))) await ctx.store.set(K.customer(o.customerId), { accountId });
  if (!prev || link.addresses !== prev.addresses) await ctx.store.set(K.account(accountId), link);
}

async function send(ctx: Ctx, client: OxoClient, order: RecordData, now: Date): Promise<void> {
  const id = order.id as string;
  const body = await orderBody(ctx, order);
  const { body: o } = await client.post<OxoOrder>("/orders", body);
  await ctx.data.orders.update(id, { status: "SENT", externalRef: `oxo:${o.id}` });
  const lines = byPosition(order);
  const belowList = o.lines.flatMap((l, i) => (l.belowList ? [String(lines[i]?.sku ?? lines[i]?.productName ?? l.productId)] : []));
  await ctx.store.set(K.order(id), {
    oxoId: o.id, number: o.number, state: o.state, delivery: o.delivery, deliveries: o.deliveries, belowList, sentAt: now.toISOString(), checkedAt: now.toISOString(),
  } satisfies OrderLink);
  await linkCustomer(ctx, order.accountId as string, o, body, now);
  await ctx.store.delete(K.send(id));
  ctx.log.info(`Order ${String(order.number)} sent to OXO ERP as ${o.number}`, { orderId: id, oxoId: o.id });
}

export type SendResult = "sent" | "skipped" | "waiting" | "paused" | "failed";

/** Spec § 4.5: no answer waits (a repeat is safe), a refused key or writes_disabled pauses everything, anything else OXO ERP refused fails the order. */
function kindOf(e: unknown): "waiting" | "paused" | "failed" {
  if (e instanceof FinalError) return "failed";
  if (e instanceof OxoError) {
    if (e.status === 401 || e.status === 403 || e.code === "writes_disabled") return "paused";
    if (e.status === 0 || e.status === 429 || e.status >= 500) return "waiting";
  }
  return "failed";
}

async function failed(ctx: Ctx, order: RecordData, e: unknown, now: Date): Promise<SendResult> {
  const id = order.id as string;
  const number = String(order.number);
  const reason = msg(e);
  const kind = kindOf(e);
  if (kind !== "failed") {
    const prev = await ctx.store.get<SendState>(K.send(id));
    const waitingSince = prev?.waitingSince ?? now.toISOString();
    const stuck = kind === "waiting" && !prev?.stuckNotified && now.getTime() - Date.parse(waitingSince) > STUCK_MS;
    await ctx.store.set(K.send(id), { lastError: reason, waitingSince, ...(stuck || prev?.stuckNotified ? { stuckNotified: true } : {}) } satisfies SendState);
    ctx.log.warn(`Order ${number} waits for OXO ERP: ${reason}`, { orderId: id });
    if (stuck) await tell(ctx, { roles: ["admin"], subject: ctx.t("mail.stuckSubject", { number }), text: ctx.t("mail.stuckText", { number, since: localTime(ctx, waitingSince), error: reason }) });
    if (kind === "paused" && !(await ctx.store.get(K.sendPaused))) {
      await ctx.store.set(K.sendPaused, { at: now.toISOString(), reason });
      await tell(ctx, { roles: ["admin"], subject: ctx.t("mail.pausedSubject"), text: ctx.t("mail.pausedText", { error: reason }) });
    }
    return kind;
  }
  try { await ctx.data.orders.update(id, { status: "SYNC_FAILED" }); } catch (err) { ctx.log.warn(`Order ${number}: ${msg(err)}`); }
  await ctx.store.set(K.failed(id), { reason, at: now.toISOString() } satisfies FailedState);
  await ctx.store.delete(K.send(id));
  ctx.log.error(`Order ${number} could not be sent: ${reason}`, { orderId: id });
  await tell(ctx, { roles: ["admin"], subject: ctx.t("mail.orderFailedSubject", { number }), text: ctx.t("mail.orderFailedText", { number, error: reason }) });
  return "failed";
}

const sendable = (o: RecordData | null) => !!o && o.status === "READY" && !o.externalRef;

/** One sender per order (claim), re-read before the write; Retry starts over (failed: removed). */
export async function sendOrder(ctx: Ctx, client: OxoClient, orderId: string, now: Date): Promise<SendResult> {
  if (!ctx.settings.sendOrders || ctx.settings.dryRun || (await ctx.store.get(K.sendPaused))) return "skipped";
  if (!sendable(await ctx.data.orders.get(orderId))) return "skipped";
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

/** Every cron run sends READY orders without a ref: fresh ones before those already waiting; stop at the first that waits or pauses. */
export async function sweepOrders(ctx: Ctx, client: OxoClient, now: Date): Promise<number> {
  if (!ctx.settings.sendOrders || ctx.settings.dryRun) return 0;
  const rows = await findAll(ctx.data.orders, { status: "READY", externalRef: null }, { createdAt: "asc" });
  const waiting = new Set((await ctx.store.list("send:")).map((e) => e.key.slice(5)));
  const queue = [...rows.filter((o) => !waiting.has(o.id as string)), ...rows.filter((o) => waiting.has(o.id as string))];
  let tried = 0;
  for (const o of queue) {
    if (await ctx.store.get(K.sendPaused)) break;
    tried++;
    const r = await sendOrder(ctx, client, o.id as string, now);
    if (r === "waiting" || r === "paused") break;
  }
  return tried;
}

/** Core's after-write hook fires for Submit, Approve and Retry; sendOrder ignores everything but READY. */
export async function onOrderUpdated(input: AfterInput, ctx: Ctx): Promise<void> {
  const o = await ctx.data.orders.get(input.recordId);
  if (o && o.status !== "READY") await ctx.store.delete(K.send(input.recordId));
  if (o && o.status !== "SYNC_FAILED") await ctx.store.delete(K.failed(input.recordId));
  await sendOrder(ctx, oxoClient(ctx), input.recordId, new Date());
}
