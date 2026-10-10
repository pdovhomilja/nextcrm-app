import type { RecordData } from "@nextcrm/plugin-sdk";
import type { AccountFields } from "./map";
import type { Ctx } from "./settings";
import { K } from "./store";

/** Same rule as account-protection's number key: whitespace out, upper case, CZ left-padded to 8 digits. */
export function normalizeNumber(country: string | null, raw: string | null): string | null {
  if (!raw) return null;
  const n = raw.replace(/\s+/g, "").toUpperCase();
  if (!n) return null;
  return (country ?? "").toUpperCase() === "CZ" && /^\d{1,8}$/.test(n) ? n.padStart(8, "0") : n;
}

export const normalizeVat = (raw: string | null): string | null => (raw ? raw.replace(/\s+/g, "").toUpperCase() || null : null);

export type Match =
  | { kind: "linked" | "number" | "vat"; accountId: string }
  | { kind: "new" }
  | { kind: "conflict"; reason: "number" | "vat" | "linked"; candidates: string[] };

/** One candidate links, several conflict; an account already linked to another partner is never shared (review I6). */
async function pick(ctx: Ctx, partnerId: number, rows: RecordData[], reason: "number" | "vat"): Promise<Match | null> {
  if (!rows.length) return null;
  const ids = rows.map((r) => r.id as string);
  if (rows.length > 1) return { kind: "conflict", reason, candidates: ids };
  const link = await ctx.store.get<{ partnerId: number }>(K.account(ids[0]));
  if (link && link.partnerId !== partnerId) return { kind: "conflict", reason: "linked", candidates: ids };
  return { kind: reason, accountId: ids[0] };
}

/** Spec § 3.4: link, then country + registration number, then VAT, else new (Ruling 5 for candidate lookup). */
export async function matchAccount(ctx: Ctx, partnerId: number, f: AccountFields): Promise<Match> {
  const linked = await ctx.store.get<{ accountId: string }>(K.partner(partnerId));
  if (linked) {
    const acc = await ctx.data.accounts.get(linked.accountId);
    if (acc && acc.deletedAt == null) return { kind: "linked", accountId: linked.accountId };
  }
  const number = normalizeNumber(f.billing_country, f.company_id);
  if (number) {
    const raw = Array.from(new Set([f.company_id as string, number, number.replace(/^0+/, "")]));
    const rows = (await ctx.data.accounts.find({ where: { deletedAt: null, company_id: { in: raw } } }))
      .filter((a) => normalizeNumber(f.billing_country, (a.company_id as string | null) ?? null) === number);
    const m = await pick(ctx, partnerId, rows, "number");
    if (m) return m;
  }
  const vat = normalizeVat(f.vat);
  if (vat) {
    const raw = Array.from(new Set([f.vat as string, vat]));
    const rows = (await ctx.data.accounts.find({ where: { deletedAt: null, vat: { in: raw } } }))
      .filter((a) => normalizeVat((a.vat as string | null) ?? null) === vat);
    const m = await pick(ctx, partnerId, rows, "vat");
    if (m) return m;
  }
  return { kind: "new" };
}
