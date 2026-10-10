# Orders — design

Date: 2026-10-10. Status: approved in chat by Pavel (six sections), awaiting review of this document.
Parent spec: `docs/superpowers/specs/2026-10-04-plugin-system-design.md` (§ 14: price lists, the price-rule engine and orders are core features with their own spec).
Origin: OXO implementation plan v1.2, § 7, § 8.3 and § 8.5 (claudeOS `staging/oxofactory/2026-10-04-oxo-crm-nextcrm-implementacni-plan-v1.2.md`), milestone M2.
This is the second of two specs. It uses `getPrice` / `resolvePriceListId` from the first, `docs/superpowers/specs/2026-10-09-price-lists-design.md`.

## 1. Goal

Reps take orders in the CRM. Each line is priced from the customer's price list; a rep who goes below the list needs a manager's approval. A finished order is READY. On an instance with a connector plugin (OXO: `odoo-connector`, its own spec), the connector sends READY orders to the external system and writes their later statuses back. Without a connector, managers move orders along by hand, so orders are useful on every instance.

Success:
- a rep creates an order for one of their accounts; lines get the customer's list price for the quantity; the order has a number from a configurable series as soon as it exists;
- a rep who cuts a price below the list and submits gets PENDING_APPROVAL; managers are notified, approve or reject with a note; managers' own prices need no approval;
- managers move orders READY → … → PAID by hand when no connector is installed;
- a plugin can react to an order becoming READY, create orders that came from an external system (`source = EXTERNAL`) and set their statuses, through SDK 0.2.0;
- reps never see or change another rep's orders, in the UI or through MCP.

Generic product rules apply: nothing specific to OXO, GIPS or Odoo in core code or migrations; all text in cz, en, de, uk.

### 1.1 Not in v1

- PDF orders or quotes, stock availability, partial deliveries.
- Creating an invoice from an order (the NextCRM invoices module stays separate).
- Order-level discounts; lines carry the discount through their unit price.
- More than one currency in an order.
- Plugin tabs on the order page (only a side panel, § 7).
- Moving invoices to the generic number series (§ 2.3); `Invoice_Series` stays as it is.

## 2. Data model

### 2.1 `crm_Orders`

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | |
| `number` | text, unique | from the series, assigned on creation (§ 2.3) |
| `seriesId` | uuid → `NumberSeries` | RESTRICT |
| `status` | enum `crm_Order_Status` | DRAFT, PENDING_APPROVAL, READY, SENT, CONFIRMED, DELIVERED, INVOICED, PAID, CANCELLED, SYNC_FAILED; default DRAFT |
| `source` | enum `crm_Order_Source` | CRM, EXTERNAL; default CRM |
| `externalRef` | text, nullable | set by a connector; `@@unique([source, externalRef])` |
| `accountId` | uuid → `crm_Accounts` | required, RESTRICT |
| `contactId` | uuid → `crm_Contacts`, nullable | must belong to the account; SET NULL |
| `ownerId` | uuid → `Users`, nullable | snapshot of the account's `assigned_to` at creation; does not follow later owner changes |
| `priceListId` | uuid → `crm_PriceLists`, nullable | `resolvePriceListId(accountId)` at creation; SET NULL |
| `currency` | varchar(3) → `Currency.code` | the price list's currency, else the instance default (`getDefaultCurrency`) |
| `shipping_street`, `shipping_city`, `shipping_state`, `shipping_postal_code`, `shipping_country` | text, nullable | prefilled from the account's shipping address, else billing; editable in DRAFT |
| `requestedDeliveryDate` | date, nullable | |
| `note` | text, nullable | |
| `subtotal`, `vatTotal`, `grandTotal` | Decimal(14,2) | always computed on the server from the lines |
| `approvalRequestedAt`, `approvedAt` | timestamptz, nullable | |
| `approvedBy` | uuid, nullable | |
| `approvalNote` | text, nullable | reject note (required on reject) or approve note |
| `createdBy`, `updatedBy`, `createdAt`, `updatedAt` | | |

Indexes: `accountId`, `ownerId`, `status`, `createdAt`.

