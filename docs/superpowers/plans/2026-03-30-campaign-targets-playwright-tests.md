# Campaign Targets Playwright Tests — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create comprehensive E2E Playwright tests for Targets and Target Lists in the Campaign module.

**Architecture:** Single test file with three serial describe blocks. All test data created through UI interactions. Follows existing campaign test patterns (storageState auth, success toast helpers, shadcn/ui selectors).

**Tech Stack:** Playwright, TypeScript, shadcn/ui component selectors

**Spec:** `docs/superpowers/specs/2026-03-30-campaign-targets-playwright-tests-design.md`

---

## File Map

- **Create:** `tests/e2e/campaign-targets.spec.ts` — All 15 test cases across 3 serial describe blocks

---

### Task 1: Scaffold test file with helpers and Targets describe block (tests 1-3)

**Files:**
- Create: `tests/e2e/campaign-targets.spec.ts`

- [ ] **Step 1: Create the test file with helpers and first 3 tests**

```ts
import { test, expect, Page } from "@playwright/test";

async function assertSuccessToast(page: Page) {
  await expect(
    page.locator('[data-sonner-toast][data-type="success"]').first()
  ).toBeVisible({ timeout: 15000 });
}

async function waitForRows(page: Page) {
  await expect(async () => {
    const empty = await page.getByText("No results.").isVisible();
    expect(empty).toBe(false);
  }).toPass({ timeout: 10000 });
}

test.describe.serial("Campaign Targets", () => {
  test.use({ storageState: "playwright/.auth/user.json" });

  test("should display targets page with table", async ({ page }) => {
    await page.goto("/en/campaigns/targets");
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    await expect(
      page.locator("h3").filter({ hasText: "Targets" })
    ).toBeVisible({ timeout: 10000 });

    await expect(
      page.getByRole("button", { name: /\+ New Target/i })
    ).toBeVisible();

    await expect(page.locator("table")).toBeVisible({ timeout: 10000 });
  });

  test("should create a new target with all fields", async ({ page }) => {
    await page.goto("/en/campaigns/targets");
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    // Open the new target sheet
    await page.getByRole("button", { name: /\+ New Target/i }).click();

    await expect(page.getByText("Create new Target")).toBeVisible({
      timeout: 5000,
    });

    // --- Name & Contact ---
    await page.getByLabel("First name").fill("PW-Target-First");
    await page.getByLabel("Last name").fill("PW-Target-Last");
    await page.getByLabel("Email").first().fill("pw-target@test.example.com");
    await page.getByLabel("Mobile phone").fill("+1 555 000 1111");
    await page.getByLabel("Office phone").fill("+1 555 000 2222");

    // --- Company ---
    await page.getByLabel("Company").fill("PW Test Corp");
    await page.getByLabel("Position").fill("QA Engineer");
    await page.getByLabel("Company website").fill("https://pw-test-corp.com");
    await page.getByLabel("Personal website").fill("https://pw-target.dev");

    // --- Social ---
    await page.getByLabel("LinkedIn").fill("https://linkedin.com/in/pw-target");
    await page.getByLabel("X (Twitter)").fill("https://x.com/pw-target");
    await page.getByLabel("Instagram").fill("https://instagram.com/pw-target");
    await page.getByLabel("Facebook").fill("https://facebook.com/pw-target");

    // --- Additional Contact ---
    await page.getByLabel("Personal Email").fill("pw-personal@test.example.com");
    await page.getByLabel("Company Email").fill("pw-company@test.example.com");
    await page.getByLabel("Company Phone").fill("+1 800 000 0000");

    // --- Location & Industry ---
    await page.getByLabel("City").fill("Prague");
    await page.getByLabel("Country").fill("Czech Republic");
    await page.getByLabel("Industry").fill("SaaS");
    await page.getByLabel("Employees").fill("50-200");

    // --- Description ---
    await page.getByLabel("Description").fill("Playwright test target with all fields");

    // Submit
    await page.getByRole("button", { name: "Create target" }).click();

    await assertSuccessToast(page);

    // Verify the sheet closed and table refreshed
    await page.waitForLoadState("networkidle", { timeout: 15000 });
  });

  test("should filter targets by last name", async ({ page }) => {
    await page.goto("/en/campaigns/targets");
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    const filterInput = page.getByPlaceholder("Filter by last name ...");
    await expect(filterInput).toBeVisible({ timeout: 10000 });

    // Type something that matches nothing
    await filterInput.fill("zzz_no_match_zzz");
    await expect(page.getByText("No results.")).toBeVisible({
      timeout: 5000,
    });

    // Clear the filter and verify rows reappear
    await filterInput.fill("");
    await waitForRows(page);
  });
});
```

