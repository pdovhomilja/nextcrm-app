import type { Actor, AfterInput, RecordData } from "@nextcrm/plugin-sdk";
import { numberKey } from "./key";
import { ownerOf } from "./rules";
import { newRegistration, type Registration } from "./state";
import { K, addHistory, clearRegistration, lastHistory, startRegistration, type Reason } from "./store";
import type { Ctx } from "./settings";

/** Points num: at this account and returns its key; null when it has no number or another account holds it. */
export async function indexNumber(acc: RecordData, ctx: Ctx, at: Date): Promise<string | null> {
  const id = acc.id as string;
  const key = numberKey(acc, ctx.settings.defaultCountry);
  const old = await ctx.store.get<{ key: string }>(K.acct(id));
  if (old && old.key !== key) {
    const holder = await ctx.store.get<{ accountId: string }>(K.num(old.key));
    if (holder?.accountId === id) await ctx.store.delete(K.num(old.key));
    await ctx.store.delete(K.acct(id));
  }
  if (!key) return null;
  const holder = await ctx.store.get<{ accountId: string }>(K.num(key));
  if (holder && holder.accountId !== id) {
    await ctx.store.set(K.conflict(id), { key, otherAccountId: holder.accountId, foundAt: at.toISOString() });
    return null;
  }
  await ctx.store.set(K.num(key), { accountId: id });
  await ctx.store.set(K.acct(id), { key });
  return key;
}

/** Records an owner change once (retried events are no-ops) and restarts protection for the new owner. */
export async function recordOwner(acc: RecordData, to: string | null, actor: Actor | undefined, reason: Reason, ctx: Ctx, at: Date): Promise<void> {
  const id = acc.id as string;
  const last = await lastHistory(ctx.store, id);
  if (last ? last.to === to : to === null) return;
  await clearRegistration(ctx.store, id);
  await addHistory(ctx.store, id, {
    at: at.toISOString(),
    from: last?.to ?? null,
    to,
    byUserId: actor && "userId" in actor ? actor.userId : null,
    byType: actor?.type ?? "system",
    reason,
  });
  const key = (await ctx.store.get<{ key: string }>(K.acct(id)))?.key;
  if (to && key) await startRegistration(ctx.store, id, newRegistration(key, to, at, ctx.settings));
}

export async function onCreated(input: AfterInput, ctx: Ctx, at = new Date()): Promise<void> {
  const acc = await ctx.data.accounts.get(input.recordId);
  if (!acc) return;
  await indexNumber(acc, ctx, at);
  const to = ownerOf(acc.assigned_to);
  if (to) await recordOwner(acc, to, input.actor, "created", ctx, at);
}

export async function onUpdated(input: AfterInput, ctx: Ctx, at = new Date()): Promise<void> {
  const acc = await ctx.data.accounts.get(input.recordId);
  if (!acc) return;
  const id = acc.id as string;
  const changed = input.changed ?? [];
  if (changed.includes("company_id") || changed.includes("billing_country")) {
    const key = await indexNumber(acc, ctx, at);
    const reg = await ctx.store.get<Registration>(K.reg(id));
    const owner = ownerOf(acc.assigned_to);
    if (reg && reg.key !== key) await clearRegistration(ctx.store, id);
    if (key && owner && (!reg || reg.key !== key)) await startRegistration(ctx.store, id, newRegistration(key, owner, at, ctx.settings));
  }
  if (changed.includes("assigned_to")) {
    const to = ownerOf(acc.assigned_to);
    await recordOwner(acc, to, input.actor, to ? "assigned" : "released", ctx, at);
  }
}

export async function onDeleted(input: AfterInput, ctx: Ctx): Promise<void> {
  const id = input.recordId;
  const indexed = await ctx.store.get<{ key: string }>(K.acct(id));
  if (indexed) {
    const holder = await ctx.store.get<{ accountId: string }>(K.num(indexed.key));
    if (holder?.accountId === id) await ctx.store.delete(K.num(indexed.key));
    await ctx.store.delete(K.acct(id));
  }
  await clearRegistration(ctx.store, id);
  await ctx.store.delete(K.conflict(id));
}
