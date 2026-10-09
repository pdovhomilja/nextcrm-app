# Price lists and pricing engine — design

Date: 2026-10-09. Status: approved in chat by Pavel (two sections), awaiting review of this document.
Parent spec: `docs/superpowers/specs/2026-10-04-plugin-system-design.md` (§ 14: "Price lists, the price-rule engine and orders are core features with their own spec").
Origin: OXO implementation plan v1.2, § 7 and § 8.5 (claudeOS `staging/oxofactory/2026-10-04-oxo-crm-nextcrm-implementacni-plan-v1.2.md`), milestone M2.
This is the first of two specs. The second, **orders**, uses `getPrice` from this one for each line's list price and the below-list approval.

## 1. Goal

Every instance can keep price lists in the CRM and ask, for any product, quantity and date: "what is the price for this customer?" The rules and the maths are the ones Odoo 17–19 uses for price lists. That makes lists mirrored from Odoo give the same price to the crown, while staying a generic, well-known model.

Success:
- a manager builds a list with fixed, percentage and formula rules; the price check shows the computed price and the rule that produced it;
- an account can have its own list; prices resolve as account list → default list → the product's unit price;
- prices for OXO's mirrored lists match Odoo's own result (verified by the connector later; core proves the algorithm with a parity fixture);
- lists written by an external system cannot be edited in the UI or through MCP.

### 1.1 Not in v1

- Product variants. Rules target a product, a category or everything. An external connector imports each variant as its own product.
- Units of measure: one unit per product.
- Restricting which lists a rep can see.
- Plugin SDK access to lists and pricing. That comes with the Odoo connector spec, together with `pricelists:read/write` and `ctx.pricing.getPrice`.
- Orders (second spec).
- Customer-facing price list exports or PDFs.

## 2. Data model

### 2.1 `crm_PriceLists`

| field | type | notes |
|---|---|---|
| id | uuid | |
| name | String | |
| currency | VarChar(3) | FK to `Currency.code` |
| isActive | Boolean, default true | archived = false |
| source | enum `crm_PriceList_Source` (`CRM`, `EXTERNAL`) | default `CRM` |
| externalRef | String? | the external system's id (for example the Odoo pricelist id); unique together with `source` when set |
| createdBy, updatedBy | uuid? | |
| createdAt, updatedAt | timestamps | |

### 2.2 `crm_PriceListRules`

| field | type | notes |
|---|---|---|
| id | uuid | |
| priceListId | uuid | FK, cascade delete |
| appliesTo | enum `crm_PriceRule_Target` (`ALL`, `CATEGORY`, `PRODUCT`) | |
| categoryId | uuid? | required when `CATEGORY` |
| productId | uuid? | required when `PRODUCT` |
| minQuantity | Decimal(14,4), default 0 | |
| dateStart, dateEnd | DateTime? | inclusive range; either side may be open |
| computePrice | enum `crm_PriceRule_Compute` (`FIXED`, `PERCENTAGE`, `FORMULA`) | |
| fixedPrice | Decimal(18,4)? | in the list's currency; required for `FIXED` |
| percentPrice | Decimal(7,4)? | 0–100; required for `PERCENTAGE` |
| base | enum `crm_PriceRule_Base` (`LIST_PRICE`, `COST`, `PRICE_LIST`), default `LIST_PRICE` | used by `PERCENTAGE` and `FORMULA` |
| basePriceListId | uuid? | required when base = `PRICE_LIST` |
| priceDiscount | Decimal(7,4), default 0 | percent, may be negative (a markup) |
| priceSurcharge | Decimal(18,4), default 0 | in the list's currency |
| priceRound | Decimal(18,4)? | rounding step, e.g. 1, 0.10, 5 |
| priceMinMargin, priceMaxMargin | Decimal(18,4)? | in the list's currency |
| externalRef | String? | |
| createdAt, updatedAt | timestamps | |

Index on `(priceListId, appliesTo)`.

### 2.3 Changes to existing tables

