# Target AI Homepage Generation — Manual Browser Testing Guide

Covers end-user browser testing for AI-generated prospect homepages from an **approved**
target: generate → preview → refine → revert, and the public `/p/<slug>` link. Run against
your **local** environment first, then the QA (Vercel Preview) deploy.

## Prerequisites

```bash
# Terminal 1 — local Postgres + Inngest dev server
pnpm inngest:up

# Terminal 2 — dev server
pnpm dev
```

- **Migration:** `20260930120000_homepage_versions` applied (`pnpm db:migrate`).
- **Seed / target:** `pnpm db:seed`; approve a target (see the target-triage doc). Give it a
  `company_website` if you want the source-site harvest to run (blank is fine: generation
  proceeds without a source screenshot).
- **An Anthropic key:** `ANTHROPIC_API_KEY` in env, or a system/personal key under Profile →
  LLMs. A manual run calls the real API and costs tokens.
- **Chromium:** the `@sparticuz/chromium` binary is Linux/serverless-only, so generation
  lands `FAILED` on macOS unless you set `CHROMIUM_EXECUTABLE_PATH` to a local Chrome
  (local-dev seam; see `ENVIRONMENT_VARIABLES.md`, *Not app config*). Sections 1 and 2 (seeded state) work
  anywhere; the serverless launch itself (sections 3–5) is verified on the **first Vercel preview
  (QA) deploy** (see `docs/reference/LESSONS_LEARNED.md`, chromium version skew). The
  Playwright/Chromium pair must share a major: `playwright-core` **1.59.1** (Chromium 147) with
  `@sparticuz/chromium` **147.x** — a skew makes every render die at launch
  (`page.screenshot: Target page … has been closed`).
- **Storage:** local SeaweedFS on `:9000` (`pnpm inngest:up` / `docker-compose.dev.yml`) or
  R2 on hosted; previews live under the private `previews/` prefix.
- **Optional:** `NEXT_PUBLIC_PREVIEWS_BASE_URL` (e.g. `https://previews.radeengineering.com`).
  Unset = the drawer and links use the relative `/p/<slug>` on the CRM host.
- **URLs:** http://localhost:3000/en/campaigns/targets · http://localhost:3000/p/<slug>

> The E2E spec does **not** launch chromium or call Anthropic: it seeds a READY page and
> versions directly (including an `UPLOAD`-current page), so sections 1, 2, the admin
> settings round-trip (§6) and the refine-gate/serve of an uploaded page (§7) are automated.
> Sections 3–5 and the live parts of §6/§7 exercise the real job and are manual-only.

---

## 1. Open the drawer on a page that already exists

**E2E:** `tests/e2e/target-homepage.spec.ts` › `opens the drawer from the AI menu and shows the seeded page's versions`