- [ ] **Step 2: Run the test to verify first 3 tests pass**

Run: `npx playwright test tests/e2e/campaign-targets.spec.ts --headed --timeout 60000`
Expected: 3 tests pass (page display, create target, filter)

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/campaign-targets.spec.ts
git commit -m "test: add Playwright tests for targets page display, create, and filter"
```

---

### Task 2: Add targets row actions and navigation tests (tests 4-6)

**Files:**
- Modify: `tests/e2e/campaign-targets.spec.ts`

- [ ] **Step 1: Add tests 4-6 inside the "Campaign Targets" describe block, after the filter test**

```ts
  test("should navigate to target detail via row action View", async ({
    page,
  }) => {
    await page.goto("/en/campaigns/targets");
    await page.waitForLoadState("networkidle", { timeout: 15000 });
    await waitForRows(page);

    const firstRow = page.locator("table tbody tr").first();
    await firstRow.hover();
    await firstRow.locator("button:has(.sr-only)").first().click();

    await page.getByRole("menuitem", { name: "View" }).click();
    await page.waitForURL(/\/campaigns\/targets\/[a-z0-9-]+$/, {
      timeout: 10000,
    });
    await page.waitForLoadState("networkidle", { timeout: 15000 });
  });

  test("should update a target via row action", async ({ page }) => {
    await page.goto("/en/campaigns/targets");
    await page.waitForLoadState("networkidle", { timeout: 15000 });
    await waitForRows(page);

    const firstRow = page.locator("table tbody tr").first();
    await firstRow.hover();
    await firstRow.locator("button:has(.sr-only)").first().click();

    await page.getByRole("menuitem", { name: "Update" }).click();

    // Wait for the update form modal to appear
    await expect(page.getByText("Update target details")).toBeVisible({
      timeout: 5000,
    });

    // Modify a field
    const positionField = page.getByLabel("Position");
    await positionField.clear();
    await positionField.fill("Senior QA Engineer");

    await page.getByRole("button", { name: "Update target" }).click();

    await assertSuccessToast(page);
  });

  test("should navigate to target detail via name link", async ({ page }) => {
    await page.goto("/en/campaigns/targets");
    await page.waitForLoadState("networkidle", { timeout: 15000 });
    await waitForRows(page);

    const firstRow = page.locator("table tbody tr").first();
    const nameLink = firstRow.locator("a").first();
    await expect(nameLink).toBeVisible({ timeout: 5000 });
    await nameLink.click();

    await page.waitForURL(/\/campaigns\/targets\/[a-z0-9-]+$/, {
      timeout: 10000,
    });
  });
```

- [ ] **Step 2: Run the tests to verify tests 4-6 pass**

Run: `npx playwright test tests/e2e/campaign-targets.spec.ts --headed --timeout 60000`
Expected: 6 tests pass

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/campaign-targets.spec.ts
git commit -m "test: add Playwright tests for target row actions — View, Update, name link navigation"
```

---

### Task 3: Add target detail view and convert tests (tests 7-8)

**Files:**
- Modify: `tests/e2e/campaign-targets.spec.ts`

