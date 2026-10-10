import type { RecordData } from "@nextcrm/plugin-sdk";
import type { OdooClient } from "./odoo";
import type { Ctx } from "./settings";
import { K, type OrderLink } from "./store";

export interface OdooSale {
  id: number; name: string; state: string; delivery_status?: string | false; invoice_status?: string | false;
  amount_total: number; invoice_ids: number[]; picking_ids: number[];
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

/** Spec § 4.3 (+ plan Rulings 7, 8). */
export function targetStatus(sale: OdooSale | null, moves: OdooMove[]): string {
  if (!sale || sale.state === "cancel") return "CANCELLED";
  if (sale.state !== "sale" && sale.state !== "done") return "SENT";
  const invoices = moves.filter((m) => m.move_type === "out_invoice" && m.state === "posted");
  const live = invoices.filter((m) => m.payment_state !== "reversed");
  const invoiced = sale.invoice_status === "invoiced" && invoices.length > 0;
  if (invoiced && live.length && live.every((m) => m.payment_state === "paid" || m.payment_state === "in_payment")) return "PAID";
  if (invoiced) return "INVOICED";
  if (sale.delivery_status === "full") return "DELIVERED";
  return "CONFIRMED";
}

/** Spec § 4.3: every sent order that is not PAID or CANCELLED, re-read in full each cycle. */
export async function syncOrderStatuses(a: { ctx: Ctx; client: OdooClient; dry: boolean; now: Date }): Promise<{ checked: number; moved: number }> {
  const { ctx, client, dry, now } = a;
  const out = { checked: 0, moved: 0 };
  const open: { orderId: string; link: OrderLink; order: RecordData }[] = [];
  for (const e of await ctx.store.list("order:")) {
    const orderId = e.key.slice(6);
    const order = await ctx.data.orders.get(orderId);
    if (order && order.status !== "PAID" && order.status !== "CANCELLED") open.push({ orderId, link: e.value as OrderLink, order });
  }
  if (!open.length) return out;
  // search_read, never read: a deleted order must not raise (Review Focus 4).
  const sales = await client.call<OdooSale[]>("sale.order", "search_read", { domain: [["id", "in", open.map((o) => o.link.odooId)]], fields: SALE_FIELDS });
  const byId = new Map(sales.map((s) => [s.id, s]));
  const moveIds = sales.flatMap((s) => s.invoice_ids);
  const pickIds = sales.flatMap((s) => s.picking_ids);
  const moves = moveIds.length ? await client.call<OdooMove[]>("account.move", "search_read", { domain: [["id", "in", moveIds]], fields: MOVE_FIELDS }) : [];
  const picks = pickIds.length ? await client.call<OdooPicking[]>("stock.picking", "search_read", {
    domain: [["id", "in", pickIds], ["picking_type_code", "=", "outgoing"]], fields: ["id", "name", "state", "date_done"],
  }) : [];
  for (const o of open) {
    out.checked++;
    const sale = byId.get(o.link.odooId) ?? null;
    const mine = sale ? moves.filter((m) => sale.invoice_ids.includes(m.id)) : [];
    const target = targetStatus(sale, mine);
    const current = String(o.order.status);
    const forward = target !== current && (target === "CANCELLED" || (RANK[target] ?? 0) > (RANK[current] ?? 0));
    if (!forward && target !== current && target !== "CANCELLED") ctx.log.info(`Odoo order ${o.link.name} went back to ${sale?.state ?? "?"}; the CRM keeps ${current}`, { orderId: o.orderId });
    const link: OrderLink = {
      ...o.link,
      state: sale?.state ?? "deleted",
      total: sale?.amount_total ?? o.link.total,
      totalDiffers: sale ? Math.abs(sale.amount_total - Number(o.order.grandTotal)) > TOLERANCE : o.link.totalDiffers,
      deliveries: sale ? picks.filter((p) => sale.picking_ids.includes(p.id)).map((p) => ({ name: p.name, state: p.state, date: p.date_done || null })) : o.link.deliveries,
      invoices: sale ? mine.filter((m) => m.state === "posted").map((m) => ({ number: m.name, type: m.move_type, date: m.invoice_date || null, due: m.invoice_date_due || null, amount: m.amount_total, residual: m.amount_residual, paymentState: m.payment_state })) : o.link.invoices,
      checkedAt: now.toISOString(),
    };
    if (dry) {
      if (forward) ctx.log.info("Dry run: would set order status", { orderId: o.orderId, from: current, to: target });
      continue;
    }
    if (forward) {
      try { await ctx.data.orders.update(o.orderId, { status: target as never }); out.moved++; }
      catch (e) { ctx.log.warn(`Order ${String(o.order.number)}: ${e instanceof Error ? e.message : String(e)}`, { orderId: o.orderId }); }
    }
    await ctx.store.set(K.order(o.orderId), link);
  }
  return out;
}
