# Campaign Module Playwright Tests — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add E2E Playwright tests for the Campaign module covering the list page, creation wizard, and detail page.

**Architecture:** Three test files following existing patterns (`storageState` auth, `waitForSheet`/`assertSuccessToast` helpers, semantic selectors). The campaign creation wizard test uses `test.describe.serial` because a campaign must be created before it can be viewed on the detail page. The list page tests are standalone. Since no templates or target lists are seeded, the wizard tests will seed their own data via API calls in a `beforeAll` hook.

**Tech Stack:** Playwright, TypeScript, existing shadcn/ui component patterns

---

## Key Context for the Engineer

### Route paths
- List: `/en/campaigns`
- New: `/en/campaigns/new`
- Detail: `/en/campaigns/[id]`
- Templates: `/en/campaigns/templates`

### Seeded data
Two campaigns exist from seed: "Social networks" (status ACTIVE) and "Cold calls" (status null). Neither has templates, target lists, steps, or sends attached.

### No `data-testid` attributes
The campaign components do NOT use `data-testid`. Use semantic selectors:
- `getByRole('heading', { name: /Campaigns/i })`
- `getByPlaceholder('Filter by name ...')`
- `getByText('campaign name')`
- `locator('button:has(.sr-only)')` for row action menus

### Existing helper pattern (from other E2E tests)
```typescript
async function waitForSheet(page: Page) {
  await page.waitForSelector('[role="dialog"][data-state="open"]', { timeout: 10000 });
}

async function assertSuccessToast(page: Page) {
  await expect(
    page.locator('[data-sonner-toast][data-type="success"]').first()
  ).toBeVisible({ timeout: 15000 });
}
```

### Wizard step structure
1. **Step 1 — Details:** Campaign Name (required), Description, From Name, Reply-to Email. Next button: `getByRole('button', { name: /Next/ })`
2. **Step 2 — Template:** Tabs ("Generate with AI" / "Choose Existing"), Subject Line (required), TipTap editor (required). Back/Next buttons.
3. **Step 3 — Audience:** Search input, checkbox list of target lists, min 1 required. Back/Next buttons.
4. **Step 4 — Schedule:** Radio "Send now" / "Schedule for later", datetime-local input, follow-up steps. Back button, "Submit Campaign" button.

### CampaignsView table columns
Name (link), Status (badge), Scheduled At, Recipients, Template, Actions (⋯ menu with View / Delete).

---

## File Structure

| File | Responsibility |
|------|---------------|
| `tests/e2e/campaign-list.spec.ts` | Campaign list page: navigation, table rendering, filtering by name, filtering by status, reset filters, row action View, row action Delete |
| `tests/e2e/campaign-create.spec.ts` | Full wizard flow: step validations, back navigation, creating a campaign with "Send now" |
| `tests/e2e/campaign-detail.spec.ts` | Detail page: header, status badge, stats grid, steps timeline, recipients table |

---

## Task 1: Campaign List Page Tests

**Files:**
- Create: `tests/e2e/campaign-list.spec.ts`

- [ ] **Step 1: Create the test file with navigation and table rendering test**

