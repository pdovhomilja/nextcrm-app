# Target AI Outreach (Email + Homepage Preview) — Design Spec

**Status:** Draft (pre-implementation) · **Date:** 2026-09-29 · **Owner:** Shaun
**Branch:** `feat/target-ai-outreach`

> Describes intent, scope, and acceptance for AI-assisted outreach from an
> approved Target: a personalized email generator and an iterating homepage-preview
> generator. No implementation code (per `CLAUDE.md` › Documentation Sync). The
> implementation plan follows via the `writing-plans` skill after this spec is
> approved.
>
> **Build order:** both subsystems and their shared seam are designed here, but only
> the **email subsystem ships first**. The **homepage subsystem is a follow-up
> build** — designed now so the seam never has to be retrofitted.

---

## 1. Purpose

When an operator evaluates an **approved** Target (`triage_status = APPROVED`), give
them two AI actions from the target itself:

1. **Generate email** — draft a personalized outreach email from the target's
   `description` (+ company/position/etc.), guided by a selectable prompt, merged
   into a branded HTML email template, **previewed before sending**, and sent as a
   one-off direct email to that target.
2. **Generate homepage** — produce a modern, self-contained sample **homepage** for
   the prospect, hosted at `previews.radeengineering.com`, that the agent **iterates
   on by inspecting its own rendered output**, plus operator-directed refinement
   rounds. The resulting **link + screenshot** can be embedded in the outreach email.

Success = "from an approved target, an operator can generate a high-quality
personalized email (and, once built, a high-quality sample homepage), preview it,
optionally embed the homepage link + screenshot, and send — with an auditable
trail and no fabricated recipient data."

This is the **"outreach/mockup"** half of the already-planned triage flow
(`CUSTOMIZATIONS.md`: *approve → outreach/mockup; pass → reason + revisit*). It
consumes the `NEW → APPROVED` targets produced by triage/prospecting.

## 2. Scope

**In scope — Phase 1 (email, ship first):**
- Prompt library (org-wide + personal), `kind = EMAIL`.
- AI email generation from the target, merge into an existing campaign template,
  rendered preview, one-off direct send, audit + activity records.
- Merge-tag extension for homepage link + screenshot (tags resolve to empty when no
  homepage exists yet).
- The dropdown entry point + the shared companion data model (including the homepage
  tables, created up front so the seam is stable).

**In scope — Phase 1 design / follow-up build (homepage):**
- Homepage generation via a swappable **provider interface**; the default
  implementation is an **e2b iterating design agent** (self-critique passes + human
  refinement rounds, versioned).
- R2 hosting at `previews.radeengineering.com/p/<slug>` with an editable,
  company-derived slug; screenshot capture from the render step.

**Out of scope:**
- Multi-page or dynamic (deployed-app) homepages — Phase 1 homepage output is a
  **single self-contained static HTML page**.
- Multi-step / drip sequences from this feature (those remain in the campaigns
  module). This feature is single-target, one-off send.
- Moving the homepage engine to an **external hosted service** — that is the
  optional **Phase 2** roadmap item (operational decoupling only; see §6.4). It does
  not change the data model, the email seam, or the provider interface.
- Changing the existing campaign generator (`generate-template.ts`) or campaign send
  path beyond additive reuse.

## 3. Entry point & interaction model

**Entry point.** The target detail page's existing **"Enrich with AI"** button
(`EnrichButton.tsx`) becomes a **dropdown**:
- `Enrich` (existing behavior, unchanged)
- `Generate email`
- `Generate homepage`

Both new items are **disabled unless `triage_status = APPROVED`** (server-enforced;
client disabling is UX only).

**Email drawer.** Pick a prompt from the library (org + personal, `kind = EMAIL`) →
it pre-fills an editable prompt field → tweak per target → **Generate** → review
subject + rendered HTML preview → optionally toggle "include homepage link/screenshot"
(available only when a READY homepage exists) → **Send**. Regenerate is allowed
before sending.

**Homepage drawer.** Confirm the **auto-proposed slug** (from company name, editable,
uniqueness-checked) → pick/tweak a prompt (`kind = HOMEPAGE`) → **Generate** → an
Inngest job runs the agent (status PENDING → RUNNING → READY/FAILED) → review the
rendered preview + screenshot → request changes (new version) or revert to a prior
version.

## 4. Data model (all fork-owned)

