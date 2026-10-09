import { indexNumber, recordOwner } from "./hooks";
import { ownerOf } from "./rules";
import { contactTypes, type Ctx } from "./settings";
import { contactSince, dueDay, evaluate, isoDay, type Registration } from "./state";
import { K, addHistory, clearRegistration, type Notice } from "./store";

const MANAGERS = ["manager", "admin"] as const;   // Ruling 7
const DAY = 86_400_000;

export async function expire(ctx: Ctx, now: Date): Promise<void> {
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