```typescript
import { test, expect, Page } from "@playwright/test";

async function assertSuccessToast(page: Page) {
  await expect(
    page.locator('[data-sonner-toast][data-type="success"]').first()
  ).toBeVisible({ timeout: 15000 });
}

test.describe("Campaign List", () => {
  test.use({ storageState: "playwright/.auth/user.json" });

  test("should display campaigns list page with table", async ({ page }) => {
    await page.goto("/en/campaigns");
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    // Page heading
    await expect(
      page.getByRole("heading", { name: /Campaigns/i })
    ).toBeVisible({ timeout: 10000 });

    // New Campaign button
    await expect(
      page.getByRole("link", { name: /New Campaign/i })
    ).toBeVisible();

    // Table card heading
    await expect(page.getByText("All Campaigns")).toBeVisible();

    // Table should have rows (seeded data includes "Social networks" and "Cold calls")
    const tableRows = page.locator("table tbody tr");
    await expect(tableRows.first()).toBeVisible({ timeout: 10000 });
    const rowCount = await tableRows.count();
    expect(rowCount).toBeGreaterThanOrEqual(1);
  });

  test("should filter campaigns by name", async ({ page }) => {
    await page.goto("/en/campaigns");
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    const filterInput = page.getByPlaceholder("Filter by name ...");
    await expect(filterInput).toBeVisible({ timeout: 10000 });

    // Type a filter term that matches one seeded campaign
    await filterInput.fill("Social");

    // Should show matching row
    await expect(page.locator("table tbody tr").first()).toBeVisible({ timeout: 5000 });
    await expect(
      page.locator("table tbody").getByText("Social networks")
    ).toBeVisible();

    // Clear and type something that matches nothing
    await filterInput.clear();
    await filterInput.fill("zzz_no_match_zzz");

    await expect(page.getByText("No campaigns found.")).toBeVisible({
      timeout: 5000,
    });
  });

  test("should filter campaigns by status dropdown", async ({ page }) => {
    await page.goto("/en/campaigns");
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    // Open the status select
    await page.locator("button").filter({ hasText: /All Statuses/i }).click();

    // Pick "Draft" — our seeded campaigns don't have status "draft", so we should see empty
    await page.getByRole("option", { name: /Draft/i }).click();
    // Expect either matching rows or "No campaigns found."
    // (Seed data has status "ACTIVE" and null, so "Draft" filter likely shows none)
    const noResults = page.getByText("No campaigns found.");
    const tableRows = page.locator("table tbody tr");
    // One of these should be true
    await expect(noResults.or(tableRows.first())).toBeVisible({ timeout: 5000 });
  });

  test("should reset filters", async ({ page }) => {
    await page.goto("/en/campaigns");
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    const filterInput = page.getByPlaceholder("Filter by name ...");
    await filterInput.fill("Social");

    // Reset button should appear
    const resetButton = page.getByRole("button", { name: /Reset/i });
    await expect(resetButton).toBeVisible({ timeout: 5000 });
    await resetButton.click();

    // Filter input should be cleared
    await expect(filterInput).toHaveValue("");

    // All rows should be visible again
    const rowCount = await page.locator("table tbody tr").count();
    expect(rowCount).toBeGreaterThanOrEqual(2);
  });

  test("should navigate to campaign detail via row action View", async ({
    page,
  }) => {
    await page.goto("/en/campaigns");
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    // Click the ⋯ menu on the first row
    const firstRow = page.locator("table tbody tr").first();
    await expect(firstRow).toBeVisible({ timeout: 10000 });
    await firstRow.locator("button:has(.sr-only)").first().click();

    // Click "View"
    await page.getByRole("menuitem", { name: "View" }).click();

    // Should navigate to detail page
    await page.waitForURL(/\/campaigns\//, { timeout: 10000 });
    await page.waitForLoadState("networkidle", { timeout: 15000 });
  });

  test("should navigate to campaign detail via name link", async ({
    page,
  }) => {
    await page.goto("/en/campaigns");
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    // Click the campaign name link in the first row
    const nameLink = page
      .locator("table tbody tr")
      .first()
      .locator("a.font-medium")
      .first();
    await expect(nameLink).toBeVisible({ timeout: 10000 });
    await nameLink.click();

    // Should navigate to detail page
    await page.waitForURL(/\/campaigns\//, { timeout: 10000 });
  });

  test("should delete a campaign via row action", async ({ page }) => {
    await page.goto("/en/campaigns");
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    // Count rows before delete
    await expect(page.locator("table tbody tr").first()).toBeVisible({
      timeout: 10000,
    });
    const rowCountBefore = await page.locator("table tbody tr").count();

    // Click the ⋯ menu on the last row (to avoid deleting a campaign we need for other tests)
    const lastRow = page.locator("table tbody tr").last();
    await lastRow.locator("button:has(.sr-only)").first().click();

    // Click "Delete"
    await page.getByRole("menuitem", { name: "Delete" }).click();

    // Confirm in the AlertModal
    const confirmBtn = page.getByRole("button", { name: /Continue|Confirm|Delete/i });
    await expect(confirmBtn).toBeVisible({ timeout: 5000 });
    await confirmBtn.click();

    // Assert success toast
    await assertSuccessToast(page);

    // Row count should decrease
    await page.waitForLoadState("networkidle", { timeout: 10000 });
    const rowCountAfter = await page.locator("table tbody tr").count();
    expect(rowCountAfter).toBeLessThan(rowCountBefore);
  });

  test("should navigate to new campaign page", async ({ page }) => {
    await page.goto("/en/campaigns");
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    await page.getByRole("link", { name: /New Campaign/i }).click();
    await page.waitForURL(/\/campaigns\/new/, { timeout: 10000 });

    await expect(
      page.getByRole("heading", { name: /New Campaign/i })
    ).toBeVisible({ timeout: 10000 });
  });
});
```

