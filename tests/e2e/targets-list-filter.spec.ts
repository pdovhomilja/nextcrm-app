import { test, expect, Page } from "@playwright/test";
import { Pool } from "pg";

// Unique per run; Alpha/Beta chosen so neither name is a substring of the other.
const RUN = Date.now().toString(36);
const PREFIX = `PWLF${RUN}`;
const LIST_ACTIVE = `${PREFIX} Alpha`;
const LIST_INACTIVE = `${PREFIX} Beta`;
const T_IN_ACTIVE = `${PREFIX} AlphaMember`; // in the active list → should match
const T_UNLISTED = `${PREFIX} Unlisted`; // in no list → filtered out
const T_IN_INACTIVE = `${PREFIX} BetaMember`; // only in the inactive list → filtered out
const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL || "test@nextcrm.app";

function pool() {
  return new Pool({ connectionString: process.env.DATABASE_URL });
}

// Seed two lists (one active, one inactive) and three company targets, wiring
// the junction rows. created_by = the signed-in user so the rows are in scope.
async function seed() {
  const p = pool();
  try {
    const u = await p.query(
      `SELECT id FROM "Users" WHERE email = $1 LIMIT 1`,
      [TEST_USER_EMAIL]
    );
    if (u.rows.length === 0) throw new Error(`seed: no Users row for ${TEST_USER_EMAIL}`);
    const uid = u.rows[0].id;

    const list = async (name: string, status: boolean) =>
      (
        await p.query(
          `INSERT INTO "crm_TargetLists" (id, name, status, created_by, created_on)
           VALUES (gen_random_uuid(), $1, $2, $3, now()) RETURNING id`,
          [name, status, uid]
        )
      ).rows[0].id as string;

    const target = async (company: string) =>
      (
        await p.query(
          `INSERT INTO "crm_Targets" (id, company, last_name, type, tags, notes, status, created_by, created_on)
           VALUES (gen_random_uuid(), $1, '', 'COMPANY', '{}', '{}', true, $2, now()) RETURNING id`,
          [company, uid]
        )
      ).rows[0].id as string;

    const link = (targetId: string, listId: string) =>
      p.query(
        `INSERT INTO "TargetsToTargetLists" (target_id, target_list_id) VALUES ($1, $2)`,
        [targetId, listId]
      );

    const activeId = await list(LIST_ACTIVE, true);
    const inactiveId = await list(LIST_INACTIVE, false);
    const t1 = await target(T_IN_ACTIVE);
    await target(T_UNLISTED);
    const t3 = await target(T_IN_INACTIVE);
    await link(t1, activeId);
    await link(t3, inactiveId);
  } finally {
    await p.end();
  }
}

async function cleanup() {
  const p = pool();
  try {
    // Deleting targets cascades their junction rows; then remove the lists.
    await p.query(`DELETE FROM "crm_Targets" WHERE company LIKE $1`, [`${PREFIX}%`]);
    await p.query(`DELETE FROM "crm_TargetLists" WHERE name LIKE $1`, [`${PREFIX}%`]);
  } finally {
    await p.end();
  }
}

async function gotoTargets(page: Page) {
  await page.goto("/en/campaigns/targets");
  await page.waitForLoadState("networkidle", { timeout: 15000 });
  await expect(page.getByRole("button", { name: /\+ New Target/i })).toBeVisible({
    timeout: 10000,
  });
}

test.describe.serial("Targets — active-list filter", () => {
  test.use({ storageState: "playwright/.auth/user.json" });

  test.beforeAll(seed);
  test.afterAll(cleanup);

  test("offers only active lists and narrows targets to the chosen list", async ({
    page,
  }) => {
    await gotoTargets(page);

    // Open the "List" faceted filter (a facet button, like Type/Industry).
    await page
      .locator('button[aria-haspopup="dialog"]', { hasText: "List" })
      .click();

    // The active list is offered; the inactive list is NOT (its only member's
    // list is inactive, so it contributes no facet option).
    await expect(page.getByRole("option", { name: LIST_ACTIVE })).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByRole("option", { name: LIST_INACTIVE })).toHaveCount(0);

    // Select the active list and close the popover.
    await page.getByRole("option", { name: LIST_ACTIVE }).click();
    await page.keyboard.press("Escape");

    // Only the active-list member remains; the unlisted target and the
    // inactive-list-only target are filtered out.
    await expect(
      page.locator("table tbody tr", { hasText: T_IN_ACTIVE })
    ).toHaveCount(1, { timeout: 10000 });
    await expect(
      page.locator("table tbody tr", { hasText: T_UNLISTED })
    ).toHaveCount(0);
    await expect(
      page.locator("table tbody tr", { hasText: T_IN_INACTIVE })
    ).toHaveCount(0);
  });
});