- `crm_Accounts.pricelist_id` uuid?, FK to `crm_PriceLists`, set null on delete (lists are archived, not deleted, so this is a safety net only).
- `crm_ProductCategories.parentId` uuid?, self FK. Existing categories stay top-level.
- `crm_SystemSettings` key `default_pricelist_id`.

All new money and quantity columns use `Decimal`; the code uses `decimal.js`, like invoices.

## 3. Engine (`lib/pricing/`)

```ts
getPrice(input: { priceListId: string | null; productId: string; quantity: Decimal | number; date?: Date }):
  Promise<{ price: Decimal; currency: string; listPrice: Decimal; ruleId: string | null; steps: PriceStep[] }>
resolvePriceListId(accountId: string | null): Promise<string | null>   // account list → default list → null
```

The engine is a pure function, `computePrice(context, input)`, over loaded data (list, rules, product, category chain, rates), plus a thin loader that reads from Prisma. Tests target the pure part.

### 3.1 Rule selection (Odoo 17 `_get_applicable_rules` order)

1. Candidates: rules of the list where
   - `appliesTo = PRODUCT` and `productId` is the product; or
   - `appliesTo = CATEGORY` and `categoryId` is the product's category or one of its ancestors; or
   - `appliesTo = ALL`.
2. Keep rules with `minQuantity ≤ quantity` and `dateStart ≤ date ≤ dateEnd` (open sides always match). `date` defaults to now. Dates compare by calendar day in UTC.
3. Order: `PRODUCT` before `CATEGORY` before `ALL`; within `CATEGORY`, the deeper category first; then higher `minQuantity` first; then the newest rule (`createdAt` desc, then id desc).
4. The first rule wins. With no rule, the price is the product's list price, converted to the list's currency.

### 3.2 Price computation

- **List price:** `crm_Products.unit_price` in the product's `currency`. **Cost:** `crm_Products.unit_cost` (0 when null), same currency.
- **Base price:** list price, cost, or `getPrice` on `basePriceListId` for the same product, quantity and date. Converted to this list's currency.
- `FIXED`: `fixedPrice`.
- `PERCENTAGE`: `base − base × percentPrice / 100`.
- `FORMULA`, in Odoo's order:
  1. `limit = base`
  2. `price = base − base × priceDiscount / 100`
  3. if `priceRound`: round `price` to the nearest multiple of `priceRound`, half away from zero (Odoo `float_round` with `precision_rounding`)
  4. `price = price + priceSurcharge`
  5. if `priceMinMargin`: `price = max(price, limit + priceMinMargin)`
  6. if `priceMaxMargin`: `price = min(price, limit + priceMaxMargin)`
- The result is rounded to 2 decimals only for display and for orders. The engine returns full precision.
- `steps` records each stage (base, after discount, after rounding, …) for the price check panel.

### 3.3 Currency

Amounts in another currency are converted with the CRM's stored rates (`ExchangeRate`, via `lib/currency` `convertAmount`). If a needed rate is missing, `getPrice` throws `MissingRateError(from, to)`. It never prices at 1:1 silently.

### 3.4 Chained lists

`base = PRICE_LIST` recurses into another list. Saving a rule that would create a cycle is rejected. At runtime, a depth above 10 throws, as a guard.

### 3.5 Odoo version notes

Odoo 18–19 express the formula discount as `price_markup` (markup = −discount) and keep the same order of steps. The connector maps fields; the core model stays as above.

## 4. Access

| | user (rep) | manager | admin |
|---|---|---|---|
| Read lists, rules, prices | ✓ | ✓ | ✓ |
| Create, edit, archive `CRM` lists and their rules | — | ✓ | ✓ |
| Edit `EXTERNAL` lists or their rules | — | — | — |
| Set an account's price list | account owner (existing account write rule) | ✓ | ✓ |
| Set `default_pricelist_id` | — | — | ✓ |

Enforcement lives in a new `lib/authz/scopes/pricing.ts`: `assertCanWritePriceList(user, list)` refuses users and `EXTERNAL` lists. Both server actions and MCP tools call it.