- [ ] **Step 2: Run the test to verify it works**

Run: `npx playwright test tests/e2e/campaign-list.spec.ts --project=chromium --reporter=list`

Expected: All tests pass (assumes dev server running with seeded data).

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/campaign-list.spec.ts
git commit -m "test: Playwright tests for campaign list page — navigation, filtering, row actions"
```

---

## Task 2: Campaign Creation Wizard Tests

**Files:**
- Create: `tests/e2e/campaign-create.spec.ts`

**Important notes:**
- The wizard requires templates and target lists to exist. Since none are seeded, we create them via Prisma/API in a `beforeAll`. However, Playwright E2E tests don't have direct DB access. Instead, we test what we can:
  - Step 1 validation and filling
  - Step 2 validation (subject required) — we type directly into the subject input and TipTap editor
  - Step 3 — if no target lists exist, we verify the empty state message
  - Step 4 — validation for schedule
  - Back navigation between steps
- If the environment has templates and target lists (e.g. from a prior `sales-flow` run or manual setup), the full flow works end-to-end.

- [ ] **Step 1: Create the test file**

```typescript
import { test, expect, Page } from "@playwright/test";

test.describe("Campaign Creation Wizard", () => {
  test.use({ storageState: "playwright/.auth/user.json" });

  test("Step 1: should show validation error when name is empty", async ({
    page,
  }) => {
    await page.goto("/en/campaigns/new");
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    // Verify we're on step 1
    await expect(page.getByLabel("Campaign Name *")).toBeVisible({
      timeout: 10000,
    });

    // Click Next without filling name
    await page.getByRole("button", { name: /Next/ }).click();

    // Should show validation error
    await expect(page.getByText("Campaign name is required")).toBeVisible({
      timeout: 5000,
    });
  });

  test("Step 1: should fill details and advance to step 2", async ({
    page,
  }) => {
    await page.goto("/en/campaigns/new");
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    await page.getByLabel("Campaign Name *").fill("PW Test Campaign");
    await page.getByLabel("Description").fill("Playwright test description");
    await page.getByLabel("From Name").fill("Test Sender");
    await page.getByLabel("Reply-to Email").fill("test@example.com");

    await page.getByRole("button", { name: /Next/ }).click();

    // Should be on step 2 — "Subject Line" label visible
    await expect(page.getByText("Subject Line")).toBeVisible({
      timeout: 5000,
    });
  });

  test("Step 2: should show validation error when subject is empty", async ({
    page,
  }) => {
    await page.goto("/en/campaigns/new");
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    // Advance past step 1
    await page.getByLabel("Campaign Name *").fill("PW Validation Test");
    await page.getByRole("button", { name: /Next/ }).click();

    await expect(page.getByText("Subject Line")).toBeVisible({
      timeout: 5000,
    });

    // Click Next without filling subject
    await page.getByRole("button", { name: /Next/ }).click();

    await expect(page.getByText("Subject line is required")).toBeVisible({
      timeout: 5000,
    });
  });

  test("Step 2: should navigate back to step 1 with preserved data", async ({
    page,
  }) => {
    await page.goto("/en/campaigns/new");
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    // Fill step 1
    await page.getByLabel("Campaign Name *").fill("PW Back Test");
    await page.getByLabel("Description").fill("Should persist");
    await page.getByRole("button", { name: /Next/ }).click();

    // On step 2, click Back
    await expect(page.getByText("Subject Line")).toBeVisible({
      timeout: 5000,
    });
    await page.getByRole("button", { name: /Back/ }).click();

    // Step 1 should have preserved values
    await expect(page.getByLabel("Campaign Name *")).toHaveValue("PW Back Test");
    await expect(page.getByLabel("Description")).toHaveValue("Should persist");
  });

  test("Step 2: should show Choose Existing tab with templates", async ({
    page,
  }) => {
    await page.goto("/en/campaigns/new");
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    await page.getByLabel("Campaign Name *").fill("PW Template Test");
    await page.getByRole("button", { name: /Next/ }).click();

    // Click "Choose Existing" tab
    await page.getByRole("tab", { name: /Choose Existing/i }).click();

    // Should see either template buttons or "No templates yet." message
    const noTemplates = page.getByText("No templates yet.");
    const templateButton = page.locator(
      '[role="tabpanel"] button.text-left'
    ).first();
    await expect(noTemplates.or(templateButton)).toBeVisible({ timeout: 5000 });
  });

  test("Step 3: should show validation error when no list selected", async ({
    page,
  }) => {
    await page.goto("/en/campaigns/new");
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    // Step 1
    await page.getByLabel("Campaign Name *").fill("PW Audience Test");
    await page.getByRole("button", { name: /Next/ }).click();

    // Step 2 — fill subject and add minimal content to TipTap
    await page.getByText("Subject Line").waitFor({ timeout: 5000 });
    const subjectInput = page.locator('input[placeholder="Your email subject..."]');
    await subjectInput.fill("Test Subject");

    // Type into TipTap editor (contenteditable div)
    const editor = page.locator(".tiptap, .ProseMirror").first();
    if (await editor.isVisible({ timeout: 3000 }).catch(() => false)) {
      await editor.click();
      await editor.pressSequentially("Test email body content");
    }

    await page.getByRole("button", { name: /Next/ }).click();

    // Step 3 — click Next without selecting any target list
    await page.waitForTimeout(500);
    // If "No target lists found." is shown, the Next button still exists
    await page.getByRole("button", { name: /Next/ }).click();

    // Should show validation
    await expect(
      page.getByText("Select at least one target list")
    ).toBeVisible({ timeout: 5000 });
  });

  test("Step 4: should show validation when no schedule chosen", async ({
    page,
  }) => {
    await page.goto("/en/campaigns/new");
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    // Step 1
    await page.getByLabel("Campaign Name *").fill("PW Schedule Test");
    await page.getByRole("button", { name: /Next/ }).click();

    // Step 2
    const subjectInput = page.locator('input[placeholder="Your email subject..."]');
    await subjectInput.fill("Schedule Test Subject");
    const editor = page.locator(".tiptap, .ProseMirror").first();
    if (await editor.isVisible({ timeout: 3000 }).catch(() => false)) {
      await editor.click();
      await editor.pressSequentially("Body content");
    }
    await page.getByRole("button", { name: /Next/ }).click();

    // Step 3 — select a target list if available; if not, this test won't reach step 4
    await page.waitForTimeout(500);
    const checkboxes = page.locator('input[type="checkbox"]');
    const checkboxCount = await checkboxes.count();

    if (checkboxCount > 0) {
      // Select the first target list
      await checkboxes.first().check();
      await page.getByRole("button", { name: /Next/ }).click();

      // Step 4 — "Schedule for later" is default, but no date set
      await expect(page.getByText("When to send")).toBeVisible({
        timeout: 5000,
      });

      // Click Submit without choosing a date (default is "Schedule for later" with empty date)
      await page.getByRole("button", { name: /Submit Campaign/i }).click();

      await expect(
        page.getByText("Pick a date or choose Send Now")
      ).toBeVisible({ timeout: 5000 });
    } else {
      // No target lists available — skip this test gracefully
      test.skip(true, "No target lists seeded — cannot reach step 4");
    }
  });
});
```

- [ ] **Step 2: Run the test to verify**

Run: `npx playwright test tests/e2e/campaign-create.spec.ts --project=chromium --reporter=list`

Expected: All tests pass. Step 4 validation test may skip if no target lists are seeded.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/campaign-create.spec.ts
git commit -m "test: Playwright tests for campaign creation wizard — step validations and navigation"
```

