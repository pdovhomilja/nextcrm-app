import type { M2O, OdooPartner } from "./map";
import { PARTNER_FIELDS, accountFields, changedFields, contactFields } from "./map";
import { matchAccount } from "./match";
import { OdooAuthError, jsonClient, type OdooClient } from "./odoo";
import type { Ctx } from "./settings";
import { K, type AccountLink, type Conflict, type RunSummary } from "./store";

const PAGE = 100;
const OVERLAP_MS = 2 * 60_000;
const LOCK_MS = 10 * 60_000;
const SLACK_MS = 30_000;

type Counts = Pick<RunSummary, "created" | "updated" | "unchanged" | "skipped" | "conflicts" | "failed">;
const zero = (): Counts => ({ created: 0, updated: 0, unchanged: 0, skipped: 0, conflicts: 0, failed: 0 });

/** Odoo datetimes are UTC "YYYY-MM-DD HH:MM:SS". */
export const odooTime = (d: Date) => d.toISOString().slice(0, 19).replace("T", " ");
const fromOdoo = (s: string) => new Date(`${s.replace(" ", "T")}Z`);

interface Run {
  ctx: Ctx;
  client: OdooClient;
  now: Date;
  dry: boolean;
  counts: Counts;
  fields: string[];
  countries: Map<number, string>;
  owners: Map<number, string | null>;
}

const CUSTOMER = [["customer_rank", ">", 0], ["parent_id", "=", false]];

async function ownerFor(r: Run, user: M2O | undefined): Promise<string | null> {
  if (!user) return null;
  if (!r.owners.has(user[0])) {
    const [u] = await r.client.call<{ login?: string; email?: string | false }[]>("res.users", "read", { ids: [user[0]], fields: ["login", "email"] });
    const email = (typeof u?.email === "string" && u.email) || u?.login || null;
    let id: string | null = null;
    for (const candidate of email ? Array.from(new Set([email, email.toLowerCase()])) : []) {
      const [row] = await r.ctx.data.users.find({ where: { email: candidate, userStatus: "ACTIVE" }, take: 1 });
      if (row) { id = row.id as string; break; }
    }
    r.owners.set(user[0], id);
  }
  return r.owners.get(user[0]) ?? null;
}

async function syncCustomer(r: Run, p: OdooPartner): Promise<void> {
  const { ctx, dry } = r;
  const link = await ctx.store.get<{ accountId: string }>(K.partner(p.id));
  if (p.active === false || !p.customer_rank) {
    if (link && !dry) {
      const prev = await ctx.store.get<AccountLink>(K.account(link.accountId));
      await ctx.store.set(K.account(link.accountId), { partnerId: p.id, salesperson: prev?.salesperson ?? null, syncedAt: r.now.toISOString(), archived: p.active === false, notCustomer: !p.customer_rank } satisfies AccountLink);
    }
    r.counts.skipped++;
    return;
  }
  const fields = accountFields(p, (id) => r.countries.get(id) ?? null, ctx.settings.defaultCountry);
  const match = await matchAccount(ctx, p.id, fields);
  if (match.kind === "conflict") {
    r.counts.conflicts++;
    if (!dry) await ctx.store.set(K.conflict(p.id), { partnerId: p.id, name: fields.name, reason: match.reason, candidates: match.candidates, foundAt: r.now.toISOString() } satisfies Conflict);
    return;
  }
  if (!dry) await ctx.store.delete(K.conflict(p.id));
  let accountId: string;
  let salesperson: string | null;
  if (match.kind === "new") {
    const owner = await ownerFor(r, p.user_id);
    salesperson = owner ? null : p.user_id ? p.user_id[1] : null;
    r.counts.created++;
    if (dry) { ctx.log.info("Dry run: would create account", { partnerId: p.id, ...fields, assigned_to: owner }); return; }
    accountId = (await ctx.data.accounts.create({ ...fields, assigned_to: owner })).id as string;
  } else {
    accountId = match.accountId;
    const diff = changedFields((await ctx.data.accounts.get(accountId)) ?? {}, fields);
    if (!Object.keys(diff).length) r.counts.unchanged++;
    else {
      r.counts.updated++;
      if (dry) { ctx.log.info("Dry run: would update account", { partnerId: p.id, accountId, ...diff }); return; }
      await ctx.data.accounts.update(accountId, diff);
    }
    if (dry) return;
    salesperson = (await ctx.store.get<AccountLink>(K.account(accountId)))?.salesperson ?? null;
  }
  await ctx.store.set(K.partner(p.id), { accountId });
  await ctx.store.set(K.account(accountId), { partnerId: p.id, syncedAt: r.now.toISOString(), salesperson } satisfies AccountLink);
}

