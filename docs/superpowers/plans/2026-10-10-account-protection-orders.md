# Account protection: orders (rule 3) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A confirmed order keeps an owned account protected at least `orderMonths` from its order date and counts as the documented contact; core orders gain an `orderDate`.

**Architecture:**
- Core: `crm_Orders.orderDate` (UTC day, plugin-settable on EXTERNAL orders), SDK 0.2.1 (additive types), and a slightly smarter SDK test table (`in` filters, `orderBy`).
- Plugin: a pure `withOrders(reg, lastOrderDay, orderMonths)` in `state.ts`; one `recomputeFromOrders` in a new `orders.ts`, called from order after-hooks, from every new registration, from the daily `expire` job before freeing, and once on upgrade.

**Tech Stack:** Next.js 16, Prisma 7 + PostgreSQL, `@nextcrm/plugin-sdk` (in-repo), zod 4, jest.

**Spec:** `docs/superpowers/specs/2026-10-10-account-protection-orders-design.md`

## Global Constraints

- Qualifying statuses: `CONFIRMED`, `DELIVERED`, `INVOICED`, `PAID` (spec § 1.1). Source CRM or EXTERNAL.
- `protectedUntil = max(baseUntil, lastOrderAt + orderMonths)`; never below `baseUntil`. `orderMonths = 0` turns rule 3 off; orders still count as contact.
- Contact from an order: newest qualifying order's `orderDate` ≥ registration day, only when no `contactAt` exists. An order never clears `contactAt`.
- Users cannot set `orderDate` (no backdating); only plugins on EXTERNAL orders.
- SDK 0.2.0 → 0.2.1 (additive). Plugin `account-protection` 0.1.1 → 0.2.0, permission `orders:read` added.
- Plugin text in `plugins/account-protection/messages/{en,cz,de,uk}.json`; core text in `locales/{en,cz,de,uk}.json`, edited textually.
- **Prisma 7:** set `DATABASE_URL` (dummy offline) for every prisma command; never `prisma format`; generate migrations with `--output`, never by redirecting pnpm/npx output.
- **Fresh worktree setup:** `pnpm install --frozen-lockfile --prefer-offline`, then `DATABASE_URL=postgresql://x:x@localhost:5432/x pnpm exec prisma generate`.
- **Known baseline failures** (ignore): `__tests__/enrichment/enrich-contact-job.test.ts`, `__tests__/enrichment/enrich-target-job.test.ts`, `inngest/functions/calendar/__tests__/google-sync-classify.test.ts`, `__tests__/invoices/lifecycle.test.ts` (6 tests).
- **CI runs `pnpm lint`;** changed files lint clean. **tsc** clean after every task.
- **Commits** end with `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`. Never `git add -A`. Run `git checkout -- AGENTS.md` before committing after `next dev`.

## Rulings (decided while planning)

1. **One `register(ctx, id, reg)` helper** replaces the six `startRegistration(ctx.store, id, newRegistration(…))` calls in `hooks.ts` and `jobs.ts`. It starts the registration and recomputes from orders, so spec § 3.5 "new registration → recompute" holds everywhere without touching each flow's logic.
2. **Plugins may set `orderDate` only on EXTERNAL orders.** Spec § 2.1 says "plugin orders"; a connector has no business re-dating a rep's CRM order, and backdating is exactly what the core rule forbids.
3. **The Protection tab shows the last order whenever one exists** ("Last confirmed order on <date>"), and the protected-until date on the status line already includes the extension. Spec § 3.7's "only when it sets the date" would hide a real order when the registration window is still longer, which reads as "no order".
4. **The plugin settings form has no per-field help text** for any plugin (it renders field names). The `orderMonths` help text from spec § 3.7 goes into the admin docs page (`apps/docs/content/docs/admins/plugins/account-protection.mdx`) instead.
5. **A `contactAt` set from an order stays when that order is cancelled later.** Spec § 3.2 only says an order never clears an activity's `contactAt`; re-deriving contact on cancellation would need the contact's source stored and could free an account the rep did visit. Cost if wrong: a cancelled order can satisfy the 30-day contact once.
6. **"One warning per run" when orders cannot be read** is one warning per plugin context (a `WeakSet` of contexts): every hook call, job run and upgrade gets its own context.

## Review Focus

1. **An order confirmed long before the registration** (e.g. imported history) must not count as contact for a new owner, and must not shorten anything: it can only extend `protectedUntil` above `baseUntil`. Test in Task 3.
2. **Month arithmetic at month ends and leap years** (31 Jan + 1 month, 29 Feb + 12 months). Test in Task 3.
3. **The daily job meets an account whose due entry an order just moved:** it must not free it, and must not leave a stale `due:` entry behind. Test in Task 5.
4. **Orders not readable** (permission not granted after upgrade): hooks and the job keep today's behaviour and log one warning per run, never crash the job. Test in Task 4.
5. **A plugin sends a malformed `orderDate`** ("2026-13-40", "yesterday"): refused, nothing written. Test in Task 2.

---

## File Structure

```
prisma/schema.prisma                                        crm_Orders.orderDate + index
prisma/migrations/20261013000000_order_date/migration.sql   column, backfill from createdAt, index
lib/orders/serialize.ts                                     orderDate in serialized orders (UI, MCP)
app/[locale]/(routes)/crm/orders/components/OrdersTable.tsx date column = orderDate
app/[locale]/(routes)/crm/orders/[orderId]/page.tsx         order date in the header
lib/orders/plugin-writes.ts                                 orderDate on EXTERNAL create/update
packages/plugin-sdk/src/{types,version,testing}.ts          0.2.1 types; test table `in` + orderBy
plugins/account-protection/settings.ts                      orderMonths
plugins/account-protection/state.ts                         baseUntil, lastOrderAt, addMonthsUtc, withOrders
plugins/account-protection/orders.ts                        latestOrderDay, recomputeFromOrders, register, onOrderChanged
plugins/account-protection/hooks.ts, jobs.ts                register(); expire recompute; upgrade pass
plugins/account-protection/plugin.ts                        version, permission, order afters
plugins/account-protection/ui/common.ts, ProtectionTab.tsx  last-order line
plugins/account-protection/messages/{en,cz,de,uk}.json
apps/docs/content/docs/admins/plugins/account-protection.mdx, users/crm/account-protection.mdx
```

