import { test, expect, Page } from "@playwright/test";
import { Pool } from "pg";
import { randomUUID } from "node:crypto";
import http from "node:http";

/**
 * Target AI outreach (email) — E2E.
 *
 * Generation (Anthropic) and sending (Resend) happen SERVER-side inside server
 * actions, so `page.route` cannot intercept them. `playwright.config.ts` points
 * `ANTHROPIC_BASE_URL` / `RESEND_BASE_URL` at the local mock server this spec
 * starts (`E2E_MOCK_PORT`, default 4010): deterministic, free, and no real email can
 * leave. The mock records every request so the spec can assert what the app SENT
 * (prompt + prospect facts to the model; resolved subject/recipient/unsubscribe
 * header to Resend), not just that the UI rendered what it was handed.
 *
 * Manual counterpart: docs/testing/target-ai-outreach-manual-testing.md
 */

const RUN = Date.now().toString(36);
const PREFIX = `PWAI${RUN}`;
const COMPANY = `${PREFIX} Roofing Co`;
const TARGET_EMAIL = `${PREFIX.toLowerCase()}@example.com`;
const TEMPLATE_NAME = `${PREFIX} Template`;
const PROMPT_NAME = `${PREFIX} Warm intro`;
const PROMPT_BODY = `${PREFIX}: warm, concise, mention their outdated website.`;
// CTA defaults live on the template; the drawer inherits them and can override.
const CTA_LABEL = `${PREFIX} See your redesign`;
const CTA_URL = `https://rade.example/${RUN}`;
const CTA_LABEL_OVERRIDE = `${PREFIX} Book a call`;
// Appended to the AI draft in the editor to prove the operator's edits are sent.
const EDIT_MARKER = `${PREFIX}-EDITED`;
const MOCK_PORT = Number(process.env.E2E_MOCK_PORT ?? "4010");
const ADMIN_EMAIL = process.env.TEST_USER_EMAIL || "test@nextcrm.app";

// ---------------------------------------------------------------------------
// Mock Anthropic + Resend (server-side network dependencies of the app).
// ---------------------------------------------------------------------------
type Captured = { url: string; headers: http.IncomingHttpHeaders; body: any };
const anthropicCalls: Captured[] = [];
const resendCalls: Captured[] = [];
let mockServer: http.Server | null = null;

function startMockServer(): Promise<void> {
  mockServer = http.createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      let body: any = null;
      try {
        body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      } catch {
        /* non-JSON body */
      }
      const cap: Captured = { url: req.url ?? "", headers: req.headers, body };
      res.setHeader("content-type", "application/json");
      if (req.method === "POST" && req.url?.startsWith("/v1/messages")) {
        anthropicCalls.push(cap);
        // Deliberately fenced + preambled: real Claude output does this, and the
        // generator must tolerate it (see LESSONS_LEARNED).
        const text =
          "Here is the email:\n```json\n" +
          JSON.stringify({
            subject: "Quick idea for {{company}}",
            html: "<p>Hi {{first_name}}, here is our pitch for {{company}}.</p>",
          }) +
          "\n```";
        res.end(JSON.stringify({ content: [{ type: "text", text }] }));
        return;
      }
      if (req.method === "POST" && req.url?.startsWith("/emails")) {
        resendCalls.push(cap);
        res.end(JSON.stringify({ id: `msg_e2e_${resendCalls.length}` }));
        return;
      }
      res.statusCode = 404;
      res.end(JSON.stringify({ error: "not mocked" }));
    });
  });
  return new Promise((resolve, reject) => {
    mockServer!.once("error", reject);
    mockServer!.listen(MOCK_PORT, "127.0.0.1", () => resolve());
  });
}

function stopMockServer(): Promise<void> {
  return new Promise((resolve) => {
    if (!mockServer) return resolve();
    mockServer.close(() => resolve());
    mockServer = null;
  });
}

// ---------------------------------------------------------------------------
// Fixtures (raw pg — Playwright's CDP-wrapped fetch is not involved; see e2e-patterns).
// ---------------------------------------------------------------------------
let pool: Pool;
const approvedTargetId = randomUUID();
const newTargetId = randomUUID();
let templateId = "";
let adminId = "";