async function syncPerson(r: Run, p: OdooPartner): Promise<void> {
  const { ctx, dry } = r;
  const parent = p.parent_id ? await ctx.store.get<{ accountId: string }>(K.partner(p.parent_id[0])) : null;
  if (p.active === false || !parent) { r.counts.skipped++; return; }
  const fields = contactFields(p);
  const link = await ctx.store.get<{ contactId: string }>(K.contact(p.id));
  let current = link ? await ctx.data.contacts.get(link.contactId) : null;
  if (!current && fields.email) [current] = await ctx.data.contacts.find({ where: { accountsIDs: parent.accountId, email: fields.email }, take: 1 });
  if (!current) {
    r.counts.created++;
    if (dry) { ctx.log.info("Dry run: would create contact", { partnerId: p.id, accountId: parent.accountId, ...fields }); return; }
    const row = await ctx.data.contacts.create({ ...fields, accountsIDs: parent.accountId });
    await ctx.store.set(K.contact(p.id), { contactId: row.id as string });
    return;
  }
  const diff = changedFields(current, fields);
  if (!Object.keys(diff).length) r.counts.unchanged++;
  else {
    r.counts.updated++;
    if (dry) { ctx.log.info("Dry run: would update contact", { partnerId: p.id, contactId: current.id, ...diff }); return; }
    await ctx.data.contacts.update(current.id as string, diff);
  }
  if (!dry) await ctx.store.set(K.contact(p.id), { contactId: current.id as string });
}

/** One partner's failure is logged and counted; a rejected key stops the run (spec § 3.1). */
async function guarded(r: Run, p: OdooPartner, fn: (r: Run, p: OdooPartner) => Promise<void>) {
  try {
    await fn(r, p);
  } catch (e) {
    if (e instanceof OdooAuthError) throw e;
    r.counts.failed++;
    r.ctx.log.error(`Partner ${p.id} failed: ${e instanceof Error ? e.message : String(e)}`, { partnerId: p.id });
  }
}

async function pages(r: Run, domain: unknown[], order: string, fn: (r: Run, p: OdooPartner) => Promise<void>, opts: { archived?: boolean; onPage?: (rows: OdooPartner[]) => Promise<void> } = {}) {
  for (let offset = 0; ; offset += PAGE) {
    const rows = await r.client.call<OdooPartner[]>("res.partner", "search_read", {
      domain, fields: r.fields, limit: PAGE, offset, order, ...(opts.archived ? { context: { active_test: false } } : {}),
    });
    for (const p of rows) await guarded(r, p, fn);
    if (opts.onPage) await opts.onPage(rows);
    if (rows.length < PAGE) return;
  }
}

const linkedIds = async (ctx: Ctx) => (await ctx.store.list("partner:")).map((e) => Number(e.key.slice(8)));
const newest = (rows: OdooPartner[], prev: string | null) => rows.reduce<string | null>((m, p) => (!m || p.write_date > m ? p.write_date : m), prev);

async function firstImport(r: Run): Promise<string | null> {
  let top: string | null = null;
  await pages(r, [...CUSTOMER, ["active", "=", true]], "id asc", syncCustomer, { onPage: async (rows) => { top = newest(rows, top); } });
  const parents = await linkedIds(r.ctx);
  if (parents.length) {
    await pages(r, [["parent_id", "in", parents], ["type", "=", "contact"], ["active", "=", true]], "id asc", syncPerson, { onPage: async (rows) => { top = newest(rows, top); } });
  }
  return top;
}

