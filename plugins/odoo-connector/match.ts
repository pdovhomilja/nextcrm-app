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
  | { kind: "conflict"; reason: "number" | "vat"; candidates: string[] };

function pick(rows: RecordData[], reason: "number" | "vat"): Match | null {
  if (rows.length === 1) return { kind: reason, accountId: rows[0].id as string };
  if (rows.length > 1) return { kind: "conflict", reason, candidates: rows.map((r) => r.id as string) };
  return null;
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
    const m = pick(rows, "number");
    if (m) return m;
  }
  const vat = normalizeVat(f.vat);
  if (vat) {
    const raw = Array.from(new Set([f.vat as string, vat]));
    const rows = (await ctx.data.accounts.find({ where: { deletedAt: null, vat: { in: raw } } }))
      .filter((a) => normalizeVat((a.vat as string | null) ?? null) === vat);
    const m = pick(rows, "vat");
    if (m) return m;
  }
  return { kind: "new" };
}
