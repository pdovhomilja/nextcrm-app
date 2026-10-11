# Odoo connector, part 3a: orders out, statuses back — design

Date: 2026-10-11. Status: approved in chat by Pavel (four sections), awaiting review of this document.
Parent specs: `docs/superpowers/specs/2026-10-10-orders-design.md` (core orders, SDK 0.2.0 order API), `docs/superpowers/specs/2026-10-10-odoo-connector-customers-design.md` (part 1), `docs/superpowers/specs/2026-10-10-odoo-connector-catalog-design.md` (part 2), `docs/superpowers/specs/2026-10-04-plugin-system-design.md` (plugins). OXO implementation plan v1.2 § 8.3 "Zápis", § 8.5, § 10 criteria 10, 11, 13, 15 (claudeOS `staging/oxofactory/2026-10-04-oxo-crm-nextcrm-implementacni-plan-v1.2.md`), milestone M2 (18 Dec 2026).
Part 3 of 3 is split (Pavel, 2026-10-11): **3a orders out and statuses back** (this spec); 3b Odoo-made orders and order history in, and the Odoo tab on the account.

## 1. Goal

A rep's finished order reaches the Odoo ERP without anyone retyping it, and the rep sees in the CRM what happens to it there: a READY order becomes a draft sale order in Odoo (with the customer and delivery address created there when missing), exactly once, and Odoo's confirmation, delivery, invoice and payment come back as the order's status.

Success:
- a READY order exists in Odoo as a draft sale order exactly once, even when sending is repeated or interrupted after any write (criterion 11);
- an order below list waits for approval and is not sent before it is READY (criterion 10; core already guarantees this, the connector sends only READY);
- an Odoo outage never blocks reps: READY orders wait and go out when Odoo is back (criterion 15);
- confirmation, full delivery, invoice and payment in Odoo show as CONFIRMED, DELIVERED, INVOICED, PAID in the CRM within one sync cycle, 15 minutes by default (criterion 13);
- the CRM's approved unit price is what Odoo gets; a difference from Odoo's own price list is shown, never silently applied;
- nothing is written to Odoo while `sendOrders` is off or `dryRun` is on.

### 1.1 Decisions (Pavel, 2026-10-11)

1. Split: 3a out + statuses back; 3b in (Odoo-made orders, history, account tab).
2. Writes are tested on a local Odoo 19 Community in Docker filled by a read-only copy from GIPS; never against GIPS production.
3. Billing mode: end customer only. The "via intermediary" mode gets its own spec once OXO decides D1.
4. The connector may create a missing customer (found by registration number, then VAT) and a missing delivery address in Odoo.
5. Lines go with the CRM unit price; a difference from Odoo's price list over 1 (order currency) is flagged.
6. Approach A: send on the order event, plus a sweep on the 5-minute cron.

### 1.2 Facts (GIPS Odoo 19.0+e, read 2026-10-11)

- 176 sale orders: 153 confirmed (`sale`), 2 draft, 21 cancelled; 164 posted customer invoices and credit notes (117 paid, 30 not paid, 2 partial, 6 reversed, 9 refunds); 536 outgoing deliveries.
- `client_order_ref` holds customers' own PO numbers (e.g. "686844-1"); `origin` is empty on recent orders. The CRM number therefore goes to `origin`.
- Orders ship to child delivery partners (e.g. a depot under the customer).
- A second sequence `ADV…` exists next to `S…` (add-on `sale_order_advance_invoice`); orders the connector creates use Odoo's default sale sequence.
- 390 installed modules, Enterprise and third-party add-ons among them; a local Community copy cannot reproduce them (§ 8).

### 1.3 Not in scope

- Importing orders created in Odoo, order history, the Odoo tab on the account (3b).
- The "via intermediary" billing mode.
- Editing, confirming or cancelling Odoo orders from the CRM. The connector only creates in Odoo.
- Changing a CRM order's lines to match Odoo after GIPS edits the Odoo order (shown on the panel instead).

## 2. Core change: SDK 0.2.4, atomic claim

The plugin store has `get`/`set`/`delete`/`list` only; a lock taken with `get` then `set` races. Sending is the first job where a race costs money (two Odoo orders), so the store gains one call:

