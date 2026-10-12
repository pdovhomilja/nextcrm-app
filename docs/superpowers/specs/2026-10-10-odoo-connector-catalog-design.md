# Odoo connector, part 2: catalog in — design

Date: 2026-10-10. Status: approved in chat by Pavel (three sections), awaiting review of this document.
Parent specs: `docs/superpowers/specs/2026-10-10-odoo-connector-customers-design.md` (part 1), `docs/superpowers/specs/2026-10-09-price-lists-design.md` (core price lists), `docs/superpowers/specs/2026-10-04-plugin-system-design.md` (plugins). OXO implementation plan v1.2 § 8.3, § 10 criterion 9 (claudeOS `staging/oxofactory/2026-10-04-oxo-crm-nextcrm-implementacni-plan-v1.2.md`), milestone M2 (18 Dec 2026).
Part 2 of 3 (Pavel, 2026-10-10): 1) connection + customers (merged, PR #365), **2) catalog in** (this spec), 3) orders out and statuses back.

## 1. Goal

An instance that runs its sales in an Odoo ERP gets Odoo's catalog into the CRM so reps quote and order at exactly Odoo's prices: sellable products become CRM products, chosen price lists (with every list they build on) become read-only external price lists, each linked account gets its Odoo price list, and a "compare with Odoo" check proves CRM and Odoo price the same.

Success:
- every sellable Odoo variant is a CRM product, kept current, read-only in the CRM;
- the admin-chosen Odoo price lists and their base lists price every product exactly as Odoo does;
- a linked account's price list is its Odoo customer's list;
- compare with Odoo on all chosen lists × 20 products × 3 quantities shows 0 rule differences (OXO plan § 10.9);
- nothing is written to Odoo.

Generic product rules apply: nothing specific to OXO or GIPS in code; all text in en, cz, de, uk; core migrations additive.

### 1.1 Decisions (Pavel, 2026-10-10)

1. **Price lists:** the admin picks which Odoo lists to import; every list they build on (recursively, archived included) comes along automatically as an inactive helper list.
2. **Products:** read-only in the CRM, like external price lists. Core gets a product `source` (CRM | EXTERNAL); only the connector writes EXTERNAL products.
3. **Account price list:** Odoo wins. A linked account's `pricelist_id` follows the Odoo customer's `property_product_pricelist` when that list is imported.
4. **Approach A:** SDK 0.3 upsert/replace calls keyed by Odoo ID; a price list and all its rules are replaced in one transaction.
5. Earlier (2026-10-09, price lists spec): no product variants in core; each Odoo variant is one CRM product.

### 1.2 Facts (GIPS Odoo 19.0+e, read 2026-10-10)

- 311 sellable templates, 332 sellable variants (22 with attributes); 315 with `default_code`, no duplicates; all CZK; 17 categories in use of 34; units ks, Units, kg, m, L, Hours; sale taxes 12 % / 21 % / 0 % EU (percent, tax-excluded) or none.
- 19 active price lists (Retail ×4 and Wholesale ×5 in CZK and EUR, one USD), 16 own rules each, built on **24 archived lists** (e.g. "SPOTŘEBITEL CZK" is the base of 207 rules). 794 rules: 455 percentage, 338 fixed, 1 formula; 442 on a category, 351 on a product template, 1 global; 677 with a minimum quantity; none dated.
- EUR/USD lists: 399 rules, all fixed or percentage of another list in the same currency; currency conversion (CZK `list_price` at Odoo's daily ČNB rate) happens only for products without a rule.
- Customers: 78 of 86 on Retail_STARTER (CZK), 5 on the USD list, 3 on Retail_STARTER (EUR).
- Odoo has no public method that computes a price. A line-level `onchange` on `sale.order.line` (order given as a nested value with `pricelist_id`) returns Odoo's `price_unit` and saves nothing; checked against a 1000-piece fixed rule (1.67 → 1.51) and an EUR list (0.06), sale-order count unchanged.

### 1.3 Not in scope

- Writing to Odoo (part 3).
- Product images, attributes as structured data, barcodes, stock, combos.
- Supplier prices, purchase price lists.
- Syncing exchange rates (core keeps its own; see § 4.4).
- Orders, deliveries, invoices (part 3).

## 2. Core changes

### 2.1 Data model (migration, additive)

- `crm_Products`: `source crm_Product_Source @default(CRM)` (enum `CRM | EXTERNAL`), `externalRef String?`, `@@unique([source, externalRef])`.
- `crm_ProductCategories`: same `source` (reusing the enum) and `externalRef`, `@@unique([source, externalRef])`.
- Existing rows default to `CRM`.

### 2.2 Read-only EXTERNAL rows

EXTERNAL products and categories cannot be created, edited or deleted by users, through every path:
- product screens: badge "From an external system", no edit/delete; the product detail shows the external link when the plugin provides one (panel, § 4.5);
- server actions `actions/crm/products/{create,update,delete}-product`, CSV import `import-products.ts` (an SKU matching an EXTERNAL product is skipped and reported), MCP product tools (`lib/mcp/tools/crm-products.ts`) → a clear "managed by an external system" error, same pattern as external price lists (`lib/authz/scopes/pricing.ts`);
- Admin → CRM Settings → Product categories: EXTERNAL categories cannot be renamed, moved or deleted; CRM products may still be assigned to them; CRM categories may not be placed under an EXTERNAL parent (an import would otherwise reshape them).

### 2.3 SDK 0.3.0

New permissions `products:write`, `priceLists:read`, `priceLists:write`. New calls (all plugin writes are limited to EXTERNAL rows; a call touching a CRM row fails):

```ts
ctx.data.products.upsertExternal(ref: string, fields: {
  name: string; sku: string | null; description: string | null; type: "PRODUCT" | "SERVICE";
  status: "ACTIVE" | "ARCHIVED"; unit_price: string; unit_cost: string | null; currency: string;
  tax_rate: string | null; unit: string | null; categoryRef: string | null;
}): Promise<{ id: string; created: boolean }>;
ctx.data.products.findExternal(): Promise<{ id: string; ref: string; status: string }[]>;
ctx.data.productCategories.upsertExternal(ref: string, fields: { name: string; parentRef: string | null }): Promise<{ id: string }>;
ctx.data.priceLists.findExternal(): Promise<{ id: string; ref: string; name: string; currency: string; isActive: boolean }[]>;
ctx.data.priceLists.replaceExternal(ref: string, list: { name: string; currency: string; isActive: boolean }, rules: ExternalRule[]): Promise<{ id: string }>;
ctx.data.prices.get(input: { priceListId: string; productId: string; quantity: string }): Promise<{ price: string; currency: string; ruleId: string | null }>;
```

`ExternalRule` mirrors `crm_PriceListRules` with references by Odoo ID: `appliesTo`, `productRef`, `categoryRef`, `minQuantity`, `dateStart`, `dateEnd`, `computePrice`, `fixedPrice`, `percentPrice`, `base`, `basePriceListRef`, `priceDiscount`, `priceSurcharge`, `priceRound`, `priceMinMargin`, `priceMaxMargin`, `externalRef`.

- `replaceExternal` runs in one transaction: upsert the list by `(EXTERNAL, ref)`, delete its rules, insert the new ones. An unknown `productRef` / `categoryRef` / `basePriceListRef`, or a base list that is not EXTERNAL, fails the whole call and leaves the list as it was. A base list must exist before a list that uses it (the plugin writes bases first).
- `prices.get` calls core `getPrice` (`lib/pricing/get-price.ts`); it needs `products:read`.
- Decimal values cross the SDK as strings.
- Accounts' `pricelist_id` is written through the existing `ctx.data.accounts.update` (`accounts:write`); the host accepts only an existing price list id.
- No delete calls: an Odoo product that leaves the catalog is set to `ARCHIVED`; a price list no longer needed stays (inactive) so old orders keep their reference.

The pricing engine does not change: external lists are priced like CRM lists.

## 3. Plugin `plugins/odoo-connector` (v0.2.0, SDK ^0.3.0)

New files:

```
plugins/odoo-connector/catalog.ts       catalog run: categories, products, price lists, account lists
plugins/odoo-connector/catalog-map.ts   Odoo category / variant / rule → SDK shapes (pure)
plugins/odoo-connector/lists.ts         which lists to fetch: chosen + bases, recursively (pure)
plugins/odoo-connector/compare.ts       sample selection (pure), compare job, result summary
plugins/odoo-connector/jobs.ts          queued admin jobs (sync, compare) run by the cron
plugins/odoo-connector/ui/*.tsx         admin additions, product panel
```

New permissions: `products:read`, `products:write`, `priceLists:read`, `priceLists:write`.

### 3.1 Settings

| key | type | default | notes |
|---|---|---|---|
| `priceLists` | array of Odoo list ids | `[]` | set by ticking lists in the admin section; nothing is imported while empty |

Admin action **Load price lists** reads all active Odoo lists (id, name, currency, rule count) into the store so the admin section can offer them; the admin ticks lists and saves (the section writes the setting through the host's settings save).

## 4. Behaviour

### 4.1 Run order

Every sync run (scheduled, Sync now, first import) does, after part 1's customers and people:
1. categories, 2. products, 3. price lists, 4. account price lists.
A failed step stops the run (same failure counting, alert and cursor rules as part 1: the catalog cursor moves only after the whole run succeeds). Dry run logs every would-be create/update/replace and writes nothing.

### 4.2 Categories and products

- **Categories:** all `product.category` records every run (34 at GIPS), parents before children, `upsertExternal(String(id), { name, parentRef })`. Name is Odoo's own `name` (the tree gives the path).
- **Products:** `product.product` with `sale_ok = true`, `active` in (true, false), incremental: variants whose own `write_date` or whose template's `write_date` (`product_tmpl_id.write_date`) is past `cursor − 2 minutes`, because a change on the template (e.g. its sale price) does not always touch the variant. First run: all. Mapping:

| Odoo (`product.product`) | CRM product |
|---|---|
| `display_name` | `name` |
| `default_code` | `sku` (null when empty) |
| `description_sale` | `description` |
| `type = service` → SERVICE, else PRODUCT | `type` |
| `active && sale_ok` → ACTIVE, else ARCHIVED | `status` |
| `lst_price` (includes the variant's extra price) | `unit_price` |
| `standard_price` | `unit_cost` |
| company currency (`currency_id`) | `currency` |
| the single percent sale tax amount in `taxes_id`; none or several → null | `tax_rate` |
| `uom_id` name | `unit` |
| `categ_id` | `categoryRef` |

A variant that becomes not sellable or archived is upserted with `ARCHIVED` (it still matches the incremental domain because `sale_ok`/`active` changes bump `write_date`; the domain uses `active_test: false`). SKU uniqueness: an Odoo `default_code` that equals a CRM-source product's SKU fails that product with a logged reason ("SKU used by a CRM product") and retries next run (part 1's `retry:` mechanism).

### 4.3 Price lists

- **Which:** `lists.ts` resolves the chosen ids plus every `base_pricelist_id` reachable from their rules, recursively, archived lists included (`active_test: false`). Chosen lists are `isActive: true`; helper bases are `isActive: false` (reps don't pick them; the engine uses them).
- **When:** a list is replaced when it is new, or the list's or any of its rules' `write_date` is past the catalog cursor, or its rule count differs from the stored count (a deleted rule). Order: bases before the lists that use them (topological; a cycle is logged and the lists in it are skipped).
- **Rules** (`catalog-map.ts`), per Odoo `product.pricelist.item`:
  - `applied_on`: `3_global` → ALL; `2_product_category` → CATEGORY (`categoryRef`); `1_product` (template) → one PRODUCT rule per sellable variant of the template; `0_product_variant` → PRODUCT. A rule whose product is not in the sale catalog is dropped (it can't price anything sold).
  - `compute_price` fixed / percentage / formula → FIXED / PERCENTAGE / FORMULA with `fixed_price`, `percent_price`, `price_discount`, `price_surcharge`, `price_round`, `price_min_margin`, `price_max_margin`; `base` list_price / standard_price / pricelist → LIST_PRICE / COST / PRICE_LIST with `basePriceListRef`; `min_quantity`, `date_start`, `date_end`.
  - Field names follow Odoo 19; fields missing on the instance are read as their defaults (fields are intersected with `fields_get`, as in part 1).
  - A rule the core engine cannot represent (an `applied_on` or `base` value not listed above) is skipped and recorded as a skipped rule (list, Odoo rule id, reason) for the admin section.
- Stored per list: `pricelist:<odooId>` → `{ priceListId, ruleCount, syncedAt }`.

### 4.4 Account price lists and exchange rates

- For each linked account (part 1's `partner:` links) whose Odoo customer has a `property_product_pricelist` that is imported, set the account's `pricelist_id` to that CRM list when it differs. Customers are re-read for this step only when they or the price list mapping changed (customer `write_date` past the cursor, or a list imported for the first time).
- When the customer's list is not imported, the account keeps its list and the account's Odoo panel says "Odoo price list <name> is not imported".
- **Exchange rates:** the connector does not change core's rates. Prices Odoo converts from another currency match only when core's rate for that day equals Odoo's; compare labels such differences "rate difference" (§ 4.6).

### 4.5 Product panel

A product panel (plugin slot on the product detail) on EXTERNAL products the plugin owns: "From Odoo product #<id>" linking to `{url}/web#model=product.product&id=<id>&view_type=form` (redirects to the current Odoo URL scheme), and the last synced time.

### 4.6 Compare with Odoo

- **Trigger:** admin action **Compare with Odoo** queues a compare job (§ 4.7) and returns at once.
- **Sample** (`compare.ts`, pure): per chosen list, up to 20 ACTIVE products covering, in this order, products with a product-level rule on the list, products priced through a category rule, products priced through a base list, and products with no rule; quantities per product: 1, the minimum quantity of the rule that prices it (when > 1), and that minimum − 1 (when ≥ 1). Deterministic (sorted by Odoo id) so reruns compare the same prices.
- **Odoo price:** `sale.order.line/onchange` with `values: { order_id: { id: false, pricelist_id, currency_id }, product_id, product_uom_qty }`, `field_names: ["product_id"]`, `fields_spec: { price_unit: {}, ... }` — no partner, so no customer setting changes the price. Read-only; no record is created. 4 calls in parallel.
- **CRM price:** `ctx.data.prices.get`.
- **Match:** |CRM − Odoo| < 0.005 in the list currency (rounding to the currency's 2 decimals). A mismatch is "rate difference" when the CRM rule that priced it is none or LIST_PRICE/COST in a list whose currency differs from the product's, else "rule difference".
- **Result** in the store (`compare:last`): time, per list pass/fail counts, mismatches (product, quantity, CRM, Odoo, difference, reason). Shown in the admin section.
- **Odoo cannot price** (onchange missing or returns no `price_unit`): the job stops with "Odoo cannot price sale lines over the API" and syncing is unaffected.

### 4.7 Queued admin jobs

**Sync now** and **Compare with Odoo** store `job:<name>` → `{ requestedAt, requestedBy }` and return "queued". The 5-minute cron runs queued jobs (compare after sync when both are queued), under part 1's run lock; the admin section shows queued / running / finished with the result. This also resolves part 1's deferred minor that Sync now ran inside one web request.

## 5. Screens (all text in en, cz, de, uk)

- **Plugin admin section:** price list picker (active Odoo lists with currency and rule count, **Load price lists**, Save), catalog counts from the last run (categories, products created/updated/archived, lists replaced, accounts' lists changed), skipped rules, **Compare with Odoo** with progress and results, queued/running state for Sync now.
- **Product list and detail:** "From an external system" badge on EXTERNAL products; no edit/delete; the product panel above.
- **Price lists:** helper base lists marked "base for other lists" (inactive EXTERNAL list used as a base).
- **Account Odoo panel:** the Odoo price list and whether it is applied.
- **Docs:** `apps/docs/content/docs/admins/plugins/odoo-connector.mdx` gets "Catalog" and "Compare with Odoo"; developer docs get the SDK 0.3 calls and permissions; products docs mention read-only external products.

## 6. Testing

- **Pure:** product mapping (variant name and extra price, tax single/none/several, unit, service, archived/not sellable); category order; rule mapping (template rule → one rule per variant, category, global, base chains, formula fields, dropped non-catalog products, unknown kinds skipped); list resolution (chosen + recursive bases, archived bases, cycle); topological order; sample selection (coverage order, quantities, deterministic).
- **Core:** a user cannot edit or delete EXTERNAL products or categories through actions, CSV import, MCP; `upsertExternal` refuses CRM rows; `replaceExternal` is all-or-nothing and fails on an unknown reference or a non-EXTERNAL base; `prices.get` matches `getPrice`; migration leaves existing rows CRM.
- **Fake Odoo:** first catalog import; changed product; product archived; rule deleted in Odoo disappears; archived base list imported inactive; account list follows Odoo, unimported list noted; dry run writes nothing; SKU clash with a CRM product fails that product and retries; compare finds a planted difference and labels rule vs rate; compare stops cleanly when Odoo cannot price; queued Sync now runs on the next cron tick.
- **Live check (read-only, Pavel's consent):** dry run, then a local import of the GIPS catalog; compare with Odoo on all chosen lists; target 0 rule differences, rate differences only where Odoo converted currency.

## 7. Risks

- **Line `onchange` is Odoo's form API**, not a documented one; a later Odoo version can change it. The compare job reports it; syncing is unaffected.
- **Formula rule:** one at GIPS; if the engine does not match it, compare shows the affected products.
- **Exchange rates** must match Odoo's (both ČNB) for converted prices; compare separates these.
- **Template-level changes** (e.g. a template's price) may not bump the variant's `write_date`; the product domain also checks the template's `write_date` (§ 4.2).
- **Volume:** about 800 rules and 330 products at GIPS; a full list replace is cheap. Instances with tens of thousands of rules would want per-rule sync (not in scope).
