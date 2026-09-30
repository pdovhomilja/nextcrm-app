// next-intl is ESM and isn't transformed by jest; stub defineRouting so importing
// @/i18n/routing just yields its config object (we only read `routing.locales`).
jest.mock("next-intl/routing", () => ({ defineRouting: (config: unknown) => config }));

import { legacyRedirects, LEGACY_REDIRECT_LOCALES } from "@/lib/legacy-redirects";
import { routing } from "@/i18n/routing";

// Compile a Next.js redirect `source` to a RegExp the same way path-to-regexp does
// for the simple shapes we use: `:name(regex)` -> that regex group, `:name*` ->
// optional trailing segments, `:name` (bare) -> one segment. This lets the test
// exercise real match behavior — a bare `:locale` compiles to `[^/]+`, which DOES
// match "api" and so fails the /api assertions (the regression), while the
// locale-scoped `:locale(en|cz|de|uk)` does not.
function compile(source: string): RegExp {
  const re = source
    .replace(/\/:[A-Za-z_]+\*/g, "/__PATHSTAR__") // /:path* -> placeholder (avoid the ':' below)
    .replace(/:[A-Za-z_]+\(([^)]+)\)/g, "($1)") // :locale(en|cz) -> (en|cz)  [no ':' in output]
    .replace(/:[A-Za-z_]+/g, "[^/]+") // remaining bare params -> one segment
    .replace(/\/__PATHSTAR__/g, "(?:/.*)?"); // placeholder -> optional /rest
  return new RegExp(`^${re}$`);
}

const API_PATHS = [
  "/api/crm/targets/00000000-0000-0000-0000-000000000000/generate-homepage",
  "/api/crm/targets/00000000-0000-0000-0000-000000000000/enrich",
  "/api/crm/target-lists/abc/anything",
];

describe("legacy crm -> campaigns redirects", () => {
  const redirects = legacyRedirects();

  it("defines the two section redirects, permanently", () => {
    expect(redirects).toHaveLength(2);
    for (const r of redirects) expect(r.permanent).toBe(true);
  });

  it("NEVER matches /api/* paths (regression: bare :locale swallowed /api and 404'd)", () => {
    for (const r of redirects) {
      const rx = compile(r.source);
      for (const p of API_PATHS) {
        expect(rx.test(p)).toBe(false);
      }
    }
  });

  it("still redirects real locale-prefixed page paths for every supported locale", () => {
    const targets = redirects.find((r) => r.source.includes("/crm/targets/"))!;
    const rx = compile(targets.source);
    for (const loc of LEGACY_REDIRECT_LOCALES) {
      expect(rx.test(`/${loc}/crm/targets/123`)).toBe(true);
      expect(rx.test(`/${loc}/crm/targets`)).toBe(true); // bare section page
    }
    // an unknown "locale" (e.g. api, or a typo) must NOT match
    expect(rx.test("/xx/crm/targets/123")).toBe(false);
  });

  it("locale set stays in sync with i18n/routing.ts (drift guard)", () => {
    // If a locale is added to routing.ts but not here, that locale's legacy
    // /crm/... URLs silently stop redirecting. Keep the two lists identical.
    expect([...LEGACY_REDIRECT_LOCALES].sort()).toEqual([...routing.locales].sort());
  });

  it("keeps the locale set in sync with the destination capture", () => {
    for (const r of redirects) {
      expect(r.destination).toContain("/:locale/campaigns/");
      expect(r.source).toContain(`:locale(${LEGACY_REDIRECT_LOCALES.join("|")})`);
    }
  });
});