New Prisma models (in the shared `prisma/schema.prisma` — flagged as an
upstream-owned file touch, see §10). Every table carries `deleted_at` per the
soft-delete convention and audit-relevant `created_by`/timestamps.

### 4.1 `crm_Ai_Prompt` — prompt library
| field | notes |
|---|---|
| `id` | pk |
| `name` | display name in the picker |
| `body` | the prompt text (pre-filled into the drawer, editable per generation) |
| `kind` | enum `crm_Ai_Prompt_Kind` = `EMAIL` \| `HOMEPAGE` |
| `scope` | enum `crm_Ai_Prompt_Scope` = `ORG` \| `USER` |
| `user_id` | null for `ORG`; set for `USER` (owner) |
| `is_default` | optional; the prompt pre-selected for a given `kind` |
| `created_by`, `created_at`, `updated_at`, `deleted_at` | |

Picker resolution: show `scope = ORG` **plus** `scope = USER AND user_id = me`,
filtered by `kind`. Managed in CRM settings (mirrors the existing settings pattern).

### 4.2 `crm_Target_Homepage` — the seam (1:1 with a target)
| field | notes |
|---|---|
| `id` | pk |
| `targetId` | fk → `crm_Targets` |
| `slug` | unique; `previews.radeengineering.com/p/<slug>` |
| `preview_url` | public hosted URL (null until first READY) |
| `screenshot_url` | hosted screenshot URL (null until first READY) |
| `status` | enum `crm_Homepage_Status` = `PENDING`\|`RUNNING`\|`READY`\|`FAILED` |
| `current_version_id` | fk → version currently published |
| `base_prompt` | the prompt used for the initial generation |
| `error` | last failure message |
| `created_by`, timestamps, `deleted_at` | |

**This record is the only thing the email subsystem depends on** (it reads
`preview_url` + `screenshot_url`). Any future engine just populates it.

### 4.3 `crm_Target_Homepage_Version` — iteration history
| field | notes |
|---|---|
| `id` | pk |
| `homepage_id` | fk → `crm_Target_Homepage` |
| `html` | the generated page HTML (`@db.Text`) |
| `screenshot_url` | screenshot for this version |
| `preview_url` | hosted URL for this version (each version independently viewable) |
| `prompt` | the prompt/change-request that produced this version |
| `agent_critique` | the agent's self-critique notes for this pass (Json/text) |
| `pass_kind` | enum: `AUTO` (self-critique) \| `HUMAN` (operator-directed) |
| `created_by`, `created_at` | |

Revert = repoint `crm_Target_Homepage.current_version_id`/`preview_url`/
`screenshot_url` at a prior version.

### 4.4 `crm_Target_Email` — generated drafts / send record
| field | notes |
|---|---|
| `id` | pk |
| `targetId` | fk → `crm_Targets` |
| `template_id` | fk → `crm_campaign_templates` (the chosen wrapper) |
| `subject` | AI-generated subject |
| `body_html` | AI-generated body copy (pre-merge) |
| `prompt_used` | the prompt text used |
| `included_homepage` | bool — whether the link/screenshot were embedded |
| `status` | `DRAFT` \| `SENT` |
| `sent_at`, `resend_message_id` | send metadata |
| `created_by`, timestamps, `deleted_at` | |

Stored (not transient) for audit trail + potential re-preview/resend.

## 5. Email subsystem (Phase 1 — build first)

**Generation.** A new server action seeds a **Claude** call (via AI Gateway; key
resolved through `lib/api-keys.ts`) with the target's `description` + company/
position/industry and the selected prompt, returning `{ subject, body_html }`.
Mirrors the shape of `actions/campaigns/templates/generate-template.ts` but is
target-seeded and **uses Claude, not the existing OpenAI path** (quality + brand).
30s timeout / abort like the existing generator.

**Merge + preview.** Reuses the existing pipeline unchanged:
- `lib/campaigns/merge-tags.ts` (**extended**, fork-owned) — add `{{homepage_url}}`
  and `{{homepage_screenshot}}` (the latter rendered as an inline `<img src=…>`).
  Existing 5 tags (`first_name`, `last_name`, `email`, `company`, `position`)
  unchanged. New tags resolve to **empty string** when no READY homepage exists, so
  templates degrade gracefully.
- `lib/campaigns/render-email.ts` — wraps merged body in the selected
  `crm_campaign_templates` shell via `emails/CampaignLayout.tsx`; produces the
  preview HTML.

