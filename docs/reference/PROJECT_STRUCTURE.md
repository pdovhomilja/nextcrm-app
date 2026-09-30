# Project Structure (map)

> An annotated map of this repo's important directories and files. **Keep it
> current** — `PROJECT_STRUCTURE` is a doc-sync target: a structural change (a new
> top-level dir, a moved module, a new route group) updates this doc in the **same
> PR**. See `docs/guides/process/DOCUMENTATION_GUIDE.md`.
>
> This is the Rade Engineering CRM — a fork of `pdovhomilja/nextcrm-app`. Stack:
> Next.js 16 (App Router) · Prisma 7 + PostgreSQL · better-auth · Inngest ·
> R2/S3 storage · Upstash Redis · Resend · deployed on Vercel (single-tenant).

```text
app/                    Next.js App Router — routes, layouts, route handlers
  [locale]/             locale-segmented UI routes (i18n; en/cs/de/uk)
  api/                  route handlers — auth, crm, campaigns, invoices, reports,
                        mcp, inngest (the Inngest serve endpoint), og, profile, admin
  components/           app-scoped components (route-local, not the shared library)
  providers/            React context providers mounted in the root layout
actions/                server actions (data mutations/reads) grouped by domain —
                        crm/, campaigns/, invoices/, projects/, documents/, emails/,
                        reports/, admin/, user/, system/, github/, fulltext/
components/             shared UI component library (shadcn/ui + Radix + Tailwind)
lib/                    server + shared logic — auth.ts / auth-client.ts (better-auth),
                        api-keys.ts, serialize-decimals.ts (Decimal→number for the
                        server/client boundary), integrations, utilities;
                        crm/target-type.ts (fork-owned Individual/Company target
                        taxonomy — required-identity rule, per-type fields/labels,
                        title resolver; consumed by target forms, detail, list, MCP, import)
prisma/                 schema.prisma (the data model), migrations/ (forward-only,
                        applied via `prisma migrate deploy`), seeds/ + initial-data/
inngest/                background jobs — client.ts (Inngest client), functions/, lib/
emails/                 React Email templates rendered/sent via Resend
i18n/                   i18n runtime config + request/routing setup (next-intl)
locales/                translation message catalogs (en, cs, de, uk)
hooks/                  shared React hooks
context/                React context definitions
scripts/                operational scripts — assert-local-db.sh (guards destructive
                        Prisma commands to a local DB), check-invariants.sh,
                        check-env-docs.sh (env-doc parity guard, WS4),
                        db-backup.sh, sync-upstream.sh, Mongo→Postgres migration +
                        validation tooling, test-data/
docs/                   see docs/guides/process/DOCUMENTATION_GUIDE.md for the layout
__tests__/              Jest unit/integration tests
__mocks__/              Jest module mocks
tests/                  Playwright E2E — auth.setup.ts (better-auth OTP-capture login),
                        e2e/ (specs), fixtures/
e2b/                    E2B sandbox definitions (build.ts, template.ts) for agent runs
public/                 static assets served at the site root
types/                  shared TypeScript types (invoice.ts, types.d.ts, ambient d.ts)
```

## Target AI outreach (fork-owned, email phase)

AI-drafted one-off outreach email from an **approved** target, plus a reusable prompt
library. All new files are fork-owned (only `BasicView.tsx`, `schema.prisma` and
`lib/mcp/tools/index.ts` are upstream-owned touches — see `UPSTREAM_IMPACT_LOG.md`).

```text
app/[locale]/(routes)/campaigns/
  prompts/                      AI prompt library page (create / edit / soft-delete
                                EMAIL + HOMEPAGE prompts, ORG or personal scope);
                                page.tsx + _components/{PromptList,PromptDialog}.tsx.
                                Linked from the Campaigns sidebar group.
  targets/[targetId]/components/
    TargetAiMenu.tsx            header "AI" dropdown (Enrich / Generate email /
                                Generate homepage)
    GenerateEmailDrawer.tsx     prompt + template pick -> generate -> preview -> send
app/api/crm/targets/unsubscribe/   public GET one-click opt-out (token -> do_not_email)
actions/crm/prompts/            prompt-library server actions (list, create, update,
                                delete; mutations write crm_AuditLog "prompt" entries)
actions/campaigns/templates/list-template-options.ts   scoped template picker options
                                (used by the Generate-email drawer)
actions/crm/targets/            generate-target-email.ts (Claude; tolerant JSON),
                                preview-target-email.ts, send-target-email.ts
                                (approval + do_not_email gates, draft->SENT/FAILED row,
                                activity + audit log)
lib/campaigns/send-target-email-core.ts  shared delivery core (fail-closed unsubscribe URL,
                                         DRAFT -> Resend -> SENT/FAILED) for web action + MCP
lib/campaigns/compose-target-email.ts   {{body}} template merge + target merge source
lib/campaigns/merge-tags.ts             merge-tag resolver (extended with homepage_* tags)
lib/mcp/tools/crm-ai-prompts.ts         MCP prompt CRUD tools
lib/mcp/tools/crm-target-email.ts       MCP crm_send_target_email tool
prisma/migrations/20260929120000_target_ai_outreach/   crm_Ai_Prompt, crm_Target_Email,
                                        crm_Target_Homepage (+ enums)
tests/e2e/target-ai-email.spec.ts       happy path + prompt library; mocks Anthropic/Resend
                                        with a local server (see e2e-commands.md)
```

