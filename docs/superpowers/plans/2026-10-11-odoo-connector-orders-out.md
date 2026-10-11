# Odoo connector part 3a (orders out, statuses back) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** READY CRM orders become draft sale orders in Odoo exactly once (customer and delivery address created there when missing), and Odoo's confirmation, delivery, invoice and payment come back as the CRM order's status.

**Architecture:** One core addition (SDK 0.2.4 `store.claim`, an atomic lock on `PluginData`). Everything else lives in `plugins/odoo-connector`: `odoo-partners.ts` finds or creates the Odoo customer and delivery address, `orders-out.ts` sends one order and sweeps READY orders, `orders-status.ts` reads Odoo back inside the existing sync cycle, `ui/OrderPanel.tsx` and an admin Orders block show it. Sending is triggered by the core "after write" hook on orders and by the 5-minute cron.

**Tech Stack:** Next.js 16, Prisma 7 (PostgreSQL), TypeScript, jest (prisma mocked), Odoo 19 JSON-2 API, zod 4, next-intl messages (en, cz, de, uk).

**Spec:** `docs/superpowers/specs/2026-10-11-odoo-connector-orders-out-design.md`

## Global Constraints

- Odoo writes only: create on `res.partner`, `sale.order` (with lines). Never write, unlink, confirm or cancel anything in Odoo.
- Nothing is written to Odoo while `sendOrders` is off (default false) or `dryRun` is on.
- Exactly one Odoo partner, delivery address and sale order per CRM order, whatever fails in between (criterion 11).
- Odoo unreachable (network, timeout, HTTP 5xx, 429) never counts as an attempt; the order stays READY (criterion 15).
- HTTP 401/403 pauses sending for all orders and notifies admins once.
- 5 refusals of one order → SYNC_FAILED and one admin notification; final check failures → SYNC_FAILED at once.
- Lines go with the CRM `unitPrice` as `price_unit`; Odoo price difference over 1 (order currency) is flagged, never applied.
- CRM number goes to `origin`; `client_order_ref` is never set.
- Status mapping per spec § 4.3; the CRM status never moves backwards.
- SDK_VERSION 0.2.3 → 0.2.4; connector 0.2.0 → 0.3.0, `sdk: "^0.2.4"`.
- No OXO/GIPS names, ids or values in code, migrations or messages (OXO plan criterion 3).
- All new texts in en, cz, de, uk.
- Commits end with `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`; never `git add -A`; check the branch (`feat/odoo-connector-orders`) in every commit command.

## Review Focus

1. **The JSON-2 client retries a create after a 5xx or network error** → two Odoo records from one attempt. Writes must go with `{ once: true }` and never be retried inside the client (Task 2 test "never retries a once call").
2. **An account with neither registration number nor VAT, crash after the partner create** → the next attempt must find the partner it created (by exact name and country), not create a second one (Task 3 test "finds a name-only customer it created before").
3. **An order reopened and edited after its Odoo draft exists** → the resend must refuse ("other lines") instead of creating a second order or sending the old lines (Task 4 test "refuses when Odoo has the number with other lines").
4. **A sale order deleted in Odoo** → `read` would raise MissingError and fail the whole status pass; use `search_read` by id and map the missing order to CANCELLED (Task 6 test "maps a deleted Odoo order to CANCELLED").
5. **The connector's own SENT/CONFIRMED writes fire the order "after" hook** → the handler must be a cheap no-op for non-READY orders and never claim or call Odoo (Task 5 test "ignores updates of orders that are not READY").

## Plan rulings (spec departures, decided while planning)

1. **Trigger hook.** Spec § 3/§ 4.1 say `x.on("crm/order.saved")`. Core emits that event only for plugin writes (`lib/plugins/data-api.ts` `emitSaved`); a rep's Submit or a manager's Approve/Retry never emits it. The plan uses `x.after("order", "updated", …)` (the hook `account-protection` already uses), which fires for every order update. Cost if wrong: none; the 5-minute sweep would still send.
2. **Writes are never retried by the client.** `OdooClient.call` gains `opts?: { once?: boolean }`; `jsonClient` throws on the first network error or 5xx for `once` calls. Repeat safety comes from the next attempt's lookups, not from the transport.
3. **Name-only lookup.** When the account has neither registration number nor VAT, the customer lookup also matches an active parent-less partner with exactly the account's name in its country. Without it a crash after create would duplicate the partner (spec § 5 promises repeat safety).
4. **Country.** Spec § 4.2 requires a country on unlinked accounts; `billing_country` falls back to the existing `defaultCountry` setting instead, so only a missing name is a final failure.
5. **Dry run.** The sweep does not run in dry run (it would log every READY order every 5 minutes); the after hook logs "Dry run: would send order" once per status change. Nothing is written.
6. **Status read uses `search_read` by id**, never `read`, so a deleted Odoo order does not raise.
7. **PAID requires `invoice_status = invoiced`** in addition to every live invoice paid, so a fully paid partial invoice does not mark the order PAID.
8. **Odoo `state = done`** (locked confirmed order) counts as confirmed.

---

### Task 1: SDK 0.2.4 — atomic `store.claim`

**Files:**
- Modify: `packages/plugin-sdk/src/types.ts:136-141` (RecordStore)
- Modify: `packages/plugin-sdk/src/version.ts`
- Modify: `packages/plugin-sdk/src/testing.ts` (memoryStore)
- Modify: `lib/plugins/store.ts`
- Modify: `apps/docs/content/docs/developers/plugins.mdx` (store section)
- Modify (version assertions): `packages/plugin-sdk/__tests__/version.test.ts:14`, `lib/plugins/__tests__/data-api-catalog.test.ts:22`, `lib/plugins/__tests__/data-api-orders.test.ts:87`, `lib/plugins/__tests__/data-api-activities.test.ts:31`, `lib/plugins/__tests__/lifecycle.test.ts:54`
- Test: `lib/plugins/__tests__/store-claim.test.ts`

**Interfaces:**
- Produces: `RecordStore.claim(key: string, ms: number): Promise<boolean>` on `ctx.store` and on `ctx.store.forRecord(...)`; in-memory equivalent in `createTestContext`.

- [ ] **Step 1: Write the failing tests**

`lib/plugins/__tests__/store-claim.test.ts`:

```ts
import { createTestContext } from "@nextcrm/plugin-sdk/testing";
import { SDK_VERSION } from "@nextcrm/plugin-sdk";

const mockQueryRaw = jest.fn();
jest.mock("@/lib/prisma-base", () => ({ prismaBase: { $queryRaw: (...a: unknown[]) => mockQueryRaw(...a) } }));

import { createStore } from "@/lib/plugins/store";

beforeEach(() => mockQueryRaw.mockReset());

it("is SDK 0.2.4 (additive)", () => expect(SDK_VERSION).toBe("0.2.4"));

it("claims through one INSERT … ON CONFLICT statement and reports whether a row came back", async () => {
  mockQueryRaw.mockResolvedValueOnce([{ key: "sending:o1" }]).mockResolvedValueOnce([]);
  const store = createStore("demo");
  await expect(store.claim("sending:o1", 600_000)).resolves.toBe(true);
  await expect(store.claim("sending:o1", 600_000)).resolves.toBe(false);
  const sql = (mockQueryRaw.mock.calls[0][0] as TemplateStringsArray).join("?");
  expect(sql).toContain('INSERT INTO "PluginData"');
  expect(sql).toContain("ON CONFLICT");
  expect(sql).toContain("RETURNING");
  expect(mockQueryRaw.mock.calls[0].slice(1)).toEqual(["demo", "", "", "sending:o1", 600_000]);
});

it("scopes record claims to the record", async () => {
  mockQueryRaw.mockResolvedValueOnce([{ key: "k" }]);
  await createStore("demo").forRecord("order", "o9").claim("k", 1000);
  expect(mockQueryRaw.mock.calls[0].slice(1)).toEqual(["demo", "order", "o9", "k", 1000]);
});

it("testing store: one caller wins until the claim expires", async () => {
  const ctx = createTestContext();
  const t0 = Date.now();
  const spy = jest.spyOn(Date, "now").mockReturnValue(t0);
  expect(await ctx.store.claim("x", 1000)).toBe(true);
  expect(await ctx.store.claim("x", 1000)).toBe(false);
  spy.mockReturnValue(t0 + 1001);
  expect(await ctx.store.claim("x", 1000)).toBe(true);
  await ctx.store.delete("x");
  expect(await ctx.store.claim("x", 1000)).toBe(true);
  spy.mockRestore();
});

it("testing store: parallel claims, exactly one wins", async () => {
  const ctx = createTestContext();
  const won = await Promise.all([ctx.store.claim("y", 1000), ctx.store.claim("y", 1000), ctx.store.claim("y", 1000)]);
  expect(won.filter(Boolean)).toHaveLength(1);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm exec jest lib/plugins/__tests__/store-claim.test.ts`
Expected: FAIL — `SDK_VERSION` is "0.2.3"; `store.claim is not a function`.

- [ ] **Step 3: Implement**

`packages/plugin-sdk/src/types.ts`, in `RecordStore`:

```ts
export interface RecordStore {
  get<T = unknown>(key: string): Promise<T | null>;
  set(key: string, value: unknown): Promise<void>;
  delete(key: string): Promise<void>;
  list(prefix?: string): Promise<StoreEntry[]>;
  /** Atomic lock: true when this caller now holds `key` for `ms` milliseconds; false while someone else holds it. Release with delete(key). */
  claim(key: string, ms: number): Promise<boolean>;
}
```

`packages/plugin-sdk/src/version.ts`: `export const SDK_VERSION = "0.2.4";`

`packages/plugin-sdk/src/testing.ts`, in `memoryStore` after `list`:

```ts
    async claim(key, ms) {
      const held = map.get(k(key)) as { until?: string } | undefined;
      if (held?.until && Date.parse(held.until) > Date.now()) return false;
      map.set(k(key), { until: new Date(Date.now() + ms).toISOString() });
      return true;
    },
```

`lib/plugins/store.ts`, in `scoped(...)` after `list`:

