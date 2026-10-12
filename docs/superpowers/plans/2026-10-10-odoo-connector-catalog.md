# Odoo connector part 2 (catalog in) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Odoo's sellable products, chosen price lists (with their base lists) and customers' price lists arrive in the CRM read-only, and a queued "compare with Odoo" job proves CRM and Odoo price the same.

**Architecture:** Core gets `source`/`externalRef` on products and categories, read-only guards for EXTERNAL rows, and a small `lib/catalog/plugin-writes.ts` that upserts EXTERNAL products/categories and replaces an EXTERNAL price list with its rules in one transaction. SDK 0.2.3 exposes those writes plus `prices.get` and a product panel slot. The `odoo-connector` plugin (v0.2.0) adds a catalog step to its sync run, queued admin jobs (Sync now, Compare with Odoo) run by the 5-minute cron, and screens.

**Tech Stack:** Next.js 16 (App Router, RSC, server actions), Prisma 7 + PostgreSQL, decimal.js, zod 4, next-intl, jest (prisma mocked with jest.fn), plugin SDK (`packages/plugin-sdk`).

**Spec:** `docs/superpowers/specs/2026-10-10-odoo-connector-catalog-design.md` (parent: `docs/superpowers/specs/2026-10-10-odoo-connector-customers-design.md`).

## Global Constraints

- Nothing specific to OXO or GIPS in code (no names, ids, prefixes); all user text in `en`, `cz`, `de`, `uk`.
- Core migrations additive; existing rows default to `CRM`.
- Nothing is written to Odoo. The client calls only `fields_get`, `search_read`, `read`, `context_get`, `version_info`, and `sale.order.line/onchange` (computes, saves nothing).
- Plugin writes go only to EXTERNAL rows; users never edit EXTERNAL products, categories or price lists (screens, server actions, MCP, CSV import).
- No delete calls for catalog data: products leaving the catalog become `ARCHIVED`; lists stay (inactive).
- Decimals cross the SDK as strings.
- Migrations are hand-written SQL files whose first line is a `--` comment; never redirect `pnpm`/`npx` output into `migration.sql`.
- Commits end with `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`. Never `git add -A`. `git checkout -- AGENTS.md` before committing after `next dev`.
- **Fresh worktree setup:** `pnpm install --frozen-lockfile --prefer-offline`, then `DATABASE_URL=postgresql://x:x@localhost:5432/x pnpm exec prisma generate`.
- **Known baseline failures** (ignore): the 4 suites `enrich-contact-job`, `enrich-target-job`, `google-sync-classify`, `invoices/lifecycle` (6 tests).
- **CI runs `pnpm lint`;** tsc clean after every task. After changing a plugin definition: `pnpm plugins:generate` (commits `lib/plugins/plugins.generated.ts`).

## Plan rulings (decided while planning; carried into the ledger)

1. **SDK version 0.2.3, not 0.3.0.** The change is additive; the SDK's caret rule for 0.x (`^0.2.0` does not accept 0.3.0) would lock every installed plugin out on upgrade. Precedent: 0.2.1 and 0.2.2 were additive patch bumps. Cost if wrong: one version string.
2. **Price list choice is a text setting** `priceLists` ("242, 245"), not tick boxes. Host settings forms support only string/number/boolean/enum fields; the admin section lists every Odoo list with its id and marks the chosen ones. Cost if wrong: a later host feature for multi-select settings; the stored value stays compatible (a list of ids).
3. **CSV import needs no change.** It only creates products and already rejects any SKU that exists (CRM or EXTERNAL); Task 2 pins that with a test.
4. **Odoo 18+ `price_markup`** (cost-based rules) maps to `priceDiscount = −price_markup`; core's engine (Odoo 17 semantics) applies `priceDiscount` to every base. Compare with Odoo checks it.
6. **`createdBy` becomes optional on products and categories.** Rows written by a plugin have no creating user (orders already allow a null creator); Task 1's migration drops NOT NULL on both columns. Cost if wrong: one extra additive change in the release.
5. **The account's Odoo price list is read in the customer pass** (`property_product_pricelist` added to `PARTNER_FIELDS`, stored on `AccountLink`), so the catalog step applies it to every linked account without re-reading customers; a list imported later is applied on that run.

## Review Focus

1. **A price list chosen in the setting that does not exist in Odoo** (typo, deleted list): the run logs "Odoo price list <id> not found" once and imports the others; nothing fails. Test in Task 6.
2. **A base-list chain that loops or is deeper than core's 11-list limit**: lists in a cycle are skipped with a log line; the rest import. Test in Task 5 (`orderLists`).
3. **An Odoo variant whose SKU equals a CRM product's SKU**: that variant fails with "SKU used by a CRM product", is retried each run, and every other product imports. Test in Task 6.
4. **Compare while a sync is running** (both queued, or Sync now clicked during compare): the jobs never run at the same time; compare runs after sync. Test in Task 7.
5. **A dry run never writes catalog data**, including account price lists and the catalog cursor. Test in Task 6.

---

### Task 1: Core schema — product and category source

**Files:**
- Modify: `prisma/schema.prisma` (models `crm_Products`, `crm_ProductCategories`; new enum)
- Create: `prisma/migrations/20261014000000_catalog_external/migration.sql`
- Test: `__tests__/catalog/schema.test.ts`

**Interfaces:**
- Produces: enum `crm_Product_Source { CRM EXTERNAL }`; columns `crm_Products.source`, `crm_Products.externalRef`, `crm_ProductCategories.source`, `crm_ProductCategories.externalRef`; unique `(source, externalRef)` on both.

- [ ] **Step 1: Write the failing test**