- `ctx.store.claim(key: string, ms: number): Promise<boolean>` — true when this caller now holds `key` until `now + ms`; false when someone else holds it and it has not expired. One SQL statement on `PluginData` (`INSERT … ON CONFLICT (pluginId, entityType, entityId, key) DO UPDATE … WHERE` the stored `until` has passed, `RETURNING`). Released with `delete(key)`. Also on `forRecord(...)` stores.
- `SDK_VERSION` 0.2.3 → 0.2.4 (patch-level addition; `^0.2.x` plugins keep loading). Testing helpers get the in-memory `claim`. Developer docs (`plugins.mdx`) get one paragraph.

No other core change: the order API (create, update `status` and `externalRef`, SYNC_FAILED), the order event, the order panel, Retry (SYNC_FAILED → READY by managers and admins) and the "no Reopen once `externalRef` is set" rule exist since SDK 0.2.0.

## 3. Plugin `plugins/odoo-connector` (v0.3.0, SDK ^0.2.4)

- Permissions added: `orders:read`, `orders:write`.
- Extensions added: `x.on("crm/order.saved", …)` (send when the order is READY), `x.orderPanel({ id: "odoo", … })`. The existing cron also runs the send sweep and the status read.
- New files: `orders-out.ts` (send one order, sweep), `orders-status.ts` (read back), `odoo-partners.ts` (find/create customer and delivery address), `ui/OrderPanel.tsx`; admin section gains the Orders block.

### 3.1 Settings

| Setting | Type | Default | Meaning |
|---|---|---|---|
| `sendOrders` | boolean | false | Send READY orders to Odoo. Off: the connector never writes to Odoo. |

`dryRun` (existing) also covers sending: the log shows what would be created, nothing is written, orders stay READY. No new secrets. The Odoo user needs create on `res.partner`, `sale.order`, `sale.order.line` and read on the models parts 1–2 read; the admin docs list this.

### 3.2 Plugin storage (new keys)

| Key | Value |
|---|---|
| `order:<crmOrderId>` | `OrderLink { odooId, name, state, sentAt, total, totalDiffers, priceDiffs[], deliveries[], invoices[], created: ("customer"\|"delivery")[], checkedAt }` |
| `send:<crmOrderId>` | `{ attempts, lastError, waitingSince }` while READY and not yet sent |
| `failed:<crmOrderId>` | `{ reason, at }` while the order is SYNC_FAILED |
| `sending:<crmOrderId>` | claim, 10 minutes |
| `meta:sendPaused` | `{ at, reason }` after a 401/403 |
| `meta:created` | last 20 customers / delivery addresses created in Odoo `{ at, kind, odooId, name, orderNumber }` |

## 4. Behaviour

### 4.1 When an order is sent

- Event: on `crm/order.saved` whose order is READY and has no `externalRef`, send it.
- Sweep: every cron run (5 min), send every READY order without `externalRef`, oldest first.
- Both go through the same `sendOrder`, which first takes `claim("sending:<id>", 10 min)` and returns when it fails, so event and sweep never send one order twice at the same time. Before any write it re-reads the order and stops unless it is still READY without `externalRef`.
- Nothing is sent while `sendOrders` is off, `dryRun` is on (log only), or `meta:sendPaused` is set (§ 5).

### 4.2 Sending one order (Odoo writes marked ✍)

Checks first; a failure here is final and the order goes to SYNC_FAILED at once (§ 5):
- every line's product is an Odoo product of this connector (`ProductLink` exists) — else "Product <sku/name> does not come from Odoo";
- the account has a name and, when it is not linked, a country.