```ts
    async claim(key, ms) {
      // One statement, database clock: insert the lock, or take it over only when the stored one has expired.
      const rows = await prismaBase.$queryRaw<{ key: string }[]>`
        INSERT INTO "PluginData" ("id", "pluginId", "entityType", "entityId", "key", "value", "updatedAt")
        VALUES (gen_random_uuid(), ${pluginId}, ${entityType}, ${entityId}, ${key},
                jsonb_build_object('until', to_char((now() + ${ms}::int * interval '1 millisecond') AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')), now())
        ON CONFLICT ("pluginId", "entityType", "entityId", "key") DO UPDATE
          SET "value" = EXCLUDED."value", "updatedAt" = now()
          WHERE ("PluginData"."value"->>'until') IS NULL OR ("PluginData"."value"->>'until')::timestamptz <= now()
        RETURNING "key"`;
      return rows.length > 0;
    },
```

Version assertions: change `"0.2.3"` to `"0.2.4"` in `packages/plugin-sdk/__tests__/version.test.ts:14`, `lib/plugins/__tests__/data-api-catalog.test.ts:22`, `lib/plugins/__tests__/data-api-orders.test.ts:87`, `lib/plugins/__tests__/data-api-activities.test.ts:31` (keep each test's name, replacing the version in the name too), and the message in `lib/plugins/__tests__/lifecycle.test.ts:54` to `running 0.2.4`.

Developer docs, after the store example in `apps/docs/content/docs/developers/plugins.mdx`:

```mdx
`ctx.store.claim(key, ms)` takes a lock atomically: it returns `true` when the caller now holds `key` for `ms` milliseconds and `false` while another run holds it. Release it with `ctx.store.delete(key)`; an unreleased claim expires on its own. Use it when two jobs (an event handler and a cron, say) could otherwise do the same external write twice. Since SDK 0.2.4.
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm exec jest lib/plugins/__tests__/store-claim.test.ts packages/plugin-sdk lib/plugins`
Expected: PASS. Then `pnpm exec tsc --noEmit -p .` → exit 0 (any other `RecordStore` implementation tsc reports gets the same `claim`).

- [ ] **Step 5: Verify the SQL against the local database**

Write `.superpowers/live/claim-check.ts` (git-ignored):

```ts
import { createStore } from "@/lib/plugins/store";
(async () => {
  const s = createStore("claim-check");
  const a = await s.claim("k", 2000), b = await s.claim("k", 2000);
  await new Promise((r) => setTimeout(r, 2100));
  const c = await s.claim("k", 2000);
  await s.delete("k");
  console.log(JSON.stringify({ a, b, c }));
  process.exit(0);
})();
```

Run: `source <scratchpad>/odoo-env.sh && npx tsx .superpowers/live/claim-check.ts`
Expected: `{"a":true,"b":false,"c":true}`.

- [ ] **Step 6: Commit**

```bash
[ "$(git branch --show-current)" = feat/odoo-connector-orders ] && git add packages/plugin-sdk/src/types.ts packages/plugin-sdk/src/version.ts packages/plugin-sdk/src/testing.ts lib/plugins/store.ts apps/docs/content/docs/developers/plugins.mdx lib/plugins/__tests__/store-claim.test.ts packages/plugin-sdk/__tests__/version.test.ts lib/plugins/__tests__/data-api-catalog.test.ts lib/plugins/__tests__/data-api-orders.test.ts lib/plugins/__tests__/data-api-activities.test.ts lib/plugins/__tests__/lifecycle.test.ts && git commit -m "feat(plugin-sdk): 0.2.4 atomic store.claim

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Connector foundations — write-once client calls, `sendOrders`, order keys, failure kinds

**Files:**
- Modify: `plugins/odoo-connector/odoo.ts`
- Modify: `plugins/odoo-connector/settings.ts`
- Modify: `plugins/odoo-connector/store.ts`
- Create: `plugins/odoo-connector/orders-errors.ts`
- Test: `plugins/odoo-connector/__tests__/odoo.test.ts` (append), `plugins/odoo-connector/__tests__/orders-errors.test.ts`

**Interfaces:**
- Produces:
  - `OdooClient.call<T>(model, method, body?, opts?: { once?: boolean }): Promise<T>`
  - setting `sendOrders: boolean` (default false)
  - `K.order(id)`, `K.send(id)`, `K.failed(id)`, `K.sending(id)`, `K.sendPaused`, `K.created`
  - types `OrderLink`, `SendState`, `FailedState`, `CreatedRecord`
  - `failKind(e: unknown): "unreachable" | "denied" | "refused"`, `class FinalError extends Error`
  - `testConnection` deletes `K.sendPaused` after success.

- [ ] **Step 1: Write the failing tests**

Append to `plugins/odoo-connector/__tests__/odoo.test.ts`:

```ts
import { createTestContext } from "@nextcrm/plugin-sdk/testing";
import { settingsSchema } from "../settings";
import { K } from "../store";
import { fakeOdoo } from "./fake-odoo";
import { jsonClient as client2, testConnection as test2 } from "../odoo";

describe("write-once calls", () => {
  const mkCtx = (handlers: Record<string, any>, calls: any[]) => createTestContext({
    pluginId: "odoo-connector", settings: settingsSchema.parse({ url: "https://odoo.example.com", database: "db" }), secrets: { apiKey: "k" },
    fetch: fakeOdoo(handlers, calls),
  }) as never;

  it("never retries a once call after a 5xx", async () => {
    const calls: any[] = [];
    const c = client2(mkCtx({ "sale.order/create": () => new Response("{}", { status: 502 }) }, calls), async () => {});
    await expect(c.call("sale.order", "create", { vals_list: [{}] }, { once: true })).rejects.toMatchObject({ status: 502 });
    expect(calls).toHaveLength(1);
  });

  it("still retries reads after a 5xx", async () => {
    const calls: any[] = [];
    const c = client2(mkCtx({ "sale.order/search_read": () => new Response("{}", { status: 502 }) }, calls), async () => {});
    await expect(c.call("sale.order", "search_read", {})).rejects.toMatchObject({ status: 502 });
    expect(calls).toHaveLength(3);
  });

  it("never retries a once call after a network error", async () => {
    let n = 0;
    const ctx = createTestContext({ pluginId: "odoo-connector", settings: settingsSchema.parse({ url: "https://odoo.example.com", database: "db" }), secrets: { apiKey: "k" },
      fetch: async () => { n++; throw new Error("ECONNRESET"); } }) as never;
    await expect(client2(ctx, async () => {}).call("res.partner", "create", {}, { once: true })).rejects.toMatchObject({ status: 0 });
    expect(n).toBe(1);
  });

  it("Test connection clears a send pause", async () => {
    const ctx = mkCtx({ "res.users/context_get": () => ({ uid: 2 }), "res.users/read": () => [{ name: "Admin" }], "/web/webclient/version_info": () => ({ result: { server_version: "19.0" } }) }, []);
    await (ctx as any).store.set(K.sendPaused, { at: "x", reason: "403" });
    await test2(ctx, client2(ctx, async () => {}));
    expect(await (ctx as any).store.get(K.sendPaused)).toBeNull();
  });
});
```

`plugins/odoo-connector/__tests__/orders-errors.test.ts`:

```ts
import { FinalError, failKind } from "../orders-errors";
import { OdooAuthError, OdooError } from "../odoo";
import { settingsSchema } from "../settings";

it("sorts failures into unreachable, denied and refused", () => {
  expect(failKind(new OdooError("down", 0))).toBe("unreachable");
  expect(failKind(new OdooError("bad gateway", 502))).toBe("unreachable");
  expect(failKind(new OdooError("slow down", 429))).toBe("unreachable");
  expect(failKind(new OdooAuthError(401))).toBe("denied");
  expect(failKind(new OdooError("Odoo denied access: x", 403))).toBe("denied");
  expect(failKind(new OdooError("Odoo error 422: Missing required field", 422))).toBe("refused");
  expect(failKind(new Error("anything else"))).toBe("refused");
  expect(new FinalError("x")).toBeInstanceOf(Error);
});

it("has sendOrders off by default", () => {
  expect(settingsSchema.parse({ url: "https://o.example.com", database: "d" }).sendOrders).toBe(false);
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `pnpm exec jest plugins/odoo-connector/__tests__/odoo.test.ts plugins/odoo-connector/__tests__/orders-errors.test.ts`
Expected: FAIL — the once call is retried (3 calls); `Cannot find module '../orders-errors'`; `sendOrders` undefined.

- [ ] **Step 3: Implement**

`plugins/odoo-connector/odoo.ts` — interface, `post`, `call`, `testConnection`:

```ts
import type { Ctx } from "./settings";
import { K } from "./store";
```

```ts
export interface OdooClient {
  /** `once`: a write; never retried inside the client, so a timeout cannot create a record twice (plan Ruling 2). */
  call<T = unknown>(model: string, method: string, body?: Record<string, unknown>, opts?: { once?: boolean }): Promise<T>;
  version(): Promise<string>;
}
```

In `jsonClient`, `post(path, body, once = false)`: in the `catch` branch use `if (once || attempt >= BACKOFF.length) throw new OdooError(...)`, and in the `>= 500` branch `if (once || attempt >= BACKOFF.length) throw new OdooError(...)`. The client's `call`:

```ts
    call: async <T,>(model: string, method: string, body: Record<string, unknown> = {}, opts: { once?: boolean } = {}) =>
      (await post(`/json/2/${model}/${method}`, body, !!opts.once)) as T,
```

`testConnection`, before `return`:

```ts
  const text = ctx.t("admin.connected", { version: await client.version(), user: user?.name ?? "?" });
  await ctx.store.delete(K.sendPaused);   // spec § 5: a working connection lifts the send pause
  return text;
```

`plugins/odoo-connector/settings.ts`, in `settingsSchema` after `priceLists`:

```ts
  sendOrders: z.boolean().default(false),
```

`plugins/odoo-connector/store.ts`, in `K` after `lock`:

```ts
  order: (id: string) => `order:${id}`,               // → OrderLink, a CRM order sent to Odoo
  send: (id: string) => `send:${id}`,                 // → SendState while READY and not yet sent
  failed: (id: string) => `failed:${id}`,             // → FailedState while SYNC_FAILED
  sending: (id: string) => `sending:${id}`,           // → claim, one sender per order
  sendPaused: "meta:sendPaused",                      // → { at, reason } after Odoo refused access
  created: "meta:created",                            // → CreatedRecord[] newest first, at most 20
```

and the types:

```ts
export interface OrderLink {
  odooId: number; name: string; state: string; sentAt: string; total: number | null; totalDiffers: boolean;
  priceDiffs: { sku: string; crm: number; odoo: number }[];
  deliveries: { name: string; state: string; date: string | null }[];
  invoices: { number: string; type: string; date: string | null; due: string | null; amount: number; residual: number; paymentState: string }[];
  created: ("customer" | "delivery")[];
  checkedAt: string;
}
export interface SendState { attempts: number; lastError: string | null; waitingSince: string | null }
export interface FailedState { reason: string; at: string }
export interface CreatedRecord { at: string; kind: "customer" | "delivery"; odooId: number; name: string; orderNumber: string }
```

Add `orders?: { checked: number; moved: number }` to `RunSummary`.

`plugins/odoo-connector/orders-errors.ts`:

```ts
import { OdooAuthError, OdooError } from "./odoo";

/** A failure that no retry can fix (spec § 4.2 checks): the order goes to SYNC_FAILED at once. */
export class FinalError extends Error {
  constructor(message: string) { super(message); this.name = "FinalError"; }
}

/** Spec § 5: unreachable never counts; denied pauses everything; refused counts against the order. */
export function failKind(e: unknown): "unreachable" | "denied" | "refused" {
  if (e instanceof OdooAuthError) return "denied";
  if (e instanceof OdooError) {
    if (e.status === 403) return "denied";
    if (e.status === 0 || e.status === 429 || e.status >= 500) return "unreachable";
  }
  return "refused";
}
```

- [ ] **Step 4: Run to verify they pass**

Run: `pnpm exec jest plugins/odoo-connector`
Expected: PASS except `plugin.test.ts` settings keys (now with `sendOrders`); update that assertion to `["url", "database", "syncMinutes", "defaultCountry", "dryRun", "priceLists", "sendOrders"]` and re-run → PASS.

- [ ] **Step 5: Commit**

```bash
[ "$(git branch --show-current)" = feat/odoo-connector-orders ] && git add plugins/odoo-connector/odoo.ts plugins/odoo-connector/settings.ts plugins/odoo-connector/store.ts plugins/odoo-connector/orders-errors.ts plugins/odoo-connector/__tests__/odoo.test.ts plugins/odoo-connector/__tests__/orders-errors.test.ts plugins/odoo-connector/__tests__/plugin.test.ts && git commit -m "feat(odoo-connector): write-once client calls, sendOrders setting, order keys

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Find or create the Odoo customer and delivery address

**Files:**
- Create: `plugins/odoo-connector/odoo-partners.ts`
- Create: `plugins/odoo-connector/__tests__/orders-helpers.ts`
- Modify: `plugins/odoo-connector/__tests__/helpers.ts` (`evalDomain`: `=ilike`)
- Test: `plugins/odoo-connector/__tests__/odoo-partners.test.ts`

**Interfaces:**
- Consumes: `OdooClient.call(..., { once: true })`, `K.account`, `K.partner`, `AccountLink` (Task 2 / part 1).
- Produces:
  - `salesperson(ctx: Ctx, client: OdooClient, ownerId: string | null): Promise<number | false>`
  - `findOrCreateCustomer(ctx: Ctx, client: OdooClient, account: RecordData, user: number | false, now: Date): Promise<{ partnerId: number; created: boolean }>`
  - `findOrCreateDelivery(ctx: Ctx, client: OdooClient, partnerId: number, order: RecordData): Promise<{ shippingId: number; created: boolean }>`
  - `sameAddress(a, b): boolean`
  - test fixture `mkOrders(opts)`, `account(over)`, `order(over)`, `FakeSales`

- [ ] **Step 1: Extend the domain evaluator and write the fixture**

`helpers.ts` `evalDomain`, after the `"!="` line:

```ts
    if (op === "=ilike") return typeof x === "string" && x.toLowerCase() === String(v).toLowerCase();
```

`plugins/odoo-connector/__tests__/orders-helpers.ts`:

```ts
import type { RecordData } from "@nextcrm/plugin-sdk";
import { createTestContext } from "@nextcrm/plugin-sdk/testing";
import { jsonClient } from "../odoo";
import { settingsSchema } from "../settings";
import { K } from "../store";
import { evalDomain, noSleep, type TestCtx } from "./helpers";
import { fakeOdoo } from "./fake-odoo";

export interface FakeSales {
  partners: RecordData[]; users: RecordData[]; orders: RecordData[]; lines: RecordData[];
  pickings: RecordData[]; moves: RecordData[]; lists: RecordData[];
  /** "model/method" → HTTP status returned before doing anything, or "after": do the write, then answer 500 once. */
  fail: Record<string, number | "after">;
  /** Odoo's price for sale.order.line/onchange; null = Odoo returns no price. */
  price: number | null;
  nextId: number;
}

const M2O = new Set(["country_id", "parent_id", "user_id", "partner_id", "partner_shipping_id", "pricelist_id", "product_id", "order_id", "currency_id"]);
const norm = (v: RecordData) => Object.fromEntries(Object.entries(v).map(([k, x]) => [k, M2O.has(k) && typeof x === "number" ? [x, `#${x}`] : x]));
const pick = (rows: RecordData[], fields?: string[]) => rows.map((r) => (fields ? Object.fromEntries(["id", ...fields].map((f) => [f, r[f] ?? false])) : r));

export function salesHandlers(s: FakeSales) {
  const guard = (key: string, write: () => unknown) => {
    const f = s.fail[key];
    if (typeof f === "number") return new Response(JSON.stringify({ message: `refused ${key}` }), { status: f });
    const out = write();
    if (f === "after") { delete s.fail[key]; return new Response("{}", { status: 500 }); }
    return out;
  };
  const search = (rows: RecordData[]) => (b: any) => {
    const active = b.context?.active_test !== false;
    const hit = rows.filter((r) => (!active || r.active !== false) && evalDomain(r, b.domain ?? []));
    return pick(hit.slice(0, b.limit ?? hit.length), b.fields);
  };
  return {
    "res.country/search_read": (b: any) => [{ id: 56, code: "CZ" }, { id: 57, code: "SK" }].filter((c) => evalDomain(c, b.domain ?? [])),
    "res.partner/fields_get": () => Object.fromEntries(["id", "name", "parent_id", "customer_rank", "active", "write_date"].map((f) => [f, {}])),
    "res.users/search_read": search(s.users),
    "res.partner/search_read": search(s.partners),
    "res.partner/read": (b: any) => pick(s.partners.filter((p) => b.ids.includes(p.id)), b.fields),
    "res.partner/create": (b: any) => guard("res.partner/create", () => b.vals_list.map((v: RecordData) => {
      const id = s.nextId++;
      s.partners.push({ id, active: true, type: "contact", parent_id: false, property_product_pricelist: [234, "Retail (CZK)"], ...norm(v) });
      return id;
    })),
    "product.pricelist/read": (b: any) => pick(s.lists.filter((l) => b.ids.includes(l.id)), b.fields),
    "sale.order/search_read": search(s.orders),
    "sale.order/read": (b: any) => pick(s.orders.filter((o) => b.ids.includes(o.id)), b.fields),
    "sale.order/create": (b: any) => guard("sale.order/create", () => b.vals_list.map((v: RecordData) => {
      const id = s.nextId++;
      const { order_line, ...head } = v as { order_line: [number, number, RecordData][] };
      s.orders.push({ id, name: `S${String(id).padStart(5, "0")}`, state: "draft", invoice_ids: [], picking_ids: [], ...norm(head) });
      for (const [, , l] of order_line) s.lines.push({ id: s.nextId++, order_id: [id, "x"], display_type: false, ...norm(l) });
      return id;
    })),
    "sale.order.line/search_read": search(s.lines),
    "sale.order.line/onchange": () => ({ value: s.price === null ? {} : { price_unit: s.price } }),
    "stock.picking/search_read": search(s.pickings),
    "account.move/search_read": search(s.moves),
  };
}

export const account = (over: RecordData = {}): RecordData => ({
  id: "a1", name: "Bubble s.r.o.", company_id: "12345678", vat: "CZ12345678", billing_street: "Main 1", billing_city: "Praha",
  billing_postal_code: "110 00", billing_country: "CZ", email: "info@bubble.example", office_phone: "+420 111", assigned_to: "u-rep", deletedAt: null, ...over,
});

export const order = (over: RecordData = {}): RecordData => ({
  id: "o1", number: "ORD-2026-0001", status: "READY", source: "CRM", externalRef: null, accountId: "a1", ownerId: "u-rep", priceListId: null,
  currency: "CZK", shipping_street: null, shipping_city: null, shipping_postal_code: null, shipping_country: null, requestedDeliveryDate: null,
  note: null, grandTotal: "200.00", createdAt: "2026-10-13T07:00:00.000Z",
  lines: [{ productId: "p1", sku: "800009", productName: "Scoop", quantity: "2", unitPrice: "100.00" }], ...over,
});

export function mkOrders(opts: { settings?: RecordData; sales?: Partial<FakeSales>; accounts?: RecordData[]; orders?: RecordData[]; products?: RecordData[] } = {}) {
  const sales: FakeSales = {
    partners: [], users: [{ id: 9, login: "rep@x.example", email: "Rep@X.example" }], orders: [], lines: [], pickings: [], moves: [],
    lists: [{ id: 234, currency_id: [9, "CZK"] }, { id: 245, currency_id: [9, "CZK"] }, { id: 238, currency_id: [125, "EUR"] }],
    fail: {}, price: null, nextId: 1000, ...opts.sales,
  };
  const calls: { path: string; body: any }[] = [];
  const data = {
    accounts: opts.accounts ?? [account()],
    orders: opts.orders ?? [order()],
    products: opts.products ?? [{ id: "p1", source: "EXTERNAL", externalRef: "700", sku: "800009", name: "Scoop", status: "ACTIVE", deletedAt: null }],
    users: [{ id: "u-rep", email: "rep@x.example", name: "Rep One", userStatus: "ACTIVE" }],
    contacts: [] as RecordData[],
  };
  const ctx = createTestContext({
    pluginId: "odoo-connector",
    settings: settingsSchema.parse({ url: "https://odoo.example.com", database: "db", dryRun: false, sendOrders: true, ...opts.settings }),
    secrets: { apiKey: "k" }, fetch: fakeOdoo(salesHandlers(sales) as never, calls as never), data,
  }) as unknown as TestCtx;
  void ctx.store.set(K.product(700), { productId: "p1", tmplId: 70, categoryRef: null });
  const writes = () => calls.filter((c) => c.path.endsWith("/create")).map((c) => c.path.slice(8));
  return { ctx, client: jsonClient(ctx, noSleep), sales, data, calls, writes };
}
```

- [ ] **Step 2: Write the failing tests**

`plugins/odoo-connector/__tests__/odoo-partners.test.ts`:

```ts
import { findOrCreateCustomer, findOrCreateDelivery, salesperson, sameAddress } from "../odoo-partners";
import { K } from "../store";
import { account, mkOrders, order } from "./orders-helpers";
import { now } from "./helpers";

const odooCustomer = (over = {}) => ({ id: 50, name: "Bubble s.r.o.", parent_id: false, active: true, type: "contact", company_registry: false, vat: false, country_id: [56, "CZ"], street: "Main 1", city: "Praha", zip: "11000", property_product_pricelist: [234, "Retail (CZK)"], ...over });

describe("customer", () => {
  it("uses the linked partner without asking Odoo", async () => {
    const { ctx, client, calls } = mkOrders();
    await ctx.store.set(K.account("a1"), { partnerId: 77, syncedAt: "x", salesperson: null });
    expect(await findOrCreateCustomer(ctx, client, account(), 9, now)).toEqual({ partnerId: 77, created: false });
    expect(calls).toHaveLength(0);
  });

  it("finds by registration number in the account's country and links the account", async () => {
    const { ctx, client, writes } = mkOrders({ sales: { partners: [odooCustomer({ company_registry: "12345678" })] } });
    expect(await findOrCreateCustomer(ctx, client, account(), 9, now)).toEqual({ partnerId: 50, created: false });
    expect(await ctx.store.get(K.partner(50))).toEqual({ accountId: "a1" });
    expect(await ctx.store.get(K.account("a1"))).toMatchObject({ partnerId: 50, odooPriceList: [234, "Retail (CZK)"] });
    expect(writes()).toEqual([]);
  });

  it("finds by VAT when the registration number does not match", async () => {
    const { ctx, client } = mkOrders({ sales: { partners: [odooCustomer({ vat: "CZ12345678" })] } });
    expect((await findOrCreateCustomer(ctx, client, account(), 9, now)).partnerId).toBe(50);
  });

  it("creates a company partner with the account's fields when nothing matches", async () => {
    const { ctx, client, sales, calls } = mkOrders();
    const r = await findOrCreateCustomer(ctx, client, account(), 9, now);
    expect(r.created).toBe(true);
    const create = calls.find((c) => c.path === "/json/2/res.partner/create")!;
    expect(create.body.vals_list[0]).toEqual({ name: "Bubble s.r.o.", is_company: true, company_registry: "12345678", vat: "CZ12345678", street: "Main 1", city: "Praha", zip: "110 00", country_id: 56, email: "info@bubble.example", phone: "+420 111", customer_rank: 1, user_id: 9 });
    expect(await ctx.store.get(K.account("a1"))).toMatchObject({ partnerId: r.partnerId });
    expect(sales.partners).toHaveLength(1);
  });

  it("finds a name-only customer it created before (Review Focus 2)", async () => {
    const acc = account({ company_id: null, vat: null });
    const { ctx, client, sales } = mkOrders({ sales: { fail: { "res.partner/create": "after" } } });
    await expect(findOrCreateCustomer(ctx, client, acc, false, now)).rejects.toMatchObject({ status: 500 });
    expect(await findOrCreateCustomer(ctx, client, acc, false, now)).toEqual({ partnerId: 1000, created: false });
    expect(sales.partners).toHaveLength(1);
  });

  it("falls back to the default country", async () => {
    const { ctx, client, calls } = mkOrders();
    await findOrCreateCustomer(ctx, client, account({ billing_country: null, company_id: null, vat: null }), false, now);
    expect(calls.find((c) => c.path === "/json/2/res.partner/create")!.body.vals_list[0].country_id).toBe(56);
  });
});

describe("salesperson", () => {
  it("matches the owner's email case-insensitively, else false", async () => {
    const { ctx, client } = mkOrders();
    expect(await salesperson(ctx, client, "u-rep")).toBe(9);
    expect(await salesperson(ctx, client, null)).toBe(false);
    expect(await salesperson(ctx, client, "nobody")).toBe(false);
  });
});

describe("delivery address", () => {
  it("ships to the customer when the order has no address", async () => {
    const { ctx, client, calls } = mkOrders();
    expect(await findOrCreateDelivery(ctx, client, 50, order())).toEqual({ shippingId: 50, created: false });
    expect(calls).toHaveLength(0);
  });

  it("uses the customer itself or a delivery child when the address matches (normalized)", async () => {
    const child = { id: 51, parent_id: [50, "x"], type: "delivery", active: true, street: "Depot  Road 5", city: "BRNO", zip: "602 00" };
    const { ctx, client, writes } = mkOrders({ sales: { partners: [odooCustomer(), child] } });
    expect(await findOrCreateDelivery(ctx, client, 50, order({ shipping_street: "main 1", shipping_city: "praha", shipping_postal_code: "110 00" }))).toEqual({ shippingId: 50, created: false });
    expect(await findOrCreateDelivery(ctx, client, 50, order({ shipping_street: "Depot Road 5", shipping_city: "Brno", shipping_postal_code: "60200" }))).toEqual({ shippingId: 51, created: false });
    expect(writes()).toEqual([]);
  });

  it("creates a delivery child when nothing matches", async () => {
    const { ctx, client, calls } = mkOrders({ sales: { partners: [odooCustomer()] } });
    const r = await findOrCreateDelivery(ctx, client, 50, order({ shipping_street: "New 9", shipping_city: "Ostrava", shipping_postal_code: "70030", shipping_country: "CZ" }));
    expect(r.created).toBe(true);
    expect(calls.find((c) => c.path === "/json/2/res.partner/create")!.body.vals_list[0]).toEqual({ parent_id: 50, type: "delivery", street: "New 9", city: "Ostrava", zip: "70030", country_id: 56 });
  });

  it("compares addresses ignoring case, spaces and postal-code spacing", () => {
    expect(sameAddress({ street: " Main  1", city: "PRAHA", zip: "110 00" }, { street: "main 1", city: "Praha", zip: "11000" })).toBe(true);
    expect(sameAddress({ street: "Main 1", city: "Praha", zip: "11000" }, { street: "Main 2", city: "Praha", zip: "11000" })).toBe(false);
  });
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `pnpm exec jest plugins/odoo-connector/__tests__/odoo-partners.test.ts`
Expected: FAIL — `Cannot find module '../odoo-partners'`.

- [ ] **Step 4: Implement**

`plugins/odoo-connector/odoo-partners.ts`:

```ts
import type { RecordData } from "@nextcrm/plugin-sdk";
import type { M2O } from "./map";
import type { OdooClient } from "./odoo";
import type { Ctx } from "./settings";
import { K, type AccountLink } from "./store";

const fold = (v: unknown) => String(v ?? "").trim().toLowerCase().replace(/\s+/g, " ");
const val = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : false);

/** Spec § 4.2 step 2: street, city and postal code, trimmed, case and whitespace folded. */
export function sameAddress(a: { street?: unknown; city?: unknown; zip?: unknown }, b: { street?: unknown; city?: unknown; zip?: unknown }): boolean {
  return fold(a.street) === fold(b.street) && fold(a.city) === fold(b.city) && fold(a.zip).replace(/ /g, "") === fold(b.zip).replace(/ /g, "");
}

async function countryId(client: OdooClient, code: string): Promise<number | false> {
  const [c] = await client.call<{ id: number }[]>("res.country", "search_read", { domain: [["code", "=", code.toUpperCase()]], fields: ["id"], limit: 1 });
  return c?.id ?? false;
}

/** The Odoo user whose login or email is the order owner's email. */
export async function salesperson(ctx: Ctx, client: OdooClient, ownerId: string | null): Promise<number | false> {
  const owner = ownerId ? await ctx.data.users.get(ownerId) : null;
  const email = typeof owner?.email === "string" ? owner.email : null;
  if (!email) return false;
  const [u] = await client.call<{ id: number }[]>("res.users", "search_read", { domain: ["|", ["login", "=ilike", email], ["email", "=ilike", email]], fields: ["id"], limit: 1 });
  return u?.id ?? false;
}

async function link(ctx: Ctx, accountId: string, partnerId: number, list: M2O | undefined, now: Date) {
  await ctx.store.set(K.partner(partnerId), { accountId });
  await ctx.store.set(K.account(accountId), { partnerId, syncedAt: now.toISOString(), salesperson: null, odooPriceList: list || null } satisfies AccountLink);
}

/**
 * Spec § 4.2 step 1. Repeat-safe: a partner created by an earlier attempt is found again by registration number,
 * VAT, or (plan Ruling 3) exact name and country when the account has neither.
 */
export async function findOrCreateCustomer(ctx: Ctx, client: OdooClient, account: RecordData, user: number | false, now: Date): Promise<{ partnerId: number; created: boolean }> {
  const accountId = account.id as string;
  const linked = await ctx.store.get<AccountLink>(K.account(accountId));
  if (linked) return { partnerId: linked.partnerId, created: false };
  const country = await countryId(client, String(account.billing_country || ctx.settings.defaultCountry));
  const base = [["parent_id", "=", false], ["active", "=", true]];
  const tries: unknown[][] = [];
  if (val(account.company_id)) tries.push([...base, ["company_registry", "=", account.company_id], ["country_id", "=", country]]);
  if (val(account.vat)) tries.push([...base, ["vat", "=", account.vat]]);
  if (!val(account.company_id) && !val(account.vat)) tries.push([...base, ["name", "=", account.name], ["country_id", "=", country]]);
  for (const domain of tries) {
    const [p] = await client.call<{ id: number; property_product_pricelist?: M2O }[]>("res.partner", "search_read", { domain, fields: ["id", "property_product_pricelist"], limit: 1, order: "id asc" });
    if (p) { await link(ctx, accountId, p.id, p.property_product_pricelist, now); return { partnerId: p.id, created: false }; }
  }
  const [id] = await client.call<number[]>("res.partner", "create", { vals_list: [{
    name: account.name, is_company: true, company_registry: val(account.company_id), vat: val(account.vat),
    street: val(account.billing_street), city: val(account.billing_city), zip: val(account.billing_postal_code), country_id: country,
    email: val(account.email), phone: val(account.office_phone), customer_rank: 1, user_id: user,
  }] }, { once: true });
  const [p] = await client.call<{ id: number; property_product_pricelist?: M2O }[]>("res.partner", "read", { ids: [id], fields: ["property_product_pricelist"] });
  await link(ctx, accountId, id, p?.property_product_pricelist, now);
  return { partnerId: id, created: true };
}

/** Spec § 4.2 step 2: the customer or one of its delivery children with the same address, else a new delivery child. */
export async function findOrCreateDelivery(ctx: Ctx, client: OdooClient, partnerId: number, order: RecordData): Promise<{ shippingId: number; created: boolean }> {
  if (!val(order.shipping_street) && !val(order.shipping_city)) return { shippingId: partnerId, created: false };
  const want = { street: order.shipping_street, city: order.shipping_city, zip: order.shipping_postal_code };
  const rows = await client.call<{ id: number; street: string | false; city: string | false; zip: string | false }[]>("res.partner", "search_read", {
    domain: ["|", ["id", "=", partnerId], "&", ["parent_id", "=", partnerId], ["type", "=", "delivery"]], fields: ["id", "street", "city", "zip"], order: "id asc",
  });
  const hit = rows.find((r) => sameAddress(r, want));
  if (hit) return { shippingId: hit.id, created: false };
  const country = await countryId(client, String(order.shipping_country || ctx.settings.defaultCountry));
  const [id] = await client.call<number[]>("res.partner", "create", { vals_list: [{
    parent_id: partnerId, type: "delivery", street: val(order.shipping_street), city: val(order.shipping_city), zip: val(order.shipping_postal_code), country_id: country,
  }] }, { once: true });
  return { shippingId: id, created: true };
}
```

- [ ] **Step 5: Run to verify it passes**

Run: `pnpm exec jest plugins/odoo-connector`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
[ "$(git branch --show-current)" = feat/odoo-connector-orders ] && git add plugins/odoo-connector/odoo-partners.ts plugins/odoo-connector/__tests__/orders-helpers.ts plugins/odoo-connector/__tests__/helpers.ts plugins/odoo-connector/__tests__/odoo-partners.test.ts && git commit -m "feat(odoo-connector): find or create the Odoo customer and delivery address

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Send one order

**Files:**
- Create: `plugins/odoo-connector/orders-out.ts`
- Test: `plugins/odoo-connector/__tests__/orders-out.test.ts`

**Interfaces:**
- Consumes: Task 3 functions; `odooPrice(client, { pricelistId, currencyId, productId, quantity })` from `compare.ts`; `FinalError`, `K.*`, `OrderLink`, `CreatedRecord` (Task 2); `ctx.store.claim` (Task 1).
- Produces: `sendOrder(ctx: Ctx, client: OdooClient, orderId: string, now: Date): Promise<void>`; internal `failed(ctx, order, e, now)` (refined in Task 5).

- [ ] **Step 1: Write the failing tests**

`plugins/odoo-connector/__tests__/orders-out.test.ts`:

```ts
import { sendOrder } from "../orders-out";
import { K } from "../store";
import { mkOrders, order } from "./orders-helpers";
import { now } from "./helpers";

const linked = async (ctx: any) => ctx.store.set(K.account("a1"), { partnerId: 50, syncedAt: "x", salesperson: null, odooPriceList: [234, "Retail (CZK)"] });
const customer = { id: 50, name: "Bubble s.r.o.", parent_id: false, active: true, type: "contact", property_product_pricelist: [234, "Retail (CZK)"] };

describe("sending", () => {
  it("creates one draft sale order and marks the CRM order SENT", async () => {
    const { ctx, client, sales, data, calls } = mkOrders({ sales: { partners: [customer] }, orders: [order({ note: "Ring twice", requestedDeliveryDate: "2026-10-20T00:00:00.000Z" })] });
    await linked(ctx);
    await sendOrder(ctx, client, "o1", now);
    const create = calls.find((c) => c.path === "/json/2/sale.order/create")!;
    expect(create.body.vals_list[0]).toEqual({
      partner_id: 50, partner_shipping_id: 50, pricelist_id: 234, origin: "ORD-2026-0001", user_id: 9, commitment_date: "2026-10-20 00:00:00",
      note: "Rep One\nRing twice", order_line: [[0, 0, { product_id: 700, product_uom_qty: 2, price_unit: 100 }]],
    });
    expect(sales.orders).toHaveLength(1);
    expect(data.orders[0]).toMatchObject({ status: "SENT", externalRef: "1000" });
    expect(await ctx.store.get(K.order("o1"))).toMatchObject({ odooId: 1000, name: "S01000", state: "draft", sentAt: now.toISOString(), priceDiffs: [], created: [] });
  });

  it("falls back to the customer's Odoo salesperson when the owner has no Odoo user", async () => {
    const { ctx, client, calls } = mkOrders({ sales: { partners: [{ ...customer, user_id: [12, "Key Account"] }], users: [] } });
    await linked(ctx);
    await sendOrder(ctx, client, "o1", now);
    expect(calls.find((c) => c.path === "/json/2/sale.order/create")!.body.vals_list[0].user_id).toBe(12);
  });

  it("uses the order's price list when it was imported from Odoo", async () => {
    const { ctx, client, calls } = mkOrders({ sales: { partners: [customer] }, orders: [order({ priceListId: "L245" })] });
    await linked(ctx);
    await ctx.store.set(K.pricelist(245), { priceListId: "L245", name: "Gold", ruleCount: 1, syncedAt: "x", isActive: true });
    await sendOrder(ctx, client, "o1", now);
    expect(calls.find((c) => c.path === "/json/2/sale.order/create")!.body.vals_list[0].pricelist_id).toBe(245);
  });

  it("creates the customer and a delivery address and records both", async () => {
    const { ctx, client, sales } = mkOrders({ orders: [order({ shipping_street: "Depot 5", shipping_city: "Brno", shipping_postal_code: "60200" })] });
    await sendOrder(ctx, client, "o1", now);
    expect(sales.partners.map((p) => p.type)).toEqual(["contact", "delivery"]);
    expect((await ctx.store.get<any>(K.order("o1"))).created).toEqual(["customer", "delivery"]);
    expect((await ctx.store.get<any[]>(K.created))!.map((c) => [c.kind, c.orderNumber])).toEqual([["delivery", "ORD-2026-0001"], ["customer", "ORD-2026-0001"]]);
  });

  it("finds an existing Odoo order by origin instead of creating a second one", async () => {
    const existing = { id: 900, name: "S00900", origin: "ORD-2026-0001", state: "draft" };
    const line = { id: 901, order_id: [900, "S00900"], display_type: false, product_id: [700, "x"], product_uom_qty: 2, price_unit: 100 };
    const { ctx, client, data, writes } = mkOrders({ sales: { partners: [customer], orders: [existing], lines: [line] } });
    await linked(ctx);
    await sendOrder(ctx, client, "o1", now);
    expect(writes()).toEqual([]);
    expect(data.orders[0]).toMatchObject({ status: "SENT", externalRef: "900" });
  });

  it("refuses when Odoo has the number with other lines (Review Focus 3)", async () => {
    const existing = { id: 900, name: "S00900", origin: "ORD-2026-0001", state: "draft" };
    const line = { id: 901, order_id: [900, "S00900"], display_type: false, product_id: [700, "x"], product_uom_qty: 5, price_unit: 100 };
    const { ctx, client, data, writes } = mkOrders({ sales: { partners: [customer], orders: [existing], lines: [line] } });
    await linked(ctx);
    await sendOrder(ctx, client, "o1", now);
    expect(writes()).toEqual([]);
    expect(data.orders[0].status).toBe("SYNC_FAILED");
    expect(await ctx.store.get(K.failed("o1"))).toEqual({ reason: "orders.otherLines", at: now.toISOString() });
  });

  it("ignores cancelled Odoo orders with the same origin", async () => {
    const { ctx, client, sales } = mkOrders({ sales: { partners: [customer], orders: [{ id: 900, name: "S00900", origin: "ORD-2026-0001", state: "cancel" }] } });
    await linked(ctx);
    await sendOrder(ctx, client, "o1", now);
    expect(sales.orders).toHaveLength(2);
  });

  it("fails at once, without Odoo writes, on a product that does not come from Odoo", async () => {
    const { ctx, client, data, writes } = mkOrders({ products: [{ id: "p1", source: "CRM", externalRef: null, sku: "X1", name: "Own", status: "ACTIVE" }] });
    await sendOrder(ctx, client, "o1", now);
    expect(writes()).toEqual([]);
    expect(data.orders[0].status).toBe("SYNC_FAILED");
    expect(ctx.notifications).toHaveLength(1);
  });

  it("fails at once when the order currency differs from the Odoo price list", async () => {
    const { ctx, client, data, writes } = mkOrders({ sales: { partners: [customer] }, orders: [order({ currency: "EUR" })] });
    await linked(ctx);
    await sendOrder(ctx, client, "o1", now);
    expect(writes()).toEqual([]);
    expect(data.orders[0].status).toBe("SYNC_FAILED");
  });

  it("flags lines whose Odoo price differs by more than 1, not by 1", async () => {
    const a = mkOrders({ sales: { partners: [customer], price: 101.5 } });
    await linked(a.ctx);
    await sendOrder(a.ctx, a.client, "o1", now);
    expect((await a.ctx.store.get<any>(K.order("o1"))).priceDiffs).toEqual([{ sku: "800009", crm: 100, odoo: 101.5 }]);
    const b = mkOrders({ sales: { partners: [customer], price: 101 } });
    await linked(b.ctx);
    await sendOrder(b.ctx, b.client, "o1", now);
    expect((await b.ctx.store.get<any>(K.order("o1"))).priceDiffs).toEqual([]);
  });

  it("still sends when Odoo cannot price the lines", async () => {
    const { ctx, client, data } = mkOrders({ sales: { partners: [customer], price: null } });
    await linked(ctx);
    await sendOrder(ctx, client, "o1", now);
    expect(data.orders[0].status).toBe("SENT");
    expect(ctx.logs.some((l) => l.level === "warn" && l.message.includes("Price check"))).toBe(true);
  });

  it("writes nothing with sendOrders off, in dry run, or for an order that is not READY", async () => {
    for (const [settings, o] of [[{ sendOrders: false }, order()], [{ dryRun: true }, order()], [{}, order({ status: "DRAFT" })], [{}, order({ externalRef: "5" })]] as const) {
      const { ctx, client, calls, data } = mkOrders({ settings, orders: [o], sales: { partners: [customer] } });
      await linked(ctx);
      await sendOrder(ctx, client, "o1", now);
      expect(calls).toHaveLength(0);
      expect(data.orders[0].status).toBe(o.status);
    }
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm exec jest plugins/odoo-connector/__tests__/orders-out.test.ts`
Expected: FAIL — `Cannot find module '../orders-out'`.

- [ ] **Step 3: Implement**

`plugins/odoo-connector/orders-out.ts`:

```ts
import type { RecordData } from "@nextcrm/plugin-sdk";
import { odooPrice } from "./compare";
import type { M2O } from "./map";
import { findOrCreateCustomer, findOrCreateDelivery, salesperson } from "./odoo-partners";
import type { OdooClient } from "./odoo";
import { FinalError } from "./orders-errors";
import type { Ctx } from "./settings";
import { K, type CreatedRecord, type OrderLink, type PriceListLink } from "./store";

const CLAIM_MS = 10 * 60_000;
const TOLERANCE = 1;

type OdooLine = { product_id: number; product_uom_qty: number; price_unit: number };
interface PriceList { id: number; currencyId: number }

async function remember(ctx: Ctx, now: Date, kind: CreatedRecord["kind"], odooId: number, name: string, orderNumber: string) {
  const list = (await ctx.store.get<CreatedRecord[]>(K.created)) ?? [];
  await ctx.store.set(K.created, [{ at: now.toISOString(), kind, odooId, name, orderNumber }, ...list].slice(0, 20));
}

/** Spec § 4.2 step 4: the order's list when it came from Odoo, else the customer's; its currency must be the order's. */
async function priceListFor(ctx: Ctx, client: OdooClient, order: RecordData, partnerId: number): Promise<PriceList> {
  let id: number | null = null;
  if (order.priceListId) {
    for (const e of await ctx.store.list("pricelist:")) if ((e.value as PriceListLink).priceListId === order.priceListId) id = Number(e.key.slice(10));
  }
  if (!id) {
    const [p] = await client.call<{ property_product_pricelist?: M2O }[]>("res.partner", "read", { ids: [partnerId], fields: ["property_product_pricelist"] });
    id = p?.property_product_pricelist ? p.property_product_pricelist[0] : null;
  }
  if (!id) throw new FinalError(ctx.t("orders.noPriceList"));
  const [l] = await client.call<{ id: number; currency_id: M2O }[]>("product.pricelist", "read", { ids: [id], fields: ["currency_id"] });
  const code = l?.currency_id ? l.currency_id[1] : "";
  if (code !== order.currency) throw new FinalError(ctx.t("orders.currency", { order: String(order.currency), list: code }));
  return { id, currencyId: (l.currency_id as [number, string])[0] };
}

async function partnerUser(client: OdooClient, partnerId: number): Promise<number | false> {
  const [p] = await client.call<{ user_id?: M2O }[]>("res.partner", "read", { ids: [partnerId], fields: ["user_id"] });
  return p?.user_id ? p.user_id[0] : false;
}

async function sameLines(client: OdooClient, saleId: number, want: OdooLine[]): Promise<boolean> {
  const have = await client.call<{ product_id: M2O; product_uom_qty: number; price_unit: number }[]>("sale.order.line", "search_read", {
    domain: [["order_id", "=", saleId], ["display_type", "=", false]], fields: ["product_id", "product_uom_qty", "price_unit"],
  });
  const key = (p: number, q: number, u: number) => `${p}|${q.toFixed(4)}|${u.toFixed(2)}`;
  const a = have.map((l) => key(l.product_id ? l.product_id[0] : 0, l.product_uom_qty, l.price_unit)).sort();
  const b = want.map((l) => key(l.product_id, l.product_uom_qty, l.price_unit)).sort();
  return a.join(",") === b.join(",");
}

/** Spec § 4.2 step 6: read-only; a failure here is logged and never fails the send. */
async function priceDiffs(ctx: Ctx, client: OdooClient, list: PriceList, lines: RecordData[], odooLines: OdooLine[]) {
  const out: OrderLink["priceDiffs"] = [];
  for (let i = 0; i < odooLines.length; i++) {
    try {
      const odoo = await odooPrice(client, { pricelistId: list.id, currencyId: list.currencyId, productId: odooLines[i].product_id, quantity: odooLines[i].product_uom_qty });
      if (Math.abs(odoo - odooLines[i].price_unit) > TOLERANCE) out.push({ sku: String(lines[i].sku ?? lines[i].productName), crm: odooLines[i].price_unit, odoo });
    } catch (e) {
      ctx.log.warn(`Price check failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return out;
}

async function send(ctx: Ctx, client: OdooClient, order: RecordData, now: Date): Promise<void> {
  const id = order.id as string;
  const number = String(order.number);
  const lines = (order.lines ?? []) as RecordData[];
  const account = await ctx.data.accounts.get(order.accountId as string);
  if (!account?.name) throw new FinalError(ctx.t("orders.noAccount"));
  const odooLines: OdooLine[] = [];
  for (const l of lines) {
    const p = await ctx.data.products.get(l.productId as string);
    const ref = p?.source === "EXTERNAL" ? Number(p.externalRef) : NaN;
    if (!ref || !(await ctx.store.get(K.product(ref)))) throw new FinalError(ctx.t("orders.notOdooProduct", { product: String(l.sku ?? l.productName) }));
    odooLines.push({ product_id: ref, product_uom_qty: Number(l.quantity), price_unit: Number(l.unitPrice) });
  }
  const user = await salesperson(ctx, client, (order.ownerId as string | null) ?? null);
  const customer = await findOrCreateCustomer(ctx, client, account, user, now);
  if (customer.created) await remember(ctx, now, "customer", customer.partnerId, String(account.name), number);
  const seller = user || (await partnerUser(client, customer.partnerId));   // spec § 4.2: else the customer's salesperson
  const shipping = await findOrCreateDelivery(ctx, client, customer.partnerId, order);
  if (shipping.created) await remember(ctx, now, "delivery", shipping.shippingId, String(account.name), number);
  const list = await priceListFor(ctx, client, order, customer.partnerId);

  const [found] = await client.call<{ id: number; name: string }[]>("sale.order", "search_read", {
    domain: [["origin", "=", number], ["state", "!=", "cancel"]], fields: ["id", "name"], limit: 1,
  });
  let sale = found;
  if (found) {
    if (!(await sameLines(client, found.id, odooLines))) throw new FinalError(ctx.t("orders.otherLines", { name: found.name }));
  } else {
    const owner = order.ownerId ? await ctx.data.users.get(order.ownerId as string) : null;
    const note = [owner?.name ? String(owner.name) : null, order.note ? String(order.note) : null].filter(Boolean).join("\n") || false;
    const day = order.requestedDeliveryDate ? `${new Date(order.requestedDeliveryDate as string).toISOString().slice(0, 10)} 00:00:00` : false;
    const [saleId] = await client.call<number[]>("sale.order", "create", { vals_list: [{
      partner_id: customer.partnerId, partner_shipping_id: shipping.shippingId, pricelist_id: list.id, origin: number,
      user_id: seller, commitment_date: day, note, order_line: odooLines.map((l) => [0, 0, l]),
    }] }, { once: true });
    const [row] = await client.call<{ name: string }[]>("sale.order", "read", { ids: [saleId], fields: ["name"] });
    sale = { id: saleId, name: row?.name ?? String(saleId) };
  }

  await ctx.data.orders.update(id, { status: "SENT", externalRef: String(sale.id) });
  const link: OrderLink = {
    odooId: sale.id, name: sale.name, state: "draft", sentAt: now.toISOString(), total: null, totalDiffers: false,
    priceDiffs: await priceDiffs(ctx, client, list, lines, odooLines), deliveries: [], invoices: [],
    created: [...(customer.created ? ["customer" as const] : []), ...(shipping.created ? ["delivery" as const] : [])], checkedAt: now.toISOString(),
  };
  await ctx.store.set(K.order(id), link);
  await ctx.store.delete(K.send(id));
  ctx.log.info(`Order ${number} sent to Odoo as ${sale.name}`, { orderId: id, odooId: sale.id });
}

/** Task 4: every failure is final. Task 5 sorts them into unreachable, denied and refused (spec § 5). */
async function failed(ctx: Ctx, order: RecordData, e: unknown, now: Date): Promise<void> {
  const id = order.id as string;
  const reason = e instanceof Error ? e.message : String(e);
  try { await ctx.data.orders.update(id, { status: "SYNC_FAILED" }); } catch (err) { ctx.log.warn(`Order ${String(order.number)}: ${String(err)}`); }
  await ctx.store.set(K.failed(id), { reason, at: now.toISOString() });
  await ctx.store.delete(K.send(id));
  ctx.log.error(`Order ${String(order.number)} could not be sent: ${reason}`, { orderId: id });
  await ctx.notify({ roles: ["admin"], subject: ctx.t("mail.orderFailedSubject", { number: String(order.number) }), text: ctx.t("mail.orderFailedText", { number: String(order.number), error: reason }) });
}

const sendable = (o: RecordData | null) => !!o && o.status === "READY" && !o.externalRef;

/** Spec § 4.1: one sender per order (claim), re-read before any write; Retry starts over (failed: removed). */
export async function sendOrder(ctx: Ctx, client: OdooClient, orderId: string, now: Date): Promise<void> {
  if (!ctx.settings.sendOrders || await ctx.store.get(K.sendPaused)) return;
  if (!sendable(await ctx.data.orders.get(orderId))) return;   // cheap no-op for the connector's own status writes
  if (ctx.settings.dryRun) {
    const o = await ctx.data.orders.get(orderId);
    ctx.log.info("Dry run: would send order", { orderId, number: o?.number ?? null });
    return;
  }
  if (!(await ctx.store.claim(K.sending(orderId), CLAIM_MS))) return;
  try {
    const order = await ctx.data.orders.get(orderId);
    if (!sendable(order)) return;
    await ctx.store.delete(K.failed(orderId));
    try { await send(ctx, client, order!, now); } catch (e) { await failed(ctx, order!, e, now); }
  } finally {
    await ctx.store.delete(K.sending(orderId));
  }
}
```

`PriceListLink` is already exported from `store.ts` (part 2).

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm exec jest plugins/odoo-connector`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
[ "$(git branch --show-current)" = feat/odoo-connector-orders ] && git add plugins/odoo-connector/orders-out.ts plugins/odoo-connector/__tests__/orders-out.test.ts && git commit -m "feat(odoo-connector): send a READY order to Odoo as a draft sale order

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Failures, repeat safety, sweep and plugin wiring

**Files:**
- Modify: `plugins/odoo-connector/orders-out.ts` (`failed`, `sweepOrders`, `onOrderUpdated`)
- Modify: `plugins/odoo-connector/plugin.ts`
- Test: `plugins/odoo-connector/__tests__/orders-failures.test.ts`, `plugins/odoo-connector/__tests__/plugin.test.ts`

**Interfaces:**
- Consumes: `sendOrder` (Task 4), `failKind`, `FinalError` (Task 2).
- Produces: `sweepOrders(ctx: Ctx, client: OdooClient, now: Date): Promise<number>`; `onOrderUpdated(input: AfterInput, ctx: Ctx): Promise<void>`; plugin 0.3.0 registering `x.after("order", "updated", onOrderUpdated)` and the sweep in the cron.

- [ ] **Step 1: Write the failing tests**

`plugins/odoo-connector/__tests__/orders-failures.test.ts`:

```ts
import plugin from "../plugin";
import { onOrderUpdated, sendOrder, sweepOrders } from "../orders-out";
import { K } from "../store";
import { mkOrders, order } from "./orders-helpers";
import { now } from "./helpers";

const later = (min: number) => new Date(now.getTime() + min * 60_000);

describe("failure kinds (spec § 5)", () => {
  it("Odoo down: no attempt counted, the order waits READY", async () => {
    const { ctx, client, data } = mkOrders({ sales: { fail: { "res.partner/create": 503 } } });
    await sendOrder(ctx, client, "o1", now);
    await sendOrder(ctx, client, "o1", later(5));
    expect(data.orders[0].status).toBe("READY");
    expect(await ctx.store.get(K.send("o1"))).toMatchObject({ attempts: 0, waitingSince: now.toISOString() });
    expect(ctx.notifications).toHaveLength(0);
  });

  it("401/403: pauses sending for every order and notifies once", async () => {
    const { ctx, client, data, calls } = mkOrders({ orders: [order(), order({ id: "o2", number: "ORD-2026-0002" })], sales: { fail: { "res.partner/create": 403 } } });
    await sendOrder(ctx, client, "o1", now);
    const before = calls.length;
    await sendOrder(ctx, client, "o2", now);
    expect(calls.length).toBe(before);
    expect(data.orders.map((o) => o.status)).toEqual(["READY", "READY"]);
    expect(await ctx.store.get(K.sendPaused)).toMatchObject({ at: now.toISOString() });
    expect(ctx.notifications).toHaveLength(1);
  });

  it("5 refusals of one order: SYNC_FAILED and one notification", async () => {
    const { ctx, client, data } = mkOrders({ sales: { fail: { "res.partner/create": 422 } } });
    for (let i = 1; i <= 4; i++) {
      await sendOrder(ctx, client, "o1", later(i));
      expect(await ctx.store.get(K.send("o1"))).toMatchObject({ attempts: i });
      expect(data.orders[0].status).toBe("READY");
    }
    await sendOrder(ctx, client, "o1", later(5));
    expect(data.orders[0].status).toBe("SYNC_FAILED");
    expect(await ctx.store.get(K.send("o1"))).toBeNull();
    expect(await ctx.store.get(K.failed("o1"))).toMatchObject({ reason: expect.stringContaining("422") });
    expect(ctx.notifications).toHaveLength(1);
  });

  it("Retry gives a failed order 5 fresh attempts", async () => {
    const { ctx, client, data, sales } = mkOrders({ sales: { fail: { "res.partner/create": 422 } } });
    for (let i = 1; i <= 5; i++) await sendOrder(ctx, client, "o1", later(i));
    data.orders[0].status = "READY";           // core Retry: SYNC_FAILED → READY
    delete sales.fail["res.partner/create"];
    await sendOrder(ctx, client, "o1", later(10));
    expect(data.orders[0].status).toBe("SENT");
    expect(await ctx.store.get(K.failed("o1"))).toBeNull();
  });
});

describe("repeat safety (criterion 11)", () => {
  for (const step of ["res.partner/create", "sale.order/create"]) {
    it(`one partner, one delivery address, one order after a crash right after ${step}`, async () => {
      const { ctx, client, data, sales } = mkOrders({
        orders: [order({ shipping_street: "Depot 5", shipping_city: "Brno", shipping_postal_code: "60200" })],
        sales: { fail: { [step]: "after" } },
      });
      await sendOrder(ctx, client, "o1", now);
      expect(data.orders[0].status).toBe("READY");
      await sendOrder(ctx, client, "o1", later(5));
      expect(data.orders[0].status).toBe("SENT");
      expect(sales.partners.filter((p) => p.type === "contact")).toHaveLength(1);
      expect(sales.partners.filter((p) => p.type === "delivery")).toHaveLength(1);
      expect(sales.orders).toHaveLength(1);
    });
  }

  it("event and sweep at the same moment create one Odoo order", async () => {
    const { ctx, client, sales } = mkOrders();
    await Promise.all([sendOrder(ctx, client, "o1", now), sendOrder(ctx, client, "o1", now)]);
    expect(sales.orders).toHaveLength(1);
  });
});

describe("sweep and hook", () => {
  it("sweeps READY orders without an Odoo id, oldest first", async () => {
    const { ctx, client, sales } = mkOrders({ orders: [
      order({ id: "o2", number: "N2", createdAt: "2026-10-13T07:30:00.000Z" }),
      order({ id: "o1", number: "N1", createdAt: "2026-10-13T07:00:00.000Z" }),
      order({ id: "o3", number: "N3", status: "SENT", externalRef: "77" }),
    ] });
    expect(await sweepOrders(ctx, client, now)).toBe(2);
    expect(sales.orders.map((o) => o.origin)).toEqual(["N1", "N2"]);
  });

  it("does not sweep in dry run or with sendOrders off", async () => {
    for (const settings of [{ dryRun: true }, { sendOrders: false }]) {
      const { ctx, client, calls } = mkOrders({ settings });
      expect(await sweepOrders(ctx, client, now)).toBe(0);
      expect(calls).toHaveLength(0);
    }
  });

  it("ignores updates of orders that are not READY (Review Focus 5)", async () => {
    const { ctx, calls } = mkOrders({ orders: [order({ status: "SENT", externalRef: "77" })] });
    const claim = jest.spyOn(ctx.store, "claim");
    await onOrderUpdated({ entity: "order", operation: "updated", recordId: "o1", changed: ["status"] }, ctx);
    expect(claim).not.toHaveBeenCalled();
    expect(calls).toHaveLength(0);
  });

  it("sends when an order becomes READY", async () => {
    const { ctx, sales } = mkOrders();
    await onOrderUpdated({ entity: "order", operation: "updated", recordId: "o1", changed: ["status"] }, ctx);
    expect(sales.orders).toHaveLength(1);
  });

  it("registers the hook and keeps one cron", () => {
    expect(plugin.extensions.afters.map((a) => [a.entity, a.operation])).toEqual([["order", "updated"]]);
    expect(plugin.extensions.crons.map((c) => c.id)).toEqual(["sync"]);
  });
});
```

In `plugins/odoo-connector/__tests__/plugin.test.ts` change the first assertions to:

```ts
  expect([plugin.id, plugin.version, plugin.sdk]).toEqual(["odoo-connector", "0.3.0", "^0.2.4"]);
  expect(plugin.permissions).toEqual(["http", "accounts:read", "accounts:write", "contacts:read", "contacts:write", "users:read", "notify", "products:read", "products:write", "priceLists:read", "priceLists:write", "orders:read", "orders:write"]);
```

- [ ] **Step 2: Run to verify they fail**

Run: `pnpm exec jest plugins/odoo-connector/__tests__/orders-failures.test.ts plugins/odoo-connector/__tests__/plugin.test.ts`
Expected: FAIL — `sweepOrders`/`onOrderUpdated` not exported; 503 makes the order SYNC_FAILED (Task 4's all-final `failed`); version 0.2.0.

- [ ] **Step 3: Implement**

In `orders-out.ts`, add imports:

```ts
import type { AfterInput } from "@nextcrm/plugin-sdk";
import { jsonClient } from "./odoo";
import { failKind } from "./orders-errors";
import { type SendState } from "./store";
```

(merge `SendState` into the existing `./store` import; `jsonClient` into the `./odoo` import, keeping `type OdooClient`).

Replace `failed` with:

```ts
const MAX_ATTEMPTS = 5;

/** Spec § 5: unreachable waits, denied pauses everything, refused counts; 5 refusals or a final error → SYNC_FAILED. */
async function failed(ctx: Ctx, order: RecordData, e: unknown, now: Date): Promise<void> {
  const id = order.id as string;
  const number = String(order.number);
  const reason = e instanceof Error ? e.message : String(e);
  const kind = e instanceof FinalError ? "final" : failKind(e);
  const prev = (await ctx.store.get<SendState>(K.send(id))) ?? { attempts: 0, lastError: null, waitingSince: null };
  if (kind === "unreachable" || kind === "denied") {
    await ctx.store.set(K.send(id), { ...prev, lastError: reason, waitingSince: prev.waitingSince ?? now.toISOString() } satisfies SendState);
    ctx.log.warn(`Order ${number} waits for Odoo: ${reason}`, { orderId: id });
    if (kind === "denied" && !(await ctx.store.get(K.sendPaused))) {
      await ctx.store.set(K.sendPaused, { at: now.toISOString(), reason });
      await ctx.notify({ roles: ["admin"], subject: ctx.t("mail.pausedSubject"), text: ctx.t("mail.pausedText", { error: reason }) });
    }
    return;
  }
  const attempts = kind === "final" ? MAX_ATTEMPTS : prev.attempts + 1;
  if (attempts < MAX_ATTEMPTS) {
    await ctx.store.set(K.send(id), { ...prev, attempts, lastError: reason } satisfies SendState);
    ctx.log.warn(`Order ${number}: Odoo refused attempt ${attempts} of ${MAX_ATTEMPTS}: ${reason}`, { orderId: id });
    return;
  }
  try { await ctx.data.orders.update(id, { status: "SYNC_FAILED" }); } catch (err) { ctx.log.warn(`Order ${number}: ${String(err)}`); }
  await ctx.store.set(K.failed(id), { reason, at: now.toISOString() });
  await ctx.store.delete(K.send(id));
  ctx.log.error(`Order ${number} could not be sent: ${reason}`, { orderId: id });
  await ctx.notify({ roles: ["admin"], subject: ctx.t("mail.orderFailedSubject", { number }), text: ctx.t("mail.orderFailedText", { number, error: reason }) });
}
```

Append:

```ts
/** Spec § 4.1: every cron run sends READY orders without an Odoo id, oldest first. Not in dry run (plan Ruling 5). */
export async function sweepOrders(ctx: Ctx, client: OdooClient, now: Date): Promise<number> {
  if (!ctx.settings.sendOrders || ctx.settings.dryRun) return 0;
  const rows = await ctx.data.orders.find({ where: { status: "READY", externalRef: null }, orderBy: { createdAt: "asc" }, take: 50 });
  for (const o of rows) await sendOrder(ctx, client, o.id as string, now);
  return rows.length;
}

/** Plan Ruling 1: core's after-write hook fires for Submit, Approve and Retry; sendOrder ignores everything but READY. */
export async function onOrderUpdated(input: AfterInput, ctx: Ctx): Promise<void> {
  await sendOrder(ctx, jsonClient(ctx), input.recordId, new Date());
}
```

`plugins/odoo-connector/plugin.ts`:

```ts
import { onOrderUpdated, sweepOrders } from "./orders-out";
```

```ts
  version: "0.3.0",
  sdk: "^0.2.4",
  description: "Imports customers, their people and the product catalog with price lists from an Odoo ERP and keeps them current; sends READY orders to Odoo as draft sale orders and brings their status back.",
  permissions: ["http", "accounts:read", "accounts:write", "contacts:read", "contacts:write", "users:read", "notify", "products:read", "products:write", "priceLists:read", "priceLists:write", "orders:read", "orders:write"],
```

```ts
    x.cron("sync", "*/5 * * * *", async (ctx) => { const now = new Date(); await runQueued(ctx, now); await sweepOrders(ctx, jsonClient(ctx), now); await scheduledSync(ctx, now); });
    x.after("order", "updated", (input, ctx) => onOrderUpdated(input, ctx));
```

- [ ] **Step 4: Run to verify they pass**

Run: `pnpm exec jest plugins/odoo-connector __tests__/plugins`
Expected: PASS (the contract test still passes: no new message keys are required by tests).

- [ ] **Step 5: Commit**

```bash
[ "$(git branch --show-current)" = feat/odoo-connector-orders ] && git add plugins/odoo-connector/orders-out.ts plugins/odoo-connector/plugin.ts plugins/odoo-connector/__tests__/orders-failures.test.ts plugins/odoo-connector/__tests__/plugin.test.ts && git commit -m "feat(odoo-connector): failure handling, sweep and order hook for sending

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Statuses back

**Files:**
- Create: `plugins/odoo-connector/orders-status.ts`
- Modify: `plugins/odoo-connector/sync.ts` (`runSync`, `Run`)
- Test: `plugins/odoo-connector/__tests__/orders-status.test.ts`

**Interfaces:**
- Consumes: `OrderLink`, `K.order` (Task 2); `salesHandlers` fixture (Task 3).
- Produces: `targetStatus(sale: OdooSale | null, moves: OdooMove[]): string`; `syncOrderStatuses(a: { ctx: Ctx; client: OdooClient; dry: boolean; now: Date }): Promise<{ checked: number; moved: number }>`; `RunSummary.orders`.

- [ ] **Step 1: Write the failing tests**

`plugins/odoo-connector/__tests__/orders-status.test.ts`:

```ts
import { syncOrderStatuses, targetStatus, type OdooMove, type OdooSale } from "../orders-status";
import { runSync } from "../sync";
import { K, type OrderLink } from "../store";
import { mkOrders, order } from "./orders-helpers";
import { now } from "./helpers";

const sale = (over: Partial<OdooSale> = {}): OdooSale => ({ id: 900, name: "S00900", state: "sale", delivery_status: false, invoice_status: "no", amount_total: 242, invoice_ids: [], picking_ids: [], ...over });
const inv = (over: Partial<OdooMove> = {}): OdooMove => ({ id: 1, name: "INV/1", move_type: "out_invoice", state: "posted", payment_state: "not_paid", invoice_date: "2026-10-14", invoice_date_due: "2026-10-28", amount_total: 242, amount_residual: 242, ...over });
const link = (over: Partial<OrderLink> = {}): OrderLink => ({ odooId: 900, name: "S00900", state: "draft", sentAt: now.toISOString(), total: null, totalDiffers: false, priceDiffs: [], deliveries: [], invoices: [], created: [], checkedAt: now.toISOString(), ...over });

describe("status table (spec § 4.3)", () => {
  it.each([
    ["deleted", null, [], "CANCELLED"],
    ["cancelled", sale({ state: "cancel" }), [], "CANCELLED"],
    ["draft", sale({ state: "draft" }), [], "SENT"],
    ["quotation sent", sale({ state: "sent" }), [], "SENT"],
    ["confirmed", sale(), [], "CONFIRMED"],
    ["locked", sale({ state: "done" }), [], "CONFIRMED"],
    ["partly shipped", sale({ delivery_status: "partial" }), [], "CONFIRMED"],
    ["shipped", sale({ delivery_status: "full" }), [], "DELIVERED"],
    ["invoiced before shipping", sale({ invoice_status: "invoiced", invoice_ids: [1] }), [inv()], "INVOICED"],
    ["partly paid", sale({ invoice_status: "invoiced", invoice_ids: [1] }), [inv({ payment_state: "partial" })], "INVOICED"],
    ["paid", sale({ invoice_status: "invoiced", invoice_ids: [1] }), [inv({ payment_state: "paid" })], "PAID"],
    ["in payment", sale({ invoice_status: "invoiced", invoice_ids: [1] }), [inv({ payment_state: "in_payment" })], "PAID"],
    ["reversed invoice ignored", sale({ invoice_status: "invoiced", invoice_ids: [1, 2] }), [inv({ payment_state: "reversed" }), inv({ id: 2, payment_state: "paid" })], "PAID"],
    ["paid partial invoice is not PAID", sale({ invoice_status: "to invoice", invoice_ids: [1] }), [inv({ payment_state: "paid" })], "CONFIRMED"],
  ] as const)("%s", (_n, s, moves, want) => expect(targetStatus(s as OdooSale | null, moves as OdooMove[])).toBe(want));
});

describe("reading back", () => {
  const setup = async (o: Record<string, unknown>, s: Partial<OdooSale> | null, moves: OdooMove[] = [], pickings: Record<string, unknown>[] = []) => {
    const m = mkOrders({ orders: [order({ status: "SENT", externalRef: "900", ...o })], sales: { orders: s ? [sale(s)] : [], moves, pickings } });
    await m.ctx.store.set(K.order("o1"), link());
    return m;
  };

  it("moves the order forward and refreshes the panel data", async () => {
    const { ctx, client, data } = await setup({}, { delivery_status: "full", picking_ids: [5], amount_total: 260 }, [], [{ id: 5, name: "WH/OUT/1", state: "done", date_done: "2026-10-15 09:00:00", picking_type_code: "outgoing" }]);
    expect(await syncOrderStatuses({ ctx, client, dry: false, now })).toEqual({ checked: 1, moved: 1 });
    expect(data.orders[0].status).toBe("DELIVERED");
    expect(await ctx.store.get(K.order("o1"))).toMatchObject({ state: "sale", total: 260, totalDiffers: true, deliveries: [{ name: "WH/OUT/1", state: "done", date: "2026-10-15 09:00:00" }] });
  });

  it("stores invoices with what is left to pay", async () => {
    const { ctx, client } = await setup({}, { invoice_status: "invoiced", invoice_ids: [1] }, [inv({ payment_state: "partial", amount_residual: 42 })]);
    await syncOrderStatuses({ ctx, client, dry: false, now });
    expect((await ctx.store.get<OrderLink>(K.order("o1")))!.invoices).toEqual([{ number: "INV/1", type: "out_invoice", date: "2026-10-14", due: "2026-10-28", amount: 242, residual: 42, paymentState: "partial" }]);
  });

  it("maps a deleted Odoo order to CANCELLED (Review Focus 4)", async () => {
    const { ctx, client, data, calls } = await setup({}, null);
    await syncOrderStatuses({ ctx, client, dry: false, now });
    expect(data.orders[0].status).toBe("CANCELLED");
    expect(calls.some((c) => c.path === "/json/2/sale.order/read")).toBe(false);
  });

  it("never moves backwards and logs it; a manual CRM move is kept", async () => {
    const { ctx, client, data } = await setup({ status: "DELIVERED" }, {});
    expect(await syncOrderStatuses({ ctx, client, dry: false, now })).toEqual({ checked: 1, moved: 0 });
    expect(data.orders[0].status).toBe("DELIVERED");
    expect(ctx.logs.some((l) => l.message.includes("went back"))).toBe(true);
  });

  it("does not read finished orders", async () => {
    const { ctx, client, calls } = await setup({ status: "PAID" }, {});
    expect(await syncOrderStatuses({ ctx, client, dry: false, now })).toEqual({ checked: 0, moved: 0 });
    expect(calls).toHaveLength(0);
  });

  it("writes nothing in dry run", async () => {
    const { ctx, client, data } = await setup({}, {});
    await syncOrderStatuses({ ctx, client, dry: true, now });
    expect(data.orders[0].status).toBe("SENT");
    expect((await ctx.store.get<OrderLink>(K.order("o1")))!.state).toBe("draft");
  });

  it("runs inside the sync and reports its counts", async () => {
    const { ctx, client } = await setup({}, {});
    const catalog = jest.spyOn(require("../catalog"), "syncCatalog").mockResolvedValue(undefined);
    const summary = await runSync(ctx, client, now);
    expect(summary.orders).toEqual({ checked: 1, moved: 1 });
    catalog.mockRestore();
  });
});
```

The last test stubs the catalog step; the customer step runs against the fixture (`res.partner/fields_get` and an empty partner list), so the summary carries the order counts.

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm exec jest plugins/odoo-connector/__tests__/orders-status.test.ts`
Expected: FAIL — `Cannot find module '../orders-status'`.

- [ ] **Step 3: Implement**

`plugins/odoo-connector/orders-status.ts`:

```ts
import type { RecordData } from "@nextcrm/plugin-sdk";
import type { OdooClient } from "./odoo";
import type { Ctx } from "./settings";
import { K, type OrderLink } from "./store";

export interface OdooSale {
  id: number; name: string; state: string; delivery_status?: string | false; invoice_status?: string | false;
  amount_total: number; invoice_ids: number[]; picking_ids: number[];
}
export interface OdooMove {
  id: number; name: string; move_type: string; state: string; payment_state: string;
  invoice_date: string | false; invoice_date_due: string | false; amount_total: number; amount_residual: number;
}
interface OdooPicking { id: number; name: string; state: string; date_done: string | false }

const SALE_FIELDS = ["id", "name", "state", "delivery_status", "invoice_status", "amount_total", "invoice_ids", "picking_ids"];
const MOVE_FIELDS = ["id", "name", "move_type", "state", "payment_state", "invoice_date", "invoice_date_due", "amount_total", "amount_residual"];
const RANK: Record<string, number> = { SENT: 1, CONFIRMED: 2, DELIVERED: 3, INVOICED: 4, PAID: 5 };
const TOLERANCE = 1;

/** Spec § 4.3 (+ plan Rulings 7, 8). */
export function targetStatus(sale: OdooSale | null, moves: OdooMove[]): string {
  if (!sale || sale.state === "cancel") return "CANCELLED";
  if (sale.state !== "sale" && sale.state !== "done") return "SENT";
  const invoices = moves.filter((m) => m.move_type === "out_invoice" && m.state === "posted");
  const live = invoices.filter((m) => m.payment_state !== "reversed");
  const invoiced = sale.invoice_status === "invoiced" && invoices.length > 0;
  if (invoiced && live.length && live.every((m) => m.payment_state === "paid" || m.payment_state === "in_payment")) return "PAID";
  if (invoiced) return "INVOICED";
  if (sale.delivery_status === "full") return "DELIVERED";
  return "CONFIRMED";
}

/** Spec § 4.3: every sent order that is not PAID or CANCELLED, re-read in full each cycle. */
export async function syncOrderStatuses(a: { ctx: Ctx; client: OdooClient; dry: boolean; now: Date }): Promise<{ checked: number; moved: number }> {
  const { ctx, client, dry, now } = a;
  const out = { checked: 0, moved: 0 };
  const open: { orderId: string; link: OrderLink; order: RecordData }[] = [];
  for (const e of await ctx.store.list("order:")) {
    const orderId = e.key.slice(6);
    const order = await ctx.data.orders.get(orderId);
    if (order && order.status !== "PAID" && order.status !== "CANCELLED") open.push({ orderId, link: e.value as OrderLink, order });
  }
  if (!open.length) return out;
  // search_read, never read: a deleted order must not raise (Review Focus 4).
  const sales = await client.call<OdooSale[]>("sale.order", "search_read", { domain: [["id", "in", open.map((o) => o.link.odooId)]], fields: SALE_FIELDS });
  const byId = new Map(sales.map((s) => [s.id, s]));
  const moveIds = sales.flatMap((s) => s.invoice_ids);
  const pickIds = sales.flatMap((s) => s.picking_ids);
  const moves = moveIds.length ? await client.call<OdooMove[]>("account.move", "search_read", { domain: [["id", "in", moveIds]], fields: MOVE_FIELDS }) : [];
  const picks = pickIds.length ? await client.call<OdooPicking[]>("stock.picking", "search_read", {
    domain: [["id", "in", pickIds], ["picking_type_code", "=", "outgoing"]], fields: ["id", "name", "state", "date_done"],
  }) : [];
  for (const o of open) {
    out.checked++;
    const sale = byId.get(o.link.odooId) ?? null;
    const mine = sale ? moves.filter((m) => sale.invoice_ids.includes(m.id)) : [];
    const target = targetStatus(sale, mine);
    const current = String(o.order.status);
    const forward = target !== current && (target === "CANCELLED" || (RANK[target] ?? 0) > (RANK[current] ?? 0));
    if (!forward && target !== current && target !== "CANCELLED") ctx.log.info(`Odoo order ${o.link.name} went back to ${sale?.state ?? "?"}; the CRM keeps ${current}`, { orderId: o.orderId });
    const link: OrderLink = {
      ...o.link,
      state: sale?.state ?? "deleted",
      total: sale?.amount_total ?? o.link.total,
      totalDiffers: sale ? Math.abs(sale.amount_total - Number(o.order.grandTotal)) > TOLERANCE : o.link.totalDiffers,
      deliveries: sale ? picks.filter((p) => sale.picking_ids.includes(p.id)).map((p) => ({ name: p.name, state: p.state, date: p.date_done || null })) : o.link.deliveries,
      invoices: sale ? mine.filter((m) => m.state === "posted").map((m) => ({ number: m.name, type: m.move_type, date: m.invoice_date || null, due: m.invoice_date_due || null, amount: m.amount_total, residual: m.amount_residual, paymentState: m.payment_state })) : o.link.invoices,
      checkedAt: now.toISOString(),
    };
    if (dry) {
      if (forward) ctx.log.info("Dry run: would set order status", { orderId: o.orderId, from: current, to: target });
      continue;
    }
    if (forward) {
      try { await ctx.data.orders.update(o.orderId, { status: target as never }); out.moved++; }
      catch (e) { ctx.log.warn(`Order ${String(o.order.number)}: ${e instanceof Error ? e.message : String(e)}`, { orderId: o.orderId }); }
    }
    await ctx.store.set(K.order(o.orderId), link);
  }
  return out;
}
```

`plugins/odoo-connector/sync.ts`: import `syncOrderStatuses` from `./orders-status`; add `orders?: { checked: number; moved: number }` to `Run`; after `r.catalog = await syncCatalog(...)`:

```ts
    try {
      r.orders = await syncOrderStatuses({ ctx, client, dry, now });
    } catch (e) {
      if (e instanceof OdooAuthError) throw e;
      ctx.log.error(`Order statuses failed: ${e instanceof Error ? e.message : String(e)}`);
    }
```

and include `orders: r.orders` in both `summary = { … }` objects.

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm exec jest plugins/odoo-connector`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
[ "$(git branch --show-current)" = feat/odoo-connector-orders ] && git add plugins/odoo-connector/orders-status.ts plugins/odoo-connector/sync.ts plugins/odoo-connector/__tests__/orders-status.test.ts && git commit -m "feat(odoo-connector): bring Odoo confirmation, delivery, invoice and payment back

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: Order panel, admin Orders block, texts

**Files:**
- Modify: `plugins/odoo-connector/ui/data.ts` (`orderPanelData`, `ordersData`)
- Create: `plugins/odoo-connector/ui/OrderPanel.tsx`
- Modify: `plugins/odoo-connector/ui/AdminSection.tsx`
- Modify: `plugins/odoo-connector/plugin.ts` (`x.orderPanel`)
- Modify: `plugins/odoo-connector/messages/en.json`, `cz.json`, `de.json`, `uk.json`
- Test: `plugins/odoo-connector/__tests__/ui.test.ts` (append), `plugins/odoo-connector/__tests__/plugin.test.ts`

**Interfaces:**
- Consumes: `K.order/send/failed/sendPaused/created`, `OrderLink`, `SendState`, `FailedState`, `CreatedRecord`.
- Produces: `orderPanelData(ctx: Ctx, orderId: string)`, `ordersData(ctx: Ctx, now: Date)`, `OrderPanel` server component.

- [ ] **Step 1: Write the failing tests**

Append to `plugins/odoo-connector/__tests__/ui.test.ts`:

```ts
import { orderPanelData, ordersData } from "../ui/data";
import plugin from "../plugin";
import { mkOrders, order } from "./orders-helpers";

describe("order screens", () => {
  it("has no panel for an order the connector never touched", async () => {
    const { ctx } = mkOrders();
    expect(await orderPanelData(ctx, "o1")).toBeNull();
  });

  it("links the Odoo order and passes on waiting and failure details", async () => {
    const { ctx } = mkOrders();
    await ctx.store.set(K.order("o1"), { odooId: 900, name: "S00900", state: "sale", sentAt: "2026-10-13T08:00:00.000Z", total: 242, totalDiffers: false, priceDiffs: [], deliveries: [], invoices: [], created: ["customer"], checkedAt: "x" });
    expect(await orderPanelData(ctx, "o1")).toMatchObject({ link: { name: "S00900", url: "https://odoo.example.com/odoo/action-sale.action_orders/900", created: ["customer"] }, waiting: null, failed: null });
    await ctx.store.set(K.send("o2"), { attempts: 1, lastError: "Odoo error 503", waitingSince: "2026-10-13T08:00:00.000Z" });
    expect(await orderPanelData(ctx, "o2")).toMatchObject({ link: null, waiting: { lastError: "Odoo error 503" } });
  });

  it("counts waiting, sent in 7 days and failed orders, with pause and created records", async () => {
    const { ctx } = mkOrders({ orders: [order(), order({ id: "o2", number: "N2", status: "SYNC_FAILED" }), order({ id: "o3", status: "SENT", externalRef: "1" })] });
    const at = new Date("2026-10-13T08:00:00Z");
    await ctx.store.set(K.order("o3"), { sentAt: "2026-10-12T08:00:00.000Z" });
    await ctx.store.set(K.order("o4"), { sentAt: "2026-10-01T08:00:00.000Z" });
    await ctx.store.set(K.failed("o2"), { reason: "orders.notOdooProduct", at: "x" });
    await ctx.store.set(K.sendPaused, { at: "y", reason: "403" });
    await ctx.store.set(K.created, [{ at: "z", kind: "customer", odooId: 5, name: "Bubble", orderNumber: "N2" }]);
    expect(await ordersData(ctx, at)).toEqual({
      enabled: true, waiting: 1, sent: 1, failed: [{ orderId: "o2", number: "N2", reason: "orders.notOdooProduct", at: "x" }],
      paused: { at: "y", reason: "403" }, created: [{ at: "z", kind: "customer", odooId: 5, name: "Bubble", orderNumber: "N2" }],
    });
  });

  it("registers the order panel", () => {
    expect(plugin.extensions.orderPanels.map((p) => p.id)).toEqual(["odoo"]);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm exec jest plugins/odoo-connector/__tests__/ui.test.ts`
Expected: FAIL — `orderPanelData` not exported; no order panel.

- [ ] **Step 3: Implement**

`plugins/odoo-connector/ui/data.ts`: extend the store import with `type CreatedRecord, type FailedState, type OrderLink, type SendState`, then append:

```ts
export async function orderPanelData(ctx: Ctx, orderId: string) {
  const link = await ctx.store.get<OrderLink>(K.order(orderId));
  const waiting = await ctx.store.get<SendState>(K.send(orderId));
  const failed = await ctx.store.get<FailedState>(K.failed(orderId));
  if (!link && !waiting && !failed) return null;
  return {
    link: link ? { ...link, url: `${ctx.settings.url.replace(/\/+$/, "")}/odoo/action-sale.action_orders/${link.odooId}` } : null,
    waiting, failed,
  };
}

export async function ordersData(ctx: Ctx, now: Date) {
  const waiting = ctx.settings.sendOrders ? (await ctx.data.orders.find({ where: { status: "READY", externalRef: null }, take: 500 })).length : 0;
  const since = now.getTime() - 7 * 86_400_000;
  const sent = (await ctx.store.list("order:")).filter((e) => Date.parse((e.value as OrderLink).sentAt) >= since).length;
  const failed: ({ orderId: string; number: string } & FailedState)[] = [];
  for (const e of await ctx.store.list("failed:")) {
    const orderId = e.key.slice(7);
    const o = await ctx.data.orders.get(orderId);
    failed.push({ orderId, number: String(o?.number ?? orderId), ...(e.value as FailedState) });
  }
  return {
    enabled: ctx.settings.sendOrders, waiting, sent, failed,
    paused: await ctx.store.get<{ at: string; reason: string }>(K.sendPaused),
    created: (await ctx.store.get<CreatedRecord[]>(K.created)) ?? [],
  };
}
```

`plugins/odoo-connector/ui/OrderPanel.tsx`:

```tsx
import type { OrderSlotProps } from "@nextcrm/plugin-sdk";
import type { Settings, Secrets } from "../settings";
import { orderPanelData } from "./data";

const time = (iso: string) => iso.slice(0, 16).replace("T", " ");

export async function OrderPanel({ orderId, ctx }: OrderSlotProps<Settings, Secrets>) {
  const d = await orderPanelData(ctx, orderId);
  if (!d) return null;
  const l = d.link;
  return (
    <div className="space-y-2 rounded-md border p-3 text-sm">
      <div className="font-medium">Odoo</div>
      {l && (
        <>
          <a className="underline" href={l.url} target="_blank" rel="noreferrer">{ctx.t("order.linked", { name: l.name })}</a>
          <div className="text-muted-foreground">{ctx.t("order.state", { state: l.state })}</div>
          {l.created.includes("customer") && <div>{ctx.t("order.createdCustomer")}</div>}
          {l.created.includes("delivery") && <div>{ctx.t("order.createdDelivery")}</div>}
          {l.priceDiffs.length > 0 && (
            <div>
              <div className="font-medium text-amber-600">{ctx.t("order.priceDiffs")}</div>
              <ul className="text-xs">{l.priceDiffs.map((p) => <li key={p.sku}>{ctx.t("order.priceDiff", { sku: p.sku, crm: p.crm, odoo: p.odoo })}</li>)}</ul>
            </div>
          )}
          {l.totalDiffers && l.total !== null && <div className="text-amber-600">{ctx.t("order.totalDiffers", { odoo: l.total })}</div>}
          {l.deliveries.length > 0 && (
            <div>
              <div className="font-medium">{ctx.t("order.deliveries")}</div>
              <ul className="text-xs">{l.deliveries.map((p) => <li key={p.name}>{p.name} · {p.state}{p.date ? ` · ${p.date.slice(0, 10)}` : ""}</li>)}</ul>
            </div>
          )}
          {l.invoices.length > 0 && (
            <div>
              <div className="font-medium">{ctx.t("order.invoices")}</div>
              <ul className="text-xs">{l.invoices.map((i) => (
                <li key={i.number}>{ctx.t("order.invoice", { number: i.number, due: i.due ?? "-", amount: i.amount, residual: i.residual, state: i.paymentState })}</li>
              ))}</ul>
            </div>
          )}
        </>
      )}
      {d.waiting && (
        <div>
          <div>{ctx.t("order.waiting", { date: time(d.waiting.waitingSince ?? new Date().toISOString()) })}</div>
          {d.waiting.lastError && <div className="text-xs text-muted-foreground">{ctx.t("order.lastError", { error: d.waiting.lastError })}</div>}
        </div>
      )}
      {d.failed && <div className="text-destructive">{ctx.t("order.failed", { reason: d.failed.reason })}</div>}
    </div>
  );
}
```

`plugins/odoo-connector/ui/AdminSection.tsx`: import `ordersData` from `./data`; at the top of the component `const o = await ordersData(ctx, new Date());`; before the closing `</div>` of the outer container add:

```tsx
      <div className="space-y-2">
        <h3 className="font-medium">{ctx.t("admin.orders")}</h3>
        {!o.enabled ? <p className="text-muted-foreground">{ctx.t("admin.ordersOff")}</p> : <p>{ctx.t("admin.ordersCounts", { waiting: o.waiting, sent: o.sent, failed: o.failed.length })}</p>}
        {o.paused && <p className="text-destructive">{ctx.t("admin.ordersPaused", { date: time(o.paused.at), reason: o.paused.reason })}</p>}
        {o.failed.length > 0 && (
          <ul className="text-xs">{o.failed.map((f) => <li key={f.orderId}><a className="underline" href={`/crm/orders/${f.orderId}`}>{f.number}</a> · {f.reason}</li>)}</ul>
        )}
        {o.created.length > 0 && (
          <div>
            <h4 className="font-medium">{ctx.t("admin.ordersCreated")}</h4>
            <ul className="text-xs">{o.created.map((c) => <li key={`${c.kind}:${c.odooId}`}>{time(c.at)} · {ctx.t(`admin.createdKind.${c.kind}`)} · {c.name} (#{c.odooId}) · {c.orderNumber}</li>)}</ul>
          </div>
        )}
      </div>
```

`plugins/odoo-connector/plugin.ts`: `import { OrderPanel } from "./ui/OrderPanel";` and in `extensions`: `x.orderPanel({ id: "odoo", component: OrderPanel });`

Messages — add to each file (inside `"admin"`: the six admin keys; new top-level objects `"order"` and `"orders"`; inside `"mail"`: four keys):

en.json

```json
"admin": {
  "orders": "Orders",
  "ordersOff": "Sending orders is off. Turn on sendOrders in the settings to send READY orders to Odoo.",
  "ordersCounts": "Waiting to be sent {waiting} · sent in the last 7 days {sent} · failed {failed}",
  "ordersPaused": "Sending is paused since {date}: {reason}. Fix the Odoo user's access rights, then click Test connection.",
  "ordersCreated": "Created in Odoo",
  "createdKind": { "customer": "customer", "delivery": "delivery address" }
},
"order": {
  "linked": "Odoo order {name}",
  "state": "State in Odoo: {state}",
  "createdCustomer": "Customer created in Odoo",
  "createdDelivery": "Delivery address created in Odoo",
  "priceDiffs": "Price differs from Odoo",
  "priceDiff": "{sku}: CRM {crm}, Odoo {odoo}",
  "totalDiffers": "The Odoo order total is {odoo}; it differs from this order's total.",
  "deliveries": "Deliveries",
  "invoices": "Invoices",
  "invoice": "{number} · due {due} · {amount}, left to pay {residual} · {state}",
  "waiting": "Waiting for Odoo since {date}",
  "lastError": "Last error: {error}",
  "failed": "Not sent: {reason}"
},
"orders": {
  "noAccount": "The order's account has no name",
  "notOdooProduct": "Product {product} does not come from Odoo",
  "noPriceList": "The customer has no price list in Odoo",
  "currency": "Order currency {order} differs from the Odoo price list currency {list}",
  "otherLines": "Already in Odoo as {name} with other lines; ask Odoo to cancel it, then click Retry"
},
"mail": {
  "pausedSubject": "Odoo refused to take orders",
  "pausedText": "Sending orders to Odoo is paused: {error}. Fix the Odoo user's access rights, then click Test connection.",
  "orderFailedSubject": "Order {number} was not sent to Odoo",
  "orderFailedText": "Order {number} could not be sent to Odoo: {error}. Fix the cause, then click Retry on the order."
}
```

cz.json

```json
"admin": {
  "orders": "Objednávky",
  "ordersOff": "Odesílání objednávek je vypnuté. Zapněte sendOrders v nastavení, aby objednávky ve stavu READY odcházely do Odoo.",
  "ordersCounts": "Čeká na odeslání {waiting} · odesláno za posledních 7 dní {sent} · selhalo {failed}",
  "ordersPaused": "Odesílání je pozastavené od {date}: {reason}. Opravte práva uživatele v Odoo a klikněte na Otestovat připojení.",
  "ordersCreated": "Založeno v Odoo",
  "createdKind": { "customer": "zákazník", "delivery": "doručovací adresa" }
},
"order": {
  "linked": "Objednávka v Odoo {name}",
  "state": "Stav v Odoo: {state}",
  "createdCustomer": "Zákazník byl založen v Odoo",
  "createdDelivery": "Doručovací adresa byla založena v Odoo",
  "priceDiffs": "Cena se liší od Odoo",
  "priceDiff": "{sku}: CRM {crm}, Odoo {odoo}",
  "totalDiffers": "Celková částka objednávky v Odoo je {odoo}; liší se od částky této objednávky.",
  "deliveries": "Dodání",
  "invoices": "Faktury",
  "invoice": "{number} · splatnost {due} · {amount}, zbývá uhradit {residual} · {state}",
  "waiting": "Čeká na Odoo od {date}",
  "lastError": "Poslední chyba: {error}",
  "failed": "Neodesláno: {reason}"
},
"orders": {
  "noAccount": "Účet objednávky nemá název",
  "notOdooProduct": "Produkt {product} nepochází z Odoo",
  "noPriceList": "Zákazník nemá v Odoo ceník",
  "currency": "Měna objednávky {order} se liší od měny ceníku v Odoo {list}",
  "otherLines": "V Odoo už je jako {name} s jinými řádky; požádejte o její zrušení v Odoo a klikněte na Zkusit znovu"
},
"mail": {
  "pausedSubject": "Odoo odmítlo přijímat objednávky",
  "pausedText": "Odesílání objednávek do Odoo je pozastavené: {error}. Opravte práva uživatele v Odoo a klikněte na Otestovat připojení.",
  "orderFailedSubject": "Objednávka {number} nebyla odeslána do Odoo",
  "orderFailedText": "Objednávku {number} se nepodařilo odeslat do Odoo: {error}. Odstraňte příčinu a klikněte u objednávky na Zkusit znovu."
}
```

de.json

```json
"admin": {
  "orders": "Aufträge",
  "ordersOff": "Das Senden von Aufträgen ist aus. Schalten Sie sendOrders in den Einstellungen ein, damit Aufträge im Status READY an Odoo gehen.",
  "ordersCounts": "Warten auf Versand {waiting} · gesendet in den letzten 7 Tagen {sent} · fehlgeschlagen {failed}",
  "ordersPaused": "Der Versand ist seit {date} pausiert: {reason}. Korrigieren Sie die Rechte des Odoo-Benutzers und klicken Sie auf Verbindung testen.",
  "ordersCreated": "In Odoo angelegt",
  "createdKind": { "customer": "Kunde", "delivery": "Lieferadresse" }
},
"order": {
  "linked": "Odoo-Auftrag {name}",
  "state": "Status in Odoo: {state}",
  "createdCustomer": "Kunde in Odoo angelegt",
  "createdDelivery": "Lieferadresse in Odoo angelegt",
  "priceDiffs": "Preis weicht von Odoo ab",
  "priceDiff": "{sku}: CRM {crm}, Odoo {odoo}",
  "totalDiffers": "Die Auftragssumme in Odoo ist {odoo}; sie weicht von der Summe dieses Auftrags ab.",
  "deliveries": "Lieferungen",
  "invoices": "Rechnungen",
  "invoice": "{number} · fällig {due} · {amount}, offen {residual} · {state}",
  "waiting": "Wartet seit {date} auf Odoo",
  "lastError": "Letzter Fehler: {error}",
  "failed": "Nicht gesendet: {reason}"
},
"orders": {
  "noAccount": "Das Konto des Auftrags hat keinen Namen",
  "notOdooProduct": "Produkt {product} stammt nicht aus Odoo",
  "noPriceList": "Der Kunde hat in Odoo keine Preisliste",
  "currency": "Auftragswährung {order} weicht von der Währung der Odoo-Preisliste {list} ab",
  "otherLines": "Bereits in Odoo als {name} mit anderen Positionen; lassen Sie ihn in Odoo stornieren und klicken Sie auf Erneut versuchen"
},
"mail": {
  "pausedSubject": "Odoo nimmt keine Aufträge an",
  "pausedText": "Das Senden von Aufträgen an Odoo ist pausiert: {error}. Korrigieren Sie die Rechte des Odoo-Benutzers und klicken Sie auf Verbindung testen.",
  "orderFailedSubject": "Auftrag {number} wurde nicht an Odoo gesendet",
  "orderFailedText": "Auftrag {number} konnte nicht an Odoo gesendet werden: {error}. Beheben Sie die Ursache und klicken Sie beim Auftrag auf Erneut versuchen."
}
```

uk.json

```json
"admin": {
  "orders": "Замовлення",
  "ordersOff": "Надсилання замовлень вимкнено. Увімкніть sendOrders у налаштуваннях, щоб замовлення зі статусом READY надходили в Odoo.",
  "ordersCounts": "Очікують надсилання {waiting} · надіслано за останні 7 днів {sent} · не вдалося {failed}",
  "ordersPaused": "Надсилання призупинено з {date}: {reason}. Виправте права користувача Odoo й натисніть «Перевірити з'єднання».",
  "ordersCreated": "Створено в Odoo",
  "createdKind": { "customer": "клієнт", "delivery": "адреса доставки" }
},
"order": {
  "linked": "Замовлення в Odoo {name}",
  "state": "Стан в Odoo: {state}",
  "createdCustomer": "Клієнта створено в Odoo",
  "createdDelivery": "Адресу доставки створено в Odoo",
  "priceDiffs": "Ціна відрізняється від Odoo",
  "priceDiff": "{sku}: CRM {crm}, Odoo {odoo}",
  "totalDiffers": "Сума замовлення в Odoo становить {odoo}; вона відрізняється від суми цього замовлення.",
  "deliveries": "Доставки",
  "invoices": "Рахунки",
  "invoice": "{number} · сплатити до {due} · {amount}, залишок {residual} · {state}",
  "waiting": "Очікує Odoo з {date}",
  "lastError": "Остання помилка: {error}",
  "failed": "Не надіслано: {reason}"
},
"orders": {
  "noAccount": "Обліковий запис замовлення не має назви",
  "notOdooProduct": "Товар {product} не походить з Odoo",
  "noPriceList": "Клієнт не має прайс-листа в Odoo",
  "currency": "Валюта замовлення {order} відрізняється від валюти прайс-листа Odoo {list}",
  "otherLines": "Уже є в Odoo як {name} з іншими рядками; попросіть скасувати його в Odoo й натисніть «Повторити»"
},
"mail": {
  "pausedSubject": "Odoo відмовився приймати замовлення",
  "pausedText": "Надсилання замовлень в Odoo призупинено: {error}. Виправте права користувача Odoo й натисніть «Перевірити з'єднання».",
  "orderFailedSubject": "Замовлення {number} не надіслано в Odoo",
  "orderFailedText": "Не вдалося надіслати замовлення {number} в Odoo: {error}. Усуньте причину й натисніть «Повторити» в замовленні."
}
```

(Merge the `admin` and `mail` keys into the existing objects; do not replace them.)

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm exec jest plugins/odoo-connector __tests__/plugins`
Expected: PASS, including the contract test (all four locales have the same keys).

- [ ] **Step 5: Commit**

```bash
[ "$(git branch --show-current)" = feat/odoo-connector-orders ] && git add plugins/odoo-connector/ui/data.ts plugins/odoo-connector/ui/OrderPanel.tsx plugins/odoo-connector/ui/AdminSection.tsx plugins/odoo-connector/plugin.ts plugins/odoo-connector/messages/en.json plugins/odoo-connector/messages/cz.json plugins/odoo-connector/messages/de.json plugins/odoo-connector/messages/uk.json plugins/odoo-connector/__tests__/ui.test.ts && git commit -m "feat(odoo-connector): Odoo order panel and admin Orders block

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 8: Admin docs and full verification

**Files:**
- Modify: `apps/docs/content/docs/admins/plugins/odoo-connector.mdx`

- [ ] **Step 1: Add the Orders section and settings row**

In the settings table add:

```mdx
| `sendOrders` | off | Send orders in READY to Odoo as draft sale orders. While off, the connector never writes to Odoo. |
```

Append:

```mdx
## Orders

With `sendOrders` on (and dry run off), an order that becomes **READY** goes to Odoo within seconds; a check every 5 minutes picks up anything missed.

What the connector does in Odoo, and nothing else:
- finds the customer (by the account's link, registration number, then VAT; by exact name when the account has neither) or **creates** it and links the account;
- uses the customer or one of its delivery addresses when the order's delivery address matches, or **creates** a delivery address;
- **creates** a draft sale order: the CRM order number in *Source document* (`origin`), the CRM unit prices, the account's Odoo price list (or the customer's), the salesperson by email, the rep's name and the order note in the note.

Odoo confirms the order; the connector never confirms, edits or cancels it.

The Odoo user needs **create** on contacts (`res.partner`) and sales orders (`sale.order`, `sale.order.line`) and **read** on everything else the connector reads. No delete, no accounting rights.

### Status

| Odoo | Order status |
|---|---|
| quotation | SENT |
| confirmed | CONFIRMED |
| everything shipped | DELIVERED |
| fully invoiced | INVOICED |
| fully invoiced and every invoice paid | PAID |
| cancelled or deleted | CANCELLED |

Statuses are read on every sync (`syncMinutes`). They only move forward; partly shipped or partly paid orders keep the earlier status and the **Odoo** panel on the order shows the details: deliveries, invoices with what is left to pay, a "Price differs from Odoo" list when Odoo's price list would charge more than 1 more or less than the order, and a note when GIPS changed the Odoo order's total.

### When sending fails

- **Odoo unreachable:** the order stays READY and goes out when Odoo is back; the panel shows since when it waits.
- **Odoo refuses access** (wrong key or missing rights): sending pauses for every order and admins get one notification. Fix the rights, then click **Test connection**.
- **Odoo refuses the order:** after 5 refusals, or at once for a product that does not come from Odoo, a currency that differs from the Odoo price list, or an order already in Odoo with other lines, the order becomes **SYNC_FAILED** and admins are notified. Fix the cause and click **Retry** on the order.

Sending is safe to repeat: whatever fails in between, each order exists once in Odoo.
```

- [ ] **Step 2: Full verification**

Run, each output read:
- `pnpm exec jest > .superpowers/live/jest-full.log 2>&1; tail -40 .superpowers/live/jest-full.log` → only the 6 baseline failures (enrich-contact-job, enrich-target-job, invoices/lifecycle, google-sync-classify).
- `pnpm exec tsc --noEmit -p .` → exit 0.
- `pnpm lint` → 0 errors.
- `source <scratchpad>/ci-env.sh && pnpm build` → success.

- [ ] **Step 3: Commit**

```bash
[ "$(git branch --show-current)" = feat/odoo-connector-orders ] && git add apps/docs/content/docs/admins/plugins/odoo-connector.mdx && git commit -m "docs(odoo-connector): orders out and statuses back

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 9: Live check on a local Odoo copy (Pavel's explicit OK first)

Nothing here writes to GIPS: GIPS is only read. Names `nextcrm-odoo19-db` / `nextcrm-odoo19` are removed by name afterwards. The copy holds GIPS customer data and is deleted after the check.

- [ ] **Step 1: Start Odoo 19 Community**

```bash
docker network create nextcrm-odoo19 2>/dev/null
docker run -d --name nextcrm-odoo19-db --network nextcrm-odoo19 -e POSTGRES_USER=odoo -e POSTGRES_PASSWORD=odoo -e POSTGRES_DB=postgres postgres:16
docker run -d --name nextcrm-odoo19 --network nextcrm-odoo19 -p 8069:8069 -e HOST=nextcrm-odoo19-db -e USER=odoo -e PASSWORD=odoo odoo:19 -- --database=copy --init=sale_management,stock,account --without-demo=True
```

Wait until `curl -s localhost:8069/web/login` answers 200. Create an API key for the admin user:

```bash
docker exec -i nextcrm-odoo19 odoo shell -d copy --db_host nextcrm-odoo19-db --db_user odoo --db_password odoo --no-http <<'PY' > <scratchpad>/odoo-copy-key.txt
key = env['res.users.apikeys'].with_user(env.ref('base.user_admin'))._generate(None, 'nextcrm', None)
env.cr.commit()
print(key)
PY
```

(The key stays in the scratchpad file; never printed into the conversation.)

- [ ] **Step 2: Copy GIPS into it (read-only on GIPS)**

`<scratchpad>/odoo-copy.py` (outside the repo):

```python
#!/usr/bin/env python3
"""Read-only copy GIPS → local Odoo: currencies, taxes, categories, products, price lists + rules, customers + delivery children, salespeople."""
import json, os, sys, urllib.request

SRC = dict(url=os.environ["SRC_URL"], db=os.environ["SRC_DB"], key=os.environ["SRC_KEY"])
DST = dict(url="http://localhost:8069", db="copy", key=open(sys.argv[1]).read().strip().splitlines()[-1])

def call(t, model, method, **body):
    req = urllib.request.Request(f"{t['url']}/json/2/{model}/{method}", data=json.dumps(body).encode(), method="POST",
        headers={"Content-Type": "application/json", "Authorization": f"bearer {t['key']}", "X-Odoo-Database": t["db"]})
    with urllib.request.urlopen(req, timeout=60) as r: return json.loads(r.read() or "null")

def src(model, domain, fields, **kw): return call(SRC, model, "search_read", domain=domain, fields=fields, **kw)
def make(model, vals): return call(DST, model, "create", vals_list=[vals])[0]
m2o = lambda v: v[0] if v else False

# currencies + today's rates
cur = {}
for c in src("res.currency", [["name", "in", ["CZK", "EUR", "USD"]]], ["name", "rate"], context={"active_test": False}):
    [d] = call(DST, "res.currency", "search_read", domain=[["name", "=", c["name"]]], fields=["id"], context={"active_test": False})
    call(DST, "res.currency", "write", ids=[d["id"]], vals={"active": True}); cur[c["id"]] = d["id"]
[company] = call(DST, "res.company", "search_read", domain=[], fields=["id"], limit=1)
[czk] = call(DST, "res.currency", "search_read", domain=[["name", "=", "CZK"]], fields=["id"])
call(DST, "res.company", "write", ids=[company["id"]], vals={"currency_id": czk["id"]})   # fresh database: no journal items yet
for r in src("res.currency.rate", [["currency_id.name", "in", ["EUR", "USD"]]], ["currency_id", "rate", "name"], order="name desc", limit=2):
    make("res.currency.rate", {"currency_id": cur[r["currency_id"][0]], "rate": r["rate"], "name": r["name"]})

# sale taxes by amount
tax = {}
for t in src("account.tax", [["type_tax_use", "=", "sale"]], ["name", "amount", "amount_type"]):
    tax[t["id"]] = make("account.tax", {"name": f"{t['name']} (copy)", "amount": t["amount"], "amount_type": t["amount_type"], "type_tax_use": "sale"})

# categories (parents first)
cat = {}
for c in sorted(src("product.category", [], ["name", "parent_id", "parent_path"]), key=lambda c: c["parent_path"].count("/")):
    cat[c["id"]] = make("product.category", {"name": c["name"], "parent_id": cat.get(m2o(c["parent_id"]), False)})

# sellable variants (one template each; GIPS has 332 variants on 311 templates: extra variants become own templates)
prod, tmpl = {}, {}
for p in src("product.product", [["sale_ok", "=", True]], ["display_name", "default_code", "lst_price", "standard_price", "taxes_id", "categ_id", "product_tmpl_id", "type"]):
    t = make("product.template", {"name": p["display_name"], "default_code": p["default_code"] or False, "list_price": p["lst_price"],
        "standard_price": p["standard_price"], "categ_id": cat.get(m2o(p["categ_id"]), False), "type": p["type"],
        "taxes_id": [[6, 0, [tax[i] for i in p["taxes_id"] if i in tax]]], "sale_ok": True})
    [v] = call(DST, "product.product", "search_read", domain=[["product_tmpl_id", "=", t]], fields=["id"])
    prod[p["id"]] = v["id"]; tmpl.setdefault(m2o(p["product_tmpl_id"]), t)

# price lists (archived bases too) + rules
pl = {}
lists = src("product.pricelist", [], ["name", "currency_id", "active"], context={"active_test": False})
for l in lists: pl[l["id"]] = make("product.pricelist", {"name": l["name"], "currency_id": cur.get(m2o(l["currency_id"]), False)})
for it in src("product.pricelist.item", [["pricelist_id", "in", list(pl)]], ["pricelist_id", "applied_on", "product_tmpl_id", "product_id", "categ_id", "min_quantity", "date_start", "date_end", "compute_price", "fixed_price", "percent_price", "base", "base_pricelist_id", "price_discount", "price_surcharge", "price_round", "price_min_margin", "price_max_margin"], context={"active_test": False}):
    vals = {k: it[k] for k in ["applied_on", "min_quantity", "date_start", "date_end", "compute_price", "fixed_price", "percent_price", "base", "price_discount", "price_surcharge", "price_round", "price_min_margin", "price_max_margin"]}
    vals.update(pricelist_id=pl[m2o(it["pricelist_id"])], product_tmpl_id=tmpl.get(m2o(it["product_tmpl_id"]), False), product_id=prod.get(m2o(it["product_id"]), False),
        categ_id=cat.get(m2o(it["categ_id"]), False), base_pricelist_id=pl.get(m2o(it["base_pricelist_id"]), False))
    make("product.pricelist.item", vals)
for l in lists:
    if not l["active"]: call(DST, "product.pricelist", "write", ids=[pl[l["id"]]], vals={"active": False})

# salespeople as internal users (login = their email)
usr = {}
for u in src("res.users", [["share", "=", False]], ["name", "login", "email"]):
    if u["login"] in ("admin", "__system__"): continue
    usr[u["id"]] = make("res.users", {"name": u["name"], "login": u["email"] or u["login"], "email": u["email"] or u["login"]})

# customers + delivery children
countries = {c["id"]: c["code"] for c in src("res.country", [], ["code"])}
dst_country = {c["code"]: c["id"] for c in call(DST, "res.country", "search_read", domain=[], fields=["code"])}
part = {}
fields = ["name", "is_company", "company_registry", "vat", "street", "street2", "city", "zip", "country_id", "email", "phone", "user_id", "property_product_pricelist"]
for p in src("res.partner", [["customer_rank", ">", 0], ["parent_id", "=", False]], fields):
    part[p["id"]] = make("res.partner", {"name": p["name"], "is_company": p["is_company"], "company_registry": p["company_registry"] or False,
        "vat": False, "street": p["street"] or False, "city": p["city"] or False, "zip": p["zip"] or False,
        "country_id": dst_country.get(countries.get(m2o(p["country_id"])), False), "email": p["email"] or False, "phone": p["phone"] or False,
        "user_id": usr.get(m2o(p["user_id"]), False), "customer_rank": 1, "property_product_pricelist": pl.get(m2o(p["property_product_pricelist"]), False)})
for d in src("res.partner", [["parent_id", "in", list(part)], ["type", "in", ["delivery", "contact"]]], ["name", "type", "parent_id", "street", "city", "zip", "country_id", "email"]):
    make("res.partner", {"name": d["name"] or False, "type": d["type"], "parent_id": part[m2o(d["parent_id"])], "street": d["street"] or False,
        "city": d["city"] or False, "zip": d["zip"] or False, "country_id": dst_country.get(countries.get(m2o(d["country_id"])), False), "email": d["email"] or False})
print(json.dumps({"categories": len(cat), "products": len(prod), "lists": len(pl), "customers": len(part), "users": len(usr)}))
```

VAT is left empty on purpose (Community's VAT check would refuse foreign VAT numbers); the CRM matches by registration number. Fix any field Community refuses by reading its error, then re-run on a fresh database (`docker rm -f` both containers, start again).

Run (GIPS values from the local NextCRM plugin row, never printed):

```bash
SRC_URL=https://odoo.oxofactory.eu SRC_DB=data-dance-gips-centrum1-main-24735092 SRC_KEY="$(grep '^ODOO_GIPS_API_KEY=' ~/claudeos/.env | cut -d= -f2-)" \
  python3 -I <scratchpad>/odoo-copy.py <scratchpad>/odoo-copy-key.txt
```

Expected: JSON counts close to 34 categories, 332 products, 43 price lists, ~86 customers.

- [ ] **Step 3: Point a local CRM at the copy**

The connector's `url` must be https and the plugin HTTP client blocks private hosts by default, so the copy gets a local TLS front and the dev server one flag:

```bash
docker run -d --name nextcrm-odoo19-tls --network nextcrm-odoo19 -p 8443:8443 caddy:2 caddy reverse-proxy --from https://localhost:8443 --to nextcrm-odoo19:8069 --internal-certs
sleep 3 && docker cp nextcrm-odoo19-tls:/data/caddy/pki/authorities/local/root.crt <scratchpad>/odoo-copy-ca.crt
curl -s --cacert <scratchpad>/odoo-copy-ca.crt -o /dev/null -w '%{http_code}\n' https://localhost:8443/web/login   # 200
```

Start local dev (:3001, memory `feedback-nextcrm-manual-check-self-drive`) with `NODE_EXTRA_CA_CERTS=<scratchpad>/odoo-copy-ca.crt PLUGIN_HTTP_ALLOW_PRIVATE_HOSTS=true` added to the environment; run the live driver (`.superpowers/live/drive.ts`) with the same two variables. Never set the flag outside this check.

Point the local plugin row at the copy, keeping a backup of the GIPS row first:

```sql
CREATE TABLE IF NOT EXISTS _odoo_live_backup AS SELECT * FROM "InstalledPlugin" WHERE id = 'odoo-connector';
CREATE TABLE IF NOT EXISTS _odoo_live_backup_data AS SELECT * FROM "PluginData" WHERE "pluginId" = 'odoo-connector';
DELETE FROM "PluginData" WHERE "pluginId" = 'odoo-connector';
UPDATE "InstalledPlugin" SET settings = settings || '{"url": "https://localhost:8443", "database": "copy", "dryRun": false, "sendOrders": false, "priceLists": ""}'::jsonb WHERE id = 'odoo-connector';
```

Write the copy's API key into the row's encrypted secrets with the `<scratchpad>/set-odoo-key.ts` pattern, reading the key from `odoo-copy-key.txt` (never printed). Then **Test connection**, **Load price lists**, set `priceLists` to the copy's ids of the Retail/Wholesale lists, **Sync now** through the driver: accounts, catalog and price lists now come from the copy. Turn `sendOrders` on.

- [ ] **Step 4: Orders**

In the CRM as the test admin, with `sendOrders` on and `dryRun` off:
1. order for an imported (linked) customer → SENT within seconds; Odoo copy has one draft with `origin` = the CRM number;
2. a new CRM account with a registration number of an Odoo-copy customer not imported (delete its link row first) → found, linked, no new partner;
3. a new CRM account with a fresh registration number → customer created in the copy, listed under "Created in Odoo";
4. an order with a new delivery address → delivery child created;
5. a rep (`rep.test@nextcrm.test`) order below list, approved by the manager → sent with the CRM price; panel shows "Price differs from Odoo".

- [ ] **Step 5: Outage**

`docker stop nextcrm-odoo19`, submit an order → panel "Waiting for Odoo since…", status READY; `docker start nextcrm-odoo19`, run the cron via the driver → SENT; the copy has exactly one sale order with that origin (`search_count`).

- [ ] **Step 6: Statuses**

In the copy's UI (admin) or via `odoo shell`: confirm order 1 → after a sync CRM CONFIRMED; validate its delivery → DELIVERED; create and post the invoice → INVOICED; register payment → PAID; cancel another → CANCELLED.

- [ ] **Step 7: Clean up**

`docker rm -f nextcrm-odoo19-tls nextcrm-odoo19 nextcrm-odoo19-db && docker network rm nextcrm-odoo19`; delete `<scratchpad>/odoo-copy-key.txt` and `odoo-copy-ca.crt`. Restore the local plugin row and its data from `_odoo_live_backup` / `_odoo_live_backup_data` (`DELETE` the copy's `PluginData` rows, `INSERT … SELECT` back, `UPDATE "InstalledPlugin"` settings and secrets from the backup), then `DROP TABLE _odoo_live_backup, _odoo_live_backup_data`. CRM orders, accounts and products created against the copy stay in the local DB only. Restart dev without the two variables. Ledger the results.
