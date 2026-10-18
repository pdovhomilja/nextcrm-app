# OXO ERP connector Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A public NextCRM plugin `oxo-erp-connector` that does with OXO ERP's `/api/v1` everything `odoo-connector` does with Odoo, and on its first run takes over `odoo-connector`'s accounts, products, categories, price lists and orders without duplicates.

**Architecture:** Same file layout and flows as `plugins/odoo-connector` (cron every 5 minutes: queued sync → order sweep → scheduled sync; an after-update hook sends READY orders). `oxo.ts` is the only file that talks HTTP. Core rows are keyed by one ref rule (`odooId ? String(odooId) : "oxo:" + id`), so rows OXO ERP mirrors from Odoo land on the rows `odoo-connector` made. Accounts are matched by IČO → DIČ → name + zip. One small generic core addition (SDK 0.2.6 `productCategories.findExternal()`) lets the plugin match categories by their full path.

**Tech Stack:** TypeScript, `@nextcrm/plugin-sdk` (workspace package `packages/plugin-sdk`), Jest 30 + ts-jest, `createTestContext` from `@nextcrm/plugin-sdk/testing`, Prisma 7 (core change only).

**Spec:** `docs/superpowers/specs/2026-10-18-oxo-erp-connector-design.md` (read § 10 Amendments: they override §§ 3–5 where they differ). OXO ERP side: plan `~/development/oxo/oxo-erp-s4b2/docs/superpowers/plans/2026-10-18-s4b2-api-additions.md` (ships first; this plugin reads its `odooId`, `odooTemplateId`, `saleOk`, `?ids=`, `?odooIds=`).

## Global Constraints

- Work in the worktree `~/development/Next.js/nextcrm-oxo-erp` on a new branch `feat/oxo-erp-connector` cut from the spec branch `docs/oxo-erp-connector-spec` (so spec and plan travel with the code). Never the stale local `main`.
- Plugin id `oxo-erp-connector`, name "OXO ERP connector", version `0.1.0`, `sdk: "^0.2.6"`. Permissions exactly: `["http", "accounts:read", "accounts:write", "users:read", "notify", "products:read", "products:write", "priceLists:read", "priceLists:write", "orders:read", "orders:write"]`.
- Settings exactly: `url` (https), `syncMinutes` (5–1440, default 15), `defaultCountry` (2 letters, default `CZ`), `currency` (3 capitals, default `CZK`), `dryRun` (default `true`), `priceLists` (text of OXO ERP list ids, default `""`), `sendOrders` (default `false`), `timeZone` (IANA, default `UTC`). Secret `apiKey` matching `^oxo_[A-Za-z0-9_-]{40}$`.
- Ref rule for every core `externalRef` the plugin writes: `odooId != null ? String(odooId) : "oxo:" + id`. New categories: `oxo-cat:<full path>`. Template-expanded rules: `<rule ref>:<product ref>`.
- OXO ERP wins on the fields it sends; an empty value never clears a CRM value (accounts and products alike; tax rate, cost and description are never sent and are kept).
- `dryRun` on: no CRM write, no store write except `meta:lastRun`, `meta:report`, `meta:failures`, `meta:lock` (deleted at the end), `job:sync` (deleted), `meta:oxoLists`; no POST to OXO ERP. Cursors move only after a successful non-dry run.
- Order lines go out as `productId`, `quantity`, `unitPrice` only: the CRM line's unit price is what is charged, no `discount` field (as `odoo-connector`; spec § 4.5 listed `discount`, ruled out here because the CRM line has no separate discount).
- No write to OXO ERP except `POST /api/v1/orders`. HTTP only through `ctx.http.fetch` with `timeoutMs: 30_000`.
- Messages in 4 locales (`en`, `cz`, `de`, `uk`) with identical keys; `messages/*.json` are plugin-local files written whole in Task 10.
- `lib/plugins/plugins.generated.ts` is regenerated with `pnpm plugins:generate --public-only` (never with private plugins) and committed.
- Never commit `.env`, `.superpowers/`, or a rewritten `tsconfig.json` / `AGENTS.md` (restore with `git checkout tsconfig.json AGENTS.md` after `next dev` or e2e). No `prisma format`. No `git add -A`.
- Tests: `pnpm jest plugins/oxo-erp-connector` for the plugin, `pnpm jest lib/plugins packages/plugin-sdk` for the core change; long output to `.superpowers/` and read the tail.
- Commit trailer on every commit:
  ```
  Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_019AXXZ8279bRB86Cn1ZRWFS
  ```

## Review Focus

1. Takeover dry run on a CRM full of `odoo-connector` rows → zero CRM writes, and the report says "updated", never "created", for products and lists whose Odoo id OXO ERP returns (pinned in Task 5 "takeover dry run then real run").
2. A product taken over from Odoo has a VAT rate and cost in the CRM that OXO ERP does not send → both survive the takeover (pinned in Task 4 "keeps tax, cost and description").
3. The POST to OXO ERP times out after OXO ERP stored the order → the next sweep sends the same body and gets 200; the CRM ends with one SENT order and OXO ERP with one order (pinned in Task 6 "timeout then repeat").
4. An OXO ERP order whose customer is not linked yet (conflict, or customer sync not run) → it waits and is imported once the customer is linked, even though OXO ERP never changes it again (pinned in Task 8 "pending order").
5. A CRM order sent to Odoo before the switch (source CRM, `externalRef` = Odoo sale id) → tracked by `?odooIds=` and never imported a second time as an EXTERNAL order (pinned in Task 7 "pre-switch order" and Task 8 "skips CRM orders").

---

### Task 1: SDK 0.2.6 — `productCategories.findExternal()`

**Files:**
- Modify: `packages/plugin-sdk/src/types.ts:110` (ProductCategoriesApi)
- Modify: `packages/plugin-sdk/src/testing.ts` (externalCategories)
- Modify: `packages/plugin-sdk/src/version.ts:1`
- Modify: `lib/catalog/plugin-writes.ts` (new `findExternalCategories`)
- Modify: `lib/plugins/data-api.ts:137-143` (productCategories)
- Test: `lib/plugins/__tests__/data-api-catalog.test.ts`, `packages/plugin-sdk/__tests__/testing.test.ts`, and the five SDK-version assertions listed in Step 5

**Interfaces:**
- Produces: `ExternalCategory { id: string; ref: string; name: string; parentRef: string | null }`; `ctx.data.productCategories.findExternal(): Promise<ExternalCategory[]>` (needs `products:read`); `SDK_VERSION = "0.2.6"`.

- [ ] **Step 1: Write the failing tests**

In `lib/plugins/__tests__/data-api-catalog.test.ts`, add `findExternalCategories` to the mocked writes:
```ts
  findExternalCategories: jest.fn().mockResolvedValue([{ id: "c1", ref: "7", name: "Tea", parentRef: null }]),
```
replace the version test:
```ts
it("is SDK 0.2.6 (additive)", () => expect(SDK_VERSION).toBe("0.2.6"));
```
and add:
```ts
it("lists external categories with products:read", async () => {
  await expect(createDataApi("demo", []).productCategories.findExternal()).rejects.toThrow("products:read");
  expect(await createDataApi("demo", ["products:read"]).productCategories.findExternal()).toEqual([{ id: "c1", ref: "7", name: "Tea", parentRef: null }]);
});
```
In `packages/plugin-sdk/__tests__/testing.test.ts`, add:
```ts
it("lists external categories with their parent's ref", async () => {
  const ctx = createTestContext({ data: { productCategories: [] } });
  await ctx.data.productCategories.upsertExternal("1", { name: "Zásoby", parentRef: null });
  await ctx.data.productCategories.upsertExternal("2", { name: "Výrobky", parentRef: "1" });
  expect((await ctx.data.productCategories.findExternal()).map((c) => [c.ref, c.name, c.parentRef])).toEqual([["1", "Zásoby", null], ["2", "Výrobky", "1"]]);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm jest lib/plugins/__tests__/data-api-catalog.test.ts packages/plugin-sdk/__tests__/testing.test.ts`
Expected: FAIL (`findExternal is not a function`; version is `0.2.5`).

- [ ] **Step 3: Implement**

`packages/plugin-sdk/src/types.ts`, replace the `ProductCategoriesApi` line:
```ts
export interface ExternalCategory { id: string; ref: string; name: string; parentRef: string | null }
export interface ProductCategoriesApi {
  upsertExternal(ref: string, fields: { name: string; parentRef: string | null }): Promise<{ id: string }>;
  /** SDK 0.2.6: every EXTERNAL category; `parentRef` is the parent's ref, null when there is none or it is not external. */
  findExternal(): Promise<ExternalCategory[]>;
}
```
`packages/plugin-sdk/src/testing.ts`, inside `externalCategories` add after `upsertExternal`:
```ts
    async findExternal() {
      return rows.filter((r) => r.source === "EXTERNAL")
        .map((r) => ({ id: r.id as string, ref: r.externalRef as string, name: r.name as string, parentRef: (r.parentRef as string | null | undefined) ?? null }));
    },
```
`packages/plugin-sdk/src/version.ts` line 1:
```ts
export const SDK_VERSION = "0.2.6";
```
`lib/catalog/plugin-writes.ts`, after `findExternalProducts`:
```ts
export async function findExternalCategories() {
  const rows = await prismadb.crm_ProductCategories.findMany({
    where: { source: "EXTERNAL" },
    select: { id: true, externalRef: true, name: true, parent: { select: { source: true, externalRef: true } } },
  });
  return rows.map((r) => ({ id: r.id, ref: r.externalRef as string, name: r.name, parentRef: r.parent?.source === "EXTERNAL" ? (r.parent.externalRef as string) : null }));
}
```
`lib/plugins/data-api.ts`, `productCategories` becomes:
```ts
    productCategories: {
      async upsertExternal(ref, fields) {
        need("products:write");
        const { upsertExternalCategory } = await import("@/lib/catalog/plugin-writes");
        return runAsActor({ type: "plugin", pluginId }, () => upsertExternalCategory(pluginId, ref, fields));
      },
      async findExternal() {
        need("products:read");
        const { findExternalCategories } = await import("@/lib/catalog/plugin-writes");
        return findExternalCategories();
      },
    },
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm jest lib/plugins/__tests__/data-api-catalog.test.ts packages/plugin-sdk/__tests__/testing.test.ts`
Expected: PASS.

- [ ] **Step 5: Update the other SDK-version assertions**

These assert the old version; change each `0.2.5` to `0.2.6` (text and value):
- `lib/plugins/__tests__/data-api-orders.test.ts:87`
- `lib/plugins/__tests__/data-api-activities.test.ts:31` (title becomes "bumps the SDK to 0.2.6")
- `lib/plugins/__tests__/store-claim.test.ts:11`
- `lib/plugins/__tests__/lifecycle.test.ts:54` (`running 0.2.6`)
- `packages/plugin-sdk/__tests__/version.test.ts:14`

`plugins/odoo-connector` keeps `sdk: "^0.2.5"` (0.2.6 satisfies it).

Run: `pnpm jest lib/plugins packages/plugin-sdk plugins > .superpowers/oxo-t1.log 2>&1; tail -6 .superpowers/oxo-t1.log`
Expected: all suites pass.

- [ ] **Step 6: Commit**

```bash
git add packages/plugin-sdk/src/types.ts packages/plugin-sdk/src/testing.ts packages/plugin-sdk/src/version.ts lib/catalog/plugin-writes.ts lib/plugins/data-api.ts lib/plugins/__tests__/data-api-catalog.test.ts lib/plugins/__tests__/data-api-orders.test.ts lib/plugins/__tests__/data-api-activities.test.ts lib/plugins/__tests__/store-claim.test.ts lib/plugins/__tests__/lifecycle.test.ts packages/plugin-sdk/__tests__/version.test.ts packages/plugin-sdk/__tests__/testing.test.ts
git commit -m "feat(plugins): SDK 0.2.6 productCategories.findExternal

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_019AXXZ8279bRB86Cn1ZRWFS"
```

### Task 2: Plugin base — settings, store keys, OXO ERP client, mapping helpers, test fakes

**Files:**
- Create: `plugins/oxo-erp-connector/settings.ts`, `store.ts`, `oxo.ts`, `map.ts`
- Create: `plugins/oxo-erp-connector/__tests__/fake-oxo.ts`, `__tests__/helpers.ts`
- Test: `plugins/oxo-erp-connector/__tests__/oxo.test.ts`, `__tests__/map.test.ts`

**Interfaces:**
- Produces (later tasks import these exact names):
  - `settings.ts`: `settingsSchema`, `secretsSchema`, `Settings`, `Secrets`, `Ctx`, `chosenLists(ctx): number[]`, `localTime(ctx, iso): string`, `tell(ctx, input): Promise<void>`, `msg(e: unknown): string`
  - `store.ts`: `K`, `AccountLink`, `Conflict`, `ProductLink`, `PriceListLink`, `OrderLink`, `SendState`, `FailedState`, `CustomerCounts`, `CatalogCounts`, `OrderCounts`, `ReportRow`, `RunSummary`
  - `oxo.ts`: `OxoAddress`, `OxoCustomer`, `OxoProduct`, `OxoRule`, `OxoPriceList`, `OxoOrderLine`, `OxoOrder`, `OxoError(message, status, code)`, `OxoClient { get, all, post }`, `oxoClient(ctx)`, `testConnection(ctx, client?)`, `isAuthError(e): boolean`
  - `map.ts`: `ref(row)`, `countryCode(name)`, `countryName(code)`, `accountFields(c)`, `AccountFields`, `changedFields(current, next)`, `sameAddress(a, b)`
  - tests: `fakeOxo(state)`, `FakeOxo`, `emptyOxo()`, `customer(id, over)`, `product(id, over)`, `order(id, over)`, `mk(oxo?, data?, settings?)`, `TestCtx`, `now`, `KEY`

- [ ] **Step 1: Write the test fakes**

`plugins/oxo-erp-connector/__tests__/fake-oxo.ts`:
```ts
import type { OxoCustomer, OxoOrder, OxoPriceList, OxoProduct } from "../oxo";

export interface FakeOxo {
  customers: OxoCustomer[];
  products: OxoProduct[];
  lists: OxoPriceList[];
  orders: OxoOrder[];
  calls: { method: string; path: string; params: Record<string, string>; body?: any }[];
  /** Answers POST /orders; default 201 with an empty body. Return a Response for an error answer. */
  post?: (body: any) => Response | { status: number; body: unknown };
  /** Every request fails at the network level. */
  down?: boolean;
}
export const emptyOxo = (): FakeOxo => ({ customers: [], products: [], lists: [], orders: [], calls: [] });

/** A fetch for createTestContext that answers OXO ERP /api/v1 like the real one: paged (updatedAt, id), updatedSince >=, lookups by ids/odooIds. */
export function fakeOxo(s: FakeOxo) {
  return async (url: string, init?: RequestInit) => {
    if (s.down) throw new Error("connect ECONNREFUSED");
    const u = new URL(url);
    const path = u.pathname.replace(/^\/api\/v1/, "");
    const params = Object.fromEntries(u.searchParams);
    const method = init?.method ?? "GET";
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    s.calls.push({ method, path, params, body });
    const json = (status: number, b: unknown) => new Response(JSON.stringify(b), { status });
    const paged = <T extends { id: number; updatedAt: string }>(rows: T[]) => {
      const since = params.updatedSince;
      const sorted = rows.filter((r) => !since || r.updatedAt >= since).sort((a, b) => a.updatedAt.localeCompare(b.updatedAt) || a.id - b.id);
      const limit = Number(params.limit ?? 200);
      const start = params.cursor ? Number(params.cursor) : 0;
      return json(200, { items: sorted.slice(start, start + limit), nextCursor: start + limit < sorted.length ? String(start + limit) : null });
    };
    const ids = (v: string) => v.split(",").map(Number);
    if (method === "POST" && path === "/orders") {
      const r = s.post ? s.post(body) : { status: 201, body: {} };
      return r instanceof Response ? r : json(r.status, r.body);
    }
    if (path === "/customers") return paged(s.customers);
    if (path === "/products") return paged(s.products);
    if (path === "/price-lists") return json(200, { items: s.lists });
    if (path === "/orders") {
      if (params.ids) return json(200, { items: s.orders.filter((o) => ids(params.ids).includes(o.id)), nextCursor: null });
      if (params.odooIds) return json(200, { items: s.orders.filter((o) => o.odooId != null && ids(params.odooIds).includes(o.odooId)), nextCursor: null });
      return paged(s.orders.filter((o) => o.state === "sale"));
    }
    return json(404, { error: "not_found", message: `no route ${path}` });
  };
}

const T = "2026-10-18T08:00:00.000Z";
export const customer = (id: number, over: Partial<OxoCustomer> = {}): OxoCustomer => ({
  id, odooId: null, name: `Co ${id}`, ico: null, dic: null, street: null, city: null, zip: null, country: "Czech Republic",
  email: null, phone: null, priceListId: null, active: true, updatedAt: T, addresses: [], ...over,
});
export const product = (id: number, over: Partial<OxoProduct> = {}): OxoProduct => ({
  id, odooId: null, odooTemplateId: null, code: `P${id}`, name: `Product ${id}`, barcode: null, category: "Zásoby / Výrobky", unit: "ks",
  kind: "STORABLE", listPrice: "100", saleOk: true, active: true, updatedAt: T, ...over,
});
export const order = (id: number, over: Partial<OxoOrder> = {}): OxoOrder => ({
  id, odooId: null, number: `PRO${id}`, crmNumber: null, state: "sale", customerId: 1, deliveryAddressId: null, priceListId: null, currency: "CZK",
  orderedAt: "2026-10-17T10:00:00.000Z", requestedDate: null, note: null, salesRep: null, amountUntaxed: "600", updatedAt: T,
  delivery: "none", lines: [], deliveries: [], ...over,
});
```
`plugins/oxo-erp-connector/__tests__/helpers.ts`:
```ts
import type { RecordData } from "@nextcrm/plugin-sdk";
import { createTestContext } from "@nextcrm/plugin-sdk/testing";
import { oxoClient } from "../oxo";
import { settingsSchema, type Ctx } from "../settings";
import { emptyOxo, fakeOxo, type FakeOxo } from "./fake-oxo";

export type TestCtx = Ctx & { notifications: { roles?: string[]; subject: string; text: string }[]; logs: { level: string; message: string }[] };
export const now = new Date("2026-10-18T09:00:00Z");
export const KEY = `oxo_${"a".repeat(40)}`;

type Tables = "accounts" | "users" | "products" | "productCategories" | "priceLists" | "priceListRules" | "orders";

/** A context whose fetch is a fake OXO ERP; returns the live fake state and the in-memory CRM tables. */
export function mk(oxo: Partial<FakeOxo> = {}, data: Partial<Record<Tables, RecordData[]>> = {}, settings: Record<string, unknown> = {}) {
  const s: FakeOxo = { ...emptyOxo(), ...oxo };
  const d: Record<Tables, RecordData[]> = { accounts: [], users: [], products: [], productCategories: [], priceLists: [], priceListRules: [], orders: [], ...data };
  const ctx = createTestContext({
    pluginId: "oxo-erp-connector",
    settings: settingsSchema.parse({ url: "https://erp.example.com", dryRun: false, ...settings }),
    secrets: { apiKey: KEY }, fetch: fakeOxo(s), data: d,
  }) as unknown as TestCtx;
  return { ctx, client: oxoClient(ctx), oxo: s, data: d };
}
```

- [ ] **Step 2: Write the failing tests**

`plugins/oxo-erp-connector/__tests__/oxo.test.ts`:
```ts
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
```
`plugins/oxo-erp-connector/__tests__/map.test.ts`:
```ts
import { accountFields, changedFields, countryCode, countryName, ref, sameAddress } from "../map";
import { customer } from "./fake-oxo";

it("keeps the Odoo id as ref for mirrored rows, oxo:<id> for native ones", () => {
  expect([ref({ id: 222, odooId: 154 }), ref({ id: 9, odooId: null })]).toEqual(["154", "oxo:9"]);
});

it("turns Odoo's English country names into ISO codes and back", () => {
  expect([countryCode("Czech Republic"), countryCode("Czechia"), countryCode("slovakia"), countryCode("Atlantis"), countryCode(null)]).toEqual(["CZ", "CZ", "SK", null, null]);
  expect(countryName("CZ")).toBe("Czechia");
});

it("maps a customer to account fields; unknown country stays null", () => {
  const f = accountFields(customer(1, { name: " Puffbox s.r.o. ", ico: "19737955", dic: "CZ19737955", street: "Ulice 1", city: "Praha", zip: "110 00", phone: "777", country: "Atlantis" }));
  expect(f).toEqual({ name: "Puffbox s.r.o.", company_id: "19737955", vat: "CZ19737955", billing_street: "Ulice 1", billing_city: "Praha", billing_postal_code: "110 00", billing_country: null, email: null, office_phone: "777" });
});

it("an empty value never clears a CRM value", () => {
  expect(changedFields({ name: "A", email: "a@x.cz", vat: null }, { name: "B", email: null, vat: "CZ1" })).toEqual({ name: "B", vat: "CZ1" });
});

it("compares addresses ignoring case, extra spaces and spaces in the zip", () => {
  expect(sameAddress({ street: "Dlouhá  1", city: "praha", zip: "110 00" }, { street: "dlouhá 1", city: "Praha", zip: "11000" })).toBe(true);
  expect(sameAddress({ street: "Dlouhá 1", city: "Praha", zip: "11000" }, { street: "Dlouhá 2", city: "Praha", zip: "11000" })).toBe(false);
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `pnpm jest plugins/oxo-erp-connector`
Expected: FAIL — cannot find module `../oxo`, `../map`, `../settings`.

- [ ] **Step 4: Implement**

`plugins/oxo-erp-connector/settings.ts`:
```ts
import { z, type PluginContext } from "@nextcrm/plugin-sdk";

function validZone(tz: string): boolean {
  try { new Intl.DateTimeFormat("en", { timeZone: tz }); return true; } catch { return false; }
}

export const settingsSchema = z.object({
  url: z.string().regex(/^https:\/\/[^\s/]+/, "An https URL, e.g. https://erp.example.com"),
  syncMinutes: z.number().int().min(5).max(1440).default(15),
  defaultCountry: z.string().length(2).default("CZ"),
  currency: z.string().regex(/^[A-Z]{3}$/, "A currency code, e.g. CZK").default("CZK"),
  dryRun: z.boolean().default(true),
  priceLists: z.string().default(""),
  sendOrders: z.boolean().default(false),
  timeZone: z.string().refine(validZone, "An IANA time zone, e.g. Europe/Prague").default("UTC"),
});
export const secretsSchema = z.object({ apiKey: z.string().regex(/^oxo_[A-Za-z0-9_-]{40}$/, "An OXO ERP API key: oxo_ followed by 40 characters") });

export type Settings = z.infer<typeof settingsSchema>;
export type Secrets = z.infer<typeof secretsSchema>;
export type Ctx = PluginContext<Settings, Secrets>;

/** The chosen OXO ERP price lists as a text setting ("3, 7"). */
export const chosenLists = (ctx: Ctx): number[] =>
  Array.from(new Set(ctx.settings.priceLists.split(/[\s,;]+/).filter(Boolean).map(Number).filter((n) => Number.isInteger(n) && n > 0)));