---

### Task 1: Core `orderDate`

**Files:**
- Modify: `prisma/schema.prisma` (`crm_Orders`)
- Create: `prisma/migrations/20261013000000_order_date/migration.sql`
- Modify: `lib/orders/serialize.ts`, `app/[locale]/(routes)/crm/orders/components/OrdersTable.tsx`, `app/[locale]/(routes)/crm/orders/[orderId]/page.tsx`
- Test: `__tests__/orders/order-date.test.ts`

**Interfaces:**
- Produces: column `crm_Orders.orderDate` (`DateTime @db.Date`, default today); `serializeOrder(...).orderDate: string | null` (ISO day).

- [ ] **Step 1: Write the failing test**

`__tests__/orders/order-date.test.ts`:
```ts
jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
import { readFileSync } from "node:fs";
import { Prisma } from "@prisma/client";
import { serializeOrder } from "@/lib/orders/serialize";

it("has an orderDate column", () => {
  expect(Prisma.Crm_OrdersScalarFieldEnum.orderDate).toBe("orderDate");
});

it("ships a plain-SQL migration that backfills from createdAt", () => {
  const sql = readFileSync("prisma/migrations/20261013000000_order_date/migration.sql", "utf8");
  expect(sql.startsWith("-- ")).toBe(true);
  expect(sql).not.toMatch(/Already up to date|Done in|npm notice/);
  expect(sql).toContain(`UPDATE "crm_Orders" SET "orderDate" = "createdAt"::date`);
  expect(sql).toContain(`"crm_Orders_accountId_orderDate_idx"`);
});

it("serializes the order date as an ISO day", () => {
  const s = serializeOrder({ id: "o1", number: "N", status: "DRAFT", source: "CRM", accountId: "a", currency: "CZK", orderDate: new Date("2026-10-13T00:00:00Z"), createdAt: new Date(), updatedAt: new Date(), lines: [] });
  expect(s.orderDate).toBe("2026-10-13");
});
```
Add to `__tests__/orders/service.test.ts`:
```ts
it("never lets a user set the order date (no backdating)", async () => {
  await createOrder(rep, { accountId: "acc", lines: [], orderDate: "2020-01-01" } as never);
  expect(db.crm_Orders.create.mock.calls[0][0].data).not.toHaveProperty("orderDate");
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec jest __tests__/orders/order-date.test.ts`
Expected: FAIL (orderDate undefined, migration file missing). The service test already passes (HEADER_KEYS whitelists fields); it pins the rule.

- [ ] **Step 3: Schema and migration**

`cp prisma/schema.prisma /tmp/order-date-old.prisma`

In `model crm_Orders`, after the `currency` field:
```prisma
  orderDate             DateTime         @default(now()) @db.Date
```
and after `@@index([createdAt])`:
```prisma
  @@index([accountId, orderDate])
```

```bash
mkdir -p prisma/migrations/20261013000000_order_date
DATABASE_URL=postgresql://x:x@localhost:5432/x pnpm exec prisma migrate diff \
  --from-schema /tmp/order-date-old.prisma --to-schema prisma/schema.prisma \
  --script --output prisma/migrations/20261013000000_order_date/migration.sql
cat >> prisma/migrations/20261013000000_order_date/migration.sql <<'SQL'

-- Backfill: existing orders take the UTC day they were created
UPDATE "crm_Orders" SET "orderDate" = "createdAt"::date;
SQL
grep -E "^(ALTER|CREATE|UPDATE)" prisma/migrations/20261013000000_order_date/migration.sql
DATABASE_URL=postgresql://x:x@localhost:5432/x pnpm exec prisma generate
```
Expected grep: one `ALTER TABLE "crm_Orders" ADD COLUMN "orderDate" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP`, one `CREATE INDEX "crm_Orders_accountId_orderDate_idx"`, the `UPDATE`. Anything else → stop and report.

- [ ] **Step 4: Serialize and screens**

`lib/orders/serialize.ts`, in the returned object after `currency: order.currency as string,`:
```ts
    orderDate: order.orderDate instanceof Date ? order.orderDate.toISOString().slice(0, 10) : ((order.orderDate ?? null) as string | null),
```
`OrdersTable.tsx`: add `orderDate: string | null` to `Row`, and change the date cell to
```tsx
            <TableCell>{r.orderDate ?? r.createdAt.slice(0, 10)}</TableCell>
```
`[orderId]/page.tsx`: in the header line, after the owner span, add
```tsx
          {order.orderDate && <span>{t("date")}: {order.orderDate}</span>}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm exec jest __tests__/orders` then `pnpm exec tsc --noEmit`
Expected: PASS; tsc clean.

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20261013000000_order_date lib/orders/serialize.ts "app/[locale]/(routes)/crm/orders/components/OrdersTable.tsx" "app/[locale]/(routes)/crm/orders/[orderId]/page.tsx" __tests__/orders/order-date.test.ts __tests__/orders/service.test.ts
git commit -m "feat(orders): order date

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: SDK 0.2.1 and plugin order dates

**Files:**
- Modify: `packages/plugin-sdk/src/types.ts`, `packages/plugin-sdk/src/version.ts`, `packages/plugin-sdk/src/testing.ts`
- Modify: `lib/orders/plugin-writes.ts`
- Modify (version strings): `packages/plugin-sdk/__tests__/version.test.ts`, `lib/plugins/__tests__/data-api-activities.test.ts`, `lib/plugins/__tests__/data-api-orders.test.ts`, `lib/plugins/__tests__/lifecycle.test.ts`
- Test: `lib/plugins/__tests__/data-api-orders.test.ts`, `packages/plugin-sdk/__tests__/testing.test.ts`

**Interfaces:**
- Produces: `ExternalOrderInput.orderDate?: string`, `OrderUpdateInput.orderDate?: string` (ISO `YYYY-MM-DD`); `SDK_VERSION = "0.2.1"`; test tables support `where: { field: { in: [...] } }` and `orderBy: { field: "asc" | "desc" }`.