// --- Homepage column + faceted filter ------------------------------------
const HP_RUN = Date.now().toString(36);
const HP_PREFIX = `PWHP${HP_RUN}`;
const HP_WITH = `${HP_PREFIX} HasPage`;
const HP_WITHOUT = `${HP_PREFIX} NoPage`;
const HP_SLUG = `pwhp-${HP_RUN}`;
const HP_PREVIEW_URL = `https://previews.radeengineering.com/p/${HP_SLUG}`;

// One company target WITH a published homepage (a non-deleted row carrying a
// current_version_id — the /p/ serving gate) and one WITHOUT any homepage row.
async function seedHomepage() {
  const p = pool();
  try {
    const u = await p.query(
      `SELECT id FROM "Users" WHERE email = $1 LIMIT 1`,
      [TEST_USER_EMAIL]
    );
    if (u.rows.length === 0) throw new Error(`seed: no Users row for ${TEST_USER_EMAIL}`);
    const uid = u.rows[0].id;

    const target = async (company: string) =>
      (
        await p.query(
          `INSERT INTO "crm_Targets" (id, company, last_name, type, tags, notes, status, created_by, created_on)
           VALUES (gen_random_uuid(), $1, '', 'COMPANY', '{}', '{}', true, $2, now()) RETURNING id`,
          [company, uid]
        )
      ).rows[0].id as string;

    const withId = await target(HP_WITH);
    await target(HP_WITHOUT);
    // current_version_id has no FK, so a random uuid marks "a published version".
    await p.query(
      `INSERT INTO "crm_Target_Homepage"
         (id, "targetId", slug, status, preview_url, current_version_id, created_by, created_on)
       VALUES (gen_random_uuid(), $1, $2, 'READY', $3, gen_random_uuid(), $4, now())`,
      [withId, HP_SLUG, HP_PREVIEW_URL, uid]
    );
  } finally {
    await p.end();
  }
}

async function cleanupHomepage() {
  const p = pool();
  try {
    // Deleting the targets cascades their crm_Target_Homepage rows.
    await p.query(`DELETE FROM "crm_Targets" WHERE company LIKE $1`, [`${HP_PREFIX}%`]);
  } finally {
    await p.end();
  }
}

test.describe.serial("Targets — Homepage column + filter", () => {
  test.use({ storageState: "playwright/.auth/user.json" });

  test.beforeAll(seedHomepage);
  test.afterAll(cleanupHomepage);

  test("sits between Triage and Engagement, links to the preview, and filters by presence", async ({
    page,
  }) => {
    await gotoTargets(page);

    // Column order: Homepage is a header, positioned after Triage and before Engagement.
    const headers = await page.locator("table thead th").allInnerTexts();
    const idx = (t: string) => headers.findIndex((h) => h.includes(t));
    expect(idx("Homepage")).toBeGreaterThan(-1);
    expect(idx("Homepage")).toBeGreaterThan(idx("Triage"));
    expect(idx("Homepage")).toBeLessThan(idx("Engagement"));

    // Isolate the two seeded rows by the shared name prefix.
    await page.getByPlaceholder(/Filter by name/).fill(HP_PREFIX);
    const withRow = page.locator("table tbody tr", { hasText: HP_WITH });
    const withoutRow = page.locator("table tbody tr", { hasText: HP_WITHOUT });
    await expect(withRow).toHaveCount(1, { timeout: 10000 });
    await expect(withoutRow).toHaveCount(1);

    // The target with a page shows a "View" link to its /p/<slug> preview (new tab);
    // the one without shows a dash.
    const viewLink = withRow.getByRole("link", { name: /View/i });
    await expect(viewLink).toHaveAttribute("href", HP_PREVIEW_URL);
    await expect(viewLink).toHaveAttribute("target", "_blank");
    await expect(withoutRow.getByRole("link", { name: /View/i })).toHaveCount(0);

    // Clicking the link opens the preview in a NEW tab and does NOT navigate the
    // list row to the detail page (the cell link stops row-click propagation).
    const popup = await Promise.all([
      page.waitForEvent("popup"),
      viewLink.click(),
    ]).then(([p]) => p);
    expect(popup.url()).toContain(`/p/${HP_SLUG}`);
    await popup.close();
    await expect(page).toHaveURL(/\/campaigns\/targets(\?|$)/);

    // Faceted filter: "Has homepage" keeps only the target with a page.
    await page
      .locator('button[aria-haspopup="dialog"]', { hasText: "Homepage" })
      .click();
    await page.getByRole("option", { name: "Has homepage" }).click();
    await page.keyboard.press("Escape");
    await expect(withRow).toHaveCount(1, { timeout: 10000 });
    await expect(withoutRow).toHaveCount(0);

    // Flip to "No homepage" — the pairing reverses.
    await page
      .locator('button[aria-haspopup="dialog"]', { hasText: "Homepage" })
      .click();
    await page.getByRole("option", { name: "Has homepage" }).click(); // deselect
    await page.getByRole("option", { name: "No homepage" }).click();
    await page.keyboard.press("Escape");
    await expect(withRow).toHaveCount(0, { timeout: 10000 });
    await expect(withoutRow).toHaveCount(1);
  });
});
