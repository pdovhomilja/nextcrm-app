# Odoo connector, part 3b: Odoo orders in, account tab — design

Date: 2026-10-11. Status: approved in chat by Pavel (three sections), awaiting review of this document.
Parent specs: `docs/superpowers/specs/2026-10-11-odoo-connector-orders-out-design.md` (part 3a), `docs/superpowers/specs/2026-10-10-odoo-connector-catalog-design.md` (part 2), `docs/superpowers/specs/2026-10-10-odoo-connector-customers-design.md` (part 1), `docs/superpowers/specs/2026-10-10-orders-design.md` (core orders, SDK order API), `docs/superpowers/specs/2026-10-04-plugin-system-design.md` (plugins).

## 1. Goal

Before a visit, a rep sees in the CRM everything the customer bought, including orders the office entered in Odoo, and whether the customer owes money. Confirmed Odoo orders of linked customers become read-only CRM orders with their real status, and the account gets an **Odoo** tab with the orders, open invoices and yearly totals.

Success:
- every confirmed Odoo order (`sale`, `done`) of a customer linked to a CRM account exists in the CRM exactly once, within one sync cycle (15 minutes by default), including the history from before the link;
- orders the CRM sent to Odoo (part 3a) are never imported a second time;
- imported orders follow Odoo's status like sent orders (CONFIRMED → DELIVERED → INVOICED → PAID, CANCELLED);
- the account's Odoo tab shows the account's Odoo orders, its open invoices with the total owed, and its confirmed totals for this year and last year, without calling Odoo when it opens;
- nothing is ever written to Odoo by this part; in dry run nothing is written to the CRM either.

### 1.1 Decisions (Pavel, 2026-10-11)