## Target homepage generation (fork-owned)

AI-generated prospect homepage mockup from an **approved** target: harvest the prospect's
current site (SSRF-guarded), draft + self-critique with Claude vision (headless chromium
screenshots), publish to a private R2 prefix, serve at a public `/p/<slug>`, and refine /
revert through a version history. Upstream-owned touches are limited to
`schema.prisma`, `package.json`, `next.config.js`, `proxy.ts`, `app/api/inngest/route.ts`,
`lib/mcp/tools/index.ts`, `BasicView.tsx`, `lib/audit-log.ts`, `prisma/seeds/seed.ts`, two sidebar files
and `AdminSidebarNav.tsx` — see `UPSTREAM_IMPACT_LOG.md`. Generation is **admin-configurable**
(model / max_tokens / base prompt — `/admin/homepage-settings`) and a user can **upload their own HTML**
to override the generated design.

```text
lib/homepage/
  storage.ts                    private-R2 put/get under previews/<slug>/ (index.html, screenshot.png);
                                also the transient upload key (putHomepageUpload / deleteHomepageUpload)
  render.ts                     renderAndScreenshot(html) -> PNG via @sparticuz/chromium + playwright-core
                                (LAZY-imported; never at module scope). Egress is gated by the code-owned
                                allowlist (render-allowlist.ts): only Google Fonts + a version-pinned GSAP
                                cdnjs path load, everything else (incl. WebSockets) is aborted. Before the
                                screenshot a "finalize animations" step completes GSAP/ScrollTrigger
                                timelines and force-reveals hidden elements. Also exports launchBrowser /
                                isServerless (shared by harvest-source.ts)
  render-allowlist.ts           ALLOWED_RENDER_HOSTS, GSAP_VERSION, isAllowedRenderRequest(url) — single
                                source of truth shared by render.ts and the prompt's machine contract
  settings.ts                   admin-config resolver: getHomepageSettings() (model / max_tokens /
                                base_prompt_id from crm_SystemSettings, DB -> code default), HOMEPAGE_MODELS
                                allow-set, clampMaxTokens (default 16000, floor 4000, per-model ceiling)
  prompt.ts                     buildSystemPrompt(basePrompt): admin-editable base prompt (DEFAULT_BASE_PROMPT
                                fallback) + code-owned MACHINE_CONTRACT ALWAYS appended (JSON shape, egress
                                hosts, logo placeholder, no-invented-facts) so a weak base can't break parsing
  upload-homepage-core.ts       runUploadHomepage(): validate HTML + size, ensure row, stage the file, send
                                homepage/target.upload, audit (shared core behind the upload route)
  upload-limits.ts              MAX_UPLOAD_BYTES (4 MB) — plain module (a "use server" file can't export
                                constants) shared by the route core and the drawer's client-side guard
  harvest-source.ts             harvestSource(url): SSRF-guarded (lib/net/host-guard.ts) fetch +
                                screenshot + brand extraction; inlines the logo as a data: URI
  provider.ts                   Anthropic vision provider: generateHomepage({brief,prompt,previousHtml?,...})
  queue-generation.ts           shared trigger: row upsert + published-slug guard + stale-aware in-flight
                                guard + event send + audit (used by the web route AND the MCP tool);
                                MAX_HOMEPAGE_PROMPT_CHARS, STALE_RUN_MS, isHomepageRunActive()
  slug.ts                       ensureUniqueSlug (prisma) + re-exports the shape helpers
  slug-shape.ts                 prisma-free slugify / isValidSlug (shared by server AND client components)
  preview-host.ts               pure /p/ host-gate helpers (isPreviewHostAllowed) used by proxy.ts
  serve.ts                      shared public-serve helpers: generic 404, cache headers,
                                CSP `sandbox allow-scripts`, loadPublished(slug)
lib/ai/anthropic-json.ts        tolerant JSON extraction from fenced/preambled model output
inngest/functions/generate-homepage.ts   homepage/target.{generate,refine,revert,upload} job: harvest (+ logo
                                inline) -> draft -> N auto critique passes (+ HUMAN refine, revert) ->
                                upload -> version row -> READY (throws NonRetriableError on failure).
                                Generate/refine resolve model / max_tokens / base prompt via settings.ts;
                                the upload flow renders + publishes an operator-uploaded page as an UPLOAD
                                version (no model call)
actions/crm/homepage/           server actions: get-homepage-status (exposes current_pass_kind),
                                refine-homepage (refuses while an UPLOAD is current), revert-homepage-version,
                                update-homepage-slug
actions/admin/homepage-settings.ts   getHomepageSettingsForAdmin / saveHomepageSettings (isAdmin-gated,
                                validates model, clamps max_tokens, audits as entity "setting")
app/[locale]/(routes)/admin/homepage-settings/   admin page + _components/HomepageSettingsForm.tsx
                                (model, max tokens, base prompt picker; "Homepage Generation" sidebar entry)
prisma/seeds/homepage-base-prompt.ts   default premium HOMEPAGE_BASE prompt body (seed.ts + migration
                                20260930130200 seed it; admins edit it in the prompt library)
app/api/crm/targets/[id]/generate-homepage/route.ts   POST trigger (authz + APPROVED gate)
app/api/crm/targets/[id]/upload-homepage/route.ts   POST {html} upload override (authz + APPROVED gate).
                                A ROUTE HANDLER, not a server action: actions cap bodies at ~1 MB
app/p/[slug]/route.ts           PUBLIC GET -> stored HTML (no auth, noindex, CSP sandbox)
app/p/[slug]/screenshot.png/route.ts   PUBLIC GET -> stored screenshot
app/[locale]/(routes)/campaigns/targets/[targetId]/components/GenerateHomepageDrawer.tsx
                                slug / prompt / generate / preview iframe / refine / versions / revert /
                                upload-your-own-HTML (refine is disabled while an upload is current)
lib/mcp/tools/crm-homepage.ts   MCP crm_generate_homepage, crm_get_homepage_status
scripts/smoke/homepage-render-smoke.cjs   manual chromium launch smoke (Linux/serverless)
prisma/migrations/20260930120000_homepage_versions/   crm_Target_Homepage_Version + current_version_id
prisma/migrations/2026093013*/  HOMEPAGE_BASE prompt kind, UPLOAD pass kind (ALTER TYPE ADD VALUE),
                                seeded default base prompt
tests/e2e/target-homepage.spec.ts       seeded READY page: drawer preview/versions + /p/<slug> serving
                                        (no real chromium job / Anthropic call); manual doc:
                                        docs/testing/target-homepage-manual-testing.md
```