### 2.2 `crm_OrderLines`

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | |
| `orderId` | uuid → `crm_Orders` | CASCADE |
| `position` | int | display order |
| `productId` | uuid → `crm_Products` | RESTRICT (products are soft-deleted) |
| `productName`, `sku`, `unit` | text | snapshots at the time the line is priced |
| `quantity` | Decimal(14,4) | > 0 |
| `listPrice` | Decimal(18,2) | price-list price for this quantity and date, in the order currency, rounded half-up to 2 decimals |
| `priceRuleId` | text, nullable | rule that produced `listPrice` (no FK; rules can be deleted) |
| `unitPrice` | Decimal(18,2) | agreed net price, ≥ 0 |
| `unitPriceOverridden` | boolean | true once a user typed a price; such prices do not follow re-pricing |
| `vatRate` | Decimal(5,2) | snapshot of `crm_Products.tax_rate`, 0 when null |
| `lineSubtotal`, `lineVat`, `lineTotal` | Decimal(14,2) | `computeLineTotal` from `lib/invoices/totals.ts` with discount 0 |

Prices are net (VAT-exclusive), like Odoo price lists. The discount is not stored; the screen shows `1 − unitPrice / listPrice`.

### 2.3 `NumberSeries` (generic)

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | |
| `scope` | text | `"order"` in v1 |
| `name` | text | |
| `template` | text | tokens `{YYYY}` and `{###…}` (zero-padded to the number of `#`), via `formatNumber` from `lib/invoices/numbering.ts` |
| `resetPolicy` | enum `NumberSeries_Reset` | YEARLY, NEVER |
| `currentYear` | int, nullable | |
| `counter` | int | last number issued |
| `isDefault`, `active` | boolean | at most one default per scope |

The next number comes from one atomic statement (`UPDATE … SET counter = CASE WHEN reset THEN 1 ELSE counter + 1 END, currentYear = … WHERE id = … RETURNING counter, currentYear`) inside the order-creating transaction, so parallel creations never share a number and a rolled-back creation consumes nothing. The year is the UTC year, like invoices.

The migration seeds one default series: name "Orders", template `ORD-{YYYY}-{####}`, YEARLY. An admin edits it under Admin → Orders. `Invoice_Series` and invoice numbering are not changed.

### 2.4 Changes to existing code

- `AuditEntityType` (`lib/audit-log.ts`): add `order`. `crm_AuditLog.entityType` is a text column, so no DB change; transitions use the existing action `updated`.
- `crm_SystemSettings` key `orders_approval_emails` (`"true"` default when missing).

### 2.5 Delete vs cancel

A DRAFT can be deleted; its number is skipped. Past DRAFT an order can only be cancelled.

## 3. Statuses and transitions

All checks live in one pure function `canTransition(order, to, user)` (`lib/orders/transitions.ts`) used by the server actions, the MCP tools and the screen (to show only allowed buttons).

### 3.1 Orders with `source = CRM`, user actions

| From | To | Who | Notes |
|---|---|---|---|
| DRAFT | edit, delete | creator, manager, admin | header and lines editable only in DRAFT |
| DRAFT | PENDING_APPROVAL or READY | creator, manager, admin | "Submit" (§ 4.3) |
| PENDING_APPROVAL | READY | manager, admin | approve |
| PENDING_APPROVAL | DRAFT | manager, admin (reject, note required); creator (withdraw) | |
| READY | DRAFT | creator, manager, admin | "Reopen"; refused when `externalRef` is set; clears the approval fields |
| READY, SENT, CONFIRMED, DELIVERED, INVOICED | any later status in READY → SENT → CONFIRMED → DELIVERED → INVOICED → PAID | manager, admin | by hand; steps may be skipped |
| PENDING_APPROVAL, READY | CANCELLED | creator, manager, admin | |
| SENT, CONFIRMED, DELIVERED, INVOICED, SYNC_FAILED | CANCELLED | manager, admin | |
| SYNC_FAILED | READY | manager, admin | "Retry" |

PAID and CANCELLED are final. "Creator" means `createdBy`; a rep can act only on orders they can read (§ 5).

### 3.2 Orders with `source = EXTERNAL`

Read-only for every user role, in the UI and MCP. Only plugin writes change them.

### 3.3 Plugin writes (actor `plugin`)

- May set SENT, CONFIRMED, DELIVERED, INVOICED, PAID, SYNC_FAILED and CANCELLED on any order, and set `externalRef`.
- May create orders only with `source = EXTERNAL` and update their header and lines. EXTERNAL orders get a number from the default series like any order (the external system's own order name belongs in the plugin's storage and panel). Their lines are not priced by the engine: `listPrice = unitPrice` = the price the plugin supplies, so they are never below list. `ownerId` is the account's `assigned_to` at creation, as for CRM orders.
- May not set DRAFT, PENDING_APPROVAL or READY, and may not approve.

