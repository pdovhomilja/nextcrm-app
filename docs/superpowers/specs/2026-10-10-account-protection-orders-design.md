# Account protection: orders (rule 3) — design

Date: 2026-10-10. Status: approved in chat by Pavel (three sections), awaiting review of this document.
Parent spec: `docs/superpowers/specs/2026-10-09-account-protection-design.md` (§ 1.2 and § 8 list rule 3 as the follow-up once core orders exist).
Depends on: `docs/superpowers/specs/2026-10-10-orders-design.md` (core orders, SDK 0.2.0).
Origin: OXO implementation plan v1.2, § 8.1 rules 2 and 3, acceptance criterion § 10.12 (claudeOS `staging/oxofactory/2026-10-04-oxo-crm-nextcrm-implementacni-plan-v1.2.md`).

## 1. Goal

A customer who orders stays with their owner. On an owned, registered account, a confirmed order keeps protection running at least `orderMonths` from the order date, and it counts as the documented contact that keeps a new registration alive.

Success, on an instance with the plugin enabled:
- an account with a confirmed order dated within the last `orderMonths` is never freed by the daily job;
- a confirmed order dated on or after the registration day satisfies the contact deadline, like a visit;
- cancelling the order that set the date falls back to the previous qualifying order, never below the registration's own window;
- an order confirmed in the external system (synced as EXTERNAL) extends protection within the connector's sync interval plus one event (OXO § 10.12: 15 minutes);
- importing historical orders does not make them look recent.

### 1.1 Decisions (Pavel, 2026-10-10)

1. **Qualifying statuses:** CONFIRMED, DELIVERED, INVOICED, PAID. DRAFT, PENDING_APPROVAL, READY, SENT, CANCELLED and SYNC_FAILED do not count, so a rep cannot keep a company by entering an order and cancelling it.
2. **Cancellation recomputes:** protection follows the newest qualifying order still present; it never drops below the registration's own window.
3. **Order date in core:** `crm_Orders.orderDate`, settable by plugins on EXTERNAL orders.
4. **A recent order waives the contact deadline** (final review, 2026-10-10): an order dated before the registration that still extends protection counts as contact, so a new owner of an ordering customer (or an account registered at install/upgrade) is not freed on day 30.

### 1.2 Not in scope

- Orders on accounts without an owner or without a registration number do not create registrations. Assigning owners stays a manager's job.
- Rule 4 (channel-partner lists) and commissions (OXO phase 2).
- Owner history entries for extensions: history stays about owner changes; extensions go to the plugin log.

## 2. Core additions (generic)

1. **`crm_Orders.orderDate`** — `DateTime @db.Date`, required.
   - Migration: add the column, fill existing rows with the UTC day of `createdAt`, then set NOT NULL. Index `(accountId, orderDate)`.
   - CRM orders (`createOrder`): the creation day (UTC). Users cannot set or change it (no backdating).
   - Plugin orders (`ctx.data.orders.create` / `update`): optional `orderDate` (ISO date `YYYY-MM-DD`); defaults to the creation day on create. Invalid dates are refused.
   - Shown on the order page header, in the orders list (replacing the created date column), and in MCP order responses (`orderDate`).
2. **SDK 0.2.0 → 0.2.1** (additive): `ExternalOrderInput.orderDate?: string`, `OrderUpdateInput.orderDate?: string`. Existing `^0.2.0` plugins keep loading.
3. No other core change. The plugin reads orders through the existing `ctx.data.orders.find` (scalar filters `accountId`, `status`, `orderDate`).

## 3. Plugin changes (`plugins/account-protection`)

### 3.1 Settings

| key | type | default | notes |
|---|---|---|---|
| `orderMonths` | number, integer ≥ 0 | 12 | 0 turns rule 3 off; orders still count as contact (rule 2) |

The plugin version goes 0.1.1 → 0.2.0 (new setting, new permission, new hooks).

### 3.2 Registration

`reg:<accountId>` gains:
- `baseUntil` — `registeredAt + protectionDays`, written when a registration starts. A record without it reads `protectedUntil` as its base (registrations from 0.1.x).
- `lastOrderAt?` — the `orderDate` (ISO day) of the newest qualifying order on the account.

`protectedUntil = max(baseUntil, lastOrderAt + orderMonths)`. Months are added as UTC calendar months (31 January + 1 month = 28/29 February), and the result is the start of that UTC day, compared the same way as today's `protectedUntil`. With `orderMonths = 0`, `protectedUntil = baseUntil`.

