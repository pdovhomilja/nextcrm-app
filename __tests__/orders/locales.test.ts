import { readFileSync } from "node:fs";

const PLACEHOLDERS = new Set(["date", "note", "amount", "number"]);

/** next-intl parses ICU: a bare {YYYY} is a variable, so literal braces must be quoted as '{YYYY}'. */
function unquotedBraces(text: string): string[] {
  const unquoted = text.replace(/'[^']*'/g, "");
  return Array.from(unquoted.matchAll(/\{([^}]*)\}/g)).map((m) => m[1]).filter((name) => !PLACEHOLDERS.has(name));
}

function strings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  return value && typeof value === "object" ? Object.values(value).flatMap(strings) : [];
}

it("quotes literal braces in every order message (ICU)", () => {
  for (const loc of ["en", "cz", "de", "uk"]) {
    const json = JSON.parse(readFileSync(`locales/${loc}.json`, "utf8"));
    for (const s of [...strings(json.OrdersPage), ...strings(json.OrdersAdminPage)]) expect([loc, s, unquotedBraces(s)]).toEqual([loc, s, []]);
  }
});
