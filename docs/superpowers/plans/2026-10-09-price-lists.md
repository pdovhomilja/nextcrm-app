# Price lists and pricing engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Core price lists with Odoo-compatible rules, a pricing engine that answers "what does this product cost for this customer", and the screens, actions and MCP tools to manage them.

**Architecture:**
- A pure engine (`lib/pricing/engine.ts`) computes a price from loaded data; a thin loader (`lib/pricing/get-price.ts`) reads Prisma and builds that data.
- Validation and cycle checks are pure functions (`lib/pricing/validate.ts`).
- Server actions and MCP tools sit on top. Every write goes through one authz helper (`assertCanWritePriceList`).
- Screens: Sales → Price lists, the list detail with rule editor and price check, a price-list field on accounts, an admin Pricing page, and a product-categories tab in CRM Settings.

**Tech Stack:** Next.js 16 (App Router, RSC + server actions), Prisma 7 + PostgreSQL, `decimal.js`, zod 4, next-intl, shadcn/ui, jest.

**Spec:** `docs/superpowers/specs/2026-10-09-price-lists-design.md`

## Global Constraints

- Rule maths and selection follow Odoo 17 (spec § 3). Formula order: discount → round → surcharge → min margin → max margin. Margins and surcharge are skipped when 0 or null, as in Odoo.
- Money and quantities are `Decimal` in the DB and `decimal.js` (`import { Decimal } from "decimal.js"`) in code. The engine never rounds the result; display rounds to 2 decimals.
- A missing exchange rate throws `MissingRateError`. Never price at 1:1 silently. Rates are looked up direct first, then inverse (`1 / rate`).
- Access (spec § 4): every role reads; manager and admin write `CRM` lists; nobody writes `EXTERNAL` lists through UI, actions or MCP; only admin sets the default list; the account price list follows the existing account write rule.
- Lists referenced by accounts or used as another list's base can only be archived. Unreferenced lists can be deleted.
- All new UI text in `locales/{en,cz,de,uk}.json` with identical keys (namespace `PriceListsPage`, plus `ModuleMenu.crm.priceLists` and `AdminPage.pricing*` keys).
- Audit entity types `price_list` and `price_list_rule`.
- **Fresh worktree setup**, before tsc and the full suite: `pnpm install --frozen-lockfile --prefer-offline`, then `DATABASE_URL=postgresql://x:x@localhost:5432/x pnpm exec prisma generate`.
- **Known baseline failures** (ignore): `__tests__/enrichment/enrich-contact-job.test.ts`, `__tests__/enrichment/enrich-target-job.test.ts`, `inngest/functions/calendar/__tests__/google-sync-classify.test.ts`, `__tests__/invoices/lifecycle.test.ts` (needs a live DB).
- **CI runs `pnpm lint`.** Changed files must lint clean.
- **Commits** end with `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`. Never `git add -A`. `next dev` rewrites `AGENTS.md`; run `git checkout -- AGENTS.md` before committing.

## Rulings (decided while planning)

1. **No category screen exists today.** Product categories are only read; nothing creates them. Category rules are unusable without one, so Task 9 adds a minimal "Product categories" tab in Admin → CRM Settings (name, parent, active). That's an addition to spec § 5, which assumed the screen existed.
2. **Server actions are grouped in one file per area** (`actions/crm/price-lists/price-lists.ts`, `queries.ts`), like `actions/crm/opportunities/approval.ts`, not one directory per action. Fewer files for a CRUD surface.
3. **Engine conversion uses its own rate lookup.** `lib/currency-format.ts` `convertAmount` rounds to 2 decimals and knows only direct rates. The engine needs full precision and inverse rates.

## Review Focus

1. **A list in EUR prices CZK products** and only `EUR→CZK` is stored. The inverse rate is used and the price is right, not an error. Test in Task 3.
2. **A rep opens price-list screens or calls write tools.** They can read everything and change nothing, including through MCP. Tests in Tasks 5 and 7.
3. **A rule saved with fields from another compute type** (e.g. switching FIXED → FORMULA leaves an old `fixedPrice`). Irrelevant fields are cleared, so the engine and the UI never see stale values. Test in Task 5.
4. **Clearing an account's price list in the edit form** sends `""`. It must be stored as `null`, not rejected by the FK. Test in Task 6.
5. **A category moved under its own child.** Rejected, so the engine's category walk can't loop. Test in Task 6 (the engine also stops at 20 levels, Task 3).

---

## File Structure

```
prisma/schema.prisma                                        4 enums, 2 models, 2 new columns, back-relations
prisma/migrations/20261011000000_price_lists/migration.sql
lib/pricing/types.ts                                        engine data types
lib/pricing/errors.ts                                       PricingError subclasses
lib/pricing/engine.ts                                       applicableRules, roundTo, computePrice (pure)
lib/pricing/get-price.ts                                    getPrice, resolvePriceListId, rateLookup (Prisma loader)
lib/pricing/validate.ts                                     ruleProblems, createsListCycle, createsCategoryCycle (pure)
lib/authz/scopes/pricing.ts                                 assertCanWritePriceList
lib/authz/index.ts                                          export it
lib/audit-log.ts                                            AuditEntityType + price_list, price_list_rule, product_category
actions/crm/price-lists/price-lists.ts                      write actions + checkPrice
actions/crm/price-lists/queries.ts                          read actions
actions/crm/accounts/create-account.ts, update-account.ts   pricelist_id passthrough
app/[locale]/(routes)/admin/pricing/_actions/pricing.ts     default list setting
app/[locale]/(routes)/admin/crm-settings/_actions/product-categories.ts
lib/mcp/tools/crm-price-lists.ts + lib/mcp/tools/index.ts
app/[locale]/(routes)/crm/price-lists/page.tsx              list page
app/[locale]/(routes)/crm/price-lists/[priceListId]/page.tsx
app/[locale]/(routes)/crm/price-lists/components/*.tsx      PriceListsTable, NewPriceListButton, PriceListHeader, RulesTable, RuleSheet, PriceCheckPanel
app/[locale]/(routes)/components/menu-items/Crm.tsx + layout.tsx   nav item
crm/accounts/components/NewAccountForm.tsx, UpdateAccountForm.tsx, [accountId]/components/BasicView.tsx
app/[locale]/(routes)/admin/pricing/page.tsx + _components/DefaultPriceListForm.tsx
app/[locale]/(routes)/admin/_components/AdminSidebarNav.tsx
app/[locale]/(routes)/admin/crm-settings/_components/ProductCategoriesTab.tsx + CrmSettingsTabs.tsx
locales/{en,cz,de,uk}.json
__tests__/pricing/*.test.ts, actions tests, lib/mcp/__tests__/crm-price-lists.test.ts
```

---

### Task 1: Schema and migration

**Files:**
- Modify: `prisma/schema.prisma` (new enums and models at the end of the CRM section; columns on `crm_Accounts` :12-73, `crm_ProductCategories` :1670, back-relations on `Currency` :609 and `crm_Products` :1687)
- Create: `prisma/migrations/20261011000000_price_lists/migration.sql`
- Test: `__tests__/pricing/schema.test.ts`

**Interfaces:**
- Produces: Prisma models `crm_PriceLists` and `crm_PriceListRules`; enums `crm_PriceList_Source {CRM, EXTERNAL}`, `crm_PriceRule_Target {ALL, CATEGORY, PRODUCT}`, `crm_PriceRule_Compute {FIXED, PERCENTAGE, FORMULA}`, `crm_PriceRule_Base {LIST_PRICE, COST, PRICE_LIST}`; columns `crm_Accounts.pricelist_id`, `crm_ProductCategories.parentId`.

- [ ] **Step 1: Set up the worktree**

Run: `pnpm install --frozen-lockfile --prefer-offline && DATABASE_URL=postgresql://x:x@localhost:5432/x pnpm exec prisma generate`
Expected: both succeed.

- [ ] **Step 2: Write the failing test**

`__tests__/pricing/schema.test.ts`:
```ts
import { Prisma, crm_PriceList_Source, crm_PriceRule_Base, crm_PriceRule_Compute, crm_PriceRule_Target } from "@prisma/client";

it("generates the pricing enums", () => {
  expect(Object.values(crm_PriceList_Source)).toEqual(["CRM", "EXTERNAL"]);
  expect(Object.values(crm_PriceRule_Target)).toEqual(["ALL", "CATEGORY", "PRODUCT"]);
  expect(Object.values(crm_PriceRule_Compute)).toEqual(["FIXED", "PERCENTAGE", "FORMULA"]);
  expect(Object.values(crm_PriceRule_Base)).toEqual(["LIST_PRICE", "COST", "PRICE_LIST"]);
});

it("generates the pricing columns", () => {
  expect(Prisma.Crm_PriceListsScalarFieldEnum.externalRef).toBe("externalRef");
  expect(Prisma.Crm_PriceListRulesScalarFieldEnum.priceRound).toBe("priceRound");
  expect(Prisma.Crm_PriceListRulesScalarFieldEnum.basePriceListId).toBe("basePriceListId");
  expect(Prisma.Crm_AccountsScalarFieldEnum.pricelist_id).toBe("pricelist_id");
  expect(Prisma.Crm_ProductCategoriesScalarFieldEnum.parentId).toBe("parentId");
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm exec jest __tests__/pricing/schema.test.ts`
Expected: FAIL (enums undefined, `Crm_PriceListsScalarFieldEnum` undefined).

- [ ] **Step 4: Edit the schema**

Save the current schema for the migration diff: `cp prisma/schema.prisma /tmp/schema.before.prisma`.

Add to `prisma/schema.prisma`:
```prisma
enum crm_PriceList_Source {
  CRM
  EXTERNAL
}

enum crm_PriceRule_Target {
  ALL
  CATEGORY
  PRODUCT
}

enum crm_PriceRule_Compute {
  FIXED
  PERCENTAGE
  FORMULA
}

enum crm_PriceRule_Base {
  LIST_PRICE
  COST
  PRICE_LIST
}

model crm_PriceLists {
  id          String               @id @default(uuid()) @db.Uuid
  name        String
  currency    String               @db.VarChar(3)
  isActive    Boolean              @default(true)
  source      crm_PriceList_Source @default(CRM)
  externalRef String?
  createdBy   String?              @db.Uuid
  updatedBy   String?              @db.Uuid
  createdAt   DateTime             @default(now())
  updatedAt   DateTime             @updatedAt

  assigned_currency Currency             @relation(fields: [currency], references: [code])
  rules             crm_PriceListRules[] @relation("PriceListRules")
  baseFor           crm_PriceListRules[] @relation("PriceListRuleBase")
  accounts          crm_Accounts[]

  @@unique([source, externalRef])
  @@index([isActive])
}

model crm_PriceListRules {
  id              String                @id @default(uuid()) @db.Uuid
  priceListId     String                @db.Uuid
  appliesTo       crm_PriceRule_Target  @default(ALL)
  categoryId      String?               @db.Uuid
  productId       String?               @db.Uuid
  minQuantity     Decimal               @default(0) @db.Decimal(14, 4)
  dateStart       DateTime?
  dateEnd         DateTime?
  computePrice    crm_PriceRule_Compute @default(FIXED)
  fixedPrice      Decimal?              @db.Decimal(18, 4)
  percentPrice    Decimal?              @db.Decimal(7, 4)
  base            crm_PriceRule_Base    @default(LIST_PRICE)
  basePriceListId String?               @db.Uuid
  priceDiscount   Decimal               @default(0) @db.Decimal(7, 4)
  priceSurcharge  Decimal               @default(0) @db.Decimal(18, 4)
  priceRound      Decimal?              @db.Decimal(18, 4)
  priceMinMargin  Decimal?              @db.Decimal(18, 4)
  priceMaxMargin  Decimal?              @db.Decimal(18, 4)
  externalRef     String?
  createdAt       DateTime              @default(now())
  updatedAt       DateTime              @updatedAt

  priceList     crm_PriceLists         @relation("PriceListRules", fields: [priceListId], references: [id], onDelete: Cascade)
  basePriceList crm_PriceLists?        @relation("PriceListRuleBase", fields: [basePriceListId], references: [id], onDelete: Restrict)
  category      crm_ProductCategories? @relation(fields: [categoryId], references: [id], onDelete: Cascade)
  product       crm_Products?          @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@index([priceListId, appliesTo])
  @@index([basePriceListId])
}
```
In `model crm_Accounts` add:
```prisma
  pricelist_id         String?   @db.Uuid
  pricelist            crm_PriceLists? @relation(fields: [pricelist_id], references: [id], onDelete: SetNull)
```
and `@@index([pricelist_id])`.

In `model crm_ProductCategories` add:
```prisma
  parentId   String?                 @db.Uuid
  parent     crm_ProductCategories?  @relation("CategoryTree", fields: [parentId], references: [id], onDelete: SetNull)
  children   crm_ProductCategories[] @relation("CategoryTree")
  priceRules crm_PriceListRules[]
```

Back-relations: `priceLists crm_PriceLists[]` in `model Currency`, and `priceRules crm_PriceListRules[]` in `model crm_Products`.

Then run `pnpm exec prisma format` and `DATABASE_URL=postgresql://x:x@localhost:5432/x pnpm exec prisma generate`.

- [ ] **Step 5: Generate the migration SQL offline**

```bash
mkdir -p prisma/migrations/20261011000000_price_lists
pnpm exec prisma migrate diff --from-schema-datamodel /tmp/schema.before.prisma --to-schema-datamodel prisma/schema.prisma --script > prisma/migrations/20261011000000_price_lists/migration.sql
```
If Prisma 7 rejects `--from-schema-datamodel`, use `--from-schema /tmp/schema.before.prisma --to-schema prisma/schema.prisma --script`. Expected: the file has `CREATE TYPE` ×4, `CREATE TABLE "crm_PriceLists"`, `CREATE TABLE "crm_PriceListRules"`, `ALTER TABLE "crm_Accounts" ADD COLUMN "pricelist_id"`, `ALTER TABLE "crm_ProductCategories" ADD COLUMN "parentId"`, indexes and foreign keys, and nothing else (no unrelated drift).

- [ ] **Step 6: Run tests**

Run: `pnpm exec jest __tests__/pricing/schema.test.ts && pnpm exec tsc --noEmit`
Expected: PASS; tsc reports no errors.

- [ ] **Step 7: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20261011000000_price_lists __tests__/pricing/schema.test.ts
git commit -m "feat(pricing): price list schema"
```

---

### Task 2: Pure pricing engine

**Files:**
- Create: `lib/pricing/types.ts`, `lib/pricing/errors.ts`, `lib/pricing/engine.ts`
- Test: `__tests__/pricing/engine.test.ts`, `__tests__/pricing/parity.test.ts`

**Interfaces:**
- Produces (`types.ts`):
  ```ts
  export type Target = "ALL" | "CATEGORY" | "PRODUCT";
  export type Compute = "FIXED" | "PERCENTAGE" | "FORMULA";
  export type Base = "LIST_PRICE" | "COST" | "PRICE_LIST";
  export interface RuleData { id: string; appliesTo: Target; categoryId: string | null; productId: string | null; minQuantity: Decimal; dateStart: Date | null; dateEnd: Date | null; computePrice: Compute; fixedPrice: Decimal | null; percentPrice: Decimal | null; base: Base; basePriceListId: string | null; priceDiscount: Decimal; priceSurcharge: Decimal; priceRound: Decimal | null; priceMinMargin: Decimal | null; priceMaxMargin: Decimal | null; createdAt: Date }
  export interface ListData { id: string; currency: string; rules: RuleData[] }
  export interface ProductData { id: string; unitPrice: Decimal; unitCost: Decimal | null; currency: string; categoryId: string | null }
  export interface PricingContext { lists: Map<string, ListData>; product: ProductData; categoryChain: string[]; rate(from: string, to: string): Decimal }
  export type StepLabel = "fallback" | "fixed" | "base" | "percentage" | "discount" | "round" | "surcharge" | "minMargin" | "maxMargin";
  export interface PriceStep { label: StepLabel; value: Decimal }
  export interface PriceResult { price: Decimal; currency: string; listPrice: Decimal; ruleId: string | null; steps: PriceStep[] }
  ```
  `categoryChain` is the product's category first, then its parent, grandparent, and so on.
- Produces (`errors.ts`): `PricingError`, `PriceListNotFound(id)`, `ProductNotFound(id)`, `MissingRateError(from, to)`, `PriceListDepthExceeded(id)`.
- Produces (`engine.ts`): `applicableRules(list, product, categoryChain, quantity, date): RuleData[]`, `roundTo(value, step): Decimal`, `computePrice(ctx, listId, quantity, date, depth?): PriceResult`.

- [ ] **Step 1: Write the failing tests**

`__tests__/pricing/engine.test.ts`:
```ts
import { Decimal } from "decimal.js";
import { applicableRules, computePrice, roundTo } from "@/lib/pricing/engine";
import { MissingRateError, PriceListDepthExceeded, PriceListNotFound } from "@/lib/pricing/errors";
import type { ListData, PricingContext, ProductData, RuleData } from "@/lib/pricing/types";

const d = (v: number | string) => new Decimal(v);
const rule = (over: Partial<RuleData>): RuleData => ({
  id: "r", appliesTo: "ALL", categoryId: null, productId: null, minQuantity: d(0), dateStart: null, dateEnd: null,
  computePrice: "FIXED", fixedPrice: null, percentPrice: null, base: "LIST_PRICE", basePriceListId: null,
  priceDiscount: d(0), priceSurcharge: d(0), priceRound: null, priceMinMargin: null, priceMaxMargin: null,
  createdAt: new Date("2026-01-01T00:00:00Z"), ...over,
});
const product: ProductData = { id: "p1", unitPrice: d(100), unitCost: d(60), currency: "CZK", categoryId: "c-child" };
const rate = (from: string, to: string) => {
  if (from === to) return d(1);
  if (from === "EUR" && to === "CZK") return d(25);
  if (from === "CZK" && to === "EUR") return d(1).div(25);
  throw new MissingRateError(from, to);
};
const ctx = (lists: ListData[], over: Partial<PricingContext> = {}): PricingContext =>
  ({ lists: new Map(lists.map((l) => [l.id, l])), product, categoryChain: ["c-child", "c-parent"], rate, ...over });
const list = (rules: RuleData[], over: Partial<ListData> = {}): ListData => ({ id: "L", currency: "CZK", rules, ...over });
const price = (c: PricingContext, qty = 1, date = new Date("2026-06-01T12:00:00Z"), listId = "L") => computePrice(c, listId, d(qty), date);

it("falls back to the product's list price without a matching rule", () => {
  const r = price(ctx([list([])]));
  expect(r.price.toFixed(2)).toBe("100.00");
  expect(r.ruleId).toBeNull();
  expect(r.steps.map((s) => s.label)).toEqual(["fallback"]);
});

it("applies fixed and percentage rules", () => {
  expect(price(ctx([list([rule({ fixedPrice: d(80) })])])).price.toFixed(2)).toBe("80.00");
  expect(price(ctx([list([rule({ computePrice: "PERCENTAGE", percentPrice: d(10) })])])).price.toFixed(2)).toBe("90.00");
});