```ts
// __tests__/catalog/schema.test.ts
import { readFileSync } from "node:fs";
import { Prisma, crm_Product_Source } from "@prisma/client";

it("generates the product source enum", () => {
  expect(Object.values(crm_Product_Source)).toEqual(["CRM", "EXTERNAL"]);
});

it("generates the source columns on products and categories", () => {
  expect(Prisma.Crm_ProductsScalarFieldEnum.source).toBe("source");
  expect(Prisma.Crm_ProductsScalarFieldEnum.externalRef).toBe("externalRef");
  expect(Prisma.Crm_ProductCategoriesScalarFieldEnum.source).toBe("source");
  expect(Prisma.Crm_ProductCategoriesScalarFieldEnum.externalRef).toBe("externalRef");
});

it("lets plugin-written rows have no creating user (Ruling 6)", () => {
  const schema = readFileSync("prisma/schema.prisma", "utf8");
  for (const model of ["crm_Products", "crm_ProductCategories"]) {
    const body = schema.slice(schema.indexOf(`model ${model} {`), schema.indexOf("}", schema.indexOf(`model ${model} {`)));
    expect(body).toMatch(/createdBy\s+String\?\s+@db\.Uuid/);
  }
});

it("ships a migration that is plain SQL", () => {
  const sql = readFileSync("prisma/migrations/20261014000000_catalog_external/migration.sql", "utf8");
  expect(sql.startsWith("-- CreateEnum")).toBe(true);
  expect(sql).not.toMatch(/Already up to date|Done in|npm notice/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec jest __tests__/catalog/schema.test.ts`
Expected: FAIL (`crm_Product_Source` undefined, migration file missing).

- [ ] **Step 3: Schema and migration**

In `prisma/schema.prisma`, add after `enum crm_Product_Status`:

```prisma
enum crm_Product_Source {
  CRM
  EXTERNAL
}
```

In `model crm_Products`, after `categoryId String? @db.Uuid`:

```prisma
  source      crm_Product_Source @default(CRM)
  externalRef String?
```

and before the closing brace (next to its other `@@` lines, or as the last line):

```prisma
  @@unique([source, externalRef])
```

In `model crm_ProductCategories`, after `isActive Boolean @default(true)`:

```prisma
  source      crm_Product_Source @default(CRM)
  externalRef String?
```

and `@@unique([source, externalRef])` before its closing brace.

In both models change `createdBy String @db.Uuid` to `createdBy String? @db.Uuid` (Ruling 6).

`prisma/migrations/20261014000000_catalog_external/migration.sql`:

```sql
-- CreateEnum
CREATE TYPE "crm_Product_Source" AS ENUM ('CRM', 'EXTERNAL');

-- AlterTable
ALTER TABLE "crm_Products" ADD COLUMN     "externalRef" TEXT,
ADD COLUMN     "source" "crm_Product_Source" NOT NULL DEFAULT 'CRM',
ALTER COLUMN "createdBy" DROP NOT NULL;

-- AlterTable
ALTER TABLE "crm_ProductCategories" ADD COLUMN     "externalRef" TEXT,
ADD COLUMN     "source" "crm_Product_Source" NOT NULL DEFAULT 'CRM',
ALTER COLUMN "createdBy" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "crm_Products_source_externalRef_key" ON "crm_Products"("source", "externalRef");

-- CreateIndex
CREATE UNIQUE INDEX "crm_ProductCategories_source_externalRef_key" ON "crm_ProductCategories"("source", "externalRef");
```

Then: `DATABASE_URL=postgresql://x:x@localhost:5432/x pnpm exec prisma generate`.

- [ ] **Step 4: Run tests and check the migration against the schema**

Run: `pnpm exec jest __tests__/catalog/schema.test.ts` → PASS (4). Code that reads `product.createdBy` as a string (tsc will list it) handles `null`.
Run (local DB on 5433, env from `../nextcrm-app/.env`): `pnpm exec prisma migrate deploy && pnpm exec prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script`
Expected: deploy applies `20261014000000_catalog_external`; diff prints an empty migration (`-- This is an empty migration.`). If the diff shows statements, fix the SQL (not the schema) until it is empty.

- [ ] **Step 5: tsc and commit**

Run: `pnpm exec tsc --noEmit` → clean.

```bash
git add prisma/schema.prisma prisma/migrations/20261014000000_catalog_external/migration.sql __tests__/catalog/schema.test.ts
git commit -m "feat(catalog): product and category source (CRM | EXTERNAL)"
```

---

### Task 2: Read-only EXTERNAL products and categories

**Files:**
- Create: `lib/authz/scopes/products.ts`
- Modify: `actions/crm/products/update-product/index.ts`, `actions/crm/products/delete-product/index.ts`, `lib/mcp/tools/crm-products.ts`, `app/[locale]/(routes)/admin/crm-settings/_actions/product-categories.ts`, `app/[locale]/(routes)/admin/crm-settings/_components/ProductCategoriesTab.tsx`, `app/[locale]/(routes)/crm/products/[productId]/page.tsx`, `app/[locale]/(routes)/crm/products/table-components/data-table-row-actions.tsx`, `app/[locale]/(routes)/crm/products/table-data/schema.tsx`, `locales/{en,cz,de,uk}.json`
- Test: `__tests__/catalog/read-only.test.ts`

**Interfaces:**
- Consumes: Task 1 columns.
- Produces: `assertProductWritable(product: { source: string } | null): void` and `assertCategoryWritable(category: { source: string } | null): void` throwing `AuthorizationError("Managed by an external system")`; locale keys `ProductsPage.external`, `AdminPage.categoryExternal`, `AdminPage.categoryExternalParent`.

- [ ] **Step 1: Write the failing tests**

```ts
// __tests__/catalog/read-only.test.ts
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/lib/audit-log", () => ({ writeAuditLog: jest.fn(), diffObjects: jest.fn(() => []) }));
const requireRole = jest.fn();
jest.mock("@/lib/authz", () => {
  const actual = jest.requireActual("@/lib/authz/errors");
  return { requireRole: (...a: unknown[]) => requireRole(...a), AuthenticationError: actual.AuthenticationError, AuthorizationError: actual.AuthorizationError };
});
const db: Record<string, any> = {
  crm_Products: { findUnique: jest.fn(), findFirst: jest.fn(), update: jest.fn(), findMany: jest.fn().mockResolvedValue([]), createMany: jest.fn() },
  crm_ProductCategories: { findUnique: jest.fn(), findMany: jest.fn().mockResolvedValue([]), update: jest.fn(), create: jest.fn() },
  currency: { findMany: jest.fn().mockResolvedValue([{ code: "CZK" }]) },
};
jest.mock("@/lib/prisma", () => ({ prismadb: db }));

import { updateProduct } from "@/actions/crm/products/update-product";
import { deleteProduct } from "@/actions/crm/products/delete-product";
import { importProducts } from "@/actions/crm/products/import-products";
import { crmProductTools } from "@/lib/mcp/tools/crm-products";
import { saveProductCategory } from "@/app/[locale]/(routes)/admin/crm-settings/_actions/product-categories";

const manager = { id: "m1", role: "manager" as const };
const external = { id: "11111111-1111-4111-8111-111111111111", source: "EXTERNAL", deletedAt: null, sku: "X1", is_recurring: false, billing_period: null };
const tool = (name: string) => crmProductTools.find((t) => t.name === name)!;

beforeEach(() => { jest.clearAllMocks(); requireRole.mockResolvedValue(manager); });

it("refuses to update an EXTERNAL product in the server action", async () => {
  db.crm_Products.findUnique.mockResolvedValue(external);
  const res = await updateProduct({ id: external.id, name: "New" } as never);
  expect(res).toEqual({ error: "Managed by an external system" });
  expect(db.crm_Products.update).not.toHaveBeenCalled();
});

it("refuses to delete an EXTERNAL product in the server action", async () => {
  db.crm_Products.findUnique.mockResolvedValue(external);
  expect(await deleteProduct(external.id)).toEqual({ error: "Managed by an external system" });
  expect(db.crm_Products.update).not.toHaveBeenCalled();
});

it("refuses MCP update and delete of an EXTERNAL product", async () => {
  db.crm_Products.findFirst.mockResolvedValue(external);
  await expect(tool("crm_update_product").handler({ id: external.id, name: "x" }, "m1", manager as never)).rejects.toThrow("Managed by an external system");
  await expect(tool("crm_delete_product").handler({ id: external.id }, "m1", manager as never)).rejects.toThrow("Managed by an external system");
  expect(db.crm_Products.update).not.toHaveBeenCalled();
});

it("CSV import skips a row whose SKU belongs to an EXTERNAL product (Ruling 3)", async () => {
  requireRole.mockResolvedValue({ id: "a1", role: "admin" });
  db.crm_Products.findMany.mockResolvedValue([{ sku: "X1" }]);
  const form = new FormData();
  form.set("file", new File(["name,type,unit_price,currency,sku\nTea,PRODUCT,10,CZK,X1\n"], "p.csv"));
  const res = await importProducts(form);
  expect(res).toMatchObject({ imported: 0, skipped: 1 });
  expect(db.crm_Products.createMany).not.toHaveBeenCalled();
});

it("refuses to rename, move or deactivate an EXTERNAL category", async () => {
  requireRole.mockResolvedValue({ id: "a1", role: "admin" });
  db.crm_ProductCategories.findUnique.mockResolvedValue({ id: "c1", source: "EXTERNAL" });
  expect(await saveProductCategory({ id: "c1", name: "New", parentId: null, isActive: true })).toEqual({ error: "external" });
  expect(db.crm_ProductCategories.update).not.toHaveBeenCalled();
});

it("refuses to put a CRM category under an EXTERNAL parent", async () => {
  requireRole.mockResolvedValue({ id: "a1", role: "admin" });
  db.crm_ProductCategories.findUnique.mockImplementation(async ({ where }: { where: { id: string } }) =>
    where.id === "p1" ? { id: "p1", source: "EXTERNAL" } : { id: "c2", source: "CRM" });
  expect(await saveProductCategory({ id: "c2", name: "Mine", parentId: "p1", isActive: true })).toEqual({ error: "externalParent" });
  expect(await saveProductCategory({ name: "New", parentId: "p1", isActive: true })).toEqual({ error: "externalParent" });
  expect(db.crm_ProductCategories.update).not.toHaveBeenCalled();
  expect(db.crm_ProductCategories.create).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec jest __tests__/catalog/read-only.test.ts`
Expected: FAIL (updates/deletes go through; category saves succeed). The CSV test passes already (Ruling 3: it pins existing behaviour).

- [ ] **Step 3: Guards**

```ts
// lib/authz/scopes/products.ts
import { AuthorizationError } from "../errors";

const MESSAGE = "Managed by an external system";

/** Products and categories synced by a plugin are read-only for users (catalog spec § 2.2). */
export function assertProductWritable(product: { source: string } | null): void {
  if (product?.source === "EXTERNAL") throw new AuthorizationError(MESSAGE);
}

export function assertCategoryWritable(category: { source: string } | null): void {
  if (category?.source === "EXTERNAL") throw new AuthorizationError(MESSAGE);
}
```

`actions/crm/products/update-product/index.ts` — after the `if (!existing || existing.deletedAt)` block:

```ts
    if (existing.source === "EXTERNAL") return { error: "Managed by an external system" };
```

`actions/crm/products/delete-product/index.ts` — inside the `try`, before the update:

```ts
    const existing = await prismadb.crm_Products.findUnique({ where: { id } });
    if (existing?.source === "EXTERNAL") return { error: "Managed by an external system" };
```

`lib/mcp/tools/crm-products.ts` — import `import { assertProductWritable } from "@/lib/authz/scopes/products";` and in both `crm_update_product` and `crm_delete_product`, after `if (!existing) notFound("Product");`:

```ts
      assertProductWritable(existing);
```

`app/[locale]/(routes)/admin/crm-settings/_actions/product-categories.ts` — in `saveProductCategory`, after the schema check:

```ts
  if (id && (await prismadb.crm_ProductCategories.findUnique({ where: { id } }))?.source === "EXTERNAL") return { error: "external" };
  if (data.parentId && (await prismadb.crm_ProductCategories.findUnique({ where: { id: data.parentId } }))?.source === "EXTERNAL") return { error: "externalParent" };
```

and add `source` to `listProductCategories`' mapped row: `source: r.source`.

- [ ] **Step 4: Screens and texts**

- `table-data/schema.tsx`: add `source: z.string().default("CRM"),` to `productsSchema`.
- `data-table-row-actions.tsx`: after `const product = productsSchema.parse(row.original);` add `const external = product.source === "EXTERNAL";`, keep the existing "Edit" item (it opens the detail page, which is read-only for EXTERNAL products), and wrap the `<DropdownMenuSeparator />` and the Delete `<DropdownMenuItem>` in `{!external && (<>…</>)}`.
- `[productId]/page.tsx`: import `getTranslations` from `next-intl/server` and `Badge` from `@/components/ui/badge`; replace the `<div className="flex justify-end mb-4">…</div>` with:

```tsx
      <div className="mb-4 flex items-center justify-end gap-3">
        {product.source === "EXTERNAL" ? (
          <Badge variant="secondary">{t("external")}</Badge>
        ) : (
          <EditProductButton product={productForEdit} categories={categories} currencies={currencies} />
        )}
      </div>
```

with `const t = await getTranslations("ProductsPage");` at the top of the component.

- `ProductCategoriesTab.tsx`: for rows with `c.source === "EXTERNAL"` show `<span className="ml-2 text-xs text-muted-foreground">{t("categoryExternal")}</span>` after the name and pass `disabled` to that row's `Select` and `Switch`; parent options exclude nothing (CRM categories cannot pick an EXTERNAL parent: filter `categoryOptionsFor(c.id, cats).filter((o) => cats.find((x) => x.id === o.id)?.source !== "EXTERNAL")`); toast for errors: `res.error === "external" ? t("categoryExternal") : res.error === "externalParent" ? t("categoryExternalParent") : res.error === "cycle" ? t("categoryCycle") : res.error`.
- `locales/*.json`: add a top-level `"ProductsPage": { "external": … }` namespace if absent, and two keys in `"AdminPage"`:

| key | en | cz | de | uk |
|---|---|---|---|---|
| `ProductsPage.external` | From an external system (read-only) | Z externího systému (jen pro čtení) | Aus einem externen System (schreibgeschützt) | Із зовнішньої системи (лише читання) |
| `AdminPage.categoryExternal` | Synced from an external system (read-only) | Synchronizováno z externího systému (jen pro čtení) | Aus einem externen System synchronisiert (schreibgeschützt) | Синхронізовано із зовнішньої системи (лише читання) |
| `AdminPage.categoryExternalParent` | A category cannot be placed under a synced category | Kategorii nelze zařadit pod synchronizovanou kategorii | Eine Kategorie kann nicht unter eine synchronisierte Kategorie gelegt werden | Категорію не можна розмістити під синхронізованою категорією |

- [ ] **Step 5: Run tests, tsc, lint, commit**

Run: `pnpm exec jest __tests__/catalog __tests__/mcp __tests__/pricing` → PASS. `pnpm exec tsc --noEmit && pnpm lint` → clean.

```bash
git add lib/authz/scopes/products.ts actions/crm/products lib/mcp/tools/crm-products.ts "app/[locale]/(routes)/admin/crm-settings" "app/[locale]/(routes)/crm/products" locales __tests__/catalog/read-only.test.ts
git commit -m "feat(catalog): external products and categories are read-only"
```

---

### Task 3: Core catalog writes for plugins

**Files:**
- Create: `lib/catalog/plugin-writes.ts`
- Test: `__tests__/catalog/plugin-writes.test.ts`

**Interfaces:**
- Consumes: Task 1 columns; `crm_PriceLists` (`source`, `externalRef`), `crm_PriceListRules`.
- Produces (all exported from `lib/catalog/plugin-writes.ts`; `pluginId` is for the audit log):
  - `upsertExternalProduct(pluginId: string, ref: string, f: ExternalProductInput): Promise<{ id: string; created: boolean }>`
  - `upsertExternalCategory(pluginId: string, ref: string, f: { name: string; parentRef: string | null }): Promise<{ id: string }>`
  - `replaceExternalPriceList(pluginId: string, ref: string, list: { name: string; currency: string; isActive: boolean }, rules: ExternalRuleInput[]): Promise<{ id: string }>`
  - `findExternalProducts(): Promise<{ id: string; ref: string; status: string }[]>`
  - `findExternalPriceLists(): Promise<{ id: string; ref: string; name: string; currency: string; isActive: boolean }[]>`
  - Types `ExternalProductInput`, `ExternalRuleInput` are defined in the SDK (Task 4) and re-declared here identically for core; Task 4 imports them from `@nextcrm/plugin-sdk` and this file switches to that import in Task 4 Step 3.

- [ ] **Step 1: Write the failing tests**

```ts
// __tests__/catalog/plugin-writes.test.ts
const db: Record<string, any> = {
  crm_Products: { findUnique: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn(), findMany: jest.fn() },
  crm_ProductCategories: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
  crm_PriceLists: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), findMany: jest.fn() },
  crm_PriceListRules: { deleteMany: jest.fn(), createMany: jest.fn() },
};
db.$transaction = jest.fn(async (fn: (tx: unknown) => unknown) => fn(db));
jest.mock("@/lib/prisma", () => ({ prismadb: db }));
jest.mock("@/lib/audit-log", () => ({ writeAuditLog: jest.fn() }));

import { replaceExternalPriceList, upsertExternalCategory, upsertExternalProduct } from "@/lib/catalog/plugin-writes";

const product = { name: "Cup", sku: "800004", description: null, type: "PRODUCT" as const, status: "ACTIVE" as const, unit_price: "1.89", unit_cost: "0.9", currency: "CZK", tax_rate: "21", unit: "ks", categoryRef: "7" };
const key = (ref: string) => ({ source_externalRef: { source: "EXTERNAL", externalRef: ref } });

beforeEach(() => jest.clearAllMocks());

it("creates an EXTERNAL product with its category resolved by ref", async () => {
  db.crm_ProductCategories.findUnique.mockResolvedValue({ id: "cat-7" });
  db.crm_Products.findUnique.mockResolvedValue(null);
  db.crm_Products.findFirst.mockResolvedValue(null);
  db.crm_Products.create.mockResolvedValue({ id: "p1" });
  expect(await upsertExternalProduct("odoo", "332", product)).toEqual({ id: "p1", created: true });
  expect(db.crm_ProductCategories.findUnique).toHaveBeenCalledWith({ where: key("7") });
  expect(db.crm_Products.create.mock.calls[0][0].data).toMatchObject({ source: "EXTERNAL", externalRef: "332", sku: "800004", categoryId: "cat-7", unit_price: "1.89", createdBy: null });
});

it("updates the existing EXTERNAL product", async () => {
  db.crm_ProductCategories.findUnique.mockResolvedValue({ id: "cat-7" });
  db.crm_Products.findUnique.mockResolvedValue({ id: "p1", source: "EXTERNAL" });
  db.crm_Products.findFirst.mockResolvedValue(null);
  db.crm_Products.update.mockResolvedValue({ id: "p1" });
  expect(await upsertExternalProduct("odoo", "332", product)).toEqual({ id: "p1", created: false });
  expect(db.crm_Products.update.mock.calls[0][0].where).toEqual({ id: "p1" });
});

it("refuses an SKU used by a CRM product (Review Focus 3)", async () => {
  db.crm_ProductCategories.findUnique.mockResolvedValue({ id: "cat-7" });
  db.crm_Products.findUnique.mockResolvedValue(null);
  db.crm_Products.findFirst.mockResolvedValue({ id: "crm-1", source: "CRM" });
  await expect(upsertExternalProduct("odoo", "332", product)).rejects.toThrow("SKU used by a CRM product: 800004");
  expect(db.crm_Products.create).not.toHaveBeenCalled();
});

it("fails on an unknown category ref", async () => {
  db.crm_ProductCategories.findUnique.mockResolvedValue(null);
  await expect(upsertExternalProduct("odoo", "332", product)).rejects.toThrow("Unknown category ref: 7");
});

it("upserts a category with its parent", async () => {
  db.crm_ProductCategories.findUnique.mockImplementation(async ({ where }: any) => (where.source_externalRef.externalRef === "1" ? { id: "cat-1" } : null));
  db.crm_ProductCategories.create.mockResolvedValue({ id: "cat-2" });
  expect(await upsertExternalCategory("odoo", "2", { name: "Aroma", parentRef: "1" })).toEqual({ id: "cat-2" });
  expect(db.crm_ProductCategories.create.mock.calls[0][0].data).toMatchObject({ name: "Aroma", parentId: "cat-1", source: "EXTERNAL", externalRef: "2", createdBy: null });
});

const rule = { appliesTo: "PRODUCT" as const, productRef: "332", categoryRef: null, minQuantity: "1000", dateStart: null, dateEnd: null, computePrice: "FIXED" as const, fixedPrice: "1.51", percentPrice: null, base: "LIST_PRICE" as const, basePriceListRef: null, priceDiscount: "0", priceSurcharge: "0", priceRound: null, priceMinMargin: null, priceMaxMargin: null, externalRef: "1285" };

it("replaces a list and all its rules in one transaction", async () => {
  db.crm_PriceLists.findUnique.mockResolvedValue({ id: "L1", source: "EXTERNAL" });
  db.crm_Products.findUnique.mockResolvedValue({ id: "p1", source: "EXTERNAL" });
  db.crm_PriceLists.update.mockResolvedValue({ id: "L1" });
  expect(await replaceExternalPriceList("odoo", "245", { name: "Gold", currency: "CZK", isActive: true }, [rule])).toEqual({ id: "L1" });
  expect(db.$transaction).toHaveBeenCalledTimes(1);
  expect(db.crm_PriceListRules.deleteMany).toHaveBeenCalledWith({ where: { priceListId: "L1" } });
  expect(db.crm_PriceListRules.createMany.mock.calls[0][0].data[0]).toMatchObject({ priceListId: "L1", productId: "p1", appliesTo: "PRODUCT", minQuantity: "1000", fixedPrice: "1.51", externalRef: "1285" });
});

it("fails the whole replace on an unknown product ref, before writing", async () => {
  db.crm_PriceLists.findUnique.mockResolvedValue({ id: "L1", source: "EXTERNAL" });
  db.crm_Products.findUnique.mockResolvedValue(null);
  await expect(replaceExternalPriceList("odoo", "245", { name: "Gold", currency: "CZK", isActive: true }, [rule])).rejects.toThrow("Unknown product ref: 332");
  expect(db.crm_PriceListRules.deleteMany).not.toHaveBeenCalled();
});

it("refuses a base list that is not EXTERNAL", async () => {
  db.crm_PriceLists.findUnique.mockImplementation(async ({ where }: any) => ("source_externalRef" in where ? { id: "L1", source: "EXTERNAL" } : null));
  const r = { ...rule, appliesTo: "ALL" as const, productRef: null, base: "PRICE_LIST" as const, basePriceListRef: "234" };
  await expect(replaceExternalPriceList("odoo", "245", { name: "Gold", currency: "CZK", isActive: true }, [r])).rejects.toThrow();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec jest __tests__/catalog/plugin-writes.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement**

```ts
// lib/catalog/plugin-writes.ts
import { prismadb } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit-log";

export interface ExternalProductInput {
  name: string; sku: string | null; description: string | null; type: "PRODUCT" | "SERVICE";
  status: "ACTIVE" | "ARCHIVED"; unit_price: string; unit_cost: string | null; currency: string;
  tax_rate: string | null; unit: string | null; categoryRef: string | null;
}
export interface ExternalRuleInput {
  appliesTo: "ALL" | "CATEGORY" | "PRODUCT"; productRef: string | null; categoryRef: string | null;
  minQuantity: string; dateStart: string | null; dateEnd: string | null;
  computePrice: "FIXED" | "PERCENTAGE" | "FORMULA"; fixedPrice: string | null; percentPrice: string | null;
  base: "LIST_PRICE" | "COST" | "PRICE_LIST"; basePriceListRef: string | null;
  priceDiscount: string; priceSurcharge: string; priceRound: string | null; priceMinMargin: string | null; priceMaxMargin: string | null;
  externalRef: string | null;
}

const ext = (externalRef: string) => ({ source_externalRef: { source: "EXTERNAL" as const, externalRef } });

async function categoryId(ref: string | null): Promise<string | null> {
  if (!ref) return null;
  const row = await prismadb.crm_ProductCategories.findUnique({ where: ext(ref) });
  if (!row) throw new Error(`Unknown category ref: ${ref}`);
  return row.id;
}

export async function upsertExternalCategory(pluginId: string, ref: string, f: { name: string; parentRef: string | null }) {
  const parentId = await categoryId(f.parentRef);
  const existing = await prismadb.crm_ProductCategories.findUnique({ where: ext(ref) });
  const row = existing
    ? await prismadb.crm_ProductCategories.update({ where: { id: existing.id }, data: { name: f.name, parentId, updatedBy: null } })
    : await prismadb.crm_ProductCategories.create({ data: { name: f.name, parentId, source: "EXTERNAL", externalRef: ref, createdBy: null } });
  return { id: row.id };
}

export async function upsertExternalProduct(pluginId: string, ref: string, f: ExternalProductInput) {
  const catId = await categoryId(f.categoryRef);
  const existing = await prismadb.crm_Products.findUnique({ where: ext(ref) });
  if (f.sku) {
    const clash = await prismadb.crm_Products.findFirst({ where: { sku: f.sku, NOT: { source: "EXTERNAL", externalRef: ref } } });
    if (clash) throw new Error(`SKU used by a ${clash.source === "CRM" ? "CRM" : "different external"} product: ${f.sku}`);
  }
  const { categoryRef: _c, ...fields } = f;
  const data = { ...fields, categoryId: catId };
  if (existing) {
    await prismadb.crm_Products.update({ where: { id: existing.id }, data: { ...data, updatedBy: null, v: { increment: 1 } } });
    return { id: existing.id, created: false };
  }
  const row = await prismadb.crm_Products.create({ data: { ...data, source: "EXTERNAL", externalRef: ref, createdBy: null } });
  await writeAuditLog({ entityType: "product", entityId: row.id, action: "created", changes: [{ field: "plugin", old: null, new: pluginId }] as never, userId: null });
  return { id: row.id, created: true };
}

export async function replaceExternalPriceList(pluginId: string, ref: string, list: { name: string; currency: string; isActive: boolean }, rules: ExternalRuleInput[]) {
  const existing = await prismadb.crm_PriceLists.findUnique({ where: ext(ref) });
  // Resolve every reference before writing, so a bad rule leaves the list as it was.
  const resolved = [];
  for (const r of rules) {
    let productId: string | null = null;
    let basePriceListId: string | null = null;
    if (r.productRef) {
      const p = await prismadb.crm_Products.findUnique({ where: ext(r.productRef) });
      if (!p) throw new Error(`Unknown product ref: ${r.productRef}`);
      productId = p.id;
    }
    if (r.basePriceListRef) {
      const b = await prismadb.crm_PriceLists.findUnique({ where: ext(r.basePriceListRef) });
      if (!b) throw new Error(`Unknown base price list ref: ${r.basePriceListRef}`);
      basePriceListId = b.id;
    }
    const { productRef: _p, categoryRef, basePriceListRef: _b, dateStart, dateEnd, ...rest } = r;
    resolved.push({ ...rest, productId, basePriceListId, categoryId: await categoryId(categoryRef),
      dateStart: dateStart ? new Date(dateStart) : null, dateEnd: dateEnd ? new Date(dateEnd) : null });
  }
  return prismadb.$transaction(async (tx) => {
    const row = existing
      ? await tx.crm_PriceLists.update({ where: { id: existing.id }, data: { ...list, updatedBy: null } })
      : await tx.crm_PriceLists.create({ data: { ...list, source: "EXTERNAL", externalRef: ref, createdBy: null } });
    await tx.crm_PriceListRules.deleteMany({ where: { priceListId: row.id } });
    if (resolved.length) await tx.crm_PriceListRules.createMany({ data: resolved.map((r) => ({ ...r, priceListId: row.id })) });
    return { id: row.id };
  });
}

export async function findExternalProducts() {
  const rows = await prismadb.crm_Products.findMany({ where: { source: "EXTERNAL", deletedAt: null }, select: { id: true, externalRef: true, status: true } });
  return rows.map((r) => ({ id: r.id, ref: r.externalRef as string, status: r.status as string }));
}

export async function findExternalPriceLists() {
  const rows = await prismadb.crm_PriceLists.findMany({ where: { source: "EXTERNAL" }, select: { id: true, externalRef: true, name: true, currency: true, isActive: true } });
  return rows.map((r) => ({ id: r.id, ref: r.externalRef as string, name: r.name, currency: r.currency, isActive: r.isActive }));
}
```

Note on the "base list not EXTERNAL" test: `findUnique(ext(ref))` only finds EXTERNAL lists, so a CRM list can never be a base; the mock returns null for the base lookup and the call throws `Unknown base price list ref`.

- [ ] **Step 4: Run tests and tsc**

Run: `pnpm exec jest __tests__/catalog/plugin-writes.test.ts` → PASS (8). `pnpm exec tsc --noEmit` → clean.

- [ ] **Step 5: Commit**

```bash
git add lib/catalog/plugin-writes.ts __tests__/catalog/plugin-writes.test.ts
git commit -m "feat(catalog): core upsert and replace calls for external catalog data"
```

---

### Task 4: SDK 0.2.3 — catalog data API, prices, product panel

**Files:**
- Modify: `packages/plugin-sdk/src/types.ts`, `packages/plugin-sdk/src/define.ts`, `packages/plugin-sdk/src/version.ts`, `packages/plugin-sdk/src/testing.ts`, `lib/plugins/data-api.ts`, `lib/plugins/slots.ts`, `lib/catalog/plugin-writes.ts` (import types from the SDK), `app/[locale]/(routes)/crm/products/[productId]/page.tsx`, `lib/plugins/__tests__/data-api-activities.test.ts`, `lib/plugins/__tests__/data-api-orders.test.ts`, `lib/plugins/__tests__/lifecycle.test.ts` (version strings), `apps/docs/content/docs/developers/plugins.mdx`
- Test: `lib/plugins/__tests__/data-api-catalog.test.ts`, `packages/plugin-sdk` testing helpers covered by the same file

**Interfaces:**
- Consumes: Task 3 functions.
- Produces:
  - Permissions `products:write`, `priceLists:read`, `priceLists:write`.
  - `DataApi.products: ProductsApi` = `ReadApi & { upsertExternal(ref, f: ExternalProductInput): Promise<{ id: string; created: boolean }>; findExternal(): Promise<{ id: string; ref: string; status: string }[]> }`
  - `DataApi.productCategories: { upsertExternal(ref, f: { name: string; parentRef: string | null }): Promise<{ id: string }> }`
  - `DataApi.priceLists: { findExternal(): Promise<{ id; ref; name; currency; isActive }[]>; replaceExternal(ref, list, rules: ExternalRuleInput[]): Promise<{ id: string }> }`
  - `DataApi.prices: { get(input: { priceListId: string; productId: string; quantity: string }): Promise<{ price: string; currency: string; ruleId: string | null }> }`
  - `x.productPanel({ id, component, roles? })` with `ProductSlotProps { productId: string; ctx }`; `getProductPanels(role)` in `lib/plugins/slots.ts`.
  - `SDK_VERSION = "0.2.3"`.
  - `createTestContext({ data: { products, productCategories, priceLists, priceListRules } , prices? })`: in-memory `upsertExternal`, `replaceExternal`, `findExternal`; `prices.get` uses `opts.prices` (a function) or throws "No prices mock configured".

- [ ] **Step 1: Write the failing tests**

```ts
// lib/plugins/__tests__/data-api-catalog.test.ts
const writes = {
  upsertExternalProduct: jest.fn().mockResolvedValue({ id: "p1", created: true }),
  upsertExternalCategory: jest.fn().mockResolvedValue({ id: "c1" }),
  replaceExternalPriceList: jest.fn().mockResolvedValue({ id: "L1" }),
  findExternalProducts: jest.fn().mockResolvedValue([]),
  findExternalPriceLists: jest.fn().mockResolvedValue([]),
};
jest.mock("@/lib/catalog/plugin-writes", () => writes);
const getPrice = jest.fn();
jest.mock("@/lib/pricing/get-price", () => ({ getPrice: (...a: unknown[]) => getPrice(...a) }));
jest.mock("@/lib/prisma", () => ({ prismadb: {} }));
jest.mock("@/inngest/client", () => ({ inngest: { send: jest.fn().mockResolvedValue(undefined) } }));
jest.mock("@/lib/plugins/log", () => ({ writePluginLog: jest.fn() }));

import { Decimal } from "decimal.js";
import { SDK_VERSION, definePlugin } from "@nextcrm/plugin-sdk";
import { createTestContext } from "@nextcrm/plugin-sdk/testing";
import { createDataApi } from "@/lib/plugins/data-api";

const f = { name: "Cup", sku: "S1", description: null, type: "PRODUCT" as const, status: "ACTIVE" as const, unit_price: "1", unit_cost: null, currency: "CZK", tax_rate: null, unit: null, categoryRef: null };

it("is SDK 0.2.3 (additive)", () => expect(SDK_VERSION).toBe("0.2.3"));

it("needs products:write for external product and category upserts", async () => {
  await expect(createDataApi("demo", ["products:read"]).products.upsertExternal("1", f)).rejects.toThrow("products:write");
  await createDataApi("demo", ["products:write"]).products.upsertExternal("1", f);
  expect(writes.upsertExternalProduct).toHaveBeenCalledWith("demo", "1", f);
  await createDataApi("demo", ["products:write"]).productCategories.upsertExternal("7", { name: "Tea", parentRef: null });
  expect(writes.upsertExternalCategory).toHaveBeenCalledWith("demo", "7", { name: "Tea", parentRef: null });
});

it("needs priceLists:write to replace and priceLists:read to list", async () => {
  await expect(createDataApi("demo", ["priceLists:read"]).priceLists.replaceExternal("245", { name: "G", currency: "CZK", isActive: true }, [])).rejects.toThrow("priceLists:write");
  await expect(createDataApi("demo", []).priceLists.findExternal()).rejects.toThrow("priceLists:read");
  await createDataApi("demo", ["priceLists:write"]).priceLists.replaceExternal("245", { name: "G", currency: "CZK", isActive: true }, []);
  expect(writes.replaceExternalPriceList).toHaveBeenCalledWith("demo", "245", { name: "G", currency: "CZK", isActive: true }, []);
});

it("prices a product through core getPrice with products:read, decimals as strings", async () => {
  getPrice.mockResolvedValue({ price: new Decimal("1.51"), currency: "CZK", ruleId: "r1", listPrice: new Decimal("1.67"), steps: [] });
  const out = await createDataApi("demo", ["products:read"]).prices.get({ priceListId: "L1", productId: "p1", quantity: "1000" });
  expect(out).toEqual({ price: "1.51", currency: "CZK", ruleId: "r1" });
  expect(getPrice).toHaveBeenCalledWith({ priceListId: "L1", productId: "p1", quantity: "1000" });
  await expect(createDataApi("demo", []).prices.get({ priceListId: "L1", productId: "p1", quantity: "1" })).rejects.toThrow("products:read");
});

it("registers product panels", () => {
  const def = definePlugin({ id: "demo", name: "D", version: "1.0.0", sdk: "^0.2.3", description: "", permissions: [],
    extensions: (x) => x.productPanel({ id: "p", component: () => null }) });
  expect(def.extensions.productPanels).toEqual([expect.objectContaining({ id: "p", roles: ["user", "manager", "admin"] })]);
});

it("gives plugin tests an in-memory catalog", async () => {
  const products: Record<string, unknown>[] = [];
  const ctx = createTestContext({ data: { products }, prices: async () => ({ price: "2", currency: "CZK", ruleId: null }) });
  expect(await ctx.data.products.upsertExternal("332", f)).toMatchObject({ created: true });
  expect(await ctx.data.products.upsertExternal("332", { ...f, name: "Cup 2" })).toMatchObject({ created: false });
  expect(products).toEqual([expect.objectContaining({ source: "EXTERNAL", externalRef: "332", name: "Cup 2" })]);
  await ctx.data.productCategories.upsertExternal("7", { name: "Tea", parentRef: null });
  const { id } = await ctx.data.priceLists.replaceExternal("245", { name: "G", currency: "CZK", isActive: true }, []);
  expect(await ctx.data.priceLists.findExternal()).toEqual([expect.objectContaining({ id, ref: "245", isActive: true })]);
  expect(await ctx.data.prices.get({ priceListId: id, productId: "x", quantity: "1" })).toEqual({ price: "2", currency: "CZK", ruleId: null });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec jest lib/plugins/__tests__/data-api-catalog.test.ts`
Expected: FAIL (version 0.2.2; `upsertExternal` undefined; `productPanel` not a function).

- [ ] **Step 3: Implement**

`packages/plugin-sdk/src/types.ts`:
- `PERMISSIONS`: replace `"activities:read", "users:read", "products:read",` with `"activities:read", "users:read", "products:read", "products:write", "priceLists:read", "priceLists:write",`.
- Add (and move the two interfaces out of `lib/catalog/plugin-writes.ts`, which now imports them):

```ts
export interface ExternalProductInput {
  name: string; sku: string | null; description: string | null; type: "PRODUCT" | "SERVICE";
  status: "ACTIVE" | "ARCHIVED"; unit_price: string; unit_cost: string | null; currency: string;
  tax_rate: string | null; unit: string | null; categoryRef: string | null;
}
export interface ExternalRuleInput {
  appliesTo: "ALL" | "CATEGORY" | "PRODUCT"; productRef: string | null; categoryRef: string | null;
  minQuantity: string; dateStart: string | null; dateEnd: string | null;
  computePrice: "FIXED" | "PERCENTAGE" | "FORMULA"; fixedPrice: string | null; percentPrice: string | null;
  base: "LIST_PRICE" | "COST" | "PRICE_LIST"; basePriceListRef: string | null;
  priceDiscount: string; priceSurcharge: string; priceRound: string | null; priceMinMargin: string | null; priceMaxMargin: string | null;
  externalRef: string | null;
}
/** Plugins write only EXTERNAL rows, keyed by the external system's id (catalog spec § 2.3). */
export interface ProductsApi extends ReadApi {
  upsertExternal(ref: string, fields: ExternalProductInput): Promise<{ id: string; created: boolean }>;
  findExternal(): Promise<{ id: string; ref: string; status: string }[]>;
}
export interface ProductCategoriesApi { upsertExternal(ref: string, fields: { name: string; parentRef: string | null }): Promise<{ id: string }> }
export interface ExternalPriceList { id: string; ref: string; name: string; currency: string; isActive: boolean }
export interface PriceListsApi {
  findExternal(): Promise<ExternalPriceList[]>;
  /** Writes the list and replaces all its rules in one transaction; an unknown ref fails the whole call. */
  replaceExternal(ref: string, list: { name: string; currency: string; isActive: boolean }, rules: ExternalRuleInput[]): Promise<{ id: string }>;
}
export interface PriceQuote { price: string; currency: string; ruleId: string | null }
export interface PricesApi { get(input: { priceListId: string; productId: string; quantity: string }): Promise<PriceQuote> }
export interface ProductSlotProps<S = RecordData, K = RecordData> { productId: string; ctx: PluginContext<S, K> }
export interface ProductPanelRegistration { id: string; component: ServerComponent<ProductSlotProps<any, any>>; roles: Role[] }
```

- `DataApi`: `products: ProductsApi; productCategories: ProductCategoriesApi; priceLists: PriceListsApi; prices: PricesApi;`
- `PluginExtensions`: add `productPanels: ProductPanelRegistration[];`
- `ExtensionBuilder`: add `productPanel(panel: { id: string; component: ServerComponent<ProductSlotProps<S, K>>; roles?: Role[] }): void;`

`packages/plugin-sdk/src/define.ts`: `ext` gets `productPanels: []`; `ids` gets `productPanel: new Set<string>()`; builder:

```ts
    productPanel: (panel) => { unique(ids.productPanel, panel.id, "Duplicate product panel id"); ext.productPanels.push({ ...panel, roles: panel.roles ?? ALL_ROLES }); },
```

`packages/plugin-sdk/src/version.ts`: `export const SDK_VERSION = "0.2.3";` (update the three test files that assert `0.2.2`: `data-api-activities.test.ts` and `data-api-orders.test.ts` assertions become `toBe("0.2.3")` with titles "is SDK 0.2.3 (additive)"; `lifecycle.test.ts` message `running 0.2.3`).

`lib/plugins/data-api.ts` — replace `products: read("crm_Products", "products:read"),` with:

```ts
    products: {
      ...read("crm_Products", "products:read"),
      async upsertExternal(ref, fields) {
        need("products:write");
        const { upsertExternalProduct } = await import("@/lib/catalog/plugin-writes");
        return runAsActor({ type: "plugin", pluginId }, () => upsertExternalProduct(pluginId, ref, fields));
      },
      async findExternal() {
        need("products:read");
        const { findExternalProducts } = await import("@/lib/catalog/plugin-writes");
        return findExternalProducts();
      },
    },
    productCategories: {
      async upsertExternal(ref, fields) {
        need("products:write");
        const { upsertExternalCategory } = await import("@/lib/catalog/plugin-writes");
        return runAsActor({ type: "plugin", pluginId }, () => upsertExternalCategory(pluginId, ref, fields));
      },
    },
    priceLists: {
      async findExternal() {
        need("priceLists:read");
        const { findExternalPriceLists } = await import("@/lib/catalog/plugin-writes");
        return findExternalPriceLists();
      },
      async replaceExternal(ref, list, rules) {
        need("priceLists:write");
        const { replaceExternalPriceList } = await import("@/lib/catalog/plugin-writes");
        return runAsActor({ type: "plugin", pluginId }, () => replaceExternalPriceList(pluginId, ref, list, rules));
      },
    },
    prices: {
      async get(input) {
        need("products:read");
        const { getPrice } = await import("@/lib/pricing/get-price");
        const r = await getPrice({ priceListId: input.priceListId, productId: input.productId, quantity: input.quantity });
        return { price: r.price.toString(), currency: r.currency, ruleId: r.ruleId };
      },
    },
```

`packages/plugin-sdk/src/testing.ts`:
- `type Tables = … | "productCategories" | "priceLists" | "priceListRules";`
- `createTestContext` opts gain `prices?: (input: { priceListId: string; productId: string; quantity: string }) => Promise<PriceQuote>`.
- Replace `products: table(d.products ?? []),` with an in-memory implementation:

```ts
      products: (() => {
        const rows = d.products ?? [];
        const t = table(rows);
        return {
          ...t,
          async upsertExternal(ref: string, f: ExternalProductInput) {
            const row = rows.find((r) => r.source === "EXTERNAL" && r.externalRef === ref);
            if (row) { Object.assign(row, f); return { id: row.id as string, created: false }; }
            const created = await t.create({ ...f, source: "EXTERNAL", externalRef: ref, deletedAt: null });
            return { id: created.id as string, created: true };
          },
          async findExternal() {
            return rows.filter((r) => r.source === "EXTERNAL" && r.deletedAt == null).map((r) => ({ id: r.id as string, ref: r.externalRef as string, status: r.status as string }));
          },
        };
      })(),
      productCategories: (() => {
        const rows = d.productCategories ?? [];
        const t = table(rows);
        return {
          async upsertExternal(ref: string, f: { name: string; parentRef: string | null }) {
            const row = rows.find((r) => r.externalRef === ref);
            if (row) { Object.assign(row, f); return { id: row.id as string }; }
            return { id: (await t.create({ ...f, source: "EXTERNAL", externalRef: ref })).id as string };
          },
        };
      })(),
      priceLists: (() => {
        const lists = d.priceLists ?? [];
        const rules = d.priceListRules ?? [];
        const t = table(lists);
        return {
          async findExternal() {
            return lists.map((l) => ({ id: l.id as string, ref: l.externalRef as string, name: l.name as string, currency: l.currency as string, isActive: l.isActive as boolean }));
          },
          async replaceExternal(ref: string, list: { name: string; currency: string; isActive: boolean }, next: ExternalRuleInput[]) {
            let row = lists.find((l) => l.externalRef === ref);
            if (row) Object.assign(row, list); else row = await t.create({ ...list, source: "EXTERNAL", externalRef: ref });
            for (let i = rules.length - 1; i >= 0; i--) if (rules[i].priceListId === row.id) rules.splice(i, 1);
            rules.push(...next.map((r) => ({ ...r, priceListId: row!.id })));
            return { id: row.id as string };
          },
        };
      })(),
      prices: {
        async get(input) {
          if (!opts.prices) throw new Error("No prices mock configured");
          return opts.prices(input);
        },
      },
```

(import `ExternalProductInput`, `ExternalRuleInput`, `PriceQuote` from `./types`.)

`lib/plugins/slots.ts`:

```ts
export async function getProductPanels(role: Role) {
  const out: { plugin: RegisteredPlugin; panel: ProductPanelRegistration }[] = [];
  for (const plugin of await getEnabledPlugins()) {
    for (const panel of plugin.definition.extensions.productPanels) if (panel.roles.includes(role)) out.push({ plugin, panel });
  }
  return out;
}
```

`app/[locale]/(routes)/crm/products/[productId]/page.tsx`: `const user = await requireAuthenticated();` (import from `@/lib/authz`), `const panels = await getProductPanels(user.role);`, and inside the "basic" `TabsContent`, after `<BasicView … />`:

```tsx
          {panels.length > 0 && (
            <section className="mt-4 space-y-2">
              {panels.map(({ plugin, panel }) => (
                <PluginSlot key={`${plugin.definition.id}:${panel.id}`} plugin={plugin} actor={{ type: "user", userId: user.id, role: user.role }} render={(ctx) => panel.component({ productId, ctx })} />
              ))}
            </section>
          )}
```

Docs `apps/docs/content/docs/developers/plugins.mdx`: in the permissions list add `products:write`, `priceLists:read`, `priceLists:write`; in the data API section add a "Catalog (SDK 0.2.3)" subsection describing `products.upsertExternal`, `products.findExternal`, `productCategories.upsertExternal`, `priceLists.findExternal`, `priceLists.replaceExternal`, `prices.get` (one sentence each, from the Interfaces block above) and the `productPanel` slot.

- [ ] **Step 4: Run tests**

Run: `pnpm exec jest lib/plugins __tests__/plugins packages` → PASS. `pnpm exec tsc --noEmit && pnpm lint` → clean.

- [ ] **Step 5: Commit**

```bash
git add packages/plugin-sdk/src lib/plugins/data-api.ts lib/plugins/slots.ts lib/plugins/__tests__ lib/catalog/plugin-writes.ts "app/[locale]/(routes)/crm/products/[productId]/page.tsx" apps/docs/content/docs/developers/plugins.mdx
git commit -m "feat(plugins): SDK 0.2.3 catalog writes, prices and product panel"
```

---

### Task 5: Connector catalog mapping (pure)

**Files:**
- Create: `plugins/odoo-connector/catalog-map.ts`, `plugins/odoo-connector/lists.ts`
- Test: `plugins/odoo-connector/__tests__/catalog-map.test.ts`

**Interfaces:**
- Consumes: SDK types `ExternalProductInput`, `ExternalRuleInput`.
- Produces:
  - `type M2O = [number, string] | false`
  - `interface OdooVariant { id; display_name; default_code: string|false; description_sale: string|false; type: string; active: boolean; sale_ok: boolean; lst_price: number; standard_price: number; currency_id: M2O; taxes_id: number[]; uom_id: M2O; categ_id: M2O; product_tmpl_id: M2O; write_date: string }`
  - `interface OdooCategory { id: number; name: string; parent_id: M2O }`
  - `interface OdooRule { id; applied_on: string; product_tmpl_id: M2O; product_id: M2O; categ_id: M2O; min_quantity: number; date_start: string|false; date_end: string|false; compute_price: string; fixed_price: number; percent_price: number; base: string; base_pricelist_id: M2O; price_discount: number; price_markup?: number; price_surcharge: number; price_round: number; price_min_margin: number; price_max_margin: number }`
  - `VARIANT_FIELDS: string[]`, `RULE_FIELDS: string[]`
  - `categoryOrder(cats: OdooCategory[]): OdooCategory[]` (parents first)
  - `variantFields(v: OdooVariant, taxRate: (ids: number[]) => string | null): ExternalProductInput`
  - `mapRules(items: OdooRule[], variantsOf: (tmplId: number) => number[], known: Set<string>): { rules: ExternalRuleInput[]; skipped: { ruleId: number; reason: string }[] }`
  - `baseRefs(items: OdooRule[]): number[]`
  - `orderLists(deps: Map<number, number[]>): { order: number[]; cyclic: number[] }` (bases before users)

- [ ] **Step 1: Write the failing tests**

```ts
// plugins/odoo-connector/__tests__/catalog-map.test.ts
import { baseRefs, categoryOrder, mapRules, orderLists, variantFields, type OdooRule, type OdooVariant } from "../catalog-map";

const v = (over: Partial<OdooVariant> = {}): OdooVariant => ({ id: 332, display_name: "[800004] Cup (600 ml)", default_code: "800004", description_sale: false, type: "consu", active: true, sale_ok: true,
  lst_price: 1.89, standard_price: 0.9, currency_id: [9, "CZK"], taxes_id: [27], uom_id: [1, "ks"], categ_id: [7, "Cups"], product_tmpl_id: [899, "Cup"], write_date: "2026-10-10 08:00:00", ...over });
const tax = (ids: number[]) => (ids.length === 1 ? ({ 27: "21", 20: "12" } as Record<number, string>)[ids[0]] ?? null : null);

it("maps a variant to an external product", () => {
  expect(variantFields(v(), tax)).toEqual({ name: "[800004] Cup (600 ml)", sku: "800004", description: null, type: "PRODUCT", status: "ACTIVE", unit_price: "1.89", unit_cost: "0.9", currency: "CZK", tax_rate: "21", unit: "ks", categoryRef: "7" });
});

it("maps services, archived or unsellable variants, no or several taxes", () => {
  expect(variantFields(v({ type: "service" }), tax).type).toBe("SERVICE");
  expect(variantFields(v({ active: false }), tax).status).toBe("ARCHIVED");
  expect(variantFields(v({ sale_ok: false }), tax).status).toBe("ARCHIVED");
  expect(variantFields(v({ taxes_id: [] }), tax).tax_rate).toBeNull();
  expect(variantFields(v({ taxes_id: [27, 20] }), tax).tax_rate).toBeNull();
  expect(variantFields(v({ default_code: false, categ_id: false, uom_id: false }), tax)).toMatchObject({ sku: null, categoryRef: null, unit: null });
});

it("orders categories parents first", () => {
  const out = categoryOrder([{ id: 3, name: "Aroma", parent_id: [2, "Materiál"] }, { id: 2, name: "Materiál", parent_id: [1, "Zásoby"] }, { id: 1, name: "Zásoby", parent_id: false }]);
  expect(out.map((c) => c.id)).toEqual([1, 2, 3]);
});

const r = (over: Partial<OdooRule>): OdooRule => ({ id: 1, applied_on: "3_global", product_tmpl_id: false, product_id: false, categ_id: false, min_quantity: 0, date_start: false, date_end: false,
  compute_price: "fixed", fixed_price: 0, percent_price: 0, base: "list_price", base_pricelist_id: false, price_discount: 0, price_surcharge: 0, price_round: 0, price_min_margin: 0, price_max_margin: 0, ...over });

it("expands a template rule to one rule per known variant and drops unknown ones", () => {
  const { rules, skipped } = mapRules([r({ id: 1285, applied_on: "1_product", product_tmpl_id: [912, "Lid"], fixed_price: 1.51, min_quantity: 1000 })], () => [500, 501, 502], new Set(["500", "501"]));
  expect(rules).toEqual([
    expect.objectContaining({ appliesTo: "PRODUCT", productRef: "500", fixedPrice: "1.51", minQuantity: "1000", computePrice: "FIXED", base: "LIST_PRICE", externalRef: "1285:500" }),
    expect.objectContaining({ productRef: "501", externalRef: "1285:501" }),
  ]);
  expect(skipped).toEqual([]);
});

it("maps category, variant, global, percentage and base-list rules", () => {
  const { rules } = mapRules([
    r({ id: 1, applied_on: "2_product_category", categ_id: [7, "Cups"], compute_price: "percentage", percent_price: 10, base: "pricelist", base_pricelist_id: [234, "Base"] }),
    r({ id: 2, applied_on: "0_product_variant", product_id: [500, "Lid"], fixed_price: 2 }),
    r({ id: 3, compute_price: "formula", base: "standard_price", price_markup: 30, price_surcharge: 5, price_round: 1 }),
  ], () => [], new Set(["500"]));
  expect(rules[0]).toMatchObject({ appliesTo: "CATEGORY", categoryRef: "7", computePrice: "PERCENTAGE", percentPrice: "10", base: "PRICE_LIST", basePriceListRef: "234", externalRef: "1" });
  expect(rules[1]).toMatchObject({ appliesTo: "PRODUCT", productRef: "500", fixedPrice: "2" });
  expect(rules[2]).toMatchObject({ appliesTo: "ALL", computePrice: "FORMULA", base: "COST", priceDiscount: "-30", priceSurcharge: "5", priceRound: "1" });
});

it("skips rules core cannot represent, with a reason", () => {
  const { rules, skipped } = mapRules([r({ id: 9, applied_on: "4_combo" }), r({ id: 10, base: "foo" })], () => [], new Set());
  expect(rules).toEqual([]);
  expect(skipped).toEqual([{ ruleId: 9, reason: "applied_on 4_combo" }, { ruleId: 10, reason: "base foo" }]);
});

it("lists base lists and orders lists bases first; a cycle is reported (Review Focus 2)", () => {
  expect(baseRefs([r({ base: "pricelist", base_pricelist_id: [234, "A"] }), r({ base: "list_price" })])).toEqual([234]);
  expect(orderLists(new Map([[245, [234]], [234, [233]], [233, []]]))).toEqual({ order: [233, 234, 245], cyclic: [] });
  expect(orderLists(new Map([[1, [2]], [2, [1]], [3, []]]))).toEqual({ order: [3], cyclic: [1, 2] });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec jest plugins/odoo-connector/__tests__/catalog-map.test.ts` → FAIL (module not found).

- [ ] **Step 3: Implement**

```ts
// plugins/odoo-connector/catalog-map.ts
import type { ExternalProductInput, ExternalRuleInput } from "@nextcrm/plugin-sdk";

export type M2O = [number, string] | false;
export interface OdooVariant {
  id: number; display_name: string; default_code: string | false; description_sale: string | false; type: string;
  active: boolean; sale_ok: boolean; lst_price: number; standard_price: number; currency_id: M2O; taxes_id: number[];
  uom_id: M2O; categ_id: M2O; product_tmpl_id: M2O; write_date: string;
}
export interface OdooCategory { id: number; name: string; parent_id: M2O }
export interface OdooRule {
  id: number; applied_on: string; product_tmpl_id: M2O; product_id: M2O; categ_id: M2O; min_quantity: number;
  date_start: string | false; date_end: string | false; compute_price: string; fixed_price: number; percent_price: number;
  base: string; base_pricelist_id: M2O; price_discount: number; price_markup?: number; price_surcharge: number;
  price_round: number; price_min_margin: number; price_max_margin: number;
}

export const VARIANT_FIELDS = ["id", "display_name", "default_code", "description_sale", "type", "active", "sale_ok", "lst_price", "standard_price", "currency_id", "taxes_id", "uom_id", "categ_id", "product_tmpl_id", "write_date"];
export const RULE_FIELDS = ["id", "applied_on", "product_tmpl_id", "product_id", "categ_id", "min_quantity", "date_start", "date_end", "compute_price", "fixed_price", "percent_price", "base", "base_pricelist_id", "price_discount", "price_markup", "price_surcharge", "price_round", "price_min_margin", "price_max_margin", "write_date"];

const s = (n: number) => String(n);
const orNull = (n: number) => (n ? String(n) : null);

export function categoryOrder(cats: OdooCategory[]): OdooCategory[] {
  const byId = new Map(cats.map((c) => [c.id, c]));
  const depth = (c: OdooCategory, seen = new Set<number>()): number =>
    c.parent_id && byId.has(c.parent_id[0]) && !seen.has(c.id) ? 1 + depth(byId.get(c.parent_id[0])!, seen.add(c.id)) : 0;
  return [...cats].sort((a, b) => depth(a) - depth(b) || a.id - b.id);
}

export function variantFields(v: OdooVariant, taxRate: (ids: number[]) => string | null): ExternalProductInput {
  return {
    name: v.display_name,
    sku: v.default_code || null,
    description: v.description_sale || null,
    type: v.type === "service" ? "SERVICE" : "PRODUCT",
    status: v.active && v.sale_ok ? "ACTIVE" : "ARCHIVED",
    unit_price: s(v.lst_price),
    unit_cost: s(v.standard_price),
    currency: v.currency_id ? v.currency_id[1] : "",
    tax_rate: taxRate(v.taxes_id),
    unit: v.uom_id ? v.uom_id[1] : null,
    categoryRef: v.categ_id ? s(v.categ_id[0]) : null,
  };
}

const COMPUTE: Record<string, ExternalRuleInput["computePrice"]> = { fixed: "FIXED", percentage: "PERCENTAGE", formula: "FORMULA" };
const BASE: Record<string, ExternalRuleInput["base"]> = { list_price: "LIST_PRICE", standard_price: "COST", pricelist: "PRICE_LIST" };

export function mapRules(items: OdooRule[], variantsOf: (tmplId: number) => number[], known: Set<string>) {
  const rules: ExternalRuleInput[] = [];
  const skipped: { ruleId: number; reason: string }[] = [];
  for (const it of items) {
    const compute = COMPUTE[it.compute_price];
    const base = BASE[it.base];
    if (!compute) { skipped.push({ ruleId: it.id, reason: `compute_price ${it.compute_price}` }); continue; }
    if (!base) { skipped.push({ ruleId: it.id, reason: `base ${it.base}` }); continue; }
    const common: Omit<ExternalRuleInput, "appliesTo" | "productRef" | "categoryRef" | "externalRef"> = {
      minQuantity: s(it.min_quantity ?? 0),
      dateStart: it.date_start || null,
      dateEnd: it.date_end || null,
      computePrice: compute,
      fixedPrice: compute === "FIXED" ? s(it.fixed_price) : null,
      percentPrice: compute === "PERCENTAGE" ? s(it.percent_price) : null,
      base,
      basePriceListRef: base === "PRICE_LIST" && it.base_pricelist_id ? s(it.base_pricelist_id[0]) : null,
      // Ruling 4: Odoo 18+ cost rules use price_markup; core applies priceDiscount to every base.
      priceDiscount: s(base === "COST" && it.price_markup ? -it.price_markup : it.price_discount ?? 0),
      priceSurcharge: s(it.price_surcharge ?? 0),
      priceRound: orNull(it.price_round),
      priceMinMargin: orNull(it.price_min_margin),
      priceMaxMargin: orNull(it.price_max_margin),
    };
    if (it.applied_on === "3_global") rules.push({ ...common, appliesTo: "ALL", productRef: null, categoryRef: null, externalRef: s(it.id) });
    else if (it.applied_on === "2_product_category" && it.categ_id) rules.push({ ...common, appliesTo: "CATEGORY", productRef: null, categoryRef: s(it.categ_id[0]), externalRef: s(it.id) });
    else if (it.applied_on === "0_product_variant" && it.product_id) {
      if (known.has(s(it.product_id[0]))) rules.push({ ...common, appliesTo: "PRODUCT", productRef: s(it.product_id[0]), categoryRef: null, externalRef: s(it.id) });
    } else if (it.applied_on === "1_product" && it.product_tmpl_id) {
      for (const vid of variantsOf(it.product_tmpl_id[0])) {
        if (known.has(s(vid))) rules.push({ ...common, appliesTo: "PRODUCT", productRef: s(vid), categoryRef: null, externalRef: `${it.id}:${vid}` });
      }
    } else skipped.push({ ruleId: it.id, reason: `applied_on ${it.applied_on}` });
  }
  return { rules, skipped };
}

export function baseRefs(items: OdooRule[]): number[] {
  return Array.from(new Set(items.filter((i) => i.base === "pricelist" && i.base_pricelist_id).map((i) => (i.base_pricelist_id as [number, string])[0])));
}

/** Topological order, bases first; lists on or behind a cycle are returned as cyclic. */
export function orderLists(deps: Map<number, number[]>): { order: number[]; cyclic: number[] } {
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
  return { order, cyclic: Array.from(state.entries()).filter(([, v]) => v === "bad").map(([k]) => k).sort((a, b) => a - b) };
}
```

`lists.ts` is not needed as a separate file: `baseRefs` and `orderLists` live in `catalog-map.ts` (ledger: Ruling — spec § 3 listed `lists.ts`; merged into `catalog-map.ts` because both are three-line pure helpers).

- [ ] **Step 4: Run tests**

Run: `pnpm exec jest plugins/odoo-connector/__tests__/catalog-map.test.ts` → PASS (7). `pnpm exec tsc --noEmit` → clean.

- [ ] **Step 5: Commit**

```bash
git add plugins/odoo-connector/catalog-map.ts plugins/odoo-connector/__tests__/catalog-map.test.ts
git commit -m "feat(odoo-connector): catalog mapping for categories, variants and price rules"
```

---

### Task 6: Connector catalog sync step

**Files:**
- Create: `plugins/odoo-connector/catalog.ts`
- Modify: `plugins/odoo-connector/settings.ts` (setting `priceLists`), `plugins/odoo-connector/store.ts` (keys, `AccountLink.odooPriceList`, `RunSummary.catalog`), `plugins/odoo-connector/map.ts` (`PARTNER_FIELDS` + `property_product_pricelist`, `OdooPartner` field), `plugins/odoo-connector/sync.ts` (store the partner's list on the link; call `syncCatalog` in `runSync`), `plugins/odoo-connector/__tests__/helpers.ts` (fake catalog handlers)
- Test: `plugins/odoo-connector/__tests__/catalog.test.ts`

**Interfaces:**
- Consumes: Task 5 mapping; SDK `ctx.data.products/productCategories/priceLists`.
- Produces:
  - Setting `priceLists: z.string().default("")` (comma/space separated Odoo list ids); `chosenLists(ctx): number[]`.
  - Store keys `K.product(id)` → `ProductLink { productId: string; tmplId: number | null; categoryRef: string | null }`, `K.category(id)` → `{ categoryId: string; parentRef: string | null }`, `K.pricelist(id)` → `PriceListLink { priceListId: string; name: string; ruleCount: number; syncedAt: string }`, `K.skipped(listId)` → `{ ruleId: number; reason: string }[]`, `K.catalogCursor` → `{ at }`, `K.retryProduct(id)`.
  - `AccountLink.odooPriceList?: [number, string] | null`.
  - `CatalogCounts { categories: number; productsCreated: number; productsUpdated: number; productsFailed: number; listsReplaced: number; listsMissing: number[]; accountLists: number }`, `RunSummary.catalog?: CatalogCounts`.
  - `syncCatalog(r: { ctx: Ctx; client: OdooClient; dry: boolean; now: Date }): Promise<CatalogCounts>` — throws on Odoo errors (the run fails), per-product write errors are counted and retried.

- [ ] **Step 1: Write the failing tests**

Extend `__tests__/helpers.ts`: `odoo(partners, users, catalog?)` where `catalog = { categories: OdooCategory[]; variants: OdooVariant[]; lists: { id: number; name: string; currency_id: M2O; active?: boolean; write_date: string }[]; items: (OdooRule & { pricelist_id: M2O; write_date: string })[]; taxes: { id: number; amount: number; amount_type: string }[] }` adds handlers `product.category/search_read`, `product.product/search_read` (evaluates `["id","in",…]`, `["product_tmpl_id","in",…]`, `"|"` pairs over `write_date`/`product_tmpl_id.write_date` with `>`; returns rows with requested fields), `product.pricelist/search_read` (`["id","in",…]`, honours `active_test`), `product.pricelist.item/search_read` (`["pricelist_id","in",…]`), `account.tax/read`. `mk(...)` gains a `catalog` argument and passes `data: { …, products: [], productCategories: [], priceLists: [], priceListRules: [] }`.

```ts
// plugins/odoo-connector/__tests__/catalog.test.ts
import { runSync } from "../sync";
import { K } from "../store";
import { company, mkCatalog, now } from "./helpers";

const later = (min: number) => new Date(now.getTime() + min * 60_000);
const cat = () => ({
  categories: [{ id: 1, name: "Zásoby", parent_id: false as const }, { id: 7, name: "Cups", parent_id: [1, "Zásoby"] as [number, string] }],
  variants: [
    { id: 500, display_name: "[800017] Lid", default_code: "800017", description_sale: false as const, type: "consu", active: true, sale_ok: true, lst_price: 1.67, standard_price: 1, currency_id: [9, "CZK"] as [number, string], taxes_id: [27], uom_id: [1, "ks"] as [number, string], categ_id: [7, "Cups"] as [number, string], product_tmpl_id: [912, "Lid"] as [number, string], write_date: "2026-10-10 08:00:00" },
    { id: 501, display_name: "[800018] Straw", default_code: "800018", description_sale: false as const, type: "consu", active: true, sale_ok: true, lst_price: 2, standard_price: 1, currency_id: [9, "CZK"] as [number, string], taxes_id: [27], uom_id: [1, "ks"] as [number, string], categ_id: [7, "Cups"] as [number, string], product_tmpl_id: [913, "Straw"] as [number, string], write_date: "2026-10-10 08:00:00" },
  ],
  lists: [
    { id: 234, name: "Base CZK", currency_id: [9, "CZK"] as [number, string], active: false, write_date: "2026-10-10 08:00:00" },
    { id: 245, name: "Gold CZK", currency_id: [9, "CZK"] as [number, string], active: true, write_date: "2026-10-10 08:00:00" },
  ],
  items: [
    { id: 1, pricelist_id: [234, "Base CZK"] as [number, string], applied_on: "2_product_category", categ_id: [7, "Cups"] as [number, string], compute_price: "percentage", percent_price: 10, base: "list_price", write_date: "2026-10-10 08:00:00" },
    { id: 1285, pricelist_id: [245, "Gold CZK"] as [number, string], applied_on: "1_product", product_tmpl_id: [912, "Lid"] as [number, string], compute_price: "fixed", fixed_price: 1.51, min_quantity: 1000, base: "list_price", write_date: "2026-10-10 08:00:00" },
    { id: 1290, pricelist_id: [245, "Gold CZK"] as [number, string], applied_on: "3_global", compute_price: "percentage", percent_price: 0, base: "pricelist", base_pricelist_id: [234, "Base CZK"] as [number, string], write_date: "2026-10-10 08:00:00" },
  ],
  taxes: [{ id: 27, amount: 21, amount_type: "percent" }],
});

it("imports categories, products, the chosen list and its archived base, and the account's list", async () => {
  const c = cat();
  const { ctx, client, data } = mkCatalog([company(1, { property_product_pricelist: [245, "Gold CZK"] })], c, { priceLists: "245" });
  const s = await runSync(ctx, client, now);
  expect(s).toMatchObject({ ok: true, catalog: { categories: 2, productsCreated: 2, listsReplaced: 2, accountLists: 1 } });
  expect(data.productCategories.map((x) => x.externalRef)).toEqual(["1", "7"]);
  expect(data.products.map((x) => x.sku)).toEqual(["800017", "800018"]);
  expect(data.priceLists).toEqual([expect.objectContaining({ externalRef: "234", isActive: false }), expect.objectContaining({ externalRef: "245", isActive: true })]);
  expect(data.priceListRules.filter((x) => x.priceListId === data.priceLists[1].id).map((x) => x.externalRef)).toEqual(["1285:500", "1290"]);
  expect(data.accounts[0].pricelist_id).toBe(data.priceLists[1].id);
});

it("updates a changed product and drops a rule deleted in Odoo", async () => {
  const c = cat();
  const { ctx, client, data } = mkCatalog([company(1)], c, { priceLists: "245" });
  await runSync(ctx, client, now);
  Object.assign(c.variants[0], { lst_price: 1.7, write_date: "2026-10-13 07:59:00" });
  c.items.splice(1, 1);   // rule 1285 deleted in Odoo
  await runSync(ctx, client, later(20));
  expect(data.products[0].unit_price).toBe("1.7");
  expect(data.priceListRules.filter((x) => x.priceListId === data.priceLists[1].id).map((x) => x.externalRef)).toEqual(["1290"]);
});

it("does not replace unchanged lists on the next run", async () => {
  const { ctx, client } = mkCatalog([company(1)], cat(), { priceLists: "245" });
  await runSync(ctx, client, now);
  const s = await runSync(ctx, client, later(20));
  expect(s.catalog).toMatchObject({ productsCreated: 0, listsReplaced: 0 });
});

it("archives a variant that is no longer sellable", async () => {
  const c = cat();
  const { ctx, client, data } = mkCatalog([company(1)], c, { priceLists: "245" });
  await runSync(ctx, client, now);
  Object.assign(c.variants[1], { sale_ok: false, write_date: "2026-10-13 07:59:00" });
  await runSync(ctx, client, later(20));
  expect(data.products[1].status).toBe("ARCHIVED");
});

it("writes nothing in a dry run, including account lists and the catalog cursor (Review Focus 5)", async () => {
  const { ctx, client, data } = mkCatalog([company(1, { property_product_pricelist: [245, "Gold CZK"] })], cat(), { priceLists: "245", dryRun: true });
  const s = await runSync(ctx, client, now);
  expect(s.catalog).toMatchObject({ productsCreated: 2, listsReplaced: 2 });
  expect(data.products).toEqual([]);
  expect(data.priceLists).toEqual([]);
  expect(await ctx.store.get(K.catalogCursor)).toBeNull();
});

it("logs a chosen list that does not exist in Odoo and imports the others (Review Focus 1)", async () => {
  const { ctx, client, data } = mkCatalog([company(1)], cat(), { priceLists: "245, 999" });
  const s = await runSync(ctx, client, now);
  expect(s).toMatchObject({ ok: true, catalog: { listsMissing: [999] } });
  expect(data.priceLists).toHaveLength(2);
  expect(ctx.logs.some((l) => l.message.includes("Odoo price list 999 not found"))).toBe(true);
});

it("fails one product whose SKU a CRM product uses, imports the rest, retries it (Review Focus 3)", async () => {
  const { ctx, client, data } = mkCatalog([company(1)], cat(), { priceLists: "" });
  data.products.push({ id: "crm-1", source: "CRM", sku: "800017", deletedAt: null });
  const upsert = ctx.data.products.upsertExternal.bind(ctx.data.products);
  (ctx.data.products as { upsertExternal: unknown }).upsertExternal = async (ref: string, f: { sku: string | null }) => {
    if (f.sku === "800017") throw new Error("SKU used by a CRM product: 800017");
    return upsert(ref, f as never);
  };
  const s = await runSync(ctx, client, now);
  expect(s.catalog).toMatchObject({ productsCreated: 1, productsFailed: 1 });
  expect(await ctx.store.get(K.retryProduct(500))).not.toBeNull();
  expect(ctx.logs.some((l) => l.message.includes("SKU used by a CRM product: 800017"))).toBe(true);
});

it("keeps an account's list when the customer's Odoo list is not imported", async () => {
  const { ctx, client, data } = mkCatalog([company(1, { property_product_pricelist: [250, "Other"] })], cat(), { priceLists: "245" });
  await runSync(ctx, client, now);
  expect(data.accounts[0].pricelist_id).toBeUndefined();
  expect((await ctx.store.get<{ odooPriceList: unknown }>(K.account(data.accounts[0].id as string)))?.odooPriceList).toEqual([250, "Other"]);
});
```

`mkCatalog(partners, catalog, settings)` (in helpers) returns `{ ctx, client, data }` where `data` holds the arrays passed to `createTestContext` (`accounts`, `products`, `productCategories`, `priceLists`, `priceListRules`).

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec jest plugins/odoo-connector/__tests__/catalog.test.ts` → FAIL (`mkCatalog` / `syncCatalog` missing).

- [ ] **Step 3: Implement**

`settings.ts`: add `priceLists: z.string().default(""),` and

```ts
/** Plan Ruling 2: the chosen Odoo price lists as a text setting ("242, 245"). */
export const chosenLists = (ctx: Ctx): number[] =>
  Array.from(new Set(ctx.settings.priceLists.split(/[\s,;]+/).filter(Boolean).map(Number).filter((n) => Number.isInteger(n) && n > 0)));
```

`store.ts`: add to `K`:

```ts
  product: (id: number) => `product:${id}`,           // → ProductLink
  category: (id: number) => `category:${id}`,         // → { categoryId, parentRef }
  retryProduct: (id: number) => `retryProduct:${id}`, // → {} a variant whose last write failed
  pricelist: (id: number) => `pricelist:${id}`,       // → PriceListLink
  skipped: (id: number) => `skipped:${id}`,           // → { ruleId, reason }[] rules core cannot represent
  catalogCursor: "meta:catalogCursor",                // → { at: Odoo write_date }
```

and `export interface ProductLink { productId: string; tmplId: number | null; categoryRef: string | null }`, `export interface PriceListLink { priceListId: string; name: string; ruleCount: number; syncedAt: string }`, `export interface CatalogCounts { categories: number; productsCreated: number; productsUpdated: number; productsFailed: number; listsReplaced: number; listsMissing: number[]; accountLists: number }`, `AccountLink.odooPriceList?: [number, string] | null`, `RunSummary.catalog?: CatalogCounts`.

`map.ts`: add `"property_product_pricelist"` to `PARTNER_FIELDS` and `property_product_pricelist?: M2O` to `OdooPartner`.

`sync.ts` `syncCustomer`: in the final `ctx.store.set(K.account(accountId), …)` add `odooPriceList: p.property_product_pricelist || null`. In `runSync`, after `const top = …` and before setting the customer cursor:

```ts
    r.catalog = await syncCatalog({ ctx, client, dry, now });
```

(add `catalog?: CatalogCounts` to the local `Run` and put `catalog: r.catalog` into both summaries).

```ts
// plugins/odoo-connector/catalog.ts
import { categoryOrder, mapRules, baseRefs, orderLists, variantFields, RULE_FIELDS, VARIANT_FIELDS, type OdooCategory, type OdooRule, type OdooVariant } from "./catalog-map";
import type { ExternalProductInput } from "@nextcrm/plugin-sdk";
import type { OdooClient } from "./odoo";
import { chosenLists, type Ctx } from "./settings";
import { K, type AccountLink, type CatalogCounts, type PriceListLink, type ProductLink } from "./store";

const OVERLAP_MS = 2 * 60_000;
const PAGE = 200;
const odooTime = (d: Date) => d.toISOString().slice(0, 19).replace("T", " ");
const fromOdoo = (s: string) => new Date(`${s.replace(" ", "T")}Z`);
type ListRow = { id: number; name: string; currency_id: [number, string] | false; active: boolean; write_date: string };
type Item = OdooRule & { pricelist_id: [number, string] | false; write_date: string };

export async function syncCatalog({ ctx, client, dry, now }: { ctx: Ctx; client: OdooClient; dry: boolean; now: Date }): Promise<CatalogCounts> {
  const counts: CatalogCounts = { categories: 0, productsCreated: 0, productsUpdated: 0, productsFailed: 0, listsReplaced: 0, listsMissing: [], accountLists: 0 };
  const cursor = (await ctx.store.get<{ at: string }>(K.catalogCursor))?.at ?? null;
  const since = cursor ? odooTime(new Date(fromOdoo(cursor).getTime() - OVERLAP_MS)) : null;
  let top = cursor;
  const seen = (w: string) => { if (!top || w > top) top = w; };

  // 1. Categories: all, parents first.
  const cats = categoryOrder(await client.call<OdooCategory[]>("product.category", "search_read", { domain: [], fields: ["id", "name", "parent_id"] }));
  for (const c of cats) {
    counts.categories++;
    if (dry) continue;
    const parentRef = c.parent_id ? String(c.parent_id[0]) : null;
    const { id: categoryId } = await ctx.data.productCategories.upsertExternal(String(c.id), { name: c.name, parentRef });
    await ctx.store.set(K.category(c.id), { categoryId, parentRef });
  }

  // 2. Products: changed variants (own or template write_date), plus those marked for retry.
  const fields = await availableFields(client, "product.product", VARIANT_FIELDS);
  const retry = (await ctx.store.list("retryProduct:")).map((e) => Number(e.key.slice(13)));
  const domain = since
    ? ["|", "|", ["write_date", ">", since], ["product_tmpl_id.write_date", ">", since], ["id", "in", retry]]
    : [["sale_ok", "in", [true, false]]];
  const taxes = new Map<number, string | null>();
  const taxRate = (ids: number[]) => (ids.length === 1 ? taxes.get(ids[0]) ?? null : null);
  for (let offset = 0; ; offset += PAGE) {
    const rows = await client.call<OdooVariant[]>("product.product", "search_read", { domain, fields, limit: PAGE, offset, order: "id asc", context: { active_test: false } });
    const missing = Array.from(new Set(rows.flatMap((v) => v.taxes_id))).filter((id) => !taxes.has(id));
    if (missing.length) {
      for (const t of await client.call<{ id: number; amount: number; amount_type: string }[]>("account.tax", "read", { ids: missing, fields: ["amount", "amount_type"] })) {
        taxes.set(t.id, t.amount_type === "percent" ? String(t.amount) : null);
      }
    }
    for (const v of rows) {
      seen(v.write_date);
      const known = await ctx.store.get<ProductLink>(K.product(v.id));
      // Never-sellable variants that were never imported are not catalog products.
      if (!known && !(v.sale_ok && v.active)) continue;
      const f = variantFields(v, taxRate);
      // The 2-minute overlap re-reads recent variants; an unchanged one is not written (and does not trigger list replaces).
      if (known && !(await ctx.store.get(K.retryProduct(v.id))) && sameProduct(await ctx.data.products.get(known.productId), f, known)) continue;
      if (dry) { counts[known ? "productsUpdated" : "productsCreated"]++; ctx.log.info(`Dry run: would ${known ? "update" : "create"} product`, { odooId: v.id, ...f }); continue; }
      try {
        const res = await ctx.data.products.upsertExternal(String(v.id), f);
        counts[res.created ? "productsCreated" : "productsUpdated"]++;
        await ctx.store.set(K.product(v.id), { productId: res.id, tmplId: v.product_tmpl_id ? v.product_tmpl_id[0] : null, categoryRef: f.categoryRef } satisfies ProductLink);
        await ctx.store.delete(K.retryProduct(v.id));
      } catch (e) {
        counts.productsFailed++;
        ctx.log.error(`Product ${v.id} failed: ${e instanceof Error ? e.message : String(e)}`, { odooId: v.id });
        await ctx.store.set(K.retryProduct(v.id), {});
      }
    }
    if (rows.length < PAGE) break;
  }

  const productsChanged = counts.productsCreated + counts.productsUpdated > 0;

  // 3. Price lists: chosen + bases (recursively, archived included), bases first.
  const chosen = chosenLists(ctx);
  const lists = new Map<number, ListRow>();
  const items = new Map<number, Item[]>();
  let frontier = chosen;
  while (frontier.length) {
    const rows = await client.call<ListRow[]>("product.pricelist", "search_read", { domain: [["id", "in", frontier]], fields: ["id", "name", "currency_id", "active", "write_date"], context: { active_test: false } });
    for (const id of frontier) if (!rows.some((l) => l.id === id) && chosen.includes(id)) {
      counts.listsMissing.push(id);
      ctx.log.warn(`Odoo price list ${id} not found`);
    }
    const ruleFields = await availableFields(client, "product.pricelist.item", RULE_FIELDS);
    const its = rows.length ? await client.call<Item[]>("product.pricelist.item", "search_read", { domain: [["pricelist_id", "in", rows.map((l) => l.id)]], fields: [...ruleFields, "pricelist_id"], context: { active_test: false } }) : [];
    for (const l of rows) { lists.set(l.id, l); items.set(l.id, its.filter((i) => i.pricelist_id && i.pricelist_id[0] === l.id)); }
    frontier = Array.from(new Set(rows.flatMap((l) => baseRefs(items.get(l.id)!)))).filter((id) => !lists.has(id));
  }
  const { order, cyclic } = orderLists(new Map(Array.from(lists.keys()).map((id) => [id, baseRefs(items.get(id)!).filter((b) => lists.has(b))])));
  for (const id of cyclic) ctx.log.warn(`Price list ${id} skipped: its base lists form a cycle`);
  const known = new Set((await ctx.data.products.findExternal()).map((p) => p.ref));
  const tmplVariants = new Map<number, number[]>();
  for (const e of await ctx.store.list("product:")) {
    const { tmplId } = e.value as ProductLink;
    if (tmplId) tmplVariants.set(tmplId, [...(tmplVariants.get(tmplId) ?? []), Number(e.key.slice(8))]);
  }
  const listIds = new Map<number, string>();
  for (const id of order) {
    const l = lists.get(id)!;
    const its = items.get(id)!;
    const prev = await ctx.store.get<PriceListLink>(K.pricelist(id));
    // Replace when new, when the list or a rule changed in Odoo, when a rule was deleted (count), or when products
    // changed this run (a template rule may now expand to a different set of variants).
    const changed = !prev || !cursor || l.write_date > cursor || its.some((i) => i.write_date > cursor) || prev.ruleCount !== its.length || productsChanged;
    its.forEach((i) => seen(i.write_date)); seen(l.write_date);
    const { rules, skipped } = mapRules(its, (t) => tmplVariants.get(t) ?? [], known);
    if (!dry) await ctx.store.set(K.skipped(id), skipped);
    if (prev && !changed) { listIds.set(id, prev.priceListId); continue; }
    counts.listsReplaced++;
    if (dry) { ctx.log.info("Dry run: would replace price list", { odooId: id, name: l.name, rules: rules.length, skipped: skipped.length }); continue; }
    const { id: priceListId } = await ctx.data.priceLists.replaceExternal(String(id), { name: l.name, currency: l.currency_id ? l.currency_id[1] : "", isActive: chosen.includes(id) && l.active }, rules);
    listIds.set(id, priceListId);
    await ctx.store.set(K.pricelist(id), { priceListId, name: l.name, ruleCount: its.length, syncedAt: now.toISOString() } satisfies PriceListLink);
  }

  // 4. Account price lists follow the Odoo customer (Pavel 2026-10-10).
  for (const e of await ctx.store.list("account:")) {
    const link = e.value as AccountLink;
    const odooList = link.odooPriceList ? link.odooPriceList[0] : null;
    const priceListId = odooList ? listIds.get(odooList) ?? (await ctx.store.get<PriceListLink>(K.pricelist(odooList)))?.priceListId : undefined;
    if (!priceListId) continue;
    const accountId = e.key.slice(8);
    const acc = await ctx.data.accounts.get(accountId);
    if (!acc || acc.pricelist_id === priceListId) continue;
    counts.accountLists++;
    if (!dry) await ctx.data.accounts.update(accountId, { pricelist_id: priceListId });
  }

  if (!dry && top) await ctx.store.set(K.catalogCursor, { at: top });
  return counts;
}

/** True when the stored product already has these values (decimals compared as numbers). */
function sameProduct(row: Record<string, unknown> | null, f: ExternalProductInput, link: ProductLink): boolean {
  if (!row) return false;
  const num = (a: unknown, b: string | null) => (a == null || b == null ? a == b : Number(a) === Number(b));
  return row.name === f.name && (row.sku ?? null) === f.sku && (row.description ?? null) === f.description && row.type === f.type
    && row.status === f.status && num(row.unit_price, f.unit_price) && num(row.unit_cost, f.unit_cost) && row.currency === f.currency
    && num(row.tax_rate, f.tax_rate) && (row.unit ?? null) === f.unit && link.categoryRef === f.categoryRef;
}

async function availableFields(client: OdooClient, model: string, wanted: string[]) {
  const available = await client.call<Record<string, unknown>>(model, "fields_get", { attributes: ["type"] });
  return wanted.filter((f) => f in available);
}
```

Notes for the implementer:
- The customer cursor in `runSync` must move only after `syncCatalog` returns (it already runs inside the same `try`).

- [ ] **Step 4: Run tests**

Run: `pnpm exec jest plugins/odoo-connector` → PASS (all part 1 tests plus 8 new).

- [ ] **Step 5: Commit**

```bash
git add plugins/odoo-connector/catalog.ts plugins/odoo-connector/settings.ts plugins/odoo-connector/store.ts plugins/odoo-connector/map.ts plugins/odoo-connector/sync.ts plugins/odoo-connector/__tests__/helpers.ts plugins/odoo-connector/__tests__/catalog.test.ts
git commit -m "feat(odoo-connector): catalog sync of categories, products, price lists and account lists"
```

---

### Task 7: Queued admin jobs and Load price lists

**Files:**
- Create: `plugins/odoo-connector/jobs.ts`
- Modify: `plugins/odoo-connector/plugin.ts`, `plugins/odoo-connector/store.ts` (keys `job:sync`, `job:compare`, `meta:odooLists`), `plugins/odoo-connector/messages/{en,cz,de,uk}.json`
- Test: `plugins/odoo-connector/__tests__/jobs.test.ts`

**Interfaces:**
- Consumes: `runSync`, `scheduledSync` (part 1), `runCompare` (Task 8; until Task 8 lands, `jobs.ts` imports it from `./compare` which Task 8 creates — implement Task 8's empty export `export async function runCompare(ctx: Ctx, client: OdooClient, now: Date): Promise<void> {}` here first and let Task 8 fill it).
- Produces:
  - `K.job(name: "sync" | "compare")` → `{ requestedAt: string }`; `K.odooLists` → `{ at: string; lists: { id: number; name: string; currency: string; rules: number; active: boolean }[] }`.
  - `queueJob(ctx: Ctx, name: "sync" | "compare", now: Date): Promise<string>` (returns `ctx.t("admin.queued")`).
  - `runQueued(ctx: Ctx, now: Date, client?: OdooClient): Promise<void>` — runs a queued sync first, then a queued compare; deletes each job key when its run ends (success or failure).
  - `loadPriceLists(ctx: Ctx, client?: OdooClient): Promise<string>` — stores `K.odooLists`, returns `ctx.t("admin.listsLoaded", { count })`.
  - Cron handler: `await runQueued(ctx, now); await scheduledSync(ctx, now);`

- [ ] **Step 1: Write the failing tests**

```ts
// plugins/odoo-connector/__tests__/jobs.test.ts
import { K } from "../store";
import { loadPriceLists, queueJob, runQueued } from "../jobs";
import { company, mk, now } from "./helpers";

it("queues Sync now and runs it on the next cron tick, then clears the job", async () => {
  const accounts: Record<string, unknown>[] = [];
  const { ctx, client } = mk([company(1)], accounts);
  expect(await queueJob(ctx, "sync", now)).toBe("admin.queued");
  expect(accounts).toHaveLength(0);
  await runQueued(ctx, now, client);
  expect(accounts).toHaveLength(1);
  expect(await ctx.store.get(K.job("sync"))).toBeNull();
});

it("runs a queued sync before a queued compare, never both at once (Review Focus 4)", async () => {
  const { ctx, client } = mk([company(1)]);
  const order: string[] = [];
  jest.spyOn(require("../sync"), "runSync").mockImplementation(async () => { order.push(`sync:${!!(await ctx.store.get(K.lock))}`); return { ok: true } as never; });
  jest.spyOn(require("../compare"), "runCompare").mockImplementation(async () => { order.push("compare"); });
  await queueJob(ctx, "compare", now);
  await queueJob(ctx, "sync", now);
  await runQueued(ctx, now, client);
  expect(order).toEqual(["sync:false", "compare"]);
  jest.restoreAllMocks();
});

it("skips queued jobs while another run holds the lock", async () => {
  const { ctx, client } = mk([company(1)]);
  await ctx.store.set(K.lock, { until: new Date(now.getTime() + 60_000).toISOString() });
  await queueJob(ctx, "sync", now);
  await runQueued(ctx, now, client);
  expect(await ctx.store.get(K.job("sync"))).not.toBeNull();
});

it("loads Odoo price lists for the admin section", async () => {
  const { ctx, client } = mk([], [], {}, undefined, {
    "product.pricelist/search_read": () => [{ id: 245, name: "Gold CZK", currency_id: [9, "CZK"], item_ids: [1, 2], active: true }],
  });
  expect(await loadPriceLists(ctx, client)).toBe("admin.listsLoaded");
  expect(await ctx.store.get(K.odooLists)).toMatchObject({ lists: [{ id: 245, name: "Gold CZK", currency: "CZK", rules: 2, active: true }] });
});
```

(`mk` gains an optional 5th argument `extra: Record<string, Handler>` merged into the fake Odoo handlers.)

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec jest plugins/odoo-connector/__tests__/jobs.test.ts` → FAIL (module not found).

- [ ] **Step 3: Implement**

`store.ts` `K` additions:

```ts
  job: (name: "sync" | "compare") => `job:${name}`,   // → { requestedAt }
  odooLists: "meta:odooLists",                         // → { at, lists } loaded for the admin section
```

```ts
// plugins/odoo-connector/jobs.ts
import { jsonClient, type OdooClient } from "./odoo";
import type { Ctx } from "./settings";
import { K } from "./store";
import * as sync from "./sync";
import * as compare from "./compare";

export async function queueJob(ctx: Ctx, name: "sync" | "compare", now: Date): Promise<string> {
  await ctx.store.set(K.job(name), { requestedAt: now.toISOString() });
  return ctx.t("admin.queued");
}

/** Queued admin jobs run on the cron, one at a time: a sync before a compare (catalog spec § 4.7). */
export async function runQueued(ctx: Ctx, now: Date, client: OdooClient = jsonClient(ctx)): Promise<void> {
  const lock = await ctx.store.get<{ until: string }>(K.lock);
  if (lock && Date.parse(lock.until) > now.getTime()) return;
  if (await ctx.store.get(K.job("sync"))) {
    try { await sync.runSync(ctx, client, now); } finally { await ctx.store.delete(K.job("sync")); }
  }
  if (await ctx.store.get(K.job("compare"))) {
    try { await compare.runCompare(ctx, client, now); } finally { await ctx.store.delete(K.job("compare")); }
  }
}

export async function loadPriceLists(ctx: Ctx, client: OdooClient = jsonClient(ctx)): Promise<string> {
  const rows = await client.call<{ id: number; name: string; currency_id: [number, string] | false; item_ids: number[]; active: boolean }[]>(
    "product.pricelist", "search_read", { domain: [], fields: ["id", "name", "currency_id", "item_ids", "active"], order: "name asc" });
  const lists = rows.map((l) => ({ id: l.id, name: l.name, currency: l.currency_id ? l.currency_id[1] : "", rules: l.item_ids.length, active: l.active }));
  await ctx.store.set(K.odooLists, { at: new Date().toISOString(), lists });
  return ctx.t("admin.listsLoaded", { count: lists.length });
}
```

`plugin.ts`:

```ts
    x.cron("sync", "*/5 * * * *", async (ctx) => { const now = new Date(); await runQueued(ctx, now); await scheduledSync(ctx, now); });
    x.adminAction({ id: "test", label: "admin.test", handler: (ctx) => testConnection(ctx) });
    x.adminAction({ id: "sync", label: "admin.syncNow", handler: (ctx) => queueJob(ctx, "sync", new Date()) });
    x.adminAction({ id: "lists", label: "admin.loadLists", handler: (ctx) => loadPriceLists(ctx) });
    x.adminAction({ id: "compare", label: "admin.compare", handler: (ctx) => queueJob(ctx, "compare", new Date()) });
```

(`summaryText`/`runSync` imports drop from `plugin.ts` if unused; `onInstall` keeps calling `runSync`.)

Messages (`admin.*`), 4 locales:

| key | en | cz | de | uk |
|---|---|---|---|---|
| `queued` | Queued: it starts within 5 minutes. | Zařazeno: spustí se do 5 minut. | In der Warteschlange: Start innerhalb von 5 Minuten. | У черзі: запуститься протягом 5 хвилин. |
| `loadLists` | Load price lists | Načíst ceníky | Preislisten laden | Завантажити прайс-листи |
| `listsLoaded` | Loaded {count} price lists from Odoo. | Načteno {count} ceníků z Odoo. | {count} Preislisten aus Odoo geladen. | Завантажено {count} прайс-листів з Odoo. |
| `compare` | Compare with Odoo | Porovnat s Odoo | Mit Odoo vergleichen | Порівняти з Odoo |

- [ ] **Step 4: Run tests**

Run: `pnpm exec jest plugins/odoo-connector` → PASS. Update part 1 tests that called the `sync` admin action expecting a summary (`plugin.test.ts`): the action now returns `admin.queued`. `pnpm exec tsc --noEmit` → clean.

- [ ] **Step 5: Commit**

```bash
git add plugins/odoo-connector/jobs.ts plugins/odoo-connector/compare.ts plugins/odoo-connector/plugin.ts plugins/odoo-connector/store.ts plugins/odoo-connector/messages plugins/odoo-connector/__tests__/jobs.test.ts plugins/odoo-connector/__tests__/plugin.test.ts plugins/odoo-connector/__tests__/helpers.ts
git commit -m "feat(odoo-connector): queued Sync now and Compare jobs, Load price lists"
```

---

### Task 8: Compare with Odoo

**Files:**
- Modify: `plugins/odoo-connector/compare.ts` (from Task 7's stub), `plugins/odoo-connector/store.ts` (`compare:last`, `compare:progress`)
- Test: `plugins/odoo-connector/__tests__/compare.test.ts`

**Interfaces:**
- Consumes: Task 5 `mapRules`/`OdooRule`, Task 6 store links (`K.product`, `K.pricelist`), SDK `ctx.data.prices.get`.
- Produces:
  - `pickSample(rules: ExternalRuleInput[], products: { ref: string; categoryRef: string | null }[], parents: Map<string, string | null>, n = 20): { ref: string; quantities: number[] }[]`
  - `odooPrice(client, { pricelistId: number; currencyId: number; productId: number; quantity: number }): Promise<number>` (throws `OdooError("Odoo cannot price sale lines over the API", 0)` when no `price_unit` comes back)
  - `runCompare(ctx, client, now): Promise<void>` storing `K.compareLast` = `CompareResult { at: string; ok: boolean; error?: string; lists: { odooId: number; name: string; checked: number; failed: number }[]; mismatches: { list: string; product: string; quantity: number; crm: string; odoo: string; diff: string; reason: "rate" | "rule" }[] }` and progress `K.compareProgress` = `{ done: number; total: number }`.

- [ ] **Step 1: Write the failing tests**

```ts
// plugins/odoo-connector/__tests__/compare.test.ts
import type { ExternalRuleInput } from "@nextcrm/plugin-sdk";
import { odooPrice, pickSample, runCompare } from "../compare";
import { K, type CompareResult } from "../store";
import { mkCompare, now } from "./helpers";

const rule = (over: Partial<ExternalRuleInput>): ExternalRuleInput => ({ appliesTo: "ALL", productRef: null, categoryRef: null, minQuantity: "0", dateStart: null, dateEnd: null, computePrice: "FIXED", fixedPrice: "1",
  percentPrice: null, base: "LIST_PRICE", basePriceListRef: null, priceDiscount: "0", priceSurcharge: "0", priceRound: null, priceMinMargin: null, priceMaxMargin: null, externalRef: null, ...over });

it("samples product rules first, then category, base-list and no-rule products, with threshold quantities", () => {
  const products = [{ ref: "1", categoryRef: "7" }, { ref: "2", categoryRef: "8" }, { ref: "3", categoryRef: null }, { ref: "4", categoryRef: "9" }];
  const parents = new Map<string, string | null>([["7", null], ["8", "7"], ["9", null]]);
  const out = pickSample([rule({ appliesTo: "PRODUCT", productRef: "1", minQuantity: "1000" }), rule({ appliesTo: "CATEGORY", categoryRef: "7", minQuantity: "10" }), rule({ base: "PRICE_LIST", basePriceListRef: "234" })], products, parents, 3);
  expect(out).toEqual([{ ref: "1", quantities: [1, 1000, 999] }, { ref: "2", quantities: [1, 10, 9] }, { ref: "3", quantities: [1] }]);
});

it("is deterministic", () => {
  const products = [{ ref: "2", categoryRef: null }, { ref: "1", categoryRef: null }];
  expect(pickSample([], products, new Map())).toEqual(pickSample([], [...products].reverse(), new Map()));
});

it("asks Odoo for a line price through onchange and never creates a record", async () => {
  const { client, calls } = mkCompare({ price: 1.51 });
  expect(await odooPrice(client, { pricelistId: 245, currencyId: 9, productId: 500, quantity: 1000 })).toBe(1.51);
  expect(calls.map((c) => c.path)).toEqual(["/json/2/sale.order.line/onchange"]);
  expect(calls[0].body).toMatchObject({ values: { order_id: { id: false, pricelist_id: 245, currency_id: 9 }, product_id: 500, product_uom_qty: 1000 }, field_names: ["product_id"] });
});

it("stops with a clear message when Odoo cannot price over the API", async () => {
  const { ctx, client } = mkCompare({ price: undefined, priceLists: "245" });
  await runCompare(ctx, client, now);
  expect(await ctx.store.get<CompareResult>(K.compareLast)).toMatchObject({ ok: false, error: "Odoo cannot price sale lines over the API" });
});

it("finds a planted difference and labels rule versus rate", async () => {
  const { ctx, client } = mkCompare({ price: 1.51, crm: { "500:1000": { price: "1.67", currency: "CZK", ruleId: "r1" }, "501:1": { price: "0.08", currency: "EUR", ruleId: null } }, priceLists: "245" });
  await runCompare(ctx, client, now);
  const res = (await ctx.store.get<CompareResult>(K.compareLast))!;
  expect(res.ok).toBe(true);
  expect(res.mismatches).toEqual(expect.arrayContaining([
    expect.objectContaining({ quantity: 1000, crm: "1.67", odoo: "1.51", reason: "rule" }),
  ]));
  expect(res.lists[0]).toMatchObject({ odooId: 245, failed: expect.any(Number) });
});
```

`mkCompare({ price, crm, priceLists })` in helpers: a context with one imported list (`K.pricelist(245)` → `{ priceListId: "L245", name: "Gold CZK", … }`), two imported products (`K.product(500/501)` → `{ productId, tmplId: 912/913, categoryRef: "7" }`, `K.category(7)` → `{ categoryId: "c7", parentRef: null }`, and EXTERNAL product rows), fake Odoo handlers for `product.pricelist/read` (currency `[9,"CZK"]`), `product.pricelist.item/search_read` (one template rule min 1000 on 500), `fields_get`, and `sale.order.line/onchange` returning `{ value: { price_unit: price } }` (or `{ value: {} }` when `price` is undefined); `prices` mock returns `crm["<odooId>:<qty>"]` or `{ price: String(price), currency: "CZK", ruleId: null }`.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec jest plugins/odoo-connector/__tests__/compare.test.ts` → FAIL.

- [ ] **Step 3: Implement**

`store.ts` `K`: `compareLast: "compare:last"`, `compareProgress: "compare:progress"`; export `CompareResult` (shape in Interfaces).

```ts
// plugins/odoo-connector/compare.ts
import type { ExternalRuleInput } from "@nextcrm/plugin-sdk";
import { mapRules, RULE_FIELDS, type OdooRule } from "./catalog-map";
import { OdooError, type OdooClient } from "./odoo";
import { chosenLists, type Ctx } from "./settings";
import { K, type CompareResult, type PriceListLink, type ProductLink } from "./store";

const PARALLEL = 4;
const LOCK_MS = 10 * 60_000;

export function pickSample(rules: ExternalRuleInput[], products: { ref: string; categoryRef: string | null }[], parents: Map<string, string | null>, n = 20) {
  const sorted = [...products].sort((a, b) => Number(a.ref) - Number(b.ref));
  const chain = (c: string | null) => { const out: string[] = []; while (c && !out.includes(c)) { out.push(c); c = parents.get(c) ?? null; } return out; };
  const qty = (min: string) => { const m = Number(min); return m > 1 ? [1, m, m - 1] : [1]; };
  const out: { ref: string; quantities: number[] }[] = [];
  const take = (ref: string, quantities: number[]) => { if (out.length < n && !out.some((o) => o.ref === ref)) out.push({ ref, quantities }); };
  for (const r of rules.filter((r) => r.appliesTo === "PRODUCT")) take(r.productRef!, qty(r.minQuantity));
  for (const r of rules.filter((r) => r.appliesTo === "CATEGORY")) {
    const p = sorted.find((x) => !out.some((o) => o.ref === x.ref) && chain(x.categoryRef).includes(r.categoryRef!));
    if (p) take(p.ref, qty(r.minQuantity));
  }
  if (rules.some((r) => r.base === "PRICE_LIST")) { const p = sorted.find((x) => !out.some((o) => o.ref === x.ref)); if (p) take(p.ref, [1]); }
  for (const p of sorted) take(p.ref, [1]);
  return out;
}

export async function odooPrice(client: OdooClient, q: { pricelistId: number; currencyId: number; productId: number; quantity: number }): Promise<number> {
  const res = await client.call<{ value?: { price_unit?: number } }>("sale.order.line", "onchange", {
    values: { order_id: { id: false, pricelist_id: q.pricelistId, currency_id: q.currencyId }, product_id: q.productId, product_uom_qty: q.quantity },
    field_names: ["product_id"],
    fields_spec: { order_id: { fields: { pricelist_id: {} } }, product_id: {}, product_uom_qty: {}, price_unit: {} },
  });
  const price = res?.value?.price_unit;
  if (typeof price !== "number") throw new OdooError("Odoo cannot price sale lines over the API", 0);
  return price;
}

async function pool<T>(items: T[], fn: (t: T) => Promise<void>) {
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(PARALLEL, items.length) }, async () => { while (i < items.length) await fn(items[i++]); }));
}

export async function runCompare(ctx: Ctx, client: OdooClient, now: Date): Promise<void> {
  const result: CompareResult = { at: now.toISOString(), ok: true, lists: [], mismatches: [] };
  await ctx.store.set(K.lock, { until: new Date(now.getTime() + LOCK_MS).toISOString() });
  try {
    const products = (await ctx.data.products.findExternal()).filter((p) => p.status === "ACTIVE");
    const rows = await Promise.all(products.map(async (p) => ({ ...p, row: await ctx.data.products.get(p.id) })));
    const links = new Map((await ctx.store.list("product:")).map((e) => [e.key.slice(8), e.value as ProductLink]));
    const parents = new Map((await ctx.store.list("category:")).map((e) => [e.key.slice(9), (e.value as { parentRef: string | null }).parentRef]));
    const sampleable = rows.map((p) => ({ ref: p.ref, categoryRef: links.get(p.ref)?.categoryRef ?? null, id: p.id, name: String(p.row?.name ?? p.ref), currency: String(p.row?.currency ?? "") }));
    const chosen = chosenLists(ctx);
    const ruleFields = (f: Record<string, unknown>) => RULE_FIELDS.filter((x) => x in f);
    const fields = ruleFields(await client.call<Record<string, unknown>>("product.pricelist.item", "fields_get", { attributes: ["type"] }));
    const total = chosen.length;
    let done = 0;
    for (const odooId of chosen) {
      const link = await ctx.store.get<PriceListLink>(K.pricelist(odooId));
      if (!link) continue;
      const [list] = await client.call<{ currency_id: [number, string] }[]>("product.pricelist", "read", { ids: [odooId], fields: ["currency_id"] });
      const items = await client.call<OdooRule[]>("product.pricelist.item", "search_read", { domain: [["pricelist_id", "=", odooId]], fields, context: { active_test: false } });
      const tmpl = new Map<number, number[]>();
      for (const [ref, l] of links) if (l.tmplId) tmpl.set(l.tmplId, [...(tmpl.get(l.tmplId) ?? []), Number(ref)]);
      const { rules } = mapRules(items, (t) => tmpl.get(t) ?? [], new Set(sampleable.map((p) => p.ref)));
      const sample = pickSample(rules, sampleable, parents);
      const checks = sample.flatMap((s) => s.quantities.map((quantity) => ({ s, quantity })));
      let failed = 0;
      await pool(checks, async ({ s, quantity }) => {
        const p = sampleable.find((x) => x.ref === s.ref)!;
        const [odoo, crm] = await Promise.all([
          odooPrice(client, { pricelistId: odooId, currencyId: list.currency_id[0], productId: Number(s.ref), quantity }),
          ctx.data.prices.get({ priceListId: link.priceListId, productId: p.id, quantity: String(quantity) }),
        ]);
        const diff = Number(crm.price) - odoo;
        if (Math.abs(diff) < 0.005) return;
        failed++;
        result.mismatches.push({ list: link.name, product: p.name, quantity, crm: crm.price, odoo: String(odoo), diff: diff.toFixed(2),
          reason: !crm.ruleId && p.currency !== list.currency_id[1] ? "rate" : "rule" });
      });
      result.lists.push({ odooId, name: link.name, checked: checks.length, failed });
      await ctx.store.set(K.compareProgress, { done: ++done, total });
    }
  } catch (e) {
    result.ok = false;
    result.error = e instanceof Error ? e.message : String(e);
    ctx.log.error(`Compare with Odoo failed: ${result.error}`);
  } finally {
    await ctx.store.delete(K.lock);
  }
  await ctx.store.set(K.compareLast, result);
}
```

Implementer notes:
- The rate/rule reason uses "no CRM rule priced it and the product's currency differs from the list's" (spec § 4.6).

- [ ] **Step 4: Run tests**

Run: `pnpm exec jest plugins/odoo-connector` → PASS. `pnpm exec tsc --noEmit` → clean.

- [ ] **Step 5: Commit**

```bash
git add plugins/odoo-connector/compare.ts plugins/odoo-connector/store.ts plugins/odoo-connector/catalog.ts plugins/odoo-connector/__tests__/compare.test.ts plugins/odoo-connector/__tests__/helpers.ts
git commit -m "feat(odoo-connector): compare CRM prices with Odoo (read-only onchange)"
```

---

### Task 9: Screens, plugin definition, docs

**Files:**
- Modify: `plugins/odoo-connector/plugin.ts` (version `0.2.0`, `sdk: "^0.2.3"`, permissions, product panel), `plugins/odoo-connector/ui/AdminSection.tsx`, `plugins/odoo-connector/ui/AccountPanel.tsx`, `plugins/odoo-connector/ui/data.ts`
- Create: `plugins/odoo-connector/ui/ProductPanel.tsx`
- Modify: `plugins/registry-ares/plugin.ts`, `plugins/account-protection/plugin.ts` (no change needed: `^0.2.0` accepts 0.2.3 — verify only), `actions/crm/price-lists/queries.ts` (`usedAsBase`), `app/[locale]/(routes)/crm/price-lists/components/PriceListHeader.tsx`, `app/[locale]/(routes)/crm/price-lists/components/PriceListsTable.tsx`, `locales/{en,cz,de,uk}.json` (`PriceListsPage.baseList`), `plugins/odoo-connector/messages/{en,cz,de,uk}.json`, `lib/plugins/plugins.generated.ts` (regenerated), `apps/docs/content/docs/admins/plugins/odoo-connector.mdx`
- Test: `plugins/odoo-connector/__tests__/ui.test.ts` (extend), `__tests__/catalog/price-list-base.test.ts`

**Interfaces:**
- Consumes: everything above.
- Produces: `catalogData(ctx)` in `ui/data.ts` → `{ lists: { id; name; currency; rules; active; chosen: boolean }[] | null; loadedAt: string | null; skipped: { list: string; ruleId: number; reason: string }[]; compare: CompareResult | null; progress: { done; total } | null; queued: { sync: boolean; compare: boolean } }`; `productPanelData(ctx, productId)` → `{ odooId: number; url: string; syncedAt: string | null } | null`; `panelData` gains `priceList: { name: string; imported: boolean } | null`.

- [ ] **Step 1: Write the failing tests**

Extend `plugins/odoo-connector/__tests__/ui.test.ts`:

```ts
import { catalogData, panelData, productPanelData } from "../ui/data";

it("marks chosen lists and reports queued jobs and skipped rules", async () => {
  const { ctx } = mk([], [], { priceLists: "245" });
  await ctx.store.set(K.odooLists, { at: "2026-10-10T10:00:00Z", lists: [{ id: 245, name: "Gold", currency: "CZK", rules: 16, active: true }, { id: 246, name: "Plat", currency: "CZK", rules: 16, active: true }] });
  await ctx.store.set(K.job("compare"), { requestedAt: "x" });
  await ctx.store.set(K.pricelist(245), { priceListId: "L", name: "Gold", ruleCount: 16, syncedAt: "x" });
  await ctx.store.set(K.skipped(245), [{ ruleId: 9, reason: "applied_on 4_combo" }]);
  const d = await catalogData(ctx);
  expect(d.lists?.map((l) => [l.id, l.chosen])).toEqual([[245, true], [246, false]]);
  expect(d.queued).toEqual({ sync: false, compare: true });
  expect(d.skipped).toEqual([{ list: "Gold", ruleId: 9, reason: "applied_on 4_combo" }]);
});

it("links an imported product to Odoo", async () => {
  const { ctx } = mk([], [], {});
  (ctx.data.products as any).get = async () => ({ id: "p1", source: "EXTERNAL", externalRef: "500" });
  await ctx.store.set(K.product(500), { productId: "p1", tmplId: 912, categoryRef: "7" });
  expect(await productPanelData(ctx, "p1")).toEqual({ odooId: 500, url: "https://odoo.example.com/web#model=product.product&id=500&view_type=form", syncedAt: null });
});

it("shows the account's Odoo price list and whether it is imported", async () => {
  const { ctx } = mk([], [], {});
  await ctx.store.set(K.account("a1"), { partnerId: 1, syncedAt: "2026-10-10T10:00:00Z", salesperson: null, odooPriceList: [250, "Other"] });
  expect((await panelData(ctx, "a1"))?.priceList).toEqual({ name: "Other", imported: false });
});
```

```ts
// __tests__/catalog/price-list-base.test.ts
const db: Record<string, any> = { crm_PriceLists: { findMany: jest.fn() } };
jest.mock("@/lib/prisma", () => ({ prismadb: db }));
jest.mock("@/lib/authz", () => ({ requireAuthenticated: jest.fn().mockResolvedValue({ id: "u", role: "user" }) }));
import { getPriceLists } from "@/actions/crm/price-lists/queries";

it("marks inactive external lists used as a base", async () => {
  db.crm_PriceLists.findMany.mockResolvedValue([{ id: "B", name: "Base", currency: "CZK", isActive: false, source: "EXTERNAL", updatedAt: new Date(), _count: { rules: 3, baseFor: 5 } }]);
  expect((await getPriceLists({ includeArchived: true }))[0]).toMatchObject({ usedAsBase: true });
});
```

(Adjust the `@/lib/authz` mock to whatever `queries.ts` imports for its auth check; read the file's first lines before writing the mock.)

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec jest plugins/odoo-connector/__tests__/ui.test.ts __tests__/catalog/price-list-base.test.ts` → FAIL.

- [ ] **Step 3: Implement**

`ui/data.ts`:

```ts
export async function catalogData(ctx: Ctx) {
  const chosen = new Set(chosenLists(ctx));
  const loaded = await ctx.store.get<{ at: string; lists: { id: number; name: string; currency: string; rules: number; active: boolean }[] }>(K.odooLists);
  const skipped: { list: string; ruleId: number; reason: string }[] = [];
  for (const e of await ctx.store.list("skipped:")) {
    const link = await ctx.store.get<PriceListLink>(K.pricelist(Number(e.key.slice(8))));
    for (const s of e.value as { ruleId: number; reason: string }[]) skipped.push({ list: link?.name ?? e.key.slice(8), ...s });
  }
  return {
    lists: loaded ? loaded.lists.map((l) => ({ ...l, chosen: chosen.has(l.id) })) : null,
    loadedAt: loaded?.at ?? null,
    skipped,
    compare: await ctx.store.get<CompareResult>(K.compareLast),
    progress: await ctx.store.get<{ done: number; total: number }>(K.compareProgress),
    queued: { sync: !!(await ctx.store.get(K.job("sync"))), compare: !!(await ctx.store.get(K.job("compare"))) },
  };
}

export async function productPanelData(ctx: Ctx, productId: string) {
  const p = await ctx.data.products.get(productId);
  if (!p || p.source !== "EXTERNAL") return null;
  const odooId = Number(p.externalRef);
  if (!(await ctx.store.get(K.product(odooId)))) return null;
  const last = await ctx.store.get<RunSummary>(K.lastRun);
  return { odooId, url: `${ctx.settings.url.replace(/\/+$/, "")}/web#model=product.product&id=${odooId}&view_type=form`, syncedAt: last?.ok ? last.at : null };
}
```

and in `panelData` add:

```ts
    priceList: link.odooPriceList ? { name: link.odooPriceList[1], imported: !!(await ctx.store.get(K.pricelist(link.odooPriceList[0]))) } : null,
```

(The product test above expects `syncedAt: null` because no run is stored.)

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
      <div className="font-medium">Odoo</div>
      <a className="underline" href={d.url} target="_blank" rel="noreferrer">{ctx.t("product.linked", { id: d.odooId })}</a>
      {d.syncedAt && <div className="text-muted-foreground">{ctx.t("panel.synced", { date: d.syncedAt.slice(0, 16).replace("T", " ") })}</div>}
    </div>
  );
}
```

`AccountPanel.tsx`: after the fields line:

```tsx
      {d.priceList && <div>{ctx.t(d.priceList.imported ? "panel.priceList" : "panel.priceListMissing", { name: d.priceList.name })}</div>}
```

`AdminSection.tsx`: after the conflicts block add a "Catalog" block rendering `catalogData(ctx)`:
- heading `admin.catalog`; if `last?.catalog`: one line `ctx.t("admin.catalogCounts", { … })`;
- `admin.priceListsHelp` paragraph (explains the `priceLists` setting takes Odoo list ids separated by commas);
- if `lists`: a table (id, name, currency, rules, chosen ✓) with `admin.listsLoadedAt`; else `admin.listsNotLoaded`;
- skipped rules list (`admin.skippedRules`) when any;
- queued state lines (`admin.syncQueued`, `admin.compareQueued`), progress `admin.compareProgress` when a compare is running (`progress` present and `progress.done < progress.total`);
- compare result: `admin.compareResult` with time and per-list `checked`/`failed`, then a mismatch table (list, product, qty, CRM, Odoo, diff, `admin.reason.rate` / `admin.reason.rule`) or `admin.compareClean`; on `ok: false` show `admin.compareFailed` with the error.

`plugin.ts`: `version: "0.2.0"`, `sdk: "^0.2.3"`, permissions add `"products:read", "products:write", "priceLists:read", "priceLists:write"`, description "Imports customers, their people and the product catalog with price lists from an Odoo ERP and keeps them current. Reads only.", and `x.productPanel({ id: "odoo", component: ProductPanel });`.

Price lists: `queries.ts` `getPriceLists` include `_count: { select: { rules: true, baseFor: true } }` and map `usedAsBase: r._count.baseFor > 0` (add to `PriceListRow`); `PriceListsTable.tsx` row type gains `usedAsBase: boolean` and the name cell appends `{r.usedAsBase && !r.isActive && <Badge variant="outline" className="ml-2">{t("baseList")}</Badge>}`; `getPriceList` likewise returns `usedAsBase` and `PriceListHeader.tsx` shows the same badge next to `syncedExternal`.

Messages — plugin (`plugins/odoo-connector/messages/*.json`), all four locales:

| key | en |
|---|---|
| `admin.catalog` | Catalog |
| `admin.catalogCounts` | Categories {categories} · products created {productsCreated}, updated {productsUpdated}, failed {productsFailed} · price lists replaced {listsReplaced} · account price lists set {accountLists} |
| `admin.priceListsHelp` | Choose price lists in the setting priceLists: Odoo list ids separated by commas, e.g. 242, 245. Lists they build on are imported automatically. |
| `admin.listsLoadedAt` | Odoo price lists (loaded {date}) |
| `admin.listsNotLoaded` | Click Load price lists to see the price lists in Odoo. |
| `admin.skippedRules` | Rules the CRM cannot use |
| `admin.syncQueued` | Sync is queued. |
| `admin.compareQueued` | Compare is queued. |
| `admin.compareProgress` | Comparing: {done} of {total} price lists |
| `admin.compareResult` | Last compare: {date} |
| `admin.compareClean` | No differences. |
| `admin.compareFailed` | Compare failed: {error} |
| `admin.reason.rate` | exchange rate |
| `admin.reason.rule` | price rule |
| `panel.priceList` | Price list from Odoo: {name} |
| `panel.priceListMissing` | Odoo price list {name} is not imported |
| `product.linked` | Odoo product #{id} |

cz / de / uk: translate each line (same placeholders; Czech uses "ceník/ceníky", German "Preisliste", Ukrainian "прайс-лист"); the locale test (`__tests__/plugins/contract.test.ts` / plugin `i18n` check) fails on a missing key.

Core locale `PriceListsPage.baseList`: en "Base for other lists", cz "Základ pro jiné ceníky", de "Basis für andere Listen", uk "Основа для інших прайс-листів".

Docs `apps/docs/content/docs/admins/plugins/odoo-connector.mdx`: update the description and intro (customers, people and catalog); add sections:
- **Catalog**: what comes in (categories, sellable variants as products, chosen price lists + their base lists as inactive helper lists, each linked account's price list); products, categories and synced lists are read-only in the CRM; the `priceLists` setting (ids, comma separated) and **Load price lists**; rules the CRM cannot use are listed in the admin section; an Odoo variant whose SKU a CRM product already uses is not imported until one of them changes.
- **Compare with Odoo**: what it checks (each chosen list, up to 20 products, quantities 1 / a rule's minimum / one below), that it asks Odoo to price a sale line without saving anything, how to read "price rule" vs "exchange rate" differences, that it runs within 5 minutes of the click.
- In **Install and settings** add the `priceLists` row; in **Failures**/**Dry run** mention that Sync now and Compare are queued and start within 5 minutes, and that a dry run also lists catalog changes.

Then `pnpm plugins:generate`.

- [ ] **Step 4: Run tests**

Run: `pnpm exec jest plugins __tests__/plugins __tests__/catalog __tests__/pricing` → PASS. `pnpm exec tsc --noEmit && pnpm lint` → clean.

- [ ] **Step 5: Commit**

```bash
git add plugins/odoo-connector actions/crm/price-lists/queries.ts "app/[locale]/(routes)/crm/price-lists/components" locales lib/plugins/plugins.generated.ts apps/docs/content/docs/admins/plugins/odoo-connector.mdx __tests__/catalog/price-list-base.test.ts
git commit -m "feat(odoo-connector): catalog screens, product panel, docs; v0.2.0"
```

---

### Task 10: Verification, local run and live check

- [ ] **Step 1: Full suite, types, lint, build**

Run: `pnpm exec jest 2>&1 | tail -8 && pnpm exec tsc --noEmit && pnpm lint`
Expected: only the 6 baseline failures; clean. Build with the CI dummy env (exported by a Python script from `.github/workflows/ci.yml`): `pnpm exec prisma generate && pnpm exec next build` → succeeds.

- [ ] **Step 2: Live check against the GIPS Odoo, LOCAL database only (needs Pavel's explicit OK; Odoo is only read)**

Local dev on `:3001` (local DB on 5433 with Task 1's migration applied, `RESEND_API_KEY` unset, throwaway Inngest container). The part 1 install from 2026-10-10 is still in the local DB (86 accounts linked); the plugin upgrades to 0.2.0 on start (`runPluginUpgrades`). The API key stays where part 1's check put it (never typed into the browser).
1. Admin → Plugins → Odoo connector: **Load price lists** → the 19 active lists appear with ids.
2. Set `priceLists` to the 18 Retail/Wholesale list ids, keep `dryRun` on, Save; **Sync now** → within 5 minutes the log lists would-create products (≈332), would-replace lists (18 chosen + their bases), account lists.
3. Turn `dryRun` off (clear the API key field before saving, as in part 1) → **Sync now** → products, categories, lists appear; reps can't edit them; accounts carry Retail_STARTER etc.; skipped rules (if any) listed.
4. **Compare with Odoo** → within 5 minutes: results for 18 lists. Target: 0 "price rule" differences; "exchange rate" differences only on EUR lists for products without an EUR rule. Any rule difference gets a failing test first (Step 3).
5. **Sync now** again → 0 products created, 0 lists replaced.

Nothing is ever written to Odoo.

- [ ] **Step 3: Record pass/fail per check in the ledger; any bug gets a failing test first**

- [ ] **Step 4: Record results; hand off to finishing-a-development-branch**
