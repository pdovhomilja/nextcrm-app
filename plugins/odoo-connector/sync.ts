import type { M2O, OdooPartner } from "./map";
import { PARTNER_FIELDS, accountFields, changedFields, contactFields } from "./map";
import { matchAccount } from "./match";
import { OdooAuthError, jsonClient, type OdooClient } from "./odoo";
import type { Ctx } from "./settings";
import { syncCatalog } from "./catalog";
import { K, type AccountLink, type CatalogCounts, type Conflict, type RunSummary } from "./store";

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
  started: number;
  done: Set<number>;
  catalog?: CatalogCounts;
}

const CUSTOMER = [["customer_rank", ">", 0], ["parent_id", "=", false]];

async function ownerFor(r: Run, user: M2O | undefined): Promise<string | null> {
  if (!user) return null;
  if (!r.owners.has(user[0])) {
    const [u] = await r.client.call<{ login?: string; email?: string | false }[]>("res.users", "read", { ids: [user[0]], fields: ["login", "email"] });
    const email = (typeof u?.email === "string" && u.email) || u?.login || null;
    const [row] = email ? await r.ctx.data.users.find({ where: { email: { equals: email, mode: "insensitive" }, userStatus: "ACTIVE" }, take: 1 }) : [];
    r.owners.set(user[0], row ? (row.id as string) : null);
  }
  return r.owners.get(user[0]) ?? null;
}

