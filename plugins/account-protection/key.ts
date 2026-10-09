const NAME_LOCALES = ["en", "cs", "de", "uk"];
// Older names Intl no longer returns.
const ALIASES: Record<string, string> = { "czech republic": "CZ", "česká republika": "CZ" };

let table: { codes: Set<string>; byName: Map<string, string> } | null = null;

function regions() {
  if (table) return table;
  const codes = new Set<string>();
  const byName = new Map<string, string>(Object.entries(ALIASES));
  const names = NAME_LOCALES.map((l) => new Intl.DisplayNames([l], { type: "region", fallback: "none" }));
  for (let a = 65; a <= 90; a++) {
    for (let b = 65; b <= 90; b++) {
      const code = String.fromCharCode(a, b);
      const found = names.map((n) => { try { return n.of(code); } catch { return undefined; } });
      if (!found.some(Boolean)) continue;
      codes.add(code);
      for (const name of found) if (name) byName.set(name.toLocaleLowerCase(), code);
    }
  }
  table = { codes, byName };
  return table;
}

export function countryCode(raw: unknown, fallback: string): string {
  const def = fallback.toUpperCase();
  const s = typeof raw === "string" ? raw.trim() : "";
  if (!s) return def;
  if (/^[A-Za-z]{2}$/.test(s)) return regions().codes.has(s.toUpperCase()) ? s.toUpperCase() : def;
  return regions().byName.get(s.toLocaleLowerCase()) ?? def;
}

export function numberKey(account: { company_id?: unknown; billing_country?: unknown }, defaultCountry: string): string | null {
  const raw = typeof account.company_id === "string" ? account.company_id.replace(/\s+/g, "").toUpperCase() : "";
  if (!raw) return null;
  const cc = countryCode(account.billing_country, defaultCountry);
  const number = cc === "CZ" && /^\d{1,8}$/.test(raw) ? raw.padStart(8, "0") : raw;
  return `${cc}:${number}`;
}
