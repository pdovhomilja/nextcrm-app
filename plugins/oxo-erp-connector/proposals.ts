import type { Ctx } from "./settings";
import { K, type Proposal } from "./store";
import { queueJob } from "./jobs";

/** The open proposal for this exact pair; a stale, decided or forged pair is refused. */
async function open(ctx: Ctx, input: Record<string, string>): Promise<{ id: number; p: Proposal }> {
  const id = Number(input.customerId);
  const p = Number.isInteger(id) ? await ctx.store.get<Proposal>(K.proposal(id)) : null;
  if (!p || p.decided || p.accountId !== input.accountId) throw new Error(ctx.t("proposals.gone"));
  return { id, p };
}

async function decide(ctx: Ctx, input: Record<string, string>, now: Date, decided: "confirmed" | "rejected"): Promise<void> {
  const { id, p } = await open(ctx, input);
  await ctx.store.set((decided === "confirmed" ? K.confirmed : K.rejected)(id, p.accountId), { at: now.toISOString() });
  // Kept until the next sync: it re-reads the customer from here (OXO ERP may not change it).
  await ctx.store.set(K.proposal(id), { ...p, decided } satisfies Proposal);
  ctx.log.info(`Link proposal ${decided}`, { customerId: id, accountId: p.accountId });
  await queueJob(ctx, now);
}

/** The next sync links the pair through the usual path (fields, AccountLink). */
export async function confirmProposal(ctx: Ctx, input: Record<string, string>, now: Date): Promise<string> {
  await decide(ctx, input, now, "confirmed");
  return ctx.t("proposals.confirmedDone");
}

/** The pair is never proposed again; the next sync gives the customer its own account, as with no match. */
export async function rejectProposal(ctx: Ctx, input: Record<string, string>, now: Date): Promise<string> {
  await decide(ctx, input, now, "rejected");
  return ctx.t("proposals.rejectedDone");
}
