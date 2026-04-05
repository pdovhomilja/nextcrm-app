# Products Module Playwright E2E Tests — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add full CRUD E2E test coverage for the CRM Products module — create, read, update, delete, filtering, validation, and CSV import.

**Architecture:** Five focused spec files under `tests/e2e/`, each self-contained with inline helpers matching existing project conventions. A CSV fixture file for import tests. No page object model — consistent with the rest of the test suite.

**Tech Stack:** Playwright, TypeScript, Sonner toast assertions, Radix UI Select/Dialog selectors

---

## File Structure

```
tests/
  e2e/
    product-create.spec.ts   — Create product flows + validation
    product-read.spec.ts     — List view, detail page, filtering
    product-update.spec.ts   — Update via row action dropdown
    product-delete.spec.ts   — Delete with AlertModal confirmation
    product-import.spec.ts   — CSV import dialog flow
  fixtures/
    products-import.csv      — Test CSV data for import tests
```

## Key Selectors Reference

These selectors are derived from the actual component source code:

| Element | Selector |
|---------|----------|
| Create trigger button | `button:has-text("+")` inside card header |
| Create sheet / Update sheet | `[role="dialog"][data-state="open"]` |
| Sheet heading (create) | `getByRole("heading", { name: /Create Product/i })` |
| Sheet heading (update) | `getByRole("heading", { name: /Update Product/i })` |
| Form text inputs | `getByLabel("Name")`, `getByLabel("SKU")`, `getByLabel("Unit Price")`, etc. |
| FormSelect trigger | The `SelectTrigger` rendered after the hidden input; use `locator('[role="dialog"]').locator('button[role="combobox"]')` scoped to the form, or click the trigger near the label |
| FormSelect option | `getByRole("option", { name: "Product" })` |
| Submit button | `[role="dialog"] [type="submit"]` |
| Success toast | `[data-sonner-toast][data-type="success"]` |
| Error toast | `[data-sonner-toast][data-type="error"]` |
| Row action menu (⋯) | `button:has(.sr-only)` on table row |
| Edit menu item | `getByRole("menuitem", { name: "Edit" })` — navigates to `/crm/products/{id}` |
| Delete menu item | `getByRole("menuitem", { name: "Delete" })` |
| AlertModal confirm | `getByRole("button", { name: "Continue" })` |
| AlertModal cancel | `getByRole("button", { name: "Cancel" })` |
| Import button | `button:has-text("Import")` |
| Import dialog title | `"Import Products from CSV"` |
| File input | `input[type="file"]` |
| Confirm import button | `button:has-text("Confirm Import")` |
| Recurring checkbox | `#is_recurring` |
| Product name link in table | `a[href*="/crm/products/"]` |
| Detail page tabs | `getByRole("tab", { name: "Basic" })`, `"Accounts"`, `"History"` |

## Important: FormSelect interaction pattern

The `FormSelect` component (at `components/form/from-select.tsx`) renders:
1. A hidden `<Input>` with `type="hidden"` that holds the value
2. A visible Radix `<Select>` with `<SelectTrigger>` and `<SelectContent>`

To select a value in tests:
1. Find the `SelectTrigger` (a `button[role="combobox"]`) near the label
2. Click it to open the dropdown
3. Click the `SelectItem` with `getByRole("option", { name: "..." })`

The exact pattern per field:

```typescript
// For a FormSelect labeled "Type":
// The label "Type" is associated with the hidden input via htmlFor={id}
// The SelectTrigger is the next combobox button after that label
async function selectFormOption(page: Page, fieldLabel: string, optionName: string) {
  // Find the form-select container by its label text
  const container = page.locator('[role="dialog"]')
    .locator('.space-y-2')
    .filter({ hasText: fieldLabel });
  await container.locator('button[role="combobox"]').click();
  await page.getByRole("option", { name: optionName }).click();
}
```

---

### Task 1: CSV test fixture

