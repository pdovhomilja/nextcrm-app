import type { RecordData } from "@nextcrm/plugin-sdk";
import { accountFields, changedFields, ref } from "./map";
import { matchAccount } from "./match";
import type { OxoClient, OxoCustomer } from "./oxo";
import { findAll, msg, type Ctx } from "./settings";
import { K, keepLock, type AccountLink, type Conflict, type CustomerCounts, type ReportRow, type RunSummary } from "./store";

const ROWS = 200;
const OVERLAP_MS = 2 * 60_000;

export const zeroCustomers = (): CustomerCounts => ({ linked: 0, number: 0, vat: 0, name: 0, created: 0, updated: 0, conflicts: 0, skipped: 0, failed: 0, externalRefsFilled: 0 });
export const emptyRows = (): RunSummary["rows"] => ({ name: [], created: [], conflicts: [] });

export interface CustomerRun {
  ctx: Ctx; dry: boolean; now: Date;
  counts: CustomerCounts;
  rows: RunSummary["rows"];
  /** accountId → customerId linked earlier in this run (a dry run writes no links). */
  claimed: Map<string, number>;
  /** Accounts whose external_ref this run already wrote or decided against; the backfill leaves them alone. */
  refsDecided: Set<string>;
}

const add = (list: ReportRow[], row: ReportRow) => { if (list.length < ROWS) list.push(row); };

/**
 * The one fill-if-empty rule for external_ref: the value to write, or null when the account already has one
 * (a different value is logged) or another live account holds it (logged with both ids). Counts what it gives.
 */
async function refToWrite(r: CustomerRun, accountId: string | null, current: RecordData, c: OxoCustomer): Promise<string | null> {
  if (accountId) r.refsDecided.add(accountId);
  const want = ref(c);
  if (current.external_ref) {
    if (current.external_ref !== want) r.ctx.log.warn(`Account ${accountId} keeps external_ref ${String(current.external_ref)}; OXO ERP customer ${c.id} would give ${want}`, { accountId, customerId: c.id });
    return null;
  }
  const holder = (await r.ctx.data.accounts.find({ where: { deletedAt: null, external_ref: want }, take: 2 })).find((a) => a.id !== accountId);
  if (holder) {
    r.ctx.log.warn(`${accountId ? `Account ${accountId}` : `New account for OXO ERP customer ${c.id}`} not given external_ref ${want}: account ${String(holder.id)} already has it`, { accountId, holderId: holder.id, customerId: c.id });
    return null;
  }
  r.counts.externalRefsFilled++;
  return want;
}

async function syncCustomer(r: CustomerRun, c: OxoCustomer): Promise<void> {
  const { ctx, dry, now } = r;
  if (!c.active) {
    const link = await ctx.store.get<{ accountId: string }>(K.customer(c.id));
    if (!dry) {
      await ctx.store.delete(K.conflict(c.id));
      const prev = link ? await ctx.store.get<AccountLink>(K.account(link.accountId)) : null;
      if (link && prev) await ctx.store.set(K.account(link.accountId), { ...prev, inactive: true, syncedAt: now.toISOString() } satisfies AccountLink);
    }
    r.counts.skipped++;
    return;
  }
  const fields = accountFields(c);
  const match = await matchAccount(ctx, c.id, fields, r.claimed);
  if (match.kind === "conflict") {
    r.counts.conflicts++;
    add(r.rows.conflicts, { customerId: c.id, name: fields.name, reason: match.reason, candidates: match.candidates });
    if (!dry) await ctx.store.set(K.conflict(c.id), { customerId: c.id, name: fields.name, reason: match.reason, candidates: match.candidates, foundAt: now.toISOString(), customer: c } satisfies Conflict);
    return;
  }
  if (!dry) await ctx.store.delete(K.conflict(c.id));
  let accountId: string;
  if (match.kind === "new") {
    r.counts.created++;
    add(r.rows.created, { customerId: c.id, name: fields.name });
    const external_ref = await refToWrite(r, null, {}, c);
    if (dry) return;
    accountId = (await ctx.data.accounts.create({ ...fields, billing_country: fields.billing_country ?? ctx.settings.defaultCountry, assigned_to: null, status: "Active", external_ref })).id as string;
    r.refsDecided.add(accountId);
  } else {
    accountId = match.accountId;
    r.counts[match.kind]++;
    if (match.kind === "name") add(r.rows.name, { customerId: c.id, name: fields.name, accountId });
    r.claimed.set(accountId, c.id);
    const current = (await ctx.data.accounts.get(accountId)) ?? {};
    const diff: Record<string, unknown> = changedFields(current, fields);
    if (Object.keys(diff).length) r.counts.updated++;
    const external_ref = await refToWrite(r, accountId, current, c);
    if (external_ref) diff.external_ref = external_ref;
    if (!dry && Object.keys(diff).length) await ctx.data.accounts.update(accountId, diff);
    if (dry) return;
  }
  r.claimed.set(accountId, c.id);
  await ctx.store.set(K.customer(c.id), { accountId });
  await ctx.store.set(K.account(accountId), { customerId: c.id, syncedAt: now.toISOString(), priceListId: c.priceListId, addresses: c.addresses.filter((a) => a.active) } satisfies AccountLink);
}