### 3.4 Concurrency

A transition is a conditional update `WHERE id = … AND status = <expected>`. When no row matches, the action returns `error.changed` ("The order changed. Reload."). Line edits check `status = DRAFT` in the same transaction.

## 4. Pricing and approval

### 4.1 Pricing a line

1. Adding a line (product, quantity) calls `getPrice({ priceListId: order.priceListId, productId, quantity, date: today })`.
2. The result is converted to the order currency when it differs (only possible without a price list, where `getPrice` returns the product's currency), using `rateLookup` from `lib/pricing/get-price.ts`.
3. `listPrice` and `priceRuleId` are stored; `unitPrice = listPrice`, `unitPriceOverridden = false`.
4. When a user types a unit price, `unitPriceOverridden = true`.
5. A quantity change in DRAFT re-prices `listPrice`; `unitPrice` follows unless overridden.
6. Product snapshots (`productName`, `sku`, `unit`, `vatRate`) are taken when the line is added and refreshed on each re-pricing.

Inactive (`status != ACTIVE`) or deleted products cannot be added. A `PricingError` blocks adding the line; the action returns the engine's English message, like the price check.

### 4.2 Below list

A line is below list when `unitPrice < listPrice`. Both are 2-decimal values, so the comparison is exact. The order page marks such lines and shows the difference per line and in total.

### 4.3 Submit

1. The order must have at least one line, and every product must still be active.
2. Every line is re-priced at today's date (§ 4.1 step 5), so an old draft cannot pass on a changed list. A `PricingError` blocks the submit.
3. If the submitting user's role is `user` and any line is below list → PENDING_APPROVAL, else → READY.

### 4.4 Approval

- On PENDING_APPROVAL: set `approvalRequestedAt`; if `orders_approval_emails` is on, email every active manager and admin (plain text through `resendHelper`, link to the order); the order appears on `/crm/approvals` in an "Orders" table.
- Approve (manager, admin): → READY; set `approvedBy`, `approvedAt`, optional note; email the creator.
- Reject (manager, admin): note required; → DRAFT; email the creator with the note.
- Withdraw (creator): → DRAFT; no email.
- Emails are sent after the database commit; a send failure is logged and never rolls back the transition.
- An approval covers exactly the approved prices. Any later change needs Reopen (→ DRAFT), which clears `approvedBy`, `approvedAt` and `approvalRequestedAt`.

## 5. Access

- Read scope for role `user`: `ownerId = me` OR `createdBy = me` OR the account is in `accountUserScopeOR(me)` (same pattern as `opportunityReadScopeWhere`). New helpers `orderReadScopeWhere(user)` and `assertCanReadOrder(user, order)` in `lib/authz/scopes/orders.ts`. Managers and admins read everything.
- Create: a user who may write the account (`assertCanWriteAccount`).
- Everything else follows § 3. Reads of an order outside the scope return not found, never forbidden.

## 6. Screens (all text in cz, en, de, uk)

- CRM menu item **Orders** (all roles).
- `/crm/orders`: table (number, account, owner, status, total with currency, date, source); filters by status and owner (owner filter for managers and admins).
- `/crm/orders/new?accountId=…` and a **New order** button on the account page: header (account, contact, delivery address, requested delivery date, note; price list and currency read-only) and a line editor (product search, quantity, list price, unit price, below-list badge, VAT, line total, totals).
- `/crm/orders/[orderId]`: header, lines, totals; status actions allowed for the current user (Submit, Approve, Reject, Withdraw, Reopen, Cancel, Advance status, Retry), from `canTransition`; the plugin order panel slot (§ 7); a History tab from the audit log. Destructive actions (delete, cancel, reject) confirm first.
- Account page: an **Orders** tab with the account's orders.
- `/crm/approvals`: a second table **Orders** (manager, admin).
- Admin → **Orders**: number series (name, template with a live preview, reset policy, default, active) and the approval-email switch.

## 7. Plugin SDK 0.2.0

- `SDK_VERSION` 0.1.1 → 0.2.0. Plugins in the repo (`registry-ares`, `account-protection`) change their manifest to `sdk: "^0.2.x"`; no other change.
- `ENTITIES` gains `"order"`; `PERMISSIONS` gains `orders:read`, `orders:write`.
- `ctx.data.orders`: `get(id)` (with lines), `find(where)`, `create(data)` (EXTERNAL only, with lines, account, `externalRef`), `update(id, data)` (§ 3.3). Plugin writes run as actor `plugin`, are audited and emit `crm/order.saved`.
- The Prisma extension maps `crm_Orders` → `"order"`: before-rules (`beforeCreate`, `beforeUpdate`, `beforeDelete`) and after events (`created`, `updated`, `deleted`) with `actor` and `changed`. Lines are not a separate entity.
- `x.orderPanel(...)`: a side panel on the order page, built like `accountPanel`.
- The testing helpers (`packages/plugin-sdk/src/testing.ts`) gain the order table.

The connector's own data (external IDs, sync cursors, billing modes, price comparison) lives in its plugin storage, not in core columns. Account-protection rule 3 (an order extends protection) is a follow-up PR on these events.

## 8. MCP tools (`lib/mcp/tools/crm-orders.ts`)

| Tool | Who | Notes |
|---|---|---|
| `crm_list_orders` | all | scoped; filters status, accountId, ownerId; paginated |
| `crm_get_order` | all | scoped; with lines and allowed transitions |
| `crm_create_order` | account writers | header + lines; prices from the list unless `unitPrice` given |
| `crm_update_order` | creator, manager, admin | DRAFT only; header and full line list |
| `crm_submit_order` | creator, manager, admin | § 4.3; a rep's below-list order → PENDING_APPROVAL |
| `crm_decide_order_approval` | manager, admin | APPROVED or REJECTED with note |
| `crm_set_order_status` | per § 3.1 | withdraw, reopen, advance, retry |
| `crm_cancel_order` | per § 3.1 | |

Deleting a DRAFT is UI-only. The tools call the same functions as the server actions. Errors map as in `lib/mcp/run-tool.ts`: not found, forbidden, validation (including pricing messages), conflict for `error.changed`.

## 9. Validation and errors

- zod on every action and tool: quantity > 0, `unitPrice` ≥ 0, valid ISO dates, contact belongs to the account, product exists and is active.
- Unknown account, contact, product or order → not found, never a raw database error.
- Every action error string maps to an `OrdersPage.error.*` key (checked by a test); `PricingError` messages pass through in English.
- Totals sent by a client are ignored.

## 10. Audit

`writeAuditLog` with entity type `order` for: create, header edit, line add/change/remove (changes listed), every transition (`status` from → to), approval decisions (with note), delete. Plugin writes are logged with the plugin actor.

## 11. Testing

- Unit:
  - `canTransition`: every role × status × source combination in § 3;
  - below-list check; line pricing (quantity tier, overridden vs followed price, re-pricing on submit, currency conversion, missing rate);
  - totals;
  - series: `formatNumber` tokens, yearly reset, NEVER policy, two parallel allocations get different numbers (against the test database or with the atomic statement mocked at the SQL level).
- Actions and MCP:
  - rep scope (other reps' orders → not found); create requires account write;
  - a rep's below-list submit → PENDING_APPROVAL, also through MCP; a manager's → READY;
  - approve, reject (note required), withdraw, reopen (refused with `externalRef`), cancel, advance, retry;
  - EXTERNAL orders locked for users; plugin writes limited to § 3.3;
  - audit entries; emails to managers and to the creator; mail failure does not roll back;
  - registry test for the new tool module; error keys map to locale keys in all four locales.
- SDK: the `order` entity in the data API and testing helpers; after events carry `changed.status`; `orderPanel`; both repo plugins load on 0.2.0.
- Migration: a guard test that `migration.sql` is plain SQL (starts with a SQL comment, no tool output) and contains the series seed.
- Manual check on local dev (Chrome): rep creates an order (list prices), cuts a price, submits → PENDING_APPROVAL; manager rejects with a note; rep fixes and resubmits → READY; manager advances to PAID; the rep cannot see another rep's order; MCP tools give the same results.

## 12. Risks

- **SDK minor bump** breaks any out-of-repo plugin pinned to `^0.1.x`. None exist today; noted in the release notes.
- **Manual and connector status changes at once:** a manager can move an order by hand while a connector also writes it. The conditional update (§ 3.4) prevents lost updates; the connector treats its own next poll as the truth.
- **Price changes between submit and approval** are not re-checked at approval; the manager approves the prices shown. A reopen re-prices.
- **Generic series without invoices:** two numbering systems coexist until invoices move over in a separate change.
