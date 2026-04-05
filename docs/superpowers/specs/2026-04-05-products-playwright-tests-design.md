# Products Module — Playwright E2E Tests Design

## Overview

Full CRUD E2E test coverage for the CRM Products module, including create, read (list + detail), update, delete, filtering, validation edge cases, and CSV import. Tests follow existing project conventions (multiple focused spec files, shared helper patterns, locale-aware navigation).

## Architecture

### File Structure

```
tests/e2e/
  product-create.spec.ts    — Create flows + validation
  product-read.spec.ts      — List view, detail page, filtering
  product-update.spec.ts    — Update via row action
  product-delete.spec.ts    — Delete with confirmation dialog
  product-import.spec.ts    — CSV import flow
```

No page object model — consistent with existing test files (`account-update.spec.ts`, `lead-update.spec.ts`).

### Shared Helpers (inline per file, matching existing pattern)

```typescript
// Reused in each file as needed:
waitForSheet(page)         // page.waitForSelector('[role="dialog"][data-state="open"]')
assertSuccessToast(page)   // expect('[data-sonner-toast][data-type="success"]').toBeVisible()
fillIfEmpty(page, label, value)  // clear + fill only if field is empty
```

### Auth

All files use `test.use({ storageState: "playwright/.auth/user.json" })` — same as every other CRM test.

## Test Specifications

### `product-create.spec.ts`

| Test | Description |
|------|-------------|
| should create a product with required fields only | Fill name, type=PRODUCT, unit_price, currency. Submit. Assert success toast. Verify product appears in table. |
| should create a product with all fields | Fill all fields including SKU, description, category, tax_rate, unit, is_recurring=true, billing_period=MONTHLY. Submit. Assert success toast. |
| should show validation error for empty name | Open create sheet, clear name, submit. Assert form does not close (sheet stays open). |
| should handle duplicate SKU | Create product with SKU "TEST-DUP-001". Try creating another with same SKU. Assert error toast or form error. |

**Selectors:**
- Create trigger: button with "+" text in the toolbar area
- Form fields: `page.getByLabel("Name")`, `page.getByLabel("SKU")`, etc.
- Type/Status/Currency selects: trigger button then `getByRole("option")` or combobox patterns
- Submit: `page.locator('[role="dialog"] [type="submit"]')`
- Recurring checkbox: `page.getByLabel("Recurring")` or `#is_recurring`
- Billing period: conditional field, visible only when recurring is checked

### `product-read.spec.ts`

| Test | Description |
|------|-------------|
| should display products table | Navigate to `/en/crm/products`. Assert table is visible with expected column headers (Name, SKU, Type, Status, Price). |
| should navigate to product detail page | Click a product name link in the table. Assert URL contains `/crm/products/`. Assert detail page shows tabs. |
| should display product detail with tabs | On detail page, verify Basic View, Accounts, and History tabs are present. |
| should filter products by type | Open type faceted filter. Select "Product". Assert table updates to show only PRODUCT type rows. |
| should filter products by status | Open status faceted filter. Select "Active". Assert table updates. |

**Selectors:**
- Table: look for table element on the products page
- Column headers: table header cells
- Product name link: `a[href*="/crm/products/"]`
- Faceted filters: filter buttons in toolbar for Type and Status columns
- Tabs on detail: role="tablist" with tab triggers

### `product-update.spec.ts`

| Test | Description |
|------|-------------|
| should update product name via row action | Click row action menu (⋯) on first product. Click "Edit" (navigates to detail or opens sheet). Update name. Submit. Assert success toast. Verify updated name visible. |
| should update product price and status | Open update form. Change unit_price and status to ACTIVE. Submit. Assert success toast. |
| should toggle recurring and set billing period | Open update form. Check is_recurring. Select billing_period=QUARTERLY. Submit. Assert success toast. |

**Selectors:**
- Row action button: `firstRow.locator("button:has(.sr-only)").first()`
- Edit menu item: `page.getByRole("menuitem", { name: "Edit" })`
- Update form fields: same label-based selectors as create
- Submit: `[role="dialog"] [type="submit"]` or form submit on detail page

### `product-delete.spec.ts`

| Test | Description |
|------|-------------|
| should delete a product via row action | Click row action (⋯) → Delete. Assert AlertModal confirmation appears. Click confirm. Assert success toast. Verify product no longer in table. |
| should cancel delete via confirmation dialog | Click row action (⋯) → Delete. Assert AlertModal. Click cancel. Assert product still in table. |

**Selectors:**
- Delete menu item: `page.getByRole("menuitem", { name: "Delete" })`
- AlertModal confirm: button with "Continue" or "Delete" text in alert dialog
- AlertModal cancel: button with "Cancel" text in alert dialog

### `product-import.spec.ts`

| Test | Description |
|------|-------------|
| should open import dialog and download CSV template | Click "Import" button. Assert dialog opens with title "Import Products from CSV". Click "Download CSV Template". Assert download triggered. |
| should import products from valid CSV | Click "Import". Upload a test CSV fixture file. Assert preview table shows rows. Click "Confirm Import". Assert success message with count. |

**Selectors:**
- Import button: `button:has-text("Import")` in toolbar
- Dialog: `[role="dialog"]` with import title
- File input: `input[type="file"][accept=".csv"]`
- Template download: button with "Download CSV Template" text
- Confirm: button with "Confirm Import" text
- Success indicator: element with CheckCircle icon + success message text

**Test Fixture:**
- Create `tests/fixtures/products-import.csv` with valid test data matching template columns

## Test Data Strategy

- **Create tests**: Generate unique names/SKUs using timestamps (e.g., `Test Product ${Date.now()}`)
- **Read/Filter tests**: Depend on existing data or seed data from create tests (use `test.describe.serial` if needed)
- **Update tests**: Use first available product in table
- **Delete tests**: Create a product first, then delete it (self-contained)
- **Import tests**: Use a static CSV fixture file

## Conventions

- All URLs prefixed with `/en/` locale
- Wait for `networkidle` after navigation
- 15s timeout for success toasts
- 10s timeout for sheet/dialog open
- 8s timeout for sheet/dialog close
- Follow existing helper patterns (inline, not shared module)
- No data-testid attributes on Products components — use semantic selectors (labels, roles, text)

## Edge Cases & Validation

- Empty required field submission (name) — form should stay open
- Duplicate SKU — error feedback expected
- Conditional billing_period field — only visible when is_recurring is checked
- Currency select — must pick from enabled currencies list
- Type and Status badge colors — visual only, not tested

## Out of Scope

- Visual regression testing (badge colors, layout)
- Performance testing (load times, large datasets)
- Mobile-specific viewport tests (covered by Playwright config's mobile projects)
- Cross-module integration (linking products to opportunities/contracts) — deferred to future spec
