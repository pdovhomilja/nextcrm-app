import type { OrderLineInput } from "@nextcrm/plugin-sdk";
import { availableFields } from "./catalog";
import type { M2O } from "./map";
import { OdooAuthError, type OdooClient } from "./odoo";
import { VARIANT_FIELDS, variantFields, type OdooVariant } from "./catalog-map";
import { syncCustomerInfo } from "./customer-info";
import { MOVE_FIELDS, invoiceRows, targetStatus, type OdooMove, type OdooSale } from "./orders-status";
import type { Ctx } from "./settings";
import { K, type OrderLink, type ProductLink } from "./store";

export interface OdooOrderIn extends OdooSale { partner_id: [number, string]; origin: string | false; date_order: string; currency_id: M2O; note: string | false; write_date: string; amount_untaxed: number }
export interface OdooLineIn { id: number; order_id: M2O; product_id: M2O; product_uom_qty: number; price_unit: number; discount?: number; display_type: string | false; is_downpayment?: boolean }

const PER_RUN = 200;
const TOLERANCE = 1;
const FINAL = new Set(["PAID", "CANCELLED"]);
const IN_FIELDS = ["id", "name", "state", "partner_id", "origin", "date_order", "currency_id", "note", "write_date", "amount_total", "amount_untaxed", "delivery_status", "invoice_status", "invoice_ids", "picking_ids"];
const LINE_FIELDS = ["order_id", "product_id", "product_uom_qty", "price_unit", "discount", "display_type", "is_downpayment"];

/** Customers linked to a CRM account: Odoo partner id → account id. */
export async function linkedCustomers(ctx: Ctx): Promise<Map<number, string>> {
  return new Map((await ctx.store.list("partner:")).map((e) => [Number(e.key.slice(8)), (e.value as { accountId: string }).accountId]));
}

/** Spec § 4.2: every confirmed order whose customer (commercial partner) is linked. */
export async function confirmedOrders(client: OdooClient, partnerIds: number[]): Promise<OdooOrderIn[]> {
  if (!partnerIds.length) return [];
  const fields = await availableFields(client, "sale.order", IN_FIELDS);
  const rows = await client.call<OdooOrderIn[]>("sale.order", "search_read", {
    domain: [["state", "in", ["sale", "done"]], ["partner_id.commercial_partner_id", "in", partnerIds]], fields, order: "id asc",
  });
  return rows.map((s) => ({ ...s, invoice_ids: s.invoice_ids ?? [], picking_ids: s.picking_ids ?? [] }));
}

/** Orders ship to child delivery contacts; the customer is their commercial partner. */
export async function commercialOf(client: OdooClient, partnerIds: number[]): Promise<Map<number, number>> {
  const ids = Array.from(new Set(partnerIds));
  if (!ids.length) return new Map();
  const rows = await client.call<{ id: number; commercial_partner_id: M2O }[]>("res.partner", "read", { ids, fields: ["commercial_partner_id"] });
  return new Map(rows.map((r) => [r.id, r.commercial_partner_id ? r.commercial_partner_id[0] : r.id]));
}

export async function readLines(client: OdooClient, orderIds: number[]): Promise<OdooLineIn[]> {
  if (!orderIds.length) return [];
  const fields = await availableFields(client, "sale.order.line", LINE_FIELDS);
  return client.call<OdooLineIn[]>("sale.order.line", "search_read", { domain: [["order_id", "in", orderIds]], fields, order: "id asc" });
}

/** Spec § 4.3 step 2: product lines of CRM products only; notes, sections and down payments never. */
export async function crmLines(ctx: Ctx, lines: OdooLineIn[]): Promise<{ lines: OrderLineInput[]; missing: number }> {
  const out: OrderLineInput[] = [];
  let missing = 0;
  for (const l of lines) {
    if (l.display_type || l.is_downpayment || !l.product_id) continue;
    const link = await ctx.store.get<ProductLink>(K.product(l.product_id[0]));
    if (!link) { missing++; continue; }
    // Review I2: Odoo keeps the list price and the discount apart; the CRM line carries the price actually charged.
    out.push({ productId: link.productId, quantity: l.product_uom_qty, unitPrice: l.price_unit * (1 - (l.discount || 0) / 100) });
  }
  return { lines: out, missing };
}