async function guarded(r: CustomerRun, c: OxoCustomer, done: Set<number>): Promise<void> {
  if (done.has(c.id)) return;
  done.add(c.id);
  try {
    await syncCustomer(r, c);
    if (!r.dry) await r.ctx.store.delete(K.retry(c.id));
  } catch (e) {
    r.counts.failed++;
    r.ctx.log.error(`Customer ${c.id} failed: ${msg(e)}`, { customerId: c.id });
    if (!r.dry) await r.ctx.store.set(K.retry(c.id), { customer: c });
  }
}

/**
 * Accounts linked earlier (by a sync before external_ref was written, or by a sent order) that still have no external_ref
 * get it by the same rule; the whole customer list is read only when such an account exists. Never overwrites a value.
 */
async function fillRefs(r: CustomerRun, client: OxoClient): Promise<void> {
  const links = new Map<string, number>();
  for (const e of await r.ctx.store.list("account:")) {
    const accountId = e.key.slice("account:".length);
    if (!r.refsDecided.has(accountId)) links.set(accountId, (e.value as AccountLink).customerId);
  }
  if (!links.size) return;
  const missing = (await findAll(r.ctx.data.accounts, { id: { in: Array.from(links.keys()) }, deletedAt: null })).filter((a) => !a.external_ref);
  if (!missing.length) return;
  const byId = new Map((await client.all<OxoCustomer>("/customers")).map((c) => [c.id, c]));
  for (const a of missing) {
    const customerId = links.get(a.id as string) as number;
    const c = byId.get(customerId);
    if (!c) {
      r.ctx.log.warn(`Account ${String(a.id)} has no external_ref: OXO ERP customer ${customerId} is not in its customer list`, { accountId: a.id, customerId });
      continue;
    }
    const external_ref = await refToWrite(r, a.id as string, a, c);
    if (external_ref && !r.dry) await r.ctx.data.accounts.update(a.id as string, { external_ref });
  }
}

/**
 * Changed customers since the cursor (minus 2 minutes), then those the CRM still owes from their stored copy:
 * conflicts (the CRM data may have been fixed) and failed writes. Returns the newest updatedAt seen; the caller moves the cursor.
 */
export async function syncCustomers(r: CustomerRun, client: OxoClient): Promise<string | null> {
  const cursor = (await r.ctx.store.get<{ at: string }>(K.cursor("customers")))?.at ?? null;
  const since = cursor ? new Date(Date.parse(cursor) - OVERLAP_MS).toISOString() : null;
  const rows = await client.all<OxoCustomer>("/customers", since ? { updatedSince: since } : {});
  const done = new Set<number>();
  let top = cursor;
  for (const [i, c] of Array.from(rows.entries())) {
    if (!top || c.updatedAt > top) top = c.updatedAt;
    await guarded(r, c, done);
    if ((i + 1) % 100 === 0) await keepLock(r.ctx);
  }
  for (const e of [...(await r.ctx.store.list("conflict:")), ...(await r.ctx.store.list("retry:"))]) {
    await guarded(r, (e.value as { customer: OxoCustomer }).customer, done);
  }
  await fillRefs(r, client);
  return top;
}
