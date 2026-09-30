import {
  test,
  expect,
  request as pwRequest,
  type APIRequestContext,
} from "@playwright/test";
import { Pool } from "pg";
import { randomUUID } from "node:crypto";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
} from "@aws-sdk/client-s3";

/**
 * Target AI homepage generation — E2E.
 *
 * This spec deliberately does NOT run the generate job: that needs headless
 * chromium (@sparticuz/chromium, Linux-serverless only) and Anthropic vision, and
 * belongs to the Jest suite (`inngest/functions/__tests__/generate-homepage.test.ts`)
 * plus a manual first-deploy check. Instead it seeds the state the job PRODUCES — a
 * READY `crm_Target_Homepage`, two `crm_Target_Homepage_Version` rows and (where a
 * storage endpoint is reachable) the private-R2 objects — and asserts what a user and
 * a prospect actually see: the drawer (preview + version history) and the public
 * `/p/<slug>` route. It never clicks Generate / Refine / Revert, so no Inngest event
 * is sent.
 *
 * Storage-backed assertions need an S3 endpoint (local SeaweedFS `:9000`). CI's `e2e`
 * job has none (see docs/reference/LESSONS_LEARNED.md), so those tests probe in
 * `beforeAll` and skip with a reason; the DB-only + generic-404 assertions always run.
 *
 * Manual counterpart: docs/testing/target-homepage-manual-testing.md
 */

const RUN = Date.now().toString(36);
const PREFIX = `PWHP${RUN}`;
const COMPANY = `${PREFIX} Roofing Co`;
// Valid slug shape (lowercase alnum + single hyphens) and unique per run.
const SLUG = `pwhp${RUN}-roofing`;
const SLUG_NO_OBJECT = `pwhp${RUN}-noobject`;
const SLUG_UNKNOWN = `pwhp${RUN}-unknown`;
const SLUG_UPLOAD = `pwhp${RUN}-upload`;
const V1_MARKER = `${PREFIX} first draft`;
const V2_MARKER = `${PREFIX} refined hero`;
const UPLOAD_MARKER = `${PREFIX} uploaded page`;
const ADMIN_EMAIL = process.env.TEST_USER_EMAIL || "test@nextcrm.app";
const BASE_URL = "http://localhost:3000";

// Smallest valid PNG (1x1 transparent) for the screenshot route.
const PNG_1X1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64"
);

const v1Html = `<!doctype html><html><head><title>v1</title></head><body><h1>${V1_MARKER}</h1></body></html>`;
const v2Html = `<!doctype html><html><head><title>v2</title></head><body><h1>${V2_MARKER}</h1></body></html>`;
const uploadHtml = `<!doctype html><html><head><title>upload</title></head><body><h1>${UPLOAD_MARKER}</h1></body></html>`;

// The three crm_SystemSettings keys the admin Homepage Generation page writes
// (actions/admin/homepage-settings.ts). Snapshotted before and restored after the
// admin round-trip so the spec never leaves the operator's settings changed.
const SETTING_KEYS = [
  "homepage.model",
  "homepage.max_tokens",
  "homepage.base_prompt_id",
];

let pool: Pool;
let s3: S3Client | null = null;
let s3Available = false;
let adminId = "";
const targetId = randomUUID();
const homepageId = randomUUID();
const noObjectHomepageId = randomUUID();
const noObjectTargetId = randomUUID();
const v1Id = randomUUID();
const v2Id = randomUUID();
const noObjectVersionId = randomUUID();
const uploadTargetId = randomUUID();
const uploadHomepageId = randomUUID();
const uploadV1Id = randomUUID();
const uploadV2Id = randomUUID();
let settingsSnapshot: { key: string; value: string }[] = [];
const htmlKey = (slug: string) => `previews/${slug}/index.html`;
const shotKey = (slug: string) => `previews/${slug}/screenshot.png`;

