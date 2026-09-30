// Legacy URL redirects for the fork's "crm" -> "campaigns" section rename.
//
// CRITICAL: the locale segment MUST be constrained to real locales. A bare
// `/:locale/crm/targets/:path*` matches ANY first segment — including the literal
// `api` — so it 308-redirects `/api/crm/targets/<id>/generate-homepage` (and
// enrich, target-lists, …) into `/api/campaigns/...`, which doesn't exist -> 404.
// That silently breaks every fetch() to an /api/crm/targets/* endpoint. See
// docs/reference/LESSONS_LEARNED.md.
//
// CommonJS (not TS) so next.config.js can require it at config-load time and Jest
// can unit-test it. Keep LOCALES in sync with i18n/routing.ts `locales`.
const LOCALES = ["en", "cz", "de", "uk"];
const localeGroup = `:locale(${LOCALES.join("|")})`;

function legacyRedirects() {
  return [
    {
      source: `/${localeGroup}/crm/targets/:path*`,
      destination: "/:locale/campaigns/targets/:path*",
      permanent: true,
    },
    {
      source: `/${localeGroup}/crm/target-lists/:path*`,
      destination: "/:locale/campaigns/target-lists/:path*",
      permanent: true,
    },
  ];
}

module.exports = { legacyRedirects, LEGACY_REDIRECT_LOCALES: LOCALES };
