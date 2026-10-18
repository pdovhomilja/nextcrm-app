# OXO ERP connector — design

Date: 2026-10-18. Status: approved in chat by Pavel (four sections), awaiting review of this document.
Parent specs: the odoo-connector specs `docs/superpowers/specs/2026-10-10-odoo-connector-customers-design.md`, `2026-10-10-odoo-connector-catalog-design.md`, `2026-10-11-odoo-connector-orders-out-design.md`, `2026-10-11-odoo-connector-orders-in-design.md`; plugins `2026-10-04-plugin-system-design.md`. OXO ERP side: `Endorphin-IT/oxo-erp` spec `docs/superpowers/specs/2026-10-17-s4b-order-api-design.md` (S4b-1, the `/api/v1` this plugin talks to; its § 1 and § 9 said `plugins-private/`, superseded by decision 1 below).
Stage: OXO ERP plan S4b-2. S4b-1 (the API) is merged and live; production answers order writes with 503 `writes_disabled`.

## 1. Goal

NextCRM on OXO does everything with OXO ERP that it does today with Odoo: customers, catalogue and price lists come in; READY orders go out; delivery comes back as the order's status; orders made in the ERP show in the account's history. At the switch-over (S7) the new plugin takes over every account, product, price list and order that `odoo-connector` brought in, without duplicates.

Success:
- after the first real sync, every CRM product, category, price list and order that came from Odoo is linked to its OXO ERP row, and no second copy exists;
- every CRM account that matches an OXO ERP customer by IČO, DIČ or name + zip is linked; ambiguous ones are on a conflict list, never guessed;
- a READY order exists in OXO ERP exactly once, even when sending is repeated after a timeout;
- a delivery picked and shipped in OXO ERP shows as DELIVERED in the CRM within one sync cycle;
- nothing is written to the CRM while `dryRun` is on, and nothing is sent to OXO ERP while `sendOrders` is off or `dryRun` is on.

### 1.1 Decisions (Pavel, 2026-10-18)

1. Plugin home: public `plugins/oxo-erp-connector`, like `odoo-connector`, normal release flow, installed only on OXO.
2. Switch-over: take everything over. Adopt `odoo-connector`'s accounts, products, lists and orders by Odoo id, no duplicates. `odoo-connector` is switched off at S7.
3. Owners: OXO ERP has no salesperson. New accounts arrive without an owner and are listed on a "Needs owner" page.
4. Approach A: a new plugin shaped like `odoo-connector` (same files and flows) with its own REST client, store and screens. Not a two-backend rebuild of `odoo-connector`, not a copy of it.

### 1.2 Facts (read 2026-10-18)

- CRM core: products, categories, price lists and orders carry `source=EXTERNAL` + `externalRef`, unique together, not tied to a plugin. `odoo-connector` writes Odoo ids there; a sent order gets `externalRef = String(saleId)`. Accounts have no external ref (only `company_id`, `vat`); `odoo-connector`'s account links live in its plugin-scoped store, which no other plugin can read.
- OXO ERP: `Partner`, `Product`, `SalesOrder` and `PriceList` have `odooId Int? @unique`, filled for rows mirrored from Odoo; the API does not return it yet. `Product` has no `sale_ok`: the API returns all 712 products, `odoo-connector` brings in about 332 sellable ones. Products carry the category as a name only.
- OXO ERP order states: `draft`, `approval`, `sale`, `cancel` (mirrored Odoo orders may also be `done` or `sent`). The paged `GET /orders` returns only `sale` orders; `?crmNumbers=` returns any state.
- `POST /orders` accepts either `customerId` or an inline `customer` (matched or created in OXO ERP), and either `deliveryAddressId` or an inline `deliveryAddress`. A repeated `crmNumber` with the same content answers 200, with different content 409. `invoices` is always `[]` until S5.
- Practice and production ids differ (Puffbox is 222 in practice, 154 in production). The first `updatedSince` poll returns every row (migration stamp).

### 1.3 Not in scope

- Invoices and payments (INVOICED, PAID): S5, when OXO ERP returns invoices.
- Salesperson, tax.
- Switching off `odoo-connector` and installing this plugin on oxo.nextcrm.app: S7.
- Editing or cancelling OXO ERP orders from the CRM. The connector only creates.

## 2. OXO ERP change (PR in `Endorphin-IT/oxo-erp`, ships first)