async function seed() {
  const admin = await pool.query(`SELECT id FROM "Users" WHERE email = $1`, [
    ADMIN_EMAIL,
  ]);
  expect(admin.rows.length, "seeded admin user (prisma db seed)").toBe(1);
  adminId = admin.rows[0].id;

  templateId = randomUUID();
  await pool.query(
    `INSERT INTO "crm_campaign_templates" (id, name, subject_default, content_html, content_json, cta_label, cta_url, created_by)
     VALUES ($1, $2, 'x', $3, '{}'::jsonb, $4, $5, $6)`,
    [
      templateId,
      TEMPLATE_NAME,
      `<div><h2>${PREFIX} template header</h2>{{body}}</div>`,
      CTA_LABEL,
      CTA_URL,
      adminId,
    ]
  );

  await pool.query(
    `INSERT INTO "crm_Ai_Prompt" (id, name, body, kind, scope, user_id, created_by)
     VALUES ($1, $2, $3, 'EMAIL', 'ORG', NULL, $4)`,
    [randomUUID(), PROMPT_NAME, PROMPT_BODY, adminId]
  );

  await pool.query(
    `INSERT INTO "crm_Targets" (id, first_name, last_name, company, email, position, industry, type, triage_status, created_by)
     VALUES ($1, 'Jane', $2, $3, $4, 'Owner', 'Roofing', 'COMPANY', 'APPROVED', $5)`,
    [approvedTargetId, `${PREFIX}Doe`, COMPANY, TARGET_EMAIL, adminId]
  );
  await pool.query(
    `INSERT INTO "crm_Targets" (id, last_name, company, email, type, triage_status, created_by)
     VALUES ($1, $2, $3, $4, 'COMPANY', 'NEW', $5)`,
    [newTargetId, `${PREFIX}New`, `${COMPANY} New`, `new-${TARGET_EMAIL}`, adminId]
  );
}

// Delete children first (activity links/rows are not FK-cascaded from the target);
// crm_Target_Email rows cascade with the target. Audit-log rows are append-only
// (immutable) and intentionally left.
async function cleanup() {
  await pool.query(
    `DELETE FROM "crm_Activities" WHERE id IN (
       SELECT "activityId" FROM "crm_ActivityLinks" WHERE "entityId" = ANY($1::uuid[]))`,
    [[approvedTargetId, newTargetId]]
  );
  await pool.query(`DELETE FROM "crm_Targets" WHERE id = ANY($1::uuid[])`, [
    [approvedTargetId, newTargetId],
  ]);
  await pool.query(`DELETE FROM "crm_Ai_Prompt" WHERE name LIKE $1`, [
    `${PREFIX}%`,
  ]);
  if (templateId) {
    await pool.query(`DELETE FROM "crm_campaign_templates" WHERE id = $1`, [
      templateId,
    ]);
  }
}

async function assertSuccessToast(page: Page, text?: string | RegExp) {
  const toast = page.locator('[data-sonner-toast][data-type="success"]', {
    hasText: text,
  });
  await expect(toast.first()).toBeVisible({ timeout: 15000 });
}

// ---------------------------------------------------------------------------

// One worker per file (serial): the mock server owns a fixed port, and the library
// test's cleanup must not race the outreach test's fixtures. Chromium only (what CI
// runs): parallel browser projects would fight over the mock port.
test.describe.configure({ mode: "serial" });
test.beforeEach(({}, testInfo) => {
  test.skip(
    testInfo.project.name !== "chromium",
    "mock-server E2E runs on the chromium project only"
  );
});