/** A stored ISO time as "2026-10-18 11:30 (Europe/Prague)", in the instance's time zone. */
export function localTime(ctx: Ctx, iso: string): string {
  const tz = ctx.settings.timeZone;
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
    .formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute} (${tz})`;
}

export const msg = (e: unknown) => (e instanceof Error ? e.message : String(e));

/** Admin emails never fail the run that sends them. */
export async function tell(ctx: Ctx, input: Parameters<Ctx["notify"]>[0]): Promise<void> {
  try { await ctx.notify(input); } catch (e) { ctx.log.warn(`Email "${input.subject}" not sent: ${msg(e)}`); }
}
```
`plugins/oxo-erp-connector/store.ts`:
```ts
import type { OxoAddress, OxoCustomer, OxoOrder } from "./oxo";

export const K = {
  customer: (id: number) => `customer:${id}`,              // → { accountId }
  account: (id: string) => `account:${id}`,                 // → AccountLink
  conflict: (id: number) => `conflict:${id}`,               // → Conflict (holds the customer; re-tried every run)
  retry: (id: number) => `retry:${id}`,                     // → { customer } a customer whose last write failed
  product: (crmId: string) => `product:${crmId}`,           // → ProductLink
  retryProduct: (id: number) => `retryProduct:${id}`,       // → { product } a product whose last write failed
  pricelist: (id: number) => `pricelist:${id}`,             // → PriceListLink, keyed by the OXO ERP list id
  skipped: (id: number) => `skipped:${id}`,                 // → { ruleId, reason }[]
  order: (crmId: string) => `order:${crmId}`,               // → OrderLink
  pending: (id: number) => `pending:${id}`,                 // → { order } an OXO ERP order whose customer is not linked yet
  send: (crmId: string) => `send:${crmId}`,                 // → SendState while READY and waiting for OXO ERP
  failed: (crmId: string) => `failed:${crmId}`,             // → FailedState while SYNC_FAILED
  sending: (crmId: string) => `sending:${crmId}`,           // → claim, one sender per order
  cursor: (kind: "customers" | "products" | "orders") => `meta:cursor:${kind}`, // → { at: ISO updatedAt }
  lock: "meta:lock",                                        // → { until: ISO }
  lastRun: "meta:lastRun",                                  // → RunSummary
  report: "meta:report",                                    // → RunSummary of the last dry run
  failures: "meta:failures",                                // → { count }
  sendPaused: "meta:sendPaused",                            // → { at, reason }
  job: "job:sync",                                          // → { requestedAt }
  oxoLists: "meta:oxoLists",                                // → { at, lists } for the admin section
};

export interface AccountLink { customerId: number; syncedAt: string; priceListId: number | null; addresses: OxoAddress[]; inactive?: boolean }
export type MatchReason = "number" | "vat" | "name" | "linked";
export interface Conflict { customerId: number; name: string; reason: MatchReason; candidates: string[]; foundAt: string; customer: OxoCustomer }
export interface ProductLink { oxoId: number; ref: string; templateId: number | null; categoryRef: string | null }
export interface PriceListLink { priceListId: string; ref: string; name: string; currency: string; hash: string; syncedAt: string; isActive: boolean }
export interface OrderLink {
  oxoId: number; number: string; state: string; delivery: OxoOrder["delivery"]; deliveries: OxoOrder["deliveries"];
  belowList: string[];   // lines OXO ERP priced below list (SKU or name)
  sentAt: string; checkedAt: string;
  imported?: boolean; updatedAt?: string; missing?: number; missingNotified?: boolean;
}
export interface SendState { lastError: string; waitingSince: string; stuckNotified?: boolean }
export interface FailedState { reason: string; at: string }

export interface CustomerCounts { linked: number; number: number; vat: number; name: number; created: number; updated: number; conflicts: number; skipped: number; failed: number }
export interface CatalogCounts {
  categoriesMatched: number; categoriesCreated: number; productsUpdated: number; productsCreated: number; productsFailed: number;
  listsReplaced: number; listsMissing: number[]; accountLists: number;
}
export interface OrderCounts { checked: number; moved: number; imported: number; updated: number; pending: number }
export interface ReportRow { customerId: number; name: string; accountId?: string; reason?: MatchReason; candidates?: string[] }
export interface RunSummary {
  at: string; ok: boolean; dryRun: boolean; error?: string;
  customers: CustomerCounts; catalog?: CatalogCounts; orders?: OrderCounts;
  rows: { name: ReportRow[]; created: ReportRow[]; conflicts: ReportRow[] };   // at most 200 each
}
```
`plugins/oxo-erp-connector/oxo.ts`:
```ts
import type { Ctx } from "./settings";
import { K } from "./store";

export interface OxoAddress { id: number; odooId: number | null; name: string; street: string | null; city: string | null; zip: string | null; country: string | null; active: boolean }
export interface OxoCustomer {
  id: number; odooId: number | null; name: string; ico: string | null; dic: string | null; street: string | null; city: string | null; zip: string | null;
  country: string | null; email: string | null; phone: string | null; priceListId: number | null; active: boolean; updatedAt: string; addresses: OxoAddress[];
}
export interface OxoProduct {
  id: number; odooId: number | null; odooTemplateId: number | null; code: string | null; name: string; barcode: string | null; category: string | null;
  unit: string | null; kind: "STORABLE" | "CONSUMABLE" | "SERVICE" | "COMBO"; listPrice: string | null; saleOk: boolean; active: boolean; updatedAt: string;
}
export interface OxoRule {
  id: number; odooId: number | null; appliesTo: "PRODUCT" | "CATEGORY" | "ALL"; productId: number | null; productTemplateOdooId: number | null;
  categoryName: string | null; minQty: string; kind: "FIXED" | "PERCENT"; fixedPrice: string | null; percent: string | null;
  base: "LIST_PRICE" | "PRICE_LIST"; basePriceListId: number | null;
}
export interface OxoPriceList { id: number; odooId: number | null; name: string; currency: string; rules: OxoRule[] }
export interface OxoOrderLine { id: number; productId: number; quantity: string; deliveredQty: string; unitPrice: string; discount: string; listPrice: string | null; belowList: boolean }
export interface OxoOrder {
  id: number; odooId: number | null; number: string; crmNumber: string | null; state: string; customerId: number; deliveryAddressId: number | null;
  priceListId: number | null; currency: string; orderedAt: string; requestedDate: string | null; note: string | null; salesRep: string | null;
  amountUntaxed: string; updatedAt: string; delivery: "none" | "partial" | "full"; lines: OxoOrderLine[];
  deliveries: { number: string; state: string; doneAt: string | null }[];
}

/** status 0 = no answer (network error, timeout); `code` is OXO ERP's error code ("invalid", "conflict", "writes_disabled", …). */
export class OxoError extends Error {
  constructor(message: string, public readonly status: number, public readonly code: string | null = null) { super(message); this.name = "OxoError"; }
}
export const isAuthError = (e: unknown) => e instanceof OxoError && (e.status === 401 || e.status === 403);

export interface OxoClient {
  get<T>(path: string, params?: Record<string, string>): Promise<T>;
  /** Every page of a paged list, following nextCursor. */
  all<T>(path: string, params?: Record<string, string>): Promise<T[]>;
  /** A write: never retried here. OXO ERP answers a repeated order with 200, so the caller may send it again later. */
  post<T>(path: string, body: unknown): Promise<{ status: number; body: T }>;
}

export function oxoClient(ctx: Ctx): OxoClient {
  const base = ctx.settings.url.replace(/\/+$/, "");
  const headers = { Authorization: `Bearer ${ctx.secrets.apiKey}`, "Content-Type": "application/json" };
  async function call(method: "GET" | "POST", path: string, params: Record<string, string> = {}, body?: unknown): Promise<{ status: number; body: unknown }> {
    const qs = new URLSearchParams(params).toString();
    let res: Response;
    try {
      res = await ctx.http.fetch(`${base}/api/v1${path}${qs ? `?${qs}` : ""}`, { method, headers, ...(body === undefined ? {} : { body: JSON.stringify(body) }), timeoutMs: 30_000 });
    } catch (e) {
      throw new OxoError(`OXO ERP unreachable: ${e instanceof Error ? e.message : String(e)}`, 0);
    }
    const data = (await res.json().catch(() => null)) as { error?: string; message?: string } | null;
    if (!res.ok) throw new OxoError(`OXO ERP error ${res.status}: ${data?.message ?? res.statusText}`, res.status, data?.error ?? null);
    return { status: res.status, body: data };
  }
  async function get<T>(path: string, params: Record<string, string> = {}): Promise<T> {
    return (await call("GET", path, params)).body as T;
  }
  async function all<T>(path: string, params: Record<string, string> = {}): Promise<T[]> {
    const out: T[] = [];
    let cursor: string | null = null;
    do {
      const page: { items: T[]; nextCursor: string | null } = await get(path, { ...params, limit: "500", ...(cursor ? { cursor } : {}) });
      out.push(...page.items);
      cursor = page.nextCursor;
    } while (cursor);
    return out;
  }
  async function post<T>(path: string, body: unknown): Promise<{ status: number; body: T }> {
    const r = await call("POST", path, {}, body);
    return { status: r.status, body: r.body as T };
  }
  return { get, all, post };
}

/** Admin action: a working key lists the price lists; it also lifts the send pause (spec § 4.5). */
export async function testConnection(ctx: Ctx, client: OxoClient = oxoClient(ctx)): Promise<string> {
  const { items } = await client.get<{ items: OxoPriceList[] }>("/price-lists");
  await ctx.store.delete(K.sendPaused);
  return ctx.t("admin.connected", { lists: items.length });
}
```
`plugins/oxo-erp-connector/map.ts`:
```ts
import type { OxoCustomer } from "./oxo";

/** Spec § 3.2: a row OXO ERP mirrors from Odoo keeps the Odoo id, so it lands on the row odoo-connector made. */
export const ref = (row: { id: number; odooId: number | null }) => (row.odooId != null ? String(row.odooId) : `oxo:${row.id}`);

const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);

// Odoo's names that Intl does not use.
const ALIASES: Record<string, string> = { "czech republic": "CZ", "slovak republic": "SK", "russian federation": "RU", "united states of america": "US", "korea, republic of": "KR" };
let byName: Map<string, string> | null = null;

/** OXO ERP sends Odoo's English country name; the CRM keeps ISO codes. Unknown names give null. */
export function countryCode(name: string | null): string | null {
  if (!name) return null;
  if (!byName) {
    const dn = new Intl.DisplayNames(["en"], { type: "region" });
    byName = new Map(Object.entries(ALIASES));
    for (let a = 65; a <= 90; a++) for (let b = 65; b <= 90; b++) {
      const code = String.fromCharCode(a, b);
      const n = dn.of(code);
      if (n && n !== code) byName.set(n.toLowerCase(), code);
    }
  }
  return byName.get(name.trim().toLowerCase()) ?? null;
}
export const countryName = (code: string | null) => (code ? new Intl.DisplayNames(["en"], { type: "region" }).of(code.toUpperCase()) ?? null : null);

/** Spec § 4.1: the account fields OXO ERP controls. billing_country is null when OXO ERP has none or an unknown name. */
export function accountFields(c: OxoCustomer) {
  return {
    name: str(c.name) ?? `OXO ERP #${c.id}`,
    company_id: str(c.ico),
    vat: str(c.dic),
    billing_street: str(c.street),
    billing_city: str(c.city),
    billing_postal_code: str(c.zip),
    billing_country: countryCode(c.country),
    email: str(c.email),
    office_phone: str(c.phone),
  };
}
export type AccountFields = ReturnType<typeof accountFields>;

/** Only the keys whose value differs; an empty OXO ERP value never clears a filled CRM value. */
export function changedFields<T extends Record<string, unknown>>(current: Record<string, unknown>, next: T): Partial<T> {
  return Object.fromEntries(Object.entries(next).filter(([k, v]) => v != null && (current[k] ?? null) !== v)) as Partial<T>;
}

const norm = (v: unknown) => String(v ?? "").trim().toLowerCase().replace(/\s+/g, " ");
const zipNorm = (v: unknown) => String(v ?? "").replace(/\s+/g, "");
type Place = { street: unknown; city: unknown; zip: unknown };
export const sameAddress = (a: Place, b: Place) => norm(a.street) === norm(b.street) && norm(a.city) === norm(b.city) && zipNorm(a.zip) === zipNorm(b.zip);
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm jest plugins/oxo-erp-connector`
Expected: PASS, 9 tests. (If `countryName("CZ")` returns "Czech Republic" on this Node's ICU, change only the test's expected value to what `new Intl.DisplayNames(["en"], { type: "region" }).of("CZ")` prints; ledger it.)

- [ ] **Step 6: Commit**

```bash
git add plugins/oxo-erp-connector
git commit -m "feat(oxo-erp-connector): settings, store keys, OXO ERP client, mapping helpers

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_019AXXZ8279bRB86Cn1ZRWFS"
```

### Task 3: Customers — matching and account sync

**Files:**
- Create: `plugins/oxo-erp-connector/match.ts`, `plugins/oxo-erp-connector/customers.ts`
- Test: `plugins/oxo-erp-connector/__tests__/customers.test.ts`

**Interfaces:**
- Consumes: Task 2 `accountFields`, `changedFields`, `K`, `AccountLink`, `Conflict`, `CustomerCounts`, `ReportRow`, `OxoClient`, `OxoCustomer`, `msg`.
- Produces:
  - `match.ts`: `normalizeNumber(country, raw)`, `normalizeVat(raw)`, `Match`, `matchAccount(ctx, customerId, fields, claimed: Map<string, number>): Promise<Match>`
  - `customers.ts`: `zeroCustomers(): CustomerCounts`, `emptyRows(): RunSummary["rows"]`, `CustomerRun { ctx; dry; now; counts; rows; claimed }`, `syncCustomers(r: CustomerRun, client: OxoClient): Promise<string | null>` (returns the newest `updatedAt` seen)

- [ ] **Step 1: Write the failing tests**

`plugins/oxo-erp-connector/__tests__/customers.test.ts`:
```ts
import { emptyRows, syncCustomers, zeroCustomers, type CustomerRun } from "../customers";
import { K } from "../store";
import { customer } from "./fake-oxo";
import { mk, now, type TestCtx } from "./helpers";

const run = (ctx: TestCtx, dry = false): CustomerRun => ({ ctx, dry, now, counts: zeroCustomers(), rows: emptyRows(), claimed: new Map() });
const acc = (id: string, over: Record<string, unknown> = {}) => ({ id, name: `Acc ${id}`, company_id: null, vat: null, billing_postal_code: null, assigned_to: "u-rep", deletedAt: null, ...over });

