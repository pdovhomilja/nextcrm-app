import { createTestContext } from "@nextcrm/plugin-sdk/testing";
import { jsonClient, OdooAuthError, testConnection } from "../odoo";
import { settingsSchema, type Ctx } from "../settings";
import { fakeOdoo } from "./fake-odoo";
import { K } from "../store";

const S = settingsSchema.parse({ url: "https://odoo.example.com/", database: "db1" });
const mk = (fetch: any) => createTestContext({ pluginId: "odoo-connector", settings: S, secrets: { apiKey: "k1" }, fetch }) as unknown as Ctx;
const noSleep = async () => {};

it("defaults to a dry run every 15 minutes", () => {
  expect([S.dryRun, S.syncMinutes, S.defaultCountry]).toEqual([true, 15, "CZ"]);
  expect(() => settingsSchema.parse({ url: "http://odoo.example.com", database: "x" })).toThrow();
});

it("posts JSON-2 calls with the key and database", async () => {
  const calls: any[] = [];
  const ctx = mk(fakeOdoo({ "res.partner/search_read": () => [{ id: 1 }] }, calls));
  await expect(jsonClient(ctx, noSleep).call("res.partner", "search_read", { domain: [], fields: ["id"] })).resolves.toEqual([{ id: 1 }]);
  expect(calls[0].path).toBe("/json/2/res.partner/search_read");
  expect(calls[0].headers).toMatchObject({ Authorization: "bearer k1", "X-Odoo-Database": "db1" });
  expect(calls[0].body).toEqual({ domain: [], fields: ["id"] });
});

it("retries 5xx and network errors, then succeeds", async () => {
  let n = 0;
  const ctx = mk(async () => (++n < 3 ? new Response("{}", { status: 502 }) : new Response("[]", { status: 200 })));
  await expect(jsonClient(ctx, noSleep).call("res.partner", "search_read")).resolves.toEqual([]);
  expect(n).toBe(3);
  let m = 0;
  const down = mk(async () => { m++; throw new Error("ECONNRESET"); });
  await expect(jsonClient(down, noSleep).call("res.partner", "search_read")).rejects.toThrow("Odoo unreachable");
  expect(m).toBe(3);
});

it("stops on 401/403 without retrying, and reports other 4xx with Odoo's message", async () => {
  let n = 0;
  const ctx = mk(async () => { n++; return new Response("{}", { status: 401 }); });
  await expect(jsonClient(ctx, noSleep).call("res.partner", "search_read")).rejects.toBeInstanceOf(OdooAuthError);
  expect(n).toBe(1);
  const bad = mk(async () => new Response(JSON.stringify({ message: "Invalid field 'mobile'" }), { status: 422 }));
  await expect(jsonClient(bad, noSleep).call("res.partner", "search_read")).rejects.toThrow("Invalid field 'mobile'");
});

it("tests the connection: version and user name", async () => {
  const ctx = mk(fakeOdoo({
    "res.users/context_get": () => ({ uid: 7, lang: "en_US" }),
    "res.users/read": () => [{ id: 7, name: "API user" }],
    "/web/webclient/version_info": () => ({ jsonrpc: "2.0", result: { server_version: "19.0+e" } }),
  }));
  await expect(testConnection(ctx, jsonClient(ctx, noSleep))).resolves.toBe("admin.connected");
});

describe("write-once calls", () => {
  const mkCtx = (handlers: Record<string, any>, calls: any[]) => createTestContext({
    pluginId: "odoo-connector", settings: settingsSchema.parse({ url: "https://odoo.example.com", database: "db" }), secrets: { apiKey: "k" },
    fetch: fakeOdoo(handlers, calls),
  }) as unknown as Ctx;

  it("never retries a once call after a 5xx", async () => {
    const calls: any[] = [];
    const c = jsonClient(mkCtx({ "sale.order/create": () => new Response("{}", { status: 502 }) }, calls), noSleep);
    await expect(c.call("sale.order", "create", { vals_list: [{}] }, { once: true })).rejects.toMatchObject({ status: 502 });
    expect(calls).toHaveLength(1);
  });

  it("still retries reads after a 5xx", async () => {
    const calls: any[] = [];
    const c = jsonClient(mkCtx({ "sale.order/search_read": () => new Response("{}", { status: 502 }) }, calls), noSleep);
    await expect(c.call("sale.order", "search_read", {})).rejects.toMatchObject({ status: 502 });
    expect(calls).toHaveLength(3);
  });

  it("never retries a once call after a network error", async () => {
    let n = 0;
    const ctx = createTestContext({ pluginId: "odoo-connector", settings: settingsSchema.parse({ url: "https://odoo.example.com", database: "db" }), secrets: { apiKey: "k" },
      fetch: async () => { n++; throw new Error("ECONNRESET"); } }) as unknown as Ctx;
    await expect(jsonClient(ctx, noSleep).call("res.partner", "create", {}, { once: true })).rejects.toMatchObject({ status: 0 });
    expect(n).toBe(1);
  });

  it("Test connection clears a send pause", async () => {
    const ctx = mkCtx({ "res.users/context_get": () => ({ uid: 2 }), "res.users/read": () => [{ name: "Admin" }], "/web/webclient/version_info": () => ({ result: { server_version: "19.0" } }) }, []);
    await ctx.store.set(K.sendPaused, { at: "x", reason: "403" });
    await testConnection(ctx, jsonClient(ctx, noSleep));
    expect(await ctx.store.get(K.sendPaused)).toBeNull();
  });
});
