import type { Actor, RuleInput } from "@nextcrm/plugin-sdk";
import { createTestContext } from "@nextcrm/plugin-sdk/testing";
import { beforeCreate, beforeUpdate } from "../rules";
import { settingsSchema, type Ctx } from "../settings";
import { K } from "../store";
import { newRegistration } from "../state";

const rep: Actor = { type: "user", userId: "rep1", role: "user" };
const rep2: Actor = { type: "user", userId: "rep2", role: "user" };
const manager: Actor = { type: "user", userId: "m1", role: "manager" };
const plugin: Actor = { type: "plugin", pluginId: "account-protection" };

async function ctxWith(actor: Actor, opts: { protectedBy?: string; requireNumber?: boolean } = {}) {
  const ctx = createTestContext({ pluginId: "account-protection", actor, settings: settingsSchema.parse({ requireNumber: opts.requireNumber ?? false }) }) as unknown as Ctx;
  await ctx.store.set(K.num("CZ:27082440"), { accountId: "acc-1" });
  await ctx.store.set(K.acct("acc-1"), { key: "CZ:27082440" });
  if (opts.protectedBy) await ctx.store.set(K.reg("acc-1"), newRegistration("CZ:27082440", opts.protectedBy, new Date("2026-10-01T00:00:00Z"), settingsSchema.parse({})));
  return ctx;
}
const create = (data: Record<string, unknown>): RuleInput => ({ entity: "account", operation: "beforeCreate", recordId: null, data, existing: null });
const update = (data: Record<string, unknown>, existing: Record<string, unknown>): RuleInput => ({ entity: "account", operation: "beforeUpdate", recordId: existing.id as string, data, existing });
const notices = async (ctx: Ctx) => (await ctx.store.list("notice:")).map((e) => e.value);

it("rejects a protected number for another rep and queues a notice", async () => {
  const ctx = await ctxWith(rep2, { protectedBy: "rep1" });
  await expect(beforeCreate(create({ name: "Alza", company_id: "270 824 40", billing_country: "Czechia" }), ctx))
    .resolves.toEqual({ kind: "reject", messageKey: "rules.protected", params: { until: "30 Dec 2026" } });
  expect(await notices(ctx)).toEqual([expect.objectContaining({ kind: "blocked-protected", userId: "rep2", accountId: "acc-1" })]);
});

it("rejects a free number with alreadyInCrm for reps and exists for managers", async () => {
  const r = await ctxWith(rep2);
  await expect(beforeCreate(create({ company_id: "27082440" }), r)).resolves.toMatchObject({ messageKey: "rules.alreadyInCrm" });
  expect(await notices(r)).toEqual([expect.objectContaining({ kind: "blocked-free" })]);
  const m = await ctxWith(manager);
  await expect(beforeCreate(create({ company_id: "27082440" }), m)).resolves.toMatchObject({ messageKey: "rules.exists" });
  expect(await notices(m)).toEqual([]);
});

it("tells the owner they already have it, without a notice", async () => {
  const ctx = await ctxWith(rep, { protectedBy: "rep1" });
  await expect(beforeCreate(create({ company_id: "27082440" }), ctx)).resolves.toMatchObject({ messageKey: "rules.ownAccount" });
  expect(await notices(ctx)).toEqual([]);
});

it("allows a new number and an account without one unless required", async () => {
  const ctx = await ctxWith(rep);
  await expect(beforeCreate(create({ company_id: "12345678" }), ctx)).resolves.toEqual({ kind: "allow" });
  await expect(beforeCreate(create({ company_id: "" }), ctx)).resolves.toEqual({ kind: "allow" });
  const req = await ctxWith(rep, { requireNumber: true });
  await expect(beforeCreate(create({ company_id: " " }), req)).resolves.toMatchObject({ messageKey: "rules.numberRequired" });
  const reqM = await ctxWith(manager, { requireNumber: true });
  await expect(beforeCreate(create({}), reqM)).resolves.toEqual({ kind: "allow" });
});

it("lets only managers, admins, the system and plugins change the owner", async () => {
  const existing = { id: "acc-1", company_id: "27082440", assigned_to: "rep1" };
  await expect(beforeUpdate(update({ assigned_to: "rep2" }, existing), await ctxWith(rep))).resolves.toMatchObject({ messageKey: "rules.ownerManagersOnly" });
  await expect(beforeUpdate(update({ assigned_to: "" }, existing), await ctxWith(rep))).resolves.toMatchObject({ messageKey: "rules.ownerManagersOnly" });
  await expect(beforeUpdate(update({ assigned_to: "rep2" }, existing), await ctxWith(manager))).resolves.toEqual({ kind: "allow" });
  await expect(beforeUpdate(update({ assigned_to: null }, existing), await ctxWith(plugin))).resolves.toEqual({ kind: "allow" });
  await expect(beforeUpdate(update({ assigned_to: "rep2" }, existing), await ctxWith({ type: "system" }))).resolves.toEqual({ kind: "allow" });
});

it("allows a rep's full-form save that keeps the owner (Review Focus 2 and 3)", async () => {
  const ctx = await ctxWith(rep);
  const existing = { id: "acc-1", name: "Alza", company_id: "27082440", billing_country: "CZ", assigned_to: "rep1" };
  await expect(beforeUpdate(update({ v: 0, name: "Alza 2", company_id: "27082440", billing_country: "CZ", assigned_to: "rep1" }, existing), ctx)).resolves.toEqual({ kind: "allow" });
  const unowned = { ...existing, assigned_to: null };
  await expect(beforeUpdate(update({ name: "Alza 3", assigned_to: "" }, unowned), ctx)).resolves.toEqual({ kind: "allow" });
});

it("rejects changing the number to one another account holds", async () => {
  const ctx = await ctxWith(rep2, { protectedBy: "rep1" });
  const existing = { id: "acc-2", company_id: "11111111", billing_country: "CZ", assigned_to: "rep2" };
  await expect(beforeUpdate(update({ company_id: "27082440" }, existing), ctx)).resolves.toMatchObject({ messageKey: "rules.protected" });
  const self = { id: "acc-1", company_id: "27082440", billing_country: "CZ", assigned_to: "rep1" };
  await expect(beforeUpdate(update({ company_id: "270 824 40" }, self), await ctxWith(rep, { protectedBy: "rep1" }))).resolves.toEqual({ kind: "allow" });
});