1. Purpose A: reps **see** Odoo orders. They are read-only and do not feed CRM reports or dashboards beyond what core already does with orders.
2. Scope A: confirmed orders only, the full history, for customers linked to a CRM account. Quotations and orders cancelled before import stay out. An imported order cancelled later in Odoo becomes CANCELLED.
3. Tab A: orders, open invoices, totals this year and last year.
4. An Odoo order the connector can no longer find is never cancelled automatically (same rule as part 3a after PR #372).

### 1.2 Facts (GIPS Odoo 19.0+e, read 2026-10-11)

- 176 sale orders: 38 from 2025, 138 from 2026; 153 confirmed, 21 cancelled, 2 draft. About 15–20 distinct customers. None from an Odoo website (`website_id` empty on all).
- Lines on confirmed orders: 1,788 product lines; 23 note or section lines (no amount); 31 down-payment lines (`is_downpayment`, about 634k CZK); 9 other service lines.
- Orders ship to child delivery partners, so the customer is the order partner's `commercial_partner_id`.

### 1.3 Not in scope

- Quotations (draft, sent) and orders cancelled before they were imported.
- Writing anything to Odoo.
- Deliveries on the account tab (they stay on each order's panel).
- Editing imported orders in the CRM; core already keeps EXTERNAL orders read-only for users.

## 2. Core

No core or SDK change. The SDK already offers everything needed:
- `orders.create(ExternalOrderInput)`: EXTERNAL order with `accountId`, `externalRef`, `status` (SENT…PAID, CANCELLED), `currency`, `orderDate`, `note`, `lines` (`productId`, `quantity`, `unitPrice`). Core numbers it from the CRM order series, sets the owner to the account's owner, takes VAT from the CRM product and refuses an unknown account or product.
- `orders.update(id, { lines, note, orderDate, status })`: replaces the lines of an EXTERNAL order; statuses only forward.
- `x.accountTab({ id, title, component, roles })`.

## 3. Plugin `plugins/odoo-connector` (v0.4.0, SDK ^0.2.4)

- Extensions added: `x.accountTab({ id: "odoo", title: "Odoo", component: AccountTab })`, visible to every role that can see the account.
- New files: `orders-in.ts` (import, line refresh), `customer-info.ts` (open invoices and totals per account), `ui/AccountTab.tsx`.
- Changed: `sync.ts` (runs the import and the customer info after the status check), `orders-status.ts` (refreshes imported orders' lines, notices a changed customer), `store.ts`, `ui/data.ts`, `ui/AdminSection.tsx`, `ui/OrderPanel.tsx`.
- No new setting and no new permission (`orders:write` exists since 0.3.0).

### 3.1 Plugin storage (new keys and fields)

| Key | Value |
|---|---|
| `order:<crmId>` (existing `OrderLink`) | new optional fields: `imported: true` for orders that came from Odoo; `partnerId` (the Odoo customer at import); `writeDate` (Odoo `write_date` of the order when its lines were last copied); `movedNotified` |
| `odooOrder:<odooId>` | `{ orderId }` — the CRM order for an Odoo order, sent or imported (reverse index) |
| `importFailed:<odooId>` | `{ name, reason, at }` while an Odoo order cannot be imported |
| `customer:<accountId>` | `CustomerInfo { at, invoices: OpenInvoice[], totals: { year, currency, amount }[] }` |
| `meta:imported` | `{ total, lastRun }` — imported orders in total and on the last run |

`OpenInvoice = { number, type: "out_invoice" | "out_refund", date, due, currency, amount, residual }`.

Part 3a's `send` path also writes `odooOrder:<odooId>` when it links a sent order, so both directions share one index. Orders sent before 0.4.0 are indexed on the first run from their `order:` links.

## 4. Behaviour

### 4.1 When

Inside `runSync`, after the status check (`syncOrderStatuses`), on every sync (`syncMinutes`, or **Sync now**). No new schedule and no switch: importing only reads Odoo. A failure in the import or the customer info is logged and never fails the rest of the sync (as for the status check), except Odoo refusing access (401/403), which fails the run as everywhere else.

### 4.2 Which Odoo orders

1. Linked customers: every `partner:<odooId>` key (customers linked to an account).
2. One call: `sale.order` `search_read`, domain `state in (sale, done)` and `partner_id.commercial_partner_id in <linked ids>`, fields `id, name, partner_id, origin, date_order, currency_id, note, write_date`, ordered by `id`.
3. Skip orders that already have `odooOrder:<id>`, and orders whose `origin` equals the number of an existing CRM order (a 3a order whose link was lost; it is indexed instead).
4. Take at most 200 new orders per run, oldest first; the rest come on the next runs.

Comparing ids every run, rather than a `write_date` cursor, means a customer linked later still brings its full history on the next run. With GIPS's 153 confirmed orders this is one small call.

### 4.3 Importing one order

1. Customer → account: the order partner's commercial partner, via `partner:<id>` → `accountId`.
2. Lines: `sale.order.line` `search_read` for the order, fields `product_id, product_uom_qty, price_unit, display_type, is_downpayment`. Keep lines with `display_type = false`, `is_downpayment = false` and a product linked by the catalog (`product:<odooId>` → CRM `productId`). Quantity and unit price from Odoo. Count lines skipped because their product is not in the CRM.
3. Status: part 3a's `targetStatus` on the order, its invoices and deliveries (same reads as the status check).
4. Create: `orders.create({ accountId, externalRef: String(odooId), status, currency: <Odoo currency code>, orderDate: <date_order, day in UTC>, note, lines })`. `note` = the Odoo note as plain text, plus "N lines not shown: products not in the CRM" when lines were skipped.
5. Store `order:<crmId>` (`OrderLink` with `imported: true`, `partnerId`, `writeDate`, name, state, total, deliveries, invoices) and `odooOrder:<odooId>`; delete `importFailed:<odooId>`.

An order with no line left (every product missing) is still imported, with the note, so the order and its total are visible.

Failure for one order (unknown currency in the CRM, core refusing the create): `importFailed:<odooId>` = `{ name, reason, at }`, logged, retried every run; other orders continue.

Dry run: logs "would import order S00123 for <account> (N lines, status X)", writes nothing.

### 4.4 Keeping imported orders current

The existing status check (`syncOrderStatuses`) already reads every open linked order. For imported orders it additionally:
- reads `write_date` and `partner_id`; when `write_date` differs from `writeDate`, re-reads the lines and replaces them with `orders.update(id, { lines, note })`, then stores the new `writeDate`;
- when the order's commercial partner is no longer `partnerId` (moved to another customer in Odoo): the CRM order keeps its account, the panel shows "Customer changed in Odoo", admins get one email (`movedNotified`).

Statuses move only forward, as in 3a. An imported order Odoo no longer returns is "Not found in Odoo" with one email, never cancelled.

### 4.5 Customer info for the account tab

After the import, two calls for all linked customers:
1. Open invoices: `account.move` `search_read`, domain `move_type in (out_invoice, out_refund)`, `state = posted`, `payment_state in (not_paid, partial)`, `commercial_partner_id in <linked ids>`; fields `name, move_type, commercial_partner_id, invoice_date, invoice_date_due, currency_id, amount_total, amount_residual`.
2. Totals: `sale.order` `read_group`, domain `state in (sale, done)`, `partner_id.commercial_partner_id in <linked ids>`, `date_order` from 1 January of last year; group by commercial partner, `date_order:year`, `currency_id`; sum `amount_untaxed`. If the Odoo version refuses grouping by the related field, group by `partner_id` and fold children into their commercial partner from the `res.partner` read the sync already does.

Each linked account's `customer:<accountId>` is replaced with `{ at: now, invoices, totals }`; an account with nothing open gets empty lists. Not written in dry run.

### 4.6 Account tab "Odoo"

Built from storage and CRM data only; no Odoo call when it opens.
- Not linked: "Not linked to an Odoo customer".
- Header: "As of <customer.at>" in the instance time zone (`localTime`).
- **Orders:** the account's CRM orders that have an `order:` link (sent or imported), newest first by order date, at most 50: Odoo number, date, total without VAT, CRM status, link to the CRM order. Below: "All orders in Odoo" → `<url>/odoo/action-sale.action_orders?…` filtered to the customer (or the customer form when filtering by URL is not possible).
- **Open invoices:** total owed at the top (sum of residuals per currency, refunds negative); then number, invoice date, due date, total, left to pay; overdue (due before today in the instance time zone) in red with "N days overdue".
- **Totals:** confirmed orders without VAT, this year and last year, per currency.

### 4.7 Order panel

Imported orders show the same panel as sent ones, plus "Imported from Odoo" and, when set, "Customer changed in Odoo".

### 4.8 Admin section

The Orders block gets "Imported from Odoo: N in total, M on the last run" and a list of `importFailed:` entries (Odoo number, reason). The "Last run" line gets "imported M" with the order counts.

## 5. Edge cases

| Case | Behaviour |
|---|---|
| Customer linked to two accounts | cannot happen: part 1 conflicts block the second link |
| Account unlinked, merged or deleted in the CRM | its imported orders stay; no new orders arrive (no `partner:` key) |
| Odoo order moved to another customer | CRM order keeps its account; panel note; one email to admins |
| Odoo order deleted, or hidden from the API user | "Not found in Odoo", one email, never cancelled |
| Line product not in the CRM | line skipped, counted in the order note |
| Down payments, notes, section lines | skipped |
| Currency missing in the CRM | order not imported, listed under failed imports with the reason |
| CRM order whose 3a link was lost but whose number is in Odoo's `origin` | indexed to that CRM order, not imported |
| First import of a large Odoo | 200 orders per run, oldest first |

## 6. Screens and texts

Account tab (§ 4.6), order panel additions (§ 4.7), admin Orders block (§ 4.8), the "moved" and "failed import" log lines and email. All texts in en, cz, de, uk. Admin docs `apps/docs/content/docs/admins/plugins/odoo-connector.mdx`: an "Orders from Odoo" section (what comes in, lines skipped, read-only, history, the tab) and the account tab.

## 7. Testing

Fake Odoo as in parts 1–3a (`salesHandlers` extended with `read_group` and line fields), jest:
- selection: confirmed only; linked customers only (child delivery partner → commercial partner); history before the link; 200 per run; already indexed and `origin` matches skipped;
- import: account, status, currency, order date, note, lines; notes, sections, down payments and unknown products skipped with the note; no line left still imports;
- never twice: re-run imports nothing; a 3a-sent order is never imported; a lost 3a link is indexed by `origin`;
- failures: unknown currency → `importFailed`, others continue, retried next run; one failing order does not fail the sync;
- keeping current: status forward; lines replaced when `write_date` changes and not otherwise; moved customer → note and one email; missing → one email, not cancelled;
- customer info: open invoices and refunds, residuals, overdue days, totals by year and currency, empty lists for accounts with nothing open;
- dry run writes nothing (CRM or store);
- tab, panel and admin data builders.

Live check (local only, GIPS is only read):
1. Clone the local CRM database first (lesson of 2026-10-11) and point the dev server at the clone.
2. Connector on the clone, pointed at GIPS with the NextCRM API key (this part only reads Odoo); customers and catalog already imported.
3. Dry run: the log lists about 153 orders to import.
4. Import: the CRM has one order per confirmed GIPS order; counts per customer and totals checked against Odoo; skipped lines explained.
5. Re-run: nothing new, nothing duplicated.
6. Chrome: the Odoo tab on three customers (one with overdue invoices), an imported order's panel.
7. Drop the clone afterwards.

## 8. Risks

- **VAT differs from Odoo.** Core computes VAT from the CRM product's tax rate, so a CRM total can differ from Odoo's; the panel already shows Odoo's total when it differs. Totals on the tab come from Odoo.
- **Volume.** GIPS is small; a large Odoo would make the per-run id comparison and the customer info calls heavier. 200 orders per run bounds the import; the two customer-info calls are one request each.
- **Rights.** The API user needs read on `sale.order`, `sale.order.line`, `account.move`, `stock.picking`, already required since 3a. If invoices are hidden from it, the tab shows no invoices and the log says why.