**Send (one-off direct).** A new server action:
1. Re-checks auth (`requireAuthenticated` + `assertCanWriteTarget`) and
   `triage_status = APPROVED` **server-side**.
2. Honors `do_not_email` (via `recipient-filters.ts` logic).
3. Sends via Resend using the campaigns key (`RESEND_CAMPAIGNS_API_KEY` →
   `RESEND_API_KEY`) through `redirectRecipients` (non-prod safety guard).
4. Writes **send metadata onto `crm_Target_Email`** (`status = SENT`, `sent_at`,
   `resend_message_id`) — *not* a `crm_campaign_sends` row (avoids overloading
   campaign semantics with null-campaign sends) — plus a target **activity** and an
   **audit-log** entry.

**No new send plumbing** — it rides the existing Resend + redirect-guard path.

## 6. Homepage subsystem (Phase 1 design / follow-up build)

### 6.1 Provider interface (the swappable boundary)
The CRM depends on a single interface, roughly:
`generateHomepage({ target, prompt, previousHtml? }) → { html, critique }`.
The CRM handles rendering-to-hosting, screenshotting, storage, and versioning around
whatever the provider returns. Swapping the provider (Phase 2) touches nothing else.

### 6.2 Default provider — Playwright-in-Inngest iterating design agent

> **Updated per feasibility spike (2026-09-30).** The spike proved the
> render→screenshot→Claude-vision-critique→refine loop end-to-end with plain
> **Playwright headless chromium** (launch ~1.7s, valid screenshots) and high-quality
> self-critique (the model caught real flaws in its own output). **Finding: e2b is NOT
> required** — the loop runs in a normal Inngest background job, which is simpler
> (one less service) and matches the enrichment job pattern. Measured cost/latency:
> ~$0.07–0.12 and ~25–40s per vision pass on `claude-sonnet-5-5` → a 3-pass auto loop
> ≈ $0.30 and ~2 min. **Default N = 3 auto passes.**

Runs as an **Inngest job** (mirrors `inngest/functions/enrich-target.ts`: companion
status table, ANTHROPIC key via `getApiKey`, retries, status transitions):

1. Generate initial HTML (self-contained: HTML + Tailwind via CDN, inline assets).
2. **Render** it with headless chromium (Playwright; in the serverless/Inngest runtime
   use a serverless-compatible chromium, e.g. `@sparticuz/chromium` + `playwright-core`
   — Vercel Fluid Compute supports this within the 5 GB package limit).
3. **Screenshot** the render.
4. **Claude vision** (`claude-sonnet-5-5`, `max_tokens ≈ 12k`) critiques the screenshot
   against a curated design rubric.
5. **Refine** the HTML; repeat for **N = 3** bounded auto-passes (cost/time-capped).
6. Each pass persists a `crm_Target_Homepage_Version` row (`pass_kind = AUTO`) with its
   `agent_critique`.
7. Final pass → upload HTML + screenshot to **R2 (private)** → set
   `preview_url`/`screenshot_url` → `status = READY`.

**Human refinement (unlimited rounds):** operator reviews the rendered preview +
screenshot in a drawer and submits a change request → another job run seeded with the
current HTML + the request → new version (`pass_kind = HUMAN`). Versions are
compare/revert-able; the published `preview_url`/`screenshot_url` track the chosen version.

Curated **design guidance** lives as versioned prompt assets in-repo (the "skills"
concept, expressed as prompt files), plus the operator's per-target prompt.

### 6.3 Hosting & screenshots (Vercel route + private R2)

> **Updated per DNS reality + user decision (2026-09-30).** `radeengineering.com` DNS
> is on **GoDaddy → Vercel** (no Cloudflare zone), so an R2 *custom domain* (which
> requires a Cloudflare zone) is not the low-friction path. Decision: **serve previews
> from Vercel, backed by a private R2 bucket.**

- **`previews.radeengineering.com`** is added as a domain on the Vercel project (like
  `crm.`; GoDaddy record → Vercel, TLS automatic) — **operator/infra prerequisite**.
- A public route **`/p/[slug]`** streams the stored HTML from R2 (via the existing
  `lib/minio.ts` S3 client) as `text/html`; the screenshot is served by a sibling route
  **`/p/[slug]/screenshot.png`** streaming the PNG from R2. The email's
  `{{homepage_screenshot}}` `<img>` points at that screenshot route URL.
