import { accountFields, changedFields } from "./map";
import { matchAccount } from "./match";
import type { OxoClient, OxoCustomer } from "./oxo";
import { msg, tell, type Ctx } from "./settings";
import { K, keepLock, type AccountLink, type Conflict, type CustomerCounts, type Proposal, type ReportRow, type RunSummary } from "./store";

const ROWS = 200;
const OVERLAP_MS = 2 * 60_000;

export const zeroCustomers = (): CustomerCounts => ({ linked: 0, number: 0, vat: 0, name: 0, created: 0, updated: 0, conflicts: 0, skipped: 0, failed: 0 });
export const emptyRows = (): RunSummary["rows"] => ({ name: [], created: [], conflicts: [] });

export interface CustomerRun {
  ctx: Ctx; dry: boolean; now: Date;
  counts: CustomerCounts;
  rows: RunSummary["rows"];
  /** accountId → customerId linked earlier in this run (a dry run writes no links). */
  claimed: Map<string, number>;
  /** Link proposals this run added (managers are told once per run). */
  proposed?: number;
}

const add = (list: ReportRow[], row: ReportRow) => { if (list.length < ROWS) list.push(row); };

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
  let match = await matchAccount(ctx, c.id, fields, r.claimed);
  if (match.kind === "conflict") {
    r.counts.conflicts++;
    add(r.rows.conflicts, { customerId: c.id, name: fields.name, reason: match.reason, candidates: match.candidates });
    if (!dry) {
      await ctx.store.set(K.conflict(c.id), { customerId: c.id, name: fields.name, reason: match.reason, candidates: match.candidates, foundAt: now.toISOString(), customer: c } satisfies Conflict);
      await ctx.store.delete(K.proposal(c.id));
    }
    return;
  }
  if (!dry) await ctx.store.delete(K.conflict(c.id));
  // A first link by IČO, DIČ or name + zip waits for a manager; a rejected pair is treated as no match.
  if (match.kind === "number" || match.kind === "vat" || match.kind === "name") {
    const accountId = match.accountId;
    if (await ctx.store.get(K.rejected(c.id, accountId))) match = { kind: "new" };
    else if (!(await ctx.store.get(K.confirmed(c.id, accountId)))) {
      r.claimed.set(accountId, c.id);   // a second customer on the same account this run is a conflict, as with a link
      if (dry) return;
      const prev = await ctx.store.get<Proposal>(K.proposal(c.id));
      const same = prev?.accountId === accountId;
      if (!same) r.proposed = (r.proposed ?? 0) + 1;
      await ctx.store.set(K.proposal(c.id), { customerId: c.id, name: fields.name, accountId, reason: match.kind, foundAt: same ? prev.foundAt : now.toISOString(), customer: c } satisfies Proposal);
      return;
    }
  }
  if (!dry) await ctx.store.delete(K.proposal(c.id));
  let accountId: string;
  if (match.kind === "new") {
    r.counts.created++;
    add(r.rows.created, { customerId: c.id, name: fields.name });
    if (dry) return;
    accountId = (await ctx.data.accounts.create({ ...fields, billing_country: fields.billing_country ?? ctx.settings.defaultCountry, assigned_to: null, status: "Active" })).id as string;
  } else {
    accountId = match.accountId;
    r.counts[match.kind]++;
    if (match.kind === "name") add(r.rows.name, { customerId: c.id, name: fields.name, accountId });
    r.claimed.set(accountId, c.id);
    const diff = changedFields((await ctx.data.accounts.get(accountId)) ?? {}, fields);
    if (Object.keys(diff).length) {
      r.counts.updated++;
      if (!dry) await ctx.data.accounts.update(accountId, diff);
    }
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
  for (const e of [...(await r.ctx.store.list("conflict:")), ...(await r.ctx.store.list("proposal:")), ...(await r.ctx.store.list("retry:"))]) {
    await guarded(r, (e.value as { customer: OxoCustomer }).customer, done);
  }
  if (r.proposed) await tell(r.ctx, { roles: ["manager", "admin"], subject: r.ctx.t("mail.proposalsSubject", { count: r.proposed }), text: r.ctx.t("mail.proposalsText", { count: r.proposed }) });
  return top;
}