it("prefers product over deeper category over shallower category over all", () => {
  const rules = [
    rule({ id: "all", fixedPrice: d(70) }),
    rule({ id: "parent", appliesTo: "CATEGORY", categoryId: "c-parent", fixedPrice: d(75) }),
    rule({ id: "child", appliesTo: "CATEGORY", categoryId: "c-child", fixedPrice: d(78) }),
    rule({ id: "prod", appliesTo: "PRODUCT", productId: "p1", fixedPrice: d(80) }),
  ];
  expect(price(ctx([list(rules)])).ruleId).toBe("prod");
  expect(price(ctx([list(rules.filter((r) => r.id !== "prod"))])).ruleId).toBe("child");
  expect(price(ctx([list(rules.filter((r) => r.id !== "prod" && r.id !== "child"))])).ruleId).toBe("parent");
  expect(price(ctx([list(rules)], { categoryChain: [] })).ruleId).toBe("prod");
});

it("ignores rules for other products and categories", () => {
  const rules = [rule({ appliesTo: "PRODUCT", productId: "p2", fixedPrice: d(1) }), rule({ appliesTo: "CATEGORY", categoryId: "c-other", fixedPrice: d(2) })];
  expect(price(ctx([list(rules)])).ruleId).toBeNull();
});

it("picks the highest minimum quantity that applies", () => {
  const rules = [rule({ id: "q0", fixedPrice: d(90) }), rule({ id: "q10", minQuantity: d(10), fixedPrice: d(85) })];
  expect(price(ctx([list(rules)]), 9).ruleId).toBe("q0");
  expect(price(ctx([list(rules)]), 10).ruleId).toBe("q10");
});

it("prefers the newest rule on a tie", () => {
  const rules = [rule({ id: "old", fixedPrice: d(1) }), rule({ id: "new", fixedPrice: d(2), createdAt: new Date("2026-02-01T00:00:00Z") })];
  expect(price(ctx([list(rules)])).ruleId).toBe("new");
});

it("treats rule dates as inclusive calendar days in UTC", () => {
  const on = (over: Partial<RuleData>) => price(ctx([list([rule({ fixedPrice: d(1), ...over })])])).ruleId;
  expect(on({ dateStart: new Date("2026-07-01T00:00:00Z") })).toBeNull();
  expect(on({ dateEnd: new Date("2026-06-01T00:00:00Z") })).toBe("r");
  expect(on({ dateEnd: new Date("2026-05-31T23:59:59Z") })).toBeNull();
  expect(on({ dateStart: new Date("2026-06-01T23:00:00Z") })).toBe("r");
});

it("runs formula steps in Odoo's order", () => {
  const r = price(ctx([list([rule({
    computePrice: "FORMULA", priceDiscount: d(12.5), priceRound: d(5), priceSurcharge: d(-0.1), priceMinMargin: d(-20), priceMaxMargin: d(-15),
  })])]));
  expect(r.steps.map((s) => [s.label, s.value.toFixed(2)])).toEqual([
    ["base", "100.00"], ["discount", "87.50"], ["round", "90.00"], ["surcharge", "89.90"], ["minMargin", "89.90"], ["maxMargin", "85.00"],
  ]);
  expect(r.price.toFixed(2)).toBe("85.00");
});

it("treats a negative discount as a markup on cost", () => {
  expect(price(ctx([list([rule({ computePrice: "FORMULA", base: "COST", priceDiscount: d(-20) })])])).price.toFixed(2)).toBe("72.00");
});

it("skips zero margins like Odoo", () => {
  const r = price(ctx([list([rule({ computePrice: "FORMULA", priceDiscount: d(50), priceMinMargin: d(0) })])]));
  expect(r.price.toFixed(2)).toBe("50.00");
});

it("rounds half away from zero", () => {
  expect(roundTo(d(100.5), d(1)).toFixed(2)).toBe("101.00");
  expect(roundTo(d(101.25), d(0.5)).toFixed(2)).toBe("101.50");
  expect(roundTo(d(-2.5), d(1)).toFixed(2)).toBe("-3.00");
});

it("chains price lists and converts currencies", () => {
  const base: ListData = { id: "B", currency: "EUR", rules: [rule({ fixedPrice: d(4) })] };
  const main = list([rule({ computePrice: "FORMULA", base: "PRICE_LIST", basePriceListId: "B", priceDiscount: d(10) })]);
  expect(price(ctx([main, base])).price.toFixed(2)).toBe("90.00");
  const eur = list([], { currency: "EUR" });
  expect(price(ctx([eur])).price.toFixed(2)).toBe("4.00");
});

it("throws on a missing rate, a missing list and a loop", () => {
  expect(() => price(ctx([list([], { currency: "USD" })]))).toThrow(MissingRateError);
  expect(() => price(ctx([]))).toThrow(PriceListNotFound);
  const a = list([rule({ computePrice: "FORMULA", base: "PRICE_LIST", basePriceListId: "B" })], { id: "A" });
  const b = list([rule({ computePrice: "FORMULA", base: "PRICE_LIST", basePriceListId: "A" })], { id: "B" });
  expect(() => price(ctx([a, b]), 1, undefined, "A")).toThrow(PriceListDepthExceeded);
});

it("exposes rule selection", () => {
  const rules = [rule({ id: "x", fixedPrice: d(1), minQuantity: d(5) })];
  expect(applicableRules(list(rules), product, ["c-child"], d(4), new Date("2026-06-01T00:00:00Z"))).toEqual([]);
});
```
`__tests__/pricing/parity.test.ts` (prices worked out by hand from Odoo 17 `product.pricelist.item._compute_price`):
```ts
import { Decimal } from "decimal.js";
import { computePrice } from "@/lib/pricing/engine";
import type { RuleData } from "@/lib/pricing/types";

const d = (v: number | string) => new Decimal(v);
const base: RuleData = {
  id: "r", appliesTo: "ALL", categoryId: null, productId: null, minQuantity: d(0), dateStart: null, dateEnd: null,
  computePrice: "FORMULA", fixedPrice: null, percentPrice: null, base: "LIST_PRICE", basePriceListId: null,
  priceDiscount: d(0), priceSurcharge: d(0), priceRound: null, priceMinMargin: null, priceMaxMargin: null, createdAt: new Date("2026-01-01T00:00:00Z"),
};
const cases: [string, Partial<RuleData>, string][] = [
  ["fixed 99.90", { computePrice: "FIXED", fixedPrice: d(99.9) }, "99.90"],
  ["15 % off list", { computePrice: "PERCENTAGE", percentPrice: d(15) }, "85.00"],
  ["cost +25 %, round 1, -0.01", { base: "COST", priceDiscount: d(-25), priceRound: d(1), priceSurcharge: d(-0.01) }, "74.99"],
  ["33.333 % off, round 0.10", { priceDiscount: d(33.333), priceRound: d(0.1) }, "66.70"],
  ["10 % off, round 5, +2, min margin -5", { priceDiscount: d(10), priceRound: d(5), priceSurcharge: d(2), priceMinMargin: d(-5) }, "95.00"],
  ["2.5 % off, round 1 (half up)", { priceDiscount: d(2.5), priceRound: d(1) }, "98.00"],
  ["40 % off, max margin -50", { priceDiscount: d(40), priceMaxMargin: d(-50) }, "50.00"],
  ["no discount, surcharge 12.5", { priceSurcharge: d(12.5) }, "112.50"],
];

