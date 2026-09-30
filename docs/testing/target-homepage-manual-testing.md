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
  (QA) deploy** (see `docs/reference/LESSONS_LEARNED.md`, chromium version skew).
- **Storage:** local SeaweedFS on `:9000` (`pnpm inngest:up` / `docker-compose.dev.yml`) or
  R2 on hosted; previews live under the private `previews/` prefix.
- **Optional:** `NEXT_PUBLIC_PREVIEWS_BASE_URL` (e.g. `https://previews.radeengineering.com`).
  Unset = the drawer and links use the relative `/p/<slug>` on the CRM host.
- **URLs:** http://localhost:3000/en/campaigns/targets · http://localhost:3000/p/<slug>

> The E2E spec does **not** launch chromium or call Anthropic: it seeds a READY page and
> versions directly, so sections 1 and 2 are the automated happy path. Sections 3–5
> exercise the real job and are manual-only.

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

## 6. MCP parity

Covered by Jest (`lib/mcp/__tests__/crm-homepage.test.ts`), not the browser: `crm_generate_homepage`
enqueues the same job (approved + authorised targets only); `crm_get_homepage_status` returns
status, preview URL and versions.

---

## Known gaps

- **Guessable slug (by design):** `/p/<slug>` is unauthenticated and human-readable; content is a
  non-sensitive mockup. An optional `/p/` rate-limit is a fast-follow (`CUSTOMIZATIONS.md`).
- **Chromium version skew** (`@sparticuz/chromium` 147 vs `playwright-core` 1.58.2) is verified on the
  first Vercel preview, not locally or in CI.
- **No per-version screenshots:** revert re-renders.
- **CI e2e has no S3:** the storage-backed E2E tests skip there (`LESSONS_LEARNED.md`).
- **E2E parity for the manual steps 6–10 above is partial:** the `/p/` host-gate helper
  (`isPreviewHostAllowed`), the in-flight/published-slug/prompt-length guards, the 429-retriable
  classification, and the logo-inline harvest are all covered by **Jest** (unit), but there is no
  Playwright counterpart yet — the host gate and the stuck-row/logo scenarios need host-header and
  timing control that the current e2e harness doesn't set up. Add Playwright coverage as a fast-follow.
- **Local migration checksum:** the `20260930120000_homepage_versions` migration was edited in place
  during review (columns dropped/added). If you already ran it locally, `pnpm exec prisma migrate reset`
  (local Supabase on :54622) to clear the checksum mismatch before `pnpm db:migrate`.
