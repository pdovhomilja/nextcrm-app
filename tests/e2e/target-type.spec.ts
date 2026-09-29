import { test, expect, Page } from "@playwright/test";
import { Pool } from "pg";

// Unique per run so reruns never collide and cleanup can target exactly the rows
// this spec created. Company name and individual last name share the prefix so a
// single Name-column filter surfaces both rows.
const RUN = Date.now().toString(36);
const PREFIX = `PWTYPE${RUN}`;
const COMPANY_NAME = `${PREFIX} Roofing Co`;
const PERSON_FIRST = "Jane";
const PERSON_LAST = `${PREFIX}Doe`;
const PERSON_TITLE = `${PERSON_FIRST} ${PERSON_LAST}`;

async function assertSuccessToast(page: Page) {
  await expect(
    page.locator('[data-sonner-toast][data-type="success"]').first()
  ).toBeVisible({ timeout: 15000 });
}

async function gotoTargets(page: Page) {
  await page.goto("/en/campaigns/targets");
  await page.waitForLoadState("networkidle", { timeout: 15000 });
  await expect(page.getByRole("button", { name: /\+ New Target/i })).toBeVisible({
    timeout: 10000,
  });
}

async function openNewTargetSheet(page: Page) {
  await page.getByRole("button", { name: /\+ New Target/i }).click();
  await expect(page.getByText("Create new Target")).toBeVisible({ timeout: 5000 });
}

async function openTypeRowMenuView(page: Page, rowText: string) {
  const row = page.locator("table tbody tr", { hasText: rowText });
  await expect(row).toBeVisible({ timeout: 10000 });
  await row.hover();
  await row.locator("button:has(.sr-only)").first().click();
  await page.getByRole("menuitem", { name: "View" }).click();
  await page.waitForURL(/\/campaigns\/targets\/[a-z0-9-]+$/, { timeout: 10000 });
  await page.waitForLoadState("networkidle", { timeout: 15000 });
}

// The detail header title lives in the card title (a div, not a heading).
function detailTitle(page: Page, title: string) {
  return page.locator(".text-2xl.font-semibold", { hasText: title }).first();
}