1. `odooId` (number or null) in the API output of customers, their addresses, products, price lists and orders. Output only; the columns exist.
2. `saleOk` on products: new column `Product.saleOk Boolean @default(true)`, filled by the nightly Odoo mirror from `sale_ok`; returned by `GET /products`. Products created in OXO ERP default to true.
3. `GET /orders?odooIds=1,2,…` and `GET /orders?ids=1,2,…`: those orders in any state, same shape and limits as `?crmNumbers=` (1–200 values, else 422). `odooIds` finds orders sent to Odoo before the switch; `ids` lets the connector re-read imported orders, which the paged list drops once they leave `sale`.
4. Tests for each in the existing `/api/v1` test style.

## 3. Plugin `plugins/oxo-erp-connector` (v0.1.0)

Same layout as `odoo-connector`: `plugin.ts`, `settings.ts`, `store.ts`, `oxo.ts`, `match.ts`, `sync.ts`, `catalog.ts`, `orders-out.ts`, `orders-status.ts`, `orders-in.ts`, `customer-info.ts`, `ui/`, `messages/` (en, cz, de, uk), `__tests__/`. Registered with `pnpm plugins:generate --public-only`.

`oxo.ts` is the only file that talks HTTP: bearer key, `ctx.http.fetch`, cursor paging (`limit`, `cursor`, `nextCursor`), `updatedSince`, errors mapped to `{ status, code, message }`.

### 3.1 Settings

| Setting | Default | Meaning |
|---|---|---|
| `url` | — | OXO ERP base URL, e.g. `https://oxo-erp.xe.cz` |
| `syncMinutes` | 15 | how often the scheduled sync runs |
| `timeZone` | `UTC` | for dates shown and sent (as `odoo-connector`; OXO sets `Europe/Prague`) |
| `priceLists` | [] | OXO ERP price list ids to bring in (their base lists come too) |
| `dryRun` | true | report only, write nothing to the CRM, send nothing |
| `sendOrders` | false | send READY orders |
| secret `apiKey` | — | `oxo_` + 40 characters |

### 3.2 Refs

One rule for every row the plugin writes to a core `externalRef`:

```ts
const ref = (row: { id: number; odooId: number | null }) => row.odooId != null ? String(row.odooId) : `oxo:${row.id}`;
```

A row OXO ERP mirrors from Odoo therefore lands on the row `odoo-connector` already made. Categories (name only) use `oxo-cat:<name>` when no CRM category with that name exists (§ 4.2).

### 3.3 Store keys (plugin-scoped)

- `customer:<oxoId>` → `{ accountId }`; `account:<accountId>` → `{ customerId, addresses: Record<oxoAddressId, …> }`
- `product:<crmProductId>` → `{ oxoId }` (a ref like `"533"` is an Odoo id, not the OXO ERP id the order POST needs)
- `pricelist:<oxoId>` → `{ priceListId }`
- `order:<crmOrderId>` → `{ oxoId, number, delivery, done }`
- `conflict:customer:<oxoId>` → `{ candidates: accountId[] }`; `conflict:order:<crmOrderId>` → `{ message }`
- `send:<crmOrderId>` (claim), `failed:<crmOrderId>`
- `meta:cursor:<kind>`, `meta:lock`, `meta:lastRun`, `meta:sendPaused`, `meta:report` (last dry-run report)

### 3.4 Jobs and hooks

- Cron `*/5`: queued sends → status sweep → scheduled sync (when `syncMinutes` have passed). One run at a time (`meta:lock`).
- Hook `after("order","updated")`: send an order that just turned READY.
- Admin actions: test connection, sync now.

## 4. Behaviour

### 4.1 Customers (`GET /customers?updatedSince=`)

For each customer, in order:
1. Linked (`customer:<oxoId>`): update the account.
2. Match among unlinked CRM accounts: country + IČO (CZ padded to 8 digits), then DIČ (normalized as in `odoo-connector`), then exact name + zip. One hit → link and update; the account keeps its owner.
3. Two or more hits at the first step that finds any → no link, no write; `conflict:customer:<oxoId>` with the candidates.
4. No hit → create the account with no owner.

OXO ERP wins on the fields it sends; an empty value never clears a CRM field. Addresses become account addresses as `odoo-connector` maps Odoo delivery addresses. The customer's `priceListId` sets the account's price list through `pricelist:`. An inactive customer is handled as `odoo-connector` handles an archived partner.

### 4.2 Products (`GET /products?updatedSince=`)