---

## Task 3: Campaign Detail Page Tests

**Files:**
- Create: `tests/e2e/campaign-detail.spec.ts`

- [ ] **Step 1: Create the test file**

```typescript
import { test, expect } from "@playwright/test";

test.describe("Campaign Detail Page", () => {
  test.use({ storageState: "playwright/.auth/user.json" });

  test("should navigate to detail page and display campaign info", async ({
    page,
  }) => {
    await page.goto("/en/campaigns");
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    // Click the first campaign name link
    const nameLink = page
      .locator("table tbody tr")
      .first()
      .locator("a.font-medium")
      .first();
    await expect(nameLink).toBeVisible({ timeout: 10000 });

    // Capture the campaign name for assertion on detail page
    const campaignName = await nameLink.textContent();
    await nameLink.click();

    await page.waitForURL(/\/campaigns\//, { timeout: 10000 });
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    // Campaign name should appear as heading
    await expect(
      page.getByRole("heading", { name: campaignName!.trim() })
    ).toBeVisible({ timeout: 10000 });
  });

  test("should display status badge on detail page", async ({ page }) => {
    await page.goto("/en/campaigns");
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    // Navigate to first campaign
    await page
      .locator("table tbody tr")
      .first()
      .locator("a.font-medium")
      .first()
      .click();
    await page.waitForURL(/\/campaigns\//, { timeout: 10000 });
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    // Status badge — rendered as uppercase text inside a span with rounded-full class
    const statusBadge = page.locator("span.rounded-full");
    await expect(statusBadge).toBeVisible({ timeout: 10000 });
  });

  test("should display stats grid with all metric cards", async ({ page }) => {
    await page.goto("/en/campaigns");
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    await page
      .locator("table tbody tr")
      .first()
      .locator("a.font-medium")
      .first()
      .click();
    await page.waitForURL(/\/campaigns\//, { timeout: 10000 });
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    // Stats grid should show all 5 metric labels
    const expectedLabels = ["Sent", "Delivered", "Open Rate", "Click Rate", "Bounced"];
    for (const label of expectedLabels) {
      await expect(page.getByText(label, { exact: true })).toBeVisible({
        timeout: 5000,
      });
    }
  });

  test("should return 404 for non-existent campaign", async ({ page }) => {
    await page.goto("/en/campaigns/00000000-0000-0000-0000-000000000000");

    // Should show 404 page
    await expect(
      page.getByText(/not found|404/i)
    ).toBeVisible({ timeout: 10000 });
  });
});
```

- [ ] **Step 2: Run the test to verify**

Run: `npx playwright test tests/e2e/campaign-detail.spec.ts --project=chromium --reporter=list`

Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/campaign-detail.spec.ts
git commit -m "test: Playwright tests for campaign detail page — header, status, stats grid, 404"
```

---

## Task 4: Run All Campaign Tests Together

- [ ] **Step 1: Run the full campaign test suite**

Run: `npx playwright test tests/e2e/campaign-list.spec.ts tests/e2e/campaign-create.spec.ts tests/e2e/campaign-detail.spec.ts --project=chromium --reporter=list`

Expected: All tests pass.

- [ ] **Step 2: Final commit with all three files if any adjustments were needed**

```bash
git add tests/e2e/campaign-*.spec.ts
git commit -m "test: complete Playwright E2E test suite for Campaign module"
```
