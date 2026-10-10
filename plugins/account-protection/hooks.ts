import type { Actor, AfterInput, RecordData } from "@nextcrm/plugin-sdk";
import { numberKey } from "./key";
import { ownerOf } from "./rules";
import { newRegistration, type Registration } from "./state";
import { K, addHistory, clearRegistration, lastHistory, type Reason } from "./store";
import { register } from "./orders";
import type { Ctx } from "./settings";

export interface Conflict { key: string; otherAccountId: string; foundAt: string }

/** Points num: at this account and returns its key; null when it has no number or another account holds it. */
export async function indexNumber(acc: RecordData, ctx: Ctx, at: Date): Promise<string | null> {
  const id = acc.id as string;
  const key = numberKey(acc, ctx.settings.defaultCountry);
  await ctx.store.delete(K.conflict(id));   // set again below while the conflict still holds
  const old = await ctx.store.get<{ key: string }>(K.acct(id));
  if (old && old.key !== key) {
    const holder = await ctx.store.get<{ accountId: string }>(K.num(old.key));
    await ctx.store.delete(K.acct(id));
    if (holder?.accountId === id) {
      await ctx.store.delete(K.num(old.key));
      await handOver(id, ctx, at);
    }
  }
  if (!key) return null;
  const holder = await ctx.store.get<{ accountId: string }>(K.num(key));
  if (holder && holder.accountId !== id) {
    await ctx.store.set(K.conflict(id), { key, otherAccountId: holder.accountId, foundAt: at.toISOString() } satisfies Conflict);
    return null;
  }
  await ctx.store.set(K.num(key), { accountId: id });
  await ctx.store.set(K.acct(id), { key });
  return key;
}

/** Re-checks the duplicates blocked by an account that gave up its number, so they can take it over (review I7). */
async function handOver(fromId: string, ctx: Ctx, at: Date, actor?: Actor): Promise<void> {
  for (const entry of await ctx.store.list("conflict:")) {
    if ((entry.value as Conflict).otherAccountId !== fromId) continue;
    await ctx.store.delete(entry.key);
    const dup = await ctx.data.accounts.get(entry.key.slice(9));
    if (dup && dup.deletedAt == null) await claimNumber(dup, ctx, at, actor);
  }
}

/** Indexes a duplicate whose conflict may be over. A new holder's owner gets a fresh window: the old one ran while it held nothing. */
export async function claimNumber(dup: RecordData, ctx: Ctx, at: Date, actor?: Actor): Promise<void> {
  const id = dup.id as string;
  const key = await indexNumber(dup, ctx, at);
  const owner = ownerOf(dup.assigned_to);
  if (!owner) return;
  await recordOwner(dup, owner, actor, "assigned", ctx, at);
  if (!key) return;
  await clearRegistration(ctx.store, id);
  await register(ctx, id, newRegistration(key, owner, at, ctx.settings));
}

/** Records an owner change once (retried events are no-ops) and restarts protection for the new owner. */
export async function recordOwner(acc: RecordData, to: string | null, actor: Actor | undefined, reason: Reason, ctx: Ctx, at: Date): Promise<void> {
  const id = acc.id as string;
  const last = await lastHistory(ctx.store, id);
  const key = (await ctx.store.get<{ key: string }>(K.acct(id)))?.key;
  if (last ? last.to === to : to === null) {
    // Already recorded: a retry only rebuilds a registration a failed attempt never wrote (review I5).
    if (last && to && key && !(await ctx.store.get(K.reg(id)))) {
      await register(ctx, id, newRegistration(key, to, new Date(last.at), ctx.settings));
    }
    return;
  }
  await clearRegistration(ctx.store, id);
  await addHistory(ctx.store, id, {
    at: at.toISOString(),
    from: last?.to ?? null,
    to,
    byUserId: actor && "userId" in actor ? actor.userId : null,
    byType: actor?.type ?? "system",
    reason,
  });
  if (to && key) await register(ctx, id, newRegistration(key, to, at, ctx.settings));
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
  if (changed.includes("deletedAt") && acc.deletedAt == null) {
    // Restored after a soft delete: onDeleted removed the index and registration (review I3).
    const key = await indexNumber(acc, ctx, at);
    const owner = ownerOf(acc.assigned_to);
    if (key && owner && !(await ctx.store.get(K.reg(id)))) await register(ctx, id, newRegistration(key, owner, at, ctx.settings));
  }
  if (changed.includes("company_id") || changed.includes("billing_country")) {
    const key = await indexNumber(acc, ctx, at);
    const reg = await ctx.store.get<Registration>(K.reg(id));
    const owner = ownerOf(acc.assigned_to);
    // Editing the number never restarts protection: the windows stay, only the key moves (review I2).
    if (reg) await ctx.store.set(K.reg(id), { ...reg, key: key ?? "" });
    else if (key && owner) await register(ctx, id, newRegistration(key, owner, at, ctx.settings));
  }
  if (changed.includes("assigned_to")) {
    const to = ownerOf(acc.assigned_to);
    await recordOwner(acc, to, input.actor, to ? "assigned" : "released", ctx, at);
  }
}

export async function onDeleted(input: AfterInput, ctx: Ctx, at = new Date()): Promise<void> {
  const id = input.recordId;
  const indexed = await ctx.store.get<{ key: string }>(K.acct(id));
  if (indexed) {
    const holder = await ctx.store.get<{ accountId: string }>(K.num(indexed.key));
    if (holder?.accountId === id) await ctx.store.delete(K.num(indexed.key));
    await ctx.store.delete(K.acct(id));
  }
  await clearRegistration(ctx.store, id);
  await ctx.store.delete(K.conflict(id));
  await handOver(id, ctx, at, input.actor);
}