1. **Customer.** The account's linked partner (part 1 `AccountLink`). Otherwise search `res.partner` (companies, active) by `company_registry` = the account's registration number within its country, then by `vat`. Found → link the account (as part 1). Not found → ✍ create a company partner: name, `company_registry`, `vat`, billing street/city/zip/country, email, phone, `customer_rank` 1, `user_id` = salesperson (below); link the account; add to `meta:created`.
2. **Delivery address.** No shipping address on the order → `partner_shipping_id` = the customer. Otherwise compare (street, city, postal code; trimmed, case and whitespace folded) with the customer and its children of `type = delivery`; a match is used. No match → ✍ create a child partner `type = delivery` with the order's shipping fields; add to `meta:created`.
3. **Duplicate check.** `sale.order` search `origin = <CRM number>`, `state != cancel`. Found → skip to 5 with that order.
4. ✍ **Create** `sale.order` (draft): `partner_id`, `partner_shipping_id`, `pricelist_id` = the order's price list when it is an EXTERNAL list of this connector (its Odoo id), else the customer's `property_product_pricelist`; `origin` = CRM number; `user_id` = salesperson; `commitment_date` = `requestedDeliveryDate`; `note` = "<rep name>" + the order note; `order_line` = one line per CRM line: Odoo variant id, `product_uom_qty` = quantity, `price_unit` = CRM `unitPrice`. Taxes come from Odoo's product setup. Before creating, the order currency must equal the chosen price list's currency, else final failure "Order currency X differs from Odoo price list Y".
5. **Mark sent.** `orders.update(id, { status: "SENT", externalRef: <odoo id> })`; store `OrderLink` (name, state, total); delete `send:<id>`.
6. **Price check (read only).** For each line, `sale.order.line/onchange` with the order's price list and quantity (as part 2's compare) gives Odoo's price; `|odoo − crm| > 1` → entry in `priceDiffs` (sku, crm, odoo). Failure of this step is logged and never fails the send.

Salesperson: the Odoo user whose login or email equals the order owner's email (case-insensitive); else the customer's existing `user_id`; else none.

**Reopened in between.** If step 3 finds an Odoo order for the number whose lines (product, quantity, price) differ from the CRM order, the connector does not touch it: final failure "Already in Odoo as <name> with other lines; ask Odoo to cancel it". After it is cancelled there, Retry sends a new one (cancelled orders are not matched).

### 4.3 Statuses back

Runs in every sync cycle (`syncMinutes`) after customers and catalog. Reads every order with an `OrderLink` whose CRM status is not PAID or CANCELLED: `sale.order` (`state`, `delivery_status`, `invoice_status`, `invoice_ids`, `amount_total`, `picking_ids`), their `stock.picking` (`name`, `state`, `date_done`, `picking_type_code = outgoing`), their `account.move` (`name`, `invoice_date`, `invoice_date_due`, `amount_total`, `amount_residual`, `payment_state`, `move_type`, `state = posted`).

| Odoo | CRM status |
|---|---|
| `state` draft or sent | SENT |
| `state = sale` | CONFIRMED |
| `delivery_status = full` | DELIVERED |
| `invoice_status = invoiced` and at least one posted `out_invoice` | INVOICED |
| every posted `out_invoice` not reversed has `payment_state` paid or in_payment | PAID |
| `state = cancel`, or the order no longer exists | CANCELLED |

- The CRM order takes the highest status reached; steps may be skipped (core allows it).
- Never backwards: a lower Odoo state leaves the CRM status and logs "Odoo order <name> went back to <state>".
- Partial delivery stays CONFIRMED, partial payment stays INVOICED; the panel shows the detail.
- `OrderLink` is refreshed: state, total, `totalDiffers` (`|odoo total − CRM grandTotal| > 1`), deliveries, invoices.
- A manual status change in the CRM is not undone; a further Odoo step moves it forward from there.

### 4.4 Order panel "Odoo"

On the CRM order page (all roles who can see the order):
- Odoo name linked to `<url>/odoo/action-sale.action_orders/<odooId>`, Odoo state;
- "Price differs from Odoo": the lines from `priceDiffs` (CRM price, Odoo price);
- "Odoo total differs" with both totals, when `totalDiffers`;
- deliveries (name, state, shipping date); invoices (number, due date, amount, left to pay, payment state);
- "Customer created in Odoo" / "Delivery address created in Odoo" when this order created them;
- not yet sent: "Waiting for Odoo since <time>" with the last error; SYNC_FAILED: the reason from `failed:<id>`.

### 4.5 Admin section, Orders block

- Counts: waiting to be sent, sent in the last 7 days, failed (`failed:` entries).
- Failed orders with reason and link; `meta:sendPaused` banner with its reason.
- `meta:created`: the last 20 customers and delivery addresses created in Odoo, for the Odoo team to check.

## 5. Failures

