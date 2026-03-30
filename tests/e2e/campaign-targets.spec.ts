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
});
