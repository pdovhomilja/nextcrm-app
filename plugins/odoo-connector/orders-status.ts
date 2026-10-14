import type { RecordData } from "@nextcrm/plugin-sdk";
import { availableFields } from "./catalog";
import type { M2O } from "./map";
import type { OdooClient } from "./odoo";
import { commercialOf, crmLines, ensureProducts, noteFor, readLines } from "./orders-in";
import { tell, type Ctx } from "./settings";
import { K, type OrderLink } from "./store";

export interface OdooSale {
  id: number; name: string; state: string; delivery_status?: string | false; invoice_status?: string | false;
  amount_total: number; invoice_ids?: number[]; picking_ids?: number[];
  partner_id?: M2O | false; write_date?: string; note?: string | false;
}
export interface OdooMove {
  id: number; name: string; move_type: string; state: string; payment_state: string;
  invoice_date: string | false; invoice_date_due: string | false; amount_total: number; amount_residual: number;
}
interface OdooPicking { id: number; name: string; state: string; date_done: string | false }

const SALE_FIELDS = ["id", "name", "state", "delivery_status", "invoice_status", "amount_total", "invoice_ids", "picking_ids", "partner_id", "write_date", "note"];
export const MOVE_FIELDS = ["id", "name", "move_type", "state", "payment_state", "invoice_date", "invoice_date_due", "amount_total", "amount_residual"];
const RANK: Record<string, number> = { SENT: 1, CONFIRMED: 2, DELIVERED: 3, INVOICED: 4, PAID: 5 };
const TOLERANCE = 1;
const FINAL = new Set(["PAID", "CANCELLED"]);

/** Spec § 4.3 (+ plan Rulings 7, 8). An order Odoo no longer returns is handled by the caller (never cancelled). */
export function targetStatus(sale: OdooSale, moves: OdooMove[]): string {
  if (sale.state === "cancel") return "CANCELLED";
  if (sale.state !== "sale" && sale.state !== "done") return "SENT";
  const invoices = moves.filter((m) => m.move_type === "out_invoice" && m.state === "posted");
  const live = invoices.filter((m) => m.payment_state !== "reversed");
  const invoiced = sale.invoice_status === "invoiced" && invoices.length > 0;
  if (invoiced && live.length && live.every((m) => m.payment_state === "paid" || m.payment_state === "in_payment")) return "PAID";
  if (invoiced) return "INVOICED";
  if (sale.delivery_status === "full") return "DELIVERED";
  return "CONFIRMED";
}

/** Posted invoices as the order panel shows them. */
export function invoiceRows(moves: OdooMove[]): OrderLink["invoices"] {
  return moves.filter((m) => m.state === "posted").map((m) => ({ number: m.name, type: m.move_type, date: m.invoice_date || null, due: m.invoice_date_due || null, amount: m.amount_total, residual: m.amount_residual, paymentState: m.payment_state }));
}