it.each(cases)("%s", (_name, over, expected) => {
  const r = computePrice({
    lists: new Map([["L", { id: "L", currency: "CZK", rules: [{ ...base, ...over }] }]]),
    product: { id: "p1", unitPrice: d(100), unitCost: d(60), currency: "CZK", categoryId: null },
    categoryChain: [],
    rate: () => d(1),
  }, "L", d(1), new Date("2026-06-01T00:00:00Z"));
  expect(r.price.toFixed(2)).toBe(expected);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec jest __tests__/pricing/engine.test.ts __tests__/pricing/parity.test.ts`
Expected: FAIL with "Cannot find module '@/lib/pricing/engine'".

- [ ] **Step 3: Implement**

`lib/pricing/types.ts`:
```ts
import type { Decimal } from "decimal.js";

export type Target = "ALL" | "CATEGORY" | "PRODUCT";
export type Compute = "FIXED" | "PERCENTAGE" | "FORMULA";
export type Base = "LIST_PRICE" | "COST" | "PRICE_LIST";

export interface RuleData {
  id: string;
  appliesTo: Target;
  categoryId: string | null;
  productId: string | null;
  minQuantity: Decimal;
  dateStart: Date | null;
  dateEnd: Date | null;
  computePrice: Compute;
  fixedPrice: Decimal | null;
  percentPrice: Decimal | null;
  base: Base;
  basePriceListId: string | null;
  priceDiscount: Decimal;
  priceSurcharge: Decimal;
  priceRound: Decimal | null;
  priceMinMargin: Decimal | null;
  priceMaxMargin: Decimal | null;
  createdAt: Date;
}

export interface ListData { id: string; currency: string; rules: RuleData[] }

export interface ProductData { id: string; unitPrice: Decimal; unitCost: Decimal | null; currency: string; categoryId: string | null }

/** categoryChain: the product's category first, then its ancestors. rate() throws MissingRateError. */
export interface PricingContext {
  lists: Map<string, ListData>;
  product: ProductData;
  categoryChain: string[];
  rate(from: string, to: string): Decimal;
}

export type StepLabel = "fallback" | "fixed" | "base" | "percentage" | "discount" | "round" | "surcharge" | "minMargin" | "maxMargin";
export interface PriceStep { label: StepLabel; value: Decimal }
export interface PriceResult { price: Decimal; currency: string; listPrice: Decimal; ruleId: string | null; steps: PriceStep[] }
```
`lib/pricing/errors.ts`:
```ts
export class PricingError extends Error {}
export class PriceListNotFound extends PricingError {
  constructor(public readonly id: string) { super(`Price list not found: ${id}`); }
}
export class ProductNotFound extends PricingError {
  constructor(public readonly id: string) { super(`Product not found: ${id}`); }
}
export class MissingRateError extends PricingError {
  constructor(public readonly from: string, public readonly to: string) { super(`Missing exchange rate ${from} → ${to}`); }
}
export class PriceListDepthExceeded extends PricingError {
  constructor(public readonly id: string) { super(`Price list chain too deep at ${id}`); }
}
```
`lib/pricing/engine.ts`:
```ts
import { Decimal } from "decimal.js";
import { PriceListDepthExceeded, PriceListNotFound } from "./errors";
import type { ListData, PriceResult, PriceStep, PricingContext, ProductData, RuleData } from "./types";

const TARGET_RANK = { PRODUCT: 0, CATEGORY: 1, ALL: 2 } as const;
const MAX_DEPTH = 10;
const day = (d: Date) => d.toISOString().slice(0, 10);
const set = (v: Decimal | null) => !!v && !v.isZero();   // Odoo skips 0 like unset

/** Odoo 17 _get_applicable_rules order: product, deeper category, shallower category, all; then min quantity desc; then newest. */
export function applicableRules(list: ListData, product: ProductData, categoryChain: string[], quantity: Decimal, date: Date): RuleData[] {
  const today = day(date);
  const depth = (id: string | null) => (id ? categoryChain.indexOf(id) : -1);
  return list.rules
    .filter((r) => r.appliesTo === "ALL"
      || (r.appliesTo === "PRODUCT" && r.productId === product.id)
      || (r.appliesTo === "CATEGORY" && depth(r.categoryId) >= 0))
    .filter((r) => r.minQuantity.lte(quantity))
    .filter((r) => (!r.dateStart || day(r.dateStart) <= today) && (!r.dateEnd || day(r.dateEnd) >= today))
    .sort((a, b) =>
      TARGET_RANK[a.appliesTo] - TARGET_RANK[b.appliesTo]
      || (a.appliesTo === "CATEGORY" ? depth(a.categoryId) - depth(b.categoryId) : 0)
      || b.minQuantity.cmp(a.minQuantity)
      || b.createdAt.getTime() - a.createdAt.getTime()
      || (a.id < b.id ? 1 : a.id > b.id ? -1 : 0));
}

/** Odoo float_round(value, precision_rounding=step), HALF-UP = half away from zero. */
export function roundTo(value: Decimal, step: Decimal): Decimal {
  return value.div(step).toDecimalPlaces(0, Decimal.ROUND_HALF_UP).mul(step);
}

export function computePrice(ctx: PricingContext, listId: string, quantity: Decimal, date: Date, depth = 0): PriceResult {
  if (depth > MAX_DEPTH) throw new PriceListDepthExceeded(listId);
  const list = ctx.lists.get(listId);
  if (!list) throw new PriceListNotFound(listId);
  const { product } = ctx;
  const toList = (amount: Decimal, from: string) => amount.mul(ctx.rate(from, list.currency));
  const listPrice = toList(product.unitPrice, product.currency);
  const done = (price: Decimal, ruleId: string | null, steps: PriceStep[]): PriceResult => ({ price, currency: list.currency, listPrice, ruleId, steps });

  const [rule] = applicableRules(list, product, ctx.categoryChain, quantity, date);
  if (!rule) return done(listPrice, null, [{ label: "fallback", value: listPrice }]);
  if (rule.computePrice === "FIXED") {
    const fixed = rule.fixedPrice ?? new Decimal(0);
    return done(fixed, rule.id, [{ label: "fixed", value: fixed }]);
  }

  let base: Decimal;
  if (rule.base === "COST") base = toList(product.unitCost ?? new Decimal(0), product.currency);
  else if (rule.base === "PRICE_LIST" && rule.basePriceListId) {
    const inner = computePrice(ctx, rule.basePriceListId, quantity, date, depth + 1);
    base = toList(inner.price, inner.currency);
  } else base = listPrice;
  const steps: PriceStep[] = [{ label: "base", value: base }];

  if (rule.computePrice === "PERCENTAGE") {
    const price = base.minus(base.mul(rule.percentPrice ?? 0).div(100));
    steps.push({ label: "percentage", value: price });
    return done(price, rule.id, steps);
  }

  let price = base.minus(base.mul(rule.priceDiscount).div(100));
  steps.push({ label: "discount", value: price });
  if (set(rule.priceRound)) { price = roundTo(price, rule.priceRound!); steps.push({ label: "round", value: price }); }
  if (set(rule.priceSurcharge)) { price = price.plus(rule.priceSurcharge); steps.push({ label: "surcharge", value: price }); }
  if (set(rule.priceMinMargin)) { price = Decimal.max(price, base.plus(rule.priceMinMargin!)); steps.push({ label: "minMargin", value: price }); }
  if (set(rule.priceMaxMargin)) { price = Decimal.min(price, base.plus(rule.priceMaxMargin!)); steps.push({ label: "maxMargin", value: price }); }
  return done(price, rule.id, steps);
}
```
Note: the "chains" test expects 90.00. Base list B is in EUR with a fixed 4 EUR; converted to CZK (×25) that's 100, minus 10 % = 90.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm exec jest __tests__/pricing && pnpm exec tsc --noEmit`
Expected: PASS; tsc reports no errors.

- [ ] **Step 5: Commit**

```bash
git add lib/pricing/types.ts lib/pricing/errors.ts lib/pricing/engine.ts __tests__/pricing/engine.test.ts __tests__/pricing/parity.test.ts
git commit -m "feat(pricing): Odoo-compatible pricing engine"
```

---

### Task 3: Loader — `getPrice` and `resolvePriceListId`

**Files:**
- Create: `lib/pricing/get-price.ts`
- Test: `__tests__/pricing/get-price.test.ts`

**Interfaces:**
- Consumes: `computePrice` (engine.ts), errors, types.
- Produces:
  ```ts
  export function rateLookup(rates: { fromCurrency: string; toCurrency: string; rate: unknown }[]): (from: string, to: string) => Decimal;
  export function getPrice(input: { priceListId: string | null; productId: string; quantity: Decimal | number | string; date?: Date }): Promise<PriceResult>;
  export function resolvePriceListId(accountId: string | null): Promise<string | null>;
  ```
  With `priceListId` null, the result is the product's unit price in the product's currency (`ruleId: null`).

- [ ] **Step 1: Write the failing test**

`__tests__/pricing/get-price.test.ts`:
```ts
const db = {
  crm_Products: { findFirst: jest.fn() },
  crm_ProductCategories: { findUnique: jest.fn() },
  crm_PriceLists: { findUnique: jest.fn() },
  exchangeRate: { findMany: jest.fn() },
  crm_Accounts: { findFirst: jest.fn() },
  crm_SystemSettings: { findUnique: jest.fn() },
};
jest.mock("@/lib/prisma", () => ({ prismadb: db }));

import { getPrice, rateLookup, resolvePriceListId } from "@/lib/pricing/get-price";
import { MissingRateError, ProductNotFound } from "@/lib/pricing/errors";

const rule = (over: Record<string, unknown>) => ({
  id: "r", appliesTo: "ALL", categoryId: null, productId: null, minQuantity: "0", dateStart: null, dateEnd: null,
  computePrice: "FIXED", fixedPrice: null, percentPrice: null, base: "LIST_PRICE", basePriceListId: null,
  priceDiscount: "0", priceSurcharge: "0", priceRound: null, priceMinMargin: null, priceMaxMargin: null,
  createdAt: new Date("2026-01-01T00:00:00Z"), ...over,
});

beforeEach(() => {
  jest.resetAllMocks();
  db.crm_Products.findFirst.mockResolvedValue({ id: "p1", unit_price: "100", unit_cost: "60", currency: "CZK", categoryId: "c-child" });
  db.crm_ProductCategories.findUnique.mockImplementation(async ({ where }: { where: { id: string } }) =>
    ({ "c-child": { parentId: "c-parent" }, "c-parent": { parentId: null } } as Record<string, { parentId: string | null }>)[where.id] ?? null);
  db.exchangeRate.findMany.mockResolvedValue([{ fromCurrency: "EUR", toCurrency: "CZK", rate: "25" }]);
});

it("loads the category chain and chained lists", async () => {
  db.crm_PriceLists.findUnique.mockImplementation(async ({ where }: { where: { id: string } }) => ({
    L: { id: "L", currency: "CZK", rules: [rule({ computePrice: "FORMULA", base: "PRICE_LIST", basePriceListId: "B", priceDiscount: "10" })] },
    B: { id: "B", currency: "CZK", rules: [rule({ appliesTo: "CATEGORY", categoryId: "c-parent", fixedPrice: "70" })] },
  } as Record<string, unknown>)[where.id] ?? null);
  const r = await getPrice({ priceListId: "L", productId: "p1", quantity: 1, date: new Date("2026-06-01T00:00:00Z") });
  expect(r.price.toFixed(2)).toBe("63.00");
});

it("uses the inverse rate when only the other direction is stored (Review Focus 1)", async () => {
  db.crm_PriceLists.findUnique.mockResolvedValue({ id: "L", currency: "EUR", rules: [] });
  const r = await getPrice({ priceListId: "L", productId: "p1", quantity: 1 });
  expect(r.price.toFixed(2)).toBe("4.00");
  expect(r.currency).toBe("EUR");
});

it("returns the product price without a list", async () => {
  const r = await getPrice({ priceListId: null, productId: "p1", quantity: 3 });
  expect([r.price.toFixed(2), r.currency, r.ruleId]).toEqual(["100.00", "CZK", null]);
});

it("refuses deleted or unknown products", async () => {
  db.crm_Products.findFirst.mockResolvedValue(null);
  await expect(getPrice({ priceListId: null, productId: "x", quantity: 1 })).rejects.toBeInstanceOf(ProductNotFound);
});

it("stops walking a looping category tree", async () => {
  db.crm_ProductCategories.findUnique.mockResolvedValue({ parentId: "c-child" });
  db.crm_PriceLists.findUnique.mockResolvedValue({ id: "L", currency: "CZK", rules: [] });
  await expect(getPrice({ priceListId: "L", productId: "p1", quantity: 1 })).resolves.toBeDefined();
});

it("looks up rates direct, inverse, or throws", () => {
  const rate = rateLookup([{ fromCurrency: "EUR", toCurrency: "CZK", rate: "25" }]);
  expect(rate("CZK", "CZK").toString()).toBe("1");
  expect(rate("EUR", "CZK").toString()).toBe("25");
  expect(rate("CZK", "EUR").toFixed(2)).toBe("0.04");
  expect(() => rate("USD", "CZK")).toThrow(MissingRateError);
});

it("resolves account list, then default list, then null", async () => {
  db.crm_Accounts.findFirst.mockResolvedValueOnce({ pricelist_id: "A" });
  await expect(resolvePriceListId("acc")).resolves.toBe("A");
  db.crm_Accounts.findFirst.mockResolvedValueOnce({ pricelist_id: null });
  db.crm_SystemSettings.findUnique.mockResolvedValueOnce({ value: "D" });
  await expect(resolvePriceListId("acc")).resolves.toBe("D");
  db.crm_SystemSettings.findUnique.mockResolvedValueOnce(null);
  await expect(resolvePriceListId(null)).resolves.toBeNull();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec jest __tests__/pricing/get-price.test.ts`
Expected: FAIL with "Cannot find module '@/lib/pricing/get-price'".

- [ ] **Step 3: Implement**

`lib/pricing/get-price.ts`:
```ts
import { Decimal } from "decimal.js";
import { prismadb } from "@/lib/prisma";
import { computePrice } from "./engine";
import { MissingRateError, ProductNotFound } from "./errors";
import type { ListData, PriceResult, ProductData, RuleData } from "./types";

const dec = (v: unknown) => new Decimal(String(v));
const decOrNull = (v: unknown) => (v == null ? null : dec(v));
const MAX_LISTS = 11;
const MAX_CATEGORY_DEPTH = 20;

function toRule(r: Record<string, unknown>): RuleData {
  return {
    id: r.id as string,
    appliesTo: r.appliesTo as RuleData["appliesTo"],
    categoryId: (r.categoryId as string | null) ?? null,
    productId: (r.productId as string | null) ?? null,
    minQuantity: dec(r.minQuantity ?? 0),
    dateStart: (r.dateStart as Date | null) ?? null,
    dateEnd: (r.dateEnd as Date | null) ?? null,
    computePrice: r.computePrice as RuleData["computePrice"],
    fixedPrice: decOrNull(r.fixedPrice),
    percentPrice: decOrNull(r.percentPrice),
    base: r.base as RuleData["base"],
    basePriceListId: (r.basePriceListId as string | null) ?? null,
    priceDiscount: dec(r.priceDiscount ?? 0),
    priceSurcharge: dec(r.priceSurcharge ?? 0),
    priceRound: decOrNull(r.priceRound),
    priceMinMargin: decOrNull(r.priceMinMargin),
    priceMaxMargin: decOrNull(r.priceMaxMargin),
    createdAt: r.createdAt as Date,
  };
}

export function rateLookup(rates: { fromCurrency: string; toCurrency: string; rate: unknown }[]) {
  return (from: string, to: string): Decimal => {
    if (from === to) return new Decimal(1);
    const direct = rates.find((r) => r.fromCurrency === from && r.toCurrency === to);
    if (direct) return dec(direct.rate);
    const inverse = rates.find((r) => r.fromCurrency === to && r.toCurrency === from);
    if (inverse) return new Decimal(1).div(dec(inverse.rate));
    throw new MissingRateError(from, to);
  };
}

async function loadLists(rootId: string): Promise<Map<string, ListData>> {
  const lists = new Map<string, ListData>();
  const queue = [rootId];
  while (queue.length && lists.size < MAX_LISTS) {
    const id = queue.shift()!;
    if (lists.has(id)) continue;
    const row = await prismadb.crm_PriceLists.findUnique({ where: { id }, include: { rules: true } });
    if (!row) continue;   // the engine throws PriceListNotFound if it needs this list
    lists.set(id, { id: row.id, currency: row.currency, rules: row.rules.map((r) => toRule(r as unknown as Record<string, unknown>)) });
    for (const r of row.rules) if (r.base === "PRICE_LIST" && r.basePriceListId) queue.push(r.basePriceListId);
  }
  return lists;
}

async function categoryChain(categoryId: string | null): Promise<string[]> {
  const chain: string[] = [];
  let id = categoryId;
  while (id && chain.length < MAX_CATEGORY_DEPTH && !chain.includes(id)) {
    chain.push(id);
    const row = await prismadb.crm_ProductCategories.findUnique({ where: { id }, select: { parentId: true } });
    id = row?.parentId ?? null;
  }
  return chain;
}

export async function getPrice(input: { priceListId: string | null; productId: string; quantity: Decimal | number | string; date?: Date }): Promise<PriceResult> {
  const row = await prismadb.crm_Products.findFirst({ where: { id: input.productId, deletedAt: null } });
  if (!row) throw new ProductNotFound(input.productId);
  const product: ProductData = { id: row.id, unitPrice: dec(row.unit_price), unitCost: decOrNull(row.unit_cost), currency: row.currency, categoryId: row.categoryId };
  if (!input.priceListId) {
    return { price: product.unitPrice, currency: product.currency, listPrice: product.unitPrice, ruleId: null, steps: [{ label: "fallback", value: product.unitPrice }] };
  }
  const [lists, chain, rates] = await Promise.all([loadLists(input.priceListId), categoryChain(product.categoryId), prismadb.exchangeRate.findMany()]);
  return computePrice({ lists, product, categoryChain: chain, rate: rateLookup(rates) }, input.priceListId, dec(input.quantity), input.date ?? new Date());
}

/** Account list → instance default list → null (product unit price). */
export async function resolvePriceListId(accountId: string | null): Promise<string | null> {
  if (accountId) {
    const account = await prismadb.crm_Accounts.findFirst({ where: { id: accountId, deletedAt: null }, select: { pricelist_id: true } });
    if (account?.pricelist_id) return account.pricelist_id;
  }
  const setting = await prismadb.crm_SystemSettings.findUnique({ where: { key: "default_pricelist_id" } });
  return setting?.value || null;
}
```
The first test expects 63.00: base list B matches the product through its parent category, giving 70; L takes 10 % off that.

- [ ] **Step 4: Run tests**

Run: `pnpm exec jest __tests__/pricing && pnpm exec tsc --noEmit`
Expected: PASS; tsc reports no errors.

- [ ] **Step 5: Commit**

```bash
git add lib/pricing/get-price.ts __tests__/pricing/get-price.test.ts
git commit -m "feat(pricing): price lookup with category chain, chained lists and rates"
```

---

### Task 4: Validation and cycle checks (pure)

**Files:**
- Create: `lib/pricing/validate.ts`
- Test: `__tests__/pricing/validate.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type RuleProblem = "categoryRequired" | "productRequired" | "fixedPriceRequired" | "percentRequired" | "percentRange" | "baseListRequired" | "baseListSelf" | "dateOrder" | "minQuantityNegative" | "roundPositive" | "marginOrder";
  export interface RuleFields { appliesTo: Target; categoryId?: string | null; productId?: string | null; minQuantity?: number | null; dateStart?: Date | null; dateEnd?: Date | null; computePrice: Compute; fixedPrice?: number | null; percentPrice?: number | null; base?: Base; basePriceListId?: string | null; priceDiscount?: number | null; priceSurcharge?: number | null; priceRound?: number | null; priceMinMargin?: number | null; priceMaxMargin?: number | null }
  export function ruleProblems(r: RuleFields, priceListId: string): RuleProblem[];
  export function cleanRule(r: RuleFields): Required<RuleFields>;   // fields irrelevant to appliesTo/computePrice/base set to null; defaults filled
  export function createsListCycle(listId: string, baseListId: string, edges: { priceListId: string; basePriceListId: string }[]): boolean;
  export function createsCategoryCycle(categoryId: string, parentId: string, parents: Map<string, string | null>): boolean;
  ```

- [ ] **Step 1: Write the failing test**

`__tests__/pricing/validate.test.ts`:
```ts
import { cleanRule, createsCategoryCycle, createsListCycle, ruleProblems, type RuleFields } from "@/lib/pricing/validate";

const ok: RuleFields = { appliesTo: "ALL", computePrice: "FIXED", fixedPrice: 10 };

it("accepts a complete rule", () => expect(ruleProblems(ok, "L")).toEqual([]));

it("requires the target and compute fields", () => {
  expect(ruleProblems({ ...ok, appliesTo: "CATEGORY" }, "L")).toContain("categoryRequired");
  expect(ruleProblems({ ...ok, appliesTo: "PRODUCT" }, "L")).toContain("productRequired");
  expect(ruleProblems({ appliesTo: "ALL", computePrice: "FIXED" }, "L")).toContain("fixedPriceRequired");
  expect(ruleProblems({ appliesTo: "ALL", computePrice: "PERCENTAGE" }, "L")).toContain("percentRequired");
  expect(ruleProblems({ appliesTo: "ALL", computePrice: "PERCENTAGE", percentPrice: 101 }, "L")).toContain("percentRange");
  expect(ruleProblems({ appliesTo: "ALL", computePrice: "FORMULA", base: "PRICE_LIST" }, "L")).toContain("baseListRequired");
  expect(ruleProblems({ appliesTo: "ALL", computePrice: "FORMULA", base: "PRICE_LIST", basePriceListId: "L" }, "L")).toContain("baseListSelf");
});

it("checks ranges", () => {
  expect(ruleProblems({ ...ok, dateStart: new Date("2026-02-01"), dateEnd: new Date("2026-01-01") }, "L")).toContain("dateOrder");
  expect(ruleProblems({ ...ok, minQuantity: -1 }, "L")).toContain("minQuantityNegative");
  expect(ruleProblems({ appliesTo: "ALL", computePrice: "FORMULA", priceRound: 0 }, "L")).toContain("roundPositive");
  expect(ruleProblems({ appliesTo: "ALL", computePrice: "FORMULA", priceMinMargin: 5, priceMaxMargin: 1 }, "L")).toContain("marginOrder");
});

it("clears fields that don't apply (Review Focus 3)", () => {
  const c = cleanRule({ appliesTo: "ALL", computePrice: "FORMULA", fixedPrice: 10, percentPrice: 5, categoryId: "c", productId: "p", base: "COST", basePriceListId: "B", priceDiscount: 5 });
  expect([c.fixedPrice, c.percentPrice, c.categoryId, c.productId, c.basePriceListId]).toEqual([null, null, null, null, null]);
  expect(c.priceDiscount).toBe(5);
  const f = cleanRule({ appliesTo: "PRODUCT", productId: "p", computePrice: "FIXED", fixedPrice: 3, priceDiscount: 9, priceRound: 1 });
  expect([f.priceDiscount, f.priceRound, f.base, f.minQuantity]).toEqual([0, null, "LIST_PRICE", 0]);
});

it("detects price list cycles", () => {
  const edges = [{ priceListId: "B", basePriceListId: "C" }, { priceListId: "C", basePriceListId: "A" }];
  expect(createsListCycle("A", "B", edges)).toBe(true);
  expect(createsListCycle("D", "B", edges)).toBe(false);
});

it("detects category cycles", () => {
  const parents = new Map<string, string | null>([["child", "parent"], ["parent", null], ["grand", "child"]]);
  expect(createsCategoryCycle("parent", "grand", parents)).toBe(true);
  expect(createsCategoryCycle("parent", "parent", parents)).toBe(true);
  expect(createsCategoryCycle("other", "child", parents)).toBe(false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec jest __tests__/pricing/validate.test.ts`
Expected: FAIL with "Cannot find module '@/lib/pricing/validate'".

- [ ] **Step 3: Implement**

`lib/pricing/validate.ts`:
```ts
import type { Base, Compute, Target } from "./types";

export type RuleProblem = "categoryRequired" | "productRequired" | "fixedPriceRequired" | "percentRequired" | "percentRange"
  | "baseListRequired" | "baseListSelf" | "dateOrder" | "minQuantityNegative" | "roundPositive" | "marginOrder";

export interface RuleFields {
  appliesTo: Target;
  categoryId?: string | null;
  productId?: string | null;
  minQuantity?: number | null;
  dateStart?: Date | null;
  dateEnd?: Date | null;
  computePrice: Compute;
  fixedPrice?: number | null;
  percentPrice?: number | null;
  base?: Base;
  basePriceListId?: string | null;
  priceDiscount?: number | null;
  priceSurcharge?: number | null;
  priceRound?: number | null;
  priceMinMargin?: number | null;
  priceMaxMargin?: number | null;
}

const has = (v: unknown) => v !== null && v !== undefined && v !== "";

export function ruleProblems(r: RuleFields, priceListId: string): RuleProblem[] {
  const p: RuleProblem[] = [];
  if (r.appliesTo === "CATEGORY" && !has(r.categoryId)) p.push("categoryRequired");
  if (r.appliesTo === "PRODUCT" && !has(r.productId)) p.push("productRequired");
  if (r.computePrice === "FIXED" && !has(r.fixedPrice)) p.push("fixedPriceRequired");
  if (r.computePrice === "PERCENTAGE") {
    if (!has(r.percentPrice)) p.push("percentRequired");
    else if (r.percentPrice! < 0 || r.percentPrice! > 100) p.push("percentRange");
  }
  if (r.computePrice !== "FIXED" && r.base === "PRICE_LIST") {
    if (!has(r.basePriceListId)) p.push("baseListRequired");
    else if (r.basePriceListId === priceListId) p.push("baseListSelf");
  }
  if (r.dateStart && r.dateEnd && r.dateEnd < r.dateStart) p.push("dateOrder");
  if (has(r.minQuantity) && r.minQuantity! < 0) p.push("minQuantityNegative");
  if (r.computePrice === "FORMULA" && has(r.priceRound) && r.priceRound! <= 0) p.push("roundPositive");
  if (r.computePrice === "FORMULA" && has(r.priceMinMargin) && has(r.priceMaxMargin) && r.priceMinMargin! > r.priceMaxMargin!) p.push("marginOrder");
  return p;
}

/** Keeps only the fields that matter for the rule's target, compute type and base (Review Focus 3). */
export function cleanRule(r: RuleFields): Required<RuleFields> {
  const formula = r.computePrice === "FORMULA";
  const usesBase = r.computePrice !== "FIXED";
  const base = usesBase ? r.base ?? "LIST_PRICE" : "LIST_PRICE";
  const num = (v: number | null | undefined) => (has(v) ? Number(v) : null);
  return {
    appliesTo: r.appliesTo,
    categoryId: r.appliesTo === "CATEGORY" ? r.categoryId ?? null : null,
    productId: r.appliesTo === "PRODUCT" ? r.productId ?? null : null,
    minQuantity: num(r.minQuantity) ?? 0,
    dateStart: r.dateStart ?? null,
    dateEnd: r.dateEnd ?? null,
    computePrice: r.computePrice,
    fixedPrice: r.computePrice === "FIXED" ? num(r.fixedPrice) : null,
    percentPrice: r.computePrice === "PERCENTAGE" ? num(r.percentPrice) : null,
    base,
    basePriceListId: usesBase && base === "PRICE_LIST" ? r.basePriceListId ?? null : null,
    priceDiscount: formula ? num(r.priceDiscount) ?? 0 : 0,
    priceSurcharge: formula ? num(r.priceSurcharge) ?? 0 : 0,
    priceRound: formula ? num(r.priceRound) : null,
    priceMinMargin: formula ? num(r.priceMinMargin) : null,
    priceMaxMargin: formula ? num(r.priceMaxMargin) : null,
  };
}

/** Would listId → baseListId close a loop through the existing base edges? */
export function createsListCycle(listId: string, baseListId: string, edges: { priceListId: string; basePriceListId: string }[]): boolean {
  const seen = new Set<string>();
  const stack = [baseListId];
  while (stack.length) {
    const id = stack.pop()!;
    if (id === listId) return true;
    if (seen.has(id)) continue;
    seen.add(id);
    for (const e of edges) if (e.priceListId === id) stack.push(e.basePriceListId);
  }
  return false;
}

/** Would giving categoryId the parent parentId make the category its own ancestor? */
export function createsCategoryCycle(categoryId: string, parentId: string, parents: Map<string, string | null>): boolean {
  let id: string | null = parentId;
  const seen = new Set<string>();
  while (id) {
    if (id === categoryId) return true;
    if (seen.has(id)) return true;
    seen.add(id);
    id = parents.get(id) ?? null;
  }
  return false;
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm exec jest __tests__/pricing && pnpm exec tsc --noEmit`
Expected: PASS; tsc reports no errors.

- [ ] **Step 5: Commit**

```bash
git add lib/pricing/validate.ts __tests__/pricing/validate.test.ts
git commit -m "feat(pricing): rule validation and cycle checks"
```

---

### Task 5: Authz and price list server actions

**Files:**
- Create: `lib/authz/scopes/pricing.ts`, `actions/crm/price-lists/price-lists.ts`, `actions/crm/price-lists/queries.ts`
- Modify: `lib/authz/index.ts` (export), `lib/audit-log.ts:4-14` (`AuditEntityType` + `"price_list" | "price_list_rule" | "product_category"`)
- Test: `actions/crm/price-lists/__tests__/price-lists.test.ts`

**Interfaces:**
- Consumes: `ruleProblems`, `cleanRule`, `createsListCycle`, `RuleFields` (Task 4); `getPrice` (Task 3); `PricingError` (Task 2).
- Produces:
  ```ts
  // lib/authz/scopes/pricing.ts
  export function assertCanWritePriceList(user: AuthzUser, list: { source: string } | null): void;   // throws AuthorizationError
  // actions/crm/price-lists/price-lists.ts ("use server"), all return { data } | { error }
  createPriceList(input: { name: string; currency: string }): Promise<Result<{ id: string }>>
  updatePriceList(id: string, input: { name: string; currency: string; isActive: boolean }): Promise<Result<{ id: string }>>
  archivePriceList(id: string): Promise<Result<{ id: string }>>
  deletePriceList(id: string): Promise<Result<{ id: string }>>        // error "inUse" when referenced
  upsertPriceListRule(priceListId: string, ruleId: string | null, input: RuleFields): Promise<Result<{ id: string }>>   // errors "invalid:<problem>,…", "cycle", "baseListNotFound"
  deletePriceListRule(ruleId: string): Promise<Result<{ id: string }>>
  checkPrice(input: { priceListId: string | null; productId: string; quantity: number; date?: string }): Promise<Result<CheckedPrice>>
  export type CheckedPrice = { price: string; listPrice: string; currency: string; ruleId: string | null; steps: { label: string; value: string }[] }
  // actions/crm/price-lists/queries.ts ("use server")
  getPriceLists(opts?: { includeArchived?: boolean }): Promise<PriceListRow[]>     // { id, name, currency, isActive, source, ruleCount, updatedAt }
  getPriceList(id: string): Promise<PriceListDetail | null>                      // list + rules (Decimals as numbers) + names
  getPriceListOptions(): Promise<{ id: string; name: string; currency: string }[]>   // active only
  ```
  Error strings: `"Unauthorized"`, `"Forbidden"`, `"Not found"`, `"Currency is not enabled"`, `"inUse"`, `"cycle"`, `"baseListNotFound"`, `"invalid:<comma-separated problems>"`, or a `PricingError` message.

- [ ] **Step 1: Write the failing test**

`actions/crm/price-lists/__tests__/price-lists.test.ts`:
```ts
jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: jest.fn() },
    currency: { findFirst: jest.fn() },
    crm_PriceLists: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
    crm_PriceListRules: { findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn(), count: jest.fn() },
    crm_Accounts: { count: jest.fn() },
  },
}));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/lib/audit-log", () => ({ writeAuditLog: jest.fn() }));
jest.mock("@/lib/pricing/get-price", () => ({ getPrice: jest.fn() }));

import { Decimal } from "decimal.js";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit-log";
import { getPrice } from "@/lib/pricing/get-price";
import { checkPrice, createPriceList, deletePriceList, updatePriceList, upsertPriceListRule } from "../price-lists";

const db = prismadb as unknown as Record<string, Record<string, jest.Mock>>;
const as = (role: "user" | "manager" | "admin") => {
  (getSession as jest.Mock).mockResolvedValue({ user: { id: "u1" } });
  db.users.findUnique.mockResolvedValue({ id: "u1", role, userStatus: "ACTIVE" });
};

beforeEach(() => {
  jest.clearAllMocks();
  db.currency.findFirst.mockResolvedValue({ code: "CZK" });
  db.crm_PriceLists.create.mockResolvedValue({ id: "L" });
  db.crm_PriceLists.findUnique.mockResolvedValue({ id: "L", source: "CRM" });
  db.crm_PriceListRules.create.mockResolvedValue({ id: "r1" });
  db.crm_PriceListRules.findMany.mockResolvedValue([]);
});

it("refuses reps and lets managers create (Review Focus 2)", async () => {
  as("user");
  await expect(createPriceList({ name: "A", currency: "CZK" })).resolves.toEqual({ error: "Forbidden" });
  expect(db.crm_PriceLists.create).not.toHaveBeenCalled();
  as("manager");
  await expect(createPriceList({ name: "A", currency: "CZK" })).resolves.toEqual({ data: { id: "L" } });
  expect(writeAuditLog).toHaveBeenCalledWith(expect.objectContaining({ entityType: "price_list", action: "created" }));
});

it("rejects a disabled currency", async () => {
  as("admin");
  db.currency.findFirst.mockResolvedValue(null);
  await expect(createPriceList({ name: "A", currency: "XYZ" })).resolves.toEqual({ error: "Currency is not enabled" });
});

it("locks external lists even for admins", async () => {
  as("admin");
  db.crm_PriceLists.findUnique.mockResolvedValue({ id: "L", source: "EXTERNAL" });
  await expect(updatePriceList("L", { name: "B", currency: "CZK", isActive: true })).resolves.toEqual({ error: "Forbidden" });
  await expect(upsertPriceListRule("L", null, { appliesTo: "ALL", computePrice: "FIXED", fixedPrice: 1 })).resolves.toEqual({ error: "Forbidden" });
});

it("validates rules, clears stale fields and rejects cycles (Review Focus 3)", async () => {
  as("manager");
  await expect(upsertPriceListRule("L", null, { appliesTo: "PRODUCT", computePrice: "FIXED", fixedPrice: 1 })).resolves.toEqual({ error: "invalid:productRequired" });
  await upsertPriceListRule("L", null, { appliesTo: "ALL", computePrice: "FORMULA", fixedPrice: 9, priceDiscount: 5 });
  expect(db.crm_PriceListRules.create).toHaveBeenCalledWith({ data: expect.objectContaining({ priceListId: "L", fixedPrice: null, priceDiscount: 5 }) });
  db.crm_PriceLists.findUnique.mockImplementation(async ({ where }: { where: { id: string } }) => ({ id: where.id, source: "CRM" }));
  db.crm_PriceListRules.findMany.mockResolvedValue([{ priceListId: "B", basePriceListId: "L" }]);
  await expect(upsertPriceListRule("L", null, { appliesTo: "ALL", computePrice: "FORMULA", base: "PRICE_LIST", basePriceListId: "B" })).resolves.toEqual({ error: "cycle" });
});

it("only deletes unreferenced lists", async () => {
  as("manager");
  db.crm_Accounts.count.mockResolvedValue(1);
  db.crm_PriceListRules.count.mockResolvedValue(0);
  await expect(deletePriceList("L")).resolves.toEqual({ error: "inUse" });
  db.crm_Accounts.count.mockResolvedValue(0);
  db.crm_PriceLists.delete.mockResolvedValue({ id: "L" });
  await expect(deletePriceList("L")).resolves.toEqual({ data: { id: "L" } });
});

it("checks a price for any signed-in role", async () => {
  as("user");
  (getPrice as jest.Mock).mockResolvedValue({ price: new Decimal("85.5"), listPrice: new Decimal(100), currency: "CZK", ruleId: "r1", steps: [{ label: "base", value: new Decimal(100) }] });
  await expect(checkPrice({ priceListId: "L", productId: "p1", quantity: 2 })).resolves.toEqual({
    data: { price: "85.50", listPrice: "100.00", currency: "CZK", ruleId: "r1", steps: [{ label: "base", value: "100.00" }] },
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec jest actions/crm/price-lists`
Expected: FAIL with "Cannot find module '../price-lists'".

- [ ] **Step 3: Implement**

`lib/authz/scopes/pricing.ts`:
```ts
import { AuthorizationError } from "../errors";
import type { AuthzUser } from "../session";

/** Managers and admins edit CRM price lists; nobody edits EXTERNAL lists by hand (spec § 4). */
export function assertCanWritePriceList(user: AuthzUser, list: { source: string } | null): void {
  if (user.role !== "manager" && user.role !== "admin") throw new AuthorizationError("Only managers can change price lists");
  if (list?.source === "EXTERNAL") throw new AuthorizationError("Price lists synced from an external system are read-only");
}
```
In `lib/authz/index.ts` add `export { assertCanWritePriceList } from "./scopes/pricing";`.
In `lib/audit-log.ts` extend `AuditEntityType` with `| "price_list" | "price_list_rule" | "product_category"`.

`actions/crm/price-lists/price-lists.ts`:
```ts
"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prismadb } from "@/lib/prisma";
import { requireAuthenticated, assertCanWritePriceList, AuthenticationError, AuthorizationError } from "@/lib/authz";
import { writeAuditLog } from "@/lib/audit-log";
import { cleanRule, createsListCycle, ruleProblems, type RuleFields } from "@/lib/pricing/validate";
import { getPrice } from "@/lib/pricing/get-price";
import { PricingError } from "@/lib/pricing/errors";

type Result<T> = { data: T } | { error: string };
export type CheckedPrice = { price: string; listPrice: string; currency: string; ruleId: string | null; steps: { label: string; value: string }[] };

const PATH = "/[locale]/(routes)/crm/price-lists";
const listSchema = z.object({ name: z.string().trim().min(1).max(200), currency: z.string().length(3) });

async function signedIn() {
  try { return await requireAuthenticated(); } catch (e) { if (e instanceof AuthenticationError) return null; throw e; }
}

/** Resolves the caller and the list, and enforces assertCanWritePriceList. */
async function writer(listId: string | null): Promise<{ userId: string } | { error: string }> {
  const user = await signedIn();
  if (!user) return { error: "Unauthorized" };
  const list = listId ? await prismadb.crm_PriceLists.findUnique({ where: { id: listId } }) : null;
  if (listId && !list) return { error: "Not found" };
  try { assertCanWritePriceList(user, list); } catch (e) { if (e instanceof AuthorizationError) return { error: "Forbidden" }; throw e; }
  return { userId: user.id };
}

async function enabledCurrency(code: string) {
  return !!(await prismadb.currency.findFirst({ where: { code, isEnabled: true } }));
}

export async function createPriceList(input: { name: string; currency: string }): Promise<Result<{ id: string }>> {
  const w = await writer(null);
  if ("error" in w) return w;
  const parsed = listSchema.safeParse(input);
  if (!parsed.success) return { error: "invalid:name" };
  if (!(await enabledCurrency(parsed.data.currency))) return { error: "Currency is not enabled" };
  const row = await prismadb.crm_PriceLists.create({ data: { ...parsed.data, createdBy: w.userId, updatedBy: w.userId } });
  await writeAuditLog({ entityType: "price_list", entityId: row.id, action: "created", changes: null, userId: w.userId });
  revalidatePath(PATH, "page");
  return { data: { id: row.id } };
}

export async function updatePriceList(id: string, input: { name: string; currency: string; isActive: boolean }): Promise<Result<{ id: string }>> {
  const w = await writer(id);
  if ("error" in w) return w;
  const parsed = listSchema.safeParse(input);
  if (!parsed.success) return { error: "invalid:name" };
  if (!(await enabledCurrency(parsed.data.currency))) return { error: "Currency is not enabled" };
  await prismadb.crm_PriceLists.update({ where: { id }, data: { ...parsed.data, isActive: !!input.isActive, updatedBy: w.userId } });
  await writeAuditLog({ entityType: "price_list", entityId: id, action: "updated", changes: null, userId: w.userId });
  revalidatePath(PATH, "page");
  return { data: { id } };
}

export async function archivePriceList(id: string): Promise<Result<{ id: string }>> {
  const w = await writer(id);
  if ("error" in w) return w;
  await prismadb.crm_PriceLists.update({ where: { id }, data: { isActive: false, updatedBy: w.userId } });
  await writeAuditLog({ entityType: "price_list", entityId: id, action: "updated", changes: { isActive: { from: true, to: false } } as never, userId: w.userId });
  revalidatePath(PATH, "page");
  return { data: { id } };
}

export async function deletePriceList(id: string): Promise<Result<{ id: string }>> {
  const w = await writer(id);
  if ("error" in w) return w;
  const [accounts, bases] = await Promise.all([
    prismadb.crm_Accounts.count({ where: { pricelist_id: id } }),
    prismadb.crm_PriceListRules.count({ where: { basePriceListId: id } }),
  ]);
  if (accounts > 0 || bases > 0) return { error: "inUse" };
  await prismadb.crm_PriceLists.delete({ where: { id } });
  await writeAuditLog({ entityType: "price_list", entityId: id, action: "deleted", changes: null, userId: w.userId });
  revalidatePath(PATH, "page");
  return { data: { id } };
}

export async function upsertPriceListRule(priceListId: string, ruleId: string | null, input: RuleFields): Promise<Result<{ id: string }>> {
  const w = await writer(priceListId);
  if ("error" in w) return w;
  const problems = ruleProblems(input, priceListId);
  if (problems.length) return { error: `invalid:${problems.join(",")}` };
  const data = cleanRule(input);
  if (data.basePriceListId) {
    const baseList = await prismadb.crm_PriceLists.findUnique({ where: { id: data.basePriceListId } });
    if (!baseList) return { error: "baseListNotFound" };
    const edges = (await prismadb.crm_PriceListRules.findMany({
      where: { basePriceListId: { not: null }, ...(ruleId ? { id: { not: ruleId } } : {}) },
      select: { priceListId: true, basePriceListId: true },
    })) as { priceListId: string; basePriceListId: string }[];
    if (createsListCycle(priceListId, data.basePriceListId, edges)) return { error: "cycle" };
  }
  const row = ruleId
    ? await prismadb.crm_PriceListRules.update({ where: { id: ruleId }, data })
    : await prismadb.crm_PriceListRules.create({ data: { ...data, priceListId } });
  await writeAuditLog({ entityType: "price_list_rule", entityId: row.id, action: ruleId ? "updated" : "created", changes: null, userId: w.userId });
  revalidatePath(PATH, "page");
  return { data: { id: row.id } };
}

export async function deletePriceListRule(ruleId: string): Promise<Result<{ id: string }>> {
  const rule = await prismadb.crm_PriceListRules.findUnique({ where: { id: ruleId } });
  if (!rule) return { error: "Not found" };
  const w = await writer(rule.priceListId);
  if ("error" in w) return w;
  await prismadb.crm_PriceListRules.delete({ where: { id: ruleId } });
  await writeAuditLog({ entityType: "price_list_rule", entityId: ruleId, action: "deleted", changes: null, userId: w.userId });
  revalidatePath(PATH, "page");
  return { data: { id: ruleId } };
}

export async function checkPrice(input: { priceListId: string | null; productId: string; quantity: number; date?: string }): Promise<Result<CheckedPrice>> {
  if (!(await signedIn())) return { error: "Unauthorized" };
  try {
    const r = await getPrice({ priceListId: input.priceListId, productId: input.productId, quantity: input.quantity, date: input.date ? new Date(input.date) : undefined });
    return { data: {
      price: r.price.toFixed(2), listPrice: r.listPrice.toFixed(2), currency: r.currency, ruleId: r.ruleId,
      steps: r.steps.map((s) => ({ label: s.label, value: s.value.toFixed(2) })),
    } };
  } catch (e) {
    if (e instanceof PricingError) return { error: e.message };
    throw e;
  }
}
```
`actions/crm/price-lists/queries.ts`:
```ts
"use server";
import { prismadb } from "@/lib/prisma";
import { requireAuthenticated } from "@/lib/authz";

const num = (v: unknown) => (v == null ? null : Number(v));

export type PriceListRow = { id: string; name: string; currency: string; isActive: boolean; source: "CRM" | "EXTERNAL"; ruleCount: number; updatedAt: Date };

export async function getPriceLists(opts: { includeArchived?: boolean } = {}): Promise<PriceListRow[]> {
  await requireAuthenticated();
  const rows = await prismadb.crm_PriceLists.findMany({
    where: opts.includeArchived ? {} : { isActive: true },
    orderBy: { name: "asc" },
    include: { _count: { select: { rules: true } } },
  });
  return rows.map((r) => ({ id: r.id, name: r.name, currency: r.currency, isActive: r.isActive, source: r.source, ruleCount: r._count.rules, updatedAt: r.updatedAt }));
}

export async function getPriceList(id: string) {
  await requireAuthenticated();
  const row = await prismadb.crm_PriceLists.findUnique({
    where: { id },
    include: { rules: { include: { product: { select: { name: true } }, category: { select: { name: true } }, basePriceList: { select: { name: true } } } } },
  });
  if (!row) return null;
  return {
    id: row.id, name: row.name, currency: row.currency, isActive: row.isActive, source: row.source,
    rules: row.rules.map((r) => ({
      id: r.id, appliesTo: r.appliesTo, categoryId: r.categoryId, productId: r.productId, minQuantity: num(r.minQuantity) ?? 0,
      dateStart: r.dateStart?.toISOString().slice(0, 10) ?? null, dateEnd: r.dateEnd?.toISOString().slice(0, 10) ?? null,
      computePrice: r.computePrice, fixedPrice: num(r.fixedPrice), percentPrice: num(r.percentPrice), base: r.base,
      basePriceListId: r.basePriceListId, priceDiscount: num(r.priceDiscount) ?? 0, priceSurcharge: num(r.priceSurcharge) ?? 0,
      priceRound: num(r.priceRound), priceMinMargin: num(r.priceMinMargin), priceMaxMargin: num(r.priceMaxMargin),
      createdAt: r.createdAt.toISOString(),
      productName: r.product?.name ?? null, categoryName: r.category?.name ?? null, basePriceListName: r.basePriceList?.name ?? null,
    })),
  };
}
export type PriceListDetail = NonNullable<Awaited<ReturnType<typeof getPriceList>>>;

export async function getPriceListOptions() {
  await requireAuthenticated();
  return prismadb.crm_PriceLists.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true, currency: true } });
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm exec jest actions/crm/price-lists __tests__/pricing && pnpm exec tsc --noEmit`
Expected: PASS; tsc reports no errors. If `requireAuthenticated` reads more user fields than the mock provides, extend the `users.findUnique` mock to match `lib/authz/session.ts`.

- [ ] **Step 5: Commit**

```bash
git add lib/authz/scopes/pricing.ts lib/authz/index.ts lib/audit-log.ts actions/crm/price-lists
git commit -m "feat(pricing): price list actions with write guard and audit"
```

---

### Task 6: Account price list, default list setting, category parents

**Files:**
- Modify: `actions/crm/accounts/create-account.ts` (input type + `pricelist_id: data.pricelist_id || undefined`), `actions/crm/accounts/update-account.ts` (input type + `""` → `null`)
- Create: `app/[locale]/(routes)/admin/pricing/_actions/pricing.ts`, `app/[locale]/(routes)/admin/crm-settings/_actions/product-categories.ts`
- Test: `actions/crm/accounts/__tests__/account-pricelist.test.ts`, `__tests__/pricing/settings-actions.test.ts`

**Interfaces:**
- Consumes: `createsCategoryCycle` (Task 4).
- Produces:
  ```ts
  // admin/pricing/_actions/pricing.ts ("use server")
  getDefaultPriceListId(): Promise<string | null>
  setDefaultPriceList(id: string | null): Promise<{ data: true } | { error: string }>      // admin only; list must exist and be active
  // admin/crm-settings/_actions/product-categories.ts ("use server")
  listProductCategories(): Promise<{ id: string; name: string; parentId: string | null; isActive: boolean; productCount: number }[]>
  saveProductCategory(input: { id?: string; name: string; parentId: string | null; isActive: boolean }): Promise<{ data: { id: string } } | { error: string }>   // admin only; "cycle" on loops
  ```
  Account actions accept `pricelist_id?: string | null`.

- [ ] **Step 1: Write the failing tests**

`actions/crm/accounts/__tests__/account-pricelist.test.ts`:
```ts
jest.mock("@/lib/authz", () => ({
  requireAuthenticated: jest.fn().mockResolvedValue({ id: "u1", role: "user" }),
  assertCanWriteAccount: jest.fn(),
  AuthenticationError: class AuthenticationError extends Error {},
  AuthorizationError: class AuthorizationError extends Error {},
}));
jest.mock("@/lib/prisma", () => ({
  prismadb: { crm_Accounts: { update: jest.fn().mockResolvedValue({ id: "acc-1" }), findUnique: jest.fn().mockResolvedValue({ id: "acc-1" }), create: jest.fn().mockResolvedValue({ id: "acc-1" }) } },
}));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/lib/audit-log", () => ({ writeAuditLog: jest.fn(), diffObjects: jest.fn(() => null) }));
jest.mock("@/inngest/client", () => ({ inngest: { send: jest.fn() } }));
jest.mock("@/lib/plugins/action-errors", () => ({ pluginRuleErrorMessage: jest.fn(async () => null) }));

import { prismadb } from "@/lib/prisma";
import { createAccount } from "@/actions/crm/accounts/create-account";
import { updateAccount } from "@/actions/crm/accounts/update-account";

const db = prismadb as unknown as { crm_Accounts: Record<string, jest.Mock> };

it("stores a chosen price list and clears it with an empty value (Review Focus 4)", async () => {
  await createAccount({ name: "A", pricelist_id: "L" } as never);
  expect(db.crm_Accounts.create).toHaveBeenCalledWith({ data: expect.objectContaining({ pricelist_id: "L" }) });
  await updateAccount({ id: "acc-1", name: "A", pricelist_id: "" } as never);
  expect(db.crm_Accounts.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ pricelist_id: null }) }));
});
```
`__tests__/pricing/settings-actions.test.ts`:
```ts
jest.mock("@/lib/authz", () => ({
  requireRole: jest.fn(),
  AuthenticationError: class AuthenticationError extends Error {},
  AuthorizationError: class AuthorizationError extends Error {},
}));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_PriceLists: { findUnique: jest.fn() },
    crm_SystemSettings: { upsert: jest.fn(), deleteMany: jest.fn(), findUnique: jest.fn() },
    crm_ProductCategories: { findMany: jest.fn(), create: jest.fn(), update: jest.fn() },
  },
}));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/lib/audit-log", () => ({ writeAuditLog: jest.fn() }));

import { AuthorizationError, requireRole } from "@/lib/authz";
import { prismadb } from "@/lib/prisma";
import { setDefaultPriceList } from "@/app/[locale]/(routes)/admin/pricing/_actions/pricing";
import { saveProductCategory } from "@/app/[locale]/(routes)/admin/crm-settings/_actions/product-categories";

const db = prismadb as unknown as Record<string, Record<string, jest.Mock>>;
beforeEach(() => { jest.clearAllMocks(); (requireRole as jest.Mock).mockResolvedValue({ id: "a1", role: "admin" }); });

it("sets the default list only for admins and only to an active list", async () => {
  (requireRole as jest.Mock).mockRejectedValueOnce(new AuthorizationError());
  await expect(setDefaultPriceList("L")).resolves.toEqual({ error: "Forbidden" });
  db.crm_PriceLists.findUnique.mockResolvedValueOnce({ id: "L", isActive: false });
  await expect(setDefaultPriceList("L")).resolves.toEqual({ error: "Not found" });
  db.crm_PriceLists.findUnique.mockResolvedValueOnce({ id: "L", isActive: true });
  await expect(setDefaultPriceList("L")).resolves.toEqual({ data: true });
  expect(db.crm_SystemSettings.upsert).toHaveBeenCalledWith({ where: { key: "default_pricelist_id" }, create: { key: "default_pricelist_id", value: "L" }, update: { value: "L" } });
  await expect(setDefaultPriceList(null)).resolves.toEqual({ data: true });
  expect(db.crm_SystemSettings.deleteMany).toHaveBeenCalledWith({ where: { key: "default_pricelist_id" } });
});

it("rejects a category moved under its own child (Review Focus 5)", async () => {
  db.crm_ProductCategories.findMany.mockResolvedValue([{ id: "parent", parentId: null }, { id: "child", parentId: "parent" }]);
  await expect(saveProductCategory({ id: "parent", name: "P", parentId: "child", isActive: true })).resolves.toEqual({ error: "cycle" });
  db.crm_ProductCategories.update.mockResolvedValue({ id: "child" });
  await expect(saveProductCategory({ id: "child", name: "C", parentId: null, isActive: true })).resolves.toEqual({ data: { id: "child" } });
  db.crm_ProductCategories.create.mockResolvedValue({ id: "new" });
  await expect(saveProductCategory({ name: "N", parentId: "parent", isActive: true })).resolves.toEqual({ data: { id: "new" } });
  expect(db.crm_ProductCategories.create).toHaveBeenCalledWith({ data: { name: "N", parentId: "parent", isActive: true, createdBy: "a1", updatedBy: "a1" } });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec jest actions/crm/accounts/__tests__/account-pricelist.test.ts __tests__/pricing/settings-actions.test.ts`
Expected: FAIL. The account `update` data lacks `pricelist_id: null`, and the settings modules are missing.

- [ ] **Step 3: Implement**

`actions/crm/accounts/create-account.ts`:
- add `pricelist_id?: string | null;` to the input type;
- in `data`, after `industry: data.industry || undefined,`, add `pricelist_id: data.pricelist_id || undefined,`.

`actions/crm/accounts/update-account.ts`:
- add `pricelist_id?: string | null;` to the input type;
- in the `update` `data`, after `...rest,`, add `...(rest.pricelist_id === "" ? { pricelist_id: null } : {}),`.

`app/[locale]/(routes)/admin/pricing/_actions/pricing.ts`:
```ts
"use server";
import { revalidatePath } from "next/cache";
import { prismadb } from "@/lib/prisma";
import { requireRole, AuthenticationError, AuthorizationError } from "@/lib/authz";

const KEY = "default_pricelist_id";

export async function getDefaultPriceListId(): Promise<string | null> {
  const row = await prismadb.crm_SystemSettings.findUnique({ where: { key: KEY } });
  return row?.value || null;
}

export async function setDefaultPriceList(id: string | null): Promise<{ data: true } | { error: string }> {
  try { await requireRole(["admin"]); } catch (e) {
    if (e instanceof AuthenticationError) return { error: "Unauthorized" };
    if (e instanceof AuthorizationError) return { error: "Forbidden" };
    throw e;
  }
  if (!id) {
    await prismadb.crm_SystemSettings.deleteMany({ where: { key: KEY } });
  } else {
    const list = await prismadb.crm_PriceLists.findUnique({ where: { id } });
    if (!list || !list.isActive) return { error: "Not found" };
    await prismadb.crm_SystemSettings.upsert({ where: { key: KEY }, create: { key: KEY, value: id }, update: { value: id } });
  }
  revalidatePath("/[locale]/(routes)/admin/pricing", "page");
  return { data: true };
}
```
`app/[locale]/(routes)/admin/crm-settings/_actions/product-categories.ts`:
```ts
"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prismadb } from "@/lib/prisma";
import { requireRole, AuthenticationError, AuthorizationError } from "@/lib/authz";
import { writeAuditLog } from "@/lib/audit-log";
import { createsCategoryCycle } from "@/lib/pricing/validate";

const schema = z.object({ name: z.string().trim().min(1).max(100), parentId: z.string().min(1).nullable(), isActive: z.boolean() });

async function admin() {
  try { return await requireRole(["admin"]); } catch (e) {
    if (e instanceof AuthenticationError || e instanceof AuthorizationError) return null;
    throw e;
  }
}

export async function listProductCategories() {
  if (!(await admin())) return [];
  const rows = await prismadb.crm_ProductCategories.findMany({ orderBy: [{ order: "asc" }, { name: "asc" }], include: { _count: { select: { products: true } } } });
  return rows.map((r) => ({ id: r.id, name: r.name, parentId: r.parentId, isActive: r.isActive, productCount: r._count.products }));
}

export async function saveProductCategory(input: { id?: string; name: string; parentId: string | null; isActive: boolean }): Promise<{ data: { id: string } } | { error: string }> {
  const user = await admin();
  if (!user) return { error: "Forbidden" };
  const { id, ...data } = input;
  if (!schema.safeParse(data).success) return { error: "invalid:name" };
  if (id && data.parentId) {
    const all = await prismadb.crm_ProductCategories.findMany({ select: { id: true, parentId: true } });
    if (createsCategoryCycle(id, data.parentId, new Map(all.map((c) => [c.id, c.parentId])))) return { error: "cycle" };
  }
  const row = id
    ? await prismadb.crm_ProductCategories.update({ where: { id }, data: { ...data, updatedBy: user.id } })
    : await prismadb.crm_ProductCategories.create({ data: { ...data, createdBy: user.id, updatedBy: user.id } });
  await writeAuditLog({ entityType: "product_category", entityId: row.id, action: id ? "updated" : "created", changes: null, userId: user.id });
  revalidatePath("/[locale]/(routes)/admin/crm-settings", "page");
  return { data: { id: row.id } };
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm exec jest actions/crm/accounts __tests__/pricing && pnpm exec tsc --noEmit`
Expected: PASS, including the existing account scope tests; tsc reports no errors.

- [ ] **Step 5: Commit**

```bash
git add actions/crm/accounts/create-account.ts actions/crm/accounts/update-account.ts actions/crm/accounts/__tests__/account-pricelist.test.ts "app/[locale]/(routes)/admin/pricing/_actions/pricing.ts" "app/[locale]/(routes)/admin/crm-settings/_actions/product-categories.ts" __tests__/pricing/settings-actions.test.ts
git commit -m "feat(pricing): account price list, default list setting, category parents"
```

---

### Task 7: MCP tools

**Files:**
- Create: `lib/mcp/tools/crm-price-lists.ts`
- Modify: `lib/mcp/tools/index.ts` (export and spread `crmPriceListTools`)
- Test: `lib/mcp/__tests__/crm-price-lists.test.ts`

**Interfaces:**
- Consumes: `assertCanWritePriceList`, `getPrice`, `resolvePriceListId`, `ruleProblems`, `cleanRule`, `createsListCycle`, `accountReadScopeWhere` (`lib/authz/scopes/crm.ts`).
- Produces: tools `crm_list_price_lists`, `crm_get_price_list`, `crm_get_price`, `crm_create_price_list`, `crm_update_price_list`, `crm_archive_price_list`, `crm_upsert_price_list_rule`, `crm_delete_price_list_rule`. Write tools throw `FORBIDDEN` for reps and for EXTERNAL lists.

- [ ] **Step 1: Write the failing test**

`lib/mcp/__tests__/crm-price-lists.test.ts`:
```ts
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_PriceLists: { findMany: jest.fn(), count: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    crm_PriceListRules: { findMany: jest.fn(), create: jest.fn(), update: jest.fn(), findUnique: jest.fn(), delete: jest.fn() },
    crm_Accounts: { findFirst: jest.fn() },
    currency: { findFirst: jest.fn() },
  },
}));
jest.mock("@/lib/audit-log", () => ({ writeAuditLog: jest.fn() }));
jest.mock("@/lib/pricing/get-price", () => ({ getPrice: jest.fn(), resolvePriceListId: jest.fn() }));

import { Decimal } from "decimal.js";
import { prismadb } from "@/lib/prisma";
import { getPrice, resolvePriceListId } from "@/lib/pricing/get-price";
import { readFileSync } from "node:fs";
import { crmPriceListTools } from "@/lib/mcp/tools/crm-price-lists";

const db = prismadb as unknown as Record<string, Record<string, jest.Mock>>;
const tool = (name: string) => crmPriceListTools.find((t) => t.name === name)!;
const rep = { id: "u1", role: "user" as const };
const manager = { id: "m1", role: "manager" as const };

beforeEach(() => jest.clearAllMocks());

it("is registered in allTools", () => {
  // Importing lib/mcp/tools would load every tool module; the registry wiring is checked in source.
  const index = readFileSync("lib/mcp/tools/index.ts", "utf8");
  expect(index).toContain('import { crmPriceListTools } from "./crm-price-lists";');
  expect(index).toContain("...crmPriceListTools,");
  expect(crmPriceListTools.map((t) => t.name)).toEqual([
    "crm_list_price_lists", "crm_get_price_list", "crm_get_price", "crm_create_price_list",
    "crm_update_price_list", "crm_archive_price_list", "crm_upsert_price_list_rule", "crm_delete_price_list_rule",
  ]);
});

it("lets reps read and price, but not write (Review Focus 2)", async () => {
  db.crm_PriceLists.findMany.mockResolvedValue([{ id: "L" }]);
  db.crm_PriceLists.count.mockResolvedValue(1);
  await expect(tool("crm_list_price_lists").handler({ limit: 20, offset: 0 } as never, "u1", rep)).resolves.toEqual({ data: [{ id: "L" }], total: 1, offset: 0 });
  db.crm_Accounts.findFirst.mockResolvedValue({ id: "acc" });
  (resolvePriceListId as jest.Mock).mockResolvedValue("L");
  (getPrice as jest.Mock).mockResolvedValue({ price: new Decimal(85), listPrice: new Decimal(100), currency: "CZK", ruleId: "r", steps: [] });
  await expect(tool("crm_get_price").handler({ productId: "p", quantity: 1, accountId: "acc" } as never, "u1", rep))
    .resolves.toEqual({ data: { price: "85.00", listPrice: "100.00", currency: "CZK", ruleId: "r", priceListId: "L", steps: [] } });
  await expect(tool("crm_create_price_list").handler({ name: "X", currency: "CZK" } as never, "u1", rep)).rejects.toThrow("FORBIDDEN");
});

it("refuses writes to external lists and validates rules", async () => {
  db.crm_PriceLists.findUnique.mockResolvedValue({ id: "L", source: "EXTERNAL" });
  await expect(tool("crm_upsert_price_list_rule").handler({ priceListId: "L", appliesTo: "ALL", computePrice: "FIXED", fixedPrice: 1 } as never, "m1", manager)).rejects.toThrow("FORBIDDEN");
  db.crm_PriceLists.findUnique.mockResolvedValue({ id: "L", source: "CRM" });
  await expect(tool("crm_upsert_price_list_rule").handler({ priceListId: "L", appliesTo: "PRODUCT", computePrice: "FIXED", fixedPrice: 1 } as never, "m1", manager)).rejects.toThrow("VALIDATION_ERROR: productRequired");
});

it("hides accounts the rep cannot read", async () => {
  db.crm_Accounts.findFirst.mockResolvedValue(null);
  await expect(tool("crm_get_price").handler({ productId: "p", quantity: 1, accountId: "other" } as never, "u1", rep)).rejects.toThrow("NOT_FOUND");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec jest lib/mcp/__tests__/crm-price-lists.test.ts`
Expected: FAIL with "Cannot find module '@/lib/mcp/tools/crm-price-lists'".

- [ ] **Step 3: Implement**

`lib/mcp/tools/crm-price-lists.ts`:
```ts
import { z } from "zod";
import { prismadb } from "@/lib/prisma";
import type { AuthzUser } from "@/lib/authz";
import { AuthorizationError, assertCanWritePriceList } from "@/lib/authz";
import { accountReadScopeWhere } from "@/lib/authz/scopes/crm";
import { writeAuditLog } from "@/lib/audit-log";
import { getPrice, resolvePriceListId } from "@/lib/pricing/get-price";
import { PricingError } from "@/lib/pricing/errors";
import { cleanRule, createsListCycle, ruleProblems, type RuleFields } from "@/lib/pricing/validate";
import { paginationSchema, paginationArgs, listResponse, itemResponse, notFound, forbidden, validationError } from "../helpers";

async function writableList(user: AuthzUser, id: string | null) {
  const list = id ? await prismadb.crm_PriceLists.findUnique({ where: { id } }) : null;
  if (id && !list) notFound("PriceList");
  try { assertCanWritePriceList(user, list); } catch (e) { if (e instanceof AuthorizationError) forbidden(); throw e; }
  return list;
}

async function assertCurrency(code: string) {
  if (!(await prismadb.currency.findFirst({ where: { code, isEnabled: true } }))) validationError("currency is not enabled");
}

const ruleSchema = z.object({
  priceListId: z.string(),
  ruleId: z.string().optional(),
  appliesTo: z.enum(["ALL", "CATEGORY", "PRODUCT"]),
  categoryId: z.string().nullable().optional(),
  productId: z.string().nullable().optional(),
  minQuantity: z.number().nullable().optional(),
  dateStart: z.string().nullable().optional(),
  dateEnd: z.string().nullable().optional(),
  computePrice: z.enum(["FIXED", "PERCENTAGE", "FORMULA"]),
  fixedPrice: z.number().nullable().optional(),
  percentPrice: z.number().nullable().optional(),
  base: z.enum(["LIST_PRICE", "COST", "PRICE_LIST"]).optional(),
  basePriceListId: z.string().nullable().optional(),
  priceDiscount: z.number().nullable().optional(),
  priceSurcharge: z.number().nullable().optional(),
  priceRound: z.number().nullable().optional(),
  priceMinMargin: z.number().nullable().optional(),
  priceMaxMargin: z.number().nullable().optional(),
});

export const crmPriceListTools = [
  {
    name: "crm_list_price_lists",
    description: "List price lists (active by default)",
    schema: z.object({ includeArchived: z.boolean().optional(), source: z.enum(["CRM", "EXTERNAL"]).optional(), ...paginationSchema }),
    async handler(args: { includeArchived?: boolean; source?: "CRM" | "EXTERNAL"; limit: number; offset: number }) {
      const where = { ...(args.includeArchived ? {} : { isActive: true }), ...(args.source ? { source: args.source } : {}) };
      const [data, total] = await Promise.all([
        prismadb.crm_PriceLists.findMany({ where, ...paginationArgs(args), orderBy: { name: "asc" } }),
        prismadb.crm_PriceLists.count({ where }),
      ]);
      return listResponse(data, total, args.offset);
    },
  },
  {
    name: "crm_get_price_list",
    description: "Get a price list with its rules",
    schema: z.object({ id: z.string() }),
    async handler(args: { id: string }) {
      const row = await prismadb.crm_PriceLists.findUnique({ where: { id: args.id }, include: { rules: true } });
      if (!row) notFound("PriceList");
      return itemResponse(row);
    },
  },
  {
    name: "crm_get_price",
    description: "Compute a product's price from a price list, or from the account's list (account list → default list → product price)",
    schema: z.object({ productId: z.string(), quantity: z.number().positive(), date: z.string().optional(), priceListId: z.string().optional(), accountId: z.string().optional() }),
    async handler(args: { productId: string; quantity: number; date?: string; priceListId?: string; accountId?: string }, _userId: string, user: AuthzUser) {
      let priceListId = args.priceListId ?? null;
      if (!priceListId && args.accountId) {
        const account = await prismadb.crm_Accounts.findFirst({ where: { id: args.accountId, ...accountReadScopeWhere(user) }, select: { id: true } });
        if (!account) notFound("Account");
        priceListId = await resolvePriceListId(args.accountId);
      }
      try {
        const r = await getPrice({ priceListId, productId: args.productId, quantity: args.quantity, date: args.date ? new Date(args.date) : undefined });
        return itemResponse({ price: r.price.toFixed(2), listPrice: r.listPrice.toFixed(2), currency: r.currency, ruleId: r.ruleId, priceListId,
          steps: r.steps.map((s) => ({ label: s.label, value: s.value.toFixed(2) })) });
      } catch (e) {
        if (e instanceof PricingError) validationError(e.message);
        throw e;
      }
    },
  },
  {
    name: "crm_create_price_list",
    description: "Create a price list (manager or admin)",
    schema: z.object({ name: z.string().min(1), currency: z.string().length(3) }),
    async handler(args: { name: string; currency: string }, userId: string, user: AuthzUser) {
      await writableList(user, null);
      await assertCurrency(args.currency);
      const row = await prismadb.crm_PriceLists.create({ data: { name: args.name, currency: args.currency, createdBy: userId, updatedBy: userId } });
      await writeAuditLog({ entityType: "price_list", entityId: row.id, action: "created", changes: null, userId });
      return itemResponse(row);
    },
  },
  {
    name: "crm_update_price_list",
    description: "Rename a price list, change its currency or (de)activate it (manager or admin; not external lists)",
    schema: z.object({ id: z.string(), name: z.string().min(1).optional(), currency: z.string().length(3).optional(), isActive: z.boolean().optional() }),
    async handler(args: { id: string; name?: string; currency?: string; isActive?: boolean }, userId: string, user: AuthzUser) {
      await writableList(user, args.id);
      if (args.currency) await assertCurrency(args.currency);
      const { id, ...data } = args;
      const row = await prismadb.crm_PriceLists.update({ where: { id }, data: { ...data, updatedBy: userId } });
      await writeAuditLog({ entityType: "price_list", entityId: id, action: "updated", changes: null, userId });
      return itemResponse(row);
    },
  },
  {
    name: "crm_archive_price_list",
    description: "Archive a price list (manager or admin; not external lists)",
    schema: z.object({ id: z.string() }),
    async handler(args: { id: string }, userId: string, user: AuthzUser) {
      await writableList(user, args.id);
      const row = await prismadb.crm_PriceLists.update({ where: { id: args.id }, data: { isActive: false, updatedBy: userId } });
      await writeAuditLog({ entityType: "price_list", entityId: args.id, action: "updated", changes: null, userId });
      return itemResponse(row);
    },
  },
  {
    name: "crm_upsert_price_list_rule",
    description: "Create or update a price list rule (Odoo-compatible fields; manager or admin; not external lists)",
    schema: ruleSchema,
    async handler(args: z.infer<typeof ruleSchema>, userId: string, user: AuthzUser) {
      await writableList(user, args.priceListId);
      const { priceListId, ruleId, dateStart, dateEnd, ...rest } = args;
      const fields: RuleFields = { ...rest, dateStart: dateStart ? new Date(dateStart) : null, dateEnd: dateEnd ? new Date(dateEnd) : null };
      const problems = ruleProblems(fields, priceListId);
      if (problems.length) validationError(problems.join(","));
      const data = cleanRule(fields);
      if (data.basePriceListId) {
        if (!(await prismadb.crm_PriceLists.findUnique({ where: { id: data.basePriceListId } }))) notFound("PriceList");
        const edges = (await prismadb.crm_PriceListRules.findMany({
          where: { basePriceListId: { not: null }, ...(ruleId ? { id: { not: ruleId } } : {}) },
          select: { priceListId: true, basePriceListId: true },
        })) as { priceListId: string; basePriceListId: string }[];
        if (createsListCycle(priceListId, data.basePriceListId, edges)) validationError("cycle");
      }
      const row = ruleId
        ? await prismadb.crm_PriceListRules.update({ where: { id: ruleId }, data })
        : await prismadb.crm_PriceListRules.create({ data: { ...data, priceListId } });
      await writeAuditLog({ entityType: "price_list_rule", entityId: row.id, action: ruleId ? "updated" : "created", changes: null, userId });
      return itemResponse(row);
    },
  },
  {
    name: "crm_delete_price_list_rule",
    description: "Delete a price list rule (manager or admin; not external lists)",
    schema: z.object({ id: z.string() }),
    async handler(args: { id: string }, userId: string, user: AuthzUser) {
      const rule = await prismadb.crm_PriceListRules.findUnique({ where: { id: args.id } });
      if (!rule) notFound("PriceListRule");
      await writableList(user, rule.priceListId);
      await prismadb.crm_PriceListRules.delete({ where: { id: args.id } });
      await writeAuditLog({ entityType: "price_list_rule", entityId: args.id, action: "deleted", changes: null, userId });
      return itemResponse({ id: args.id });
    },
  },
];
```
In `lib/mcp/tools/index.ts`:
- add `export { crmPriceListTools } from "./crm-price-lists";` next to the other exports;
- add `import { crmPriceListTools } from "./crm-price-lists";`;
- add `...crmPriceListTools,` after `...crmProductTools,` in `allTools`.

If `accountReadScopeWhere` has a different name in `lib/authz/scopes/crm.ts` (the report cites `:218`), use the exported account read-scope function there and note it in the ledger.

- [ ] **Step 4: Run tests**

Run: `pnpm exec jest lib/mcp && pnpm exec tsc --noEmit`
Expected: PASS; tsc reports no errors.

- [ ] **Step 5: Commit**

```bash
git add lib/mcp/tools/crm-price-lists.ts lib/mcp/tools/index.ts lib/mcp/__tests__/crm-price-lists.test.ts
git commit -m "feat(pricing): MCP tools for price lists and prices"
```

---

### Task 8: Price list screens and navigation

**Files:**
- Create: `app/[locale]/(routes)/crm/price-lists/page.tsx`, `app/[locale]/(routes)/crm/price-lists/[priceListId]/page.tsx`
- Create: `app/[locale]/(routes)/crm/price-lists/components/{PriceListsTable,NewPriceListButton,PriceListHeader,RulesTable,RuleSheet,PriceCheckPanel}.tsx`, `app/[locale]/(routes)/crm/price-lists/components/rule-summary.ts`
- Modify: `app/[locale]/(routes)/components/menu-items/Crm.tsx` (item after Products), `app/[locale]/(routes)/layout.tsx` (`crm.priceLists`), `locales/{en,cz,de,uk}.json`
- Test: `__tests__/pricing/rule-summary.test.ts`

**Interfaces:**
- Consumes: `getPriceLists`, `getPriceList`, `PriceListDetail`, `createPriceList`, `updatePriceList`, `archivePriceList`, `deletePriceList`, `upsertPriceListRule`, `deletePriceListRule`, `checkPrice` (Task 5).
- Produces: `ruleSummary(rule, t)`, a pure label builder used by the rules table. Pages `/crm/price-lists` and `/crm/price-lists/[priceListId]`.

- [ ] **Step 1: Write the failing test**

`__tests__/pricing/rule-summary.test.ts`:
```ts
import { ruleSummary } from "@/app/[locale]/(routes)/crm/price-lists/components/rule-summary";

const t = (key: string, p?: Record<string, unknown>) => `${key}${p ? JSON.stringify(p) : ""}`;
const r = { appliesTo: "ALL", productName: null, categoryName: null, computePrice: "FIXED", fixedPrice: 80, percentPrice: null, base: "LIST_PRICE", basePriceListName: null, priceDiscount: 0, priceSurcharge: 0, priceRound: null } as const;

it("describes target and price", () => {
  expect(ruleSummary(r, t)).toEqual({ target: "targetAll", price: 'priceFixed{"value":80}' });
  expect(ruleSummary({ ...r, appliesTo: "PRODUCT", productName: "Tea" }, t).target).toBe('targetProduct{"name":"Tea"}');
  expect(ruleSummary({ ...r, computePrice: "PERCENTAGE", percentPrice: 10 }, t).price).toBe('pricePercent{"value":10,"base":"baseLIST_PRICE"}');
  expect(ruleSummary({ ...r, computePrice: "FORMULA", base: "PRICE_LIST", basePriceListName: "Retail", priceDiscount: -5, priceRound: 1 }, t).price)
    .toBe('priceFormula{"base":"Retail","discount":-5,"round":1,"surcharge":0}');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec jest __tests__/pricing/rule-summary.test.ts`
Expected: FAIL with "Cannot find module".

- [ ] **Step 3: Implement**

`components/rule-summary.ts`:
```ts
type T = (key: string, params?: Record<string, string | number>) => string;
export interface RuleView {
  appliesTo: "ALL" | "CATEGORY" | "PRODUCT"; productName: string | null; categoryName: string | null;
  computePrice: "FIXED" | "PERCENTAGE" | "FORMULA"; fixedPrice: number | null; percentPrice: number | null;
  base: "LIST_PRICE" | "COST" | "PRICE_LIST"; basePriceListName: string | null; priceDiscount: number; priceSurcharge: number; priceRound: number | null;
}

export function ruleSummary(r: RuleView, t: T): { target: string; price: string } {
  const target = r.appliesTo === "PRODUCT" ? t("targetProduct", { name: r.productName ?? "?" })
    : r.appliesTo === "CATEGORY" ? t("targetCategory", { name: r.categoryName ?? "?" }) : t("targetAll");
  const base = r.base === "PRICE_LIST" ? r.basePriceListName ?? "?" : t(`base${r.base}`);
  const price = r.computePrice === "FIXED" ? t("priceFixed", { value: r.fixedPrice ?? 0 })
    : r.computePrice === "PERCENTAGE" ? t("pricePercent", { value: r.percentPrice ?? 0, base })
    : t("priceFormula", { base, discount: r.priceDiscount, round: r.priceRound ?? 0, surcharge: r.priceSurcharge });
  return { target, price };
}
```
`app/[locale]/(routes)/crm/price-lists/page.tsx`:
```tsx
import { getTranslations } from "next-intl/server";
import Container from "../../components/ui/Container";
import { getPriceLists } from "@/actions/crm/price-lists/queries";
import { requireAuthenticated } from "@/lib/authz";
import { getEnabledCurrencies } from "@/lib/currency";
import { PriceListsTable } from "./components/PriceListsTable";
import { NewPriceListButton } from "./components/NewPriceListButton";

export default async function PriceListsPage(props: { searchParams: Promise<{ archived?: string }> }) {
  const t = await getTranslations("PriceListsPage");
  const user = await requireAuthenticated();
  const { archived } = await props.searchParams;
  const [lists, currencies] = await Promise.all([getPriceLists({ includeArchived: archived === "1" }), getEnabledCurrencies()]);
  const canWrite = user.role === "manager" || user.role === "admin";
  return (
    <Container title={t("title")} description={t("description")}>
      <div className="mb-4 flex items-center justify-between gap-2">
        <a className="text-sm underline" href={archived === "1" ? "?" : "?archived=1"}>{archived === "1" ? t("hideArchived") : t("showArchived")}</a>
        {canWrite && <NewPriceListButton currencies={currencies.map((c) => c.code)} />}
      </div>
      <PriceListsTable rows={lists.map((l) => ({ ...l, updatedAt: l.updatedAt.toISOString() }))} />
    </Container>
  );
}
```
`components/PriceListsTable.tsx`:
```tsx
"use client";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Row = { id: string; name: string; currency: string; isActive: boolean; source: "CRM" | "EXTERNAL"; ruleCount: number; updatedAt: string };

export function PriceListsTable({ rows }: { rows: Row[] }) {
  const t = useTranslations("PriceListsPage");
  if (!rows.length) return <p className="text-sm text-muted-foreground">{t("empty")}</p>;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("name")}</TableHead><TableHead>{t("currency")}</TableHead><TableHead>{t("source")}</TableHead>
          <TableHead>{t("rules")}</TableHead><TableHead>{t("updated")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.id}>
            <TableCell><Link className="underline" href={`/crm/price-lists/${r.id}`}>{r.name}</Link> {!r.isActive && <Badge variant="secondary">{t("archived")}</Badge>}</TableCell>
            <TableCell>{r.currency}</TableCell>
            <TableCell>{r.source === "EXTERNAL" ? t("sourceExternal") : t("sourceCrm")}</TableCell>
            <TableCell>{r.ruleCount}</TableCell>
            <TableCell>{r.updatedAt.slice(0, 10)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```
`components/NewPriceListButton.tsx`:
```tsx
"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { createPriceList } from "@/actions/crm/price-lists/price-lists";

export function NewPriceListButton({ currencies }: { currencies: string[] }) {
  const t = useTranslations("PriceListsPage");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState(currencies[0] ?? "");
  const [pending, start] = useTransition();
  const save = () => start(async () => {
    const res = await createPriceList({ name, currency });
    if ("error" in res) { toast.error(t(`error.${res.error.split(":")[0]}` as never)); return; }
    setOpen(false);
    router.push(`/crm/price-lists/${res.data.id}`);
  });
  return (
    <>
      <Button onClick={() => setOpen(true)}>{t("new")}</Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent>
          <SheetHeader><SheetTitle>{t("new")}</SheetTitle></SheetHeader>
          <div className="space-y-4 p-4">
            <div className="space-y-1"><Label>{t("name")}</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div className="space-y-1"><Label>{t("currency")}</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{currencies.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Button disabled={pending || !name.trim()} onClick={save}>{t("save")}</Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
```
`[priceListId]/page.tsx`:
```tsx
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import Container from "../../../components/ui/Container";
import { getPriceList, getPriceLists } from "@/actions/crm/price-lists/queries";
import { requireAuthenticated } from "@/lib/authz";
import { prismadb } from "@/lib/prisma";
import { getEnabledCurrencies } from "@/lib/currency";
import { PriceListHeader } from "../components/PriceListHeader";
import { RulesTable } from "../components/RulesTable";
import { PriceCheckPanel } from "../components/PriceCheckPanel";

export default async function PriceListDetailPage(props: { params: Promise<{ priceListId: string }> }) {
  const { priceListId } = await props.params;
  const user = await requireAuthenticated();
  const list = await getPriceList(priceListId);
  if (!list) notFound();
  const t = await getTranslations("PriceListsPage");
  const [products, categories, lists, currencies] = await Promise.all([
    prismadb.crm_Products.findMany({ where: { deletedAt: null }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prismadb.crm_ProductCategories.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    getPriceLists({ includeArchived: true }),
    getEnabledCurrencies(),
  ]);
  const canWrite = (user.role === "manager" || user.role === "admin") && list.source === "CRM";
  return (
    <Container title={list.name} description={t("detailDescription")}>
      <div className="space-y-6">
        <PriceListHeader list={list} canWrite={canWrite} currencies={currencies.map((c) => c.code)} />
        <RulesTable list={list} canWrite={canWrite} products={products} categories={categories} lists={lists.filter((l) => l.id !== list.id).map((l) => ({ id: l.id, name: l.name }))} />
        <PriceCheckPanel priceListId={list.id} products={products} />
      </div>
    </Container>
  );
}
```
`components/PriceListHeader.tsx`:
```tsx
"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { deletePriceList, updatePriceList } from "@/actions/crm/price-lists/price-lists";
import type { PriceListDetail } from "@/actions/crm/price-lists/queries";

export function PriceListHeader({ list, canWrite, currencies }: { list: PriceListDetail; canWrite: boolean; currencies: string[] }) {
  const t = useTranslations("PriceListsPage");
  const router = useRouter();
  const [name, setName] = useState(list.name);
  const [currency, setCurrency] = useState(list.currency);
  const [isActive, setActive] = useState(list.isActive);
  const [pending, start] = useTransition();
  const fail = (e: string) => toast.error(t(`error.${e.split(":")[0]}` as never));
  const save = () => start(async () => {
    const res = await updatePriceList(list.id, { name, currency, isActive });
    if ("error" in res) return fail(res.error);
    toast.success(t("saved")); router.refresh();
  });
  const remove = () => start(async () => {
    const res = await deletePriceList(list.id);
    if ("error" in res) return fail(res.error);
    router.push("/crm/price-lists");
  });
  if (!canWrite) {
    return (
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span>{list.currency}</span>
        {!list.isActive && <Badge variant="secondary">{t("archived")}</Badge>}
        {list.source === "EXTERNAL" && <Badge>{t("syncedExternal")}</Badge>}
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-end gap-3">
      <Input className="max-w-xs" value={name} onChange={(e) => setName(e.target.value)} aria-label={t("name")} />
      <Select value={currency} onValueChange={setCurrency}>
        <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
        <SelectContent>{currencies.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
      </Select>
      <label className="flex items-center gap-2 text-sm"><Switch checked={isActive} onCheckedChange={setActive} />{t("active")}</label>
      <Button disabled={pending || !name.trim()} onClick={save}>{t("save")}</Button>
      <Button variant="outline" disabled={pending} onClick={remove}>{t("delete")}</Button>
    </div>
  );
}
```
`components/RulesTable.tsx`:
```tsx
"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { deletePriceListRule } from "@/actions/crm/price-lists/price-lists";
import type { PriceListDetail } from "@/actions/crm/price-lists/queries";
import { ruleSummary } from "./rule-summary";
import { RuleSheet } from "./RuleSheet";

type Option = { id: string; name: string };
const RANK = { PRODUCT: 0, CATEGORY: 1, ALL: 2 } as const;

export function RulesTable({ list, canWrite, products, categories, lists }: { list: PriceListDetail; canWrite: boolean; products: Option[]; categories: Option[]; lists: Option[] }) {
  const t = useTranslations("PriceListsPage");
  const router = useRouter();
  const [editing, setEditing] = useState<PriceListDetail["rules"][number] | "new" | null>(null);
  const [pending, start] = useTransition();
  const rules = [...list.rules].sort((a, b) => RANK[a.appliesTo] - RANK[b.appliesTo] || b.minQuantity - a.minQuantity || b.createdAt.localeCompare(a.createdAt));
  const remove = (id: string) => start(async () => {
    const res = await deletePriceListRule(id);
    if ("error" in res) { toast.error(t(`error.${res.error.split(":")[0]}` as never)); return; }
    router.refresh();
  });
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="font-medium">{t("rules")}</h2>
        {canWrite && <Button size="sm" onClick={() => setEditing("new")}>{t("addRule")}</Button>}
      </div>
      <p className="text-xs text-muted-foreground">{t("rulesOrderHint")}</p>
      <Table>
        <TableHeader>
          <TableRow><TableHead>{t("appliesTo")}</TableHead><TableHead>{t("minQuantity")}</TableHead><TableHead>{t("validity")}</TableHead><TableHead>{t("price")}</TableHead><TableHead /></TableRow>
        </TableHeader>
        <TableBody>
          {rules.map((r) => {
            const s = ruleSummary(r, (k, p) => t(k as never, p as never));
            return (
              <TableRow key={r.id}>
                <TableCell>{s.target}</TableCell>
                <TableCell>{r.minQuantity}</TableCell>
                <TableCell>{r.dateStart ?? "…"} – {r.dateEnd ?? "…"}</TableCell>
                <TableCell>{s.price}</TableCell>
                <TableCell className="text-right">
                  {canWrite && (<>
                    <Button size="sm" variant="ghost" onClick={() => setEditing(r)}>{t("edit")}</Button>
                    <Button size="sm" variant="ghost" disabled={pending} onClick={() => remove(r.id)}>{t("delete")}</Button>
                  </>)}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      {editing && (
        <RuleSheet priceListId={list.id} rule={editing === "new" ? null : editing} products={products} categories={categories} lists={lists}
          onClose={(saved) => { setEditing(null); if (saved) router.refresh(); }} />
      )}
    </section>
  );
}
```
`components/RuleSheet.tsx`:
```tsx
"use client";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { upsertPriceListRule } from "@/actions/crm/price-lists/price-lists";
import type { PriceListDetail } from "@/actions/crm/price-lists/queries";

type Option = { id: string; name: string };
type Rule = PriceListDetail["rules"][number];
const numOrNull = (v: string) => (v.trim() === "" ? null : Number(v));

export function RuleSheet({ priceListId, rule, products, categories, lists, onClose }: {
  priceListId: string; rule: Rule | null; products: Option[]; categories: Option[]; lists: Option[]; onClose: (saved: boolean) => void;
}) {
  const t = useTranslations("PriceListsPage");
  const [f, setF] = useState(() => ({
    appliesTo: rule?.appliesTo ?? "ALL", categoryId: rule?.categoryId ?? "", productId: rule?.productId ?? "",
    minQuantity: String(rule?.minQuantity ?? 0), dateStart: rule?.dateStart ?? "", dateEnd: rule?.dateEnd ?? "",
    computePrice: rule?.computePrice ?? "FIXED", fixedPrice: rule?.fixedPrice?.toString() ?? "", percentPrice: rule?.percentPrice?.toString() ?? "",
    base: rule?.base ?? "LIST_PRICE", basePriceListId: rule?.basePriceListId ?? "", priceDiscount: String(rule?.priceDiscount ?? 0),
    priceSurcharge: String(rule?.priceSurcharge ?? 0), priceRound: rule?.priceRound?.toString() ?? "",
    priceMinMargin: rule?.priceMinMargin?.toString() ?? "", priceMaxMargin: rule?.priceMaxMargin?.toString() ?? "",
  }));
  const [pending, start] = useTransition();
  const set = (k: keyof typeof f) => (v: string) => setF((p) => ({ ...p, [k]: v }));
  const field = (k: keyof typeof f, label: string, type = "number") => (
    <div className="space-y-1"><Label>{label}</Label><Input type={type} value={f[k]} onChange={(e) => set(k)(e.target.value)} /></div>
  );
  const select = (k: keyof typeof f, label: string, options: { value: string; label: string }[]) => (
    <div className="space-y-1"><Label>{label}</Label>
      <Select value={f[k]} onValueChange={set(k)}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>{options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  );
  const save = () => start(async () => {
    const res = await upsertPriceListRule(priceListId, rule?.id ?? null, {
      appliesTo: f.appliesTo as never, categoryId: f.categoryId || null, productId: f.productId || null,
      minQuantity: numOrNull(f.minQuantity), dateStart: f.dateStart ? new Date(`${f.dateStart}T00:00:00Z`) : null,
      dateEnd: f.dateEnd ? new Date(`${f.dateEnd}T00:00:00Z`) : null, computePrice: f.computePrice as never,
      fixedPrice: numOrNull(f.fixedPrice), percentPrice: numOrNull(f.percentPrice), base: f.base as never,
      basePriceListId: f.basePriceListId || null, priceDiscount: numOrNull(f.priceDiscount), priceSurcharge: numOrNull(f.priceSurcharge),
      priceRound: numOrNull(f.priceRound), priceMinMargin: numOrNull(f.priceMinMargin), priceMaxMargin: numOrNull(f.priceMaxMargin),
    });
    if ("error" in res) {
      const [kind, detail] = res.error.split(":");
      toast.error(kind === "invalid" ? detail.split(",").map((p) => t(`problem.${p}` as never)).join(" ") : t(`error.${kind}` as never));
      return;
    }
    onClose(true);
  });
  return (
    <Sheet open onOpenChange={(o) => { if (!o) onClose(false); }}>
      <SheetContent className="overflow-y-auto sm:max-w-[480px]">
        <SheetHeader><SheetTitle>{rule ? t("editRule") : t("addRule")}</SheetTitle></SheetHeader>
        <div className="space-y-3 p-4">
          {select("appliesTo", t("appliesTo"), [{ value: "ALL", label: t("targetAll") }, { value: "CATEGORY", label: t("category") }, { value: "PRODUCT", label: t("product") }])}
          {f.appliesTo === "CATEGORY" && select("categoryId", t("category"), categories.map((c) => ({ value: c.id, label: c.name })))}
          {f.appliesTo === "PRODUCT" && select("productId", t("product"), products.map((p) => ({ value: p.id, label: p.name })))}
          {field("minQuantity", t("minQuantity"))}
          <div className="grid grid-cols-2 gap-2">{field("dateStart", t("dateStart"), "date")}{field("dateEnd", t("dateEnd"), "date")}</div>
          {select("computePrice", t("computePrice"), [{ value: "FIXED", label: t("computeFIXED") }, { value: "PERCENTAGE", label: t("computePERCENTAGE") }, { value: "FORMULA", label: t("computeFORMULA") }])}
          {f.computePrice === "FIXED" && field("fixedPrice", t("fixedPrice"))}
          {f.computePrice !== "FIXED" && select("base", t("base"), [{ value: "LIST_PRICE", label: t("baseLIST_PRICE") }, { value: "COST", label: t("baseCOST") }, { value: "PRICE_LIST", label: t("basePRICE_LIST") }])}
          {f.computePrice !== "FIXED" && f.base === "PRICE_LIST" && select("basePriceListId", t("basePriceList"), lists.map((l) => ({ value: l.id, label: l.name })))}
          {f.computePrice === "PERCENTAGE" && field("percentPrice", t("percentPrice"))}
          {f.computePrice === "FORMULA" && (<>
            {field("priceDiscount", t("priceDiscount"))}
            {field("priceRound", t("priceRound"))}
            {field("priceSurcharge", t("priceSurcharge"))}
            <div className="grid grid-cols-2 gap-2">{field("priceMinMargin", t("priceMinMargin"))}{field("priceMaxMargin", t("priceMaxMargin"))}</div>
          </>)}
          <Button disabled={pending} onClick={save}>{t("save")}</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
```
`components/PriceCheckPanel.tsx`:
```tsx
"use client";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { checkPrice, type CheckedPrice } from "@/actions/crm/price-lists/price-lists";

export function PriceCheckPanel({ priceListId, products }: { priceListId: string; products: { id: string; name: string }[] }) {
  const t = useTranslations("PriceListsPage");
  const [productId, setProduct] = useState(products[0]?.id ?? "");
  const [quantity, setQuantity] = useState("1");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [result, setResult] = useState<CheckedPrice | string | null>(null);
  const [pending, start] = useTransition();
  const run = () => start(async () => {
    const res = await checkPrice({ priceListId, productId, quantity: Number(quantity), date: `${date}T12:00:00Z` });
    setResult("error" in res ? res.error : res.data);
  });
  return (
    <section className="space-y-3 rounded-md border p-4">
      <h2 className="font-medium">{t("priceCheck")}</h2>
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1"><Label>{t("product")}</Label>
          <Select value={productId} onValueChange={setProduct}>
            <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
            <SelectContent>{products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1"><Label>{t("quantity")}</Label><Input className="w-24" type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} /></div>
        <div className="space-y-1"><Label>{t("date")}</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
        <Button disabled={pending || !productId} onClick={run}>{t("calculate")}</Button>
      </div>
      {typeof result === "string" && <p className="text-sm text-destructive">{result}</p>}
      {result && typeof result === "object" && (
        <div className="text-sm">
          <p className="text-lg font-semibold">{result.price} {result.currency}</p>
          <p className="text-muted-foreground">{t("listPrice")}: {result.listPrice} {result.currency} · {result.ruleId ? t("ruleApplied") : t("noRule")}</p>
          <ol className="mt-2 list-decimal pl-5">{result.steps.map((s, i) => <li key={i}>{t(`step.${s.label}` as never)}: {s.value}</li>)}</ol>
        </div>
      )}
    </section>
  );
}
```
Navigation:
- `Crm.tsx`: add `priceLists: string;` to the localizations type, and after the Products item add `{ title: localizations.priceLists, url: "/crm/price-lists" },`.
- `layout.tsx`: add `priceLists: dict("crm.priceLists"),` to `translations.crm`.

Locales, in all four files:
- `ModuleMenu.crm.priceLists`: en "Price lists", cz "Ceníky", de "Preislisten", uk "Прайс-листи".
- Top-level namespace `PriceListsPage` with these en values (translate the same keys for cz/de/uk):
```json
"PriceListsPage": {
  "title": "Price lists", "description": "Prices per customer, with rules compatible with Odoo", "detailDescription": "Rules are checked top to bottom; the first match sets the price.",
  "new": "New price list", "save": "Save", "saved": "Saved", "edit": "Edit", "delete": "Delete", "active": "Active", "archived": "Archived",
  "showArchived": "Show archived", "hideArchived": "Hide archived", "empty": "No price lists yet.",
  "name": "Name", "currency": "Currency", "source": "Source", "sourceCrm": "CRM", "sourceExternal": "External", "syncedExternal": "Synced from an external system (read-only)",
  "rules": "Rules", "updated": "Updated", "addRule": "Add rule", "editRule": "Edit rule", "rulesOrderHint": "Order of evaluation: product, category (deepest first), all products; higher minimum quantity first; newest first.",
  "appliesTo": "Applies to", "targetAll": "All products", "targetCategory": "Category: {name}", "targetProduct": "Product: {name}", "category": "Category", "product": "Product",
  "minQuantity": "Min. quantity", "validity": "Valid", "dateStart": "Valid from", "dateEnd": "Valid to", "price": "Price",
  "computePrice": "Price type", "computeFIXED": "Fixed price", "computePERCENTAGE": "Discount from base", "computeFORMULA": "Formula",
  "fixedPrice": "Fixed price", "percentPrice": "Discount %", "base": "Based on", "baseLIST_PRICE": "list price", "baseCOST": "cost", "basePRICE_LIST": "another price list", "basePriceList": "Base price list",
  "priceDiscount": "Discount % (negative = markup)", "priceRound": "Round to", "priceSurcharge": "Extra fee", "priceMinMargin": "Min. margin", "priceMaxMargin": "Max. margin",
  "priceFixed": "{value}", "pricePercent": "{value} % off {base}", "priceFormula": "{base} −{discount} %, round {round}, +{surcharge}",
  "priceCheck": "Price check", "quantity": "Quantity", "date": "Date", "calculate": "Calculate", "listPrice": "List price", "ruleApplied": "rule applied", "noRule": "no rule, list price used",
  "step": { "fallback": "List price", "fixed": "Fixed price", "base": "Base", "percentage": "After discount", "discount": "After discount", "round": "After rounding", "surcharge": "After extra fee", "minMargin": "After min. margin", "maxMargin": "After max. margin" },
  "problem": { "categoryRequired": "Choose a category.", "productRequired": "Choose a product.", "fixedPriceRequired": "Enter the fixed price.", "percentRequired": "Enter the discount.", "percentRange": "The discount must be 0–100 %.", "baseListRequired": "Choose the base price list.", "baseListSelf": "A list can't be based on itself.", "dateOrder": "'Valid to' is before 'Valid from'.", "minQuantityNegative": "Min. quantity can't be negative.", "roundPositive": "Rounding must be above 0.", "marginOrder": "Min. margin is above max. margin." },
  "error": { "Unauthorized": "Please sign in again.", "Forbidden": "You can't change this price list.", "Not found": "Price list not found.", "Currency is not enabled": "This currency isn't enabled.", "inUse": "This list is used by accounts or other lists. Archive it instead.", "cycle": "That base list would make the lists depend on each other in a loop.", "baseListNotFound": "Base price list not found.", "invalid": "Check the highlighted fields." }
}
```
cz:
```json
"PriceListsPage": {
  "title": "Ceníky", "description": "Ceny pro zákazníky, pravidla kompatibilní s Odoo", "detailDescription": "Pravidla se procházejí shora dolů; cenu určí první, které platí.",
  "new": "Nový ceník", "save": "Uložit", "saved": "Uloženo", "edit": "Upravit", "delete": "Smazat", "active": "Aktivní", "archived": "Archivovaný",
  "showArchived": "Zobrazit archivované", "hideArchived": "Skrýt archivované", "empty": "Zatím žádné ceníky.",
  "name": "Název", "currency": "Měna", "source": "Zdroj", "sourceCrm": "CRM", "sourceExternal": "Externí", "syncedExternal": "Synchronizováno z externího systému (jen pro čtení)",
  "rules": "Pravidla", "updated": "Změněno", "addRule": "Přidat pravidlo", "editRule": "Upravit pravidlo", "rulesOrderHint": "Pořadí vyhodnocení: produkt, kategorie (nejhlubší první), všechny produkty; vyšší minimální množství první; nejnovější první.",
  "appliesTo": "Platí pro", "targetAll": "Všechny produkty", "targetCategory": "Kategorie: {name}", "targetProduct": "Produkt: {name}", "category": "Kategorie", "product": "Produkt",
  "minQuantity": "Min. množství", "validity": "Platnost", "dateStart": "Platí od", "dateEnd": "Platí do", "price": "Cena",
  "computePrice": "Typ ceny", "computeFIXED": "Pevná cena", "computePERCENTAGE": "Sleva ze základu", "computeFORMULA": "Vzorec",
  "fixedPrice": "Pevná cena", "percentPrice": "Sleva %", "base": "Základ", "baseLIST_PRICE": "ceníková cena produktu", "baseCOST": "náklad", "basePRICE_LIST": "jiný ceník", "basePriceList": "Základní ceník",
  "priceDiscount": "Sleva % (záporná = přirážka)", "priceRound": "Zaokrouhlit na", "priceSurcharge": "Příplatek", "priceMinMargin": "Min. marže", "priceMaxMargin": "Max. marže",
  "priceFixed": "{value}", "pricePercent": "{value} % z {base}", "priceFormula": "{base} −{discount} %, zaokr. {round}, +{surcharge}",
  "priceCheck": "Kontrola ceny", "quantity": "Množství", "date": "Datum", "calculate": "Spočítat", "listPrice": "Ceníková cena", "ruleApplied": "použito pravidlo", "noRule": "žádné pravidlo, použita ceníková cena",
  "step": { "fallback": "Ceníková cena", "fixed": "Pevná cena", "base": "Základ", "percentage": "Po slevě", "discount": "Po slevě", "round": "Po zaokrouhlení", "surcharge": "Po příplatku", "minMargin": "Po min. marži", "maxMargin": "Po max. marži" },
  "problem": { "categoryRequired": "Vyberte kategorii.", "productRequired": "Vyberte produkt.", "fixedPriceRequired": "Zadejte pevnou cenu.", "percentRequired": "Zadejte slevu.", "percentRange": "Sleva musí být 0–100 %.", "baseListRequired": "Vyberte základní ceník.", "baseListSelf": "Ceník nemůže vycházet sám ze sebe.", "dateOrder": "„Platí do“ je před „Platí od“.", "minQuantityNegative": "Min. množství nesmí být záporné.", "roundPositive": "Zaokrouhlení musí být větší než 0.", "marginOrder": "Min. marže je vyšší než max. marže." },
  "error": { "Unauthorized": "Přihlaste se znovu.", "Forbidden": "Tento ceník nemůžete měnit.", "Not found": "Ceník nenalezen.", "Currency is not enabled": "Tato měna není povolená.", "inUse": "Ceník používají firmy nebo jiné ceníky. Archivujte ho.", "cycle": "Takový základní ceník by vytvořil smyčku.", "baseListNotFound": "Základní ceník nenalezen.", "invalid": "Zkontrolujte vyznačená pole." }
}
```
de:
```json
"PriceListsPage": {
  "title": "Preislisten", "description": "Kundenpreise mit Odoo-kompatiblen Regeln", "detailDescription": "Regeln werden von oben nach unten geprüft; die erste passende bestimmt den Preis.",
  "new": "Neue Preisliste", "save": "Speichern", "saved": "Gespeichert", "edit": "Bearbeiten", "delete": "Löschen", "active": "Aktiv", "archived": "Archiviert",
  "showArchived": "Archivierte anzeigen", "hideArchived": "Archivierte ausblenden", "empty": "Noch keine Preislisten.",
  "name": "Name", "currency": "Währung", "source": "Quelle", "sourceCrm": "CRM", "sourceExternal": "Extern", "syncedExternal": "Aus einem externen System synchronisiert (schreibgeschützt)",
  "rules": "Regeln", "updated": "Geändert", "addRule": "Regel hinzufügen", "editRule": "Regel bearbeiten", "rulesOrderHint": "Reihenfolge: Produkt, Kategorie (tiefste zuerst), alle Produkte; höhere Mindestmenge zuerst; neueste zuerst.",
  "appliesTo": "Gilt für", "targetAll": "Alle Produkte", "targetCategory": "Kategorie: {name}", "targetProduct": "Produkt: {name}", "category": "Kategorie", "product": "Produkt",
  "minQuantity": "Mindestmenge", "validity": "Gültig", "dateStart": "Gültig ab", "dateEnd": "Gültig bis", "price": "Preis",
  "computePrice": "Preisart", "computeFIXED": "Festpreis", "computePERCENTAGE": "Rabatt auf Basis", "computeFORMULA": "Formel",
  "fixedPrice": "Festpreis", "percentPrice": "Rabatt %", "base": "Basis", "baseLIST_PRICE": "Listenpreis", "baseCOST": "Kosten", "basePRICE_LIST": "andere Preisliste", "basePriceList": "Basis-Preisliste",
  "priceDiscount": "Rabatt % (negativ = Aufschlag)", "priceRound": "Runden auf", "priceSurcharge": "Zuschlag", "priceMinMargin": "Min. Marge", "priceMaxMargin": "Max. Marge",
  "priceFixed": "{value}", "pricePercent": "{value} % auf {base}", "priceFormula": "{base} −{discount} %, rund. {round}, +{surcharge}",
  "priceCheck": "Preisprüfung", "quantity": "Menge", "date": "Datum", "calculate": "Berechnen", "listPrice": "Listenpreis", "ruleApplied": "Regel angewendet", "noRule": "keine Regel, Listenpreis verwendet",
  "step": { "fallback": "Listenpreis", "fixed": "Festpreis", "base": "Basis", "percentage": "Nach Rabatt", "discount": "Nach Rabatt", "round": "Nach Rundung", "surcharge": "Nach Zuschlag", "minMargin": "Nach Min.-Marge", "maxMargin": "Nach Max.-Marge" },
  "problem": { "categoryRequired": "Kategorie wählen.", "productRequired": "Produkt wählen.", "fixedPriceRequired": "Festpreis eingeben.", "percentRequired": "Rabatt eingeben.", "percentRange": "Rabatt muss 0–100 % sein.", "baseListRequired": "Basis-Preisliste wählen.", "baseListSelf": "Eine Liste kann nicht auf sich selbst basieren.", "dateOrder": "„Gültig bis“ liegt vor „Gültig ab“.", "minQuantityNegative": "Mindestmenge darf nicht negativ sein.", "roundPositive": "Rundung muss größer als 0 sein.", "marginOrder": "Min.-Marge liegt über Max.-Marge." },
  "error": { "Unauthorized": "Bitte erneut anmelden.", "Forbidden": "Sie können diese Preisliste nicht ändern.", "Not found": "Preisliste nicht gefunden.", "Currency is not enabled": "Diese Währung ist nicht aktiviert.", "inUse": "Die Liste wird von Konten oder anderen Listen verwendet. Bitte archivieren.", "cycle": "Diese Basisliste würde eine Schleife erzeugen.", "baseListNotFound": "Basis-Preisliste nicht gefunden.", "invalid": "Bitte markierte Felder prüfen." }
}
```
uk:
```json
"PriceListsPage": {
  "title": "Прайс-листи", "description": "Ціни для клієнтів із правилами, сумісними з Odoo", "detailDescription": "Правила перевіряються згори донизу; ціну визначає перше, що підходить.",
  "new": "Новий прайс-лист", "save": "Зберегти", "saved": "Збережено", "edit": "Редагувати", "delete": "Видалити", "active": "Активний", "archived": "Архівний",
  "showArchived": "Показати архівні", "hideArchived": "Сховати архівні", "empty": "Прайс-листів ще немає.",
  "name": "Назва", "currency": "Валюта", "source": "Джерело", "sourceCrm": "CRM", "sourceExternal": "Зовнішнє", "syncedExternal": "Синхронізовано із зовнішньої системи (лише читання)",
  "rules": "Правила", "updated": "Змінено", "addRule": "Додати правило", "editRule": "Редагувати правило", "rulesOrderHint": "Порядок: товар, категорія (найглибша першою), усі товари; більша мінімальна кількість першою; найновіше першим.",
  "appliesTo": "Застосовується до", "targetAll": "Усі товари", "targetCategory": "Категорія: {name}", "targetProduct": "Товар: {name}", "category": "Категорія", "product": "Товар",
  "minQuantity": "Мін. кількість", "validity": "Діє", "dateStart": "Діє з", "dateEnd": "Діє до", "price": "Ціна",
  "computePrice": "Тип ціни", "computeFIXED": "Фіксована ціна", "computePERCENTAGE": "Знижка від бази", "computeFORMULA": "Формула",
  "fixedPrice": "Фіксована ціна", "percentPrice": "Знижка %", "base": "База", "baseLIST_PRICE": "прайсова ціна", "baseCOST": "собівартість", "basePRICE_LIST": "інший прайс-лист", "basePriceList": "Базовий прайс-лист",
  "priceDiscount": "Знижка % (від'ємна = націнка)", "priceRound": "Округлити до", "priceSurcharge": "Доплата", "priceMinMargin": "Мін. маржа", "priceMaxMargin": "Макс. маржа",
  "priceFixed": "{value}", "pricePercent": "{value} % від {base}", "priceFormula": "{base} −{discount} %, окр. {round}, +{surcharge}",
  "priceCheck": "Перевірка ціни", "quantity": "Кількість", "date": "Дата", "calculate": "Розрахувати", "listPrice": "Прайсова ціна", "ruleApplied": "застосовано правило", "noRule": "правила немає, використано прайсову ціну",
  "step": { "fallback": "Прайсова ціна", "fixed": "Фіксована ціна", "base": "База", "percentage": "Після знижки", "discount": "Після знижки", "round": "Після округлення", "surcharge": "Після доплати", "minMargin": "Після мін. маржі", "maxMargin": "Після макс. маржі" },
  "problem": { "categoryRequired": "Виберіть категорію.", "productRequired": "Виберіть товар.", "fixedPriceRequired": "Введіть фіксовану ціну.", "percentRequired": "Введіть знижку.", "percentRange": "Знижка має бути 0–100 %.", "baseListRequired": "Виберіть базовий прайс-лист.", "baseListSelf": "Прайс-лист не може базуватися на собі.", "dateOrder": "«Діє до» раніше за «Діє з».", "minQuantityNegative": "Мін. кількість не може бути від'ємною.", "roundPositive": "Округлення має бути більше 0.", "marginOrder": "Мін. маржа більша за макс. маржу." },
  "error": { "Unauthorized": "Увійдіть знову.", "Forbidden": "Ви не можете змінювати цей прайс-лист.", "Not found": "Прайс-лист не знайдено.", "Currency is not enabled": "Ця валюта не ввімкнена.", "inUse": "Прайс-лист використовують компанії або інші списки. Заархівуйте його.", "cycle": "Такий базовий список створив би петлю.", "baseListNotFound": "Базовий прайс-лист не знайдено.", "invalid": "Перевірте позначені поля." }
}
```

- [ ] **Step 4: Run tests, type check, lint**

Run: `pnpm exec jest __tests__/pricing && pnpm exec tsc --noEmit && pnpm exec eslint "app/[locale]/(routes)/crm/price-lists" "app/[locale]/(routes)/components/menu-items/Crm.tsx"`
Expected: PASS; tsc and eslint report no errors. If a locale-parity test exists (`git grep -l "locales/cz.json" -- '*.test.ts'`), run it too.

- [ ] **Step 5: Commit**

```bash
git add "app/[locale]/(routes)/crm/price-lists" "app/[locale]/(routes)/components/menu-items/Crm.tsx" "app/[locale]/(routes)/layout.tsx" locales/en.json locales/cz.json locales/de.json locales/uk.json __tests__/pricing/rule-summary.test.ts
git commit -m "feat(pricing): price list screens, rule editor and price check"
```

---

### Task 9: Account field, admin Pricing page, product categories tab

**Files:**
- Modify: `app/[locale]/(routes)/crm/accounts/components/NewAccountForm.tsx` and `UpdateAccountForm.tsx` (price list select), `app/[locale]/(routes)/crm/accounts/[accountId]/components/BasicView.tsx` (show list name)
- Create: `app/[locale]/(routes)/admin/pricing/page.tsx`, `app/[locale]/(routes)/admin/pricing/_components/DefaultPriceListForm.tsx`
- Modify: `app/[locale]/(routes)/admin/_components/AdminSidebarNav.tsx` (item "Pricing" → `/admin/pricing`, icon `Tags`)
- Create: `app/[locale]/(routes)/admin/crm-settings/_components/ProductCategoriesTab.tsx`; modify `CrmSettingsTabs.tsx` (new tab)
- Modify: `locales/{en,cz,de,uk}.json` (`CrmAccountForm.priceList`, `CrmAccountForm.noPriceList`, `AdminPage.pricingTitle`, `AdminPage.defaultPriceList`, `AdminPage.noDefault`, `AdminPage.productCategories`, `AdminPage.parentCategory`, `AdminPage.noParent`, `AdminPage.categoryCycle`)
- Test: `__tests__/pricing/category-tree.test.ts`

**Interfaces:**
- Consumes: `getPriceListOptions` (Task 5), `getDefaultPriceListId`, `setDefaultPriceList`, `listProductCategories`, `saveProductCategory` (Task 6).
- Produces: `categoryOptionsFor(id, categories)`, a pure helper returning the categories that may become `id`'s parent (excludes the category itself and its descendants).

- [ ] **Step 1: Write the failing test**

`__tests__/pricing/category-tree.test.ts`:
```ts
import { categoryOptionsFor } from "@/app/[locale]/(routes)/admin/crm-settings/_components/category-tree";

const cats = [
  { id: "a", name: "A", parentId: null }, { id: "b", name: "B", parentId: "a" },
  { id: "c", name: "C", parentId: "b" }, { id: "d", name: "D", parentId: null },
];

it("offers every category except itself and its descendants", () => {
  expect(categoryOptionsFor("b", cats).map((c) => c.id)).toEqual(["a", "d"]);
  expect(categoryOptionsFor(null, cats).map((c) => c.id)).toEqual(["a", "b", "c", "d"]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec jest __tests__/pricing/category-tree.test.ts`
Expected: FAIL with "Cannot find module".

- [ ] **Step 3: Implement**

`app/[locale]/(routes)/admin/crm-settings/_components/category-tree.ts`:
```ts
export type CategoryNode = { id: string; name: string; parentId: string | null };

/** Categories that may become the parent of `id`: not itself and not one of its descendants. */
export function categoryOptionsFor<T extends CategoryNode>(id: string | null, categories: T[]): T[] {
  if (!id) return categories;
  const blocked = new Set<string>([id]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const c of categories) if (c.parentId && blocked.has(c.parentId) && !blocked.has(c.id)) { blocked.add(c.id); grew = true; }
  }
  return categories.filter((c) => !blocked.has(c.id));
}
```
`ProductCategoriesTab.tsx`:
```tsx
"use client";
import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listProductCategories, saveProductCategory } from "../_actions/product-categories";
import { categoryOptionsFor } from "./category-tree";

type Cat = Awaited<ReturnType<typeof listProductCategories>>[number];
const NONE = "__none__";

export function ProductCategoriesTab() {
  const t = useTranslations("AdminPage");
  const [cats, setCats] = useState<Cat[]>([]);
  const [newName, setNewName] = useState("");
  const [pending, start] = useTransition();
  useEffect(() => {
    let alive = true;
    listProductCategories().then((rows) => { if (alive) setCats(rows); });
    return () => { alive = false; };
  }, []);
  const save = (input: { id?: string; name: string; parentId: string | null; isActive: boolean }) => start(async () => {
    const res = await saveProductCategory(input);
    if ("error" in res) { toast.error(res.error === "cycle" ? t("categoryCycle") : res.error); return; }
    setCats(await listProductCategories());
  });
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input className="max-w-xs" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder={t("productCategories")} />
        <Button disabled={pending || !newName.trim()} onClick={() => { save({ name: newName, parentId: null, isActive: true }); setNewName(""); }}>+</Button>
      </div>
      <Table>
        <TableHeader><TableRow><TableHead>{t("productCategories")}</TableHead><TableHead>{t("parentCategory")}</TableHead><TableHead /></TableRow></TableHeader>
        <TableBody>
          {cats.map((c) => (
            <TableRow key={c.id}>
              <TableCell>{c.name} <span className="text-xs text-muted-foreground">({c.productCount})</span></TableCell>
              <TableCell>
                <Select value={c.parentId ?? NONE} onValueChange={(v) => save({ id: c.id, name: c.name, parentId: v === NONE ? null : v, isActive: c.isActive })}>
                  <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>{t("noParent")}</SelectItem>
                    {categoryOptionsFor(c.id, cats).map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell><Switch checked={c.isActive} onCheckedChange={(v) => save({ id: c.id, name: c.name, parentId: c.parentId, isActive: v })} /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
```
In `CrmSettingsTabs.tsx`:
- add `import { useTranslations } from "next-intl";` and `import { ProductCategoriesTab } from "./ProductCategoriesTab";`;
- inside the component, `const at = useTranslations("AdminPage");`;
- after the mapped `TabsTrigger`s add `<TabsTrigger value="productCategories">{at("productCategories")}</TabsTrigger>`;
- after the mapped `TabsContent`s add `<TabsContent value="productCategories" className="mt-6"><ProductCategoriesTab /></TabsContent>`.

`app/[locale]/(routes)/admin/pricing/page.tsx`:
```tsx
import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/authz";
import { getPriceListOptions } from "@/actions/crm/price-lists/queries";
import { getDefaultPriceListId } from "./_actions/pricing";
import { DefaultPriceListForm } from "./_components/DefaultPriceListForm";

export default async function PricingAdminPage() {
  await requireRole(["admin"]);
  const t = await getTranslations("AdminPage");
  const [lists, current] = await Promise.all([getPriceListOptions(), getDefaultPriceListId()]);
  return (
    <div className="space-y-4 p-4">
      <h1 className="text-xl font-semibold">{t("pricingTitle")}</h1>
      <DefaultPriceListForm lists={lists} current={current} />
    </div>
  );
}
```
Follow the redirect/forbidden handling the other admin pages use, e.g. `admin/plugins/page.tsx`.

`_components/DefaultPriceListForm.tsx`:
```tsx
"use client";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { setDefaultPriceList } from "../_actions/pricing";

const NONE = "__none__";

export function DefaultPriceListForm({ lists, current }: { lists: { id: string; name: string; currency: string }[]; current: string | null }) {
  const t = useTranslations("AdminPage");
  const [value, setValue] = useState(current ?? NONE);
  const [pending, start] = useTransition();
  return (
    <div className="flex items-end gap-3">
      <div className="space-y-1">
        <p className="text-sm font-medium">{t("defaultPriceList")}</p>
        <Select value={value} onValueChange={setValue}>
          <SelectTrigger className="w-72"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>{t("noDefault")}</SelectItem>
            {lists.map((l) => <SelectItem key={l.id} value={l.id}>{l.name} ({l.currency})</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <Button disabled={pending} onClick={() => start(async () => {
        const res = await setDefaultPriceList(value === NONE ? null : value);
        if ("error" in res) toast.error(res.error); else toast.success("OK");
      })}>{t("save")}</Button>
    </div>
  );
}
```
If `AdminPage.save` doesn't exist, add it to the four locale files with the other keys.

Account forms:
- `NewAccountForm.tsx`:
  - add `pricelist_id: z.string().optional()` to the zod schema;
  - add `const [priceLists, setPriceLists] = useState<{ id: string; name: string; currency: string }[]>([]);`;
  - add `useEffect(() => { let alive = true; getPriceListOptions().then((l) => { if (alive) setPriceLists(l); }); return () => { alive = false; }; }, []);`;
  - add a `FormField name="pricelist_id"` next to the industry field, using the same `Select` markup as industry. Options: `<SelectItem value="__none__">{t("noPriceList")}</SelectItem>` plus one item per list (`{l.name} ({l.currency})`). `onValueChange={(v) => field.onChange(v === "__none__" ? "" : v)}` and `value={field.value || "__none__"}`, labelled `t("priceList")`.
- `UpdateAccountForm.tsx`: the same, defaulting to `initialData.pricelist_id ?? ""`. Submitting `""` clears the list (Task 6).
- `actions/crm/get-account.ts`: in the `include` of `findFirst`, add `pricelist: { select: { name: true } },` after `opportunities: true,`.
- `BasicView.tsx`: after the "VAT number" block (the `div` that ends after `{data.vat ? data.vat : "Not assigned"}`), add a block in the same markup with the `Tags` icon (import from `lucide-react`), the label "Price list" and the value `{data.pricelist?.name ?? "Default"}`. The labels in this file are hard-coded English, so follow that.

`AdminSidebarNav.tsx`: `{ label: "Pricing", href: "/admin/pricing", icon: Tags },` after Currencies (import `Tags` from `lucide-react`).

Locale keys (en / cz / de / uk):
- `CrmAccountForm.priceList` "Price list" / "Ceník" / "Preisliste" / "Прайс-лист"
- `CrmAccountForm.noPriceList` "Default" / "Výchozí" / "Standard" / "За замовчуванням"
- `AdminPage.pricingTitle` "Pricing" / "Ceny" / "Preise" / "Ціни"
- `AdminPage.defaultPriceList` "Default price list" / "Výchozí ceník" / "Standard-Preisliste" / "Прайс-лист за замовчуванням"
- `AdminPage.noDefault` "None (product price)" / "Žádný (cena produktu)" / "Keine (Produktpreis)" / "Немає (ціна товару)"
- `AdminPage.productCategories` "Product categories" / "Kategorie produktů" / "Produktkategorien" / "Категорії товарів"
- `AdminPage.parentCategory` "Parent" / "Nadřazená" / "Übergeordnet" / "Батьківська"
- `AdminPage.noParent` "None (top level)" / "Žádná (nejvyšší úroveň)" / "Keine (oberste Ebene)" / "Немає (верхній рівень)"
- `AdminPage.categoryCycle` "A category can't sit under its own subcategory." / "Kategorie nemůže být pod vlastní podkategorií." / "Eine Kategorie kann nicht unter ihrer eigenen Unterkategorie liegen." / "Категорія не може бути під власною підкатегорією."

- [ ] **Step 4: Run tests, type check, lint**

Run: `pnpm exec jest __tests__/pricing actions/crm/accounts && pnpm exec tsc --noEmit && pnpm exec eslint "app/[locale]/(routes)/admin/pricing" "app/[locale]/(routes)/admin/crm-settings" "app/[locale]/(routes)/crm/accounts" "app/[locale]/(routes)/admin/_components/AdminSidebarNav.tsx"`
Expected: PASS; tsc and eslint report no errors.

- [ ] **Step 5: Commit**

```bash
git add "app/[locale]/(routes)/crm/accounts" "app/[locale]/(routes)/admin/pricing" "app/[locale]/(routes)/admin/crm-settings/_components" "app/[locale]/(routes)/admin/_components/AdminSidebarNav.tsx" locales/en.json locales/cz.json locales/de.json locales/uk.json __tests__/pricing/category-tree.test.ts
git add -u actions/crm/accounts
git commit -m "feat(pricing): account price list field, default list setting, category tree"
```

---

### Task 10: Whole-branch verification and manual check

- [ ] **Step 1: Full suite, types, lint, build**

Run: `pnpm exec jest 2>&1 | tail -8 && pnpm exec tsc --noEmit && pnpm lint`
Expected: only the baseline suites fail; tsc and lint are clean.

Load the CI dummy env from `.github/workflows/ci.yml` (lines 22–49), then run `pnpm exec prisma generate && pnpm exec next build`.
Expected: the build succeeds.

- [ ] **Step 2: Manual check on local dev**

Setup:
- `prisma migrate deploy` on the local DB (localhost:5433);
- dev server with `../nextcrm-app/.env` and `.env.local` and the app URLs set to its port;
- `RESEND_API_KEY` unset;
- test users through `/api/auth/test-otp` (manager `test@nextcrm.app`; a `user`-role test rep).

Then check:
1. Admin → CRM Settings → Product categories: create "Drinks" and "Tea" under it. Moving "Drinks" under "Tea" is refused.
2. As manager, create a list "Retail CZK":
   - rule ALL → formula from list price, −10 %, round 1, surcharge −0.10;
   - rule CATEGORY Tea → fixed 49;
   - price check on a Tea product shows 49 and the matched rule; on a non-tea product it shows the formula steps.
3. Create "Wholesale" based on "Retail CZK" at −20 %; the price check shows the chained price. Pointing "Retail CZK" at "Wholesale" is refused (cycle).
4. Set "Retail CZK" on an account; set "Wholesale" as the default in Admin → Pricing. `crm_get_price` with the accountId uses the account list; for another account, the default list.
5. As the rep:
   - lists and the price check work;
   - there are no edit controls, and direct write attempts are refused.
6. A list referenced by an account can't be deleted, only archived. Archived lists drop out of the account select.
7. Clearing the account's price list in the edit form works.

Run `git checkout -- AGENTS.md` afterwards.

- [ ] **Step 3: Record results in the ledger and hand off to finishing-a-development-branch**
