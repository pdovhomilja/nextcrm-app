import type { RecordData } from "@nextcrm/plugin-sdk";
import type { OxoClient, OxoOrder } from "./oxo";
import { findAll, msg, tell, type Ctx } from "./settings";
import { K, type OrderLink } from "./store";

const RANK: Record<string, number> = { SENT: 1, CONFIRMED: 2, DELIVERED: 3, INVOICED: 4, PAID: 5 };
const OPEN = ["SENT", "CONFIRMED", "DELIVERED", "INVOICED"];
const CHUNK = 200;   // OXO ERP's lookup limit

/** Spec § 4.6: null keeps the CRM status (draft, approval, Odoo's quotation states). INVOICED and PAID come with S5. */
export function targetStatus(o: Pick<OxoOrder, "state" | "delivery">): "CANCELLED" | "CONFIRMED" | "DELIVERED" | null {
  if (o.state === "cancel") return "CANCELLED";
  if (o.state !== "sale" && o.state !== "done") return null;
  return o.delivery === "full" ? "DELIVERED" : "CONFIRMED";
}

export const linkFrom = (o: OxoOrder, prev: Partial<OrderLink>, now: Date): OrderLink => ({
  belowList: [], sentAt: now.toISOString(), ...prev,
  oxoId: o.id, number: o.number, state: o.state, delivery: o.delivery, deliveries: o.deliveries, checkedAt: now.toISOString(), missingNotified: undefined,
});

async function fetchBy(client: OxoClient, param: "ids" | "odooIds", values: number[]): Promise<OxoOrder[]> {
  const out: OxoOrder[] = [];
  for (let i = 0; i < values.length; i += CHUNK) {
    out.push(...(await client.get<{ items: OxoOrder[] }>("/orders", { [param]: values.slice(i, i + CHUNK).join(",") })).items);
  }
  return out;
}

/**
 * Spec § 4.6 (+ § 10 A6): every CRM order not yet PAID or CANCELLED whose ref points at OXO ERP ("oxo:<id>", sent or imported by this
 * plugin) or at Odoo (a number: sent or imported by odoo-connector before the switch). Forward only.
 */
export async function syncOrderStatuses(a: { ctx: Ctx; client: OxoClient; dry: boolean; now: Date }): Promise<{ checked: number; moved: number }> {
  const { ctx, client, dry, now } = a;
  const out = { checked: 0, moved: 0 };
  const open = (await findAll(ctx.data.orders, { status: { in: OPEN } }))
    .filter((o) => typeof o.externalRef === "string" && /^(oxo:)?\d+$/.test(o.externalRef));
  if (!open.length) return out;
  const isOxo = (o: RecordData) => (o.externalRef as string).startsWith("oxo:");
  const num = (o: RecordData) => Number((o.externalRef as string).replace("oxo:", ""));
  const found = new Map<string, OxoOrder>();
  for (const o of await fetchBy(client, "ids", open.filter(isOxo).map(num))) found.set(`oxo:${o.id}`, o);
  for (const o of await fetchBy(client, "odooIds", open.filter((x) => !isOxo(x)).map(num))) if (o.odooId != null) found.set(String(o.odooId), o);
  for (const order of open) {
    out.checked++;
    const orderId = order.id as string;
    const number = String(order.number);
    const prev = (await ctx.store.get<OrderLink>(K.order(orderId))) ?? undefined;
    const o = found.get(order.externalRef as string);
    if (!o) {
      if (dry) continue;
      if (!prev?.missingNotified) {
        ctx.log.warn(`OXO ERP order for ${number} was not found; the CRM keeps ${String(order.status)}`, { orderId });
        await tell(ctx, { roles: ["admin"], subject: ctx.t("mail.missingSubject", { number }), text: ctx.t("mail.missingText", { number }) });
      }
      const base: OrderLink = prev ?? { oxoId: 0, number: "", state: "", delivery: "none", deliveries: [], belowList: [], sentAt: now.toISOString(), checkedAt: now.toISOString() };
      await ctx.store.set(K.order(orderId), { ...base, state: "missing", missingNotified: true, checkedAt: now.toISOString() } satisfies OrderLink);
      continue;
    }
    const target = targetStatus(o);
    const current = String(order.status);
    const forward = target !== null && target !== current && (target === "CANCELLED" || (RANK[target] ?? 0) > (RANK[current] ?? 0));
    if (dry) { if (forward) ctx.log.info("Dry run: would set order status", { orderId, from: current, to: target }); continue; }
    if (forward) {
      try { await ctx.data.orders.update(orderId, { status: target }); out.moved++; }
      catch (e) { ctx.log.warn(`Order ${number}: ${msg(e)}`, { orderId }); }
    }
    await ctx.store.set(K.order(orderId), linkFrom(o, prev ?? {}, now));
  }
  return out;
}
