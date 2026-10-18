import type { RecordData } from "@nextcrm/plugin-sdk";
import type { AccountFields } from "./map";
import type { Ctx } from "./settings";
import { K, type MatchReason } from "./store";

/** Same rule as account-protection's number key: whitespace out, upper case, CZ left-padded to 8 digits. */
export function normalizeNumber(country: string | null, raw: string | null): string | null {
  if (!raw) return null;
  const n = raw.replace(/\s+/g, "").toUpperCase();
  if (!n) return null;
  return (country ?? "").toUpperCase() === "CZ" && /^\d{1,8}$/.test(n) ? n.padStart(8, "0") : n;
}
export const normalizeVat = (raw: string | null): string | null => (raw ? raw.replace(/\s+/g, "").toUpperCase() || null : null);
const zip = (v: unknown) => String(v ?? "").replace(/\s+/g, "");

export type Match =
  | { kind: "linked" | "number" | "vat" | "name"; accountId: string }
  | { kind: "new" }
  | { kind: "conflict"; reason: MatchReason; candidates: string[] };

/** One candidate links, several conflict; an account linked to another customer (stored, or earlier in this run) is never shared. */
async function pick(ctx: Ctx, customerId: number, rows: RecordData[], reason: "number" | "vat" | "name", claimed: Map<string, number>): Promise<Match | null> {
  if (!rows.length) return null;
  const ids = rows.map((r) => r.id as string);
  if (rows.length > 1) return { kind: "conflict", reason, candidates: ids };
  const owner = claimed.get(ids[0]) ?? (await ctx.store.get<{ customerId: number }>(K.account(ids[0])))?.customerId;
  if (owner !== undefined && owner !== customerId) return { kind: "conflict", reason: "linked", candidates: ids };
  return { kind: reason, accountId: ids[0] };
}

/** Spec § 4.1: link, then country + IČO, then DIČ, then exact name + zip, else new. */
export async function matchAccount(ctx: Ctx, customerId: number, f: AccountFields, claimed: Map<string, number>): Promise<Match> {
  const linked = await ctx.store.get<{ accountId: string }>(K.customer(customerId));
  if (linked) {
    const acc = await ctx.data.accounts.get(linked.accountId);
    if (acc && acc.deletedAt == null) return { kind: "linked", accountId: linked.accountId };
  }
  const country = f.billing_country ?? ctx.settings.defaultCountry;
  const number = normalizeNumber(country, f.company_id);
  if (number) {
    const raw = Array.from(new Set([f.company_id as string, number, number.replace(/^0+/, "")]));
    const rows = (await ctx.data.accounts.find({ where: { deletedAt: null, company_id: { in: raw } } }))
      .filter((a) => normalizeNumber(country, (a.company_id as string | null) ?? null) === number);
    const m = await pick(ctx, customerId, rows, "number", claimed);
    if (m) return m;
  }
  const vat = normalizeVat(f.vat);
  if (vat) {
    const raw = Array.from(new Set([f.vat as string, vat, vat.toLowerCase()]));
    const rows = (await ctx.data.accounts.find({ where: { deletedAt: null, vat: { in: raw } } }))
      .filter((a) => normalizeVat((a.vat as string | null) ?? null) === vat);
    const m = await pick(ctx, customerId, rows, "vat", claimed);
    if (m) return m;
  }
  if (f.billing_postal_code) {
    const rows = (await ctx.data.accounts.find({ where: { deletedAt: null, name: { equals: f.name, mode: "insensitive" } } }))
      .filter((a) => zip(a.billing_postal_code) === zip(f.billing_postal_code));
    const m = await pick(ctx, customerId, rows, "name", claimed);
    if (m) return m;
  }
  return { kind: "new" };
}