/**
 * Pavel 2026-10-11 (live check, option A): Odoo archives each expiry batch's variant, and the catalog imports only active ones,
 * so history lost about a quarter of its value. Variants on imported lines that the CRM lacks come in as archived products,
 * linked like catalog products (the catalog keeps them current from then on).
 */
export async function ensureProducts(ctx: Ctx, client: OdooClient, lines: OdooLineIn[]): Promise<void> {
  const ids: number[] = [];
  for (const l of lines) {
    if (l.display_type || l.is_downpayment || !l.product_id || ids.includes(l.product_id[0])) continue;
    if (!(await ctx.store.get(K.product(l.product_id[0])))) ids.push(l.product_id[0]);
  }
  if (!ids.length) return;
  const fields = await availableFields(client, "product.product", VARIANT_FIELDS);
  const variants = await client.call<OdooVariant[]>("product.product", "read", { ids, fields });
  const taxIds = Array.from(new Set(variants.flatMap((v) => v.taxes_id ?? [])));
  const taxes = new Map((taxIds.length ? await client.call<{ id: number; amount: number; amount_type: string }[]>("account.tax", "read", { ids: taxIds, fields: ["amount", "amount_type"] }) : [])
    .map((t) => [t.id, t.amount_type === "percent" ? String(t.amount) : null]));
  for (const v of variants) {
    const f = variantFields({ ...v, taxes_id: v.taxes_id ?? [] }, (t) => (t.length === 1 ? taxes.get(t[0]) ?? null : null));
    try {
      const res = await ctx.data.products.upsertExternal(String(v.id), f, { adoptBySku: true });
      if (res.adopted) ctx.log.info(`Took over CRM product ${f.sku} (${f.name})`, { odooId: v.id, productId: res.id });
      await ctx.store.set(K.product(v.id), { productId: res.id, tmplId: v.product_tmpl_id ? v.product_tmpl_id[0] : null, categoryRef: f.categoryRef } satisfies ProductLink);
    } catch (e) {
      ctx.log.warn(`Product ${v.display_name} from an imported order not created: ${e instanceof Error ? e.message : String(e)}`, { odooId: v.id });
    }
  }
}

function plain(html: string | false | undefined): string {
  let t = (html ? String(html) : "").replace(/<br\s*\/?>/gi, "\n").replace(/<\/p>\s*<p[^>]*>/gi, "\n");
  // CodeQL: strip tags until none are left (nested tags), then drop any angle bracket, so the note can never carry markup.
  for (let prev = ""; prev !== t;) { prev = t; t = t.replace(/<[^<>]*>/g, ""); }
  return t.replace(/&nbsp;/g, " ").replace(/&lt;|&gt;/g, "").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&").replace(/[<>]/g, "")
    .replace(/\n{2,}/g, "\n").trim();
}

/** Odoo's note as plain text, plus how many lines were left out. */
export function noteFor(ctx: Ctx, html: string | false | undefined, missing: number): string | null {
  return [plain(html), missing ? ctx.t("orders.linesMissing", { count: missing }) : ""].filter(Boolean).join("\n") || null;
}

/** Spec § 3.1: orders linked before 0.4.0 get their index entry, once (review I4: not on every run). */
async function indexLinks(ctx: Ctx, now: Date) {
  if (await ctx.store.get(K.indexed)) return;
  for (const e of await ctx.store.list("order:")) {
    const l = e.value as OrderLink;
    if (l.odooId && !(await ctx.store.get(K.odooOrder(l.odooId)))) await ctx.store.set(K.odooOrder(l.odooId), { orderId: e.key.slice(6) });
  }
  await ctx.store.set(K.indexed, { at: now.toISOString() });
}