- [ ] **Step 1: Add tests 7-8 inside the "Campaign Targets" describe block, after the name link test**

```ts
  test("should display target detail with all fields", async ({ page }) => {
    await page.goto("/en/campaigns/targets");
    await page.waitForLoadState("networkidle", { timeout: 15000 });
    await waitForRows(page);

    // Navigate to the PW-created target detail
    const firstRow = page.locator("table tbody tr").first();
    await firstRow.locator("a").first().click();
    await page.waitForURL(/\/campaigns\/targets\/[a-z0-9-]+$/, {
      timeout: 10000,
    });
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    // Verify header with target name
    await expect(page.getByText("PW-Target-First")).toBeVisible({
      timeout: 10000,
    });

    // Verify company info
    await expect(page.getByText("Company")).toBeVisible();
    await expect(page.getByText("PW Test Corp")).toBeVisible();

    // Verify position
    await expect(page.getByText("Position")).toBeVisible();

    // Verify Contact Information card
    await expect(page.getByText("Contact information")).toBeVisible();
    await expect(page.getByText("pw-target@test.example.com")).toBeVisible();

    // Verify Social Networks card
    await expect(page.getByText("Social networks")).toBeVisible();
  });

  test("should convert target to account + contact", async ({ page }) => {
    await page.goto("/en/campaigns/targets");
    await page.waitForLoadState("networkidle", { timeout: 15000 });
    await waitForRows(page);

    // Open Update modal for the target (convert is inside the update form)
    const firstRow = page.locator("table tbody tr").first();
    await firstRow.hover();
    await firstRow.locator("button:has(.sr-only)").first().click();

    await page.getByRole("menuitem", { name: "Update" }).click();

    await expect(page.getByText("Update target details")).toBeVisible({
      timeout: 5000,
    });

    // Click "Convert to Account" button
    await page
      .getByRole("button", { name: /Convert to Account/i })
      .click();

    // Confirm the conversion dialog
    await expect(
      page.getByText("Convert to Account + Contact?")
    ).toBeVisible({ timeout: 5000 });

    await page
      .getByRole("button", { name: "Convert" })
      .click();

    await assertSuccessToast(page);
  });
```

- [ ] **Step 2: Run the tests to verify tests 7-8 pass**

Run: `npx playwright test tests/e2e/campaign-targets.spec.ts --headed --timeout 60000`
Expected: 8 tests pass

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/campaign-targets.spec.ts
git commit -m "test: add Playwright tests for target detail view and conversion"
```

---

### Task 4: Add Target Lists describe block (tests 1-3)

**Files:**
- Modify: `tests/e2e/campaign-targets.spec.ts`

- [ ] **Step 1: Add the "Campaign Target Lists" describe block after the "Campaign Targets" block, with tests 1-3**

```ts
test.describe.serial("Campaign Target Lists", () => {
  test.use({ storageState: "playwright/.auth/user.json" });

  test("should display target lists page with table", async ({ page }) => {
    await page.goto("/en/campaigns/target-lists");
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    await expect(
      page.locator("h3").filter({ hasText: "Target Lists" })
    ).toBeVisible({ timeout: 10000 });

    await expect(
      page.getByRole("button", { name: /\+ New List/i })
    ).toBeVisible();

    await expect(page.locator("table")).toBeVisible({ timeout: 10000 });
  });

  test("should create a new target list", async ({ page }) => {
    await page.goto("/en/campaigns/target-lists");
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    // Open create modal
    await page.getByRole("button", { name: /\+ New List/i }).click();

    await expect(page.getByText("Create Target List")).toBeVisible({
      timeout: 5000,
    });

    // Fill form
    await page.getByLabel("Name *").fill("PW-Target-List");
    await page.getByLabel("Description").fill("Playwright test target list");

    // Submit
    await page.getByRole("button", { name: "Create" }).click();

    await assertSuccessToast(page);

    await page.waitForLoadState("networkidle", { timeout: 15000 });
  });

  test("should navigate to target list detail", async ({ page }) => {
    await page.goto("/en/campaigns/target-lists");
    await page.waitForLoadState("networkidle", { timeout: 15000 });
    await waitForRows(page);

    const firstRow = page.locator("table tbody tr").first();
    await firstRow.hover();
    await firstRow.locator("button:has(.sr-only)").first().click();

    await page.getByRole("menuitem", { name: "View" }).click();
    await page.waitForURL(/\/campaigns\/target-lists\/[a-z0-9-]+$/, {
      timeout: 10000,
    });
    await page.waitForLoadState("networkidle", { timeout: 15000 });
  });
});
```

- [ ] **Step 2: Run the tests to verify target list tests 1-3 pass**

Run: `npx playwright test tests/e2e/campaign-targets.spec.ts --headed --timeout 60000`
Expected: 11 tests pass (8 targets + 3 target lists)

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/campaign-targets.spec.ts
git commit -m "test: add Playwright tests for target lists page display, create, and detail navigation"
```