- **R2 bucket stays PRIVATE** — objects are read server-side by the route, never a
  public bucket. Objects keyed under a `previews/<slug>` prefix in the existing bucket
  (no new bucket/creds needed unless preferred).
- **Slug.** Auto-proposed from the company name (slugified), **editable**, uniqueness
  enforced on save (collision → operator adjusts, or auto-suffix).
- **Screenshot** comes from the agent's own render step — **no separate screenshot
  service**.
- New env: `NEXT_PUBLIC_PREVIEWS_BASE_URL` (e.g. `https://previews.radeengineering.com`),
  optional (fail-closed consumer) until the domain is live. Confirm value with the user.

### 6.4 Roadmap (behind the provider interface — no seam/data-model change)
- **Phase 1:** Playwright-in-Inngest iterating agent (this spec, spike-validated).
- **Phase 2 (optional, later):** move the same agent behind an **external hosted
  service** exposing the same interface over HTTP — an operational/decoupling choice
  if homepage generation becomes a shared capability. Requires CRM↔service auth; does
  **not** improve quality over Phase 1.

## 7. The seam (email ⇄ homepage)

The email subsystem reads **only** `crm_Target_Homepage.preview_url` and
`screenshot_url`. It never knows how they were produced. Consequences:
- The email feature ships and works with **no homepage yet** (tags resolve empty).
- The homepage feature (Phase 1 build, or any future engine) just populates those two
  fields; nothing in the email code changes.
- This is the explicit de-risking the design was structured around.

## 8. Security & authorization

- **Gate:** both actions require `triage_status = APPROVED`, enforced in the server
  action, not just the UI.
- **Authz:** `requireAuthenticated` + `assertCanWriteTarget` on every action
  (no RLS — application code is the boundary; scope every query by owner/permission).
- **Anti-spam:** send path honors `do_not_email` / `do_not_email_at`.
- **Non-prod safety:** all sends go through `redirectRecipients`.
- **SSRF/hosting:** generated HTML is model-produced static markup, stored in a
  **private** R2 bucket and streamed by the public `/p/[slug]` Vercel route as
  `text/html`; generation performs no server-side fetch of prospect-controlled URLs
  (if that's ever added, use the existing host guard
  `docs/superpowers/specs/2026-07-21-ssrf-host-guard-design.md`).
- **Preview-serving isolation (model-generated HTML on our domain):** previews render on
  **`previews.radeengineering.com`**, a *different host* from the app
  (`crm.radeengineering.com`) — cookies are per-host, so a stray `<script>` in generated
  HTML runs in an origin with **no access to the CRM session**. Harden further with a
  restrictive **CSP** on the preview route (and consider sanitizing the model HTML).
- **Public preview routes** (`/p/[slug]`, `/p/[slug]/screenshot.png`) are unauthenticated
  by design (prospects open them); the slug is the only capability. Add `no-store` /
  `noindex` headers and rate-limiting per the abuse checklist.
- **Audit:** email sends and homepage publishes write audit-log entries.

## 9. Prompt library

- Two `kind`s: `EMAIL`, `HOMEPAGE`.
- Two `scope`s: `ORG` (shared, house voice) and `USER` (personal). Picker merges org +
  own personal, filtered by kind; optional `is_default` per kind pre-selects.
- Managed in CRM settings (create/edit/delete, soft-deleted), authz-scoped.
- MCP parity: `crm_*` tools for **prompt CRUD included in Phase 1** (follow existing
  MCP-parity convention). Homepage MCP tools **deferred** to the homepage build.

## 10. Upstream-owned touches & fork hygiene

Per the Additive-first standard, flagged up front and to be logged in
`docs/reference/UPSTREAM_IMPACT_LOG.md`:

| File | Change | Risk |
|---|---|---|
| `prisma/schema.prisma` | **insert** new models + enums (append; no rewrite of upstream models) | Low (additive) |
| `app/api/inngest/route.ts` | **insert** registration of the new homepage job | Low (insertion-only) |
| `lib/minio.ts` | **reuse**; prefer a **sibling helper** for the previews bucket rather than editing | Low (additive if sibling) |

Fork-owned (edit freely): `lib/campaigns/merge-tags.ts`, everything under
`actions/crm/targets/**`, `app/[locale]/(routes)/campaigns/targets/**`,
`inngest/functions/**` new files, new `lib/**` helpers, `emails/**` new templates,
`docs/**`, `.claude/**`.