`contactAt` is set from an order when no earlier contact is recorded and the newest qualifying order's `orderDate` is on or after the registration day, or the order still extends protection (`lastOrderAt + orderMonths > baseUntil`, decision 4). An order never clears a `contactAt` set by an activity.

### 3.3 Qualifying order

An order on the account (`accountId`), source CRM or EXTERNAL, with status in `CONFIRMED, DELIVERED, INVOICED, PAID`. Lookup: `ctx.data.orders.find({ where: { accountId, status: { in: [...] } }, orderBy: { orderDate: "desc" }, take: 1 })`.

### 3.4 Recompute

`recomputeFromOrders(accountId, ctx, now)`:
1. Read `reg:<accountId>`. None → stop (no owner or no number).
2. Read the newest qualifying order.
3. New `lastOrderAt` and `protectedUntil` per § 3.2; set `contactAt` per § 3.2.
4. If anything changed: write `reg:`, move the account's `due:` entry to `dueDay(reg)`, and write a plugin log line (`info`, "protection recomputed from orders", account id, old and new date).

Idempotent: running it twice changes nothing the second time.

### 3.5 Triggers

- `x.after("order", "created")` — recompute the order's account.
- `x.after("order", "updated")` — recompute when `changed` includes `status` or `orderDate`.
- **Daily `expire` job** — before freeing an account (verdict `check-contact` or `expired`), run `recomputeFromOrders` and evaluate again; free only if still due.
- **New registration** (`recordOwner` starting a registration) — recompute right after, so a new owner of an ordering customer keeps the order-based protection.
- **`onUpgrade` to 0.2.0** — recompute every existing `reg:` entry once (paged, 100 at a time), and set `baseUntil` on each.

The hooks need the order's `accountId`: read the order with `ctx.data.orders.get(recordId)`. There is no `deleted` hook: only drafts can be deleted, and drafts never qualify.

### 3.6 Permissions

The manifest adds `orders:read`. Upgrading an installed plugin shows the new permission, as the platform does for any permission change.

### 3.7 Screens (plugin messages in en, cz, de, uk)

- **Protection tab:** a line "Last order: <date> → protected until <date>" when `lastOrderAt` sets `protectedUntil` above `baseUntil`; otherwise "No confirmed order yet" (only when rule 3 is on).
- **Protection panel and Expiring page:** unchanged; they read `protectedUntil` and the due list, which now include order extensions.
- **Admin settings:** `orderMonths` with help text "Protection runs at least this many months from the last confirmed order. 0 turns this off."

## 4. Error handling

- Order hooks are after events: a failure is logged in the plugin log and never blocks the order. The daily job's recompute is the safety net.
- `ctx.data.orders` permission missing (an instance that did not accept the upgrade's permission) → the hooks and the job log one warning per run and fall back to today's behaviour (no order extension).
- Invalid `orderDate` from a plugin → core refuses the write with a clear error.

## 5. Testing

- **Pure:** `protectedUntil` maths (month addition across month ends and leap years, `orderMonths = 0`, old records without `baseUntil`), contact from an order before / on / after the registration day.
- **Recompute:** confirmed order extends; cancelling it falls back to the previous qualifying order, then to `baseUntil`; non-qualifying statuses ignored; idempotent; `due:` moved; log line written.
- **Hooks:** order created; order updated with `status` or `orderDate` in `changed`; `changed` without either does nothing.
- **Expire job:** an account past its window but with a recent confirmed order is kept; a contact-deadline account with a confirmed order dated after registration is kept and gets `contactAt`; an account whose only order was cancelled is freed.
- **Upgrade:** existing registrations get `baseUntil` and order-based dates.
- **Core:** `orderDate` defaults to the creation day; users cannot set it (form, action, MCP); plugins can on EXTERNAL create/update; invalid dates refused; migration backfills from `createdAt` (plain-SQL guard test).
- **Manual check (local dev, Chrome):** register an account for the rep; create and confirm an order (manager moves it to CONFIRMED) → Protection tab shows the order line and the later date; cancel it → date falls back; set a registration past its window with a confirmed order → `expire` keeps it.

## 6. Risks

- **Clock and time zones:** `orderDate` is a UTC day; an order confirmed late in the evening CET counts for the previous UTC day only if created then. One day of difference on a 12-month window is accepted.
- **Connector date quality:** if the connector does not pass `orderDate`, EXTERNAL orders use the sync day. The connector spec must pass Odoo's `date_order`.
- **Disabled plugin:** orders confirmed while the plugin is disabled are picked up by the next recompute (any order event, the daily job, or the upgrade pass).