test.describe.serial("Target type (Individual vs Company)", () => {
  test.use({ storageState: "playwright/.auth/user.json" });

  // Fixture cleanup belongs in a hook, not a finally (a timeout/crash skips finally).
  // Throws on failure so a leaked row is loud rather than silent.
  test.afterAll(async () => {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    try {
      await pool.query(
        `DELETE FROM "crm_Targets" WHERE company LIKE $1 OR last_name LIKE $1`,
        [`${PREFIX}%`]
      );
    } finally {
      await pool.end();
    }
  });

  test("creates a Company target: only company fields, company name required", async ({
    page,
  }) => {
    await gotoTargets(page);
    await openNewTargetSheet(page);

    // Company is the default type; company-only fields show, person-only fields don't.
    await expect(page.getByLabel("Company name *")).toBeVisible();
    await expect(page.getByLabel("Industry")).toBeVisible();
    await expect(page.getByLabel("Employees")).toBeVisible();
    await expect(page.getByLabel("Company website", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Last name")).toHaveCount(0);
    await expect(page.getByLabel("First name")).toHaveCount(0);
    await expect(page.getByLabel("Position")).toHaveCount(0);
    await expect(page.getByLabel("Personal website")).toHaveCount(0);

    // Company name is required: submitting empty is rejected with an inline error.
    await page.getByRole("button", { name: "Create target" }).click();
    await expect(page.getByText("Company name is required")).toBeVisible({
      timeout: 5000,
    });

    await page.getByLabel("Company name *").fill(COMPANY_NAME);
    await page.getByLabel("Industry").fill("Roofing");
    await page.getByRole("button", { name: "Create target" }).click();

    await assertSuccessToast(page);
    await page.waitForLoadState("networkidle", { timeout: 15000 });
  });

  test("creates an Individual target: person fields, last name required", async ({
    page,
  }) => {
    await gotoTargets(page);
    await openNewTargetSheet(page);

    // Switch the type selector (shadcn/radix Select) to Individual.
    await page.getByRole("combobox", { name: "Type" }).click();
    await page.getByRole("option", { name: "Individual" }).click();

    // Person fields appear; company-only fields disappear. Company becomes Employer.
    await expect(page.getByLabel("First name")).toBeVisible();
    await expect(page.getByLabel("Last name")).toBeVisible();
    await expect(page.getByLabel("Position")).toBeVisible();
    await expect(page.getByLabel("Personal website")).toBeVisible();
    await expect(page.getByLabel("Employer")).toBeVisible();
    await expect(page.getByLabel("Industry")).toHaveCount(0);
    await expect(page.getByLabel("Employees")).toHaveCount(0);
    await expect(page.getByLabel("Company website", { exact: true })).toHaveCount(0);

    // Last name is required: submitting empty is rejected with an inline error.
    await page.getByRole("button", { name: "Create target" }).click();
    await expect(page.getByText("Last name is required")).toBeVisible({
      timeout: 5000,
    });

    await page.getByLabel("First name").fill(PERSON_FIRST);
    await page.getByLabel("Last name").fill(PERSON_LAST);
    await page.getByRole("button", { name: "Create target" }).click();

    await assertSuccessToast(page);
    await page.waitForLoadState("networkidle", { timeout: 15000 });
  });

  test("list shows Type badges and the Type filter narrows results", async ({
    page,
  }) => {
    await gotoTargets(page);

    // One search input matches both the company name and the person's name.
    await page.getByPlaceholder("Filter by name or company ...").fill(PREFIX);
    const companyRow = page.locator("table tbody tr", { hasText: COMPANY_NAME });
    const personRow = page.locator("table tbody tr", { hasText: PERSON_TITLE });
    await expect(companyRow).toHaveCount(1, { timeout: 10000 });
    await expect(personRow).toHaveCount(1);

    // Each row carries its own Type badge.
    await expect(companyRow.getByText("Company", { exact: true })).toBeVisible();
    await expect(personRow.getByText("Individual", { exact: true })).toBeVisible();

    // Type filter = Individual: the company row drops out, the person row stays.
    await page.locator('button[aria-haspopup="dialog"]', { hasText: "Type" }).click();
    await page.getByRole("option", { name: "Individual" }).click();
    await page.keyboard.press("Escape");
    await expect(companyRow).toHaveCount(0, { timeout: 10000 });
    await expect(personRow).toHaveCount(1);

    // Pair the deny with an allow: flipping the filter to Company reverses it.
    await page.locator('button[aria-haspopup="dialog"]', { hasText: "Type" }).click();
    await page.getByRole("option", { name: "Individual" }).click(); // deselect
    await page.getByRole("option", { name: "Company" }).click();
    await page.keyboard.press("Escape");
    await expect(personRow).toHaveCount(0, { timeout: 10000 });
    await expect(companyRow).toHaveCount(1);
  });

  test("detail title is the company name for a Company target", async ({ page }) => {
    await gotoTargets(page);
    await page.getByPlaceholder("Filter by name or company ...").fill(COMPANY_NAME);
    await openTypeRowMenuView(page, COMPANY_NAME);

    const title = detailTitle(page, COMPANY_NAME);
    await expect(title).toBeVisible({ timeout: 10000 });
    await expect(title).toContainText("Company");
    // Company detail shows company-only fields, not person-only ones.
    await expect(page.getByText("Industry").first()).toBeVisible();
    await expect(page.getByText("Position")).toHaveCount(0);
  });

  test("detail title is the person's full name for an Individual target", async ({
    page,
  }) => {
    await gotoTargets(page);
    await page.getByPlaceholder("Filter by name or company ...").fill(PERSON_LAST);
    await openTypeRowMenuView(page, PERSON_TITLE);

    const title = detailTitle(page, PERSON_TITLE);
    await expect(title).toBeVisible({ timeout: 10000 });
    await expect(title).toContainText("Individual");
    // Individual detail shows person-only fields, not company-only ones.
    await expect(page.getByText("Position").first()).toBeVisible();
    await expect(page.getByText("Industry")).toHaveCount(0);
  });
});
