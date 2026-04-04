# Currency Support for Sales Module

**Date:** 2026-04-04
**Status:** Approved

## Overview

Add multi-currency support to the CRM's sales module. Admin manages currencies and exchange rates (manual or ECB auto-update). Opportunities and contracts store values in a chosen currency with a snapshot rate. A global header currency switcher lets users view all monetary values converted to their preferred display currency.

## Data Model

### New Models

#### Currency

| Field     | Type              | Notes                              |
|-----------|-------------------|------------------------------------|
| code      | String @unique    | ISO 4217 (EUR, USD, CZK)          |
| name      | String            | "Euro", "US Dollar", etc.          |
| symbol    | String            | "€", "$", "Kč"                     |
| isEnabled | Boolean           | Admin can enable/disable           |
| isDefault | Boolean           | One currency is the default        |
| createdAt | DateTime          |                                    |
| updatedAt | DateTime          |                                    |

Seeded with EUR, USD, CZK.

#### ExchangeRate

| Field         | Type           | Notes                                      |
|---------------|----------------|---------------------------------------------|
| id            | UUID           |                                             |
| fromCurrency  | String         | FK → Currency.code                          |
| toCurrency    | String         | FK → Currency.code                          |
| rate          | Decimal(18,8)  | Exchange rate value                         |
| source        | Enum           | MANUAL or ECB                               |
| effectiveDate | DateTime       | When this rate became active                |
| createdAt     | DateTime       |                                             |
| updatedAt     | DateTime       |                                             |

Unique constraint on `[fromCurrency, toCurrency]` — one active rate per pair.

#### crm_SystemSettings

| Field     | Type           | Notes                           |
|-----------|----------------|---------------------------------|
| key       | String @unique | e.g. "ecb_auto_update"          |
| value     | String         | Setting value                   |
| updatedAt | DateTime       |                                 |

Simple key-value store for system-wide configuration. Used for `ecb_auto_update` toggle and potentially other settings.

### Modified Models

#### crm_Opportunities

| Field            | Change                                         |
|------------------|-------------------------------------------------|
| budget           | BigInt → Decimal(18,2)                          |
| expected_revenue | BigInt → Decimal(18,2)                          |
| currency         | String? → String (required, FK → Currency.code) |
| snapshot_rate    | NEW — Decimal(18,8), rate to default currency   |

#### crm_Contracts

| Field         | Change                                  |
|---------------|-----------------------------------------|
| value         | Int → Decimal(18,2)                     |
| currency      | NEW — String (FK → Currency.code)       |
| snapshot_rate | NEW — Decimal(18,8)                     |

### Key Decisions

- All money fields become `Decimal(18,2)` for cent precision.
- Rates stored as `Decimal(18,8)` (ECB publishes 4-6 decimal places).
- `snapshot_rate` captures rate-to-default-currency at save time — historically accurate values.
- ExchangeRate stores one active rate per pair, not a full history log.

## Admin Currency Management

New admin page at `/admin/currencies`, added to AdminSidebarNav alongside existing items.

### Page Sections

1. **Currency table** — lists all currencies (code, name, symbol, enabled toggle, default radio). Admin can add ISO 4217 currencies beyond the seeded three.

2. **Exchange rates section** — shows current rate, source (Manual/ECB), last updated date for each enabled currency pair. Admin can edit rates inline in manual mode.

3. **ECB auto-update toggle** — switch at top of rates section:
   - When enabled: rates fetched daily via Inngest, manual editing disabled for ECB-sourced pairs
   - Shows last sync timestamp and status
   - Admin can override individual pairs (switches source to MANUAL, excluded from auto-update)

4. **Default currency selector** — one currency marked as default. Used as the header switcher default and the base for `snapshot_rate`.

## Header Currency Switcher

A dropdown in the header's right-side group, placed between `<Feedback />` and `<ThemeToggle />`.

### Behavior

- Displays current display currency code and symbol (e.g., "€ EUR ▼")
- Dropdown shows all enabled currencies with symbol, code, and full name
- State stored in cookie (like sidebar state) — persists across page loads
- Defaults to admin-configured default currency
- Changing it re-converts all displayed money values on the page
- Does NOT change the currency stored on opportunities/contracts — display only