describe("customers", () => {
  it("takes over accounts by IČO (CZ padded), then DIČ, then name + zip; keeps their owner", async () => {
    const { ctx, client, data } = mk({ customers: [
      customer(1, { ico: "1234567", name: "One" }),
      customer(2, { dic: "CZ 99", name: "Two" }),
      customer(3, { name: "Kavárna u Mostu", zip: "110 00" }),
    ] }, { accounts: [acc("a1", { company_id: "01234567" }), acc("a2", { vat: "cz99" }), acc("a3", { name: "kavárna u mostu", billing_postal_code: "11000" })] });
    const r = run(ctx);
    await syncCustomers(r, client);
    expect([r.counts.number, r.counts.vat, r.counts.name, r.counts.created]).toEqual([1, 1, 1, 0]);
    expect([await ctx.store.get(K.customer(1)), await ctx.store.get(K.customer(2)), await ctx.store.get(K.customer(3))]).toEqual([{ accountId: "a1" }, { accountId: "a2" }, { accountId: "a3" }]);
    expect(r.rows.name).toEqual([{ customerId: 3, name: "Kavárna u Mostu", accountId: "a3" }]);
    expect(data.accounts.map((a) => a.assigned_to)).toEqual(["u-rep", "u-rep", "u-rep"]);
    expect(data.accounts[0].name).toBe("One");
  });

  it("creates an account without an owner when nothing matches, country from the name or the default", async () => {
    const { ctx, client, data } = mk({ customers: [customer(5, { name: "New Bar", country: null, priceListId: 3, addresses: [
      { id: 50, odooId: null, name: "Sklad", street: "Dlouhá 1", city: "Praha", zip: "11000", country: null, active: true },
      { id: 51, odooId: null, name: "Old", street: null, city: null, zip: null, country: null, active: false },
    ] })] });
    const r = run(ctx);
    await syncCustomers(r, client);
    expect(data.accounts).toEqual([expect.objectContaining({ name: "New Bar", billing_country: "CZ", assigned_to: null, status: "Active" })]);
    expect(r.rows.created).toEqual([{ customerId: 5, name: "New Bar" }]);
    const link = await ctx.store.get<{ customerId: number; priceListId: number; addresses: { id: number }[] }>(K.account(data.accounts[0].id as string));
    expect([link?.customerId, link?.priceListId, link?.addresses.map((a) => a.id)]).toEqual([5, 3, [50]]);
  });

  it("two matching accounts → conflict, nothing linked; fixed CRM data links on the next run without an OXO ERP change", async () => {
    const { ctx, client, data } = mk({ customers: [customer(7, { ico: "11111111" })] }, { accounts: [acc("a1", { company_id: "11111111" }), acc("a2", { company_id: "11111111" })] });
    let r = run(ctx);
    const top = await syncCustomers(r, client);
    expect([r.counts.conflicts, await ctx.store.get(K.customer(7))]).toEqual([1, null]);
    expect([top, r.rows.conflicts]).toEqual(["2026-10-18T08:00:00.000Z", [{ customerId: 7, name: "Co 7", reason: "number", candidates: ["a1", "a2"] }]]);
    await ctx.store.set(K.cursor("customers"), { at: "2026-10-19T00:00:00.000Z" });   // OXO ERP returns nothing new: only the stored conflict is re-tried
    data.accounts[1].deletedAt = "2026-10-18";
    r = run(ctx);
    await syncCustomers(r, client);
    expect([await ctx.store.get(K.customer(7)), await ctx.store.get(K.conflict(7))]).toEqual([{ accountId: "a1" }, null]);
  });

  it("one account is never linked to two customers, not even inside one dry run", async () => {
    const { ctx, client } = mk({ customers: [customer(1, { ico: "22222222" }), customer(2, { ico: "22222222", updatedAt: "2026-10-18T08:00:01.000Z" })] }, { accounts: [acc("a1", { company_id: "22222222" })] });
    const r = run(ctx, true);
    await syncCustomers(r, client);
    expect([r.counts.number, r.counts.conflicts, r.rows.conflicts[0]?.reason]).toEqual([1, 1, "linked"]);
  });

  it("dry run writes nothing", async () => {
    const { ctx, client, data } = mk({ customers: [customer(1, { ico: "1", name: "Changed" }), customer(2)] }, { accounts: [acc("a1", { company_id: "00000001" })] });
    const before = JSON.stringify(data);
    const r = run(ctx, true);
    await syncCustomers(r, client);
    expect([r.counts.number, r.counts.updated, r.counts.created]).toEqual([1, 1, 1]);
    expect(JSON.stringify(data)).toBe(before);
    expect(await ctx.store.list("")).toEqual([]);
  });

  it("an inactive customer is not written; its link is marked inactive", async () => {
    const { ctx, client, data } = mk({ customers: [customer(1, { active: false, name: "Closed" })] }, { accounts: [acc("a1")] });
    await ctx.store.set(K.customer(1), { accountId: "a1" });
    await ctx.store.set(K.account("a1"), { customerId: 1, syncedAt: "x", priceListId: null, addresses: [] });
    const r = run(ctx);
    await syncCustomers(r, client);
    expect([r.counts.skipped, data.accounts[0].name, (await ctx.store.get<{ inactive: boolean }>(K.account("a1")))?.inactive]).toEqual([1, "Acc a1", true]);
  });

  it("reads only changes since the cursor minus 2 minutes and returns the newest updatedAt", async () => {
    const { ctx, client, oxo } = mk({ customers: [customer(1, { updatedAt: "2026-10-18T08:30:00.000Z" })] });
    await ctx.store.set(K.cursor("customers"), { at: "2026-10-18T08:00:00.000Z" });
    expect(await syncCustomers(run(ctx), client)).toBe("2026-10-18T08:30:00.000Z");
    expect(oxo.calls[0].params.updatedSince).toBe("2026-10-18T07:58:00.000Z");
  });

  it("a failed write is retried from the stored copy", async () => {
    const { ctx, client } = mk({ customers: [customer(1)] });
    const create = ctx.data.accounts.create;
    ctx.data.accounts.create = async () => { throw new Error("db down"); };
    let r = run(ctx);
    await syncCustomers(r, client);
    expect([r.counts.failed, (await ctx.store.get<{ customer: { id: number } }>(K.retry(1)))?.customer.id]).toEqual([1, 1]);
    ctx.data.accounts.create = create;
    await ctx.store.set(K.cursor("customers"), { at: "2026-10-19T00:00:00.000Z" });
    r = run(ctx);
    await syncCustomers(r, client);
    expect([r.counts.created, await ctx.store.get(K.retry(1))]).toEqual([1, null]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm jest plugins/oxo-erp-connector/__tests__/customers.test.ts`
Expected: FAIL — cannot find module `../customers`.

- [ ] **Step 3: Implement**

`plugins/oxo-erp-connector/match.ts`:
```ts
import type { RecordData } from "@nextcrm/plugin-sdk";
import type { AccountFields } from "./map";
import type { Ctx } from "./settings";
import { K, type MatchReason } from "./store";

/** Same rule as account-protection's number key: whitespace out, upper case, CZ left-padded to 8 digits. */
export function normalizeNumber(country: string | null, raw: string | null): string | null {
  if (!raw) return null;
  const n = raw.replace(/\s+/g, "").toUpperCase();
  if (!n) return null;
  return (country ?? "").toUpperCase() === "CZ" && /^\d{1,8}$/.test(n) ? n.padStart(8, "0") : n;
}
export const normalizeVat = (raw: string | null): string | null => (raw ? raw.replace(/\s+/g, "").toUpperCase() || null : null);
const zip = (v: unknown) => String(v ?? "").replace(/\s+/g, "");

export type Match =
  | { kind: "linked" | "number" | "vat" | "name"; accountId: string }
  | { kind: "new" }
  | { kind: "conflict"; reason: MatchReason; candidates: string[] };

/** One candidate links, several conflict; an account linked to another customer (stored, or earlier in this run) is never shared. */
async function pick(ctx: Ctx, customerId: number, rows: RecordData[], reason: "number" | "vat" | "name", claimed: Map<string, number>): Promise<Match | null> {
  if (!rows.length) return null;
  const ids = rows.map((r) => r.id as string);
  if (rows.length > 1) return { kind: "conflict", reason, candidates: ids };
  const owner = claimed.get(ids[0]) ?? (await ctx.store.get<{ customerId: number }>(K.account(ids[0])))?.customerId;
  if (owner !== undefined && owner !== customerId) return { kind: "conflict", reason: "linked", candidates: ids };
  return { kind: reason, accountId: ids[0] };
}

/** Spec § 4.1: link, then country + IČO, then DIČ, then exact name + zip, else new. */
export async function matchAccount(ctx: Ctx, customerId: number, f: AccountFields, claimed: Map<string, number>): Promise<Match> {
  const linked = await ctx.store.get<{ accountId: string }>(K.customer(customerId));
  if (linked) {
    const acc = await ctx.data.accounts.get(linked.accountId);
    if (acc && acc.deletedAt == null) return { kind: "linked", accountId: linked.accountId };
  }
  const country = f.billing_country ?? ctx.settings.defaultCountry;
  const number = normalizeNumber(country, f.company_id);
  if (number) {
    const raw = Array.from(new Set([f.company_id as string, number, number.replace(/^0+/, "")]));
    const rows = (await ctx.data.accounts.find({ where: { deletedAt: null, company_id: { in: raw } } }))
      .filter((a) => normalizeNumber(country, (a.company_id as string | null) ?? null) === number);
    const m = await pick(ctx, customerId, rows, "number", claimed);
    if (m) return m;
  }
  const vat = normalizeVat(f.vat);
  if (vat) {
    const raw = Array.from(new Set([f.vat as string, vat, vat.toLowerCase()]));
    const rows = (await ctx.data.accounts.find({ where: { deletedAt: null, vat: { in: raw } } }))
      .filter((a) => normalizeVat((a.vat as string | null) ?? null) === vat);
    const m = await pick(ctx, customerId, rows, "vat", claimed);
    if (m) return m;
  }
  if (f.billing_postal_code) {
    const rows = (await ctx.data.accounts.find({ where: { deletedAt: null, name: { equals: f.name, mode: "insensitive" } } }))
      .filter((a) => zip(a.billing_postal_code) === zip(f.billing_postal_code));
    const m = await pick(ctx, customerId, rows, "name", claimed);
    if (m) return m;
  }
  return { kind: "new" };
}
```
Note on the DIČ test: the account holds `"cz99"` and the customer `"CZ 99"`; `raw` includes the customer's raw value, the normalized `"CZ99"` and `"cz99"`, so the core `in` query finds it.

`plugins/oxo-erp-connector/customers.ts`:
```ts
import { accountFields, changedFields } from "./map";
import { matchAccount } from "./match";
import type { OxoClient, OxoCustomer } from "./oxo";
import { msg, type Ctx } from "./settings";
import { K, type AccountLink, type Conflict, type CustomerCounts, type ReportRow, type RunSummary } from "./store";

const ROWS = 200;
const OVERLAP_MS = 2 * 60_000;

export const zeroCustomers = (): CustomerCounts => ({ linked: 0, number: 0, vat: 0, name: 0, created: 0, updated: 0, conflicts: 0, skipped: 0, failed: 0 });
export const emptyRows = (): RunSummary["rows"] => ({ name: [], created: [], conflicts: [] });

export interface CustomerRun {
  ctx: Ctx; dry: boolean; now: Date;
  counts: CustomerCounts;
  rows: RunSummary["rows"];
  /** accountId → customerId linked earlier in this run (a dry run writes no links). */
  claimed: Map<string, number>;
}

const add = (list: ReportRow[], row: ReportRow) => { if (list.length < ROWS) list.push(row); };

async function syncCustomer(r: CustomerRun, c: OxoCustomer): Promise<void> {
  const { ctx, dry, now } = r;
  if (!c.active) {
    const link = await ctx.store.get<{ accountId: string }>(K.customer(c.id));
    if (!dry) {
      await ctx.store.delete(K.conflict(c.id));
      const prev = link ? await ctx.store.get<AccountLink>(K.account(link.accountId)) : null;
      if (link && prev) await ctx.store.set(K.account(link.accountId), { ...prev, inactive: true, syncedAt: now.toISOString() } satisfies AccountLink);
    }
    r.counts.skipped++;
    return;
  }
  const fields = accountFields(c);
  const match = await matchAccount(ctx, c.id, fields, r.claimed);
  if (match.kind === "conflict") {
    r.counts.conflicts++;
    add(r.rows.conflicts, { customerId: c.id, name: fields.name, reason: match.reason, candidates: match.candidates });
    if (!dry) await ctx.store.set(K.conflict(c.id), { customerId: c.id, name: fields.name, reason: match.reason, candidates: match.candidates, foundAt: now.toISOString(), customer: c } satisfies Conflict);
    return;
  }
  if (!dry) await ctx.store.delete(K.conflict(c.id));
  let accountId: string;
  if (match.kind === "new") {
    r.counts.created++;
    add(r.rows.created, { customerId: c.id, name: fields.name });
    if (dry) return;
    accountId = (await ctx.data.accounts.create({ ...fields, billing_country: fields.billing_country ?? ctx.settings.defaultCountry, assigned_to: null, status: "Active" })).id as string;
  } else {
    accountId = match.accountId;
    r.counts[match.kind]++;
    if (match.kind === "name") add(r.rows.name, { customerId: c.id, name: fields.name, accountId });
    r.claimed.set(accountId, c.id);
    const diff = changedFields((await ctx.data.accounts.get(accountId)) ?? {}, fields);
    if (Object.keys(diff).length) {
      r.counts.updated++;
      if (!dry) await ctx.data.accounts.update(accountId, diff);
    }
    if (dry) return;
  }
  r.claimed.set(accountId, c.id);
  await ctx.store.set(K.customer(c.id), { accountId });
  await ctx.store.set(K.account(accountId), { customerId: c.id, syncedAt: now.toISOString(), priceListId: c.priceListId, addresses: c.addresses.filter((a) => a.active) } satisfies AccountLink);
}

async function guarded(r: CustomerRun, c: OxoCustomer, done: Set<number>): Promise<void> {
  if (done.has(c.id)) return;
  done.add(c.id);
  try {
    await syncCustomer(r, c);
    if (!r.dry) await r.ctx.store.delete(K.retry(c.id));
  } catch (e) {
    r.counts.failed++;
    r.ctx.log.error(`Customer ${c.id} failed: ${msg(e)}`, { customerId: c.id });
    if (!r.dry) await r.ctx.store.set(K.retry(c.id), { customer: c });
  }
}

/**
 * Changed customers since the cursor (minus 2 minutes), then those the CRM still owes from their stored copy:
 * conflicts (the CRM data may have been fixed) and failed writes. Returns the newest updatedAt seen; the caller moves the cursor.
 */
export async function syncCustomers(r: CustomerRun, client: OxoClient): Promise<string | null> {
  const cursor = (await r.ctx.store.get<{ at: string }>(K.cursor("customers")))?.at ?? null;
  const since = cursor ? new Date(Date.parse(cursor) - OVERLAP_MS).toISOString() : null;
  const rows = await client.all<OxoCustomer>("/customers", since ? { updatedSince: since } : {});
  const done = new Set<number>();
  let top = cursor;
  for (const c of rows) {
    if (!top || c.updatedAt > top) top = c.updatedAt;
    await guarded(r, c, done);
  }
  for (const e of [...(await r.ctx.store.list("conflict:")), ...(await r.ctx.store.list("retry:"))]) {
    await guarded(r, (e.value as { customer: OxoCustomer }).customer, done);
  }
  return top;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm jest plugins/oxo-erp-connector`
Expected: PASS (all plugin tests so far).

- [ ] **Step 5: Commit**

```bash
git add plugins/oxo-erp-connector/match.ts plugins/oxo-erp-connector/customers.ts plugins/oxo-erp-connector/__tests__/customers.test.ts
git commit -m "feat(oxo-erp-connector): customers matched by IČO, DIČ, name + zip; conflicts and retries

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_019AXXZ8279bRB86Cn1ZRWFS"
```

### Task 4: Catalog — categories by path, products, price lists, account lists

**Files:**
- Create: `plugins/oxo-erp-connector/catalog-map.ts`, `plugins/oxo-erp-connector/catalog.ts`
- Test: `plugins/oxo-erp-connector/__tests__/catalog.test.ts`

**Interfaces:**
- Consumes: Task 1 `ctx.data.productCategories.findExternal()`; Task 2 `ref`, `K`, `ProductLink`, `PriceListLink`, `AccountLink`, `CatalogCounts`, `OxoClient`, `OxoProduct`, `OxoPriceList`, `OxoRule`, `chosenLists`, `msg`.
- Produces:
  - `catalog-map.ts`: `SEP = " / "`, `categoryPaths(rows): Map<string, string>`, `productFields(p, categoryRef, currency, current)`, `sameProduct(row, f, link)`, `mapRules(rules, products, templates, categoryRef, listRef)`, `orderLists(deps, maxChain)`, `fnv(s)`
  - `catalog.ts`: `zeroCatalog(): CatalogCounts`, `syncCatalog({ ctx, client, dry, now }): Promise<{ counts: CatalogCounts; top: string | null }>`, `productMap(ctx): Promise<Map<number, string>>` (OXO ERP product id → CRM product id, from the store)

- [ ] **Step 1: Write the failing tests**

`plugins/oxo-erp-connector/__tests__/catalog.test.ts`:
```ts
import { categoryPaths, mapRules } from "../catalog-map";
import { syncCatalog } from "../catalog";
import { K } from "../store";
import type { OxoRule } from "../oxo";
import { product } from "./fake-oxo";
import { mk, now } from "./helpers";

const cat = (ref: string, name: string, parentRef: string | null) => ({ id: `c${ref}`, source: "EXTERNAL", externalRef: ref, name, parentRef });
const rule = (id: number, over: Partial<OxoRule> = {}): OxoRule => ({ id, odooId: null, appliesTo: "ALL", productId: null, productTemplateOdooId: null, categoryName: null, minQty: "0", kind: "PERCENT", fixedPrice: null, percent: "10", base: "LIST_PRICE", basePriceListId: null, ...over });

describe("category paths", () => {
  it("builds full paths from names and parent refs; a parent loop ends the path", () => {
    const paths = categoryPaths([{ id: "1", ref: "1", name: "Zásoby", parentRef: null }, { id: "2", ref: "2", name: "Výrobky", parentRef: "1" }, { id: "9", ref: "9", name: "Loop", parentRef: "9" }]);
    expect(Array.from(paths)).toEqual([["Zásoby", "1"], ["Zásoby / Výrobky", "2"], ["Loop", "9"]]);
  });
});

describe("rules", () => {
  it("maps fixed and percent rules, expands template rules to their variants, orders Odoo rules oldest first and native ones last", () => {
    const { rules, skipped } = mapRules([
      rule(5, { odooId: 1300, appliesTo: "PRODUCT", productTemplateOdooId: 412, kind: "FIXED", fixedPrice: "2.35", percent: null, minQty: "500" }),
      rule(4, { odooId: 1285, appliesTo: "CATEGORY", categoryName: "Zásoby / Výrobky", kind: "FIXED", fixedPrice: "757.76", percent: null, minQty: "6" }),
      rule(6, { appliesTo: "ALL", base: "PRICE_LIST", basePriceListId: 3 }),
      rule(7, { appliesTo: "CATEGORY", categoryName: "Nope" }),
      rule(8, { appliesTo: "PRODUCT", productId: 99 }),
    ], new Map([[11, "537"]]), new Map([[412, ["537", "538"]]]), (p) => (p === "Zásoby / Výrobky" ? "2" : null), (id) => (id === 3 ? "242" : null));
    expect(rules.map((r) => [r.externalRef, r.appliesTo, r.productRef, r.categoryRef, r.computePrice, r.fixedPrice, r.percentPrice, r.base, r.basePriceListRef, r.minQuantity])).toEqual([
      ["1285", "CATEGORY", null, "2", "FIXED", "757.76", null, "LIST_PRICE", null, "6"],
      ["1300:537", "PRODUCT", "537", null, "FIXED", "2.35", null, "LIST_PRICE", null, "500"],
      ["1300:538", "PRODUCT", "538", null, "FIXED", "2.35", null, "LIST_PRICE", null, "500"],
      ["oxo:6", "ALL", null, null, "PERCENTAGE", null, "10", "PRICE_LIST", "242", "0"],
    ]);
    expect(skipped).toEqual([{ ruleId: 7, reason: "category Nope not in the CRM" }]);
  });
});

describe("catalog sync", () => {
  it("takes over products by Odoo id and keeps tax, cost and description; links categories by path; creates missing paths under their parent", async () => {
    const { ctx, client, data } = mk({ products: [
      product(11, { odooId: 537, odooTemplateId: 412, code: "533002", name: "K ČKS Jahoda", category: "Zásoby / Výrobky", listPrice: "900" }),
      product(12, { code: "NEW1", name: "Native", category: "Zásoby / Výrobky / Nové" }),
    ] }, {
      productCategories: [cat("1", "Zásoby", null), cat("2", "Výrobky", "1")],
      products: [{ id: "p537", source: "EXTERNAL", externalRef: "537", name: "[533002] K ČKS Jahoda", sku: "533002", tax_rate: 12, unit_cost: 310, description: "Jahodový koncentrát", deletedAt: null }],
    });
    const { counts } = await syncCatalog({ ctx, client, dry: false, now });
    expect([counts.productsUpdated, counts.productsCreated, counts.categoriesMatched, counts.categoriesCreated]).toEqual([1, 1, 1, 1]);
    expect(data.products[0]).toMatchObject({ id: "p537", name: "K ČKS Jahoda", tax_rate: "12", unit_cost: "310", description: "Jahodový koncentrát", unit_price: "900", status: "ACTIVE", categoryRef: "2" });
    expect(data.products).toHaveLength(2);
    expect(data.productCategories.find((c) => c.externalRef === "oxo-cat:Zásoby / Výrobky / Nové")).toMatchObject({ name: "Nové", parentRef: "2" });
    expect(await ctx.store.get(K.product("p537"))).toEqual({ oxoId: 11, ref: "537", templateId: 412, categoryRef: "2" });
  });

  it("brings in new products only when sellable and active; a known product keeps getting updates when it stops being sellable", async () => {
    const { ctx, client, data } = mk({ products: [product(1, { saleOk: false }), product(2, { active: false }), product(3, { odooId: 700, saleOk: false })] },
      { products: [{ id: "p700", source: "EXTERNAL", externalRef: "700", name: "Old", deletedAt: null }] });
    const { counts } = await syncCatalog({ ctx, client, dry: false, now });
    expect([counts.productsCreated, counts.productsUpdated]).toEqual([0, 1]);
    expect(data.products.map((p) => [p.externalRef, p.status])).toEqual([["700", "ARCHIVED"]]);
  });

  it("an unchanged product is not written again", async () => {
    const { ctx, client } = mk({ products: [product(1)] });
    await syncCatalog({ ctx, client, dry: false, now });
    const { counts } = await syncCatalog({ ctx, client, dry: false, now });
    expect([counts.productsCreated, counts.productsUpdated]).toEqual([0, 0]);
  });

  it("replaces chosen lists and their bases (bases first) only when they change; deactivates a list removed from the setting; sets account lists", async () => {
    const lists = [
      { id: 3, odooId: 242, name: "Retail_STARTER", currency: "CZK", rules: [rule(1, { odooId: 1285, appliesTo: "CATEGORY", categoryName: "Zásoby / Výrobky", kind: "FIXED", fixedPrice: "757.76", percent: null })] },
      { id: 4, odooId: null, name: "Wholesale", currency: "CZK", rules: [rule(2, { base: "PRICE_LIST", basePriceListId: 3 })] },
    ];
    const { ctx, client, data } = mk({ lists, products: [product(1)] }, { accounts: [{ id: "a1", pricelist_id: null, deletedAt: null }], productCategories: [cat("1", "Zásoby", null), cat("2", "Výrobky", "1")] }, { priceLists: "4" });
    await ctx.store.set(K.account("a1"), { customerId: 9, syncedAt: "x", priceListId: 4, addresses: [] });
    let { counts } = await syncCatalog({ ctx, client, dry: false, now });
    expect(counts.listsReplaced).toBe(2);
    expect(data.priceLists.map((l) => [l.externalRef, l.isActive])).toEqual([["242", false], ["oxo:4", true]]);
    expect(data.priceListRules.find((r) => r.priceListId === data.priceLists[1].id)).toMatchObject({ base: "PRICE_LIST", basePriceListRef: "242" });
    expect(data.accounts[0].pricelist_id).toBe(data.priceLists[1].id);
    ({ counts } = await syncCatalog({ ctx, client, dry: false, now }));
    expect(counts.listsReplaced).toBe(0);
    ctx.settings.priceLists = "";
    ({ counts } = await syncCatalog({ ctx, client, dry: false, now }));
    expect(data.priceLists.map((l) => l.isActive)).toEqual([false, false]);
  });

  it("reports a chosen list OXO ERP does not have", async () => {
    const { ctx, client } = mk({}, {}, { priceLists: "77" });
    expect((await syncCatalog({ ctx, client, dry: false, now })).counts.listsMissing).toEqual([77]);
  });

  it("dry run counts and writes nothing", async () => {
    const { ctx, client, data } = mk({ products: [product(1, { category: "A / B" })], lists: [{ id: 3, odooId: null, name: "L", currency: "CZK", rules: [] }] }, {}, { priceLists: "3" });
    const before = JSON.stringify(data);
    const { counts } = await syncCatalog({ ctx, client, dry: true, now });
    expect([counts.productsCreated, counts.categoriesCreated, counts.listsReplaced]).toEqual([1, 2, 1]);
    expect(JSON.stringify(data)).toBe(before);
    expect(await ctx.store.list("")).toEqual([]);
  });

  it("a failed product write is counted and retried next run", async () => {
    const { ctx, client, data } = mk({ products: [product(1, { code: "DUP" })] }, { products: [{ id: "crm1", source: "EXTERNAL", externalRef: "999", sku: "DUP", deletedAt: null }] });
    let { counts } = await syncCatalog({ ctx, client, dry: false, now });
    expect([counts.productsFailed, (await ctx.store.get<{ product: { id: number } }>(K.retryProduct(1)))?.product.id]).toEqual([1, 1]);
    data.products[0].sku = "OTHER";
    await ctx.store.set(K.cursor("products"), { at: "2026-10-19T00:00:00.000Z" });
    ({ counts } = await syncCatalog({ ctx, client, dry: false, now }));
    expect([counts.productsCreated, await ctx.store.get(K.retryProduct(1))]).toEqual([1, null]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm jest plugins/oxo-erp-connector/__tests__/catalog.test.ts`
Expected: FAIL — cannot find module `../catalog-map`.

- [ ] **Step 3: Implement `catalog-map.ts`**

```ts
import type { ExternalCategory, ExternalProductInput, ExternalRuleInput } from "@nextcrm/plugin-sdk";
import type { OxoProduct, OxoRule } from "./oxo";
import type { ProductLink } from "./store";

export const SEP = " / ";

/** Each external CRM category's full path ("Zásoby / Výrobky / K ČKS", OXO ERP's form) → its ref; a parent loop ends the path. */
export function categoryPaths(rows: ExternalCategory[]): Map<string, string> {
  const byRef = new Map(rows.map((r) => [r.ref, r]));
  const path = (r: ExternalCategory, seen: Set<string>): string => {
    const parent = r.parentRef ? byRef.get(r.parentRef) : undefined;
    if (!parent || seen.has(parent.ref) || parent.ref === r.ref) return r.name;
    seen.add(r.ref);
    return `${path(parent, seen)}${SEP}${r.name}`;
  };
  return new Map(rows.map((r) => [path(r, new Set()), r.ref]));
}

/** Spec § 10 A5: OXO ERP sends no tax, cost or description; those keep the CRM's value. */
export function productFields(p: OxoProduct, categoryRef: string | null, currency: string, current: Record<string, unknown> | null): ExternalProductInput {
  const keep = (k: string) => (current?.[k] != null ? String(current[k]) : null);
  return {
    name: p.name,
    sku: p.code || null,
    description: keep("description"),
    type: p.kind === "SERVICE" ? "SERVICE" : "PRODUCT",
    status: p.active && p.saleOk ? "ACTIVE" : "ARCHIVED",
    unit_price: p.listPrice ?? "0",
    unit_cost: keep("unit_cost"),
    currency,
    tax_rate: keep("tax_rate"),
    unit: p.unit,
    categoryRef,
  };
}

/** True when the stored product already has these values (decimals compared as numbers). */
export function sameProduct(row: Record<string, unknown> | null, f: ExternalProductInput, link: ProductLink | undefined): boolean {
  if (!row || !link) return false;
  const num = (a: unknown, b: string | null) => (a == null || b == null ? a == b : Number(a) === Number(b));
  return row.name === f.name && (row.sku ?? null) === f.sku && (row.description ?? null) === f.description && row.type === f.type
    && row.status === f.status && num(row.unit_price, f.unit_price) && num(row.unit_cost, f.unit_cost) && row.currency === f.currency
    && num(row.tax_rate, f.tax_rate) && (row.unit ?? null) === f.unit && link.categoryRef === f.categoryRef;
}

const COMPUTE = { FIXED: "FIXED", PERCENT: "PERCENTAGE" } as const;
const newness = (r: OxoRule) => r.odooId ?? 1e9 + r.id;   // OXO ERP's own tiebreak: native rules are newer than mirrored ones

/**
 * Spec § 4.3: OXO ERP rules → core rules, oldest first (core lets later rules win ties). A rule on a product the CRM lacks is left
 * out silently (OXO ERP has rules on products the CRM never imports); a category or base list the CRM lacks is skipped and listed.
 */
export function mapRules(
  rules: OxoRule[], products: Map<number, string>, templates: Map<number, string[]>,
  categoryRef: (path: string) => string | null, listRef: (oxoId: number) => string | null,
): { rules: ExternalRuleInput[]; skipped: { ruleId: number; reason: string }[] } {
  const out: ExternalRuleInput[] = [];
  const skipped: { ruleId: number; reason: string }[] = [];
  for (const r of [...rules].sort((a, b) => newness(a) - newness(b))) {
    const key = r.odooId != null ? String(r.odooId) : `oxo:${r.id}`;
    const baseRef = r.base === "PRICE_LIST" && r.basePriceListId != null ? listRef(r.basePriceListId) : null;
    if (r.base === "PRICE_LIST" && !baseRef) { skipped.push({ ruleId: r.id, reason: `base list ${r.basePriceListId ?? "-"} not imported` }); continue; }
    const common = {
      minQuantity: r.minQty, dateStart: null, dateEnd: null, computePrice: COMPUTE[r.kind],
      fixedPrice: r.kind === "FIXED" ? (r.fixedPrice ?? "0") : null, percentPrice: r.kind === "PERCENT" ? (r.percent ?? "0") : null,
      base: r.base, basePriceListRef: baseRef, priceDiscount: "0", priceSurcharge: "0", priceRound: null, priceMinMargin: null, priceMaxMargin: null,
    } satisfies Omit<ExternalRuleInput, "appliesTo" | "productRef" | "categoryRef" | "externalRef">;
    if (r.appliesTo === "ALL") out.push({ ...common, appliesTo: "ALL", productRef: null, categoryRef: null, externalRef: key });
    else if (r.appliesTo === "CATEGORY") {
      const c = r.categoryName ? categoryRef(r.categoryName) : null;
      if (c) out.push({ ...common, appliesTo: "CATEGORY", productRef: null, categoryRef: c, externalRef: key });
      else skipped.push({ ruleId: r.id, reason: `category ${r.categoryName ?? "-"} not in the CRM` });
    } else if (r.productId != null) {
      const p = products.get(r.productId);
      if (p) out.push({ ...common, appliesTo: "PRODUCT", productRef: p, categoryRef: null, externalRef: key });
    } else if (r.productTemplateOdooId != null) {
      for (const p of templates.get(r.productTemplateOdooId) ?? []) out.push({ ...common, appliesTo: "PRODUCT", productRef: p, categoryRef: null, externalRef: `${key}:${p}` });
    }
  }
  return { rules: out, skipped };
}

/** Topological order, bases first; lists on or behind a cycle are cyclic, lists whose chain is larger than maxChain are tooDeep. */
export function orderLists(deps: Map<number, number[]>, maxChain = Infinity): { order: number[]; cyclic: number[]; tooDeep: number[] } {
  const order: number[] = [];
  const state = new Map<number, "visiting" | "done" | "bad">();
  const visit = (id: number): boolean => {
    const st = state.get(id);
    if (st === "done") return true;
    if (st === "visiting" || st === "bad") { state.set(id, "bad"); return false; }
    state.set(id, "visiting");
    const ok = (deps.get(id) ?? []).map(visit).every(Boolean);
    state.set(id, ok ? "done" : "bad");
    if (ok) order.push(id);
    return ok;
  };
  for (const id of Array.from(deps.keys()).sort((a, b) => a - b)) visit(id);
  const chain = new Map<number, Set<number>>();
  for (const id of order) chain.set(id, new Set([id, ...(deps.get(id) ?? []).flatMap((b) => Array.from(chain.get(b) ?? []))]));
  const tooDeep = order.filter((id) => chain.get(id)!.size > maxChain).sort((a, b) => a - b);
  return {
    order: order.filter((id) => !tooDeep.includes(id)),
    cyclic: Array.from(state.entries()).filter(([, v]) => v === "bad").map(([k]) => k).sort((a, b) => a - b),
    tooDeep,
  };
}

/** A short fingerprint of a list's content: replace only when it changes. */
export function fnv(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(16);
}
```

- [ ] **Step 4: Implement `catalog.ts`**

```ts
import { SEP, categoryPaths, fnv, mapRules, orderLists, productFields, sameProduct } from "./catalog-map";
import { ref } from "./map";
import type { OxoClient, OxoPriceList, OxoProduct } from "./oxo";
import { chosenLists, msg, type Ctx } from "./settings";
import { K, type AccountLink, type CatalogCounts, type PriceListLink, type ProductLink } from "./store";

const OVERLAP_MS = 2 * 60_000;
const MAX_CHAIN = 11;   // core loads at most 11 lists per price (lib/pricing/get-price.ts MAX_LISTS)

export const zeroCatalog = (): CatalogCounts => ({ categoriesMatched: 0, categoriesCreated: 0, productsUpdated: 0, productsCreated: 0, productsFailed: 0, listsReplaced: 0, listsMissing: [], accountLists: 0 });

/** OXO ERP product id → CRM product id, for every product this plugin wrote. */
export async function productMap(ctx: Ctx): Promise<Map<number, string>> {
  return new Map((await ctx.store.list("product:")).map((e) => [(e.value as ProductLink).oxoId, e.key.slice(8)]));
}

export async function syncCatalog({ ctx, client, dry, now }: { ctx: Ctx; client: OxoClient; dry: boolean; now: Date }): Promise<{ counts: CatalogCounts; top: string | null }> {
  const counts = zeroCatalog();

  // 1. Categories: OXO ERP sends the full path; link it to the CRM category with the same path, else create it under its parent path (§ 10 A1).
  const paths = categoryPaths(await ctx.data.productCategories.findExternal());
  const matched = new Set<string>();
  const ensure = async (path: string): Promise<string> => {
    const known = paths.get(path);
    if (known) { if (!known.startsWith("oxo-cat:")) matched.add(path); return known; }
    const cut = path.lastIndexOf(SEP);
    const parentRef = cut > 0 ? await ensure(path.slice(0, cut)) : null;
    const r = `oxo-cat:${path}`;
    paths.set(path, r);
    counts.categoriesCreated++;
    if (!dry) await ctx.data.productCategories.upsertExternal(r, { name: cut > 0 ? path.slice(cut + SEP.length) : path, parentRef });
    return r;
  };

  // 2. Products changed since the cursor, plus those whose last write failed.
  const cursor = (await ctx.store.get<{ at: string }>(K.cursor("products")))?.at ?? null;
  const since = cursor ? new Date(Date.parse(cursor) - OVERLAP_MS).toISOString() : null;
  const fresh = await client.all<OxoProduct>("/products", since ? { updatedSince: since } : {});
  const retry = (await ctx.store.list("retryProduct:")).map((e) => (e.value as { product: OxoProduct }).product);
  const external = new Map((await ctx.data.products.findExternal()).map((p) => [p.ref, p.id]));
  const links = new Map((await ctx.store.list("product:")).map((e) => [e.key.slice(8), e.value as ProductLink]));
  const known = new Map<number, { ref: string; templateId: number | null }>(Array.from(links.values()).map((l) => [l.oxoId, { ref: l.ref, templateId: l.templateId }]));
  let top = cursor;
  const done = new Set<number>();
  for (const p of [...fresh, ...retry]) {
    if (fresh.includes(p) && (!top || p.updatedAt > top)) top = p.updatedAt;
    if (done.has(p.id)) continue;
    done.add(p.id);
    const r = ref(p);
    const crmId = external.get(r);
    if (!crmId && !(p.saleOk && p.active)) continue;
    try {
      const categoryRef = p.category ? await ensure(p.category) : null;
      const current = crmId ? await ctx.data.products.get(crmId) : null;
      const f = productFields(p, categoryRef, ctx.settings.currency, current);
      known.set(p.id, { ref: r, templateId: p.odooTemplateId });
      if (crmId && sameProduct(current, f, links.get(crmId))) continue;
      if (dry) { counts[crmId ? "productsUpdated" : "productsCreated"]++; continue; }
      const res = await ctx.data.products.upsertExternal(r, f, { adoptBySku: true });
      if (res.adopted) ctx.log.info(`Took over CRM product ${f.sku} (${f.name})`, { oxoId: p.id, productId: res.id });
      counts[res.created ? "productsCreated" : "productsUpdated"]++;
      external.set(r, res.id);
      await ctx.store.set(K.product(res.id), { oxoId: p.id, ref: r, templateId: p.odooTemplateId, categoryRef } satisfies ProductLink);
      await ctx.store.delete(K.retryProduct(p.id));
    } catch (e) {
      counts.productsFailed++;
      known.delete(p.id);
      ctx.log.error(`Product ${p.id} failed: ${msg(e)}`, { oxoId: p.id });
      if (!dry) await ctx.store.set(K.retryProduct(p.id), { product: p });
    }
  }
  counts.categoriesMatched = matched.size;

  // 3. Price lists: chosen + the lists they build on, bases first; lists imported earlier stay in the run so a removed one is deactivated.
  const snapshot = new Map((await client.get<{ items: OxoPriceList[] }>("/price-lists")).items.map((l) => [l.id, l]));
  const chosen = chosenLists(ctx);
  const stored = new Map((await ctx.store.list("pricelist:")).map((e) => [Number(e.key.slice(10)), e.value as PriceListLink]));
  for (const id of chosen) if (!snapshot.has(id)) { counts.listsMissing.push(id); ctx.log.warn(`OXO ERP price list ${id} not found`); }
  const wanted = new Set<number>();
  const want = (id: number) => {
    const l = snapshot.get(id);
    if (!l || wanted.has(id)) return;
    wanted.add(id);
    for (const r of l.rules) if (r.base === "PRICE_LIST" && r.basePriceListId != null) want(r.basePriceListId);
  };
  [...chosen, ...Array.from(stored.keys())].forEach(want);
  const deps = new Map(Array.from(wanted).map((id) => [id, snapshot.get(id)!.rules.filter((r) => r.base === "PRICE_LIST" && r.basePriceListId != null && wanted.has(r.basePriceListId)).map((r) => r.basePriceListId!)]));
  const { order, cyclic, tooDeep } = orderLists(deps, MAX_CHAIN);
  for (const id of cyclic) ctx.log.warn(`Price list ${id} skipped: its base lists form a cycle`);
  for (const id of tooDeep) ctx.log.warn(`Price list ${id} skipped: it builds on more than ${MAX_CHAIN - 1} other lists`);
  const productRefs = new Map(Array.from(known).map(([oxoId, k]) => [oxoId, k.ref]));
  const templates = new Map<number, string[]>();
  for (const k of Array.from(known.values())) if (k.templateId != null) templates.set(k.templateId, [...(templates.get(k.templateId) ?? []), k.ref]);
  const listRefs = new Map<number, string>();
  for (const id of order) {
    const l = snapshot.get(id)!;
    for (const r of l.rules) if (r.appliesTo === "CATEGORY" && r.categoryName) await ensure(r.categoryName);
    const { rules, skipped } = mapRules(l.rules, productRefs, templates, (p) => paths.get(p) ?? null, (b) => listRefs.get(b) ?? null);
    const isActive = chosen.includes(id);
    const hash = fnv(JSON.stringify({ name: l.name, currency: l.currency, isActive, rules }));
    const prev = stored.get(id);
    listRefs.set(id, ref(l));
    if (!dry) await ctx.store.set(K.skipped(id), skipped);
    if (prev?.hash === hash) continue;
    counts.listsReplaced++;
    if (dry) continue;
    const { id: priceListId } = await ctx.data.priceLists.replaceExternal(ref(l), { name: l.name, currency: l.currency, isActive }, rules);
    await ctx.store.set(K.pricelist(id), { priceListId, ref: ref(l), name: l.name, currency: l.currency, hash, syncedAt: now.toISOString(), isActive } satisfies PriceListLink);
  }
  // A stored list OXO ERP no longer returns (archived there) is deactivated once.
  for (const [id, prev] of Array.from(stored)) {
    if (snapshot.has(id) || !prev.isActive) continue;
    counts.listsReplaced++;
    if (dry) continue;
    await ctx.data.priceLists.replaceExternal(prev.ref, { name: prev.name, currency: prev.currency, isActive: false }, []);
    await ctx.store.set(K.pricelist(id), { ...prev, isActive: false, hash: "", syncedAt: now.toISOString() } satisfies PriceListLink);
  }

  // 4. Account price lists follow the OXO ERP customer, chosen lists only.
  for (const e of await ctx.store.list("account:")) {
    const link = e.value as AccountLink;
    if (link.priceListId == null || !chosen.includes(link.priceListId)) continue;
    const list = await ctx.store.get<PriceListLink>(K.pricelist(link.priceListId));
    if (!list) continue;
    const accountId = e.key.slice(8);
    const acc = await ctx.data.accounts.get(accountId);
    if (!acc || acc.pricelist_id === list.priceListId) continue;
    counts.accountLists++;
    if (!dry) await ctx.data.accounts.update(accountId, { pricelist_id: list.priceListId });
  }
  return { counts, top };
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm jest plugins/oxo-erp-connector`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add plugins/oxo-erp-connector/catalog-map.ts plugins/oxo-erp-connector/catalog.ts plugins/oxo-erp-connector/__tests__/catalog.test.ts
git commit -m "feat(oxo-erp-connector): categories by path, product takeover, price lists, account lists

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_019AXXZ8279bRB86Cn1ZRWFS"
```

### Task 5: Sync runner, jobs, takeover dry run

**Files:**
- Create: `plugins/oxo-erp-connector/sync.ts`, `plugins/oxo-erp-connector/jobs.ts`
- Test: `plugins/oxo-erp-connector/__tests__/sync.test.ts`

**Interfaces:**
- Consumes: Task 3 `syncCustomers`, `zeroCustomers`, `emptyRows`, `CustomerRun`; Task 4 `syncCatalog`; Task 2 `OxoClient`, `oxoClient`, `isAuthError`, `K`, `RunSummary`, `OrderCounts`, `tell`, `msg`.
- Produces:
  - `sync.ts`: `zeroOrders(): OrderCounts`, `runSync(ctx, client, now): Promise<RunSummary>`, `scheduledSync(ctx, now, client?): Promise<boolean>`, `summaryText(ctx, s): string`
  - `jobs.ts`: `queueJob(ctx, now): Promise<string>`, `runQueued(ctx, now, client?): Promise<void>`, `loadPriceLists(ctx, client?): Promise<string>`
  - Tasks 7 and 8 insert their calls at the marked line in `runSync`.

- [ ] **Step 1: Write the failing tests**

`plugins/oxo-erp-connector/__tests__/sync.test.ts`:
```ts
import { loadPriceLists, queueJob, runQueued } from "../jobs";
import { runSync, scheduledSync } from "../sync";
import { K, type RunSummary } from "../store";
import { customer, product } from "./fake-oxo";
import { mk, now } from "./helpers";

const takeoverData = () => ({
  accounts: [{ id: "a1", name: "Puffbox s.r.o.", company_id: "19737955", vat: null, assigned_to: "u-rep", deletedAt: null }],
  products: [{ id: "p537", source: "EXTERNAL", externalRef: "537", name: "[533002] K ČKS Jahoda", sku: "533002", tax_rate: 12, deletedAt: null }],
  productCategories: [{ id: "c1", source: "EXTERNAL", externalRef: "1", name: "Zásoby", parentRef: null }],
  priceLists: [{ id: "L242", source: "EXTERNAL", externalRef: "242", name: "Retail_STARTER", currency: "CZK", isActive: true }],
});
const takeoverOxo = () => ({
  customers: [customer(222, { odooId: 154, name: "Puffbox s.r.o.", ico: "19737955" }), customer(300, { name: "Nový bar" })],
  products: [product(537, { odooId: 537, code: "533002", name: "K ČKS Jahoda", category: "Zásoby" })],
  lists: [{ id: 3, odooId: 242, name: "Retail_STARTER", currency: "CZK", rules: [] }],
});

describe("runSync", () => {
  it("takeover dry run then real run: the dry run writes nothing and reports links, not creations; the real run makes no duplicates", async () => {
    const { ctx, client, data } = mk(takeoverOxo(), takeoverData(), { dryRun: true, priceLists: "3" });
    const before = JSON.stringify(data);
    const dry = await runSync(ctx, client, now);
    expect(JSON.stringify(data)).toBe(before);
    expect([dry.ok, dry.dryRun, dry.customers.number, dry.customers.created, dry.catalog?.productsUpdated, dry.catalog?.productsCreated, dry.catalog?.listsReplaced]).toEqual([true, true, 1, 1, 1, 0, 1]);
    expect(dry.rows.created).toEqual([{ customerId: 300, name: "Nový bar" }]);
    expect(await ctx.store.get(K.report)).toEqual(dry);
    expect((await ctx.store.list("")).map((e) => e.key).sort()).toEqual([K.failures, K.lastRun, K.report].sort());

    ctx.settings.dryRun = false;
    const real = await runSync(ctx, client, now);
    expect(real.ok).toBe(true);
    expect([data.accounts.length, data.products.length, data.priceLists.length]).toEqual([2, 1, 1]);
    expect(data.products[0]).toMatchObject({ id: "p537", tax_rate: "12" });
    expect(data.priceLists[0]).toMatchObject({ id: "L242", isActive: true });
    expect(await ctx.store.get(K.cursor("customers"))).toEqual({ at: "2026-10-18T08:00:00.000Z" });
  });

  it("a second run while one is in progress is skipped", async () => {
    const { ctx, client } = mk();
    await ctx.store.set(K.lock, { until: new Date(now.getTime() + 60_000).toISOString() });
    const s = await runSync(ctx, client, now);
    expect([s.ok, s.error]).toEqual([false, "admin.running"]);
  });

  it("a rejected key stops the run, keeps the cursors, and the third failure in a row emails admins", async () => {
    const { ctx, client } = mk();
    ctx.http.fetch = async () => new Response(JSON.stringify({ error: "unauthorized", message: "Chybí nebo neplatí API klíč." }), { status: 401 });
    for (let i = 0; i < 3; i++) await runSync(ctx, client, now);
    const last = await ctx.store.get<RunSummary>(K.lastRun);
    expect([last?.ok, last?.error]).toEqual([false, "OXO ERP error 401: Chybí nebo neplatí API klíč."]);
    expect(await ctx.store.get(K.cursor("customers"))).toBeNull();
    expect(ctx.notifications.map((n) => n.subject)).toEqual(["mail.failingSubject"]);
    expect(await ctx.store.get(K.lock)).toBeNull();
  });
});

describe("schedule and jobs", () => {
  it("runs when syncMinutes have passed; never on schedule in dry run", async () => {
    const { ctx, client } = mk();
    expect(await scheduledSync(ctx, now, client)).toBe(true);
    expect(await scheduledSync(ctx, new Date(now.getTime() + 5 * 60_000), client)).toBe(false);
    expect(await scheduledSync(ctx, new Date(now.getTime() + 15 * 60_000), client)).toBe(true);
    ctx.settings.dryRun = true;
    expect(await scheduledSync(ctx, new Date(now.getTime() + 60 * 60_000), client)).toBe(false);
  });

  it("Sync now queues a job the cron runs once, in dry run too", async () => {
    const { ctx, client } = mk({}, {}, { dryRun: true });
    expect(await queueJob(ctx, now)).toBe("admin.queued");
    await runQueued(ctx, now, client);
    expect([(await ctx.store.get<RunSummary>(K.lastRun))?.dryRun, await ctx.store.get(K.job)]).toEqual([true, null]);
  });

  it("loads OXO ERP's price lists for the admin section", async () => {
    const { ctx, client } = mk({ lists: [{ id: 3, odooId: 242, name: "Retail_STARTER", currency: "CZK", rules: [] }] });
    expect(await loadPriceLists(ctx, client)).toBe("admin.listsLoaded");
    expect((await ctx.store.get<{ lists: unknown[] }>(K.oxoLists))?.lists).toEqual([{ id: 3, odooId: 242, name: "Retail_STARTER", currency: "CZK", rules: 0 }]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm jest plugins/oxo-erp-connector/__tests__/sync.test.ts`
Expected: FAIL — cannot find module `../jobs`.

- [ ] **Step 3: Implement**

`plugins/oxo-erp-connector/sync.ts`:
```ts
import { syncCatalog } from "./catalog";
import { emptyRows, syncCustomers, zeroCustomers, type CustomerRun } from "./customers";
import { oxoClient, type OxoClient } from "./oxo";
import { msg, tell, type Ctx } from "./settings";
import { K, type CatalogCounts, type OrderCounts, type RunSummary } from "./store";

const LOCK_MS = 10 * 60_000;
const SLACK_MS = 30_000;

export const zeroOrders = (): OrderCounts => ({ checked: 0, moved: 0, imported: 0, updated: 0, pending: 0 });

export function summaryText(ctx: Ctx, s: RunSummary): string {
  if (!s.ok) return ctx.t("admin.failed", { error: s.error ?? "?" });
  const parts = [ctx.t("admin.customerCounts", { ...s.customers })];
  if (s.catalog) parts.push(ctx.t("admin.catalogCounts", { ...s.catalog, listsMissing: s.catalog.listsMissing.join(", ") }));
  if (s.orders) parts.push(ctx.t("admin.orderCounts", { ...s.orders }));
  return parts.join(" · ");
}

/**
 * One sync: customers, catalog, order statuses, orders in. Cursors move only after a successful non-dry run;
 * a dry run's summary is also kept as the takeover report (spec § 4.4).
 */
export async function runSync(ctx: Ctx, client: OxoClient, now: Date): Promise<RunSummary> {
  const dry = ctx.settings.dryRun;
  const base = { at: now.toISOString(), dryRun: dry };
  const lock = await ctx.store.get<{ until: string }>(K.lock);
  if (lock && Date.parse(lock.until) > now.getTime()) {
    ctx.log.info("Sync skipped: another run is in progress");
    return { ...base, ok: false, error: ctx.t("admin.running"), customers: zeroCustomers(), rows: emptyRows() };
  }
  await ctx.store.set(K.lock, { until: new Date(now.getTime() + LOCK_MS).toISOString() });
  const r: CustomerRun = { ctx, dry, now, counts: zeroCustomers(), rows: emptyRows(), claimed: new Map() };
  let catalog: CatalogCounts | undefined;
  const orders = zeroOrders();
  let summary: RunSummary;
  try {
    const customersTop = await syncCustomers(r, client);
    const cat = await syncCatalog({ ctx, client, dry, now });
    catalog = cat.counts;
    let ordersTop: string | null = null;
    // ORDERS: Tasks 7 and 8 add the status sweep and the import of OXO ERP orders here.
    if (!dry) {
      if (customersTop) await ctx.store.set(K.cursor("customers"), { at: customersTop });
      if (cat.top) await ctx.store.set(K.cursor("products"), { at: cat.top });
      if (ordersTop) await ctx.store.set(K.cursor("orders"), { at: ordersTop });
    }
    summary = { ...base, ok: true, customers: r.counts, catalog, orders, rows: r.rows };
    await ctx.store.set(K.failures, { count: 0 });
    ctx.log.info(`Sync finished${dry ? " (dry run)" : ""}`, { ...r.counts });
  } catch (e) {
    const error = msg(e);
    summary = { ...base, ok: false, error, customers: r.counts, catalog, orders, rows: r.rows };
    ctx.log.error(`Sync failed: ${error}`);
    const failures = ((await ctx.store.get<{ count: number }>(K.failures))?.count ?? 0) + 1;
    await ctx.store.set(K.failures, { count: failures });
    if (failures === 3) await tell(ctx, { roles: ["admin"], subject: ctx.t("mail.failingSubject"), text: ctx.t("mail.failingText", { error }) });
  } finally {
    await ctx.store.delete(K.lock);
  }
  await ctx.store.set(K.lastRun, summary);
  if (dry) await ctx.store.set(K.report, summary);
  return summary;
}

/** The cron runs every 5 minutes; a sync starts when syncMinutes have passed. In dry run the schedule is paused; "Sync now" still runs. */
export async function scheduledSync(ctx: Ctx, now: Date, client: OxoClient = oxoClient(ctx)): Promise<boolean> {
  if (ctx.settings.dryRun) return false;
  const last = await ctx.store.get<RunSummary>(K.lastRun);
  if (last && now.getTime() - Date.parse(last.at) < ctx.settings.syncMinutes * 60_000 - SLACK_MS) return false;
  await runSync(ctx, client, now);
  return true;
}
```
`plugins/oxo-erp-connector/jobs.ts`:
```ts
import { oxoClient, type OxoClient, type OxoPriceList } from "./oxo";
import type { Ctx } from "./settings";
import { K } from "./store";
import { runSync } from "./sync";

export async function queueJob(ctx: Ctx, now: Date): Promise<string> {
  await ctx.store.set(K.job, { requestedAt: now.toISOString() });
  return ctx.t("admin.queued");
}

/** A queued "Sync now" runs on the cron (admin actions must return quickly). */
export async function runQueued(ctx: Ctx, now: Date, client: OxoClient = oxoClient(ctx)): Promise<void> {
  if (!(await ctx.store.get(K.job))) return;
  try { await runSync(ctx, client, now); } finally { await ctx.store.delete(K.job); }
}

/** Admin action: OXO ERP's active price lists and their ids, for the priceLists setting. */
export async function loadPriceLists(ctx: Ctx, client: OxoClient = oxoClient(ctx)): Promise<string> {
  const { items } = await client.get<{ items: OxoPriceList[] }>("/price-lists");
  const lists = items.map((l) => ({ id: l.id, odooId: l.odooId, name: l.name, currency: l.currency, rules: l.rules.length }));
  await ctx.store.set(K.oxoLists, { at: new Date().toISOString(), lists });
  return ctx.t("admin.listsLoaded", { count: lists.length });
}
```
(`let ordersTop` is only assigned from Task 8 on; the linter runs in Task 10.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm jest plugins/oxo-erp-connector`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add plugins/oxo-erp-connector/sync.ts plugins/oxo-erp-connector/jobs.ts plugins/oxo-erp-connector/__tests__/sync.test.ts
git commit -m "feat(oxo-erp-connector): sync runner with lock, cursors, dry-run takeover report; jobs

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_019AXXZ8279bRB86Cn1ZRWFS"
```

### Task 6: Orders out

**Files:**
- Create: `plugins/oxo-erp-connector/orders-out.ts`
- Test: `plugins/oxo-erp-connector/__tests__/orders-out.test.ts`

**Interfaces:**
- Consumes: Task 2 `OxoClient`, `OxoError`, `OxoOrder`, `oxoClient`, `countryName`, `sameAddress`, `K`, `AccountLink`, `ProductLink`, `PriceListLink`, `OrderLink`, `SendState`, `FailedState`, `localTime`, `tell`, `msg`.
- Produces: `FinalError`, `orderBody(ctx, order): Promise<Record<string, unknown>>`, `SendResult = "sent" | "skipped" | "waiting" | "paused" | "failed"`, `sendOrder(ctx, client, orderId, now): Promise<SendResult>`, `sweepOrders(ctx, client, now): Promise<number>`, `onOrderUpdated(input, ctx): Promise<void>`.

- [ ] **Step 1: Write the failing tests**

`plugins/oxo-erp-connector/__tests__/orders-out.test.ts`:
```ts
import type { RecordData } from "@nextcrm/plugin-sdk";
import { onOrderUpdated, sendOrder, sweepOrders } from "../orders-out";
import { K, type OrderLink } from "../store";
import { order as oxoOrder } from "./fake-oxo";
import { mk, now } from "./helpers";

const crmOrder = (over: RecordData = {}): RecordData => ({
  id: "o1", number: "ORD-2026-0001", status: "READY", source: "CRM", externalRef: null, accountId: "a1", ownerId: "u1", currency: "CZK",
  requestedDeliveryDate: "2026-10-20T00:00:00.000Z", note: "Ráno", priceListId: "L242",
  lines: [{ productId: "p537", sku: "533002", productName: "K ČKS Jahoda", quantity: "6", unitPrice: "757.76" }], ...over,
});
const answer = (over = {}) => oxoOrder(501, { number: "PRO0501", crmNumber: "ORD-2026-0001", customerId: 222, lines: [{ id: 1, productId: 11, quantity: "6", deliveredQty: "0", unitPrice: "757.76", discount: "0", listPrice: "900", belowList: true }], ...over });

async function setup(opts: { post?: (b: any) => any; linked?: boolean; order?: RecordData; settings?: Record<string, unknown> } = {}) {
  const t = mk({ post: opts.post ?? (() => ({ status: 201, body: answer() })) }, {
    accounts: [{ id: "a1", name: "Puffbox s.r.o.", company_id: "19737955", vat: "CZ19737955", billing_street: "Ulice 1", billing_city: "Praha", billing_postal_code: "11000", billing_country: "CZ", deletedAt: null }],
    users: [{ id: "u1", name: "Jana Obchodní" }], orders: [crmOrder(opts.order)],
  }, { sendOrders: true, ...opts.settings });
  await t.ctx.store.set(K.product("p537"), { oxoId: 11, ref: "537", templateId: null, categoryRef: null });
  await t.ctx.store.set(K.pricelist(3), { priceListId: "L242", ref: "242", name: "Retail_STARTER", currency: "CZK", hash: "x", syncedAt: "x", isActive: true });
  if (opts.linked !== false) {
    await t.ctx.store.set(K.customer(222), { accountId: "a1" });
    await t.ctx.store.set(K.account("a1"), { customerId: 222, syncedAt: "x", priceListId: 3, addresses: [{ id: 223, odooId: 155, name: "Sklad", street: "Dlouhá 1", city: "Praha", zip: "110 00", country: null, active: true }] });
  }
  return t;
}

describe("orders out", () => {
  it("sends a READY order once: body, SENT with oxo: ref, link with below-list lines", async () => {
    const t = await setup({ order: { shipping_street: "dlouhá 1", shipping_city: "Praha", shipping_postal_code: "11000" } });
    expect(await sendOrder(t.ctx, t.client, "o1", now)).toBe("sent");
    expect(t.oxo.calls.find((c) => c.method === "POST")?.body).toEqual({
      crmNumber: "ORD-2026-0001", customerId: 222, deliveryAddressId: 223, priceListId: 3, currency: "CZK", requestedDate: "2026-10-20",
      note: "Ráno", salesRep: "Jana Obchodní", lines: [{ productId: 11, quantity: "6", unitPrice: "757.76" }],
    });
    expect(t.data.orders[0]).toMatchObject({ status: "SENT", externalRef: "oxo:501" });
    expect(await t.ctx.store.get<OrderLink>(K.order("o1"))).toMatchObject({ oxoId: 501, number: "PRO0501", belowList: ["533002"], delivery: "none" });
    expect(await sendOrder(t.ctx, t.client, "o1", now)).toBe("skipped");
  });

  it("an unlinked account goes inline; the answer links it, with the new delivery address", async () => {
    const t = await setup({ linked: false, order: { shipping_street: "Nová 5", shipping_city: "Brno", shipping_postal_code: "60200", shipping_country: "CZ" },
      post: () => ({ status: 201, body: answer({ customerId: 900, deliveryAddressId: 901, priceListId: null }) }) });
    await sendOrder(t.ctx, t.client, "o1", now);
    const body = t.oxo.calls.find((c) => c.method === "POST")?.body;
    expect([body.customerId, body.customer, body.deliveryAddress]).toEqual([undefined,
      { name: "Puffbox s.r.o.", ico: "19737955", dic: "CZ19737955", street: "Ulice 1", city: "Praha", zip: "11000", country: "Czechia" },
      { name: "Puffbox s.r.o.", street: "Nová 5", city: "Brno", zip: "60200", country: "Czechia" }]);
    expect(await t.ctx.store.get(K.customer(900))).toEqual({ accountId: "a1" });
    expect((await t.ctx.store.get<{ customerId: number; addresses: { id: number }[] }>(K.account("a1")))).toMatchObject({ customerId: 900, addresses: [{ id: 901, street: "Nová 5" }] });
  });

  it("timeout then repeat: waits, then the same body gets 200 and the CRM has one SENT order", async () => {
    const bodies: unknown[] = [];
    const t = await setup({ post: (b) => { bodies.push(b); return { status: 200, body: answer() }; } });
    const real = t.ctx.http.fetch;
    let first = true;
    // The first POST dies at the network level, as a timeout does after OXO ERP stored the order.
    t.ctx.http.fetch = async (url: string, init?: RequestInit & { timeoutMs?: number }) => {
      if (init?.method === "POST" && first) { first = false; bodies.push(JSON.parse(String(init.body))); throw new Error("The operation was aborted due to timeout"); }
      return real(url, init);
    };
    expect(await sendOrder(t.ctx, t.client, "o1", now)).toBe("waiting");
    expect([t.data.orders[0].status, (await t.ctx.store.get<{ lastError: string }>(K.send("o1")))?.lastError]).toEqual(["READY", "OXO ERP unreachable: The operation was aborted due to timeout"]);
    expect(await sweepOrders(t.ctx, t.client, now)).toBe(1);
    expect(bodies[0]).toEqual(bodies[1]);
    expect([t.data.orders[0].status, await t.ctx.store.get(K.send("o1"))]).toEqual(["SENT", null]);
  });

  it("a day of waiting emails admins once", async () => {
    const t = await setup();
    t.oxo.down = true;
    await sendOrder(t.ctx, t.client, "o1", now);
    await sendOrder(t.ctx, t.client, "o1", new Date(now.getTime() + 25 * 3_600_000));
    await sendOrder(t.ctx, t.client, "o1", new Date(now.getTime() + 26 * 3_600_000));
    expect(t.ctx.notifications.map((x) => x.subject)).toEqual(["mail.stuckSubject"]);
  });

  it("503 writes_disabled pauses sending with one email; the order stays READY and nothing else is tried", async () => {
    const t = await setup({ post: () => new Response(JSON.stringify({ error: "writes_disabled", message: "Zápisy jsou vypnuté." }), { status: 503 }) });
    t.data.orders.push(crmOrder({ id: "o2", number: "ORD-2026-0002" }));
    expect(await sweepOrders(t.ctx, t.client, now)).toBe(1);
    expect([t.data.orders[0].status, await t.ctx.store.get(K.sendPaused) !== null]).toEqual(["READY", true]);
    expect(await sendOrder(t.ctx, t.client, "o2", now)).toBe("skipped");
    expect(t.ctx.notifications.map((x) => x.subject)).toEqual(["mail.pausedSubject"]);
  });

  it("409 and 422 end in SYNC_FAILED with OXO ERP's message and one email", async () => {
    for (const [status, error] of [[409, "conflict"], [422, "invalid"]] as const) {
      const t = await setup({ post: () => new Response(JSON.stringify({ error, message: "Objednávka ORD-2026-0001 už existuje jako PRO0500 s jinými řádky." }), { status }) });
      expect(await sendOrder(t.ctx, t.client, "o1", now)).toBe("failed");
      expect(t.data.orders[0].status).toBe("SYNC_FAILED");
      expect((await t.ctx.store.get<{ reason: string }>(K.failed("o1")))?.reason).toContain("PRO0500");
      expect(t.ctx.notifications.map((x) => x.subject)).toEqual(["mail.orderFailedSubject"]);
    }
  });

  it("a line whose product is not from OXO ERP fails without a POST", async () => {
    const t = await setup({ order: { lines: [{ productId: "pX", sku: "CRM-ONLY", quantity: "1", unitPrice: "1" }] } });
    expect(await sendOrder(t.ctx, t.client, "o1", now)).toBe("failed");
    expect(t.oxo.calls.filter((c) => c.method === "POST")).toEqual([]);
    expect((await t.ctx.store.get<{ reason: string }>(K.failed("o1")))?.reason).toBe("orders.notOxoProduct");
  });

  it("nothing is sent while sendOrders is off or in dry run", async () => {
    for (const settings of [{ sendOrders: false }, { dryRun: true }]) {
      const t = await setup({ settings });
      expect([await sendOrder(t.ctx, t.client, "o1", now), await sweepOrders(t.ctx, t.client, now)]).toEqual(["skipped", 0]);
      expect(t.oxo.calls).toEqual([]);
    }
  });

  it("the hook sends on READY and clears old state when an order leaves READY or SYNC_FAILED", async () => {
    const t = await setup({ order: { status: "DRAFT" } });
    await t.ctx.store.set(K.send("o1"), { lastError: "x", waitingSince: "x" });
    await t.ctx.store.set(K.failed("o1"), { reason: "x", at: "x" });
    await onOrderUpdated({ entity: "order", operation: "updated", recordId: "o1" }, t.ctx);
    expect([await t.ctx.store.get(K.send("o1")), await t.ctx.store.get(K.failed("o1"))]).toEqual([null, null]);
  });
});
```
- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm jest plugins/oxo-erp-connector/__tests__/orders-out.test.ts`
Expected: FAIL — cannot find module `../orders-out`.

- [ ] **Step 3: Implement**

`plugins/oxo-erp-connector/orders-out.ts`:
```ts
import type { AfterInput, RecordData } from "@nextcrm/plugin-sdk";
import { countryName, sameAddress } from "./map";
import { OxoError, oxoClient, type OxoAddress, type OxoClient, type OxoOrder } from "./oxo";
import { localTime, msg, tell, type Ctx } from "./settings";
import { K, type AccountLink, type FailedState, type OrderLink, type PriceListLink, type ProductLink, type SendState } from "./store";

const CLAIM_MS = 10 * 60_000;
const STUCK_MS = 24 * 3_600_000;

/** A failure no retry can fix: the order goes to SYNC_FAILED at once. */
export class FinalError extends Error {
  constructor(message: string) { super(message); this.name = "FinalError"; }
}

const val = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);
/** At most 4 decimals, as OXO ERP stores them; the same order always gives the same string, so a repeat matches. */
const dec = (v: unknown) => String(Number(Number(v).toFixed(4)));
const clean = <T extends Record<string, unknown>>(o: T) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as Partial<T>;

/** Spec § 4.5: the CRM order as OXO ERP's POST /orders body. */
export async function orderBody(ctx: Ctx, order: RecordData): Promise<Record<string, unknown>> {
  const account = await ctx.data.accounts.get(order.accountId as string);
  if (!account?.name) throw new FinalError(ctx.t("orders.noAccount"));
  const link = await ctx.store.get<AccountLink>(K.account(account.id as string));
  const lines: { productId: number; quantity: string; unitPrice: string }[] = [];
  for (const l of (order.lines ?? []) as RecordData[]) {
    const p = await ctx.store.get<ProductLink>(K.product(l.productId as string));
    if (!p) throw new FinalError(ctx.t("orders.notOxoProduct", { product: String(l.sku ?? l.productName ?? l.productId) }));
    lines.push({ productId: p.oxoId, quantity: dec(l.quantity), unitPrice: dec(l.unitPrice) });
  }
  const customer = link ? { customerId: link.customerId } : { customer: clean({
    name: String(account.name).slice(0, 200), ico: val(account.company_id), dic: val(account.vat), street: val(account.billing_street), city: val(account.billing_city),
    zip: val(account.billing_postal_code), country: countryName(val(account.billing_country) ?? null) ?? undefined, email: val(account.email), phone: val(account.office_phone),
  }) };
  const ship = { street: val(order.shipping_street), city: val(order.shipping_city), zip: val(order.shipping_postal_code) };
  let delivery: Record<string, unknown> = {};
  if (ship.street || ship.city) {
    const hit = link?.addresses.find((a) => sameAddress(a, ship));
    delivery = hit ? { deliveryAddressId: hit.id } : { deliveryAddress: clean({ name: String(account.name).slice(0, 200), ...ship, country: countryName(val(order.shipping_country) ?? null) ?? undefined }) };
  }
  let priceListId: number | undefined;
  if (order.priceListId) for (const e of await ctx.store.list("pricelist:")) if ((e.value as PriceListLink).priceListId === order.priceListId) priceListId = Number(e.key.slice(10));
  const owner = order.ownerId ? await ctx.data.users.get(order.ownerId as string) : null;
  return clean({
    crmNumber: String(order.number), ...customer, ...delivery, priceListId, currency: String(order.currency),
    requestedDate: order.requestedDeliveryDate ? new Date(order.requestedDeliveryDate as string).toISOString().slice(0, 10) : undefined,
    note: val(order.note)?.slice(0, 2000), salesRep: val(owner?.name)?.slice(0, 100), lines,
  });
}

/** The answer tells us the OXO ERP customer (new or matched) and a new delivery address: the account keeps both. */
async function linkCustomer(ctx: Ctx, accountId: string, o: OxoOrder, body: Record<string, unknown>, now: Date): Promise<void> {
  const prev = await ctx.store.get<AccountLink>(K.account(accountId));
  const link: AccountLink = prev ?? { customerId: o.customerId, syncedAt: now.toISOString(), priceListId: o.priceListId, addresses: [] };
  const sent = body.deliveryAddress as { name: string; street?: string; city?: string; zip?: string; country?: string } | undefined;
  if (sent && o.deliveryAddressId != null && !link.addresses.some((a) => a.id === o.deliveryAddressId)) {
    link.addresses = [...link.addresses, { id: o.deliveryAddressId, odooId: null, name: sent.name, street: sent.street ?? null, city: sent.city ?? null, zip: sent.zip ?? null, country: sent.country ?? null, active: true } satisfies OxoAddress];
  }
  if (!prev && !(await ctx.store.get(K.customer(o.customerId)))) await ctx.store.set(K.customer(o.customerId), { accountId });
  if (!prev || link.addresses !== prev.addresses) await ctx.store.set(K.account(accountId), link);
}

async function send(ctx: Ctx, client: OxoClient, order: RecordData, now: Date): Promise<void> {
  const id = order.id as string;
  const body = await orderBody(ctx, order);
  const { body: o } = await client.post<OxoOrder>("/orders", body);
  await ctx.data.orders.update(id, { status: "SENT", externalRef: `oxo:${o.id}` });
  const lines = (order.lines ?? []) as RecordData[];
  const belowList = o.lines.flatMap((l, i) => (l.belowList ? [String(lines[i]?.sku ?? lines[i]?.productName ?? l.productId)] : []));
  await ctx.store.set(K.order(id), {
    oxoId: o.id, number: o.number, state: o.state, delivery: o.delivery, deliveries: o.deliveries, belowList, sentAt: now.toISOString(), checkedAt: now.toISOString(),
  } satisfies OrderLink);
  await linkCustomer(ctx, order.accountId as string, o, body, now);
  await ctx.store.delete(K.send(id));
  ctx.log.info(`Order ${String(order.number)} sent to OXO ERP as ${o.number}`, { orderId: id, oxoId: o.id });
}

export type SendResult = "sent" | "skipped" | "waiting" | "paused" | "failed";

/** Spec § 4.5: no answer waits (a repeat is safe), a refused key or writes_disabled pauses everything, anything else OXO ERP refused fails the order. */
function kindOf(e: unknown): "waiting" | "paused" | "failed" {
  if (e instanceof FinalError) return "failed";
  if (e instanceof OxoError) {
    if (e.status === 401 || e.status === 403 || e.code === "writes_disabled") return "paused";
    if (e.status === 0 || e.status === 429 || e.status >= 500) return "waiting";
  }
  return "failed";
}

async function failed(ctx: Ctx, order: RecordData, e: unknown, now: Date): Promise<SendResult> {
  const id = order.id as string;
  const number = String(order.number);
  const reason = msg(e);
  const kind = kindOf(e);
  if (kind !== "failed") {
    const prev = await ctx.store.get<SendState>(K.send(id));
    const waitingSince = prev?.waitingSince ?? now.toISOString();
    const stuck = kind === "waiting" && !prev?.stuckNotified && now.getTime() - Date.parse(waitingSince) > STUCK_MS;
    await ctx.store.set(K.send(id), { lastError: reason, waitingSince, ...(stuck || prev?.stuckNotified ? { stuckNotified: true } : {}) } satisfies SendState);
    ctx.log.warn(`Order ${number} waits for OXO ERP: ${reason}`, { orderId: id });
    if (stuck) await tell(ctx, { roles: ["admin"], subject: ctx.t("mail.stuckSubject", { number }), text: ctx.t("mail.stuckText", { number, since: localTime(ctx, waitingSince), error: reason }) });
    if (kind === "paused" && !(await ctx.store.get(K.sendPaused))) {
      await ctx.store.set(K.sendPaused, { at: now.toISOString(), reason });
      await tell(ctx, { roles: ["admin"], subject: ctx.t("mail.pausedSubject"), text: ctx.t("mail.pausedText", { error: reason }) });
    }
    return kind;
  }
  try { await ctx.data.orders.update(id, { status: "SYNC_FAILED" }); } catch (err) { ctx.log.warn(`Order ${number}: ${msg(err)}`); }
  await ctx.store.set(K.failed(id), { reason, at: now.toISOString() } satisfies FailedState);
  await ctx.store.delete(K.send(id));
  ctx.log.error(`Order ${number} could not be sent: ${reason}`, { orderId: id });
  await tell(ctx, { roles: ["admin"], subject: ctx.t("mail.orderFailedSubject", { number }), text: ctx.t("mail.orderFailedText", { number, error: reason }) });
  return "failed";
}

const sendable = (o: RecordData | null) => !!o && o.status === "READY" && !o.externalRef;

/** One sender per order (claim), re-read before the write; Retry starts over (failed: removed). */
export async function sendOrder(ctx: Ctx, client: OxoClient, orderId: string, now: Date): Promise<SendResult> {
  if (!ctx.settings.sendOrders || ctx.settings.dryRun || (await ctx.store.get(K.sendPaused))) return "skipped";
  if (!sendable(await ctx.data.orders.get(orderId))) return "skipped";
  if (!(await ctx.store.claim(K.sending(orderId), CLAIM_MS))) return "skipped";
  try {
    const order = await ctx.data.orders.get(orderId);
    if (!sendable(order)) return "skipped";
    await ctx.store.delete(K.failed(orderId));
    try { await send(ctx, client, order!, now); return "sent"; } catch (e) { return await failed(ctx, order!, e, now); }
  } finally {
    await ctx.store.delete(K.sending(orderId));
  }
}

/** Every cron run sends READY orders without a ref: fresh ones before those already waiting; stop at the first that waits or pauses. */
export async function sweepOrders(ctx: Ctx, client: OxoClient, now: Date): Promise<number> {
  if (!ctx.settings.sendOrders || ctx.settings.dryRun) return 0;
  const rows = await ctx.data.orders.find({ where: { status: "READY", externalRef: null }, orderBy: { createdAt: "asc" }, take: 200 });
  const waiting = new Set((await ctx.store.list("send:")).map((e) => e.key.slice(5)));
  const queue = [...rows.filter((o) => !waiting.has(o.id as string)), ...rows.filter((o) => waiting.has(o.id as string))];
  let tried = 0;
  for (const o of queue) {
    if (await ctx.store.get(K.sendPaused)) break;
    tried++;
    const r = await sendOrder(ctx, client, o.id as string, now);
    if (r === "waiting" || r === "paused") break;
  }
  return tried;
}

/** Core's after-write hook fires for Submit, Approve and Retry; sendOrder ignores everything but READY. */
export async function onOrderUpdated(input: AfterInput, ctx: Ctx): Promise<void> {
  const o = await ctx.data.orders.get(input.recordId);
  if (o && o.status !== "READY") await ctx.store.delete(K.send(input.recordId));
  if (o && o.status !== "SYNC_FAILED") await ctx.store.delete(K.failed(input.recordId));
  await sendOrder(ctx, oxoClient(ctx), input.recordId, new Date());
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm jest plugins/oxo-erp-connector`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add plugins/oxo-erp-connector/orders-out.ts plugins/oxo-erp-connector/__tests__/orders-out.test.ts
git commit -m "feat(oxo-erp-connector): send READY orders to OXO ERP; safe repeat, pause, failures

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_019AXXZ8279bRB86Cn1ZRWFS"
```

### Task 7: Statuses back

**Files:**
- Create: `plugins/oxo-erp-connector/orders-status.ts`
- Modify: `plugins/oxo-erp-connector/sync.ts` (the `// ORDERS:` line in `runSync`)
- Test: `plugins/oxo-erp-connector/__tests__/orders-status.test.ts`

**Interfaces:**
- Consumes: Task 2 `OxoClient`, `OxoOrder`, `K`, `OrderLink`, `tell`, `msg`, `isAuthError`; Task 5 `runSync`, `orders` counts.
- Produces: `targetStatus(o): "CANCELLED" | "CONFIRMED" | "DELIVERED" | null`, `linkFrom(o, prev, now): OrderLink`, `syncOrderStatuses({ ctx, client, dry, now }): Promise<{ checked: number; moved: number }>`.

- [ ] **Step 1: Write the failing tests**

`plugins/oxo-erp-connector/__tests__/orders-status.test.ts`:
```ts
import { syncOrderStatuses, targetStatus } from "../orders-status";
import { runSync } from "../sync";
import { K, type OrderLink } from "../store";
import { order } from "./fake-oxo";
import { mk, now } from "./helpers";

const crm = (id: string, status: string, externalRef: string | null, source = "CRM") => ({ id, number: `ORD-${id}`, status, externalRef, source });

it("maps OXO ERP state and delivery to a CRM status; draft and approval keep it", () => {
  expect([
    targetStatus({ state: "cancel", delivery: "none" }), targetStatus({ state: "sale", delivery: "partial" }),
    targetStatus({ state: "done", delivery: "full" }), targetStatus({ state: "approval", delivery: "none" }), targetStatus({ state: "sent", delivery: "none" }),
  ]).toEqual(["CANCELLED", "CONFIRMED", "DELIVERED", null, null]);
});

describe("status sweep", () => {
  it("moves orders forward only, by OXO ERP id; keeps the link current", async () => {
    const { ctx, client, data } = mk({ orders: [order(501, { delivery: "full", deliveries: [{ number: "OUT/1", state: "DONE", doneAt: "2026-10-18T07:00:00.000Z" }] }), order(502, { state: "sale" })] },
      { orders: [crm("o1", "SENT", "oxo:501"), crm("o2", "DELIVERED", "oxo:502")] });
    const out = await syncOrderStatuses({ ctx, client, dry: false, now });
    expect(out).toEqual({ checked: 2, moved: 1 });
    expect(data.orders.map((o) => o.status)).toEqual(["DELIVERED", "DELIVERED"]);
    expect(await ctx.store.get<OrderLink>(K.order("o1"))).toMatchObject({ oxoId: 501, delivery: "full", deliveries: [{ number: "OUT/1", state: "DONE" }] });
  });

  it("pre-switch order: a CRM order sent to Odoo is tracked by its Odoo id", async () => {
    const { ctx, client, data, oxo } = mk({ orders: [order(40, { odooId: 176, state: "cancel" })] }, { orders: [crm("o9", "CONFIRMED", "176")] });
    await syncOrderStatuses({ ctx, client, dry: false, now });
    expect(oxo.calls.map((c) => c.params.odooIds ?? c.params.ids)).toEqual(["176"]);
    expect(data.orders[0].status).toBe("CANCELLED");
  });

  it("an order OXO ERP no longer has keeps its status; admins are told once", async () => {
    const { ctx, client, data } = mk({}, { orders: [crm("o1", "SENT", "oxo:999")] });
    await syncOrderStatuses({ ctx, client, dry: false, now });
    await syncOrderStatuses({ ctx, client, dry: false, now });
    expect([data.orders[0].status, ctx.notifications.map((n) => n.subject)]).toEqual(["SENT", ["mail.missingSubject"]]);
    expect((await ctx.store.get<OrderLink>(K.order("o1")))?.state).toBe("missing");
  });

  it("skips PAID, CANCELLED, READY and orders without an OXO ERP or Odoo ref; dry run writes nothing", async () => {
    const { ctx, client, data, oxo } = mk({ orders: [order(1, { delivery: "full" })] }, { orders: [crm("a", "PAID", "oxo:1"), crm("b", "READY", null), crm("c", "SENT", "oxo:1")] });
    expect(await syncOrderStatuses({ ctx, client, dry: true, now })).toEqual({ checked: 1, moved: 0 });
    expect([data.orders[2].status, await ctx.store.list("")]).toEqual(["SENT", []]);
    expect(oxo.calls).toHaveLength(1);
  });

  it("runs inside the sync and counts into the summary", async () => {
    const { ctx, client } = mk({ orders: [order(501, { delivery: "full" })] }, { orders: [crm("o1", "SENT", "oxo:501")] });
    const s = await runSync(ctx, client, now);
    expect([s.orders?.checked, s.orders?.moved]).toEqual([1, 1]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm jest plugins/oxo-erp-connector/__tests__/orders-status.test.ts`
Expected: FAIL — cannot find module `../orders-status`.

- [ ] **Step 3: Implement `orders-status.ts`**

```ts
import type { RecordData } from "@nextcrm/plugin-sdk";
import type { OxoClient, OxoOrder } from "./oxo";
import { msg, tell, type Ctx } from "./settings";
import { K, type OrderLink } from "./store";

const RANK: Record<string, number> = { SENT: 1, CONFIRMED: 2, DELIVERED: 3, INVOICED: 4, PAID: 5 };
const OPEN = ["SENT", "CONFIRMED", "DELIVERED", "INVOICED"];
const CHUNK = 200;   // OXO ERP's lookup limit

/** Spec § 4.6: null keeps the CRM status (draft, approval, Odoo's quotation states). INVOICED and PAID come with S5. */
export function targetStatus(o: Pick<OxoOrder, "state" | "delivery">): "CANCELLED" | "CONFIRMED" | "DELIVERED" | null {
  if (o.state === "cancel") return "CANCELLED";
  if (o.state !== "sale" && o.state !== "done") return null;
  return o.delivery === "full" ? "DELIVERED" : "CONFIRMED";
}

export const linkFrom = (o: OxoOrder, prev: Partial<OrderLink>, now: Date): OrderLink => ({
  belowList: [], sentAt: now.toISOString(), ...prev,
  oxoId: o.id, number: o.number, state: o.state, delivery: o.delivery, deliveries: o.deliveries, checkedAt: now.toISOString(), missingNotified: undefined,
});

async function fetchBy(client: OxoClient, param: "ids" | "odooIds", values: number[]): Promise<OxoOrder[]> {
  const out: OxoOrder[] = [];
  for (let i = 0; i < values.length; i += CHUNK) {
    out.push(...(await client.get<{ items: OxoOrder[] }>("/orders", { [param]: values.slice(i, i + CHUNK).join(",") })).items);
  }
  return out;
}

/**
 * Spec § 4.6 (+ § 10 A6): every CRM order not yet PAID or CANCELLED whose ref points at OXO ERP ("oxo:<id>", sent or imported by this
 * plugin) or at Odoo (a number: sent or imported by odoo-connector before the switch). Forward only.
 */
export async function syncOrderStatuses(a: { ctx: Ctx; client: OxoClient; dry: boolean; now: Date }): Promise<{ checked: number; moved: number }> {
  const { ctx, client, dry, now } = a;
  const out = { checked: 0, moved: 0 };
  const open = (await ctx.data.orders.find({ where: { status: { in: OPEN } }, take: 1000 }))
    .filter((o) => typeof o.externalRef === "string" && /^(oxo:)?\d+$/.test(o.externalRef));
  if (!open.length) return out;
  const isOxo = (o: RecordData) => (o.externalRef as string).startsWith("oxo:");
  const num = (o: RecordData) => Number((o.externalRef as string).replace("oxo:", ""));
  const found = new Map<string, OxoOrder>();
  for (const o of await fetchBy(client, "ids", open.filter(isOxo).map(num))) found.set(`oxo:${o.id}`, o);
  for (const o of await fetchBy(client, "odooIds", open.filter((x) => !isOxo(x)).map(num))) if (o.odooId != null) found.set(String(o.odooId), o);
  for (const order of open) {
    out.checked++;
    const orderId = order.id as string;
    const number = String(order.number);
    const prev = (await ctx.store.get<OrderLink>(K.order(orderId))) ?? undefined;
    const o = found.get(order.externalRef as string);
    if (!o) {
      if (dry) continue;
      if (!prev?.missingNotified) {
        ctx.log.warn(`OXO ERP order for ${number} was not found; the CRM keeps ${String(order.status)}`, { orderId });
        await tell(ctx, { roles: ["admin"], subject: ctx.t("mail.missingSubject", { number }), text: ctx.t("mail.missingText", { number }) });
      }
      const base: OrderLink = prev ?? { oxoId: 0, number: "", state: "", delivery: "none", deliveries: [], belowList: [], sentAt: now.toISOString(), checkedAt: now.toISOString() };
      await ctx.store.set(K.order(orderId), { ...base, state: "missing", missingNotified: true, checkedAt: now.toISOString() } satisfies OrderLink);
      continue;
    }
    const target = targetStatus(o);
    const current = String(order.status);
    const forward = target !== null && target !== current && (target === "CANCELLED" || (RANK[target] ?? 0) > (RANK[current] ?? 0));
    if (dry) { if (forward) ctx.log.info("Dry run: would set order status", { orderId, from: current, to: target }); continue; }
    if (forward) {
      try { await ctx.data.orders.update(orderId, { status: target }); out.moved++; }
      catch (e) { ctx.log.warn(`Order ${number}: ${msg(e)}`, { orderId }); }
    }
    await ctx.store.set(K.order(orderId), linkFrom(o, prev ?? {}, now));
  }
  return out;
}
```

- [ ] **Step 4: Wire into the sync**

In `sync.ts`, add the import and take `isAuthError` from `./oxo`:
```ts
import { syncOrderStatuses } from "./orders-status";
import { isAuthError, oxoClient, type OxoClient } from "./oxo";
```
(replacing the existing `import { oxoClient, type OxoClient } from "./oxo";`)
and replace the line `// ORDERS: Tasks 7 and 8 add the status sweep and the import of OXO ERP orders here.` with:
```ts
    try {
      Object.assign(orders, await syncOrderStatuses({ ctx, client, dry, now }));
    } catch (e) {
      if (isAuthError(e)) throw e;
      ctx.log.error(`Order statuses failed: ${msg(e)}`);
    }
    // ORDERS IN: Task 8 adds the import of OXO ERP orders here.
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm jest plugins/oxo-erp-connector`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add plugins/oxo-erp-connector/orders-status.ts plugins/oxo-erp-connector/sync.ts plugins/oxo-erp-connector/__tests__/orders-status.test.ts
git commit -m "feat(oxo-erp-connector): order statuses back from OXO ERP, pre-switch orders by Odoo id

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_019AXXZ8279bRB86Cn1ZRWFS"
```

### Task 8: Orders in

**Files:**
- Create: `plugins/oxo-erp-connector/orders-in.ts`
- Modify: `plugins/oxo-erp-connector/sync.ts` (the `// ORDERS IN:` line)
- Test: `plugins/oxo-erp-connector/__tests__/orders-in.test.ts`

**Interfaces:**
- Consumes: Task 2 `ref`, `OxoClient`, `OxoOrder`, `K`, `OrderLink`; Task 4 `productMap`; Task 7 `linkFrom`, `targetStatus`; Task 5 `orders`, `ordersTop`.
- Produces: `crmLines(products, o)`, `noteFor(ctx, note, missing)`, `syncOrdersIn({ ctx, client, dry, now }): Promise<{ imported: number; updated: number; pending: number; top: string | null }>`.

- [ ] **Step 1: Write the failing tests**

`plugins/oxo-erp-connector/__tests__/orders-in.test.ts`:
```ts
import { syncOrdersIn } from "../orders-in";
import { runSync } from "../sync";
import { K, type OrderLink } from "../store";
import { customer, order } from "./fake-oxo";
import { mk, now } from "./helpers";

const line = (id: number, productId: number, over = {}) => ({ id, productId, quantity: "6", deliveredQty: "0", unitPrice: "100", discount: "10", listPrice: "100", belowList: false, ...over });

async function setup(orders: ReturnType<typeof order>[], data: Record<string, any[]> = {}) {
  const t = mk({ orders }, data);
  await t.ctx.store.set(K.customer(1), { accountId: "a1" });
  await t.ctx.store.set(K.product("p11"), { oxoId: 11, ref: "537", templateId: null, categoryRef: null });
  return t;
}

describe("orders in", () => {
  it("imports an OXO ERP order as EXTERNAL with the charged price; lines of unknown products are counted in the note", async () => {
    const { ctx, client, data } = await setup([order(70, { note: "Telefonicky", delivery: "full", lines: [line(1, 11), line(2, 99)] })]);
    const out = await syncOrdersIn({ ctx, client, dry: false, now });
    expect([out.imported, out.top]).toEqual([1, "2026-10-18T08:00:00.000Z"]);
    expect(data.orders[0]).toMatchObject({ accountId: "a1", externalRef: "oxo:70", status: "DELIVERED", currency: "CZK", orderDate: "2026-10-17", note: "Telefonicky\norders.linesMissing",
      lines: [{ productId: "p11", quantity: "6", unitPrice: "90" }] });
    expect(await ctx.store.get<OrderLink>(K.order(data.orders[0].id as string))).toMatchObject({ oxoId: 70, imported: true, missing: 1 });
  });

  it("updates an order odoo-connector imported (same Odoo id) instead of creating a second one", async () => {
    const { ctx, client, data } = await setup([order(40, { odooId: 176, lines: [line(1, 11, { discount: "0" })] })],
      { orders: [{ id: "x1", source: "EXTERNAL", externalRef: "176", status: "CONFIRMED", lines: [] }] });
    const out = await syncOrdersIn({ ctx, client, dry: false, now });
    expect([out.imported, out.updated, data.orders.length]).toEqual([0, 1, 1]);
    expect(data.orders[0].lines).toEqual([{ productId: "p11", quantity: "6", unitPrice: "100" }]);
  });

  it("skips CRM orders: ones it sent (crmNumber) and ones sent to Odoo before the switch", async () => {
    const { ctx, client, data } = await setup([order(1, { crmNumber: "ORD-1" }), order(2, { odooId: 300 })], { orders: [{ id: "c1", source: "CRM", externalRef: "300", status: "SENT" }] });
    const out = await syncOrdersIn({ ctx, client, dry: false, now });
    expect([out.imported, out.updated, data.orders.length]).toEqual([0, 0, 1]);
  });

  it("pending order: waits for its customer and is imported once linked, without an OXO ERP change", async () => {
    const { ctx, client, data } = await setup([order(80, { customerId: 2, lines: [line(1, 11)] })]);
    let out = await syncOrdersIn({ ctx, client, dry: false, now });
    expect([out.pending, data.orders.length]).toEqual([1, 0]);
    await ctx.store.set(K.customer(2), { accountId: "a2" });
    await ctx.store.set(K.cursor("orders"), { at: "2026-10-19T00:00:00.000Z" });
    out = await syncOrdersIn({ ctx, client, dry: false, now });
    expect([out.imported, data.orders[0]?.accountId, await ctx.store.get(K.pending(80))]).toEqual([1, "a2", null]);
  });

  it("an unchanged order is not written again; dry run writes nothing", async () => {
    const { ctx, client, data } = await setup([order(70, { lines: [line(1, 11)] })]);
    const dry = await syncOrdersIn({ ctx, client, dry: true, now });
    expect([dry.imported, data.orders.length]).toEqual([1, 0]);
    await syncOrdersIn({ ctx, client, dry: false, now });
    const again = await syncOrdersIn({ ctx, client, dry: false, now });
    expect([again.imported, again.updated]).toEqual([0, 0]);
  });

  it("runs inside the sync after the customers, moves the orders cursor", async () => {
    const { ctx, client, data } = mk({ customers: [customer(1)], orders: [order(70, { lines: [] })] });
    const s = await runSync(ctx, client, now);
    expect([s.orders?.imported, data.orders.length, await ctx.store.get(K.cursor("orders"))]).toEqual([1, 1, { at: "2026-10-18T08:00:00.000Z" }]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm jest plugins/oxo-erp-connector/__tests__/orders-in.test.ts`
Expected: FAIL — cannot find module `../orders-in`.

- [ ] **Step 3: Implement `orders-in.ts`**

```ts
import type { OrderLineInput } from "@nextcrm/plugin-sdk";
import { productMap } from "./catalog";
import { ref } from "./map";
import type { OxoClient, OxoOrder } from "./oxo";
import { linkFrom, targetStatus } from "./orders-status";
import type { Ctx } from "./settings";
import { K, type OrderLink } from "./store";

const OVERLAP_MS = 2 * 60_000;

/** Lines of CRM products only; the CRM line carries the price actually charged (after OXO ERP's discount). */
export function crmLines(products: Map<number, string>, o: OxoOrder): { lines: OrderLineInput[]; missing: number } {
  const lines: OrderLineInput[] = [];
  let missing = 0;
  for (const l of o.lines) {
    const productId = products.get(l.productId);
    if (!productId) { missing++; continue; }
    lines.push({ productId, quantity: l.quantity, unitPrice: String(Number((Number(l.unitPrice) * (1 - Number(l.discount) / 100)).toFixed(4))) });
  }
  return { lines, missing };
}

export const noteFor = (ctx: Ctx, note: string | null, missing: number): string | null =>
  [note ?? "", missing ? ctx.t("orders.linesMissing", { count: missing }) : ""].filter(Boolean).join("\n") || null;

/**
 * Spec § 4.7: confirmed OXO ERP orders not made by the CRM, created or updated as EXTERNAL orders by ref, so old Odoo orders
 * odoo-connector imported are updated, not duplicated. An order whose customer is not linked waits in the store and is
 * re-tried every run. Statuses of imported orders move in the status sweep.
 */
export async function syncOrdersIn(a: { ctx: Ctx; client: OxoClient; dry: boolean; now: Date }): Promise<{ imported: number; updated: number; pending: number; top: string | null }> {
  const { ctx, client, dry, now } = a;
  const cursor = (await ctx.store.get<{ at: string }>(K.cursor("orders")))?.at ?? null;
  const since = cursor ? new Date(Date.parse(cursor) - OVERLAP_MS).toISOString() : null;
  const fresh = await client.all<OxoOrder>("/orders", since ? { updatedSince: since } : {});
  const waiting = (await ctx.store.list("pending:")).map((e) => (e.value as { order: OxoOrder }).order);
  const products = await productMap(ctx);
  const out = { imported: 0, updated: 0, pending: 0, top: cursor };
  const seen = new Set<number>();
  for (const o of [...fresh, ...waiting]) {
    if (fresh.includes(o) && (!out.top || o.updatedAt > out.top)) out.top = o.updatedAt;
    if (seen.has(o.id)) continue;
    seen.add(o.id);
    if (o.crmNumber) continue;   // sent by the CRM: the status sweep follows it
    const r = ref(o);
    const [existing] = await ctx.data.orders.find({ where: { externalRef: r }, take: 1 });
    if (existing?.source === "CRM") { if (!dry) await ctx.store.delete(K.pending(o.id)); continue; }   // sent to Odoo before the switch
    const accountId = (await ctx.store.get<{ accountId: string }>(K.customer(o.customerId)))?.accountId;
    if (!accountId) {
      out.pending++;
      if (!dry) await ctx.store.set(K.pending(o.id), { order: o });
      continue;
    }
    const prev = existing ? await ctx.store.get<OrderLink>(K.order(existing.id as string)) : null;
    if (prev?.updatedAt === o.updatedAt) { if (!dry) await ctx.store.delete(K.pending(o.id)); continue; }
    const { lines, missing } = crmLines(products, o);
    if (dry) { out[existing ? "updated" : "imported"]++; continue; }
    let orderId: string;
    if (existing) {
      orderId = existing.id as string;
      await ctx.data.orders.update(orderId, { lines, note: noteFor(ctx, o.note, missing), orderDate: o.orderedAt.slice(0, 10) });
      out.updated++;
    } else {
      orderId = (await ctx.data.orders.create({
        accountId, externalRef: r, status: targetStatus(o) ?? "CONFIRMED", currency: o.currency, orderDate: o.orderedAt.slice(0, 10), note: noteFor(ctx, o.note, missing), lines,
      })).id as string;
      out.imported++;
    }
    await ctx.store.set(K.order(orderId), { ...linkFrom(o, prev ?? {}, now), imported: true, updatedAt: o.updatedAt, missing } satisfies OrderLink);
    await ctx.store.delete(K.pending(o.id));
  }
  return out;
}
```

- [ ] **Step 4: Wire into the sync**

In `sync.ts`, add the import:
```ts
import { syncOrdersIn } from "./orders-in";
```
and replace `// ORDERS IN: Task 8 adds the import of OXO ERP orders here.` with:
```ts
    try {
      const inn = await syncOrdersIn({ ctx, client, dry, now });
      Object.assign(orders, { imported: inn.imported, updated: inn.updated, pending: inn.pending });
      ordersTop = inn.top;
    } catch (e) {
      if (isAuthError(e)) throw e;
      ctx.log.error(`Orders from OXO ERP failed: ${msg(e)}`);
    }
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm jest plugins/oxo-erp-connector`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add plugins/oxo-erp-connector/orders-in.ts plugins/oxo-erp-connector/sync.ts plugins/oxo-erp-connector/__tests__/orders-in.test.ts
git commit -m "feat(oxo-erp-connector): import OXO ERP orders; take over odoo-connector's imports; pending orders

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_019AXXZ8279bRB86Cn1ZRWFS"
```

### Task 9: Screens

**Files:**
- Create: `plugins/oxo-erp-connector/ui/data.ts`, `ui/AccountPanel.tsx`, `ui/AccountTab.tsx`, `ui/ProductPanel.tsx`, `ui/OrderPanel.tsx`, `ui/NeedsOwnerPage.tsx`, `ui/AdminSection.tsx`
- Test: `plugins/oxo-erp-connector/__tests__/ui.test.ts`

**Interfaces:**
- Consumes: Task 2 `K`, link types, `localTime`, `chosenLists`; Task 5 `summaryText`.
- Produces: `needsOwner(ctx)`, `panelData(ctx, accountId)`, `productPanelData(ctx, productId)`, `orderPanelData(ctx, orderId)`, `accountTabData(ctx, accountId)`, `catalogData(ctx)`, `ordersData(ctx, now)`; components `AccountPanel`, `AccountTab`, `ProductPanel`, `OrderPanel`, `NeedsOwnerPage`, `AdminSection`.

- [ ] **Step 1: Write the failing tests**

`plugins/oxo-erp-connector/__tests__/ui.test.ts`:
```ts
import { accountTabData, catalogData, needsOwner, orderPanelData, ordersData, panelData, productPanelData } from "../ui/data";
import { K } from "../store";
import { mk, now } from "./helpers";

const T = "2026-10-18T08:00:00.000Z";

it("lists linked accounts without an owner", async () => {
  const { ctx } = mk({}, { accounts: [{ id: "a1", name: "No owner", assigned_to: null, deletedAt: null }, { id: "a2", name: "Owned", assigned_to: "u1", deletedAt: null }] });
  for (const id of ["a1", "a2"]) await ctx.store.set(K.account(id), { customerId: 1, syncedAt: T, priceListId: null, addresses: [] });
  expect(await needsOwner(ctx)).toEqual([{ accountId: "a1", name: "No owner" }]);
});

it("account panel: customer id, price list, active addresses, inactive flag", async () => {
  const { ctx } = mk();
  expect(await panelData(ctx, "a1")).toBeNull();
  await ctx.store.set(K.account("a1"), { customerId: 222, syncedAt: T, priceListId: 3, inactive: true, addresses: [{ id: 223, odooId: null, name: "Sklad", street: "Dlouhá 1", city: "Praha", zip: "11000", country: null, active: true }] });
  await ctx.store.set(K.pricelist(3), { priceListId: "L", ref: "242", name: "Retail_STARTER", currency: "CZK", hash: "x", syncedAt: T, isActive: true });
  expect(await panelData(ctx, "a1")).toEqual({ customerId: 222, syncedAt: T, inactive: true, priceList: { id: 3, name: "Retail_STARTER", imported: true },
    addresses: [{ id: 223, text: "Sklad, Dlouhá 1, 11000 Praha" }] });
});

it("product panel shows only products this plugin links", async () => {
  const { ctx } = mk();
  expect(await productPanelData(ctx, "p1")).toBeNull();
  await ctx.store.set(K.product("p1"), { oxoId: 11, ref: "537", templateId: null, categoryRef: null });
  expect(await productPanelData(ctx, "p1")).toEqual({ oxoId: 11, ref: "537" });
});

it("order panel: link with an OXO ERP URL, waiting and failed states", async () => {
  const { ctx } = mk({}, { orders: [{ id: "o1", status: "SYNC_FAILED" }] });
  expect(await orderPanelData(ctx, "o1")).toBeNull();
  await ctx.store.set(K.failed("o1"), { reason: "boom", at: T });
  await ctx.store.set(K.order("o1"), { oxoId: 501, number: "PRO0501", state: "sale", delivery: "partial", deliveries: [], belowList: ["533002"], sentAt: T, checkedAt: T });
  expect(await orderPanelData(ctx, "o1")).toMatchObject({ link: { number: "PRO0501", url: "https://erp.example.com/prodej/501", belowList: ["533002"] }, waiting: null, failed: { reason: "boom" } });
});

it("account tab lists the account's linked orders, newest first", async () => {
  const { ctx } = mk({}, { orders: [
    { id: "o1", accountId: "a1", number: "ORD-1", orderDate: "2026-10-01", subtotal: "600", currency: "CZK", status: "DELIVERED" },
    { id: "o2", accountId: "a1", number: "ORD-2", orderDate: "2026-10-10", subtotal: "100", currency: "CZK", status: "SENT" },
  ] });
  await ctx.store.set(K.account("a1"), { customerId: 1, syncedAt: T, priceListId: null, addresses: [] });
  await ctx.store.set(K.order("o1"), { oxoId: 1, number: "PRO1", state: "sale", delivery: "full", deliveries: [], belowList: [], sentAt: T, checkedAt: T, imported: true });
  await ctx.store.set(K.order("o2"), { oxoId: 2, number: "PRO2", state: "sale", delivery: "none", deliveries: [], belowList: [], sentAt: T, checkedAt: T });
  expect((await accountTabData(ctx, "a1"))?.orders.map((o) => [o.number, o.oxoNumber, o.delivery, o.imported])).toEqual([["ORD-2", "PRO2", "none", false], ["ORD-1", "PRO1", "full", true]]);
});

it("admin data: chosen lists, skipped rules, queued sync, order counts", async () => {
  const { ctx } = mk({}, { orders: [{ id: "o1", status: "READY", externalRef: null }] }, { priceLists: "3", sendOrders: true });
  await ctx.store.set(K.oxoLists, { at: T, lists: [{ id: 3, odooId: 242, name: "Retail_STARTER", currency: "CZK", rules: 2 }, { id: 4, odooId: null, name: "Wholesale", currency: "CZK", rules: 1 }] });
  await ctx.store.set(K.pricelist(3), { priceListId: "L", ref: "242", name: "Retail_STARTER", currency: "CZK", hash: "x", syncedAt: T, isActive: true });
  await ctx.store.set(K.skipped(3), [{ ruleId: 9, reason: "category Nope not in the CRM" }]);
  await ctx.store.set(K.job, { requestedAt: T });
  await ctx.store.set(K.pending(80), { order: {} });
  const c = await catalogData(ctx);
  expect([c.lists?.map((l) => [l.id, l.chosen]), c.skipped, c.queued]).toEqual([[[3, true], [4, false]], [{ list: "Retail_STARTER", ruleId: 9, reason: "category Nope not in the CRM" }], true]);
  expect(await ordersData(ctx, now)).toMatchObject({ enabled: true, waiting: 1, sent: 0, failed: [], paused: null, pending: 1 });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm jest plugins/oxo-erp-connector/__tests__/ui.test.ts`
Expected: FAIL — cannot find module `../ui/data`.

- [ ] **Step 3: Implement `ui/data.ts`**

```ts
import { chosenLists, type Ctx } from "../settings";
import { K, type AccountLink, type FailedState, type OrderLink, type PriceListLink, type ProductLink, type SendState } from "../store";

const base = (ctx: Ctx) => ctx.settings.url.replace(/\/+$/, "");

/** Every linked account without an owner (§ 10 A6). */
export async function needsOwner(ctx: Ctx): Promise<{ accountId: string; name: string }[]> {
  const out: { accountId: string; name: string }[] = [];
  for (const e of await ctx.store.list("account:")) {
    const accountId = e.key.slice(8);
    const acc = await ctx.data.accounts.get(accountId);
    if (acc && acc.deletedAt == null && !acc.assigned_to) out.push({ accountId, name: String(acc.name ?? accountId) });
  }
  return out;
}

export async function panelData(ctx: Ctx, accountId: string) {
  const link = await ctx.store.get<AccountLink>(K.account(accountId));
  if (!link) return null;
  const list = link.priceListId != null ? await ctx.store.get<PriceListLink>(K.pricelist(link.priceListId)) : null;
  return {
    customerId: link.customerId, syncedAt: link.syncedAt, inactive: !!link.inactive,
    priceList: link.priceListId != null ? { id: link.priceListId, name: list?.name ?? null, imported: !!list?.isActive } : null,
    addresses: link.addresses.map((a) => ({ id: a.id, text: [a.name, a.street, [a.zip, a.city].filter(Boolean).join(" ")].filter(Boolean).join(", ") })),
  };
}

export async function productPanelData(ctx: Ctx, productId: string) {
  const link = await ctx.store.get<ProductLink>(K.product(productId));
  return link ? { oxoId: link.oxoId, ref: link.ref } : null;
}

export async function orderPanelData(ctx: Ctx, orderId: string) {
  const link = await ctx.store.get<OrderLink>(K.order(orderId));
  const status = (await ctx.data.orders.get(orderId))?.status;
  const waiting = status === "READY" ? await ctx.store.get<SendState>(K.send(orderId)) : null;
  const failed = status === "SYNC_FAILED" ? await ctx.store.get<FailedState>(K.failed(orderId)) : null;
  if (!link && !waiting && !failed) return null;
  return { link: link ? { ...link, url: `${base(ctx)}/prodej/${link.oxoId}` } : null, waiting, failed };
}

const day = (v: unknown) => (v instanceof Date ? v.toISOString() : String(v)).slice(0, 10);

/** Built from storage and CRM data only; no OXO ERP call. */
export async function accountTabData(ctx: Ctx, accountId: string) {
  const link = await ctx.store.get<AccountLink>(K.account(accountId));
  if (!link) return null;
  const orders: { orderId: string; number: string; oxoNumber: string; date: string; total: number; currency: string; status: string; delivery: string; imported: boolean }[] = [];
  for (const o of await ctx.data.orders.find({ where: { accountId }, orderBy: { orderDate: "desc" }, take: 500 })) {
    const l = await ctx.store.get<OrderLink>(K.order(o.id as string));
    if (!l) continue;
    orders.push({ orderId: o.id as string, number: String(o.number), oxoNumber: l.number, date: day(o.orderDate), total: Number(o.subtotal), currency: String(o.currency), status: String(o.status), delivery: l.delivery, imported: !!l.imported });
    if (orders.length === 50) break;
  }
  return { customerId: link.customerId, orders };
}

export async function catalogData(ctx: Ctx) {
  const chosen = new Set(chosenLists(ctx));
  const loaded = await ctx.store.get<{ at: string; lists: { id: number; odooId: number | null; name: string; currency: string; rules: number }[] }>(K.oxoLists);
  const skipped: { list: string; ruleId: number; reason: string }[] = [];
  for (const e of await ctx.store.list("skipped:")) {
    const link = await ctx.store.get<PriceListLink>(K.pricelist(Number(e.key.slice(8))));
    for (const s of e.value as { ruleId: number; reason: string }[]) skipped.push({ list: link?.name ?? e.key.slice(8), ...s });
  }
  return {
    lists: loaded ? loaded.lists.map((l) => ({ ...l, chosen: chosen.has(l.id) })) : null,
    loadedAt: loaded?.at ?? null, skipped, queued: !!(await ctx.store.get(K.job)),
  };
}

export async function ordersData(ctx: Ctx, now: Date) {
  const waiting = ctx.settings.sendOrders ? (await ctx.data.orders.find({ where: { status: "READY", externalRef: null }, take: 500 })).length : 0;
  const since = now.getTime() - 7 * 86_400_000;
  const sent = (await ctx.store.list("order:")).filter((e) => !(e.value as OrderLink).imported && Date.parse((e.value as OrderLink).sentAt) >= since).length;
  const failed: ({ orderId: string; number: string } & FailedState)[] = [];
  for (const e of await ctx.store.list("failed:")) {
    const orderId = e.key.slice(7);
    const o = await ctx.data.orders.get(orderId);
    failed.push({ orderId, number: String(o?.number ?? orderId), ...(e.value as FailedState) });
  }
  return {
    enabled: ctx.settings.sendOrders, waiting, sent, failed,
    paused: await ctx.store.get<{ at: string; reason: string }>(K.sendPaused),
    pending: (await ctx.store.list("pending:")).length,
  };
}
```
In the "admin data" test, `sent` is 0 because no `order:` link exists; the `orders` row has no `sentAt`.

- [ ] **Step 4: Implement the components**

`ui/NeedsOwnerPage.tsx`:
```tsx
import type { PageProps } from "@nextcrm/plugin-sdk";
import type { Settings, Secrets } from "../settings";
import { needsOwner } from "./data";

export async function NeedsOwnerPage({ ctx }: PageProps<Settings, Secrets>) {
  const rows = await needsOwner(ctx);
  return (
    <div className="space-y-3 p-4 text-sm">
      <h1 className="text-xl font-semibold">{ctx.t("needsOwner.title")}</h1>
      <p className="text-muted-foreground">{ctx.t("needsOwner.help")}</p>
      {rows.length === 0 ? <p className="text-muted-foreground">{ctx.t("needsOwner.empty")}</p> : (
        <ul className="space-y-1">{rows.map((r) => <li key={r.accountId}><a className="underline" href={`/crm/accounts/${r.accountId}`}>{r.name}</a></li>)}</ul>
      )}
    </div>
  );
}
```
`ui/AccountPanel.tsx`:
```tsx
import type { AccountSlotProps } from "@nextcrm/plugin-sdk";
import { localTime, type Settings, type Secrets } from "../settings";
import { panelData } from "./data";

export async function AccountPanel({ accountId, ctx }: AccountSlotProps<Settings, Secrets>) {
  const d = await panelData(ctx, accountId);
  if (!d) return null;
  return (
    <div className="space-y-1 rounded-md border p-3 text-sm">
      <div className="font-medium">OXO ERP</div>
      <div>{ctx.t("panel.linked", { id: d.customerId })}</div>
      <div className="text-muted-foreground">{ctx.t("panel.synced", { date: localTime(ctx, d.syncedAt) })}</div>
      <div className="text-muted-foreground">{ctx.t("panel.fields")}</div>
      {d.priceList && <div>{d.priceList.imported ? ctx.t("panel.priceList", { name: d.priceList.name ?? String(d.priceList.id) }) : ctx.t("panel.priceListMissing", { id: d.priceList.id })}</div>}
      {d.addresses.length > 0 && (
        <div>
          <div className="font-medium">{ctx.t("panel.addresses")}</div>
          <ul className="text-xs">{d.addresses.map((a) => <li key={a.id}>{a.text}</li>)}</ul>
        </div>
      )}
      {d.inactive && <div className="text-destructive">{ctx.t("panel.inactive")}</div>}
    </div>
  );
}
```
`ui/ProductPanel.tsx`:
```tsx
import type { ProductSlotProps } from "@nextcrm/plugin-sdk";
import type { Settings, Secrets } from "../settings";
import { productPanelData } from "./data";

export async function ProductPanel({ productId, ctx }: ProductSlotProps<Settings, Secrets>) {
  const d = await productPanelData(ctx, productId);
  if (!d) return null;
  return (
    <div className="space-y-1 rounded-md border p-3 text-sm">
      <div className="font-medium">OXO ERP</div>
      <div>{ctx.t("product.linked", { id: d.oxoId })}</div>
    </div>
  );
}
```
`ui/OrderPanel.tsx`:
```tsx
import type { OrderSlotProps } from "@nextcrm/plugin-sdk";
import { localTime, type Settings, type Secrets } from "../settings";
import { orderPanelData } from "./data";

export async function OrderPanel({ orderId, ctx }: OrderSlotProps<Settings, Secrets>) {
  const d = await orderPanelData(ctx, orderId);
  if (!d) return null;
  const l = d.link;
  return (
    <div className="space-y-2 rounded-md border p-3 text-sm">
      <div className="font-medium">OXO ERP</div>
      {l && (
        <>
          <a className="underline" href={l.url} target="_blank" rel="noreferrer">{ctx.t("order.linked", { number: l.number })}</a>
          {l.state === "missing" ? <div className="text-amber-600">{ctx.t("order.missing")}</div> : (
            <div className="text-muted-foreground">{ctx.t("order.state", { state: l.state })} · {ctx.t(`order.delivery.${l.delivery}`)}</div>
          )}
          {l.imported && <div className="text-muted-foreground">{ctx.t("order.imported")}</div>}
          {l.belowList.length > 0 && <div className="text-amber-600">{ctx.t("order.belowList", { lines: l.belowList.join(", ") })}</div>}
          {l.deliveries.length > 0 && (
            <div>
              <div className="font-medium">{ctx.t("order.deliveries")}</div>
              <ul className="text-xs">{l.deliveries.map((p) => <li key={p.number}>{p.number} · {p.state}{p.doneAt ? ` · ${p.doneAt.slice(0, 10)}` : ""}</li>)}</ul>
            </div>
          )}
        </>
      )}
      {d.waiting && (
        <div>
          <div>{ctx.t("order.waiting", { date: localTime(ctx, d.waiting.waitingSince) })}</div>
          <div className="text-xs text-muted-foreground">{ctx.t("order.lastError", { error: d.waiting.lastError })}</div>
        </div>
      )}
      {d.failed && <div className="text-destructive">{ctx.t("order.failed", { reason: d.failed.reason })}</div>}
    </div>
  );
}
```
`ui/AccountTab.tsx`:
```tsx
import type { AccountSlotProps } from "@nextcrm/plugin-sdk";
import type { Settings, Secrets } from "../settings";
import { accountTabData } from "./data";

export async function AccountTab({ accountId, ctx }: AccountSlotProps<Settings, Secrets>) {
  const d = await accountTabData(ctx, accountId);
  if (!d) return <p className="text-sm text-muted-foreground">{ctx.t("tab.notLinked")}</p>;
  return (
    <div className="space-y-2 text-sm">
      <h3 className="font-medium">{ctx.t("tab.orders")}</h3>
      {d.orders.length === 0 ? <p className="text-muted-foreground">{ctx.t("tab.ordersEmpty")}</p> : (
        <table className="w-full text-xs [&_td]:pr-3 [&_th]:pr-3">
          <thead><tr className="text-left"><th>{ctx.t("tab.number")}</th><th>{ctx.t("tab.oxo")}</th><th>{ctx.t("tab.date")}</th><th className="text-right">{ctx.t("tab.total")}</th><th>{ctx.t("tab.status")}</th><th>{ctx.t("tab.delivery")}</th></tr></thead>
          <tbody>{d.orders.map((o) => (
            <tr key={o.orderId}><td><a className="underline" href={`/crm/orders/${o.orderId}`}>{o.number}</a></td><td>{o.oxoNumber}</td><td>{o.date}</td><td className="text-right">{o.total.toFixed(2)} {o.currency}</td><td>{o.status}</td><td>{ctx.t(`order.delivery.${o.delivery}`)}</td></tr>
          ))}</tbody>
        </table>
      )}
    </div>
  );
}
```
`ui/AdminSection.tsx`:
```tsx
import type { AdminSectionProps } from "@nextcrm/plugin-sdk";
import { localTime, type Settings, type Secrets } from "../settings";
import { K, type Conflict, type ReportRow, type RunSummary } from "../store";
import { summaryText } from "../sync";
import { catalogData, ordersData } from "./data";

function Rows({ title, rows }: { title: string; rows: ReportRow[] }) {
  if (!rows.length) return null;
  return (
    <div>
      <h4 className="font-medium">{title}</h4>
      <ul className="text-xs">{rows.map((r) => (
        <li key={r.customerId}>{r.name} (#{r.customerId}){r.accountId ? <> → <a className="underline" href={`/crm/accounts/${r.accountId}`}>{r.accountId.slice(0, 8)}</a></> : null}</li>
      ))}</ul>
    </div>
  );
}

export async function AdminSection({ ctx }: AdminSectionProps<Settings, Secrets>) {
  const last = await ctx.store.get<RunSummary>(K.lastRun);
  const report = await ctx.store.get<RunSummary>(K.report);
  const conflicts = (await ctx.store.list("conflict:")).map((e) => e.value as Conflict);
  const c = await catalogData(ctx);
  const o = await ordersData(ctx, new Date());
  const time = (iso: string) => localTime(ctx, iso);
  const next = last ? new Date(Date.parse(last.at) + ctx.settings.syncMinutes * 60_000) : null;
  return (
    <div className="space-y-3 rounded-md border p-4 text-sm">
      {ctx.settings.dryRun && <p className="font-medium text-amber-600">{ctx.t("admin.dryRun")}</p>}
      <p>{ctx.t("admin.lastRun")}: {last ? `${time(last.at)} · ${summaryText(ctx, last)}` : ctx.t("admin.never")}</p>
      {next && !ctx.settings.dryRun && <p>{ctx.t("admin.nextRun")}: {time(next.toISOString())}</p>}
      {last?.catalog && last.catalog.listsMissing.length > 0 && <p className="text-destructive">{ctx.t("admin.listsMissing", { ids: last.catalog.listsMissing.join(", ") })}</p>}
      {report && (
        <div className="space-y-1">
          <h3 className="font-medium">{ctx.t("admin.report", { date: time(report.at) })}</h3>
          <p>{summaryText(ctx, report)}</p>
          <Rows title={ctx.t("admin.nameLinks")} rows={report.rows.name} />
          <Rows title={ctx.t("admin.createdRows")} rows={report.rows.created} />
        </div>
      )}
      <div>
        <h3 className="mb-1 font-medium">{ctx.t("admin.conflicts")}</h3>
        {conflicts.length === 0 ? <p className="text-muted-foreground">{ctx.t("admin.conflictsEmpty")}</p> : (
          <>
            <p className="text-muted-foreground">{ctx.t("admin.conflictsHelp")}</p>
            <ul className="space-y-1">{conflicts.map((x) => (
              <li key={x.customerId}>
                {x.name} (#{x.customerId}) · {ctx.t(`admin.reason.${x.reason}`)} · {x.candidates.map((id, i) => <a key={id} className="underline" href={`/crm/accounts/${id}`}>{i ? ", " : ""}{id.slice(0, 8)}</a>)}
              </li>
            ))}</ul>
          </>
        )}
      </div>
      <div className="space-y-2">
        <h3 className="font-medium">{ctx.t("admin.catalog")}</h3>
        <p className="text-muted-foreground">{ctx.t("admin.priceListsHelp")}</p>
        {c.lists ? (
          <div>
            <p>{ctx.t("admin.listsLoadedAt", { date: time(c.loadedAt!) })}</p>
            <table className="mt-1 text-xs">
              <tbody>{c.lists.map((l) => (
                <tr key={l.id}><td className="pr-3">{l.chosen ? "✓" : ""}</td><td className="pr-3">{l.id}</td><td className="pr-3">{l.name}</td><td className="pr-3">{l.currency}</td><td>{l.rules}</td></tr>
              ))}</tbody>
            </table>
          </div>
        ) : <p className="text-muted-foreground">{ctx.t("admin.listsNotLoaded")}</p>}
        {c.skipped.length > 0 && (
          <div>
            <h4 className="font-medium">{ctx.t("admin.skippedRules")}</h4>
            <ul className="text-xs">{c.skipped.map((s) => <li key={`${s.list}:${s.ruleId}`}>{s.list} · #{s.ruleId} · {s.reason}</li>)}</ul>
          </div>
        )}
        {c.queued && <p>{ctx.t("admin.syncQueued")}</p>}
      </div>
      <div className="space-y-2">
        <h3 className="font-medium">{ctx.t("admin.orders")}</h3>
        {!o.enabled ? <p className="text-muted-foreground">{ctx.t("admin.ordersOff")}</p> : <p>{ctx.t("admin.ordersCounts", { waiting: o.waiting, sent: o.sent, failed: o.failed.length })}</p>}
        {o.pending > 0 && <p>{ctx.t("admin.pending", { count: o.pending })}</p>}
        {o.paused && <p className="text-destructive">{ctx.t("admin.ordersPaused", { date: time(o.paused.at), reason: o.paused.reason })}</p>}
        {o.failed.length > 0 && (
          <ul className="text-xs">{o.failed.map((f) => <li key={f.orderId}><a className="underline" href={`/crm/orders/${f.orderId}`}>{f.number}</a> · {f.reason}</li>)}</ul>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm jest plugins/oxo-erp-connector`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add plugins/oxo-erp-connector/ui plugins/oxo-erp-connector/__tests__/ui.test.ts
git commit -m "feat(oxo-erp-connector): account, product and order panels, account tab, needs-owner page, admin section

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_019AXXZ8279bRB86Cn1ZRWFS"
```

### Task 10: Plugin definition, messages, registry

**Files:**
- Create: `plugins/oxo-erp-connector/plugin.ts`
- Create: `plugins/oxo-erp-connector/messages/en.json`, `cz.json`, `de.json`, `uk.json`
- Modify (generated): `lib/plugins/plugins.generated.ts`
- Test: `plugins/oxo-erp-connector/__tests__/plugin.test.ts`

**Interfaces:**
- Consumes: everything above.
- Produces: the default-exported plugin definition; registry entry `public_oxo_erp_connector`.

- [ ] **Step 1: Write the failing test**

`plugins/oxo-erp-connector/__tests__/plugin.test.ts`:
```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm jest plugins/oxo-erp-connector/__tests__/plugin.test.ts`
Expected: FAIL — cannot find module `../plugin`.

- [ ] **Step 3: Write `plugin.ts`**

```ts
import { definePlugin } from "@nextcrm/plugin-sdk";
import { secretsSchema, settingsSchema } from "./settings";
import { oxoClient, testConnection } from "./oxo";
import { runSync, scheduledSync } from "./sync";
import { loadPriceLists, queueJob, runQueued } from "./jobs";
import { onOrderUpdated, sweepOrders } from "./orders-out";
import { AdminSection } from "./ui/AdminSection";
import { NeedsOwnerPage } from "./ui/NeedsOwnerPage";
import { AccountPanel } from "./ui/AccountPanel";
import { AccountTab } from "./ui/AccountTab";
import { ProductPanel } from "./ui/ProductPanel";
import { OrderPanel } from "./ui/OrderPanel";

export default definePlugin({
  id: "oxo-erp-connector",
  name: "OXO ERP connector",
  version: "0.1.0",
  sdk: "^0.2.6",
  description: "Imports customers, products and price lists from OXO ERP and takes over the rows odoo-connector made; sends READY orders to OXO ERP, brings delivery back as the order status and imports orders made in OXO ERP.",
  permissions: ["http", "accounts:read", "accounts:write", "users:read", "notify", "products:read", "products:write", "priceLists:read", "priceLists:write", "orders:read", "orders:write"],
  settings: settingsSchema,
  secrets: secretsSchema,
  extensions: (x) => {
    x.cron("sync", "*/5 * * * *", async (ctx) => {
      const now = new Date();
      const client = oxoClient(ctx);
      await runQueued(ctx, now, client);
      await sweepOrders(ctx, client, now);
      await scheduledSync(ctx, now, client);
    });
    x.after("order", "updated", (input, ctx) => onOrderUpdated(input, ctx));
    x.adminAction({ id: "test", label: "admin.test", handler: (ctx) => testConnection(ctx) });
    x.adminAction({ id: "sync", label: "admin.syncNow", handler: (ctx) => queueJob(ctx, new Date()) });
    x.adminAction({ id: "lists", label: "admin.loadLists", handler: (ctx) => loadPriceLists(ctx) });
    x.accountPanel({ id: "oxo-erp", component: AccountPanel });
    x.accountTab({ id: "oxo-erp", title: "tab.title", component: AccountTab });
    x.productPanel({ id: "oxo-erp", component: ProductPanel });
    x.orderPanel({ id: "oxo-erp", component: OrderPanel });
    x.page({ path: "needs-owner", title: "needsOwner.title", component: NeedsOwnerPage, roles: ["manager", "admin"], nav: { label: "needsOwner.nav" } });
    x.adminSection(AdminSection);
  },
  // An install never fails on OXO ERP; the first dry run happens on install or on "Sync now".
  onInstall: async (ctx) => {
    try {
      await runSync(ctx, oxoClient(ctx), new Date());
    } catch (e) {
      ctx.log.error(`Install sync failed: ${String(e)}`);
    }
  },
});
```

- [ ] **Step 4: Write the messages**

`messages/en.json`:
```json
{
  "name": "OXO ERP connector",
  "admin": {
    "test": "Test connection",
    "syncNow": "Sync now",
    "loadLists": "Load price lists",
    "queued": "Queued: it starts within 5 minutes.",
    "listsLoaded": "Loaded {count} price lists from OXO ERP.",
    "running": "A sync is already running.",
    "connected": "Connected to OXO ERP ({lists} active price lists).",
    "dryRun": "Dry run is on: the sync only reports what it would change. Read the report below, then turn dry run off in the settings.",
    "lastRun": "Last run",
    "never": "not yet",
    "nextRun": "Next run",
    "failed": "Failed: {error}",
    "customerCounts": "Customers: {linked} already linked, {number} matched by IČO, {vat} by DIČ, {name} by name and zip, {created} new, {updated} updated, {conflicts} conflicts, {skipped} inactive, {failed} failed",
    "catalogCounts": "Catalog: categories {categoriesMatched} matched, {categoriesCreated} new · products {productsUpdated} updated, {productsCreated} new, {productsFailed} failed · price lists replaced {listsReplaced} · account price lists set {accountLists}",
    "orderCounts": "Orders: {checked} checked, {moved} moved, {imported} imported, {updated} updated, {pending} waiting for their customer",
    "listsMissing": "Price lists not found in OXO ERP: {ids}",
    "report": "Dry-run report ({date})",
    "nameLinks": "Linked by name and zip (check these)",
    "createdRows": "Would be created",
    "conflicts": "Customers matching more than one account",
    "conflictsEmpty": "No conflicts.",
    "conflictsHelp": "Fix the CRM data (merge the duplicate account or correct the IČO); the next sync links the customer.",
    "reason": {
      "number": "same IČO",
      "vat": "same DIČ",
      "name": "same name and zip",
      "linked": "already linked to another OXO ERP customer"
    },
    "catalog": "Catalog",
    "priceListsHelp": "Choose price lists in the setting priceLists: OXO ERP list ids separated by commas, e.g. 3, 7. Lists they build on come too.",
    "listsLoadedAt": "OXO ERP price lists (loaded {date})",
    "listsNotLoaded": "Click Load price lists to see the price lists in OXO ERP.",
    "skippedRules": "Rules the CRM cannot use",
    "syncQueued": "Sync is queued.",
    "orders": "Orders",
    "ordersOff": "Sending orders is off. Turn on sendOrders in the settings to send READY orders to OXO ERP.",
    "ordersCounts": "Waiting to be sent {waiting} · sent in the last 7 days {sent} · failed {failed}",
    "ordersPaused": "Sending is paused since {date}: {reason}. When OXO ERP accepts orders again, click Test connection.",
    "pending": "{count} OXO ERP orders wait for their customer to be linked"
  },
  "needsOwner": {
    "title": "Accounts from OXO ERP without an owner",
    "nav": "Needs owner",
    "help": "Open the account and set its owner; it then leaves this list.",
    "empty": "Every linked account has an owner."
  },
  "panel": {
    "linked": "OXO ERP customer #{id}",
    "synced": "Last synced {date}",
    "fields": "OXO ERP controls: name, IČO, DIČ, billing address, email, phone.",
    "inactive": "Inactive in OXO ERP.",
    "priceList": "Price list from OXO ERP: {name}",
    "priceListMissing": "OXO ERP price list #{id} is not imported",
    "addresses": "Delivery addresses"
  },
  "product": {
    "linked": "OXO ERP product #{id}"
  },
  "order": {
    "linked": "OXO ERP order {number}",
    "state": "State in OXO ERP: {state}",
    "delivery": {
      "none": "not shipped",
      "partial": "partly shipped",
      "full": "shipped"
    },
    "deliveries": "Deliveries",
    "belowList": "Below list price in OXO ERP: {lines}",
    "waiting": "Waiting for OXO ERP since {date}",
    "lastError": "Last error: {error}",
    "failed": "Not sent: {reason}",
    "missing": "Not found in OXO ERP",
    "imported": "Imported from OXO ERP"
  },
  "orders": {
    "noAccount": "The order's account has no name",
    "notOxoProduct": "Product {product} does not come from OXO ERP",
    "linesMissing": "{count} lines not shown: products not in the CRM"
  },
  "mail": {
    "failingSubject": "OXO ERP sync is failing",
    "failingText": "The OXO ERP sync failed three times in a row. Last error: {error}",
    "pausedSubject": "OXO ERP does not take orders",
    "pausedText": "Sending orders to OXO ERP is paused: {error}. When OXO ERP accepts orders again, click Test connection.",
    "orderFailedSubject": "Order {number} was not sent to OXO ERP",
    "orderFailedText": "Order {number} could not be sent to OXO ERP: {error}. Fix the cause, then click Retry on the order.",
    "stuckSubject": "Order {number} has been waiting for OXO ERP for a day",
    "stuckText": "Order {number} has been waiting to be sent to OXO ERP since {since}. Last error: {error}. The connector keeps trying; check OXO ERP.",
    "missingSubject": "Order {number}: not found in OXO ERP",
    "missingText": "The connector can no longer find CRM order {number} in OXO ERP. The CRM order keeps its status; cancel it by hand if the order was removed."
  },
  "tab": {
    "title": "OXO ERP",
    "notLinked": "Not linked to an OXO ERP customer",
    "orders": "Orders",
    "ordersEmpty": "No orders yet",
    "number": "Number",
    "oxo": "OXO ERP",
    "date": "Date",
    "total": "Total",
    "status": "Status",
    "delivery": "Delivery"
  }
}
```
`messages/cz.json`:
```json
{
  "name": "Konektor OXO ERP",
  "admin": {
    "test": "Otestovat spojení",
    "syncNow": "Synchronizovat teď",
    "loadLists": "Načíst ceníky",
    "queued": "Ve frontě: spustí se do 5 minut.",
    "listsLoaded": "Načteno {count} ceníků z OXO ERP.",
    "running": "Synchronizace už běží.",
    "connected": "Spojeno s OXO ERP ({lists} aktivních ceníků).",
    "dryRun": "Zkušební režim je zapnutý: synchronizace jen hlásí, co by změnila. Projděte zprávu níže a pak zkušební režim v nastavení vypněte.",
    "lastRun": "Poslední běh",
    "never": "zatím ne",
    "nextRun": "Další běh",
    "failed": "Selhalo: {error}",
    "customerCounts": "Zákazníci: {linked} už propojeno, {number} podle IČO, {vat} podle DIČ, {name} podle názvu a PSČ, {created} nových, {updated} upraveno, {conflicts} konfliktů, {skipped} neaktivních, {failed} chyb",
    "catalogCounts": "Katalog: kategorie {categoriesMatched} spárováno, {categoriesCreated} nových · produkty {productsUpdated} upraveno, {productsCreated} nových, {productsFailed} chyb · ceníky nahrazeno {listsReplaced} · ceníky účtů nastaveno {accountLists}",
    "orderCounts": "Objednávky: {checked} zkontrolováno, {moved} posunuto, {imported} importováno, {updated} upraveno, {pending} čeká na zákazníka",
    "listsMissing": "Ceníky, které OXO ERP nemá: {ids}",
    "report": "Zpráva zkušebního běhu ({date})",
    "nameLinks": "Propojeno podle názvu a PSČ (zkontrolujte)",
    "createdRows": "Byly by založeny",
    "conflicts": "Zákazníci, kterým odpovídá víc účtů",
    "conflictsEmpty": "Žádné konflikty.",
    "conflictsHelp": "Opravte data v CRM (slučte duplicitní účet nebo opravte IČO); další synchronizace zákazníka propojí.",
    "reason": {
      "number": "stejné IČO",
      "vat": "stejné DIČ",
      "name": "stejný název a PSČ",
      "linked": "už propojený s jiným zákazníkem OXO ERP"
    },
    "catalog": "Katalog",
    "priceListsHelp": "Ceníky vyberte v nastavení priceLists: ID ceníků z OXO ERP oddělená čárkou, např. 3, 7. Ceníky, ze kterých vycházejí, se přidají samy.",
    "listsLoadedAt": "Ceníky v OXO ERP (načteno {date})",
    "listsNotLoaded": "Klikněte na Načíst ceníky a uvidíte ceníky v OXO ERP.",
    "skippedRules": "Pravidla, která CRM neumí použít",
    "syncQueued": "Synchronizace je ve frontě.",
    "orders": "Objednávky",
    "ordersOff": "Odesílání objednávek je vypnuté. Zapněte sendOrders v nastavení a objednávky READY půjdou do OXO ERP.",
    "ordersCounts": "Čeká na odeslání {waiting} · odesláno za 7 dní {sent} · chyb {failed}",
    "ordersPaused": "Odesílání je pozastavené od {date}: {reason}. Až OXO ERP objednávky znovu přijímá, klikněte na Otestovat spojení.",
    "pending": "{count} objednávek z OXO ERP čeká na propojení zákazníka"
  },
  "needsOwner": {
    "title": "Účty z OXO ERP bez vlastníka",
    "nav": "Bez vlastníka",
    "help": "Otevřete účet a nastavte mu vlastníka; pak ze seznamu zmizí.",
    "empty": "Každý propojený účet má vlastníka."
  },
  "panel": {
    "linked": "Zákazník OXO ERP č. {id}",
    "synced": "Naposledy synchronizováno {date}",
    "fields": "OXO ERP řídí: název, IČO, DIČ, fakturační adresu, e-mail, telefon.",
    "inactive": "V OXO ERP neaktivní.",
    "priceList": "Ceník z OXO ERP: {name}",
    "priceListMissing": "Ceník OXO ERP č. {id} není importovaný",
    "addresses": "Dodací adresy"
  },
  "product": {
    "linked": "Produkt OXO ERP č. {id}"
  },
  "order": {
    "linked": "Objednávka OXO ERP {number}",
    "state": "Stav v OXO ERP: {state}",
    "delivery": {
      "none": "neodesláno",
      "partial": "částečně odesláno",
      "full": "odesláno"
    },
    "deliveries": "Dodávky",
    "belowList": "Pod ceníkovou cenou v OXO ERP: {lines}",
    "waiting": "Čeká na OXO ERP od {date}",
    "lastError": "Poslední chyba: {error}",
    "failed": "Neodesláno: {reason}",
    "missing": "V OXO ERP nenalezena",
    "imported": "Importováno z OXO ERP"
  },
  "orders": {
    "noAccount": "Účet objednávky nemá název",
    "notOxoProduct": "Produkt {product} nepochází z OXO ERP",
    "linesMissing": "{count} řádků nezobrazeno: produkty nejsou v CRM"
  },
  "mail": {
    "failingSubject": "Synchronizace s OXO ERP selhává",
    "failingText": "Synchronizace s OXO ERP selhala třikrát po sobě. Poslední chyba: {error}",
    "pausedSubject": "OXO ERP nepřijímá objednávky",
    "pausedText": "Odesílání objednávek do OXO ERP je pozastavené: {error}. Až OXO ERP objednávky znovu přijímá, klikněte na Otestovat spojení.",
    "orderFailedSubject": "Objednávka {number} nebyla odeslána do OXO ERP",
    "orderFailedText": "Objednávku {number} se nepodařilo odeslat do OXO ERP: {error}. Odstraňte příčinu a na objednávce klikněte na Zkusit znovu.",
    "stuckSubject": "Objednávka {number} čeká na OXO ERP už den",
    "stuckText": "Objednávka {number} čeká na odeslání do OXO ERP od {since}. Poslední chyba: {error}. Konektor to zkouší dál; zkontrolujte OXO ERP.",
    "missingSubject": "Objednávka {number}: v OXO ERP nenalezena",
    "missingText": "Konektor už v OXO ERP nenachází objednávku CRM {number}. Objednávka v CRM si nechává svůj stav; pokud byla odstraněna, zrušte ji ručně."
  },
  "tab": {
    "title": "OXO ERP",
    "notLinked": "Nepropojeno se zákazníkem OXO ERP",
    "orders": "Objednávky",
    "ordersEmpty": "Zatím žádné objednávky",
    "number": "Číslo",
    "oxo": "OXO ERP",
    "date": "Datum",
    "total": "Celkem",
    "status": "Stav",
    "delivery": "Dodání"
  }
}
```
`messages/de.json`:
```json
{
  "name": "OXO-ERP-Connector",
  "admin": {
    "test": "Verbindung testen",
    "syncNow": "Jetzt synchronisieren",
    "loadLists": "Preislisten laden",
    "queued": "In der Warteschlange: startet innerhalb von 5 Minuten.",
    "listsLoaded": "{count} Preislisten aus OXO ERP geladen.",
    "running": "Eine Synchronisierung läuft bereits.",
    "connected": "Mit OXO ERP verbunden ({lists} aktive Preislisten).",
    "dryRun": "Testmodus ist an: die Synchronisierung meldet nur, was sie ändern würde. Lesen Sie den Bericht unten und schalten Sie den Testmodus dann in den Einstellungen aus.",
    "lastRun": "Letzter Lauf",
    "never": "noch nicht",
    "nextRun": "Nächster Lauf",
    "failed": "Fehlgeschlagen: {error}",
    "customerCounts": "Kunden: {linked} bereits verknüpft, {number} über IČO, {vat} über DIČ, {name} über Name und PLZ, {created} neu, {updated} geändert, {conflicts} Konflikte, {skipped} inaktiv, {failed} Fehler",
    "catalogCounts": "Katalog: Kategorien {categoriesMatched} zugeordnet, {categoriesCreated} neu · Produkte {productsUpdated} geändert, {productsCreated} neu, {productsFailed} Fehler · Preislisten ersetzt {listsReplaced} · Kontopreislisten gesetzt {accountLists}",
    "orderCounts": "Aufträge: {checked} geprüft, {moved} weitergesetzt, {imported} importiert, {updated} geändert, {pending} warten auf ihren Kunden",
    "listsMissing": "Preislisten, die OXO ERP nicht hat: {ids}",
    "report": "Bericht des Testlaufs ({date})",
    "nameLinks": "Über Name und PLZ verknüpft (bitte prüfen)",
    "createdRows": "Würden angelegt",
    "conflicts": "Kunden, zu denen mehrere Konten passen",
    "conflictsEmpty": "Keine Konflikte.",
    "conflictsHelp": "Korrigieren Sie die CRM-Daten (doppeltes Konto zusammenführen oder IČO korrigieren); die nächste Synchronisierung verknüpft den Kunden.",
    "reason": {
      "number": "gleiche IČO",
      "vat": "gleiche DIČ",
      "name": "gleicher Name und PLZ",
      "linked": "bereits mit einem anderen OXO-ERP-Kunden verknüpft"
    },
    "catalog": "Katalog",
    "priceListsHelp": "Wählen Sie Preislisten in der Einstellung priceLists: OXO-ERP-Listen-IDs durch Kommas getrennt, z. B. 3, 7. Listen, auf denen sie aufbauen, kommen mit.",
    "listsLoadedAt": "OXO-ERP-Preislisten (geladen {date})",
    "listsNotLoaded": "Klicken Sie auf Preislisten laden, um die Preislisten in OXO ERP zu sehen.",
    "skippedRules": "Regeln, die das CRM nicht verwenden kann",
    "syncQueued": "Synchronisierung ist in der Warteschlange.",
    "orders": "Aufträge",
    "ordersOff": "Das Senden von Aufträgen ist aus. Schalten Sie sendOrders in den Einstellungen ein, um READY-Aufträge an OXO ERP zu senden.",
    "ordersCounts": "Warten auf Versand {waiting} · in den letzten 7 Tagen gesendet {sent} · Fehler {failed}",
    "ordersPaused": "Senden ist pausiert seit {date}: {reason}. Wenn OXO ERP wieder Aufträge annimmt, klicken Sie auf Verbindung testen.",
    "pending": "{count} OXO-ERP-Aufträge warten auf die Verknüpfung ihres Kunden"
  },
  "needsOwner": {
    "title": "Konten aus OXO ERP ohne Besitzer",
    "nav": "Ohne Besitzer",
    "help": "Öffnen Sie das Konto und setzen Sie den Besitzer; danach verschwindet es aus der Liste.",
    "empty": "Jedes verknüpfte Konto hat einen Besitzer."
  },
  "panel": {
    "linked": "OXO-ERP-Kunde #{id}",
    "synced": "Zuletzt synchronisiert {date}",
    "fields": "OXO ERP steuert: Name, IČO, DIČ, Rechnungsadresse, E-Mail, Telefon.",
    "inactive": "In OXO ERP inaktiv.",
    "priceList": "Preisliste aus OXO ERP: {name}",
    "priceListMissing": "OXO-ERP-Preisliste #{id} ist nicht importiert",
    "addresses": "Lieferadressen"
  },
  "product": {
    "linked": "OXO-ERP-Produkt #{id}"
  },
  "order": {
    "linked": "OXO-ERP-Auftrag {number}",
    "state": "Status in OXO ERP: {state}",
    "delivery": {
      "none": "nicht versandt",
      "partial": "teilweise versandt",
      "full": "versandt"
    },
    "deliveries": "Lieferungen",
    "belowList": "Unter Listenpreis in OXO ERP: {lines}",
    "waiting": "Wartet auf OXO ERP seit {date}",
    "lastError": "Letzter Fehler: {error}",
    "failed": "Nicht gesendet: {reason}",
    "missing": "In OXO ERP nicht gefunden",
    "imported": "Aus OXO ERP importiert"
  },
  "orders": {
    "noAccount": "Das Konto des Auftrags hat keinen Namen",
    "notOxoProduct": "Produkt {product} stammt nicht aus OXO ERP",
    "linesMissing": "{count} Positionen nicht angezeigt: Produkte nicht im CRM"
  },
  "mail": {
    "failingSubject": "OXO-ERP-Synchronisierung schlägt fehl",
    "failingText": "Die OXO-ERP-Synchronisierung ist dreimal hintereinander fehlgeschlagen. Letzter Fehler: {error}",
    "pausedSubject": "OXO ERP nimmt keine Aufträge an",
    "pausedText": "Das Senden von Aufträgen an OXO ERP ist pausiert: {error}. Wenn OXO ERP wieder Aufträge annimmt, klicken Sie auf Verbindung testen.",
    "orderFailedSubject": "Auftrag {number} wurde nicht an OXO ERP gesendet",
    "orderFailedText": "Auftrag {number} konnte nicht an OXO ERP gesendet werden: {error}. Beheben Sie die Ursache und klicken Sie im Auftrag auf Erneut versuchen.",
    "stuckSubject": "Auftrag {number} wartet seit einem Tag auf OXO ERP",
    "stuckText": "Auftrag {number} wartet seit {since} auf den Versand an OXO ERP. Letzter Fehler: {error}. Der Connector versucht es weiter; prüfen Sie OXO ERP.",
    "missingSubject": "Auftrag {number}: in OXO ERP nicht gefunden",
    "missingText": "Der Connector findet CRM-Auftrag {number} nicht mehr in OXO ERP. Der CRM-Auftrag behält seinen Status; stornieren Sie ihn von Hand, wenn der Auftrag entfernt wurde."
  },
  "tab": {
    "title": "OXO ERP",
    "notLinked": "Nicht mit einem OXO-ERP-Kunden verknüpft",
    "orders": "Aufträge",
    "ordersEmpty": "Noch keine Aufträge",
    "number": "Nummer",
    "oxo": "OXO ERP",
    "date": "Datum",
    "total": "Summe",
    "status": "Status",
    "delivery": "Lieferung"
  }
}
```
`messages/uk.json`:
```json
{
  "name": "Конектор OXO ERP",
  "admin": {
    "test": "Перевірити з'єднання",
    "syncNow": "Синхронізувати зараз",
    "loadLists": "Завантажити прайс-листи",
    "queued": "У черзі: запуститься протягом 5 хвилин.",
    "listsLoaded": "Завантажено {count} прайс-листів з OXO ERP.",
    "running": "Синхронізація вже виконується.",
    "connected": "З'єднано з OXO ERP ({lists} активних прайс-листів).",
    "dryRun": "Пробний режим увімкнено: синхронізація лише повідомляє, що змінила б. Перегляньте звіт нижче, потім вимкніть пробний режим у налаштуваннях.",
    "lastRun": "Останній запуск",
    "never": "ще ні",
    "nextRun": "Наступний запуск",
    "failed": "Помилка: {error}",
    "customerCounts": "Клієнти: {linked} вже пов'язано, {number} за IČO, {vat} за DIČ, {name} за назвою та індексом, {created} нових, {updated} оновлено, {conflicts} конфліктів, {skipped} неактивних, {failed} помилок",
    "catalogCounts": "Каталог: категорії {categoriesMatched} зіставлено, {categoriesCreated} нових · товари {productsUpdated} оновлено, {productsCreated} нових, {productsFailed} помилок · прайс-листів замінено {listsReplaced} · прайс-листів облікових записів встановлено {accountLists}",
    "orderCounts": "Замовлення: {checked} перевірено, {moved} просунуто, {imported} імпортовано, {updated} оновлено, {pending} чекають на клієнта",
    "listsMissing": "Прайс-листи, яких немає в OXO ERP: {ids}",
    "report": "Звіт пробного запуску ({date})",
    "nameLinks": "Пов'язано за назвою та індексом (перевірте)",
    "createdRows": "Було б створено",
    "conflicts": "Клієнти, яким відповідає кілька облікових записів",
    "conflictsEmpty": "Конфліктів немає.",
    "conflictsHelp": "Виправте дані в CRM (об'єднайте дублікат або виправте IČO); наступна синхронізація пов'яже клієнта.",
    "reason": {
      "number": "однаковий IČO",
      "vat": "однаковий DIČ",
      "name": "однакові назва та індекс",
      "linked": "вже пов'язаний з іншим клієнтом OXO ERP"
    },
    "catalog": "Каталог",
    "priceListsHelp": "Оберіть прайс-листи в налаштуванні priceLists: ID прайс-листів OXO ERP через кому, напр. 3, 7. Прайс-листи, на яких вони базуються, додаються самі.",
    "listsLoadedAt": "Прайс-листи OXO ERP (завантажено {date})",
    "listsNotLoaded": "Натисніть Завантажити прайс-листи, щоб побачити прайс-листи в OXO ERP.",
    "skippedRules": "Правила, які CRM не може використати",
    "syncQueued": "Синхронізація в черзі.",
    "orders": "Замовлення",
    "ordersOff": "Надсилання замовлень вимкнено. Увімкніть sendOrders у налаштуваннях, щоб надсилати замовлення READY до OXO ERP.",
    "ordersCounts": "Чекають на надсилання {waiting} · надіслано за 7 днів {sent} · помилок {failed}",
    "ordersPaused": "Надсилання призупинено з {date}: {reason}. Коли OXO ERP знову прийматиме замовлення, натисніть Перевірити з'єднання.",
    "pending": "{count} замовлень OXO ERP чекають на зв'язок з клієнтом"
  },
  "needsOwner": {
    "title": "Облікові записи з OXO ERP без власника",
    "nav": "Без власника",
    "help": "Відкрийте обліковий запис і призначте власника; тоді він зникне зі списку.",
    "empty": "Кожен пов'язаний обліковий запис має власника."
  },
  "panel": {
    "linked": "Клієнт OXO ERP #{id}",
    "synced": "Остання синхронізація {date}",
    "fields": "OXO ERP керує: назва, IČO, DIČ, платіжна адреса, e-mail, телефон.",
    "inactive": "Неактивний в OXO ERP.",
    "priceList": "Прайс-лист з OXO ERP: {name}",
    "priceListMissing": "Прайс-лист OXO ERP #{id} не імпортовано",
    "addresses": "Адреси доставки"
  },
  "product": {
    "linked": "Товар OXO ERP #{id}"
  },
  "order": {
    "linked": "Замовлення OXO ERP {number}",
    "state": "Стан в OXO ERP: {state}",
    "delivery": {
      "none": "не відвантажено",
      "partial": "частково відвантажено",
      "full": "відвантажено"
    },
    "deliveries": "Доставки",
    "belowList": "Нижче прайсової ціни в OXO ERP: {lines}",
    "waiting": "Чекає на OXO ERP з {date}",
    "lastError": "Остання помилка: {error}",
    "failed": "Не надіслано: {reason}",
    "missing": "Не знайдено в OXO ERP",
    "imported": "Імпортовано з OXO ERP"
  },
  "orders": {
    "noAccount": "Обліковий запис замовлення не має назви",
    "notOxoProduct": "Товар {product} не походить з OXO ERP",
    "linesMissing": "{count} рядків не показано: товарів немає в CRM"
  },
  "mail": {
    "failingSubject": "Синхронізація з OXO ERP не вдається",
    "failingText": "Синхронізація з OXO ERP не вдалася тричі поспіль. Остання помилка: {error}",
    "pausedSubject": "OXO ERP не приймає замовлення",
    "pausedText": "Надсилання замовлень до OXO ERP призупинено: {error}. Коли OXO ERP знову прийматиме замовлення, натисніть Перевірити з'єднання.",
    "orderFailedSubject": "Замовлення {number} не надіслано до OXO ERP",
    "orderFailedText": "Замовлення {number} не вдалося надіслати до OXO ERP: {error}. Усуньте причину, потім натисніть Повторити на замовленні.",
    "stuckSubject": "Замовлення {number} чекає на OXO ERP вже добу",
    "stuckText": "Замовлення {number} чекає на надсилання до OXO ERP з {since}. Остання помилка: {error}. Конектор пробує далі; перевірте OXO ERP.",
    "missingSubject": "Замовлення {number}: не знайдено в OXO ERP",
    "missingText": "Конектор більше не знаходить замовлення CRM {number} в OXO ERP. Замовлення в CRM зберігає свій стан; скасуйте його вручну, якщо замовлення видалено."
  },
  "tab": {
    "title": "OXO ERP",
    "notLinked": "Не пов'язано з клієнтом OXO ERP",
    "orders": "Замовлення",
    "ordersEmpty": "Замовлень ще немає",
    "number": "Номер",
    "oxo": "OXO ERP",
    "date": "Дата",
    "total": "Разом",
    "status": "Стан",
    "delivery": "Доставка"
  }
}
```

- [ ] **Step 5: Run the test, regenerate the registry**

Run: `pnpm jest plugins/oxo-erp-connector/__tests__/plugin.test.ts`
Expected: PASS, 3 tests.

Run: `pnpm plugins:generate --public-only && git diff --stat lib/plugins/plugins.generated.ts`
Expected: "Generated 4 plugin(s)"; the diff adds `public_oxo_erp_connector` and its four message imports.

- [ ] **Step 6: Whole suite, types, lint**

Run: `pnpm jest > .superpowers/oxo-t10.log 2>&1; tail -8 .superpowers/oxo-t10.log`
Expected: all suites pass.

Run: `pnpm exec tsc --noEmit -p . > .superpowers/oxo-tsc.log 2>&1; tail -5 .superpowers/oxo-tsc.log; pnpm exec eslint plugins/oxo-erp-connector lib/plugins packages/plugin-sdk lib/catalog --max-warnings=0`
Expected: no type errors; no lint findings. Then `git checkout tsconfig.json AGENTS.md` if either changed.

- [ ] **Step 7: Commit**

```bash
git add plugins/oxo-erp-connector/plugin.ts plugins/oxo-erp-connector/messages plugins/oxo-erp-connector/__tests__/plugin.test.ts lib/plugins/plugins.generated.ts
git commit -m "feat(oxo-erp-connector): plugin definition, messages in 4 locales, registry

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_019AXXZ8279bRB86Cn1ZRWFS"
```

## After the tasks

1. Final whole-branch review (fresh reviewer, most capable model), one fix pass test-first.
2. PR `feat/oxo-erp-connector` → `main`; Pavel merges; the plugin ships in the next NextCRM release (0.1.0). It is not installed on oxo.nextcrm.app until S7.
3. Acceptance (Jarvis, spec § 7), after the OXO ERP PR is deployed to practice: snapshot the local NextCRM DB, install the plugin locally against practice OXO ERP with the practice key, read the dry-run report (products, lists and orders "updated", accounts matched, conflicts sensible), real sync (no duplicates, new accounts on Needs owner), a CRM order → READY → appears in practice, pick and ship it there → the CRM shows DELIVERED.