1. Open an **Approved** target that already has a generated (READY) homepage.
2. Click the **AI** menu (sparkles) → **Generate homepage**.
3. **Verify:** the "Generate homepage" drawer opens.
4. **Verify:** the **Preview URL slug** field shows the page's slug and is **disabled**
   (a published page's slug is locked so an emailed link can never 404), and the main
   button reads **Regenerate**.
5. **Verify:** a **Versions** list shows v1 (oldest) … vN (newest). The newest carries a
   **Current** badge and its **Revert** button is disabled; older versions have **Revert**
   enabled. Automatic passes show `AUTO` with the agent's critique; human refinements `HUMAN`.
6. **Verify:** a **Change request** box and **Refine** button are shown (Refine disabled
   until you type something).
7. **Verify:** the preview frame points at `/p/<slug>` (the URL carries `?v=<current version>`
   so a refine/revert is visible immediately).

### 1a. Only approved targets can generate

1. Open a target that is still **New** (or Passed) → **AI** menu.
2. **Verify:** **Generate homepage (approve first)** is greyed out and cannot be clicked.
   *(Same gate as email; covered for email by `target-ai-email.spec.ts`, and for the
   trigger route by `actions/crm/homepage/__tests__/`.)*

## 2. The preview and the public link

**E2E:** `tests/e2e/target-homepage.spec.ts` › `the drawer preview renders the stored HTML`,
`GET /p/<slug> publicly serves the stored HTML with the sandbox CSP`,
`unknown slug and a READY row with no stored object both 404 generically`
*(the first two need a reachable S3/R2 endpoint — local SeaweedFS — and skip in CI)*

1. In the drawer, **Verify:** the preview frame shows the **current** version's page and a
   **screenshot** thumbnail loads beneath it.
2. Click **Open in new tab**, or open `http://localhost:3000/p/<slug>` in a **private window**
   (no CRM session).
3. **Verify:** the page renders without signing in. In DevTools → Network, the document
   response has `Content-Security-Policy: sandbox allow-scripts` and `X-Robots-Tag: noindex`.
4. Open `/p/<slug>/screenshot.png`. **Verify:** the PNG loads.
5. Open `/p/does-not-exist` and `/p/Bad%20Slug!`. **Verify:** the same generic "Page not
   found / This preview is not available." page (HTTP 404) for both — nothing reveals whether
   a slug exists.

## 3. Generate a new homepage (manual-only — needs chromium; verify on QA)

1. Open an **Approved** target with **no** homepage → **AI** → **Generate homepage**.
2. **Verify:** the slug is pre-filled from the company name (editable); pick a **HOMEPAGE**
   prompt (its body fills the guidance box) or type guidance.
3. Click **Generate**. **Verify:** status goes Queued → Generating…; the drawer polls.
4. **Verify:** on completion the preview + screenshot appear, and the Versions list holds the
   automatic passes (`AUTO`). If it lands **FAILED**, the error text is shown.
   **Note (transient failures retry):** a transient error (render crash, provider 5xx/timeout)
   no longer fails the run on the first stumble — Inngest retries and resumes from the last
   completed pass, so the status can stay **Generating…** across the retry/backoff window
   before it either recovers or lands **FAILED** (don't read a longer RUNNING as hung). A
   *terminal* error (no API key, deleted target, uploaded-page guard) still fails immediately.
5. **Verify (blank website):** a target with no `company_website` still generates.
   **Verify (blocked URL):** a target whose website is `http://localhost` / a private IP still
   generates (source harvest is skipped, never fetched).
6. **Verify (logo fidelity, F3):** for a target whose site has a logo, the generated **screenshot**
   shows the logo (not just the served page) — the logo is harvested and inlined, so it renders even
   though the render step blocks all network egress.
7. **Verify (in-flight guard, M3):** while a generation is Generating…, re-clicking Generate (or
   Refine/Revert) is rejected with "already in progress" — no duplicate run is queued.
8. **Verify (published-slug lock, H2):** once a page is published, changing the slug and regenerating
   keeps the original slug (the live `/p/<slug>` link is never orphaned).
9. **Verify (email gate refresh, M5):** after a generation completes, open **Generate email** — the
   "include homepage" option is enabled without a manual page reload.
10. **Verify (previews host isolation):** with `NEXT_PUBLIC_PREVIEWS_BASE_URL` set, `/p/<slug>` serves
    only on the previews host; the same path on the CRM host returns 404.
11. **Verify (premium output):** the generated page follows the configured base prompt and model (§6):
    Google Fonts load, and GSAP + ScrollTrigger (the single pinned cdnjs path) run — scroll the served
    `/p/<slug>` and confirm the staggered reveals, parallax and hover micro-interactions work.
12. **Verify (screenshot shows the FINAL state):** the stored screenshot shows the page after its
    animations have settled — scroll-reveal sections that start at `opacity:0` are **visible**, not left
    hidden or half-faded. (The render step drives GSAP/ScrollTrigger to completion, then forces any
    remaining hidden reveal targets visible.)

## 4. Refine

1. Type a change request (e.g. "make the hero darker") → **Refine**.
2. **Verify:** a new `HUMAN` version is added and becomes **Current**; the preview updates.
3. **Verify (failure keeps the live page):** if the refine job fails, the previous version stays
   Current and the public `/p/<slug>` keeps serving it.
4. **Verify (refine needs a page first):** on a target with no generated page yet, Refine is refused
   with "Generate the homepage first".

## 5. Revert

1. Click **Revert** on an older version.
2. **Verify:** that version becomes **Current**, the preview and screenshot are re-rendered from
   its HTML (screenshots are not stored per version), and the public link now serves it.

## 6. Admin configuration (admin only)

**E2E:** `tests/e2e/target-homepage.spec.ts` › `Admin homepage generation settings` › `saves model + max tokens (clamped to the model ceiling) and they persist across reload`
*(steps 1–3 for an admin; needs no S3 so it also runs in CI; restores the original settings afterwards)*

1. As an admin open **Admin → Homepage Generation** (`/admin/homepage-settings`). As a non-admin the
   page is refused (the `/admin` layout redirects) and the save action returns an error.
2. Pick a **model**, set **max tokens**, and pick a **base prompt** (or "Built-in default"); **Save**.
3. **Verify:** reopening the page shows the saved values. An out-of-range max tokens is clamped
   server-side to `[4000, model ceiling]` (default is 16000). The default premium `HOMEPAGE_BASE`
   prompt is listed and editable in **Campaigns → Prompts** by admins only (non-admins get Forbidden).
   *(E2E: choose Haiku 4.5, enter 99999 → saved value is the 32000 ceiling and survives a reload.)*
4. **Verify (applies to the next run):** the next Generate/Refine uses the saved model/tokens/base
   prompt (no env vars involved — settings live in the DB). The code-owned output contract is always
   appended, so an edited base cannot break the JSON/egress/logo handling.
5. **Verify (base prompt is admin-only):** sign in as a **non-admin** user → **Campaigns → Prompts**:
   the `HOMEPAGE_BASE` kind is not offered, and creating, editing or deleting a `HOMEPAGE_BASE` prompt
   is refused ("Forbidden"). As an admin the same actions succeed. Non-admins also cannot open
   `/admin/homepage-settings` (redirected away).

## 7. Upload your own HTML

**E2E:** `tests/e2e/target-homepage.spec.ts` › `a page whose current version is an UPLOAD hides Refine but keeps Regenerate/Revert/Upload`,
`GET /p/<slug> serves an uploaded version's HTML with the sandbox CSP`
*(seeds an `UPLOAD` current version; the second needs reachable S3/R2 and skips in CI. The upload
action itself, the job, and the screenshot render are manual-only — see Known gaps.)*

1. In the drawer click **Upload HTML** and choose a self-contained `.html` file (under ~3.5 MB).
2. **Verify:** the job runs, an **UPLOAD** version is added and becomes **Current**, and `/p/<slug>`
   serves the uploaded page (same sandbox/noindex headers). The screenshot is rendered with the same
   allowlisted egress, so assets from non-allowlisted hosts won't appear in the screenshot only.
3. **Verify (refine disabled):** while an UPLOAD is current, **Refine** is disabled with an explanatory
   hint (and the server refuses it). **Generate** still works and produces a fresh generated version;
   **Revert** switches back to the upload.
4. **Verify (limits):** a non-HTML file or a file over the cap is rejected with a message (a 413 shows
   "too large"); a non-approved target cannot upload.
5. **Verify (revert between upload and generated):** Regenerate on an uploaded page → a new `AUTO`
   version is Current and Refine reappears. **Revert** to the `UPLOAD` version → it is Current again,
   `/p/<slug>` serves the upload, and Refine is hidden again with the hint. *(E2E covers the hidden
   Refine, the hint and the enabled Regenerate/Revert/Upload controls on the seeded state; the
   transitions themselves queue jobs and are manual.)*

## 8. MCP parity

Covered by Jest (`lib/mcp/__tests__/crm-homepage.test.ts`), not the browser: `crm_generate_homepage`
enqueues the same job (approved + authorised targets only); `crm_get_homepage_status` returns
status, preview URL and versions.

---

## Known gaps

- **Guessable slug (by design):** `/p/<slug>` is unauthenticated and human-readable; content is a
  non-sensitive mockup. An optional `/p/` rate-limit is a fast-follow (`CUSTOMIZATIONS.md`).
- **Serverless chromium launch** (`@sparticuz/chromium` 147 + `playwright-core` 1.59.1, both
  Chromium 147) is verified on the first Vercel preview, not locally or in CI. Keep the majors
  matched on any bump (see `LESSONS_LEARNED.md`).
- **No per-version screenshots:** revert re-renders.
- **CI e2e has no S3:** the storage-backed E2E tests skip there (`LESSONS_LEARNED.md`).
- **E2E parity for §3 steps 5–10 above is partial:** the `/p/` host-gate helper
  (`isPreviewHostAllowed`), the in-flight/published-slug/prompt-length guards, the 429-retriable
  classification, and the logo-inline harvest are all covered by **Jest** (unit), but there is no
  Playwright counterpart yet — the host gate and the stuck-row/logo scenarios need host-header and
  timing control that the current e2e harness doesn't set up. Add Playwright coverage as a fast-follow.
- **Local migration checksum:** the `20260930120000_homepage_versions` migration was edited in place
  during review (columns dropped/added). If you already ran it locally, `pnpm exec prisma migrate reset`
  (local Supabase on :54622) to clear the checksum mismatch before `pnpm db:migrate`.
- **Premium generation + screenshot final state (§3 steps 11–12):** need live Anthropic, real network
  to Google Fonts/cdnjs, and chromium. Manual on QA only. The reveal-settling script
  (`lib/homepage/render.ts`) and the allowlist are unit-tested; the full render is not e2e-tested.
- **Upload action end-to-end (§7 steps 1–2, 4–5):** choosing a file → `/upload-homepage` → Inngest job →
  screenshot render needs the job runner + chromium (and S3) which CI's e2e job lacks. The oversize /
  non-HTML / non-approved rejections are covered by Jest (`upload-homepage-route.test.ts`), not
  Playwright. Only the seeded `UPLOAD` state (Refine gate, serving) is e2e-tested.
- **Admin config affecting generation (§6 step 4):** that the next Generate/Refine actually uses the
  saved model/tokens/base prompt is covered by Jest (`generate-homepage.test.ts`,
  `homepage-settings.test.ts`); the E2E only round-trips the saved values.
- **Non-admin denial (§6 steps 1 and 5):** the e2e harness has one shared **admin** session
  (`playwright/.auth/user.json`); there is no seeded non-admin session, so the `/admin` redirect, the
  admin-action `Forbidden`, and the base-prompt admin-only gate are Jest-only
  (`homepage-settings.test.ts`, `actions/crm/prompts/__tests__/homepage-base-gate.test.ts`). Add a
  second seeded non-admin user + storageState as a fast-follow (pairs every admin allow with a deny).
- **Base-prompt picker in the admin round-trip:** the e2e does not select a `HOMEPAGE_BASE` prompt
  (none is seeded in the e2e DB); only model and max tokens are exercised.