---

### Task 5: Add Target Lists add/remove and delete tests (tests 4-6)

**Files:**
- Modify: `tests/e2e/campaign-targets.spec.ts`

- [ ] **Step 1: Add tests 4-6 inside the "Campaign Target Lists" describe block, after the detail navigation test**

```ts
  test("should add a target to the list", async ({ page }) => {
    await page.goto("/en/campaigns/target-lists");
    await page.waitForLoadState("networkidle", { timeout: 15000 });
    await waitForRows(page);

    // Navigate to PW-Target-List detail
    const firstRow = page.locator("table tbody tr").first();
    await firstRow.hover();
    await firstRow.locator("button:has(.sr-only)").first().click();
    await page.getByRole("menuitem", { name: "View" }).click();
    await page.waitForURL(/\/campaigns\/target-lists\/[a-z0-9-]+$/, {
      timeout: 10000,
    });
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    // Click "+ Add Target" button
    await page.getByRole("button", { name: /\+ Add Target/i }).click();

    await expect(page.getByText("Add Targets to List")).toBeVisible({
      timeout: 5000,
    });

    // Wait for targets to load and select the first one
    await expect(
      page.getByText("Loading targets...").or(
        page.locator('input[type="checkbox"]').first()
      )
    ).toBeVisible({ timeout: 10000 });

    // Wait for loading to finish
    await expect(page.getByText("Loading targets...")).not.toBeVisible({
      timeout: 10000,
    });

    const targetCheckboxes = page.locator(
      '[role="dialog"] input[type="checkbox"]'
    );
    const count = await targetCheckboxes.count();
    if (count > 0) {
      await targetCheckboxes.first().check();
      await page.getByRole("button", { name: /Add Selected/i }).click();
      await assertSuccessToast(page);
    } else {
      test.skip(true, "No targets available to add");
    }
  });

  test("should remove a target from the list", async ({ page }) => {
    await page.goto("/en/campaigns/target-lists");
    await page.waitForLoadState("networkidle", { timeout: 15000 });
    await waitForRows(page);

    // Navigate to PW-Target-List detail
    const firstRow = page.locator("table tbody tr").first();
    await firstRow.hover();
    await firstRow.locator("button:has(.sr-only)").first().click();
    await page.getByRole("menuitem", { name: "View" }).click();
    await page.waitForURL(/\/campaigns\/target-lists\/[a-z0-9-]+$/, {
      timeout: 10000,
    });
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    // Find the Trash2 icon button to remove the target
    const removeButton = page.locator("button").filter({ has: page.locator("svg.h-4.w-4") }).last();
    await expect(removeButton).toBeVisible({ timeout: 5000 });
    await removeButton.click();

    await assertSuccessToast(page);
  });

  test("should delete a target list via row action", async ({ page }) => {
    await page.goto("/en/campaigns/target-lists");
    await page.waitForLoadState("networkidle", { timeout: 15000 });
    await waitForRows(page);

    const rowCountBefore = await page.locator("table tbody tr").count();

    const lastRow = page.locator("table tbody tr").last();
    await lastRow.hover();
    await lastRow.locator("button:has(.sr-only)").first().click();

    await page.getByRole("menuitem", { name: "Delete" }).click();

    const confirmBtn = page.getByRole("button", {
      name: /Continue|Confirm|Delete/i,
    });
    await expect(confirmBtn).toBeVisible({ timeout: 5000 });
    await confirmBtn.click();

    await assertSuccessToast(page);

    await page.waitForLoadState("networkidle", { timeout: 10000 });
    await expect(async () => {
      const rowCountAfter = await page.locator("table tbody tr").count();
      const isEmpty = await page.getByText("No results.").isVisible();
      expect(isEmpty || rowCountAfter < rowCountBefore).toBeTruthy();
    }).toPass({ timeout: 5000 });
  });
```