async function probeStorage(): Promise<boolean> {
  if (
    !process.env.MINIO_ENDPOINT ||
    !process.env.MINIO_BUCKET ||
    !process.env.MINIO_ACCESS_KEY ||
    !process.env.MINIO_SECRET_KEY
  ) {
    return false;
  }
  s3 = new S3Client({
    endpoint: process.env.MINIO_ENDPOINT,
    region: "us-east-1",
    credentials: {
      accessKeyId: process.env.MINIO_ACCESS_KEY,
      secretAccessKey: process.env.MINIO_SECRET_KEY,
    },
    forcePathStyle: true,
    maxAttempts: 1,
    requestHandler: { requestTimeout: 3000, connectionTimeout: 3000 } as never,
  });
  try {
    await s3.send(new HeadBucketCommand({ Bucket: process.env.MINIO_BUCKET }));
    return true;
  } catch {
    // ECONNREFUSED (CI: no S3 service) / auth / missing bucket -> storage tests skip.
    return false;
  }
}

async function putObject(key: string, body: string | Buffer, type: string) {
  await s3!.send(
    new PutObjectCommand({
      Bucket: process.env.MINIO_BUCKET!,
      Key: key,
      Body: body,
      ContentType: type,
    })
  );
}

async function seed() {
  const admin = await pool.query(`SELECT id FROM "Users" WHERE email = $1`, [
    ADMIN_EMAIL,
  ]);
  expect(admin.rows.length, "seeded admin user (prisma db seed)").toBe(1);
  adminId = admin.rows[0].id;

  // Two APPROVED targets: one with a full READY homepage (+ objects), one whose READY
  // row has NO stored object (the served route must 404 generically, never 500).
  await pool.query(
    `INSERT INTO "crm_Targets" (id, first_name, last_name, company, email, position, industry, type, triage_status, created_by)
     VALUES ($1, 'Jane', $2, $3, $4, 'Owner', 'Roofing', 'COMPANY', 'APPROVED', $5),
            ($6, 'Joe', $7, $8, $9, 'Owner', 'Roofing', 'COMPANY', 'APPROVED', $5)`,
    [
      targetId,
      `${PREFIX}Doe`,
      COMPANY,
      `${PREFIX.toLowerCase()}@example.com`,
      adminId,
      noObjectTargetId,
      `${PREFIX}NoObj`,
      `${COMPANY} NoObject`,
      `noobj-${PREFIX.toLowerCase()}@example.com`,
    ]
  );

  // preview_url / screenshot_url left NULL on purpose: the app then falls back to the
  // relative /p/<slug> on the CRM host (what runs when NEXT_PUBLIC_PREVIEWS_BASE_URL
  // is unset), so the spec needs no previews domain.
  await pool.query(
    `INSERT INTO "crm_Target_Homepage" (id, "targetId", slug, status, base_prompt, current_version_id, created_by)
     VALUES ($1, $2, $3, 'READY', 'seeded', NULL, $4),
            ($5, $6, $7, 'READY', 'seeded', NULL, $4)`,
    [
      homepageId,
      targetId,
      SLUG,
      adminId,
      noObjectHomepageId,
      noObjectTargetId,
      SLUG_NO_OBJECT,
    ]
  );
  await pool.query(
    `INSERT INTO "crm_Target_Homepage_Version" (id, homepage_id, html, prompt, agent_critique, pass_kind, created_by, created_at)
     VALUES ($1, $3, $4, 'first', 'Tighten the hero copy', 'AUTO', $6, now() - interval '1 hour'),
            ($2, $3, $5, 'refine', NULL, 'HUMAN', $6, now())`,
    [v1Id, v2Id, homepageId, v1Html, v2Html, adminId]
  );
  await pool.query(
    `UPDATE "crm_Target_Homepage" SET current_version_id = $1 WHERE id = $2`,
    [v2Id, homepageId]
  );
  // The served route gates on a published version (current_version_id), so this row needs
  // one to actually reach the storage lookup and exercise the missing-object 404 path.
  await pool.query(
    `INSERT INTO "crm_Target_Homepage_Version" (id, homepage_id, html, prompt, agent_critique, pass_kind, created_by)
     VALUES ($1, $2, '<html>no object</html>', 'first', NULL, 'AUTO', $3)`,
    [noObjectVersionId, noObjectHomepageId, adminId]
  );
  await pool.query(
    `UPDATE "crm_Target_Homepage" SET current_version_id = $1 WHERE id = $2`,
    [noObjectVersionId, noObjectHomepageId]
  );

  // A third APPROVED target whose CURRENT version is an UPLOAD (the "upload your own
  // HTML" override result): an older AUTO version underneath, the UPLOAD on top. This is
  // the state the upload-override job PRODUCES; the spec never clicks Upload (that would
  // need the Inngest job + chromium to render the screenshot).
  await pool.query(
    `INSERT INTO "crm_Targets" (id, first_name, last_name, company, email, position, industry, type, triage_status, created_by)
     VALUES ($1, 'Uma', $2, $3, $4, 'Owner', 'Roofing', 'COMPANY', 'APPROVED', $5)`,
    [
      uploadTargetId,
      `${PREFIX}Upl`,
      `${COMPANY} Upload`,
      `upl-${PREFIX.toLowerCase()}@example.com`,
      adminId,
    ]
  );
  await pool.query(
    `INSERT INTO "crm_Target_Homepage" (id, "targetId", slug, status, base_prompt, current_version_id, created_by)
     VALUES ($1, $2, $3, 'READY', 'seeded', NULL, $4)`,
    [uploadHomepageId, uploadTargetId, SLUG_UPLOAD, adminId]
  );
  await pool.query(
    `INSERT INTO "crm_Target_Homepage_Version" (id, homepage_id, html, prompt, agent_critique, pass_kind, created_by, created_at)
     VALUES ($1, $3, $4, 'first', NULL, 'AUTO', $6, now() - interval '1 hour'),
            ($2, $3, $5, 'upload', NULL, 'UPLOAD', $6, now())`,
    [uploadV1Id, uploadV2Id, uploadHomepageId, v1Html, uploadHtml, adminId]
  );
  await pool.query(
    `UPDATE "crm_Target_Homepage" SET current_version_id = $1 WHERE id = $2`,
    [uploadV2Id, uploadHomepageId]
  );

  if (s3Available) {
    await putObject(htmlKey(SLUG), v2Html, "text/html; charset=utf-8");
    await putObject(shotKey(SLUG), PNG_1X1, "image/png");
    await putObject(htmlKey(SLUG_UPLOAD), uploadHtml, "text/html; charset=utf-8");
    await putObject(shotKey(SLUG_UPLOAD), PNG_1X1, "image/png");
  }
}