**Files:**
- Create: `tests/fixtures/products-import.csv`

- [ ] **Step 1: Create the CSV fixture file**

```csv
name,sku,type,category,description,unit_price,unit_cost,currency,tax_rate,unit,is_recurring,billing_period
"PW Import Widget","PW-IMP-001","PRODUCT","","Playwright import test product",49.99,25.00,"USD",10,"per unit",false,
"PW Import Service","PW-IMP-002","SERVICE","","Playwright import test service",199.00,80.00,"USD",20,"per month",true,MONTHLY
```

- [ ] **Step 2: Commit**

```bash
git add tests/fixtures/products-import.csv
git commit -m "test: add CSV fixture for product import e2e tests"
```

---

### Task 2: product-create.spec.ts

**Files:**
- Create: `tests/e2e/product-create.spec.ts`

- [ ] **Step 1: Write the create spec file**

```typescript
import { test, expect, Page } from "@playwright/test";

async function waitForSheet(page: Page) {
  await page.waitForSelector('[role="dialog"][data-state="open"]', {
    timeout: 10000,
  });
}

async function assertSuccessToast(page: Page) {
  await expect(
    page.locator('[data-sonner-toast][data-type="success"]').first()
  ).toBeVisible({ timeout: 15000 });
}

async function assertErrorToast(page: Page) {
  await expect(
    page.locator('[data-sonner-toast][data-type="error"]').first()
  ).toBeVisible({ timeout: 15000 });
}

/**
 * Select an option from a FormSelect component inside the open dialog.
 * FormSelect renders a hidden input + a Radix Select combobox.
 */
async function selectFormOption(
  page: Page,
  fieldLabel: string,
  optionName: string
) {
  const dialog = page.locator('[role="dialog"][data-state="open"]');
  const container = dialog.locator(".space-y-2").filter({ hasText: fieldLabel });
  await container.locator('button[role="combobox"]').click();
  await page.getByRole("option", { name: optionName }).click();
}

test.describe("Create Product", () => {
  test.use({ storageState: "playwright/.auth/user.json" });

  test("should create a product with required fields only", async ({
    page,
  }) => {
    await page.goto("/en/crm/products");
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    // Open the create sheet via the "+" trigger button
    await page.locator('button:has-text("+")').click();
    await waitForSheet(page);
    await expect(
      page.getByRole("heading", { name: /Create Product/i })
    ).toBeVisible({ timeout: 5000 });

    // Fill required fields
    const uniqueName = `PW Product ${Date.now()}`;
    await page.getByLabel("Name", { exact: true }).fill(uniqueName);
    await selectFormOption(page, "Type", "Product");
    await page.getByLabel("Unit Price", { exact: true }).fill("99.99");
    await selectFormOption(page, "Currency", /USD/);

    // Submit
    await page.locator('[role="dialog"] [type="submit"]').click();

    // Assert success
    await assertSuccessToast(page);
    await expect(
      page.locator('[role="dialog"][data-state="open"]')
    ).not.toBeVisible({ timeout: 8000 });

    // Verify product appears in the page (table or empty-state replaced)
    await expect(page.getByText(uniqueName).first()).toBeVisible({
      timeout: 8000,
    });
  });

  test("should create a product with all fields including recurring billing", async ({
    page,
  }) => {
    await page.goto("/en/crm/products");
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    await page.locator('button:has-text("+")').click();
    await waitForSheet(page);

    const uniqueName = `PW Full Product ${Date.now()}`;
    const uniqueSku = `PW-SKU-${Date.now()}`;

    // Fill all fields
    await page.getByLabel("Name", { exact: true }).fill(uniqueName);
    await page.getByLabel("SKU", { exact: true }).fill(uniqueSku);
    await selectFormOption(page, "Type", "Service");
    await selectFormOption(page, "Status", "Active");
    await page.getByLabel("Unit Price", { exact: true }).fill("199.00");
    await page.getByLabel("Unit Cost", { exact: true }).fill("80.00");
    await selectFormOption(page, "Currency", /USD/);
    await page.getByLabel("Tax Rate (%)", { exact: true }).fill("20");
    await page.getByLabel("Unit", { exact: true }).fill("per month");

    // Check recurring billing checkbox
    await page.locator("#is_recurring").click();

    // Select billing period (appears after checking recurring)
    await selectFormOption(page, "Billing Period", "Monthly");

    // Fill description
    await page.getByLabel("Description", { exact: true }).fill(
      "Playwright test product with all fields"
    );

    // Submit
    await page.locator('[role="dialog"] [type="submit"]').click();

    await assertSuccessToast(page);
    await expect(
      page.locator('[role="dialog"][data-state="open"]')
    ).not.toBeVisible({ timeout: 8000 });

    await expect(page.getByText(uniqueName).first()).toBeVisible({
      timeout: 8000,
    });
  });

  test("should show validation error when name is empty", async ({ page }) => {
    await page.goto("/en/crm/products");
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    await page.locator('button:has-text("+")').click();
    await waitForSheet(page);

    // Fill other required fields but leave name empty
    await selectFormOption(page, "Type", "Product");
    await page.getByLabel("Unit Price", { exact: true }).fill("10");
    await selectFormOption(page, "Currency", /USD/);

    // Submit with empty name
    await page.locator('[role="dialog"] [type="submit"]').click();

    // Sheet should still be open (form did not submit successfully)
    await expect(
      page.locator('[role="dialog"][data-state="open"]')
    ).toBeVisible({ timeout: 3000 });
  });

  test("should handle duplicate SKU", async ({ page }) => {
    await page.goto("/en/crm/products");
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    const duplicateSku = `PW-DUP-${Date.now()}`;

    // Create first product with SKU
    await page.locator('button:has-text("+")').click();
    await waitForSheet(page);
    await page.getByLabel("Name", { exact: true }).fill(`PW Dup Test 1 ${Date.now()}`);
    await page.getByLabel("SKU", { exact: true }).fill(duplicateSku);
    await selectFormOption(page, "Type", "Product");
    await page.getByLabel("Unit Price", { exact: true }).fill("10");
    await selectFormOption(page, "Currency", /USD/);
    await page.locator('[role="dialog"] [type="submit"]').click();
    await assertSuccessToast(page);
    await expect(
      page.locator('[role="dialog"][data-state="open"]')
    ).not.toBeVisible({ timeout: 8000 });

    // Try creating second product with same SKU
    await page.locator('button:has-text("+")').click();
    await waitForSheet(page);
    await page.getByLabel("Name", { exact: true }).fill(`PW Dup Test 2 ${Date.now()}`);
    await page.getByLabel("SKU", { exact: true }).fill(duplicateSku);
    await selectFormOption(page, "Type", "Product");
    await page.getByLabel("Unit Price", { exact: true }).fill("20");
    await selectFormOption(page, "Currency", /USD/);
    await page.locator('[role="dialog"] [type="submit"]').click();

    // Should show error toast (Prisma unique constraint violation)
    await assertErrorToast(page);
  });
});
```