/** Spec § 4.3: every sent order that is not PAID or CANCELLED, re-read in full each cycle; finished ones are marked done and skipped. */
export async function syncOrderStatuses(a: { ctx: Ctx; client: OdooClient; dry: boolean; now: Date }): Promise<{ checked: number; moved: number }> {
  const { ctx, client, dry, now } = a;
  const out = { checked: 0, moved: 0 };
  const open: { orderId: string; link: OrderLink; order: RecordData; final?: boolean }[] = [];
  // 0.4.1: an imported order still owes lines until its missing products exist, even once it is PAID or CANCELLED.
  const linesOwed = (l: OrderLink) => !!l.imported && (l.missing === undefined || l.missing > 0);
  for (const e of await ctx.store.list("order:")) {
    const orderId = e.key.slice(6);
    const link = e.value as OrderLink;
    if (link.done && !linesOwed(link)) continue;
    const order = await ctx.data.orders.get(orderId);
    if (!order) continue;
    if (FINAL.has(String(order.status))) {
      if (linesOwed(link)) open.push({ orderId, link: { ...link, done: true }, order, final: true });
      else if (!dry && !link.done) await ctx.store.set(K.order(orderId), { ...link, done: true });
      continue;
    }
    open.push({ orderId, link, order });
  }
  if (!open.length) return out;
  // search_read, never read: a deleted order must not raise (Review Focus 4).
  // Review I7: an Odoo without Inventory has no delivery_status or picking_ids.
  const fields = await availableFields(client, "sale.order", SALE_FIELDS);
  const sales = (await client.call<OdooSale[]>("sale.order", "search_read", { domain: [["id", "in", open.map((o) => o.link.odooId)]], fields }))
    .map((s) => ({ ...s, invoice_ids: s.invoice_ids ?? [], picking_ids: s.picking_ids ?? [] }));
  const byId = new Map(sales.map((s) => [s.id, s]));
  const moveIds = sales.flatMap((s) => s.invoice_ids);
  const pickIds = sales.flatMap((s) => s.picking_ids);
  const moves = moveIds.length ? await client.call<OdooMove[]>("account.move", "search_read", { domain: [["id", "in", moveIds]], fields: MOVE_FIELDS }) : [];
  const picks = pickIds.length ? await client.call<OdooPicking[]>("stock.picking", "search_read", {
    domain: [["id", "in", pickIds], ["picking_type_code", "=", "outgoing"]], fields: ["id", "name", "state", "date_done"],
  }) : [];
  // Spec § 4.4: imported orders follow Odoo's lines and notice a changed customer.
  const imp = open.filter((o) => o.link.imported && byId.has(o.link.odooId));
  const commercial = await commercialOf(client, imp.map((o) => byId.get(o.link.odooId)!.partner_id).filter((p): p is [number, string] => !!p).map((p) => p[0]));
  // Also re-read orders with lines left out (their products may exist now) and 0.4.0 imports that never counted them.
  const recopy = (o: { link: OrderLink }) => byId.get(o.link.odooId)!.write_date !== o.link.writeDate || o.link.missing === undefined || o.link.missing > 0;
  const changed = imp.filter(recopy).map((o) => o.link.odooId);
  const freshLines = dry ? [] : await readLines(client, changed);
  if (freshLines.length) await ensureProducts(ctx, client, freshLines);
  for (const o of open) {
    out.checked++;
    const sale = byId.get(o.link.odooId);
    const number = String(o.order.number);
    if (!sale) {
      // Deleted, or the API user can no longer see it: Odoo answers the same, so the CRM order is left alone (Pavel 2026-10-11).
      if (dry) continue;
      if (!o.link.missingNotified) {
        ctx.log.warn(`Odoo order ${o.link.name} was not found; the CRM keeps ${String(o.order.status)}`, { orderId: o.orderId });
        await tell(ctx, { roles: ["admin"], subject: ctx.t("mail.missingSubject", { number }), text: ctx.t("mail.missingText", { number, name: o.link.name }) });
      }
      await ctx.store.set(K.order(o.orderId), { ...o.link, state: "missing", missingNotified: true, checkedAt: now.toISOString() });
      continue;
    }
    const mine = moves.filter((m) => sale.invoice_ids!.includes(m.id));
    const target = targetStatus(sale, mine);
    const current = String(o.order.status);
    const forward = target !== current && (target === "CANCELLED" || (RANK[target] ?? 0) > (RANK[current] ?? 0));
    const back = !forward && target !== current ? target : undefined;
    if (back && back !== o.link.back) ctx.log.info(`Odoo order ${o.link.name} went back to ${sale.state}; the CRM keeps ${current}`, { orderId: o.orderId });
    const link: OrderLink = {
      ...o.link,
      state: sale.state,
      total: sale.amount_total,
      totalDiffers: Math.abs(sale.amount_total - Number(o.order.grandTotal)) > TOLERANCE,
      deliveries: picks.filter((p) => sale.picking_ids!.includes(p.id)).map((p) => ({ name: p.name, state: p.state, date: p.date_done || null })),
      invoices: invoiceRows(mine),
      checkedAt: now.toISOString(),
      back, missingNotified: undefined,
    };
    if (o.link.imported && !dry) {
      if (changed.includes(sale.id)) {
        const { lines, missing } = await crmLines(ctx, freshLines.filter((l) => l.order_id && l.order_id[0] === sale.id));
        // Write only when Odoo changed, the count was never stored, or a missing product has appeared since.
        const write = sale.write_date !== o.link.writeDate || o.link.missing === undefined || missing < (o.link.missing ?? 0);
        try { if (write) await ctx.data.orders.update(o.orderId, { lines, note: noteFor(ctx, sale.note, missing) }); link.writeDate = sale.write_date; link.missing = missing; }
        catch (e) { ctx.log.warn(`Order ${number}: lines not updated: ${e instanceof Error ? e.message : String(e)}`, { orderId: o.orderId }); }
      }
      const owner = sale.partner_id ? (commercial.get(sale.partner_id[0]) ?? sale.partner_id[0]) : null;
      if (owner !== null && owner !== o.link.partnerId && !o.link.movedNotified) {
        ctx.log.warn(`Odoo order ${o.link.name} now belongs to another customer; the CRM order keeps its account`, { orderId: o.orderId });
        await tell(ctx, { roles: ["admin"], subject: ctx.t("mail.movedSubject", { number }), text: ctx.t("mail.movedText", { number, name: o.link.name }) });
        link.movedNotified = true;
      }
    }
    if (o.final) {   // finished: only the lines are refreshed, the status never changes again
      if (!dry) await ctx.store.set(K.order(o.orderId), link);
      continue;
    }
    if (dry) {
      if (forward) ctx.log.info("Dry run: would set order status", { orderId: o.orderId, from: current, to: target });
      continue;
    }
    if (forward) {
      try { await ctx.data.orders.update(o.orderId, { status: target as never }); out.moved++; if (FINAL.has(target)) link.done = true; }
      catch (e) { ctx.log.warn(`Order ${number}: ${e instanceof Error ? e.message : String(e)}`, { orderId: o.orderId }); }
    }
    await ctx.store.set(K.order(o.orderId), link);
  }
  return out;
}