Upsert by `(EXTERNAL, ref)`. A product not yet in the CRM comes in only when `saleOk && active`; one already in the CRM keeps getting updates when it stops being sellable (as `odoo-connector`). `product:<crmId>` records its OXO ERP id. The category name links to an existing CRM category with the same name (case-insensitive), else a new `oxo-cat:<name>` category.

### 4.3 Price lists (`GET /price-lists`)

The lists in `priceLists` plus the lists they are based on, bases first. Each is a full snapshot: the list row is upserted by ref, its rules are replaced. Rules point to products and categories through the same refs.

### 4.4 First run = takeover

The first poll returns every row, so the first sync covers the whole customer base and catalogue. With `dryRun` on, it writes only `meta:report`: counts and rows for linked (by ref, IČO, DIČ, name + zip), would create, conflicts. The admin section shows it. This is how the takeover is checked on practice before any write.

### 4.5 Orders out

Sent when the order is READY with no `externalRef`, `sendOrders` is on, `dryRun` is off and `meta:sendPaused` is not set; from the hook, or from the sweep (oldest first, up to 200). `store.claim(send:<id>)` prevents a double send.

`POST /orders` body:
- `crmNumber`: the CRM order number;
- `customerId` when the account is linked, else inline `customer` (name, IČO, DIČ, billing address, email, phone); the returned `customerId` links the account;
- `deliveryAddressId` when the order's shipping address matches a linked address, else inline `deliveryAddress` when the order has one;
- `currency`, `requestedDate`, `note`, `salesRep` (owner's name);
- lines: `productId` from `product:<crmId>`, `quantity`, `unitPrice`, `discount`.

Responses:
- 201 / 200: order SENT, `externalRef = "oxo:<id>"`, `order:<crmId>` stored; `belowList` lines reported like `odoo-connector`'s price differences.
- 409: `conflict:order:<crmId>`, status SYNC_FAILED; never resent by itself.
- 422: SYNC_FAILED with OXO ERP's message; one notification.
- 503 `writes_disabled`: set `meta:sendPaused`, one notification; orders stay READY.
- Network error or timeout: claim released, retried next sweep. Safe because a repeated `crmNumber` gives 200. (`odoo-connector` never retries writes; this is the deliberate difference.)
- A line whose product has no `product:` entry: SYNC_FAILED naming the product; nothing sent.

### 4.6 Statuses back

Each sweep re-reads every sent order not PAID or CANCELLED:
- sent by this plugin (`oxo:` ref): `?crmNumbers=`;
- sent to Odoo before the switch (numeric `externalRef`): `?odooIds=`.

Mapping: `cancel` → CANCELLED; `sale` / `done` → CONFIRMED; `delivery == "full"` → DELIVERED; `draft` / `approval` leave the status as it is. Forward only (SENT < CONFIRMED < DELIVERED). An order not found keeps its status, with one notification per order.

### 4.7 Orders in

`GET /orders?updatedSince=` (paged, `sale` only). An order without `crmNumber` on a linked customer is created or updated as an EXTERNAL CRM order by ref, with its lines, so old Odoo orders `odoo-connector` already imported are updated, not duplicated. An order whose customer is not linked waits for the customer sync. Imported orders that are not final are re-read by `?ids=` (or `?odooIds=`) in the status sweep, so a later cancel or delivery reaches the CRM.

## 5. Screens

- Account panel and tab: OXO ERP customer id, price list, delivery addresses, order history with delivery state.
- Product panel: OXO ERP id and code.
- Order panel: OXO ERP number, delivery state (none / partial / full), lines flagged below list, the error if sending failed.
- Needs owner page: accounts this plugin created that still have no owner; picking an owner takes the account off the list.
- Admin section: test connection, sync now, last run with counts, the dry-run report, the conflict list (customer: pick the right account; order: mark handled), the send-paused notice.

All texts in en, cz, de, uk.

## 6. Running beside `odoo-connector`

The two must never write to the same CRM at once. A plugin cannot read another plugin's settings, so this is a rollout rule, not code: at S7, switch `odoo-connector` off, then turn off this plugin's `dryRun`.

## 7. Testing

Plugin (Jest, `createTestContext`, a fake OXO ERP router in `__tests__/fake-oxo.ts` with cursor paging and 201/200/409/422/503 answers):
- takeover through refs: products, lists and orders `odoo-connector` made are updated, none duplicated;
- account matching order IČO → DIČ → name + zip; a two-hit match goes to conflicts;
- a new account has no owner and is on Needs owner;
- dry run writes nothing to the CRM and fills the report;
- a send retried after a timeout gets 200 and leaves one order;
- an unlinked account is sent inline and linked from the answer;
- 503 pauses sending; 409 and 422 end in SYNC_FAILED;
- statuses move forward only; an order sent to Odoo before the switch is tracked through `odooIds`;
- EXTERNAL order import, and a later cancel of an imported order reaching the CRM through `ids`.

OXO ERP PR: API tests for `odooId`, `saleOk`, `?odooIds=`, `?ids=`.

Acceptance (Jarvis runs it):
1. Snapshot the local NextCRM DB (it holds `odoo-connector` data).
2. Point local NextCRM at practice OXO ERP with the practice key.
3. Dry-run report: products, lists and orders linked not created, accounts matched, conflicts make sense.
4. Real sync: no duplicates; new accounts on Needs owner.
5. CRM order → READY → appears in practice OXO ERP.
6. Pick and ship it in practice → CRM shows DELIVERED.

## 8. Rollout

1. OXO ERP PR merged and deployed (practice first).
2. Plugin ships with the normal NextCRM release as v0.1.0.
3. Installed on oxo.nextcrm.app only at S7. Until then the live instance is not repointed.

## 9. Risks

- Practice and production ids differ: the takeover report must be read again on production at S7 before `dryRun` goes off.
- Name + zip matching can link a wrong account when two companies share a name and zip; the report lists every name + zip link for a check.
- The first poll returns every row (712 products, all customers): several pages, so a run that stops halfway resumes from `meta:cursor:<kind>` on the next cron.

## 10. Amendments while planning (2026-10-18)

Found while reading the code for the plans; A1 is Pavel's choice, the rest follow from what the SDK and OXO ERP can do.

- **A1 Categories (Pavel: "SDK read").** A plugin cannot read CRM categories, only create them, so § 4.2's name match cannot work as written. NextCRM core gets `productCategories.findExternal()` → `{ id, ref, name, parentRef }[]` (SDK 0.2.6, `products:read`). The connector builds each CRM category's full path (`Zásoby / Výrobky / Koncentrát / K ČKS`, the same form OXO ERP sends) and links OXO ERP's category to it; a path not in the CRM is created as `oxo-cat:<path>` under its parent path (created the same way when missing). Price rules on a category use the same lookup. The plugin requires `sdk: "^0.2.6"`.
- **A2 More OXO ERP output.** Products also return `odooTemplateId` (price rules on a product template expand to its variants, as in OXO ERP's own pricing) and price rules return `odooId` (rule order and refs). Both columns exist.
- **A3 Addresses and people.** `odoo-connector` never copied delivery addresses onto accounts, and the CRM account has one billing address. OXO ERP addresses are kept in the plugin's account link, shown on the account panel and used to pick `deliveryAddressId`; they are not written to account fields. OXO ERP has no contact persons, so contacts `odoo-connector` imported stay as they are and are no longer synced.
- **A4 Conflicts.** Admin actions take no input, so "pick the right account" is done as in `odoo-connector`: the conflict list links the candidate accounts, the admin fixes the CRM data (merges the duplicate or corrects the IČO), and the next sync links the customer. A 409 order goes to the failed-orders list (SYNC_FAILED with OXO ERP's message) instead of a separate list; Retry after fixing.
- **A5 What the takeover changes on existing rows.** Product names become OXO ERP's name without Odoo's `[code]` prefix (the SKU stays in its own field). Tax rate, cost and description are not sent by OXO ERP and are kept as they are ("empty never clears" applies to products too). Price lists are replaced with OXO ERP's rules, which do not include Odoo formula or cost-based rules (OXO ERP's mirror skips them); the dry-run report lists every list replaced.
- **A6 Smaller rulings.** `defaultCountry` (default `CZ`) stays as a setting because OXO ERP sends country names, not codes, and some customers have none; a `currency` setting (default `CZK`) gives the currency of OXO ERP list prices. Statuses are re-read by OXO ERP id (`?ids=`) for every order this plugin sent or imported and by `?odooIds=` for orders from before the switch; `?crmNumbers=` is not needed. There is no `customer-info.ts`: the account tab's invoices and totals come with S5. The Needs owner page lists every linked account without an owner (as `odoo-connector` does), not only ones this plugin created. An admin action "Load price lists" shows OXO ERP's lists and ids for the `priceLists` setting, which takes OXO ERP list ids.
