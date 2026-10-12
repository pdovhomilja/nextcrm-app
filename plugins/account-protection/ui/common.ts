import { numberKey } from "../key";
import { contactTypes, type Ctx } from "../settings";
import { contactSince, formatDay, isoDay, summarize, type Registration, type Summary } from "../state";
import { K } from "../store";

const DAY = 86_400_000;

export async function liveContact(ctx: Ctx, accountId: string, reg: Registration): Promise<string | null> {
  if (reg.contactAt) return reg.contactAt;
  const [a] = await ctx.data.activities.findForRecord("account", accountId, {
    types: contactTypes(ctx.settings.contactTypes), status: "completed", since: contactSince(reg), take: 1,
  });
  return a ? new Date(a.date as string).toISOString() : null;
}

export async function loadSummary(ctx: Ctx, accountId: string) {
  const acc = await ctx.data.accounts.get(accountId);
  const hasKey = !!acc && !!numberKey(acc, ctx.settings.defaultCountry);
  const reg = await ctx.store.get<Registration>(K.reg(accountId));
  const contactAt = reg ? await liveContact(ctx, accountId, reg) : null;
  return { summary: summarize(hasKey, reg, contactAt), reg, contactAt };
}

export function summaryText(ctx: Ctx, s: Summary): string {
  return "date" in s ? ctx.t(`tab.${s.kind}`, { date: formatDay(s.date, ctx.locale) }) : ctx.t(`tab.${s.kind}`);
}

export async function dueWithin(ctx: Ctx, now: Date): Promise<{ accountId: string; day: string }[]> {
  const horizon = isoDay(new Date(now.getTime() + ctx.settings.warnDays * DAY));
  return (await ctx.store.list("due:"))
    .map((e) => ({ day: e.key.slice(4, 14), accountId: e.key.slice(15) }))
    .filter((e) => e.day <= horizon)
    .map(({ accountId, day }) => ({ accountId, day }));
}

/** Ruling 3: the last confirmed order whenever one exists; "none yet" only while rule 3 is on. */
export function orderText(ctx: Ctx, reg: Registration): string | null {
  if (reg.lastOrderAt) return ctx.t("tab.lastOrder", { date: formatDay(reg.lastOrderAt, ctx.locale) });
  return ctx.settings.orderMonths > 0 ? ctx.t("tab.noOrder") : null;
}
