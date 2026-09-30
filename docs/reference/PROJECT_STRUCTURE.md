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
                                URL-only for now (no sidebar entry).
  targets/[targetId]/components/
    TargetAiMenu.tsx            header "AI" dropdown (Enrich / Generate email /
                                Generate homepage [disabled, later phase])
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
