import type { Ctx } from "./settings";
import { K, type Proposal } from "./store";
import { queueJob } from "./jobs";

/** The stored proposal for this exact pair; a stale or forged pair is refused. */
async function stored(ctx: Ctx, input: Record<string, string>): Promise<{ id: number; p: Proposal }> {
  const id = Number(input.partnerId);
  const p = Number.isInteger(id) ? await ctx.store.get<Proposal>(K.proposal(id)) : null;
  if (!p || p.accountId !== input.accountId) throw new Error(ctx.t("proposals.gone"));
  return { id, p };
}

/** The next sync links the pair through the usual path (fields, AccountLink, people); the sync is queued now. */
export async function confirmProposal(ctx: Ctx, input: Record<string, string>, now: Date): Promise<string> {
  const { id, p } = await stored(ctx, input);
  // Another customer may have been confirmed onto this account first: an account is never shared.
  const link = await ctx.store.get<{ partnerId: number }>(K.account(p.accountId));
  if (link && link.partnerId !== id) throw new Error(ctx.t("proposals.taken"));
  await ctx.store.set(K.confirmed(id, p.accountId), { at: now.toISOString() });
  await ctx.store.delete(K.proposal(id));
  ctx.log.info("Link proposal confirmed", { partnerId: id, accountId: p.accountId });
  await queueJob(ctx, "sync", now);
  return ctx.t("proposals.confirmedDone");
}

/** The pair is never proposed again; the next sync gives the customer its own account, as with no match. */
export async function rejectProposal(ctx: Ctx, input: Record<string, string>, now: Date): Promise<string> {
  const { id, p } = await stored(ctx, input);
  await ctx.store.set(K.rejected(id, p.accountId), { at: now.toISOString() });
  await ctx.store.delete(K.proposal(id));
  ctx.log.info("Link proposal rejected", { partnerId: id, accountId: p.accountId });
  await queueJob(ctx, "sync", now);
  return ctx.t("proposals.rejectedDone");
}