/** Spec §§ 4.2–4.3: imports confirmed Odoo orders the CRM does not have yet, at most 200 per run. Returns how many were imported. */
export async function importOrders(a: { ctx: Ctx; client: OdooClient; dry: boolean; now: Date; orders: OdooOrderIn[]; commercial: Map<number, number>; linked: Map<number, string> }): Promise<number> {
  const { ctx, client, dry, now } = a;
  if (!dry) await indexLinks(ctx, now);
  const known = new Set<number>([
    ...(await ctx.store.list("odooOrder:")).map((e) => Number(e.key.slice(10))),
    ...(await ctx.store.list("order:")).map((e) => (e.value as OrderLink).odooId),
  ]);
  // Review I1: orders that failed before go last, so they can never crowd out new ones.
  const failed = new Set((await ctx.store.list("importFailed:")).map((e) => Number(e.key.slice(13))));
  const fresh = a.orders.filter((s) => !known.has(s.id));
  const batch = [...fresh.filter((s) => !failed.has(s.id)), ...fresh.filter((s) => failed.has(s.id))].slice(0, PER_RUN);
  if (!batch.length) return 0;
  const lines = await readLines(client, batch.map((s) => s.id));
  if (!dry) await ensureProducts(ctx, client, lines);
  const moveIds = batch.flatMap((s) => s.invoice_ids ?? []);
  const moves = moveIds.length ? await client.call<OdooMove[]>("account.move", "search_read", { domain: [["id", "in", moveIds]], fields: MOVE_FIELDS }) : [];
  let imported = 0;
  for (const s of batch) {
    try {
      if (s.origin) {
        const [mine] = await ctx.data.orders.find({ where: { number: s.origin, source: "CRM" }, take: 1 });
        if (mine) { if (!dry) await ctx.store.set(K.odooOrder(s.id), { orderId: mine.id as string }); continue; }
      }
      const partnerId = a.commercial.get(s.partner_id[0]) ?? s.partner_id[0];
      const accountId = a.linked.get(partnerId);
      if (!accountId) continue;
      const { lines: crm, missing } = await crmLines(ctx, lines.filter((l) => l.order_id && l.order_id[0] === s.id));
      const mine = moves.filter((m) => s.invoice_ids!.includes(m.id));
      const status = targetStatus(s, mine);
      if (dry) {
        ctx.log.info(`Dry run: would import Odoo order ${s.name}`, { accountId, lines: crm.length, status });
        continue;
      }
      // Review I3: a run that died after creating the order left it without a link; link it instead of failing on the unique ref forever.
      const [existing] = await ctx.data.orders.find({ where: { source: "EXTERNAL", externalRef: String(s.id) }, take: 1 });
      const row = existing ?? await ctx.data.orders.create({
        accountId, externalRef: String(s.id), status: status as never, currency: s.currency_id ? s.currency_id[1] : undefined,
        orderDate: s.date_order.slice(0, 10), note: noteFor(ctx, s.note, missing), lines: crm,
      });
      const orderId = row.id as string;
      const link: OrderLink = {
        odooId: s.id, name: s.name, state: s.state, sentAt: now.toISOString(), total: s.amount_total,
        totalDiffers: row.grandTotal !== undefined && Math.abs(s.amount_total - Number(row.grandTotal)) > TOLERANCE,
        priceDiffs: [], deliveries: [], invoices: invoiceRows(mine), created: [], checkedAt: now.toISOString(),
        imported: true, partnerId, writeDate: s.write_date, missing, ...(FINAL.has(status) ? { done: true } : {}),
      };
      await ctx.store.set(K.order(orderId), link);
      await ctx.store.set(K.odooOrder(s.id), { orderId });
      await ctx.store.delete(K.importFailed(s.id));
      imported++;
    } catch (e) {
      if (e instanceof OdooAuthError) throw e;
      const reason = e instanceof Error ? e.message : String(e);
      ctx.log.warn(`Odoo order ${s.name} not imported: ${reason}`, { odooId: s.id });
      if (!dry) await ctx.store.set(K.importFailed(s.id), { name: s.name, reason, at: now.toISOString() });
    }
  }
  return imported;
}

/** Spec § 4.1: after the status check, every sync: import new orders, then refresh the account tab's data. */
export async function syncOrdersIn(a: { ctx: Ctx; client: OdooClient; dry: boolean; now: Date }): Promise<number> {
  const linked = await linkedCustomers(a.ctx);
  if (!linked.size) return 0;
  const orders = await confirmedOrders(a.client, Array.from(linked.keys()));
  const commercial = await commercialOf(a.client, orders.map((o) => o.partner_id[0]));
  const imported = await importOrders({ ...a, orders, commercial, linked });
  await syncCustomerInfo({ ...a, linked, orders, commercial });
  if (!a.dry) await a.ctx.store.set(K.imported, { lastRun: imported });
  return imported;
}
