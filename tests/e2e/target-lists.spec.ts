import { test, expect, Page } from "@playwright/test";
import { Pool } from "pg";

// Unique per run so reruns never collide and cleanup targets exactly these rows.
const RUN = Date.now().toString(36);
const LIST_NAME = `PWTL${RUN} Prospects`;
const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL || "test@nextcrm.app";

function pool() {
  return new Pool({ connectionString: process.env.DATABASE_URL });
}

// created_by must be the signed-in user's Users.id: targetListReadScopeWhere
// scopes non-admins to their own rows, and the "Created by" column reads this
// relation's name. Returns the creator's name for the column assertion.
async function seedList(): Promise<{ creatorName: string | null }> {
  const p = pool();
  try {
    const u = await p.query(
      `SELECT id, name FROM "Users" WHERE email = $1 LIMIT 1`,
      [TEST_USER_EMAIL]
    );
    if (u.rows.length === 0) throw new Error(`seed: no Users row for ${TEST_USER_EMAIL}`);
    await p.query(
      `INSERT INTO "crm_TargetLists" (id, name, status, created_by, created_on)
       VALUES (gen_random_uuid(), $1, true, $2, now())`,
      [LIST_NAME, u.rows[0].id]
    );
    return { creatorName: u.rows[0].name ?? null };
  } finally {
    await p.end();
  }
}

async function cleanup() {
  const p = pool();
  try {
    await p.query(`DELETE FROM "crm_TargetLists" WHERE name LIKE $1`, [`PWTL${RUN}%`]);
  } finally {
    await p.end();
  }
}

async function gotoLists(page: Page) {
  await page.goto("/en/campaigns/target-lists");
  await page.waitForLoadState("networkidle", { timeout: 15000 });
}

function listRow(page: Page) {
  return page.locator("table tbody tr", { hasText: LIST_NAME });
}

test.describe.serial("Target Lists page", () => {
  test.use({ storageState: "playwright/.auth/user.json" });

  let creatorName: string | null = null;

  test.beforeAll(async () => {
    ({ creatorName } = await seedList());
  });

  // Cleanup in a hook (a finally is skipped on timeout/crash); throws if it fails.
  test.afterAll(async () => {
    await cleanup();
  });

  test("shows the Created by column with the creator's name", async ({ page }) => {
    await gotoLists(page);
    await expect(page.getByText("Created by", { exact: true }).first()).toBeVisible({
      timeout: 10000,
    });
    const row = listRow(page);
    await expect(row).toBeVisible({ timeout: 10000 });
    // The cell shows the creator's name, or an em-dash when the user has none.
    await expect(row).toContainText(creatorName && creatorName.length > 0 ? creatorName : "—");
  });

  test("clicking a row navigates to the list detail", async ({ page }) => {
    await gotoLists(page);
    const row = listRow(page);
    await expect(row).toBeVisible({ timeout: 10000 });
    // Click the Name cell (not the actions cell, which stops propagation).
    await row.getByText(LIST_NAME).click();
    await page.waitForURL(/\/target-lists\/[a-z0-9-]+$/, { timeout: 10000 });
    await page.waitForLoadState("networkidle", { timeout: 15000 });
    await expect(page.getByText(LIST_NAME).first()).toBeVisible({ timeout: 10000 });
  });

  test("Deactivate then Activate toggles the list status", async ({ page }) => {
    await gotoLists(page);
    await expect(listRow(page)).toContainText("Active", { timeout: 10000 });

    // Open the row actions menu (the dots button carries an sr-only label).
    await listRow(page).locator("button:has(.sr-only)").first().click();
    await page.getByRole("menuitem", { name: "Deactivate" }).click();
    await expect(
      page.locator('[data-sonner-toast][data-type="success"]').first()
    ).toBeVisible({ timeout: 15000 });
    await page.waitForLoadState("networkidle", { timeout: 15000 });
    await expect(listRow(page)).toContainText("Inactive", { timeout: 10000 });

    // Re-activate (leaves the fixture Active for idempotent reruns).
    await listRow(page).locator("button:has(.sr-only)").first().click();
    await page.getByRole("menuitem", { name: "Activate" }).click();
    await expect(
      page.locator('[data-sonner-toast][data-type="success"]').first()
    ).toBeVisible({ timeout: 15000 });
    await page.waitForLoadState("networkidle", { timeout: 15000 });
    await expect(listRow(page)).toContainText("Active", { timeout: 10000 });
  });
});