async function syncCustomer(r: Run, p: OdooPartner): Promise<void> {
  const { ctx, dry } = r;
  const link = await ctx.store.get<{ accountId: string }>(K.partner(p.id));
  if (p.active === false || !p.customer_rank) {
    if (!dry) await ctx.store.delete(K.conflict(p.id));
    if (link && !dry) {
      const prev = await ctx.store.get<AccountLink>(K.account(link.accountId));
      await ctx.store.set(K.account(link.accountId), { partnerId: p.id, salesperson: prev?.salesperson ?? null, syncedAt: r.now.toISOString(), archived: p.active === false, notCustomer: !p.customer_rank, odooPriceList: prev?.odooPriceList ?? null } satisfies AccountLink);
    }
    r.counts.skipped++;
    return;
  }
  const fields = accountFields(p, (id) => r.countries.get(id) ?? null, ctx.settings.defaultCountry);
  const match = await matchAccount(ctx, p.id, fields);
  if (match.kind === "conflict") {
    r.counts.conflicts++;
    if (dry) ctx.log.info("Dry run: would conflict", { partnerId: p.id, reason: match.reason, candidates: match.candidates });
    else await ctx.store.set(K.conflict(p.id), { partnerId: p.id, name: fields.name, reason: match.reason, candidates: match.candidates, foundAt: r.now.toISOString() } satisfies Conflict);
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
    accountId = (await ctx.data.accounts.create({ ...fields, assigned_to: owner, status: "Active" })).id as string;
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
  await ctx.store.set(K.account(accountId), { partnerId: p.id, syncedAt: r.now.toISOString(), salesperson, odooPriceList: p.property_product_pricelist || null } satisfies AccountLink);
}

async function syncPerson(r: Run, p: OdooPartner): Promise<void> {
  const { ctx, dry } = r;
  const parent = p.parent_id ? await ctx.store.get<{ accountId: string }>(K.partner(p.parent_id[0])) : null;
  if (p.active === false || !parent) { r.counts.skipped++; return; }
  const fields = contactFields(p);
  const link = await ctx.store.get<{ contactId: string }>(K.contact(p.id));
  let current = link ? await ctx.data.contacts.get(link.contactId) : null;
  if (!current && fields.email) [current] = await ctx.data.contacts.find({ where: { accountsIDs: parent.accountId, email: { equals: fields.email, mode: "insensitive" } }, take: 1 });
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

const dispatch = (r: Run, p: OdooPartner) => (p.parent_id ? syncPerson(r, p) : syncCustomer(r, p));

/**
 * One partner's failure is logged, counted and marked for retry on the next run, even if Odoo does not change it
 * (review C1); a rejected key stops the run (spec § 3.1). A partner is handled once per run.
 */
async function guarded(r: Run, p: OdooPartner, fn: (r: Run, p: OdooPartner) => Promise<void>) {
  if (r.done.has(p.id)) return;
  r.done.add(p.id);
  try {
    await fn(r, p);
    if (!r.dry) await r.ctx.store.delete(K.retry(p.id));
  } catch (e) {
    if (e instanceof OdooAuthError) throw e;
    r.counts.failed++;
    r.ctx.log.error(`Partner ${p.id} failed: ${e instanceof Error ? e.message : String(e)}`, { partnerId: p.id });
    if (!r.dry) await r.ctx.store.set(K.retry(p.id), {});
  }
}

async function pages(r: Run, domain: unknown[], order: string, fn: (r: Run, p: OdooPartner) => Promise<void>, opts: { archived?: boolean; onPage?: (rows: OdooPartner[]) => Promise<void> } = {}) {
  for (let offset = 0; ; offset += PAGE) {
    const rows = await r.client.call<OdooPartner[]>("res.partner", "search_read", {
      domain, fields: r.fields, limit: PAGE, offset, order, ...(opts.archived ? { context: { active_test: false } } : {}),
    });
    for (const p of rows) await guarded(r, p, fn);
    if (opts.onPage) await opts.onPage(rows);
    // A long import keeps its lock, so a second run cannot start next to it.
    await r.ctx.store.set(K.lock, { until: new Date(r.now.getTime() + Date.now() - r.started + LOCK_MS).toISOString() });
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

/**
 * Changed partners since the cursor, then the ones Odoo did not change but the CRM still owes: unlinked customers
 * (conflicts, failed creates), partners marked for retry, and the people of customers linked in this run.
 * The cursor moves only when the whole run succeeds (review I2).
 */
async function incremental(r: Run, cursor: string): Promise<string | null> {
  const since = odooTime(new Date(fromOdoo(cursor).getTime() - OVERLAP_MS));
  let top: string | null = cursor;
  const track = async (rows: OdooPartner[]) => { top = newest(rows, top); };
  const linked = await linkedIds(r.ctx);
  await pages(r, [["write_date", ">", since], ["parent_id", "=", false], "|", ["customer_rank", ">", 0], ["id", "in", linked]], "write_date asc, id asc", syncCustomer, { archived: true, onPage: track });
  await pages(r, [...CUSTOMER, ["active", "=", true], ["id", "not in", linked]], "id asc", syncCustomer);
  const retry = (await r.ctx.store.list("retry:")).map((e) => Number(e.key.slice(6)));
  if (retry.length) await pages(r, [["id", "in", retry]], "id asc", dispatch, { archived: true });
  const parents = await linkedIds(r.ctx);
  if (parents.length) {
    await pages(r, [["write_date", ">", since], ["type", "=", "contact"], ["parent_id", "in", parents]], "write_date asc, id asc", syncPerson, { archived: true, onPage: track });
  }
  const fresh = parents.filter((id) => !linked.includes(id));
  if (fresh.length) await pages(r, [["parent_id", "in", fresh], ["type", "=", "contact"], ["active", "=", true]], "id asc", syncPerson);
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
    return { at: now.toISOString(), ok: false, dryRun: dry, ...zero(), error: ctx.t("admin.running") };
  }
  await ctx.store.set(K.lock, { until: new Date(now.getTime() + LOCK_MS).toISOString() });
  const started = Date.now();
  const r: Run = { ctx, client, now, dry, counts: zero(), fields: [], countries: new Map(), owners: new Map(), started, done: new Set() };
  let summary: RunSummary;
  try {
    const available = await client.call<Record<string, unknown>>("res.partner", "fields_get", { attributes: ["type"] });
    r.fields = PARTNER_FIELDS.filter((f) => f in available);
    r.countries = new Map((await client.call<{ id: number; code: string }[]>("res.country", "search_read", { domain: [], fields: ["code"] })).map((c) => [c.id, c.code]));
    const cursor = await ctx.store.get<{ at: string }>(K.cursor);
    const top = cursor ? await incremental(r, cursor.at) : await firstImport(r);
    r.catalog = await syncCatalog({ ctx, client, dry, now });
    if (!dry && top) await ctx.store.set(K.cursor, { at: top });
    summary = { at: now.toISOString(), ok: true, dryRun: dry, ...r.counts, catalog: r.catalog };
    await ctx.store.set(K.failures, { count: 0 });
    ctx.log.info(`Sync finished${dry ? " (dry run)" : ""}`, { ...r.counts, ms: Date.now() - started });
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    summary = { at: now.toISOString(), ok: false, dryRun: dry, ...r.counts, catalog: r.catalog, error };
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

/**
 * Ruling 2: the cron runs every 5 minutes; a sync starts when syncMinutes have passed since the last one.
 * In dry run the schedule is paused; "Sync now" still runs (review).
 */
export async function scheduledSync(ctx: Ctx, now: Date, client: OdooClient = jsonClient(ctx)): Promise<boolean> {
  if (ctx.settings.dryRun) return false;
  const last = await ctx.store.get<RunSummary>(K.lastRun);
  if (last && now.getTime() - Date.parse(last.at) < ctx.settings.syncMinutes * 60_000 - SLACK_MS) return false;
  await runSync(ctx, client, now);
  return true;
}
