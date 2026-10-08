import type { CompanyRecord, PluginContext } from "@nextcrm/plugin-sdk";

const ARES_URL = "https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty/";

// IČO: up to 8 digits, left-padded; mod-11 checksum over the first 7 (weights 8..2).
export function normalizeIco(input: string): string | null {
  const s = input.replace(/\s+/g, "");
  if (!/^\d{1,8}$/.test(s)) return null;
  const ico = s.padStart(8, "0");
  const sum = [...ico.slice(0, 7)].reduce((acc, d, i) => acc + Number(d) * (8 - i), 0);
  return (11 - (sum % 11)) % 10 === Number(ico[7]) ? ico : null;
}

interface AresSidlo {
  nazevUlice?: string;
  nazevCastiObce?: string;
  cisloDomovni?: number;
  cisloOrientacni?: number;
  cisloOrientacniPismeno?: string;
  nazevObce?: string;
  psc?: number;
}

export interface AresSubject {
  ico: string;
  obchodniJmeno: string;
  dic?: string;
  sidlo?: AresSidlo;
}

export function mapAres(subject: AresSubject, ico: string): CompanyRecord {
  const a = subject.sidlo ?? {};
  const orientation = a.cisloOrientacni === undefined ? "" : `/${a.cisloOrientacni}${a.cisloOrientacniPismeno ?? ""}`;
  const house = a.cisloDomovni === undefined ? "" : `${a.cisloDomovni}${orientation}`;
  const street = [a.nazevUlice ?? a.nazevCastiObce, house].filter(Boolean).join(" ");
  return {
    name: subject.obchodniJmeno,
    registrationNumber: ico,
    country: "CZ",
    ...(subject.dic ? { vat: subject.dic } : {}),
    ...(street ? { street } : {}),
    ...(a.nazevObce ? { city: a.nazevObce } : {}),
    ...(a.psc !== undefined ? { postalCode: String(a.psc) } : {}),
  };
}

export async function lookupAres(registrationNumber: string, ctx: Pick<PluginContext, "http">): Promise<CompanyRecord | null> {
  const ico = normalizeIco(registrationNumber);
  if (!ico) return null;
  const res = await ctx.http.fetch(ARES_URL + ico, { headers: { Accept: "application/json" } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`ARES responded ${res.status}`);
  return mapAres((await res.json()) as AresSubject, ico);
}
