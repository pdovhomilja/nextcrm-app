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
      page.locator("h2").filter({ hasText: "Targets" })
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
    await page.getByLabel("Company", { exact: true }).fill("PW Test Corp");
    await page.getByLabel("Position").fill("QA Engineer");
    await page.getByLabel("Company website", { exact: true }).fill("https://pw-test-corp.com");
    await page.getByLabel("Personal website").fill("https://pw-target.dev");

    // --- Social ---
    await page.getByLabel("LinkedIn").fill("https://linkedin.com/in/pw-target");
    await page.getByLabel("X (Twitter)").fill("https://x.com/pw-target");
    await page.getByLabel("Instagram").fill("https://instagram.com/pw-target");
    await page.getByLabel("Facebook").fill("https://facebook.com/pw-target");

    // --- Additional Contact ---
    await page.getByLabel("Personal Email", { exact: true }).fill("pw-personal@test.example.com");
    await page.getByLabel("Company Email", { exact: true }).fill("pw-company@test.example.com");
    await page.getByLabel("Company Phone", { exact: true }).fill("+1 800 000 0000");

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
    await page.waitForURL(/\/targets\/[a-z0-9-]+$/, {
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

  test("should display target detail with all fields", async ({ page }) => {
    await page.goto("/en/campaigns/targets");
    await page.waitForLoadState("networkidle", { timeout: 15000 });
    await waitForRows(page);

    // Navigate to the PW-created target detail via View row action
    const firstRow = page.locator("table tbody tr").first();
    await firstRow.hover();
    await firstRow.locator("button:has(.sr-only)").first().click();
    await page.getByRole("menuitem", { name: "View" }).click();
    await page.waitForURL(/\/campaigns\/targets\/[a-z0-9-]+$/, {
      timeout: 10000,
    });
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    // Verify header with target name
    await expect(
      page.getByRole("heading", { name: /PW-Target-First/, level: 2 })
    ).toBeVisible({
      timeout: 10000,
    });

    // Verify company info
    await expect(page.getByText("Company").first()).toBeVisible();
    await expect(page.getByText("PW Test Corp")).toBeVisible();

    // Verify position
    await expect(page.getByText("Position").first()).toBeVisible();

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
      .getByRole("button", { name: "Convert", exact: true })
      .click();

    await assertSuccessToast(page);
  });

});

test.describe.serial("Campaign Target Lists", () => {
  test.use({ storageState: "playwright/.auth/user.json" });

  test("should display target lists page with table", async ({ page }) => {
    await page.goto("/en/campaigns/target-lists");
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    await expect(
      page.locator("h2").filter({ hasText: "Target Lists" })
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

    // Wait for targets to load
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

    // Check if there are any targets in the list
    const noTargets = await page.getByText("No targets in this list yet.").isVisible();
    if (noTargets) {
      test.skip(true, "No targets in list to remove");
      return;
    }

    // Find the Trash2 icon button — it's a ghost icon button in the targets list
    // Use aria or filter by not being the "+ Add Target" button
    const removeButton = page.locator('button[class*="h-7"][class*="w-7"]').first();
    const removeCount = await removeButton.count();
    if (removeCount === 0) {
      test.skip(true, "No remove buttons found");
      return;
    }
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
});
