import { claimNumber, indexNumber, recordOwner, type Conflict } from "./hooks";
import { numberKey } from "./key";
import { ownerOf } from "./rules";
import { contactTypes, type Ctx } from "./settings";
import { contactSince, dueDay, evaluate, isoDay, newRegistration, type Registration } from "./state";
import { K, addHistory, clearRegistration, lastHistory, startRegistration, type Notice } from "./store";

const MANAGERS = ["manager", "admin"] as const;   // Ruling 7
const DAY = 86_400_000;
const GAP = 3_600_000;   // the notices job runs every 5 minutes; an hour without a run means the plugin was off

/**
 * Catches up after the plugin was disabled (or its jobs did not run): the host has no enable hook, so every
 * job checks the time of the last run first. Owner changes made meanwhile are recorded now with a fresh
 * window, and windows that ran out meanwhile restart now, since nothing enforced them.
 */
export async function resume(ctx: Ctx, now: Date): Promise<void> {
  const last = await ctx.store.get<{ at: string }>(K.lastRun);
  if (last && now.getTime() - Date.parse(last.at) > GAP) {
    const since = Date.parse(last.at);
    const lapsed = (iso: string) => Date.parse(iso) > since && Date.parse(iso) <= now.getTime();
    const actor = { type: "plugin" as const, pluginId: ctx.plugin.id };
    const ids = Array.from(new Set([
      ...(await ctx.store.list("reg:")).map((e) => e.key.slice(4)),
      ...(await ctx.store.list("acct:")).map((e) => e.key.slice(5)),
    ]));
    for (const id of ids) {
      try {
        const acc = await ctx.data.accounts.get(id);
        if (!acc || acc.deletedAt != null) continue;
        const owner = ownerOf(acc.assigned_to);
        if (((await lastHistory(ctx.store, id))?.to ?? null) !== owner) {
          await recordOwner(acc, owner, actor, owner ? "assigned" : "released", ctx, now);
        }
        const reg = await ctx.store.get<Registration>(K.reg(id));
        if (reg && (lapsed(reg.protectedUntil) || (!reg.contactAt && lapsed(reg.contactDeadline)))) {
          await clearRegistration(ctx.store, id);
          await startRegistration(ctx.store, id, newRegistration(reg.key, reg.ownerId, now, ctx.settings));
        }
      } catch (e) {
        ctx.log.error(`Catch-up after a pause failed for account ${id}: ${String(e)}`);
      }
    }
  }
  await ctx.store.set(K.lastRun, { at: now.toISOString() });
}

/** Re-checks conflict rows a missed event left behind (one account deleted, number corrected). */
export async function pruneConflicts(ctx: Ctx, at: Date): Promise<void> {
  for (const entry of await ctx.store.list("conflict:")) {
    const c = entry.value as Conflict;
    const dup = await ctx.data.accounts.get(entry.key.slice(9));
    if (!dup || dup.deletedAt != null) { await ctx.store.delete(entry.key); continue; }
    const holder = await ctx.store.get<{ accountId: string }>(K.num(c.key));
    if (holder?.accountId === c.otherAccountId && numberKey(dup, ctx.settings.defaultCountry) === c.key) continue;
    await claimNumber(dup, ctx, at);
  }
}

export async function expire(ctx: Ctx, now: Date): Promise<void> {
  await resume(ctx, now);
  await pruneConflicts(ctx, now);
  const today = isoDay(now);
  const freed: string[] = [];
  for (const entry of await ctx.store.list("due:")) {
    const day = entry.key.slice(4, 14);
    const accountId = entry.key.slice(15);
    if (day > today) continue;
    try {
      const reg = await ctx.store.get<Registration>(K.reg(accountId));
      if (!reg) { await ctx.store.delete(entry.key); continue; }
      let verdict: string = evaluate(reg, now);
      if (verdict === "check-contact") {
        const [contact] = await ctx.data.activities.findForRecord("account", accountId, {
          types: contactTypes(ctx.settings.contactTypes), status: "completed", since: contactSince(reg), take: 1,
        });
        if (contact) {
          const updated: Registration = { ...reg, contactAt: new Date(contact.date as string).toISOString() };
          await ctx.store.delete(entry.key);
          await ctx.store.set(K.reg(accountId), updated);
          await ctx.store.set(K.due(dueDay(updated), accountId), {});
          continue;
        }
        verdict = "expired-no-contact";
      }
      if (verdict === "keep") continue;
      const reason = verdict as "expired" | "expired-no-contact";
      const row = await ctx.data.accounts.update(accountId, { assigned_to: null });
      await addHistory(ctx.store, accountId, { at: now.toISOString(), from: reg.ownerId, to: null, byUserId: null, byType: "plugin", reason });
      await ctx.store.set(K.freed(today, accountId), { reason });
      await clearRegistration(ctx.store, accountId);
      freed.push(String(row.name ?? accountId));
    } catch (e) {
      ctx.log.error(`Expiry failed for account ${accountId}: ${String(e)}`);
    }
  }
  const cutoff = isoDay(new Date(now.getTime() - 7 * DAY));
  for (const entry of await ctx.store.list("freed:")) {
    if (entry.key.slice(6, 16) < cutoff) await ctx.store.delete(entry.key);
  }
  if (freed.length) {
    await ctx.notify({
      roles: [...MANAGERS],
      subject: ctx.t("mail.expiredSubject", { count: freed.length }),
      text: [ctx.t("mail.expiredText"), ...freed.map((n) => `- ${n}`)].join("\n"),
    });
  }
}

export async function sendNotices(ctx: Ctx, now: Date): Promise<void> {
  await resume(ctx, now);
  for (const entry of await ctx.store.list("notice:")) {
    const n = entry.value as Notice;
    try {
      const account = await ctx.data.accounts.get(n.accountId);
      const user = n.userId ? await ctx.data.users.get(n.userId) : null;
      const params = { account: String(account?.name ?? n.accountId), user: String(user?.name ?? user?.email ?? "-") };
      await ctx.notify({ roles: [...MANAGERS], subject: ctx.t(`mail.${n.kind}.subject`, params), text: ctx.t(`mail.${n.kind}.text`, params) });
      await ctx.store.delete(entry.key);
    } catch (e) {
      if (now.getTime() - Date.parse(n.at) > DAY) {
        ctx.log.error(`Notice dropped after 24 h: ${String(e)}`, { accountId: n.accountId });
        await ctx.store.delete(entry.key);
      } else {
        ctx.log.warn(`Notice not sent, will retry: ${String(e)}`, { accountId: n.accountId });
      }
    }
  }
}

export async function install(ctx: Ctx, at: Date): Promise<void> {
  await ctx.store.set(K.lastRun, { at: at.toISOString() });
  const actor = { type: "plugin" as const, pluginId: ctx.plugin.id };
  for (let skip = 0; ; skip += 100) {
    const page = await ctx.data.accounts.find({ where: { deletedAt: null }, orderBy: { createdAt: "asc" }, take: 100, skip });
    for (const acc of page) {
      await indexNumber(acc, ctx, at);
      const owner = ownerOf(acc.assigned_to);
      if (owner) await recordOwner(acc, owner, actor, "install", ctx, at);
    }
    if (page.length < 100) break;
  }
}

/** 0.1.1: installs from 0.1.0 have no run marker, so a later re-enable could not be detected; also prune stale conflicts. */
export async function upgrade(ctx: Ctx, at: Date): Promise<void> {
  if (!(await ctx.store.get(K.lastRun))) await ctx.store.set(K.lastRun, { at: at.toISOString() });
  await pruneConflicts(ctx, at);
}