async function incremental(r: Run, cursor: string): Promise<string | null> {
  const since = odooTime(new Date(fromOdoo(cursor).getTime() - OVERLAP_MS));
  let top: string | null = cursor;
  const save = async (rows: OdooPartner[]) => {
    top = newest(rows, top);
    if (!r.dry && top) await r.ctx.store.set(K.cursor, { at: top });
  };
  const linked = await linkedIds(r.ctx);
  await pages(r, [["write_date", ">", since], ["parent_id", "=", false], "|", ["customer_rank", ">", 0], ["id", "in", linked]], "write_date asc, id asc", syncCustomer, { archived: true, onPage: save });
  const parents = await linkedIds(r.ctx);
  if (parents.length) {
    await pages(r, [["write_date", ">", since], ["type", "=", "contact"], ["parent_id", "in", parents]], "write_date asc, id asc", syncPerson, { archived: true, onPage: save });
  }
  return top;
}

export function summaryText(ctx: Ctx, s: RunSummary): string {
  return s.ok ? ctx.t("admin.counts", { created: s.created, updated: s.updated, unchanged: s.unchanged, skipped: s.skipped, conflicts: s.conflicts, failed: s.failed })
    : ctx.t("admin.failed", { error: s.error ?? "?" });
}

export async function runSync(ctx: Ctx, client: OdooClient, now: Date): Promise<RunSummary> {
  const lock = await ctx.store.get<{ until: string }>(K.lock);
  const dry = ctx.settings.dryRun;
  if (lock && Date.parse(lock.until) > now.getTime()) {
    ctx.log.info("Sync skipped: another run is in progress");
    return { at: now.toISOString(), ok: true, dryRun: dry, ...zero() };
  }
  await ctx.store.set(K.lock, { until: new Date(now.getTime() + LOCK_MS).toISOString() });
  const r: Run = { ctx, client, now, dry, counts: zero(), fields: [], countries: new Map(), owners: new Map() };
  const started = Date.now();
  let summary: RunSummary;
  try {
    const available = await client.call<Record<string, unknown>>("res.partner", "fields_get", { attributes: ["type"] });
    r.fields = PARTNER_FIELDS.filter((f) => f in available);
    r.countries = new Map((await client.call<{ id: number; code: string }[]>("res.country", "search_read", { domain: [], fields: ["code"] })).map((c) => [c.id, c.code]));
    const cursor = await ctx.store.get<{ at: string }>(K.cursor);
    const top = cursor ? await incremental(r, cursor.at) : await firstImport(r);
    if (!dry && top) await ctx.store.set(K.cursor, { at: top });
    summary = { at: now.toISOString(), ok: true, dryRun: dry, ...r.counts };
    await ctx.store.set(K.failures, { count: 0 });
    ctx.log.info(`Sync finished${dry ? " (dry run)" : ""}`, { ...r.counts, ms: Date.now() - started });
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    summary = { at: now.toISOString(), ok: false, dryRun: dry, ...r.counts, error };
    ctx.log.error(`Sync failed: ${error}`, { ...r.counts });
    const failures = ((await ctx.store.get<{ count: number }>(K.failures))?.count ?? 0) + 1;
    await ctx.store.set(K.failures, { count: failures });
    if (failures === 3) await ctx.notify({ roles: ["admin"], subject: ctx.t("mail.failingSubject"), text: ctx.t("mail.failingText", { error }) });
  } finally {
    await ctx.store.delete(K.lock);
  }
  await ctx.store.set(K.lastRun, summary);
  return summary;
}

/** Ruling 2: the cron runs every 5 minutes; a sync starts when syncMinutes have passed since the last one. */
export async function scheduledSync(ctx: Ctx, now: Date, client: OdooClient = jsonClient(ctx)): Promise<boolean> {
  const last = await ctx.store.get<RunSummary>(K.lastRun);
  if (last && now.getTime() - Date.parse(last.at) < ctx.settings.syncMinutes * 60_000 - SLACK_MS) return false;
  await runSync(ctx, client, now);
  return true;
}
