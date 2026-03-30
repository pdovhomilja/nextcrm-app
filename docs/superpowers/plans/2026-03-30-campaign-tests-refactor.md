# Campaign Tests Refactor — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the seed-campaigns API endpoint and rewrite campaign E2E tests to create data through UI forms.

**Architecture:** Delete the test seed route. Rewrite `campaign-list.spec.ts` and `campaign-detail.spec.ts` to create campaigns via the 4-step wizard UI. Each file is self-contained with its own target list and campaign creation. `campaign-create.spec.ts` unchanged.

**Tech Stack:** Playwright, TypeScript, shadcn/ui selectors

**Spec:** `docs/superpowers/specs/2026-03-30-campaign-tests-refactor-design.md`

---

## File Map

- **Delete:** `app/api/test/seed-campaigns/route.ts`
- **Modify:** `tests/e2e/campaign-list.spec.ts` — remove seed, add UI-based creation
- **Modify:** `tests/e2e/campaign-detail.spec.ts` — add UI-based creation

---

### Task 1: Delete the seed-campaigns API endpoint

**Files:**
- Delete: `app/api/test/seed-campaigns/route.ts`

- [ ] **Step 1: Delete the file**

```bash
rm app/api/test/seed-campaigns/route.ts
rmdir app/api/test/seed-campaigns
```

If `app/api/test/` is now empty, remove it too:

```bash
rmdir app/api/test 2>/dev/null || true
```

- [ ] **Step 2: Verify no other files reference seed-campaigns**

```bash
grep -r "seed-campaigns" tests/ app/ --include="*.ts" --include="*.tsx"
```

Expected: Only `campaign-list.spec.ts` references it (will be fixed in Task 2).

- [ ] **Step 3: Commit**

```bash
git add -A app/api/test/
git commit -m "chore: remove seed-campaigns test API endpoint"
```

---

### Task 2: Rewrite campaign-list.spec.ts with UI-based data creation

**Files:**
- Modify: `tests/e2e/campaign-list.spec.ts`

- [ ] **Step 1: Replace the entire file with this content**