test.describe("Target AI outreach — email", () => {
  test.use({ storageState: "playwright/.auth/user.json" });

  test.beforeAll(async ({}, testInfo) => {
    if (testInfo.project.name !== "chromium") return; // see beforeEach skip above
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    await startMockServer();
    await seed();
  });

  // Fixture cleanup belongs in a hook, not a finally (a timeout/crash skips finally).
  test.afterAll(async () => {
    if (!pool) return; // non-chromium project: nothing was started
    try {
      await cleanup();
    } finally {
      await pool.end();
      await stopMockServer();
    }
  });

  test("generates, previews and sends an outreach email from an approved target", async ({
    page,
  }) => {
    await page.goto(`/en/campaigns/targets/${approvedTargetId}`);
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    await page.getByTestId("target-ai-menu").click();
    await page.getByTestId("ai-generate-email").click();
    const drawer = page.getByTestId("generate-email-drawer");
    await expect(drawer).toBeVisible();

    // Pick the library prompt -> its body is loaded into the guidance box.
    await page.getByTestId("email-prompt-select").click();
    await page.getByRole("option", { name: PROMPT_NAME }).click();
    // (generous timeout: the first server-action call compiles on demand in dev)
    await expect(page.getByTestId("email-prompt-text")).toHaveValue(PROMPT_BODY, {
      timeout: 20000,
    });

    // Pick our template explicitly (other specs may leave newer templates around).
    await page.getByTestId("email-template-select").click();
    await page.getByRole("option", { name: TEMPLATE_NAME }).click();

    // CTA is inherited from the picked template...
    await expect(page.getByTestId("email-cta-label")).toHaveValue(CTA_LABEL);
    await expect(page.getByTestId("email-cta-url")).toHaveValue(CTA_URL);
    // ...and overridable per-target.
    await page.getByTestId("email-cta-label").fill(CTA_LABEL_OVERRIDE);

    await page.getByTestId("email-generate-btn").click();

    // Fenced/preambled model output is tolerated and the subject is populated.
    await expect(page.getByTestId("email-subject")).toHaveValue(
      "Quick idea for {{company}}",
      { timeout: 20000 }
    );

    // The app really called the (mock) model with our prompt + the prospect's facts.
    // If this is 0 the dev server did not pick up ANTHROPIC_BASE_URL (stale server
    // reused?) -> fail here, BEFORE the send click, so nothing real can be sent.
    expect(anthropicCalls, "Anthropic mock was hit").toHaveLength(1);
    const userMsg = anthropicCalls[0].body.messages[0].content as string;
    expect(userMsg).toContain(PROMPT_BODY);
    expect(userMsg).toContain(`Company: ${COMPANY}`);

    // Preview = template with {{body}} replaced and merge tags RESOLVED.
    const preview = page.frameLocator('[data-testid="email-preview"]');
    await expect(preview.getByText(`${PREFIX} template header`)).toBeVisible({
      timeout: 15000,
    });
    await expect(
      preview.getByText(`Hi Jane, here is our pitch for ${COMPANY}.`)
    ).toBeVisible();
    await expect(preview.getByText("{{company}}")).toHaveCount(0);
    // The overridden CTA button renders in the branded preview.
    await expect(preview.getByText(CTA_LABEL_OVERRIDE)).toBeVisible();

    // Edit the AI draft in the body editor (select-all + replace, keeping merge
    // tags) — this invalidates the preview until re-rendered, like a subject edit.
    const bodyEditor = page.locator('[data-testid="email-body-editor"] .ProseMirror');
    await bodyEditor.click();
    await page.keyboard.press("ControlOrMeta+a");
    await page.keyboard.type(`Hi {{first_name}}, ${EDIT_MARKER} for {{company}}.`);
    await expect(page.getByTestId("email-send-btn")).toBeDisabled();

    // Preview-drift guard: editing the subject invalidates the preview (Send off)
    // until it is re-rendered with "Update preview". Net subject is unchanged.
    const subjectInput = page.getByTestId("email-subject");
    await subjectInput.fill("Quick idea for {{company}}!");
    await expect(page.getByTestId("email-send-btn")).toBeDisabled();
    await subjectInput.fill("Quick idea for {{company}}");
    await expect(page.getByTestId("email-send-btn")).toBeDisabled();
    await page.getByTestId("email-preview-btn").click();
    await expect(page.getByTestId("email-send-btn")).toBeEnabled({
      timeout: 15000,
    });
    await expect(preview.getByText(`${PREFIX} template header`)).toBeVisible();
    // The operator's body edit shows in the re-rendered preview.
    await expect(preview.getByText(new RegExp(EDIT_MARKER))).toBeVisible();

    await page.getByTestId("email-send-btn").click();
    await assertSuccessToast(page, "Email sent");

    // Exactly one send reached (mock) Resend, with resolved subject + recipient.
    expect(resendCalls, "Resend mock was hit once").toHaveLength(1);
    const sent = resendCalls[0].body;
    expect(sent.subject).toBe(`Quick idea for ${COMPANY}`);
    const expectedTo = process.env.EMAIL_REDIRECT_TO || TARGET_EMAIL;
    expect([sent.to].flat()).toEqual([expectedTo]);
    // Reply-To = the sending operator's email (not the noreply From).
    expect(sent.reply_to).toBe(ADMIN_EMAIL);
    // The operator's edited body (merge tags resolved) reached the sent email —
    // NOT the original AI draft.
    expect(sent.html).toContain(`Hi Jane, ${EDIT_MARKER} for ${COMPANY}.`);
    expect(sent.html).not.toContain("here is our pitch");
    // The sent email carries the overridden CTA label + inherited link.
    expect(sent.html).toContain(CTA_LABEL_OVERRIDE);
    expect(sent.html).toContain(CTA_URL);
    expect(sent.html).toContain("/api/crm/targets/unsubscribe?token=");
    expect(String(sent.headers?.["List-Unsubscribe"])).toContain(
      "/api/crm/targets/unsubscribe?token="
    );

    // Persistence: the outreach row is SENT with the Resend id, and the activity
    // timeline entry was written (poll — bookkeeping follows the send).
    await expect(async () => {
      const r = await pool.query(
        `SELECT status, subject, resend_message_id, prompt_used
           FROM "crm_Target_Email" WHERE "targetId" = $1`,
        [approvedTargetId]
      );
      expect(r.rows).toHaveLength(1);
      expect(r.rows[0].status).toBe("SENT");
      expect(r.rows[0].subject).toBe(`Quick idea for ${COMPANY}`);
      expect(r.rows[0].resend_message_id).toBe("msg_e2e_1");
      expect(r.rows[0].prompt_used).toBe(PROMPT_BODY);

      const a = await pool.query(
        `SELECT a.id FROM "crm_Activities" a
           JOIN "crm_ActivityLinks" l ON l."activityId" = a.id
          WHERE l."entityId" = $1 AND a.type = 'email'`,
        [approvedTargetId]
      );
      expect(a.rows.length).toBeGreaterThan(0);
    }).toPass({ timeout: 10000 });

    // The send now shows in the target's outreach history (with a SENT status).
    await page.goto(`/en/campaigns/targets/${approvedTargetId}`);
    await page.waitForLoadState("networkidle", { timeout: 15000 });
    const history = page.getByTestId("target-email-history");
    await expect(history).toBeVisible({ timeout: 10000 });
    await expect(history.getByText(`Quick idea for ${COMPANY}`)).toBeVisible();
    await expect(history.getByText("SENT")).toBeVisible();

    // Engagement display: mark the sent row opened+clicked (as the Resend webhook
    // would), reload, and assert the badges surface in the history.
    await pool.query(
      `UPDATE "crm_Target_Email" SET opened_at = now(), clicked_at = now() WHERE "targetId" = $1`,
      [approvedTargetId]
    );
    await page.goto(`/en/campaigns/targets/${approvedTargetId}`);
    await page.waitForLoadState("networkidle", { timeout: 15000 });
    await expect(history.getByText("Opened")).toBeVisible({ timeout: 10000 });
    await expect(history.getByText("Clicked")).toBeVisible();

    // Unsubscribe visibility: flag the target do-not-email, reload, assert the badge.
    await pool.query(
      `UPDATE "crm_Targets" SET do_not_email = true WHERE id = $1`,
      [approvedTargetId]
    );
    await page.goto(`/en/campaigns/targets/${approvedTargetId}`);
    await page.waitForLoadState("networkidle", { timeout: 15000 });
    await expect(page.getByTestId("do-not-email-badge")).toBeVisible({ timeout: 10000 });
  });

  test("blocks AI email generation for a non-approved target", async ({
    page,
  }) => {
    await page.goto(`/en/campaigns/targets/${newTargetId}`);
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    await page.getByTestId("target-ai-menu").click();
    const item = page.getByTestId("ai-generate-email");
    await expect(item).toBeVisible();
    await expect(item).toHaveAttribute("aria-disabled", "true");
    await expect(item).toContainText("approve first");
  });
});