## Key config files

- `package.json` — scripts (pnpm); note `db:*` commands are guarded by
  `scripts/assert-local-db.sh`. `build` runs `prisma generate && prisma migrate
  deploy && next build`.
- `pnpm-workspace.yaml` / `pnpm-lock.yaml` — pnpm 11 workspace + lockfile.
- `prisma.config.ts` — Prisma CLI config (schema location, seed entry).
- `playwright.config.ts` — E2E config; `webServer` runs `pnpm dev`; the `setup`
  project depends into every browser project. Fork insertion: points
  `ANTHROPIC_BASE_URL`/`RESEND_BASE_URL` at the local mock server used by
  `tests/e2e/target-ai-email.spec.ts`.
- `jest.config.ts` / `jest.env.setup.ts` — Jest test config.
- `next.config.js`, `tailwind.config.js`, `postcss.config.js`, `tsconfig.json`,
  `eslint.config.mjs` / `.eslintrc.json`, `components.json` (shadcn/ui).
- `docker-compose.dev.yml` — local Postgres + Inngest dev stack (`pnpm inngest:up`).
- `Dockerfile` / `docker-compose.yml` / `docker-entrypoint.sh` / `nixpacks.toml` /
  `e2b.toml` / `proxy.ts` — build/deploy/runtime plumbing.

## Conventions

- **Server vs client:** server actions live in `actions/`; shared UI in
  `components/`; route-local UI in `app/[locale]/**/components/`. Prisma `Decimal`
  values must pass through `serializeDecimals()` (`lib/serialize-decimals.ts`)
  before crossing into a Client Component.
- **Migrations:** every schema change is a committed Prisma migration
  (`prisma migrate dev` → CI `prisma migrate deploy`). Never `prisma db push`.
- TODO(rade): document the `lib/` module layout and any import-direction rules as
  they solidify.