// Homepage + versions cascade with the target (ON DELETE CASCADE). Audit-log rows are
// append-only and intentionally left. External state (R2 objects) is torn down too.
async function cleanup() {
  await pool.query(`DELETE FROM "crm_Targets" WHERE id = ANY($1::uuid[])`, [
    [targetId, noObjectTargetId, uploadTargetId],
  ]);
  if (s3Available && s3) {
    for (const key of [
      htmlKey(SLUG),
      shotKey(SLUG),
      htmlKey(SLUG_UPLOAD),
      shotKey(SLUG_UPLOAD),
    ]) {
      await s3
        .send(
          new DeleteObjectCommand({
            Bucket: process.env.MINIO_BUCKET!,
            Key: key,
          })
        )
        .catch(() => {});
    }
  }
}

// Put crm_SystemSettings back exactly as found: drop the keys the admin test wrote, then
// re-insert whatever existed before (none on a fresh DB -> leaves the keys absent).
async function restoreSettings() {
  await pool.query(`DELETE FROM "crm_SystemSettings" WHERE key = ANY($1::text[])`, [
    SETTING_KEYS,
  ]);
  for (const row of settingsSnapshot) {
    await pool.query(
      `INSERT INTO "crm_SystemSettings" (key, value, "updatedAt") VALUES ($1, $2, now())`,
      [row.key, row.value]
    );
  }
}

// Public route: no session. Explicit empty storageState (a `request` fixture can
// silently inherit the shared session — see e2e-patterns.md).
async function publicContext(): Promise<APIRequestContext> {
  return pwRequest.newContext({
    baseURL: BASE_URL,
    storageState: { cookies: [], origins: [] },
  });
}

test.describe.configure({ mode: "serial" });
test.beforeEach(({}, testInfo) => {
  test.skip(
    testInfo.project.name !== "chromium",
    "homepage E2E runs on the chromium project only"
  );
});