## 11. Environment variables

New vars (add as **optional with fail-closed consumers**, per the required-env
break-Vercel rule; keep `.env.example` ↔ `docs/reference/ENVIRONMENT_VARIABLES.md` in
sync or the env-doc guard fails):
- `NEXT_PUBLIC_PREVIEWS_BASE_URL` — e.g. `https://previews.radeengineering.com`.
- Previews R2 bucket + (if distinct from existing) credentials — exact names TBD in
  planning; **confirm values with the user before setting anything** (secrets rule).
- Anthropic key already resolvable via `lib/api-keys.ts` (no new var if reused).

## 12. Testing strategy

- **Unit (Jest):** merge-tag extension (new tags, empty-resolution fallback); slug
  proposal + uniqueness/collision; prompt-library scope resolution (org+personal by
  kind); email-generation prompt assembly; send-action gate (rejects non-APPROVED)
  and `do_not_email` honoring.
- **Integration (DB-backed):** email send writes send row + activity + audit; draft
  status transitions.
- **E2E (Playwright, per `docs/testing/e2e-patterns.md`):** email drawer happy path
  (approved target → generate → preview → send, with the non-prod redirect guard).
  Homepage E2E deferred to its build.
- **Manual-test ↔ E2E parity** maintained bidirectionally.
- **Regression tests verified by reverting the fix** (toggle off → confirm fail →
  restore).
- **Feasibility spike (do first, homepage):** prove headless render + Claude-vision
  critique inside e2b before committing to the homepage build.

## 13. Acceptance criteria

**Email (Phase 1):**
- Dropdown replaces the Enrich button; new items disabled unless APPROVED (server-
  enforced).
- Operator can select an org/personal EMAIL prompt, edit it, generate `{subject,
  body_html}` from the target, choose a template, and see an accurate rendered
  preview.
- Homepage merge tags embed link + inline screenshot when a READY homepage exists,
  and resolve to empty otherwise.
- Send delivers via Resend (redirect-guarded in non-prod), records send + activity +
  audit, and marks the draft SENT.
- No Decimal-serialization or authz regressions.

**Homepage (follow-up build):**
- From an approved target, generate a self-contained static homepage; agent runs
  bounded auto self-critique passes, then operator can request changes (new
  versions) and revert.
- Page hosted at `previews.radeengineering.com/p/<slug>` (company-derived, editable,
  unique slug); screenshot captured and stored.
- `crm_Target_Homepage.preview_url`/`screenshot_url` populated → immediately usable by
  the email generator.

## 14. Feasibility risks

1. **Headless render + vision critique in e2b** — the main unknown; spike first.
2. **R2 public custom domain** setup for `previews.radeengineering.com` (Cloudflare
   config, cache, content-type for HTML).
3. **Homepage quality bar** — auto-pass count vs. cost/latency tuning; may motivate
   Phase 2 later. (Explicitly *not* one-shot, per owner's quality standard.)
4. **Email deliverability** of embedded remote screenshot `<img>` (blocked-image
   fallback; ensure link is always present as text/anchor too).

## 15. Open questions / decisions to finalize in planning

**Resolved:**
- **Send record table:** send metadata lives on **`crm_Target_Email`** (no
  null-campaign `crm_campaign_sends` rows).
- **MCP parity:** **email-send + prompt-CRUD** tools ship in Phase 1; **homepage MCP
  deferred** to the homepage build.

**Still open:**
- **Exact env-var names** and whether the previews bucket needs separate R2
  credentials — confirm with owner before setting.
- **Auto-pass bound** (N) and per-run cost/time ceiling for the homepage agent.

## 16. Doc-sync targets (before PR, per Documentation Sync)

- This spec (source of intent).
- `docs/reference/ENVIRONMENT_VARIABLES.md` + `.env.example` (new vars).
- `docs/reference/UPSTREAM_IMPACT_LOG.md` (schema, inngest route, minio touches).
- `docs/reference/PROJECT_STRUCTURE.md` (new routes/dirs, if any).
- Manual-testing doc + E2E parity (email flow).
- `docs/reference/LESSONS_LEARNED.md` (any recurring gotcha — esp. e2b render/vision).
- `CUSTOMIZATIONS.md` (new fork-specific deviation: AI outreach + previews hosting).