```ts
import { test, expect, Page } from "@playwright/test";

async function assertSuccessToast(page: Page) {
  await expect(
    page.locator('[data-sonner-toast][data-type="success"]').first()
  ).toBeVisible({ timeout: 15000 });
}

async function waitForRows(page: Page) {
  await expect(async () => {
    const empty = await page.getByText("No campaigns found.").isVisible();
    expect(empty).toBe(false);
  }).toPass({ timeout: 10000 });
}

test.describe.serial("Campaign List", () => {
  test.use({ storageState: "playwright/.auth/user.json" });

  test("should create a target list for campaign tests", async ({ page }) => {
    await page.goto("/en/campaigns/target-lists");
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    // Open create modal
    await page.getByRole("button", { name: /\+ New List/i }).click();
    await expect(page.getByText("Create Target List")).toBeVisible({
      timeout: 5000,
    });

    await page.getByLabel("Name *").fill("PW-CL-Target-List");
    await page
      .getByLabel("Description")
      .fill("Target list for campaign list tests");

    await page.getByRole("button", { name: "Create" }).click();
    await assertSuccessToast(page);
  });

  test("should create a campaign via the wizard", async ({ page }) => {
    await page.goto("/en/campaigns/new");
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    // Step 1: Details
    await page.getByLabel("Campaign Name *").fill("PW-Campaign-List");
    await page.getByLabel("Description").fill("Playwright list test campaign");
    await page.getByLabel("From Name").fill("PW Test Sender");
    await page.getByLabel("Reply-to Email").fill("pw-test@example.com");
    await page.getByRole("button", { name: /Next →/ }).click();

    // Step 2: Template — fill subject and body
    await page.getByText("Subject Line").waitFor({ timeout: 5000 });
    const subjectInput = page.locator(
      'input[placeholder="Your email subject..."]'
    );
    await subjectInput.fill("PW List Test Subject");

    const editor = page.locator(".tiptap, .ProseMirror").first();
    if (await editor.isVisible({ timeout: 3000 }).catch(() => false)) {
      await editor.click();
      await editor.pressSequentially("Playwright test email body content");
    }

    await page.getByRole("button", { name: /Next →/ }).click();

    // Step 3: Audience — select the target list
    await page.waitForTimeout(500);
    const checkboxes = page.locator('input[type="checkbox"]');
    const checkboxCount = await checkboxes.count();
    expect(checkboxCount).toBeGreaterThan(0);
    await checkboxes.first().check();
    await page.getByRole("button", { name: /Next →/ }).click();

    // Step 4: Schedule — choose "Send now" and submit
    await expect(page.getByText("When to send")).toBeVisible({
      timeout: 5000,
    });
    await page.getByText("Send now").click();
    await page.getByRole("button", { name: /Submit Campaign/i }).click();

    // Should redirect to campaign list
    await page.waitForURL(/\/campaigns$/, { timeout: 15000 });
    await page.waitForLoadState("networkidle", { timeout: 15000 });
  });

  test("should display campaigns list page with table", async ({ page }) => {
    await page.goto("/en/campaigns");
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    await expect(
      page.getByRole("heading", { name: /Campaigns/i })
    ).toBeVisible({ timeout: 10000 });

    await expect(
      page.getByRole("link", { name: /New Campaign/i })
    ).toBeVisible();

    await expect(page.getByText("All Campaigns")).toBeVisible();

    await expect(page.locator("table")).toBeVisible({ timeout: 10000 });
  });

  test("should filter campaigns by name", async ({ page }) => {
    await page.goto("/en/campaigns");
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    const filterInput = page.getByPlaceholder("Filter by name ...");
    await expect(filterInput).toBeVisible({ timeout: 10000 });

    // Type something that matches nothing
    await filterInput.fill("zzz_no_match_zzz");
    await expect(page.getByText("No campaigns found.")).toBeVisible({
      timeout: 5000,
    });

    // Clear the filter
    await filterInput.fill("");
  });

  test("should filter campaigns by status dropdown", async ({ page }) => {
    await page.goto("/en/campaigns");
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    // Open the Shadcn Select trigger for status
    await page
      .locator('[role="combobox"]')
      .filter({ hasText: /All Statuses/i })
      .click();

    // Pick "Draft"
    await page
      .locator('[role="option"]')
      .filter({ hasText: /^Draft$/i })
      .click();

    // Confirm result — either empty state or rows present
    await page.waitForFunction(
      () => {
        const cells = Array.from(document.querySelectorAll("table tbody td"));
        const hasEmpty = cells.some((c) =>
          c.textContent?.includes("No campaigns found.")
        );
        const rows = document.querySelectorAll("table tbody tr");
        return hasEmpty || rows.length > 0;
      },
      { timeout: 5000 }
    );
  });

  test("should reset filters", async ({ page }) => {
    await page.goto("/en/campaigns");
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    const filterInput = page.getByPlaceholder("Filter by name ...");
    await filterInput.fill("zzz");

    const resetButton = page.getByRole("button", { name: /Reset/i });
    await expect(resetButton).toBeVisible({ timeout: 5000 });
    await resetButton.click();

    await expect(filterInput).toHaveValue("");
  });

  test("should navigate to campaign detail via row action View", async ({
    page,
  }) => {
    await page.goto("/en/campaigns");
    await page.waitForLoadState("networkidle", { timeout: 15000 });
    await waitForRows(page);

    const firstRow = page.locator("table tbody tr").first();
    await firstRow.hover();
    await firstRow.locator("button:has(.sr-only)").first().click();

    await page.getByRole("menuitem", { name: "View" }).click();
    await page.waitForURL(/\/campaigns\/[a-z0-9-]+$/, { timeout: 10000 });
    await page.waitForLoadState("networkidle", { timeout: 15000 });
  });

  test("should navigate to campaign detail via name link", async ({
    page,
  }) => {
    await page.goto("/en/campaigns");
    await page.waitForLoadState("networkidle", { timeout: 15000 });
    await waitForRows(page);

    const firstRow = page.locator("table tbody tr").first();
    const nameLink = firstRow.locator("a").first();
    await expect(nameLink).toBeVisible({ timeout: 5000 });
    await nameLink.click();

    await page.waitForURL(/\/campaigns\/[a-z0-9-]+$/, { timeout: 10000 });
  });

  test("should delete a campaign via row action", async ({ page }) => {
    await page.goto("/en/campaigns");
    await page.waitForLoadState("networkidle", { timeout: 15000 });
    await waitForRows(page);

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

- [ ] **Step 2: Run the tests**

Run: `npx playwright test tests/e2e/campaign-list.spec.ts --project=chromium --timeout 60000`
Expected: 10 tests pass

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/campaign-list.spec.ts
git commit -m "test: rewrite campaign list tests to use UI-based data creation"
```

---

### Task 3: Rewrite campaign-detail.spec.ts with UI-based data creation

**Files:**
- Modify: `tests/e2e/campaign-detail.spec.ts`