- [ ] **Step 2: Run the tests to verify target list tests 4-6 pass**

Run: `npx playwright test tests/e2e/campaign-targets.spec.ts --headed --timeout 60000`
Expected: 14 tests pass (8 targets + 6 target lists)

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/campaign-targets.spec.ts
git commit -m "test: add Playwright tests for target list add/remove targets and delete list"
```

---

### Task 6: Add Target Cleanup describe block (test 1)

**Files:**
- Modify: `tests/e2e/campaign-targets.spec.ts`

- [ ] **Step 1: Add the "Target Cleanup" describe block after the "Campaign Target Lists" block**

```ts
test.describe.serial("Target Cleanup", () => {
  test.use({ storageState: "playwright/.auth/user.json" });

  test("should delete a target via row action", async ({ page }) => {
    await page.goto("/en/campaigns/targets");
    await page.waitForLoadState("networkidle", { timeout: 15000 });
    await waitForRows(page);

    const rowCountBefore = await page.locator("table tbody tr").count();

    const lastRow = page.locator("table tbody tr").last();
    await lastRow.hover();
    await lastRow.locator("button:has(.sr-only)").first().click();

    await page.getByRole("menuitem", { name: "Delete" }).click();

    const confirmBtn = page.getByRole("button", {
      name: /Continue|Confirm|Delete/i,
    });
    await expect(confirmBtn).toBeVisible({ timeout: 5000 });
    await confirmBtn.click();

    await assertSuccessToast(page);

    await page.waitForLoadState("networkidle", { timeout: 10000 });
    await expect(async () => {
      const rowCountAfter = await page.locator("table tbody tr").count();
      const isEmpty = await page.getByText("No results.").isVisible();
      expect(isEmpty || rowCountAfter < rowCountBefore).toBeTruthy();
    }).toPass({ timeout: 5000 });
  });
});
```

- [ ] **Step 2: Run the full test file to verify all 15 tests pass**

Run: `npx playwright test tests/e2e/campaign-targets.spec.ts --headed --timeout 60000`
Expected: 15 tests pass (8 targets + 6 target lists + 1 cleanup)

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/campaign-targets.spec.ts
git commit -m "test: add target cleanup Playwright test — delete via row action"
```

---

### Task 7: Final verification — run full E2E suite

**Files:** None (verification only)

- [ ] **Step 1: Run the campaign-targets test file end-to-end**

Run: `npx playwright test tests/e2e/campaign-targets.spec.ts --timeout 60000`
Expected: 15 tests pass

- [ ] **Step 2: Run all campaign E2E tests together to verify no conflicts**

Run: `npx playwright test tests/e2e/campaign-*.spec.ts --timeout 60000`
Expected: All campaign tests pass (list, create, detail, targets)

- [ ] **Step 3: Final commit if any adjustments were needed**

```bash
git add tests/e2e/campaign-targets.spec.ts
git commit -m "test: finalize campaign targets Playwright test suite"
```
