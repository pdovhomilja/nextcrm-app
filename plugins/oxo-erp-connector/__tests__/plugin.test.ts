import plugin from "../plugin";
import en from "../messages/en.json";
import cz from "../messages/cz.json";
import de from "../messages/de.json";
import uk from "../messages/uk.json";

const keys = (o: Record<string, unknown>, p = ""): string[] => Object.entries(o).flatMap(([k, v]) => (v && typeof v === "object" ? keys(v as Record<string, unknown>, `${p}${k}.`) : [`${p}${k}`])).sort();

it("declares the OXO ERP connector", () => {
  expect([plugin.id, plugin.version, plugin.sdk]).toEqual(["oxo-erp-connector", "0.1.0", "^0.2.6"]);
  expect(plugin.permissions).toEqual(["http", "accounts:read", "accounts:write", "users:read", "notify", "products:read", "products:write", "priceLists:read", "priceLists:write", "orders:read", "orders:write"]);
  expect(Object.keys(plugin.settings.shape)).toEqual(["url", "syncMinutes", "defaultCountry", "currency", "dryRun", "priceLists", "sendOrders", "timeZone"]);
  expect(Object.keys(plugin.secrets.shape)).toEqual(["apiKey"]);
  expect(plugin.extensions.crons.map((c) => [c.id, c.schedule])).toEqual([["sync", "*/5 * * * *"]]);
  expect(plugin.extensions.afters.map((a) => [a.entity, a.operation])).toEqual([["order", "updated"]]);
  expect(plugin.extensions.adminActions.map((a) => a.id)).toEqual(["test", "sync", "lists"]);
  expect(plugin.extensions.pages.map((p) => [p.path, p.roles, p.nav?.label])).toEqual([["needs-owner", ["manager", "admin"], "needsOwner.nav"]]);
  expect([plugin.extensions.accountPanels.length, plugin.extensions.accountTabs.length, plugin.extensions.productPanels.length, plugin.extensions.orderPanels.length, plugin.extensions.adminSections.length]).toEqual([1, 1, 1, 1, 1]);
});

it("has the same message keys in every locale", () => {
  for (const m of [cz, de, uk]) expect(keys(m)).toEqual(keys(en));
});

it("never fails an install", async () => {
  const log: string[] = [];
  const ctx = { settings: { url: "https://x", dryRun: true, syncMinutes: 15, defaultCountry: "CZ", currency: "CZK", priceLists: "", sendOrders: false, timeZone: "UTC" }, secrets: { apiKey: "k" },
    http: { fetch: async () => new Response("{}", { status: 401 }) }, store: { get: async () => null, set: async () => {}, delete: async () => {}, list: async () => [] },
    data: { productCategories: { findExternal: async () => [] }, products: { findExternal: async () => [] } },
    log: { info: () => {}, warn: () => {}, debug: () => {}, error: (m: string) => log.push(m) }, notify: async () => {}, t: (k: string) => k } as never;
  await expect(plugin.onInstall!(ctx)).resolves.toBeUndefined();
  expect(log.some((m) => m.includes("Sync failed") || m.includes("Install sync failed"))).toBe(true);
});