## 5. Screens (all text in en/cz/de/uk)

- **Sales → Price lists** (`/crm/price-lists`): a table with name, currency, source, active, rule count and last change. "New price list" for managers and admins. A filter shows archived lists.
- **Price list detail** (`/crm/price-lists/[id]`):
  - header (name, currency, active, source; `EXTERNAL` lists show "Synced from an external system" and no edit controls);
  - rules table in evaluation order;
  - rule editor in a side sheet whose fields switch with compute type and base;
  - **Price check** panel: product, quantity and date in; price, list price, the matched rule and the formula steps out.
- **Account:** a "Price list" select in the new and edit account forms (active lists only), and the list name on the account detail.
- **Product categories** (admin CRM settings): an optional parent; a cycle is rejected.
- **Admin → Pricing:** the "Default price list" select.

Archiving: a list that accounts reference, or that another list uses as a base, can only be archived, not deleted. An unreferenced list can be deleted by a manager or admin. Archived lists are hidden from selects but still compute for existing references.

## 6. MCP tools (`lib/mcp/tools/crm-price-lists.ts`)

- `crm_list_price_lists` (filters: active, source)
- `crm_get_price_list` (with rules in evaluation order)
- `crm_get_price` (productId, quantity, date?, priceListId? or accountId?)
- `crm_create_price_list`, `crm_update_price_list`, `crm_archive_price_list`
- `crm_upsert_price_list_rule`, `crm_delete_price_list_rule`

The write tools call `assertCanWritePriceList`; reads are open to all roles (§ 4).

## 7. Validation

- Name required; currency must be an enabled currency.
- Rule fields must match `appliesTo` and `computePrice` (e.g. `PRODUCT` needs `productId`; `FIXED` needs `fixedPrice`).
- `dateEnd ≥ dateStart`; `percentPrice` in 0–100; `minQuantity ≥ 0`; `priceRound > 0` when set; `priceMinMargin ≤ priceMaxMargin` when both are set.
- `base = PRICE_LIST`: the base list exists, differs from this list, and no cycle results.

## 8. Audit and errors

- `writeAuditLog` with entity types `price_list` and `price_list_rule`, for created, updated, deleted and archived (archive is logged as `updated` with `isActive` in the changes).
- `getPrice` errors: `PriceListNotFound`, `ProductNotFound`, `MissingRateError`, `PriceListDepthExceeded`. Screens show them as readable messages.

## 9. Testing

- **Engine unit tests** (pure `computePrice`):
  - each compute type;
  - rule order (product > deeper category > shallower category > all; higher min quantity; newest);
  - quantity and date edges;
  - formula step order with rounding, surcharge and margins;
  - chained lists, cycle and depth guard;
  - currency conversion and a missing rate;
  - the no-rule fallback.
- **Odoo parity fixture:** a table of rule × product × quantity cases with prices worked out by hand from Odoo 17's algorithm, including negative discount (markup), rounding steps 1 / 0.10 / 5, and min/max margins.
- **Action tests:** manager edits; rep refused; `EXTERNAL` lists locked; archive vs delete; account price list field; default list setting; category cycle rejected.
- **MCP tests:** reads for every role, writes refused for reps and for `EXTERNAL` lists.
- **Manual check on local dev** at the end.

## 10. Risks

- **Odoo changes its algorithm between versions.** The parity fixture pins the Odoo 17 behaviour; the connector's "compare with Odoo" check catches drift.
- **Category rule order:** Odoo sorts category rules by category id, descending (in practice, newer and therefore usually deeper categories first). UUIDs have no order, so this engine uses category depth. Two rules on sibling categories can't both match one product, so the difference only matters for oddly ordered imported trees; the parity fixture and the connector's compare check catch it.
- **Latest-only exchange rates:** prices for past dates use today's rate. That's acceptable for quoting; orders will snapshot the price they used.
- **Reps see all lists.** Acceptable for v1; restricting visibility can come later.