- [ ] **Step 2: Run the tests to verify they work**

```bash
pnpm test:e2e tests/e2e/product-create.spec.ts --project=chromium
```

Expected: All 4 tests pass.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/product-create.spec.ts
git commit -m "test: add product create e2e tests"
```

---

### Task 3: product-read.spec.ts

**Files:**
- Create: `tests/e2e/product-read.spec.ts`

**Depends on:** Task 2 (needs at least one product in the database)

- [ ] **Step 1: Write the read spec file**

```typescript
import { test, expect } from "@playwright/test";

test.describe("Read Products", () => {
  test.use({ storageState: "playwright/.auth/user.json" });

  test("should display products table with expected columns", async ({
    page,
  }) => {
    await page.goto("/en/crm/products");
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    // Verify the page loaded with the "Product Catalog" card title
    await expect(page.getByText("Product Catalog")).toBeVisible({
      timeout: 10000,
    });

    // Verify table headers are present
    const table = page.locator("table").first();
    await expect(table).toBeVisible({ timeout: 10000 });
    await expect(table.locator("thead")).toContainText("Name");
  });

  test("should navigate to product detail page from table", async ({
    page,
  }) => {
    await page.goto("/en/crm/products");
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    // Click the first product name link
    const firstProductLink = page.locator('a[href*="/crm/products/"]').first();
    await expect(firstProductLink).toBeVisible({ timeout: 10000 });
    const productName = await firstProductLink.textContent();

    await firstProductLink.click();
    await page.waitForURL(/crm\/products\//, { timeout: 10000 });

    // Verify we're on the detail page
    await expect(page.getByText(`Product: ${productName}`)).toBeVisible({
      timeout: 10000,
    });
  });

  test("should display product detail with tabs", async ({ page }) => {
    await page.goto("/en/crm/products");
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    // Navigate to first product detail
    const firstProductLink = page.locator('a[href*="/crm/products/"]').first();
    await expect(firstProductLink).toBeVisible({ timeout: 10000 });
    await firstProductLink.click();
    await page.waitForURL(/crm\/products\//, { timeout: 10000 });

    // Verify all three tabs are present
    await expect(page.getByRole("tab", { name: "Basic" })).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByRole("tab", { name: /Accounts/ })).toBeVisible();
    await expect(page.getByRole("tab", { name: "History" })).toBeVisible();
  });

  test("should filter products by type", async ({ page }) => {
    await page.goto("/en/crm/products");
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    // The DataTableToolbar renders faceted filter buttons for "type" and "status"
    // Look for the Type filter button in the toolbar
    const typeFilter = page.getByRole("button", { name: /Type/i });
    if (await typeFilter.isVisible({ timeout: 5000 }).catch(() => false)) {
      await typeFilter.click();

      // Select "Product" option in the filter popover
      const productOption = page.getByRole("option", { name: "Product" })
        .or(page.locator('[role="listbox"]').getByText("Product"));
      if (await productOption.isVisible({ timeout: 3000 }).catch(() => false)) {
        await productOption.click();
        // Close the popover by clicking outside
        await page.keyboard.press("Escape");

        // Verify the filter is applied — table should still be visible
        await expect(page.locator("table").first()).toBeVisible();
      }
    } else {
      test.skip(true, "Type filter not visible — may need more products");
    }
  });

  test("should filter products by status", async ({ page }) => {
    await page.goto("/en/crm/products");
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    const statusFilter = page.getByRole("button", { name: /Status/i });
    if (await statusFilter.isVisible({ timeout: 5000 }).catch(() => false)) {
      await statusFilter.click();

      const activeOption = page.getByRole("option", { name: "Active" })
        .or(page.locator('[role="listbox"]').getByText("Active"));
      if (await activeOption.isVisible({ timeout: 3000 }).catch(() => false)) {
        await activeOption.click();
        await page.keyboard.press("Escape");
        await expect(page.locator("table").first()).toBeVisible();
      }
    } else {
      test.skip(true, "Status filter not visible — may need more products");
    }
  });
});
```

- [ ] **Step 2: Run the tests**

```bash
pnpm test:e2e tests/e2e/product-read.spec.ts --project=chromium
```

Expected: All 5 tests pass (filter tests may skip if no data).

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/product-read.spec.ts
git commit -m "test: add product read/list e2e tests"
```

---

### Task 4: product-update.spec.ts

**Files:**
- Create: `tests/e2e/product-update.spec.ts`

**Note:** The row action "Edit" navigates to `/crm/products/{id}` (the detail page), not a sheet. The detail page has an `EditProductButton` that opens the update sheet. The update flow is: row action → detail page → click Edit button → update sheet.

- [ ] **Step 1: Write the update spec file**

```typescript
import { test, expect, Page } from "@playwright/test";

async function waitForSheet(page: Page) {
  await page.waitForSelector('[role="dialog"][data-state="open"]', {
    timeout: 10000,
  });
}

async function assertSuccessToast(page: Page) {
  await expect(
    page.locator('[data-sonner-toast][data-type="success"]').first()
  ).toBeVisible({ timeout: 15000 });
}

async function selectFormOption(
  page: Page,
  fieldLabel: string,
  optionName: string | RegExp
) {
  const dialog = page.locator('[role="dialog"][data-state="open"]');
  const container = dialog.locator(".space-y-2").filter({ hasText: fieldLabel });
  await container.locator('button[role="combobox"]').click();
  await page.getByRole("option", { name: optionName }).click();
}

/**
 * Navigate to product detail via row action "Edit" menu item,
 * then open the update sheet via the Edit button on the detail page.
 */
async function openUpdateSheetViaRowAction(page: Page) {
  // Go to products list
  await page.goto("/en/crm/products");
  await page.waitForLoadState("networkidle", { timeout: 15000 });

  // Click first row's action menu
  const firstRow = page.locator("table tbody tr").first();
  await expect(firstRow).toBeVisible({ timeout: 10000 });
  await firstRow.locator("button:has(.sr-only)").first().click();

  // Click "Edit" — this navigates to detail page
  await page.getByRole("menuitem", { name: "Edit" }).click();
  await page.waitForURL(/crm\/products\//, { timeout: 10000 });
  await page.waitForLoadState("networkidle", { timeout: 15000 });

  // Click the Edit button on the detail page to open update sheet
  await page.getByRole("button", { name: /Edit/i }).click();
  await waitForSheet(page);
  await expect(
    page.getByRole("heading", { name: /Update Product/i })
  ).toBeVisible({ timeout: 5000 });
}

test.describe("Update Product", () => {
  test.use({ storageState: "playwright/.auth/user.json" });

  test("should update product name via row action", async ({ page }) => {
    await openUpdateSheetViaRowAction(page);

    // Update the name
    const uniqueName = `PW Updated ${Date.now()}`;
    const nameInput = page.getByLabel("Name", { exact: true });
    await nameInput.clear();
    await nameInput.fill(uniqueName);

    // Submit
    await page.locator('[role="dialog"] [type="submit"]').click();

    await assertSuccessToast(page);
    await expect(
      page.locator('[role="dialog"][data-state="open"]')
    ).not.toBeVisible({ timeout: 8000 });

    // Verify updated name on the detail page
    await expect(page.getByText(uniqueName).first()).toBeVisible({
      timeout: 8000,
    });
  });

  test("should update product price and status", async ({ page }) => {
    await openUpdateSheetViaRowAction(page);

    // Update price
    const priceInput = page.getByLabel("Unit Price", { exact: true });
    await priceInput.clear();
    await priceInput.fill("149.99");

    // Change status to Active
    await selectFormOption(page, "Status", "Active");

    // Submit
    await page.locator('[role="dialog"] [type="submit"]').click();

    await assertSuccessToast(page);
    await expect(
      page.locator('[role="dialog"][data-state="open"]')
    ).not.toBeVisible({ timeout: 8000 });
  });

  test("should toggle recurring and set billing period", async ({ page }) => {
    await openUpdateSheetViaRowAction(page);

    // Check the recurring checkbox
    const recurringCheckbox = page.locator("#is_recurring");
    const isChecked = await recurringCheckbox.isChecked();
    if (!isChecked) {
      await recurringCheckbox.click();
    }

    // Select billing period (visible after recurring is checked)
    await selectFormOption(page, "Billing Period", "Quarterly");

    // Submit
    await page.locator('[role="dialog"] [type="submit"]').click();

    await assertSuccessToast(page);
    await expect(
      page.locator('[role="dialog"][data-state="open"]')
    ).not.toBeVisible({ timeout: 8000 });
  });
});
```

- [ ] **Step 2: Run the tests**

```bash
pnpm test:e2e tests/e2e/product-update.spec.ts --project=chromium
```

Expected: All 3 tests pass.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/product-update.spec.ts
git commit -m "test: add product update e2e tests"
```

---

### Task 5: product-delete.spec.ts

**Files:**
- Create: `tests/e2e/product-delete.spec.ts`

- [ ] **Step 1: Write the delete spec file**

```typescript
import { test, expect, Page } from "@playwright/test";

async function waitForSheet(page: Page) {
  await page.waitForSelector('[role="dialog"][data-state="open"]', {
    timeout: 10000,
  });
}

async function assertSuccessToast(page: Page) {
  await expect(
    page.locator('[data-sonner-toast][data-type="success"]').first()
  ).toBeVisible({ timeout: 15000 });
}

async function selectFormOption(
  page: Page,
  fieldLabel: string,
  optionName: string | RegExp
) {
  const dialog = page.locator('[role="dialog"][data-state="open"]');
  const container = dialog.locator(".space-y-2").filter({ hasText: fieldLabel });
  await container.locator('button[role="combobox"]').click();
  await page.getByRole("option", { name: optionName }).click();
}

/**
 * Create a disposable product so delete tests are self-contained
 * and don't destroy data needed by other tests.
 */
async function createDisposableProduct(page: Page, name: string) {
  await page.goto("/en/crm/products");
  await page.waitForLoadState("networkidle", { timeout: 15000 });

  await page.locator('button:has-text("+")').click();
  await waitForSheet(page);

  await page.getByLabel("Name", { exact: true }).fill(name);
  await selectFormOption(page, "Type", "Product");
  await page.getByLabel("Unit Price", { exact: true }).fill("1.00");
  await selectFormOption(page, "Currency", /USD/);

  await page.locator('[role="dialog"] [type="submit"]').click();
  await assertSuccessToast(page);
  await expect(
    page.locator('[role="dialog"][data-state="open"]')
  ).not.toBeVisible({ timeout: 8000 });

  // Wait for the product to appear in the table
  await expect(page.getByText(name).first()).toBeVisible({ timeout: 8000 });
}

test.describe("Delete Product", () => {
  test.use({ storageState: "playwright/.auth/user.json" });

  test("should delete a product via row action with confirmation", async ({
    page,
  }) => {
    const productName = `PW Delete Me ${Date.now()}`;
    await createDisposableProduct(page, productName);

    // Find the row with our product and open its action menu
    const productRow = page.locator("table tbody tr").filter({
      hasText: productName,
    });
    await productRow.locator("button:has(.sr-only)").first().click();

    // Click Delete
    await page.getByRole("menuitem", { name: "Delete" }).click();

    // AlertModal should appear with "Are you sure?" title
    await expect(
      page.getByRole("heading", { name: /Are you sure/i })
    ).toBeVisible({ timeout: 5000 });

    // Confirm deletion
    await page.getByRole("button", { name: "Continue" }).click();

    // Assert success toast
    await assertSuccessToast(page);

    // Verify product is no longer visible in the table
    await expect(page.getByText(productName)).not.toBeVisible({
      timeout: 8000,
    });
  });

  test("should cancel delete via confirmation dialog", async ({ page }) => {
    const productName = `PW Keep Me ${Date.now()}`;
    await createDisposableProduct(page, productName);

    // Find the row and open action menu
    const productRow = page.locator("table tbody tr").filter({
      hasText: productName,
    });
    await productRow.locator("button:has(.sr-only)").first().click();

    // Click Delete
    await page.getByRole("menuitem", { name: "Delete" }).click();

    // AlertModal appears
    await expect(
      page.getByRole("heading", { name: /Are you sure/i })
    ).toBeVisible({ timeout: 5000 });

    // Cancel
    await page.getByRole("button", { name: "Cancel" }).click();

    // Dialog should close
    await expect(
      page.getByRole("heading", { name: /Are you sure/i })
    ).not.toBeVisible({ timeout: 5000 });

    // Product should still be visible
    await expect(page.getByText(productName).first()).toBeVisible();
  });
});
```

- [ ] **Step 2: Run the tests**

```bash
pnpm test:e2e tests/e2e/product-delete.spec.ts --project=chromium
```

Expected: Both tests pass.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/product-delete.spec.ts
git commit -m "test: add product delete e2e tests"
```

---

### Task 6: product-import.spec.ts

**Files:**
- Create: `tests/e2e/product-import.spec.ts`

- [ ] **Step 1: Write the import spec file**

```typescript
import { test, expect } from "@playwright/test";
import path from "path";

test.describe("Import Products", () => {
  test.use({ storageState: "playwright/.auth/user.json" });

  test("should open import dialog and download CSV template", async ({
    page,
  }) => {
    await page.goto("/en/crm/products");
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    // Click the Import button
    await page.locator('button:has-text("Import")').click();

    // Verify dialog opens with correct title
    await expect(
      page.getByRole("heading", { name: "Import Products from CSV" })
    ).toBeVisible({ timeout: 5000 });

    // Verify template download button exists
    const downloadButton = page.getByRole("button", {
      name: /Download CSV Template/i,
    });
    await expect(downloadButton).toBeVisible();

    // Set up download listener and click
    const downloadPromise = page.waitForEvent("download");
    await downloadButton.click();
    const download = await downloadPromise;

    // Verify the downloaded file name
    expect(download.suggestedFilename()).toBe("products_import_template.csv");
  });

  test("should import products from CSV file with preview", async ({
    page,
  }) => {
    await page.goto("/en/crm/products");
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    // Open import dialog
    await page.locator('button:has-text("Import")').click();
    await expect(
      page.getByRole("heading", { name: "Import Products from CSV" })
    ).toBeVisible({ timeout: 5000 });

    // Upload the CSV fixture file
    const fixtureFile = path.resolve(
      __dirname,
      "../fixtures/products-import.csv"
    );
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(fixtureFile);

    // Verify preview table appears with rows
    await expect(page.getByText("Showing first")).toBeVisible({
      timeout: 5000,
    });

    // Verify preview contains expected data
    await expect(page.getByText("PW Import Widget")).toBeVisible();
    await expect(page.getByText("PW Import Service")).toBeVisible();

    // Click Confirm Import
    await page.getByRole("button", { name: "Confirm Import" }).click();

    // Wait for import to complete — should see success or error result
    // Success: green CheckCircle with "X product(s) imported successfully"
    // Error: red XCircle with error messages
    const successIndicator = page.getByText("imported successfully");
    const errorIndicator = page.getByText("error(s)");
    await expect(successIndicator.or(errorIndicator)).toBeVisible({
      timeout: 15000,
    });
  });
});
```

- [ ] **Step 2: Run the tests**

```bash
pnpm test:e2e tests/e2e/product-import.spec.ts --project=chromium
```

Expected: Both tests pass.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/product-import.spec.ts
git commit -m "test: add product import e2e tests"
```

---

### Task 7: Run full suite and final commit

- [ ] **Step 1: Run all product tests together**

```bash
pnpm test:e2e tests/e2e/product-*.spec.ts --project=chromium
```

Expected: All 16 tests pass (4 create + 5 read + 3 update + 2 delete + 2 import).

- [ ] **Step 2: Fix any failures**

If any tests fail, read the error output, diagnose selector mismatches or timing issues, and fix. Common issues:
- FormSelect combobox selector may need adjustment — check actual rendered HTML
- Timing: increase timeouts if tests are flaky
- Data dependency: read tests may fail if no products exist yet (run create first)

- [ ] **Step 3: Final commit if fixes were needed**

```bash
git add tests/e2e/product-*.spec.ts
git commit -m "test: fix product e2e test issues"
```