test.describe("Target AI homepage generation", () => {
  test.use({ storageState: "playwright/.auth/user.json" });

  test.beforeAll(async ({}, testInfo) => {
    if (testInfo.project.name !== "chromium") return;
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    s3Available = await probeStorage();
    await seed();
  });

  test.afterAll(async () => {
    if (!pool) return;
    try {
      await cleanup();
    } finally {
      await pool.end();
    }
  });

  test("opens the drawer from the AI menu and shows the seeded page's versions", async ({
    page,
  }) => {
    // Fixture precondition: guard the premise so a broken seed reads as "fixture
    // absent", not as a UI regression.
    const pre = await pool.query(
      `SELECT count(*)::int AS n FROM "crm_Target_Homepage_Version" WHERE homepage_id = $1`,
      [homepageId]
    );
    expect(pre.rows[0].n).toBe(2);

    await page.goto(`/en/campaigns/targets/${targetId}`);
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    await page.getByTestId("target-ai-menu").click();
    const item = page.getByTestId("ai-generate-homepage");
    await expect(item).toBeVisible();
    await expect(item).not.toHaveAttribute("aria-disabled", "true");
    await item.click();

    const drawer = page.getByTestId("generate-homepage-drawer");
    await expect(drawer).toBeVisible();

    // A published page's slug is locked (renaming would 404 an already-shared link).
    await expect(page.getByTestId("homepage-slug")).toHaveValue(SLUG, {
      timeout: 20000,
    });
    await expect(page.getByTestId("homepage-slug")).toBeDisabled();
    await expect(page.getByTestId("homepage-generate-btn")).toHaveText(
      "Regenerate"
    );

    // Version history (oldest = v1). The newest is Current and cannot be reverted to;
    // the older one can. Assert the element, not its container.
    const v1 = page.getByTestId("homepage-version-1");
    const v2 = page.getByTestId("homepage-version-2");
    await expect(v1).toBeVisible({ timeout: 20000 });
    await expect(v2).toBeVisible();
    await expect(v1).toContainText("AUTO");
    await expect(v1).toContainText("Tighten the hero copy");
    await expect(v2).toContainText("HUMAN");
    await expect(v2).toContainText("Current");
    await expect(v1).not.toContainText("Current");
    await expect(page.getByTestId("homepage-revert-2")).toBeDisabled();
    await expect(page.getByTestId("homepage-revert-1")).toBeEnabled();

    // Refine is available for a page with a current version (not clicked: no job).
    await expect(page.getByTestId("homepage-refine-input")).toBeVisible();
    await expect(page.getByTestId("homepage-refine-btn")).toBeDisabled(); // empty text

    // Preview iframe points at the public serving route, cache-busted by the
    // CURRENT version id, and is sandboxed WITHOUT allow-same-origin.
    const preview = page.getByTestId("homepage-preview");
    await expect(preview).toHaveAttribute("src", `/p/${SLUG}?v=${v2Id}`);
    await expect(preview).toHaveAttribute("sandbox", "allow-scripts");
  });

  test("the drawer preview renders the stored HTML", async ({ page }) => {
    test.skip(
      !s3Available,
      "no reachable S3/R2 endpoint (CI e2e job has none) — storage-backed serving verified locally"
    );

    await page.goto(`/en/campaigns/targets/${targetId}`);
    await page.waitForLoadState("networkidle", { timeout: 15000 });
    await page.getByTestId("target-ai-menu").click();
    await page.getByTestId("ai-generate-homepage").click();
    await expect(page.getByTestId("generate-homepage-drawer")).toBeVisible();

    // Wait for the authoritative snapshot (the ?v=<currentVersionId> cache key), then
    // assert the CURRENT version's html is what the iframe shows (not v1's).
    await expect(page.getByTestId("homepage-preview")).toHaveAttribute(
      "src",
      `/p/${SLUG}?v=${v2Id}`,
      { timeout: 20000 }
    );
    const frame = page.frameLocator('[data-testid="homepage-preview"]');
    await expect(frame.getByText(V2_MARKER)).toBeVisible({ timeout: 15000 });
    await expect(frame.getByText(V1_MARKER)).toHaveCount(0);

    // The screenshot <img> really loaded (a broken image has naturalWidth 0).
    await expect
      .poll(
        () =>
          page
            .getByTestId("homepage-screenshot")
            .evaluate((el) => (el as HTMLImageElement).naturalWidth),
        { timeout: 15000 }
      )
      .toBeGreaterThan(0);
  });

  test("GET /p/<slug> publicly serves the stored HTML with the sandbox CSP", async () => {
    test.skip(
      !s3Available,
      "no reachable S3/R2 endpoint (CI e2e job has none) — storage-backed serving verified locally"
    );

    const ctx = await publicContext();
    try {
      const res = await ctx.get(`/p/${SLUG}`);
      expect(res.status()).toBe(200);
      expect(res.headers()["content-type"]).toContain("text/html");
      // Model-generated HTML: opaque origin, never indexed.
      expect(res.headers()["content-security-policy"]).toBe(
        "sandbox allow-scripts"
      );
      expect(res.headers()["x-robots-tag"]).toBe("noindex");
      const body = await res.text();
      expect(body).toContain(V2_MARKER);
      expect(body).not.toContain(V1_MARKER);

      const shot = await ctx.get(`/p/${SLUG}/screenshot.png`);
      expect(shot.status()).toBe(200);
      expect(shot.headers()["content-type"]).toContain("image/png");
      expect((await shot.body()).length).toBeGreaterThan(0);
    } finally {
      await ctx.dispose();
    }
  });

  test("unknown slug and a READY row with no stored object both 404 generically", async () => {
    // Runs everywhere: with no S3 (CI) a storage error must also degrade to the same
    // generic 404, never a 500.
    const ctx = await publicContext();
    try {
      for (const slug of [SLUG_UNKNOWN, SLUG_NO_OBJECT]) {
        const res = await ctx.get(`/p/${slug}`);
        expect(res.status(), `/p/${slug}`).toBe(404);
        expect(res.headers()["x-robots-tag"]).toBe("noindex");
        expect(res.headers()["cache-control"]).toBe("no-store");
        expect(await res.text()).toContain("This preview is not available.");
      }
      // A malformed slug is rejected before any DB/R2 access.
      const bad = await ctx.get(`/p/${encodeURIComponent("Bad Slug!")}`);
      expect(bad.status()).toBe(404);
    } finally {
      await ctx.dispose();
    }
  });

  test("a page whose current version is an UPLOAD hides Refine but keeps Regenerate/Revert/Upload", async ({
    page,
  }) => {
    // Fixture precondition: the UPLOAD is really the current version.
    const pre = await pool.query(
      `SELECT v.pass_kind FROM "crm_Target_Homepage" h
         JOIN "crm_Target_Homepage_Version" v ON v.id = h.current_version_id
        WHERE h.id = $1`,
      [uploadHomepageId]
    );
    expect(pre.rows[0].pass_kind).toBe("UPLOAD");

    await page.goto(`/en/campaigns/targets/${uploadTargetId}`);
    await page.waitForLoadState("networkidle", { timeout: 15000 });
    await page.getByTestId("target-ai-menu").click();
    await page.getByTestId("ai-generate-homepage").click();
    await expect(page.getByTestId("generate-homepage-drawer")).toBeVisible();

    // Wait for the authoritative snapshot (versions list + ?v=<current id>): the
    // "uploaded" hint and canRefine both key off current_pass_kind from that fetch, so
    // asserting absence of Refine BEFORE it lands would pass vacuously.
    const v1 = page.getByTestId("homepage-version-1");
    const v2 = page.getByTestId("homepage-version-2");
    await expect(v2).toBeVisible({ timeout: 20000 });
    await expect(page.getByTestId("homepage-preview")).toHaveAttribute(
      "src",
      `/p/${SLUG_UPLOAD}?v=${uploadV2Id}`
    );
    await expect(v2).toContainText("UPLOAD");
    await expect(v2).toContainText("Current");
    await expect(v1).toContainText("AUTO");

    // Refine is gated off for an upload (no model lineage); the hint explains why.
    await expect(page.getByTestId("homepage-upload-refine-hint")).toContainText(
      "regenerate to use AI refine"
    );
    await expect(page.getByTestId("homepage-refine-input")).toHaveCount(0);
    await expect(page.getByTestId("homepage-refine-btn")).toHaveCount(0);

    // Regenerate, Upload and Revert (to the older generated version) stay available.
    // None is clicked: each would queue an Inngest job.
    await expect(page.getByTestId("homepage-generate-btn")).toHaveText(
      "Regenerate"
    );
    await expect(page.getByTestId("homepage-generate-btn")).toBeEnabled();
    await expect(page.getByTestId("homepage-upload-btn")).toBeEnabled();
    await expect(page.getByTestId("homepage-upload-input")).toBeEnabled();
    await expect(page.getByTestId("homepage-revert-2")).toBeDisabled(); // current
    await expect(page.getByTestId("homepage-revert-1")).toBeEnabled();
  });

  test("GET /p/<slug> serves an uploaded version's HTML with the sandbox CSP", async () => {
    test.skip(
      !s3Available,
      "no reachable S3/R2 endpoint (CI e2e job has none) — storage-backed serving verified locally"
    );

    const ctx = await publicContext();
    try {
      const res = await ctx.get(`/p/${SLUG_UPLOAD}`);
      expect(res.status()).toBe(200);
      // An upload is served exactly like a generated page: same opaque-origin sandbox.
      expect(res.headers()["content-security-policy"]).toBe(
        "sandbox allow-scripts"
      );
      expect(res.headers()["x-robots-tag"]).toBe("noindex");
      const body = await res.text();
      expect(body).toContain(UPLOAD_MARKER);
      expect(body).not.toContain(V1_MARKER);
    } finally {
      await ctx.dispose();
    }
  });
});

