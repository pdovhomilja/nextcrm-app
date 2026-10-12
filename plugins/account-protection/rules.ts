import { allow, reject, type Actor, type RuleInput, type RuleResult } from "@nextcrm/plugin-sdk";
import { numberKey } from "./key";
import { formatDay, type Registration } from "./state";
import { K, queueNotice } from "./store";
import type { Ctx } from "./settings";

export const isRep = (a: Actor) => (a.type === "user" || a.type === "token") && a.role === "user";
export const userIdOf = (a: Actor) => (a.type === "user" || a.type === "token" ? a.userId : null);
export const ownerOf = (v: unknown) => (typeof v === "string" && v ? v : null);

async function checkKey(key: string, selfId: string | null, ctx: Ctx): Promise<RuleResult> {
  const holder = await ctx.store.get<{ accountId: string }>(K.num(key));
  if (!holder || holder.accountId === selfId) return allow();
  const reg = await ctx.store.get<Registration>(K.reg(holder.accountId));
  const me = userIdOf(ctx.actor);
  if (reg && me && reg.ownerId === me) return reject("rules.ownAccount");
  if (isRep(ctx.actor)) {
    await queueNotice(ctx.store, { kind: reg ? "blocked-protected" : "blocked-free", userId: me, accountId: holder.accountId }, new Date());
  }
  if (reg) return reject("rules.protected", { until: formatDay(reg.protectedUntil, ctx.locale) });
  return reject(isRep(ctx.actor) ? "rules.alreadyInCrm" : "rules.exists");
}

export async function beforeCreate(input: RuleInput, ctx: Ctx): Promise<RuleResult> {
  const key = numberKey(input.data, ctx.settings.defaultCountry);
  if (!key) return ctx.settings.requireNumber && isRep(ctx.actor) ? reject("rules.numberRequired") : allow();
  return checkKey(key, null, ctx);
}

export async function beforeUpdate(input: RuleInput, ctx: Ctx): Promise<RuleResult> {
  const existing = input.existing ?? {};
  const data = input.data;
  if ("assigned_to" in data && ownerOf(data.assigned_to) !== ownerOf(existing.assigned_to) && isRep(ctx.actor)) {
    return reject("rules.ownerManagersOnly");
  }
  if ("company_id" in data || "billing_country" in data) {
    const before = numberKey(existing, ctx.settings.defaultCountry);
    const after = numberKey({ ...existing, ...data }, ctx.settings.defaultCountry);
    if (after && after !== before) return checkKey(after, input.recordId, ctx);
  }
  return allow();
}