## Conversion Logic

### Storing Values

When a user saves an opportunity/contract:
1. Value stored in the chosen currency (e.g., `budget = 50000.00`, `currency = "EUR"`)
2. System looks up current rate from opportunity's currency to default currency
3. Stores `snapshot_rate` for historical reference

### Displaying Values

When the display currency differs from the record's currency:
- Dashboard/reports use **current rates** for aggregation
- Detail views show both: original value + approximate converted value (e.g., "€50,000 (≈ $54,210)")
- Table columns show converted value with currency symbol

### Aggregation (Dashboard & Reports)

- Fetch all relevant opportunities
- For each, convert from its `currency` to the display currency using current exchange rates
- Sum the converted values
- Totals shift slightly as rates change — expected for CRM (not accounting)

### Shared Utility

```typescript
// lib/currency.ts
convertAmount(amount: Decimal, fromCurrency: string, toCurrency: string, rates: ExchangeRate[]): Decimal
formatCurrency(amount: Decimal, currencyCode: string): string
```

If no direct rate exists for a pair, convert through EUR (ECB base currency).

### Edge Cases

- **Missing rate** → show original value with a warning badge
- **Disabled currency on existing record** → still display, can't create new ones in it
- **Rate = 0 or null** → treat as missing, show warning

## Inngest ECB Rate Sync

**Function:** `ecb/sync-exchange-rates`

**Schedule:** `0 17 * * 1-5` (17:00 CET, weekdays — after ECB publishes at ~16:00 CET)

**Logic:**
1. Check `crm_SystemSettings` for `ecb_auto_update` = "true"
2. Fetch ECB daily reference rates from public XML endpoint
3. Update rates for enabled currency pairs where source = ECB
4. Skip pairs overridden to MANUAL
5. Log results

**Retry:** Inngest built-in retry (3 attempts with backoff). On total failure, last known rate stays active.

## Affected Files

### Schema & DB
- `prisma/schema.prisma` — new models, modify existing
- New Prisma migration
- Seed EUR, USD, CZK with initial rates

### Admin
- `app/[locale]/(routes)/admin/_components/AdminSidebarNav.tsx` — add "Currencies" item
- New: `app/[locale]/(routes)/admin/currencies/page.tsx`
- New: `app/[locale]/(routes)/admin/currencies/_components/` — CurrencyTable, ExchangeRatesTable, ECBToggle
- New: `app/[locale]/(routes)/admin/currencies/_actions/` — server actions

### Header
- `app/[locale]/(routes)/components/Header.tsx` — add CurrencySwitcher
- New: `components/CurrencySwitcher.tsx`

### Opportunities
- `app/[locale]/(routes)/crm/opportunities/components/NewOpportunityForm.tsx` — currency dropdown, snapshot rate
- `app/[locale]/(routes)/crm/opportunities/components/UpdateOpportunityForm.tsx` — same
- `app/[locale]/(routes)/crm/opportunities/[opportunityId]/components/BasicView.tsx` — currency display + conversion
- `app/[locale]/(routes)/crm/opportunities/table-components/columns.tsx` — format with currency
- `actions/crm/opportunities/create-opportunity.ts` — store snapshot_rate
- `actions/crm/opportunities/update-opportunity.ts` — update snapshot_rate

### Contracts
- `app/[locale]/(routes)/crm/contracts/[contractId]/components/BasicView.tsx` — replace hardcoded USD
- Contract create/update forms — add currency field

### Dashboard & Reports
- `app/[locale]/(routes)/page.tsx` — pass display currency
- `actions/crm/opportunity/get-expected-revenue.ts` — convert to display currency
- `actions/reports/sales.ts` — getRevenue, getPipelineValue, getAvgDealSize with conversion
- `app/[locale]/(routes)/reports/sales/page.tsx` — remove hardcoded USD formatter

### Shared
- New: `lib/currency.ts` — convertAmount, formatCurrency, rate lookup

### Inngest
- New: `inngest/functions/ecb/sync-exchange-rates.ts`
- `app/api/inngest/route.ts` — register function
