# Fork Customizations

This repo is a fork of [`pdovhomilja/nextcrm-app`](https://github.com/pdovhomilja/nextcrm-app),
adapted into the **Rade Engineering CRM**. This file is the living manifest of every
way this fork deliberately diverges from upstream — so that after an upstream merge you
know exactly what to re-verify, and so the automated guards (`scripts/check-invariants.sh`,
`.github/workflows/guardrails.yml`) have a documented reason for each check.

**Keep this current.** When you make a new fork-specific change, add a row.

---

## Divergences from upstream

| Area | Upstream | This fork | Enforced by |
|---|---|---|---|
| **Database host** | Local Postgres / self-managed | **Supabase Postgres** (QA + prod); local for DEV | connection strings (env) |
| **ORM / auth** | Prisma + better-auth | **Unchanged** — Supabase is DB-host-only (no Supabase Auth, no RLS) | — |
| **Local DEV DB** | Docker Postgres `:5433` (`pnpm db:up`) | **Hybrid** — canonical DEV DB is the Supabase CLI stack (`supabase start`, `:54622`) for hosted parity; `:5433` compose kept **untouched** as fallback. `db:*` scripts + `assert-local-db.sh` deliberately NOT repointed (avoids churning upstream `package.json`); the host guard already allows `127.0.0.1:54622`. Ports pinned to the `546xx` block in `supabase/config.toml` to coexist with other local Supabase stacks. `supabase/` dir is additive. | — |
| **Local object storage** | MinIO via `docker-compose.dev.yml` | **SeaweedFS** — MinIO's public Docker images were gated in 2025, so the compose file's local S3 is SeaweedFS (`:9000`) + a one-shot `createbucket`. `lib/minio.ts` (generic path-style S3) is unchanged; R2 still used on QA/prod. One edit to `docker-compose.dev.yml` + additive `docker/seaweedfs-s3-config.json`. | — |
| **Auth — first user & dev OTP** | better-auth email-OTP | **Additive:** first user auto-promoted to admin+`ACTIVE` via `databaseHooks.user.create.after` → `lib/auth-hooks.ts`; and in non-prod the OTP is logged to the server console (`lib/auth.ts`) so local login needs no inbox. Both are dev/bootstrap conveniences; no upstream auth behavior removed. | — |
| **Auth — Google provider gated** | `socialProviders.google` always registered (`GOOGLE_ID!`/`GOOGLE_SECRET!`) | **Conditional** — `lib/auth-social.ts` registers Google only when both env vars are set; unset = no button, no creds (Google sign-in not used here). Removes the `!` non-null assertions. | `__tests__/auth/social-providers.test.ts` |
| **Security — GitHub stars token** | `NEXT_PUBLIC_GITHUB_TOKEN` sent in the `Authorization` header (client-bundled) | **Removed** — `actions/github/get-repo-stars.ts` fetches the login-page star count **unauthenticated** (no token anywhere); upstream-contributable fix. | `__tests__/github/get-repo-stars.test.ts` |
| **Email — campaigns/transactional key split** | single `RESEND_API_KEY` for both campaigns + transactional | **Segregated** — `send-step.ts` uses `RESEND_CAMPAIGNS_API_KEY` (falls back to `RESEND_API_KEY`); transactional stays on `RESEND_API_KEY`. Separate Sending-access keys per env (QA shares prod's sending domains, so tracking on for campaigns domain, off for transactional; separate keys don't isolate reputation). | env-doc guard |
| **Email — non-prod redirect guard** | none (any dev/QA run can email real addresses) | **`EMAIL_REDIRECT_TO`** rewrites all recipients to one test inbox in dev/QA (`lib/email/redirect.ts`, applied in `lib/resend.ts` + campaign sender). Unset in prod; never redirects a prod deploy (`VERCEL_ENV`). | `__tests__/email/redirect.test.ts` |
| **Hosting** | Coolify (nixpacks) | **Vercel** (crm.radeengineering.com) | `vercel.json` *(WS3)* |
| **Environments** | `dev` → `main` | **3-tier:** feature → `main` → `qa` → `production` | `advance-qa.yml` + `promote-production.yml` |
| **Deploy / migration** | build runs `prisma migrate deploy` (Coolify) | **Build-migrates on Vercel** — the deploy migrates its own DB; `advance-qa`/`promote-production` only move branch pointers. Vercel builds **only** `qa`/`production` (Ignored Build Step) so PR previews never migrate QA. `main` deploy off (`vercel.json`). | `check-invariants.sh`, CODEOWNERS |
| **Migrations** | Prisma `migrate deploy` | **Unchanged** — through CI only, never hand-applied, never `db push` | `check-invariants.sh`, `guardrails.yml` |
| **Package manager** | pnpm | **Unchanged** — pnpm | `check-invariants.sh` |
| **Unit tests** | Jest | **Unchanged** — Jest (kit's coverage discipline layered on) | — |
| **Ways of working** | — | starter-kit `CLAUDE.md`, `docs/guides/`, `.claude/skills/` ported | CODEOWNERS |
| **Coolify/nixpacks** | maintained | **Dormant** — left in place (not deleted) to avoid merge churn; unused on Vercel | — |
| **CI cost** | `ci.yml` runs E2E on every push (~8 min) | **Path-gated** — a `changes` job gates `integration`/`build`/`e2e` on `if: needs.changes.outputs.code == 'true'`; docs/CI/agent-config-only pushes skip them and run just `fast` + guardrails. One edit to upstream's `ci.yml`. | `CODEOWNERS` |
| **Env docs (WS4)** | `.env.example` only; no central validator | **Additive env-doc guard** — `.env.example` reconciled against real `process.env` usage (fork keys in a separate appended block so upstream's stays byte-identical); `docs/reference/ENVIRONMENT_VARIABLES.md` documents every key; `scripts/check-env-docs.sh` enforces `.env.example` ↔ doc parity (hard) + warns on un-templated `process.env` reads. | `guardrails.yml` (`env-docs` job) |
| **CRM — target triage** | no triage gate on Targets | **Additive** — a pre-conversion review gate on `crm_Targets`: `triage_status` (NEW/APPROVED/PASSED), `pass_reason`, `pass_note`, `revisit_at`, `triaged_at/by` (migration `20260928120000_add_target_triage`); `setTargetTriage` action + `crm_set_target_triage` MCP tool; triage column/faceted-filter/Approve-Pass UI. `revisit_at` (snooze) is stored but the auto-resurface cron is a **deferred follow-up**. For the prospecting workflow (approve → outreach/mockup; pass → reason + revisit). | `__tests__/actions/set-target-triage.test.ts`, `__tests__/mcp/crm-targets-triage.test.ts`, `tests/e2e/target-triage.spec.ts` |
| **CRM — MCP target field parity** | `crm_create_target`/`crm_update_target` accept ~7 fields | **Extended** to the full CSV importable set (`lib/spreadsheet/target-fields.ts` — `company_website`, `industry`, `city`, `description`, socials, extra email/phone) so an MCP load carries the same data as a CSV import; guarded against drift. (Upstream-contributable.) | parity test in `__tests__/mcp/crm-targets-triage.test.ts` |
| **DB — runtime transaction pooler** | single `DATABASE_URL` (session pooler) for CLI + runtime | **Split** — the serverless runtime pool reads optional **`RUNTIME_DATABASE_URL`** (transaction pooler `:6543`) via `lib/db/runtime-database-url.ts`, falling back to `DATABASE_URL`; `DATABASE_URL` stays on the session pooler (`:5432`) for `prisma migrate deploy`. Fixes session-pooler exhaustion (`EMAXCONNSESSION` → app-wide `FAILED_TO_GET_SESSION`). One thin insert into upstream `lib/prisma.ts`. | env-doc guard; `__tests__/db/runtime-database-url.test.ts` |
| **CRM — public web-lead intake** | `POST /api/crm/leads/create-lead-from-web` creates a bare lead (name/company/email only) | **Extended additively** — captures `description` and resolves `lead_source` (name, default `"Web"`) / `lead_status` (`"New"`) / `assigned_to` (`WEB_LEAD_ASSIGNEE_EMAIL`, default `shaun@radeengineering.com`) server-side, each null-on-miss, then fires the `crm/lead.saved` event. Logic in new `lib/crm/create-web-lead.ts`; the upstream route is a thin hook. Auth check + `lastName` 400 unchanged. | `__tests__/crm/create-web-lead.test.ts` |
| **CRM — target AI outreach (email)** | no AI outreach; campaigns are bulk, list-based sends | **Additive** — from an **approved** target, an "AI" header menu drafts a personalised email with Claude (`generate-target-email.ts`, tolerant of fenced JSON), previews it merged into a campaign template's `{{body}}` (`lib/campaigns/compose-target-email.ts`, extended merge tags incl. `homepage_url`/`homepage_screenshot`, empty until a homepage exists), and sends a **one-off** via Resend with a per-email unsubscribe token (`/api/crm/targets/unsubscribe`), `do_not_email` + approval gates, activity + audit entries. Reusable **prompt library** (`/campaigns/prompts`, org/personal, EMAIL/HOMEPAGE kinds) and MCP parity (`crm_send_target_email`, prompt CRUD). New tables `crm_Ai_Prompt`, `crm_Target_Email`, `crm_Target_Homepage` (migration `20260929120000_target_ai_outreach`). Upstream-owned touches: `schema.prisma` (insert-only), `BasicView.tsx`, `lib/mcp/tools/index.ts`, `playwright.config.ts` (see `UPSTREAM_IMPACT_LOG.md`). **Planned follow-up:** AI homepage generation + `previews.radeengineering.com` (the `crm_Target_Homepage` table and merge tags are the seam; the "Generate homepage" menu item is disabled until then). | `actions/crm/targets/__tests__/`, `actions/crm/prompts/__tests__/`, `lib/mcp/__tests__/`, `tests/e2e/target-ai-email.spec.ts` |
| **CRM — target AI homepage generation** | no homepage generation; "Generate homepage" was a disabled placeholder | **Additive** — from an **approved** target, the AI menu opens a drawer that harvests the prospect's current site (SSRF-guarded via `lib/net/host-guard.ts`), drafts a redesigned homepage with Claude vision, self-critiques for N automatic passes over headless-chromium screenshots (`@sparticuz/chromium` + `playwright-core`, lazy-imported), then supports human **refine** / **revert** over a version history (`crm_Target_Homepage_Version`, migration `20260930120000_homepage_versions`). Job: Inngest `homepage/target.generate` + `.refine` (`inngest/functions/generate-homepage.ts`); MCP parity (`crm_generate_homepage`, `crm_get_homepage_status`). **Previews model:** pages are stored in the **existing private R2 bucket** (`MINIO_*`, `previews/<slug>/`, no new bucket/creds) and served **only** through a public, unauthenticated Next route `/p/[slug]` (+ `/p/[slug]/screenshot.png`) — Vercel-served private R2, not a public bucket. Designed to be linked on `previews.radeengineering.com` (`NEXT_PUBLIC_PREVIEWS_BASE_URL`, optional/fail-closed) and always sent with `Content-Security-Policy: sandbox allow-scripts` (opaque origin) + `noindex`. Upstream-owned touches (all insert-only except one array extension; see `UPSTREAM_IMPACT_LOG.md`): `prisma/schema.prisma`, `package.json`, `next.config.js`, `proxy.ts` (`/p/` pass-through), `app/api/inngest/route.ts`, `lib/mcp/tools/index.ts`, `BasicView.tsx`, `app-sidebar.tsx`, `menu-items/Campaigns.tsx`. | `inngest/functions/__tests__/generate-homepage.test.ts`, `lib/homepage/__tests__/`, `actions/crm/homepage/__tests__/`, `app/p/[slug]/__tests__/`, `lib/mcp/__tests__/crm-homepage.test.ts`, `tests/e2e/target-homepage.spec.ts` |

*(WS3)* = lands in the CI/CD workstream; its invariant is a WARN in `check-invariants.sh`
until then, promoted to FAIL once the file exists.

---

## Known gaps — homepage generation

Deliberate, accepted limitations of the homepage-generation feature (revisit when noted):

- **Guessable, readable slug (user's explicit choice).** `/p/<slug>` is public and unauthenticated
  and the slug is human-readable (`acme-plumbing`), so it can be guessed. The content is a
  non-sensitive prospect mockup. **Fast-follow (optional):** an Upstash rate-limit on `/p/`
  (skip outside `VERCEL_ENV=production`, per `e2e-patterns.md`).
- **Chromium version skew — verify on first deploy.** `@sparticuz/chromium` 147 vs
  `playwright-core` 1.58.2 (Chromium 145). The serverless launch can't be exercised locally or
  in CI; the first Vercel preview (QA) run is the verification step (see `LESSONS_LEARNED.md`).
- **DNS-rebinding residual on the source harvest.** The host guard resolves once; the browser
  resolves again. Bounded to a screenshot/copy of the answer; host-resolver pinning is a
  possible fast-follow (see `LESSONS_LEARNED.md`).
- **A failed refine on a published page keeps the live preview (by design).** The prior version
  stays current and served; the row records the error. This protects links already emailed.
- **No per-version screenshot storage.** Only the current screenshot is stored; **revert
  re-renders** the target version's HTML (`screenshot_key` on versions is unused for now).
- **E2E does not launch chromium or call Anthropic.** `tests/e2e/target-homepage.spec.ts` seeds a
  READY page + versions directly; storage-backed serving assertions run only where an S3 endpoint
  is reachable (local SeaweedFS), and are skipped in CI's `e2e` job (no S3 service there).

---

## Keeping up with upstream (sync IN)

Never merge upstream straight into `main`. Use the tested lane:

```bash
bash scripts/sync-upstream.sh          # merge upstream/main into sync/upstream-<date>, run guards
bash scripts/sync-upstream.sh --push   # also push + open the PR
```

The PR runs full **CI + Guardrails** before the merge can reach `main`. A weekly
[`upstream-drift`](.github/workflows/upstream-drift.yml) job opens a tracking issue when
the fork falls behind.

**After a sync merge, re-verify the judgment calls the scripts can't check:**
- Did upstream add a **new required env var**? It must be added to every Vercel scope
  (Development/Preview/Production) or the Vercel deploy breaks while CI stays green.
- Did upstream add a **Coolify/self-host assumption** that conflicts with Vercel?
- Did upstream touch **auth** in a way that assumes their better-auth config vs ours?
- Did a **schema change** land? Guardrails' schema/migration-sync check confirms a
  migration accompanies it; confirm it applied to Supabase QA via `migrate-qa.yml` after merge.

## Contributing BACK upstream (sync OUT)

You do **not** need a `dev` branch in this fork. Cut the contribution branch from a
**clean upstream base**, not from this customized `main`:

```bash
git fetch upstream
git switch -c fix/thing upstream/main    # clean base (or upstream/dev if they direct you)
# ...isolated, upstream-worthy change only — not entangled with fork customizations...
git push origin fix/thing
gh pr create --repo pdovhomilja/nextcrm-app --base main --head radesix:fix/thing
```

If a change is entangled with fork customizations, extract just the upstream-relevant
part onto the clean base before opening the PR.