- [ ] **Step 1: Write the failing tests**

Append to `lib/plugins/__tests__/data-api-orders.test.ts`:
```ts
it("is SDK 0.2.1 (additive order dates)", () => expect(SDK_VERSION).toBe("0.2.1"));

it("takes the external order date on create and update, EXTERNAL only", async () => {
  const api = createDataApi("conn", ["orders:write"]);
  await api.orders.create({ accountId: "acc", externalRef: "SO7", status: "CONFIRMED", orderDate: "2025-03-31", lines: [] });
  expect(db.crm_Orders.create.mock.calls[0][0].data.orderDate).toEqual(new Date("2025-03-31T00:00:00Z"));
  db.crm_Orders.findUnique.mockResolvedValue({ id: "o1", status: "CONFIRMED", source: "EXTERNAL", createdBy: null, externalRef: "SO7" });
  await api.orders.update("o1", { orderDate: "2025-04-01" });
  expect(db.crm_Orders.update.mock.calls.at(-1)[0].data).toMatchObject({ orderDate: new Date("2025-04-01T00:00:00Z") });
  db.crm_Orders.findUnique.mockResolvedValue({ id: "o2", status: "CONFIRMED", source: "CRM", createdBy: "rep", externalRef: "SO8" });
  await expect(api.orders.update("o2", { orderDate: "2025-04-01" })).rejects.toThrow("only EXTERNAL orders");
});

it("refuses malformed order dates (Review Focus 5)", async () => {
  const api = createDataApi("conn", ["orders:write"]);
  for (const orderDate of ["2026-13-40", "yesterday", "2026-02-30"]) {
    await expect(api.orders.create({ accountId: "acc", externalRef: "SO9", status: "CONFIRMED", orderDate, lines: [] })).rejects.toThrow("Invalid orderDate");
  }
  expect(db.crm_Orders.create).not.toHaveBeenCalled();
});
```
Also change the existing test title/assertion `it("is SDK 0.2.0 with the order entity", …)` → keep its `MODEL_TO_ENTITY` assertion and remove its `SDK_VERSION` line (covered above).

`packages/plugin-sdk/__tests__/testing.test.ts`:
```ts
import { createTestContext } from "../src/testing";

it("filters with `in` and sorts with orderBy like Prisma", async () => {
  const ctx = createTestContext({ pluginId: "p", data: { orders: [
    { id: "a", accountId: "x", status: "PAID", orderDate: "2026-01-05" },
    { id: "b", accountId: "x", status: "CANCELLED", orderDate: "2026-06-01" },
    { id: "c", accountId: "x", status: "CONFIRMED", orderDate: "2026-03-10" },
  ] } });
  const rows = await ctx.data.orders.find({ where: { accountId: "x", status: { in: ["PAID", "CONFIRMED"] } }, orderBy: { orderDate: "desc" }, take: 1 });
  expect(rows.map((r) => r.id)).toEqual(["c"]);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec jest lib/plugins/__tests__/data-api-orders.test.ts packages/plugin-sdk/__tests__/testing.test.ts`
Expected: FAIL (SDK 0.2.0; orderDate ignored; `in` unsupported).

- [ ] **Step 3: SDK**

`packages/plugin-sdk/src/version.ts`: `export const SDK_VERSION = "0.2.1";`

`packages/plugin-sdk/src/types.ts`: in `ExternalOrderInput` after `currency?: string;` add `/** ISO day (YYYY-MM-DD) of the order in the external system; defaults to today. */\n  orderDate?: string;`; in `OrderUpdateInput` after `externalRef?: string;` add `/** EXTERNAL orders only. */\n  orderDate?: string;`.

`packages/plugin-sdk/src/testing.ts`, replace `matches` and the table's `find`:
```ts
function matches(row: RecordData, where?: RecordData) {
  return !where || Object.entries(where).every(([k, v]) =>
    v && typeof v === "object" && Array.isArray((v as { in?: unknown[] }).in) ? (v as { in: unknown[] }).in.includes(row[k]) : row[k] === v);
}
```
```ts
    async find(args: FindArgs = {}) {
      const out = rows.filter((r) => matches(r, args.where));
      const [[field, dir] = []] = Object.entries((Array.isArray(args.orderBy) ? args.orderBy[0] : args.orderBy) ?? {});
      if (field) out.sort((a, b) => (String(a[field]) < String(b[field]) ? -1 : String(a[field]) > String(b[field]) ? 1 : 0) * (dir === "desc" ? -1 : 1));
      return out.slice(args.skip ?? 0, (args.skip ?? 0) + (args.take ?? out.length));
    },
```

Version strings:
```bash
sed -i '' 's/expect(SDK_VERSION).toBe("0\.2\.0")/expect(SDK_VERSION).toBe("0.2.1")/' packages/plugin-sdk/__tests__/version.test.ts
sed -i '' 's/it("bumps the SDK to 0\.2\.0", () => expect(SDK_VERSION).toBe("0\.2\.0"))/it("bumps the SDK to 0.2.1", () => expect(SDK_VERSION).toBe("0.2.1"))/' lib/plugins/__tests__/data-api-activities.test.ts
sed -i '' 's/running 0\.2\.0/running 0.2.1/' lib/plugins/__tests__/lifecycle.test.ts
```

- [ ] **Step 4: Plugin writes**

`lib/orders/plugin-writes.ts`, after the `CREATE_STATUSES` constant:
```ts
/** ISO day → UTC midnight; refuses anything that is not a real calendar day. */
function orderDay(value: string): Date {
  const d = new Date(`${value}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== value) throw new Error(`Invalid orderDate: ${value}`);
  return d;
}
```
In `pluginCreateOrder`, after the status check: `const orderDate = input.orderDate !== undefined ? orderDay(input.orderDate) : undefined;` and in the create `data` add `...(orderDate ? { orderDate } : {}),`.

In `pluginUpdateOrder`, extend the EXTERNAL check and the `extra` fields:
```ts
  if ((input.lines || input.orderDate !== undefined) && order.source !== "EXTERNAL") throw new Error("Plugins may replace lines or set the order date on only EXTERNAL orders");
