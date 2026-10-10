import plugin from "../plugin";

it("declares a read-only Odoo connector", () => {
  expect([plugin.id, plugin.version, plugin.sdk]).toEqual(["odoo-connector", "0.1.0", "^0.2.2"]);
  expect(plugin.permissions).toEqual(["http", "accounts:read", "accounts:write", "contacts:read", "contacts:write", "users:read", "notify"]);
  expect(Object.keys(plugin.settings.shape)).toEqual(["url", "database", "syncMinutes", "defaultCountry", "dryRun"]);
  expect(Object.keys(plugin.secrets.shape)).toEqual(["apiKey"]);
  expect(plugin.extensions.crons.map((c) => [c.id, c.schedule])).toEqual([["sync", "*/5 * * * *"]]);
  expect(plugin.extensions.adminActions.map((a) => a.id)).toEqual(["test", "sync"]);
  expect(plugin.extensions.pages.map((p) => [p.path, p.roles, p.nav?.label])).toEqual([["needs-owner", ["manager", "admin"], "needsOwner.nav"]]);
  expect(plugin.extensions.accountPanels.map((p) => p.id)).toEqual(["odoo"]);
  expect(typeof plugin.onInstall).toBe("function");
});

it("never fails an install", async () => {
  const log: string[] = [];
  const ctx = { settings: { url: "https://x", database: "d", dryRun: true, syncMinutes: 15, defaultCountry: "CZ" }, secrets: { apiKey: "k" },
    http: { fetch: async () => new Response("{}", { status: 401 }) }, store: { get: async () => null, set: async () => {}, delete: async () => {}, list: async () => [] },
    log: { info: () => {}, warn: () => {}, debug: () => {}, error: (m: string) => log.push(m) }, notify: async () => {}, t: (k: string) => k } as never;
  await expect(plugin.onInstall!(ctx)).resolves.toBeUndefined();
  expect(log.some((m) => m.includes("Sync failed") || m.includes("Install sync failed"))).toBe(true);
});
