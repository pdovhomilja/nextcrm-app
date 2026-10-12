import type { AfterInput } from "@nextcrm/plugin-sdk";
import type { Ctx } from "./settings";
import { dueDay, isoDay, withOrders, type Registration } from "./state";
import { K, startRegistration } from "./store";

/** Spec § 1.1: confirmed or later; a rep cannot keep a company by entering an order and cancelling it. */
export const QUALIFYING = ["CONFIRMED", "DELIVERED", "INVOICED", "PAID"];

const warned = new WeakSet<object>();

/** The newest qualifying order's day; null when there is none; undefined when orders cannot be read (Ruling 6). */
export async function latestOrderDay(ctx: Ctx, accountId: string): Promise<string | null | undefined> {
  try {
    const [o] = await ctx.data.orders.find({ where: { accountId, status: { in: QUALIFYING } }, orderBy: { orderDate: "desc" }, take: 1 });
    return o?.orderDate ? isoDay(o.orderDate as string) : null;
  } catch (e) {
    if (!warned.has(ctx)) {
      warned.add(ctx);
      ctx.log.warn(`Orders cannot be read; protection ignores orders: ${String(e)}`);
    }
    return undefined;
  }
}

/** Spec § 3.4: recompute one registration from the account's orders; idempotent. */
export async function recomputeFromOrders(accountId: string, ctx: Ctx): Promise<Registration | null> {
  const reg = await ctx.store.get<Registration>(K.reg(accountId));
  if (!reg) return null;
  const day = await latestOrderDay(ctx, accountId);
  if (day === undefined) return reg;
  const next = withOrders(reg, day, ctx.settings.orderMonths);
  if (JSON.stringify(next) === JSON.stringify(reg)) return reg;
  await ctx.store.delete(K.due(dueDay(reg), accountId));
  await ctx.store.set(K.reg(accountId), next);
  await ctx.store.set(K.due(dueDay(next), accountId), {});
  ctx.log.info("Protection recomputed from orders", { accountId, from: reg.protectedUntil, to: next.protectedUntil, lastOrderAt: next.lastOrderAt ?? null });
  return next;
}

/** Ruling 1: every new registration starts here, so an ordering customer keeps its order-based protection. */
export async function register(ctx: Ctx, accountId: string, reg: Registration): Promise<void> {
  await startRegistration(ctx.store, accountId, reg);
  await recomputeFromOrders(accountId, ctx);
}

/** order.created / order.updated (status or orderDate changed): recompute that order's account. */
export async function onOrderChanged(input: AfterInput, ctx: Ctx): Promise<void> {
  if (input.operation === "updated" && !(input.changed ?? []).some((f) => f === "status" || f === "orderDate")) return;
  try {
    const order = await ctx.data.orders.get(input.recordId);
    if (order?.accountId) await recomputeFromOrders(order.accountId as string, ctx);
  } catch (e) {
    ctx.log.warn(`Order ${input.recordId} could not be read: ${String(e)}`);
  }
}