- [ ] **Step 1: Replace the entire file with this content**

```ts
import { test, expect, Page } from "@playwright/test";

async function assertSuccessToast(page: Page) {
  await expect(
    page.locator('[data-sonner-toast][data-type="success"]').first()
  ).toBeVisible({ timeout: 15000 });
}

test.describe.serial("Campaign Detail Page", () => {
  test.use({ storageState: "playwright/.auth/user.json" });

  test("should create a target list for detail tests", async ({ page }) => {
    await page.goto("/en/campaigns/target-lists");
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    await page.getByRole("button", { name: /\+ New List/i }).click();
    await expect(page.getByText("Create Target List")).toBeVisible({
      timeout: 5000,
    });

    await page.getByLabel("Name *").fill("PW-CD-Target-List");
    await page
      .getByLabel("Description")
      .fill("Target list for campaign detail tests");

    await page.getByRole("button", { name: "Create" }).click();
    await assertSuccessToast(page);
  });

  test("should create a campaign for detail tests", async ({ page }) => {
    await page.goto("/en/campaigns/new");
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    // Step 1: Details
    await page.getByLabel("Campaign Name *").fill("PW-Campaign-Detail");
    await page
      .getByLabel("Description")
      .fill("Playwright detail test campaign");
    await page.getByLabel("From Name").fill("PW Detail Sender");
    await page.getByLabel("Reply-to Email").fill("pw-detail@example.com");
    await page.getByRole("button", { name: /Next →/ }).click();

    // Step 2: Template
    await page.getByText("Subject Line").waitFor({ timeout: 5000 });
    const subjectInput = page.locator(
      'input[placeholder="Your email subject..."]'
    );
    await subjectInput.fill("PW Detail Test Subject");

    const editor = page.locator(".tiptap, .ProseMirror").first();
    if (await editor.isVisible({ timeout: 3000 }).catch(() => false)) {
      await editor.click();
      await editor.pressSequentially("Detail test email body");
    }

    await page.getByRole("button", { name: /Next →/ }).click();

    // Step 3: Audience
    await page.waitForTimeout(500);
    const checkboxes = page.locator('input[type="checkbox"]');
    const checkboxCount = await checkboxes.count();
    expect(checkboxCount).toBeGreaterThan(0);
    await checkboxes.first().check();
    await page.getByRole("button", { name: /Next →/ }).click();

    // Step 4: Schedule — send now
    await expect(page.getByText("When to send")).toBeVisible({
      timeout: 5000,
    });
    await page.getByText("Send now").click();
    await page.getByRole("button", { name: /Submit Campaign/i }).click();

    // Should redirect to campaign list
    await page.waitForURL(/\/campaigns$/, { timeout: 15000 });
    await page.waitForLoadState("networkidle", { timeout: 15000 });
  });

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
    const statsGrid = page.locator("div.grid");
    const expectedLabels = [
      "Sent",
      "Delivered",
      "Open Rate",
      "Click Rate",
      "Bounced",
    ];
    for (const label of expectedLabels) {
      await expect(
        statsGrid.getByText(label, { exact: true }).first()
      ).toBeVisible({
        timeout: 5000,
      });
    }
  });

  test("should return 404 for non-existent campaign", async ({ page }) => {
    await page.goto("/en/campaigns/00000000-0000-0000-0000-000000000000");

    // Should show 404 page
    await expect(page.getByText(/not found|404/i)).toBeVisible({
      timeout: 10000,
    });
  });
});
```

- [ ] **Step 2: Run the tests**

Run: `npx playwright test tests/e2e/campaign-detail.spec.ts --project=chromium --timeout 60000`
Expected: 6 tests pass

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/campaign-detail.spec.ts
git commit -m "test: rewrite campaign detail tests to use UI-based data creation"
```

---

### Task 4: Final verification — run full campaign E2E suite

**Files:** None (verification only)

- [ ] **Step 1: Run all campaign test files**

Run: `npx playwright test tests/e2e/campaign-*.spec.ts --project=chromium --timeout 60000`
Expected: All tests pass (campaign-list + campaign-create + campaign-detail + campaign-targets)

- [ ] **Step 2: Verify seed-campaigns route is deleted**

```bash
test ! -f app/api/test/seed-campaigns/route.ts && echo "DELETED" || echo "STILL EXISTS"
```

Expected: `DELETED`

- [ ] **Step 3: Commit if any adjustments were needed**

```bash
git add tests/e2e/campaign-list.spec.ts tests/e2e/campaign-detail.spec.ts
git commit -m "test: finalize campaign tests refactor"
```
