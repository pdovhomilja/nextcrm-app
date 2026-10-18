import { OxoError, isAuthError, testConnection } from "../oxo";
import { K } from "../store";
import { customer, emptyOxo, fakeOxo } from "./fake-oxo";
import { KEY, mk } from "./helpers";

it("sends the bearer key to /api/v1 and follows nextCursor across pages", async () => {
  const customers = Array.from({ length: 1203 }, (_, i) => customer(i + 1));
  const { client, oxo } = mk({ customers });
  const rows = await client.all("/customers", { updatedSince: "2026-10-01T00:00:00.000Z" });
  expect(rows).toHaveLength(1203);
  expect(oxo.calls.map((c) => [c.path, c.params.limit, c.params.cursor ?? null, c.params.updatedSince])).toEqual([
    ["/customers", "500", null, "2026-10-01T00:00:00.000Z"], ["/customers", "500", "500", "2026-10-01T00:00:00.000Z"], ["/customers", "500", "1000", "2026-10-01T00:00:00.000Z"],
  ]);
});

it("maps errors: OXO ERP's code and message, status 0 when unreachable", async () => {
  const { client, oxo } = mk({ post: () => new Response(JSON.stringify({ error: "writes_disabled", message: "Zápisy jsou vypnuté." }), { status: 503 }) });
  const e = await client.post("/orders", {}).catch((x) => x);
  expect([e instanceof OxoError, e.status, e.code, e.message]).toEqual([true, 503, "writes_disabled", "OXO ERP error 503: Zápisy jsou vypnuté."]);
  oxo.down = true;
  const d = (await client.get("/price-lists").catch((x) => x)) as OxoError;
  expect([d.status, d.code]).toEqual([0, null]);
  expect([isAuthError(new OxoError("x", 401)), isAuthError(new OxoError("x", 403)), isAuthError(new OxoError("x", 503))]).toEqual([true, true, false]);
});

it("passes the key in the Authorization header", async () => {
  const seen: Record<string, string>[] = [];
  const f = fakeOxo(emptyOxo());
  const { ctx } = mk();
  ctx.http.fetch = async (url: string, init?: RequestInit) => { seen.push(init?.headers as Record<string, string>); return f(url, init); };
  await testConnection(ctx);
  expect(seen[0].Authorization).toBe(`Bearer ${KEY}`);
});

it("test connection counts lists and lifts the send pause", async () => {
  const { ctx } = mk({ lists: [{ id: 3, odooId: 242, name: "Retail_STARTER", currency: "CZK", rules: [] }] });
  await ctx.store.set(K.sendPaused, { at: "x", reason: "y" });
  expect(await testConnection(ctx)).toBe("admin.connected");
  expect(await ctx.store.get(K.sendPaused)).toBeNull();
});
