import type { M2O } from "./map";
import type { OdooClient } from "./odoo";
import type { OdooOrderIn } from "./orders-in";
import type { Ctx } from "./settings";
import { K, type CustomerInfo, type OpenInvoice } from "./store";

interface OdooInvoice { name: string; move_type: "out_invoice" | "out_refund"; commercial_partner_id: M2O; invoice_date: string | false; invoice_date_due: string | false; currency_id: M2O; amount_total: number; amount_residual: number }
const INV_FIELDS = ["name", "move_type", "commercial_partner_id", "invoice_date", "invoice_date_due", "currency_id", "amount_total", "amount_residual"];
const round2 = (n: number) => Math.round(n * 100) / 100;

/** Spec § 4.5 (+ plan Ruling R1): open invoices in one call; totals summed from the confirmed orders the import already read. */
export async function syncCustomerInfo(a: { ctx: Ctx; client: OdooClient; dry: boolean; now: Date; linked: Map<number, string>; orders: OdooOrderIn[]; commercial: Map<number, number> }): Promise<void> {
  const { ctx, client, dry, now, linked } = a;
  if (dry || !linked.size) return;
  const rows = await client.call<OdooInvoice[]>("account.move", "search_read", {
    domain: [["move_type", "in", ["out_invoice", "out_refund"]], ["state", "=", "posted"], ["payment_state", "in", ["not_paid", "partial"]], ["commercial_partner_id", "in", Array.from(linked.keys())]],
    fields: INV_FIELDS, order: "invoice_date_due asc, id asc",
  });
  const invoices = new Map<number, OpenInvoice[]>();
  for (const r of rows) {
    const p = r.commercial_partner_id ? r.commercial_partner_id[0] : 0;
    invoices.set(p, [...(invoices.get(p) ?? []), {
      number: r.name, type: r.move_type, date: r.invoice_date || null, due: r.invoice_date_due || null,
      currency: r.currency_id ? r.currency_id[1] : "", amount: r.amount_total, residual: r.amount_residual,
    }]);
  }
  const from = now.getUTCFullYear() - 1;
  const totals = new Map<number, Map<string, number>>();
  for (const o of a.orders) {
    const year = Number(o.date_order.slice(0, 4));
    if (year < from) continue;
    const p = a.commercial.get(o.partner_id[0]) ?? o.partner_id[0];
    const key = `${year}|${o.currency_id ? o.currency_id[1] : ""}`;
    const m = totals.get(p) ?? new Map<string, number>();
    m.set(key, (m.get(key) ?? 0) + o.amount_untaxed);
    totals.set(p, m);
  }
  for (const [partnerId, accountId] of Array.from(linked)) {
    const t = Array.from(totals.get(partnerId) ?? new Map<string, number>()).map(([k, amount]) => {
      const [year, currency] = k.split("|");
      return { year: Number(year), currency, amount: round2(amount) };
    }).sort((x, y) => y.year - x.year || x.currency.localeCompare(y.currency));
    await ctx.store.set(K.customer(accountId), { at: now.toISOString(), invoices: invoices.get(partnerId) ?? [], totals: t } satisfies CustomerInfo);
  }
}
