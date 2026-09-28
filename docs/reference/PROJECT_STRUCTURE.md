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
                        server/client boundary), integrations, utilities
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

## Key config files

- `package.json` — scripts (pnpm); note `db:*` commands are guarded by
  `scripts/assert-local-db.sh`. `build` runs `prisma generate && prisma migrate
  deploy && next build`.
- `pnpm-workspace.yaml` / `pnpm-lock.yaml` — pnpm 11 workspace + lockfile.
- `prisma.config.ts` — Prisma CLI config (schema location, seed entry).
- `playwright.config.ts` — E2E config; `webServer` runs `pnpm dev`; the `setup`
  project depends into every browser project.
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