| Kind | Examples | Effect |
|---|---|---|
| Odoo unreachable | network error, timeout, HTTP 5xx, 429 | no attempt counted; `send:<id>.waitingSince` set; order stays READY; the next event or sweep tries again |
| Odoo refuses everything | HTTP 401, 403 | no attempt counted; `meta:sendPaused` set, sending stops for all orders; admins notified once ("Odoo denied access"); cleared only by a successful **Test connection**, so a key that can read but not create does not re-notify every cycle |
| Odoo refuses this order | other 4xx / Odoo `UserError`, `ValidationError` | attempt counted with the message; at 5 attempts → SYNC_FAILED, admins notified (order number, reason) |
| Final check failure | § 4.2 checks, currency mismatch, reopened with other lines | SYNC_FAILED at once, admins notified |

- Going to SYNC_FAILED moves the record: `failed:<id>` = `{ reason, at }`, `send:<id>` deleted. Core's Retry (SYNC_FAILED → READY) emits the order event; the connector deletes `failed:<id>` and starts a fresh `send:<id>`, so a retried order gets 5 new attempts.
- Every Odoo write is repeat-safe: a created customer is linked before the next step (found by link or registration number next time), a created delivery address is found by address, a created order by `origin`. A send that dies after any write, including a timeout where Odoo saved, ends with exactly one partner, delivery address and order.
- The claim's 10 minutes outlive any single send; a crashed sender's claim expires and the sweep picks the order up.

## 6. Screens and texts

Order panel (§ 4.4), admin Orders block (§ 4.5), settings row `sendOrders`. All texts in en, cz, de, uk. Admin docs `apps/docs/content/docs/admins/plugins/odoo-connector.mdx`: Orders section (what is sent, the status table, the Odoo user's rights, failures and Retry, dry run). Developer docs: `store.claim`.

## 7. Testing

Fake Odoo as in parts 1–2 (`catalogHandlers`-style handlers for `res.partner`, `sale.order`, `stock.picking`, `account.move`, onchange), jest:
- `store.claim`: two callers, one wins; expired claim can be taken; data API and testing helper agree;
- sending: linked customer; customer found by registration number, by VAT; customer created (fields, link, `meta:created`); delivery address matched (normalized) and created; no address → customer; price list choice; salesperson by email, fallback; `origin`, `commitment_date`, note, lines with `price_unit`;
- repeat safety: a crash injected after each Odoo write, then a re-run → exactly one partner, one delivery contact, one order, order SENT;
- concurrency: event and sweep at once → one create;
- failures: 5xx/timeout count nothing and keep READY; 401 pauses all and notifies once; 5 refusals → SYNC_FAILED + one notification; final checks fail at once; reopened-with-other-lines;
- Retry gives fresh attempts;
- price check: difference over 1 flagged, at most 1 not; onchange failure does not fail the send;
- status table row by row, skipped steps, partial delivery and payment, reversed invoice ignored, never backwards, deleted order → CANCELLED, manual CRM move not undone;
- `sendOrders` off and `dryRun` on write nothing;
- panel and admin data builders.

Live check (Pavel's OK first), local only:
1. Odoo 19 Community + PostgreSQL in Docker under their own names (removed by name afterwards).
2. A copy script outside the repo fills it from GIPS, read only: currencies and rates, taxes, categories, products, price lists and rules, customers with delivery children, salespeople as users. The copy holds GIPS customer data and is deleted after the check.
3. Local CRM (:3001, local DB) with the connector pointed at the copy; customers and catalog imported.
4. Orders: linked customer; new customer found only by registration number; new delivery address; manager-approved price below list (sent with the CRM price, price difference flagged).
5. Stop Odoo during a send, start it again: every order exists exactly once.
6. In the local Odoo: confirm, deliver, invoice, register payment, cancel; the CRM follows within one cycle.

## 8. Risks

- **The local copy is not GIPS.** Enterprise modules, the `ADV` add-on and GIPS's accounting setup are missing; required fields or automated actions on GIPS could refuse a create that worked locally. Mitigation: the first real orders on OXO go with `dryRun` on, then one supervised order; refusals surface as SYNC_FAILED with Odoo's message, never as duplicates.
- **Created customers.** A wrong registration number or VAT on the account creates a second partner in Odoo. Mitigation: the lookup runs on both identifiers; created partners are listed for GIPS to merge.
- **GIPS edits the Odoo order.** The CRM keeps the rep's lines; the panel flags a different total. Bringing Odoo's lines back into the CRM is out of scope.
- **Odoo licence:** the API user is an internal user (one Enterprise seat), as the OXO plan says.
