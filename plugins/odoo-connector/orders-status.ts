import type { RecordData } from "@nextcrm/plugin-sdk";
import { availableFields } from "./catalog";
import type { OdooClient } from "./odoo";
import { tell, type Ctx } from "./settings";
import { K, type OrderLink } from "./store";

export interface OdooSale {
  id: number; name: string; state: string; delivery_status?: string | false; invoice_status?: string | false;
  amount_total: number; invoice_ids?: number[]; picking_ids?: number[];
}
export interface OdooMove {
  id: number; name: string; move_type: string; state: string; payment_state: string;
  invoice_date: string | false; invoice_date_due: string | false; amount_total: number; amount_residual: number;
}
interface OdooPicking { id: number; name: string; state: string; date_done: string | false }

const SALE_FIELDS = ["id", "name", "state", "delivery_status", "invoice_status", "amount_total", "invoice_ids", "picking_ids"];
const MOVE_FIELDS = ["id", "name", "move_type", "state", "payment_state", "invoice_date", "invoice_date_due", "amount_total", "amount_residual"];
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

/** Spec § 4.3: every sent order that is not PAID or CANCELLED, re-read in full each cycle; finished ones are marked done and skipped. */
export async function syncOrderStatuses(a: { ctx: Ctx; client: OdooClient; dry: boolean; now: Date }): Promise<{ checked: number; moved: number }> {
  const { ctx, client, dry, now } = a;
  const out = { checked: 0, moved: 0 };
  const open: { orderId: string; link: OrderLink; order: RecordData }[] = [];
  for (const e of await ctx.store.list("order:")) {
    const orderId = e.key.slice(6);
    const link = e.value as OrderLink;
    if (link.done) continue;
    const order = await ctx.data.orders.get(orderId);
    if (!order) continue;
    if (FINAL.has(String(order.status))) { if (!dry) await ctx.store.set(K.order(orderId), { ...link, done: true }); continue; }
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
      invoices: mine.filter((m) => m.state === "posted").map((m) => ({ number: m.name, type: m.move_type, date: m.invoice_date || null, due: m.invoice_date_due || null, amount: m.amount_total, residual: m.amount_residual, paymentState: m.payment_state })),
      checkedAt: now.toISOString(),
      back, missingNotified: undefined,
    };
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