test.describe("AI prompt library", () => {
  test.use({ storageState: "playwright/.auth/user.json" });

  // Distinct prefix from the outreach fixtures so this cleanup can never delete them.
  const LIB_PREFIX = `PWLIB${RUN}`;
  const NAME = `${LIB_PREFIX} Library prompt`;
  const NAME_EDITED = `${NAME} (edited)`;

  test.afterAll(async () => {
    const p = new Pool({ connectionString: process.env.DATABASE_URL });
    try {
      await p.query(`DELETE FROM "crm_Ai_Prompt" WHERE name LIKE $1`, [
        `${LIB_PREFIX}%`,
      ]);
    } finally {
      await p.end();
    }
  });

  test("creates, edits and deletes a prompt", async ({ page }) => {
    await page.goto("/en/campaigns/prompts");
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    // Create (defaults: Email / Personal)
    await page.getByTestId("prompt-new").click();
    await expect(page.getByTestId("prompt-dialog")).toBeVisible();
    await page.getByTestId("prompt-name").fill(NAME);
    await page.getByTestId("prompt-body").fill("Be brief and specific.");
    await page.getByTestId("prompt-save").click();
    await assertSuccessToast(page, "Prompt created");
    const row = page.locator("tbody tr", { hasText: NAME });
    await expect(row).toBeVisible({ timeout: 10000 });
    await expect(row).toContainText("EMAIL");

    // Edit
    await row.getByRole("button", { name: "Edit" }).click();
    await page.getByTestId("prompt-name").fill(NAME_EDITED);
    await page.getByTestId("prompt-save").click();
    await assertSuccessToast(page, "Prompt updated");
    const edited = page.locator("tbody tr", { hasText: NAME_EDITED });
    await expect(edited).toBeVisible({ timeout: 10000 });

    // Delete (soft delete -> gone from the list)
    await edited.getByRole("button", { name: "Delete" }).click();
    await assertSuccessToast(page, "Prompt deleted");
    await expect(page.locator("tbody tr", { hasText: NAME_EDITED })).toHaveCount(
      0,
      { timeout: 10000 }
    );
  });
});
