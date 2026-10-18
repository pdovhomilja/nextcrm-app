import type { OrderLineInput } from "@nextcrm/plugin-sdk";
import { productMap } from "./catalog";
import { ref } from "./map";
import type { OxoClient, OxoOrder } from "./oxo";
import { linkFrom, targetStatus } from "./orders-status";
import { msg, type Ctx } from "./settings";
import { K, keepLock, type OrderLink } from "./store";

const OVERLAP_MS = 2 * 60_000;

/** Lines of CRM products only; the CRM line carries the price actually charged (after OXO ERP's discount). */
export function crmLines(products: Map<number, string>, o: OxoOrder): { lines: OrderLineInput[]; missing: number } {
  const lines: OrderLineInput[] = [];
  let missing = 0;
  for (const l of o.lines) {
    const productId = products.get(l.productId);
    if (!productId) { missing++; continue; }
    lines.push({ productId, quantity: l.quantity, unitPrice: String(Number((Number(l.unitPrice) * (1 - Number(l.discount) / 100)).toFixed(4))) });
  }
  return { lines, missing };
}

export const noteFor = (ctx: Ctx, note: string | null, missing: number): string | null =>
  [note ?? "", missing ? ctx.t("orders.linesMissing", { count: missing }) : ""].filter(Boolean).join("\n") || null;

/**
 * Spec § 4.7: confirmed OXO ERP orders not made by the CRM, created or updated as EXTERNAL orders by ref, so old Odoo orders
 * odoo-connector imported are updated, not duplicated. An order whose customer is not linked waits in the store and is
 * re-tried every run. Statuses of imported orders move in the status sweep.
 */
export async function syncOrdersIn(a: { ctx: Ctx; client: OxoClient; dry: boolean; now: Date }): Promise<{ imported: number; updated: number; pending: number; top: string | null }> {
  const { ctx, client, dry, now } = a;
  const cursor = (await ctx.store.get<{ at: string }>(K.cursor("orders")))?.at ?? null;
  const since = cursor ? new Date(Date.parse(cursor) - OVERLAP_MS).toISOString() : null;
  const fresh = await client.all<OxoOrder>("/orders", since ? { updatedSince: since } : {});
  const waiting = (await ctx.store.list("pending:")).map((e) => (e.value as { order: OxoOrder }).order);
  const products = await productMap(ctx);
  const out = { imported: 0, updated: 0, pending: 0, top: cursor };
  const seen = new Set<number>();
  for (const [i, o] of Array.from([...fresh, ...waiting].entries())) {
    if ((i + 1) % 100 === 0) await keepLock(ctx);
    if (fresh.includes(o) && (!out.top || o.updatedAt > out.top)) out.top = o.updatedAt;
    if (seen.has(o.id)) continue;
    seen.add(o.id);
    try {
      if (o.crmNumber) continue;   // sent by the CRM: the status sweep follows it
      const r = ref(o);
      const [existing] = await ctx.data.orders.find({ where: { externalRef: r }, take: 1 });
      if (existing?.source === "CRM") { if (!dry) await ctx.store.delete(K.pending(o.id)); continue; }   // sent to Odoo before the switch
      const accountId = (await ctx.store.get<{ accountId: string }>(K.customer(o.customerId)))?.accountId;
      if (!accountId) {
        out.pending++;
        if (!dry) await ctx.store.set(K.pending(o.id), { order: o });
        continue;
      }
      const prev = existing ? await ctx.store.get<OrderLink>(K.order(existing.id as string)) : null;
      if (prev?.updatedAt === o.updatedAt) { if (!dry) await ctx.store.delete(K.pending(o.id)); continue; }
      const { lines, missing } = crmLines(products, o);
      if (dry) { out[existing ? "updated" : "imported"]++; continue; }
      let orderId: string;
      if (existing) {
        orderId = existing.id as string;
        await ctx.data.orders.update(orderId, { lines, note: noteFor(ctx, o.note, missing), orderDate: o.orderedAt.slice(0, 10) });
        out.updated++;
      } else {
        orderId = (await ctx.data.orders.create({
          accountId, externalRef: r, status: targetStatus(o) ?? "CONFIRMED", currency: o.currency, orderDate: o.orderedAt.slice(0, 10), note: noteFor(ctx, o.note, missing), lines,
        })).id as string;
        out.imported++;
      }
      await ctx.store.set(K.order(orderId), { ...linkFrom(o, prev ?? {}, now), imported: true, updatedAt: o.updatedAt, missing } satisfies OrderLink);
      await ctx.store.delete(K.pending(o.id));
    } catch (e) {
      // One order the CRM refuses (e.g. its account or a product was deleted) never blocks the others; it is re-tried every run.
      out.pending++;
      ctx.log.warn(`OXO ERP order ${o.number} not imported: ${msg(e)}`, { oxoId: o.id });
      if (!dry) await ctx.store.set(K.pending(o.id), { order: o });
    }
  }
  return out;
}