// Admin configuration page. The shared storageState user is a seeded admin
// (prisma/seeds/seed.ts: role "admin"), so the round-trip needs no extra seeding. The
// non-admin deny path needs a second, non-admin session and is a Known Gap (covered
// by Jest: actions/admin/__tests__/homepage-settings.test.ts).
test.describe("Admin homepage generation settings", () => {
  test.use({ storageState: "playwright/.auth/user.json" });

  test.beforeAll(async ({}, testInfo) => {
    if (testInfo.project.name !== "chromium") return;
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const snap = await pool.query(
      `SELECT key, value FROM "crm_SystemSettings" WHERE key = ANY($1::text[])`,
      [SETTING_KEYS]
    );
    settingsSnapshot = snap.rows;
  });

  test.afterAll(async () => {
    if (!pool) return;
    try {
      await restoreSettings();
    } finally {
      await pool.end();
    }
  });

  test("saves model + max tokens (clamped to the model ceiling) and they persist across reload", async ({
    page,
  }) => {
    await page.goto("/en/admin/homepage-settings");
    await page.waitForLoadState("networkidle", { timeout: 15000 });
    await expect(
      page.getByRole("heading", { name: "Homepage Generation" })
    ).toBeVisible();

    // Haiku's ceiling is 32000, so 99999 must be clamped DOWN on save. The fill +
    // select + save is retried as a unit and judged by the DB outcome, not the field
    // value (controlled inputs can discard a pre-hydration fill — e2e-patterns.md).
    await expect(async () => {
      await page.locator("#homepage-model").click();
      await page.getByRole("option", { name: "Haiku 4.5" }).click();
      await page.locator("#homepage-max-tokens").fill("99999");
      await page.getByRole("button", { name: "Save" }).click();
      const rows = await pool.query(
        `SELECT key, value FROM "crm_SystemSettings" WHERE key = ANY($1::text[])`,
        [SETTING_KEYS.slice(0, 2)]
      );
      const saved = Object.fromEntries(rows.rows.map((r) => [r.key, r.value]));
      expect(saved["homepage.model"]).toBe("claude-haiku-4-5-20251001");
      expect(saved["homepage.max_tokens"]).toBe("32000");
    }).toPass({ timeout: 20000 });

    // Reload: the page re-reads the saved (clamped) values from the DB.
    await page.reload();
    await page.waitForLoadState("networkidle", { timeout: 15000 });
    await expect(page.locator("#homepage-model")).toContainText("Haiku 4.5");
    await expect(page.locator("#homepage-max-tokens")).toHaveValue("32000");
  });
});