```
(replacing the existing lines-only check) and after `if (input.note !== undefined) extra.note = input.note;`:
```ts
  if (input.orderDate !== undefined) extra.orderDate = orderDay(input.orderDate);
```
Update the earlier test expectation `rejects.toThrow("only EXTERNAL orders")` — the new message still contains it.

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm exec jest lib/plugins packages/plugin-sdk plugins __tests__/plugins` then `pnpm exec tsc --noEmit`
Expected: PASS; tsc clean.

- [ ] **Step 6: Commit**

```bash
git add packages/plugin-sdk lib/orders/plugin-writes.ts lib/plugins/__tests__
git commit -m "feat(plugins): SDK 0.2.1 order dates for external orders

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Registration maths (pure)

**Files:**
- Modify: `plugins/account-protection/state.ts`, `plugins/account-protection/settings.ts`
- Test: `plugins/account-protection/__tests__/state.test.ts`

**Interfaces:**
- Produces: `Registration.baseUntil?: string`, `Registration.lastOrderAt?: string`; `newRegistration` sets `baseUntil`; `addMonthsUtc(day: string, months: number): Date`; `withOrders(reg: Registration, lastOrderDay: string | null, orderMonths: number): Registration`; setting `orderMonths` (int ≥ 0, default 12).

- [ ] **Step 1: Write the failing test**

Append to `plugins/account-protection/__tests__/state.test.ts` (import `addMonthsUtc`, `withOrders`, `newRegistration` from `../state` and `settingsSchema` from `../settings` if not already imported):
```ts
describe("orders (rule 3)", () => {
  const S12 = settingsSchema.parse({});
  const reg = newRegistration("CZ:1", "rep1", new Date("2026-10-01T14:00:00Z"), S12);

  it("defaults orderMonths to 12 and accepts 0", () => {
    expect(S12.orderMonths).toBe(12);
    expect(settingsSchema.parse({ orderMonths: 0 }).orderMonths).toBe(0);
    expect(() => settingsSchema.parse({ orderMonths: -1 })).toThrow();
  });

  it("stores the registration's own window as baseUntil", () => {
    expect(reg.baseUntil).toBe(reg.protectedUntil);
  });

  it("adds calendar months in UTC, clamping month ends (Review Focus 2)", () => {
    expect(addMonthsUtc("2026-01-31", 1).toISOString()).toBe("2026-02-28T00:00:00.000Z");
    expect(addMonthsUtc("2028-02-29", 12).toISOString()).toBe("2029-02-28T00:00:00.000Z");
    expect(addMonthsUtc("2026-10-13", 12).toISOString()).toBe("2027-10-13T00:00:00.000Z");
  });

  it("extends to the last order + months, never below the own window", () => {
    const a = withOrders(reg, "2026-10-10", 12);
    expect([a.protectedUntil, a.lastOrderAt, a.baseUntil]).toEqual(["2027-10-10T00:00:00.000Z", "2026-10-10", reg.protectedUntil]);
    expect(withOrders(reg, "2025-01-01", 12).protectedUntil).toBe(reg.protectedUntil);
    expect(withOrders(reg, "2026-10-10", 0).protectedUntil).toBe(reg.protectedUntil);
    const back = withOrders(a, null, 12);
    expect([back.protectedUntil, back.lastOrderAt]).toEqual([reg.protectedUntil, undefined]);
  });

  it("counts an order as contact only from the registration day (Review Focus 1)", () => {
    expect(withOrders(reg, "2026-09-30", 12).contactAt).toBeUndefined();
    expect(withOrders(reg, "2026-10-01", 12).contactAt).toBe("2026-10-01T00:00:00.000Z");
    expect(withOrders({ ...reg, contactAt: "2026-10-05T09:00:00.000Z" }, "2026-10-20", 12).contactAt).toBe("2026-10-05T09:00:00.000Z");
  });

  it("reads 0.1.x registrations without baseUntil and is idempotent", () => {
    const { baseUntil, ...old } = reg;
    const once = withOrders(old as typeof reg, "2026-10-10", 12);
    expect(once.baseUntil).toBe(baseUntil);
    expect(JSON.stringify(withOrders(once, "2026-10-10", 12))).toBe(JSON.stringify(once));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec jest plugins/account-protection/__tests__/state.test.ts`
Expected: FAIL (`addMonthsUtc`/`withOrders` not exported, `orderMonths` undefined).

- [ ] **Step 3: Implement**

`settings.ts`, in `settingsSchema` after `requireNumber`:
```ts
  orderMonths: z.number().int().min(0).default(12),
```
`state.ts`:
- `Registration` gains `baseUntil?: string;` and `lastOrderAt?: string;` (after `contactAt?`).
- In `newRegistration`, after computing `protectedUntil`, return it also as `baseUntil`:
```ts
export function newRegistration(key: string, ownerId: string, at: Date, s: Pick<Settings, "protectionDays" | "contactDays">): Registration {
  const contactDays = Math.min(s.contactDays, s.protectionDays);   // Ruling 5
  const protectedUntil = new Date(at.getTime() + s.protectionDays * DAY).toISOString();
  return {
    key,
    ownerId,
    registeredAt: at.toISOString(),
    contactDeadline: new Date(at.getTime() + contactDays * DAY).toISOString(),
    protectedUntil,
    baseUntil: protectedUntil,
  };
}
```
- Add:
```ts
/** UTC midnight of `day` plus whole calendar months; the 31st becomes the month's last day. */
export function addMonthsUtc(day: string, months: number): Date {
  const [y, m, d] = day.slice(0, 10).split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1 + months, 1));
  const lastDay = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  return new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), Math.min(d, lastDay)));
}

/**
 * Rule 3 (spec § 3.2): protection runs at least `orderMonths` from the newest qualifying order and never below
 * the registration's own window; an order dated on or after the registration day counts as contact (rule 2).
 */
export function withOrders(reg: Registration, lastOrderDay: string | null, orderMonths: number): Registration {
  const baseUntil = reg.baseUntil ?? reg.protectedUntil;
  const fromOrder = lastOrderDay && orderMonths > 0 ? addMonthsUtc(lastOrderDay, orderMonths).toISOString() : null;
  const next: Registration = { ...reg, baseUntil, protectedUntil: fromOrder && fromOrder > baseUntil ? fromOrder : baseUntil };
  if (lastOrderDay) next.lastOrderAt = lastOrderDay;
  else delete next.lastOrderAt;
  if (!next.contactAt && lastOrderDay && lastOrderDay >= isoDay(reg.registeredAt)) next.contactAt = `${lastOrderDay}T00:00:00.000Z`;
  return next;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec jest plugins/account-protection`
Expected: PASS except `plugin.test.ts` settings-keys assertion, which now lists `orderMonths`: update that expectation to append `"orderMonths"`, re-run → PASS.

- [ ] **Step 5: Commit**

```bash
git add plugins/account-protection/state.ts plugins/account-protection/settings.ts plugins/account-protection/__tests__/state.test.ts plugins/account-protection/__tests__/plugin.test.ts
git commit -m "feat(account-protection): order-based protection maths

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Recompute from orders, hooks and plugin wiring

**Files:**
- Create: `plugins/account-protection/orders.ts`
- Modify: `plugins/account-protection/hooks.ts`, `plugins/account-protection/plugin.ts`
- Test: `plugins/account-protection/__tests__/orders.test.ts`, `plugins/account-protection/__tests__/plugin.test.ts`

**Interfaces:**
- Consumes: `withOrders`, `dueDay`, `isoDay` (Task 3); `ctx.data.orders.find/get` (SDK 0.2.1 test table).
- Produces: `QUALIFYING`; `latestOrderDay(ctx, accountId): Promise<string | null | undefined>` (undefined = orders unreadable); `recomputeFromOrders(accountId, ctx): Promise<Registration | null>`; `register(ctx, accountId, reg): Promise<void>`; `onOrderChanged(input, ctx): Promise<void>`.

- [ ] **Step 1: Write the failing test**

`plugins/account-protection/__tests__/orders.test.ts`:
```ts
import type { RecordData } from "@nextcrm/plugin-sdk";
import { createTestContext } from "@nextcrm/plugin-sdk/testing";
import { onOrderChanged, recomputeFromOrders, register } from "../orders";
import { onUpdated } from "../hooks";
import { settingsSchema, type Ctx } from "../settings";
import { K, startRegistration } from "../store";
import { newRegistration, type Registration } from "../state";

const S = settingsSchema.parse({});
type TestCtx = Ctx & { logs: { level: string; message: string }[] };
const mk = (orders: RecordData[], accounts: RecordData[] = []) =>
  createTestContext({ pluginId: "account-protection", settings: S, data: { orders, accounts } }) as unknown as TestCtx;
const at = new Date("2026-10-01T14:00:00Z");
const reg0 = newRegistration("CZ:1", "rep1", at, S);
const order = (id: string, status: string, orderDate: string) => ({ id, accountId: "acc-1", status, orderDate });

it("extends protection from the newest qualifying order and moves the due entry", async () => {
  const ctx = mk([order("o1", "PAID", "2026-10-05"), order("o2", "CANCELLED", "2026-10-09"), order("o3", "DRAFT", "2026-10-10")]);
  await startRegistration(ctx.store, "acc-1", reg0);
  const reg = await recomputeFromOrders("acc-1", ctx);
  expect([reg?.lastOrderAt, reg?.protectedUntil, reg?.contactAt]).toEqual(["2026-10-05", "2027-10-05T00:00:00.000Z", "2026-10-05T00:00:00.000Z"]);
  expect((await ctx.store.list("due:")).map((e) => e.key)).toEqual(["due:2027-10-05:acc-1"]);
  expect(ctx.logs.some((l) => l.level === "info" && l.message.includes("recomputed"))).toBe(true);
});

it("falls back when the order is cancelled, and is idempotent", async () => {
  const orders = [order("o1", "CONFIRMED", "2026-10-05")];
  const ctx = mk(orders);
  await startRegistration(ctx.store, "acc-1", reg0);
  await recomputeFromOrders("acc-1", ctx);
  orders[0].status = "CANCELLED";
  const back = await recomputeFromOrders("acc-1", ctx);
  expect([back?.protectedUntil, back?.lastOrderAt]).toEqual([reg0.protectedUntil, undefined]);
  expect((await ctx.store.list("due:")).map((e) => e.key)).toEqual([`due:${reg0.protectedUntil.slice(0, 10)}:acc-1`]);
  const logs = ctx.logs.length;
  await recomputeFromOrders("acc-1", ctx);
  expect(ctx.logs.length).toBe(logs);
});

it("does nothing without a registration", async () => {
  const ctx = mk([order("o1", "PAID", "2026-10-05")]);
  expect(await recomputeFromOrders("acc-1", ctx)).toBeNull();
  expect(await ctx.store.list("reg:")).toEqual([]);
});

it("keeps today's behaviour and warns once when orders cannot be read (Review Focus 4)", async () => {
  const ctx = mk([]);
  (ctx.data.orders as { find: unknown }).find = async () => { throw new Error("Plugin account-protection lacks permission orders:read"); };
  await startRegistration(ctx.store, "acc-1", reg0);
  expect(await recomputeFromOrders("acc-1", ctx)).toEqual(reg0);
  await recomputeFromOrders("acc-1", ctx);
  expect(ctx.logs.filter((l) => l.level === "warn")).toHaveLength(1);
});

it("recomputes on order events with status or orderDate changes only", async () => {
  const orders = [order("o1", "CONFIRMED", "2026-10-05")];
  const ctx = mk(orders);
  await startRegistration(ctx.store, "acc-1", reg0);
  await onOrderChanged({ entity: "order", operation: "updated", recordId: "o1", changed: ["note"] }, ctx);
  expect((await ctx.store.get<Registration>(K.reg("acc-1")))?.lastOrderAt).toBeUndefined();
  await onOrderChanged({ entity: "order", operation: "updated", recordId: "o1", changed: ["status"] }, ctx);
  expect((await ctx.store.get<Registration>(K.reg("acc-1")))?.lastOrderAt).toBe("2026-10-05");
  await onOrderChanged({ entity: "order", operation: "created", recordId: "missing" }, ctx);
});

it("gives a new owner the order-based protection straight away", async () => {
  const accounts = [{ id: "acc-1", company_id: "27082440", billing_country: "CZ", assigned_to: "rep2" }];
  const ctx = mk([order("o1", "PAID", "2026-09-01")], accounts);
  await ctx.store.set(K.acct("acc-1"), { key: "CZ:27082440" });
  await onUpdated({ entity: "account", operation: "updated", recordId: "acc-1", changed: ["assigned_to"] }, ctx, at);
  const reg = await ctx.store.get<Registration>(K.reg("acc-1"));
  expect([reg?.ownerId, reg?.lastOrderAt, reg?.protectedUntil]).toEqual(["rep2", "2026-09-01", "2027-09-01T00:00:00.000Z"]);
  expect(reg?.contactAt).toBeUndefined();   // the order predates this registration
});

it("register() starts and recomputes", async () => {
  const ctx = mk([order("o1", "INVOICED", "2026-10-02")]);
  await register(ctx, "acc-1", reg0);
  expect((await ctx.store.get<Registration>(K.reg("acc-1")))?.lastOrderAt).toBe("2026-10-02");
});
```
In `plugin.test.ts`: permissions expectation gains `"orders:read"` (after `"activities:read"`), afters become `["account.created", "account.updated", "account.deleted", "order.created", "order.updated"]`, version `"0.2.0"`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec jest plugins/account-protection`
Expected: FAIL (`../orders` missing; plugin.test expectations).

- [ ] **Step 3: Implement**

`plugins/account-protection/orders.ts`:
```ts
import type { AfterInput } from "@nextcrm/plugin-sdk";
import type { Ctx } from "./settings";
import { dueDay, isoDay, withOrders, type Registration } from "./state";
import { K, startRegistration } from "./store";

/** Spec § 1.1: confirmed or later; a rep cannot keep a company by entering an order and cancelling it. */
export const QUALIFYING = ["CONFIRMED", "DELIVERED", "INVOICED", "PAID"];

const warned = new WeakSet<object>();

/** The newest qualifying order's day; null when there is none; undefined when orders cannot be read (Ruling 6). */
export async function latestOrderDay(ctx: Ctx, accountId: string): Promise<string | null | undefined> {
  try {
    const [o] = await ctx.data.orders.find({ where: { accountId, status: { in: QUALIFYING } }, orderBy: { orderDate: "desc" }, take: 1 });
    return o?.orderDate ? isoDay(o.orderDate as string) : null;
  } catch (e) {
    if (!warned.has(ctx)) {
      warned.add(ctx);
      ctx.log.warn(`Orders cannot be read; protection ignores orders: ${String(e)}`);
    }
    return undefined;
  }
}

/** Spec § 3.4: recompute one registration from the account's orders; idempotent. */
export async function recomputeFromOrders(accountId: string, ctx: Ctx): Promise<Registration | null> {
  const reg = await ctx.store.get<Registration>(K.reg(accountId));
  if (!reg) return null;
  const day = await latestOrderDay(ctx, accountId);
  if (day === undefined) return reg;
  const next = withOrders(reg, day, ctx.settings.orderMonths);
  if (JSON.stringify(next) === JSON.stringify(reg)) return reg;
  await ctx.store.delete(K.due(dueDay(reg), accountId));
  await ctx.store.set(K.reg(accountId), next);
  await ctx.store.set(K.due(dueDay(next), accountId), {});
  ctx.log.info("Protection recomputed from orders", { accountId, from: reg.protectedUntil, to: next.protectedUntil, lastOrderAt: next.lastOrderAt ?? null });
  return next;
}

/** Ruling 1: every new registration starts here, so an ordering customer keeps its order-based protection. */
export async function register(ctx: Ctx, accountId: string, reg: Registration): Promise<void> {
  await startRegistration(ctx.store, accountId, reg);
  await recomputeFromOrders(accountId, ctx);
}

/** order.created / order.updated (status or orderDate changed): recompute that order's account. */
export async function onOrderChanged(input: AfterInput, ctx: Ctx): Promise<void> {
  if (input.operation === "updated" && !(input.changed ?? []).some((f) => f === "status" || f === "orderDate")) return;
  try {
    const order = await ctx.data.orders.get(input.recordId);
    if (order?.accountId) await recomputeFromOrders(order.accountId as string, ctx);
  } catch (e) {
    ctx.log.warn(`Order ${input.recordId} could not be read: ${String(e)}`);
  }
}
```

`hooks.ts`:
```bash
sed -i '' 's/await startRegistration(ctx\.store, id, /await register(ctx, id, /g' plugins/account-protection/hooks.ts
```
then change the store import to drop `startRegistration` and add `import { register } from "./orders";`. Check: `grep -n "startRegistration\|register(" plugins/account-protection/hooks.ts` shows five `register(ctx, id, newRegistration(` calls and no `startRegistration`.

`plugin.ts`:
- `import { onOrderChanged } from "./orders";`
- `version: "0.2.0",`
- permissions: `["accounts:read", "accounts:write", "activities:read", "orders:read", "users:read", "notify"]`
- after the account afters:
```ts
    x.after("order", "created", (input, ctx) => onOrderChanged(input, ctx));
    x.after("order", "updated", (input, ctx) => onOrderChanged(input, ctx));
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm exec jest plugins/account-protection __tests__/plugins` then `pnpm exec tsc --noEmit`
Expected: PASS (all account-protection suites, including the unchanged hooks tests); tsc clean.

- [ ] **Step 5: Commit**

```bash
git add plugins/account-protection/orders.ts plugins/account-protection/hooks.ts plugins/account-protection/plugin.ts plugins/account-protection/__tests__/orders.test.ts plugins/account-protection/__tests__/plugin.test.ts
git commit -m "feat(account-protection): orders extend protection and count as contact

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Expiry job and upgrade pass

**Files:**
- Modify: `plugins/account-protection/jobs.ts`
- Test: `plugins/account-protection/__tests__/jobs.test.ts`

**Interfaces:**
- Consumes: `recomputeFromOrders`, `register` (Task 4), `dueDay`.
- Produces: `expire` recomputes before freeing; `upgrade` recomputes every registration once.

- [ ] **Step 1: Write the failing test**

In `jobs.test.ts`, change `mk` to accept orders:
```ts
const mk = (accounts: RecordData[], activities: RecordData[] = [], users: RecordData[] = [], orders: RecordData[] = []) =>
  createTestContext({ pluginId: "account-protection", actor: { type: "plugin", pluginId: "account-protection" }, settings: S, data: { accounts, activities, users, orders } }) as unknown as TestCtx;
```
and append:
```ts
describe("orders (rule 3)", () => {
  const order = (status: string, orderDate: string) => ({ id: `o-${status}`, accountId: "acc-1", status, orderDate });

  it("keeps an account past its window when a recent order exists and leaves no stale due entry (Review Focus 3)", async () => {
    const accounts = [{ id: "acc-1", name: "Alza", assigned_to: "rep1" as string | null }];
    const ctx = mk(accounts, [{ id: "a1", type: "visit", status: "completed", date: "2026-10-05T09:00:00Z", links: [{ entityType: "account", entityId: "acc-1" }] }], [], [order("PAID", "2026-12-01")]);
    await registered(ctx, "acc-1", reg1);
    await ctx.store.set(K.lastRun, { at: "2026-12-31T05:55:00.000Z" });
    await expire(ctx, new Date("2026-12-31T06:00:00Z"));
    expect(accounts[0].assigned_to).toBe("rep1");
    expect((await ctx.store.list("due:")).map((e) => e.key)).toEqual(["due:2027-12-01:acc-1"]);
  });

  it("treats a confirmed order after registration as the contact", async () => {
    const accounts = [{ id: "acc-1", name: "Alza", assigned_to: "rep1" as string | null }];
    const ctx = mk(accounts, [], [], [order("CONFIRMED", "2026-10-20")]);
    await registered(ctx, "acc-1", reg1);
    await ctx.store.set(K.lastRun, { at: "2026-11-01T05:55:00.000Z" });
    await expire(ctx, new Date("2026-11-01T06:00:00Z"));
    expect(accounts[0].assigned_to).toBe("rep1");
    expect((await ctx.store.get<Registration>(K.reg("acc-1")))?.contactAt).toBe("2026-10-20T00:00:00.000Z");
  });

  it("frees the account when its only order was cancelled", async () => {
    const accounts = [{ id: "acc-1", name: "Alza", assigned_to: "rep1" as string | null }];
    const ctx = mk(accounts, [], [], [order("CANCELLED", "2026-10-20")]);
    await registered(ctx, "acc-1", reg1);
    await ctx.store.set(K.lastRun, { at: "2026-11-01T05:55:00.000Z" });
    await expire(ctx, new Date("2026-11-01T06:00:00Z"));
    expect(accounts[0].assigned_to).toBeNull();
  });

  it("upgrade sets baseUntil and order-based dates on existing registrations", async () => {
    const ctx = mk([{ id: "acc-1", assigned_to: "rep1" }], [], [], [order("DELIVERED", "2026-09-15")]);
    const { baseUntil, ...old } = newRegistration("CZ:acc-1", "rep1", reg1, S);
    await startRegistration(ctx.store, "acc-1", old as Registration);
    await upgrade(ctx, new Date("2026-10-13T08:00:00Z"));
    const reg = await ctx.store.get<Registration>(K.reg("acc-1"));
    expect([reg?.baseUntil, reg?.lastOrderAt, reg?.protectedUntil]).toEqual([baseUntil, "2026-09-15", "2027-09-15T00:00:00.000Z"]);
  });
});
```
(Dates are chosen so the order decides: in the first test the visit satisfies the contact deadline and the 90-day window ends 2026-12-30 14:00, so on 31 December only the PAID order keeps the account; in the other two the contact deadline (31 October 14:00) has passed on 1 November.)

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec jest plugins/account-protection/__tests__/jobs.test.ts`
Expected: FAIL (accounts freed; upgrade does not recompute).

- [ ] **Step 3: Implement**

`jobs.ts`:
- imports: add `import { recomputeFromOrders, register } from "./orders";`; drop `startRegistration` from the store import.
- in `resume`, replace `await startRegistration(ctx.store, id, newRegistration(reg.key, reg.ownerId, now, ctx.settings));` with `await register(ctx, id, newRegistration(reg.key, reg.ownerId, now, ctx.settings));`.
- in `expire`, replace
```ts
      const reg = await ctx.store.get<Registration>(K.reg(accountId));
      if (!reg) { await ctx.store.delete(entry.key); continue; }
```
with
```ts
      const stored = await ctx.store.get<Registration>(K.reg(accountId));
      if (!stored) { await ctx.store.delete(entry.key); continue; }
      // Rule 3: an order may extend protection or count as contact; recompute moves the due entry itself.
      const reg = (await recomputeFromOrders(accountId, ctx)) ?? stored;
      if (dueDay(reg) > today) continue;
```
- in `upgrade`, after `await pruneConflicts(ctx, at);`:
```ts
  // 0.2.0: registrations gain baseUntil and order-based protection (spec § 3.5).
  for (const entry of await ctx.store.list("reg:")) await recomputeFromOrders(entry.key.slice(4), ctx);
```
and update its doc comment to mention 0.2.0.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec jest plugins/account-protection` then `pnpm exec tsc --noEmit`
Expected: PASS; tsc clean.

- [ ] **Step 5: Commit**

```bash
git add plugins/account-protection/jobs.ts plugins/account-protection/__tests__/jobs.test.ts
git commit -m "feat(account-protection): expiry and upgrade respect orders

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Protection tab line, messages, docs

**Files:**
- Modify: `plugins/account-protection/ui/common.ts`, `plugins/account-protection/ui/ProtectionTab.tsx`, `plugins/account-protection/messages/{en,cz,de,uk}.json`
- Modify: `apps/docs/content/docs/admins/plugins/account-protection.mdx`, `apps/docs/content/docs/users/crm/account-protection.mdx`
- Test: `plugins/account-protection/__tests__/ui.test.ts`

**Interfaces:**
- Produces: `orderText(ctx, reg): string | null` in `ui/common.ts`.

- [ ] **Step 1: Write the failing test**

Append to `ui.test.ts` (import `orderText` from `../ui/common` and `withOrders` from `../state`):
```ts
it("shows the last confirmed order, or that there is none while rule 3 is on (Ruling 3)", () => {
  const ctx = mk([]);
  const reg = newRegistration("CZ:1", "rep1", new Date("2026-10-01T14:00:00Z"), S);
  expect(orderText(ctx, reg)).toBe("tab.noOrder");
  expect(orderText(ctx, withOrders(reg, "2026-10-05", 12))).toBe("tab.lastOrder");
  expect(orderText({ ...ctx, settings: { ...S, orderMonths: 0 } } as Ctx, reg)).toBeNull();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec jest plugins/account-protection/__tests__/ui.test.ts`
Expected: FAIL (`orderText` not exported).

- [ ] **Step 3: Implement**

`ui/common.ts`:
```ts
/** Ruling 3: the last confirmed order whenever one exists; "none yet" only while rule 3 is on. */
export function orderText(ctx: Ctx, reg: Registration): string | null {
  if (reg.lastOrderAt) return ctx.t("tab.lastOrder", { date: formatDay(reg.lastOrderAt, ctx.locale) });
  return ctx.settings.orderMonths > 0 ? ctx.t("tab.noOrder") : null;
}
```
`ProtectionTab.tsx`: import `orderText`, and inside the `{reg && (<> … </>)}` block after the contact row:
```tsx
            {orderText(ctx, reg) && (
              <>
                <dt className="text-muted-foreground">{ctx.t("tab.order")}</dt>
                <dd>{orderText(ctx, reg)}</dd>
              </>
            )}
```
Messages — add to `tab` in each file, after `"contactNo"` (textual edit, quote nothing else; `{date}` is a real placeholder):
- en: `"order": "Orders", "lastOrder": "Last confirmed order on {date}", "noOrder": "No confirmed order yet",`
- cz: `"order": "Objednávky", "lastOrder": "Poslední potvrzená objednávka {date}", "noOrder": "Zatím žádná potvrzená objednávka",`
- de: `"order": "Bestellungen", "lastOrder": "Letzte bestätigte Bestellung am {date}", "noOrder": "Noch keine bestätigte Bestellung",`
- uk: `"order": "Замовлення", "lastOrder": "Останнє підтверджене замовлення {date}", "noOrder": "Підтверджених замовлень ще немає",`

Docs:
- `admins/plugins/account-protection.mdx`: add `orderMonths` to the settings table — "Protection runs at least this many months from the last confirmed order (CONFIRMED, DELIVERED, INVOICED or PAID). 0 turns this off; orders still count as contact. Default 12." — and one paragraph under how protection works: confirmed orders extend protection and count as the contact; cancelling falls back; the plugin needs the `orders:read` permission (accept it when upgrading).
- `users/crm/account-protection.mdx`: one paragraph: "A confirmed order keeps your customer protected for a year from the order date (your admin sets the length) and counts as your contact. The Protection tab shows the last confirmed order."

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec jest plugins/account-protection` then `pnpm exec tsc --noEmit` and `pnpm lint`
Expected: PASS; clean. Also `node -e "for (const l of ['en','cz','de','uk']) JSON.parse(require('fs').readFileSync('plugins/account-protection/messages/'+l+'.json','utf8'))"` exits 0.

- [ ] **Step 5: Commit**

```bash
git add plugins/account-protection/ui plugins/account-protection/messages plugins/account-protection/__tests__/ui.test.ts apps/docs/content/docs/admins/plugins/account-protection.mdx apps/docs/content/docs/users/crm/account-protection.mdx
git commit -m "feat(account-protection): last order on the Protection tab, docs

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: Whole-branch verification and manual check

- [ ] **Step 1: Full suite, types, lint, build**

Run: `pnpm exec jest 2>&1 | tail -8 && pnpm exec tsc --noEmit && pnpm lint`
Expected: only the 6 baseline failures; tsc and lint clean.
Build with the CI dummy env (`.github/workflows/ci.yml` lines 22–53, exported through a small Python script, not BSD `sed`): `pnpm exec prisma generate && pnpm exec next build` → succeeds.

- [ ] **Step 2: Manual check on local dev (drive it in Chrome)**

Setup: `../nextcrm-app/.env` + `.env.local`, `RESEND_API_KEY` unset, app URLs on `:3001`, `prisma migrate deploy` (adds `orderDate`), `next dev -p 3001`, test-otp sign-in (admin `test@nextcrm.app`, rep `rep.test@nextcrm.test`). Install the plugin under Admin → Plugins if not installed (Inngest dev container needed for install: `docker run -d --rm --name nextcrm-ap-inngest -p 8288:8288 inngest/inngest inngest dev --no-discovery -u http://host.docker.internal:3001/api/inngest`), enable it.

Check:
1. Orders list and order page show the order date; existing local orders show their creation day.
2. Rep owns "Rep Own Test" with a registration number; Protection tab shows "No confirmed order yet".
3. Admin moves a READY order on that account to CONFIRMED → within seconds the Protection tab shows "Last confirmed order on <today>" and the status date moves to today + 12 months.
4. Cancel that order → the date falls back to the registration's own window.
5. Admin → Plugins → account-protection settings: `orderMonths` present (12); set 0 → the order line disappears and the date stays at the own window.

Afterwards: remove the Inngest container by name, `git checkout -- AGENTS.md`, stop the dev server.

- [ ] **Step 3: Record results and hand off to finishing-a-development-branch**
