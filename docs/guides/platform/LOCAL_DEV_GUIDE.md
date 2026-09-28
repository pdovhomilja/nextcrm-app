# Local Dev & Onboarding Guide

Everything needed to go from a fresh clone to a running local stack, the daily
start/stop loop, the seed workflow, and the stable-URL `qa` branch. Operational
reference — for the *principles* behind the 3-tier model see
`docs/guides/ENGINEERING_PLAYBOOK.md` §2 and §11.

> This is the Rade Engineering CRM — a fork of `pdovhomilja/nextcrm-app`. The
> stack is **pnpm + Prisma + Docker**, with Postgres (Supabase) as the database,
> **better-auth** for auth, **Inngest** for background jobs, **Upstash Redis** for
> cache/rate-limiting, S3-compatible object storage (**SeaweedFS** locally, **R2** in
> the cloud), and **Resend** for email. There is **no Stripe** and **no Supabase Auth/RLS** — Supabase is used as a
> managed Postgres host only, single-tenant. Upstream-sync tooling
> (`scripts/sync-upstream.sh`, the guardrails workflows, `CUSTOMIZATIONS.md`) is
> covered separately; this guide is the day-to-day local workflow.

---

## Prerequisites

- **Node.js** (version pinned in `.nvmrc` / `package.json` engines — Node `>=22.12`)
  and **pnpm** (`>=10`; the repo pins `packageManager: pnpm@11.x`). Enable it with
  `corepack enable`. On **Windows**, plain `nvm` is Unix-only — use `nvm-windows`,
  `fnm`, or `volta` to honor `.nvmrc`.
- **Bash / POSIX sh** — the repo has shell scripts (e.g. `scripts/assert-local-db.sh`,
  run by `pnpm db:guard`). macOS/Linux have it; on **Windows** run them via **Git
  Bash** or **WSL** (not cmd/PowerShell).
- **Docker Desktop** — required for the local support services (Inngest, and the
  docker-compose pgvector Postgres) and for the Supabase CLI local stack.
- **Supabase CLI** — used to run the local Postgres that mirrors the hosted Supabase
  QA/prod build (see the DEV database note below). Run it with **`pnpm dlx
  supabase@2.118.0 …`** (or `npx supabase …`); a version-pinned `dlx`/`npx` invocation
  needs no global install. **On recent macOS the Homebrew formula is currently broken**
  (fails to build against the newer Command Line Tools), so prefer the `dlx`/`npx` path.
- **Vercel CLI** (`pnpm i -g vercel`) — for `vercel link` / `vercel env pull`.
- **`gh` CLI** — for the PR workflow.

---

## DEV database — the chosen approach (read before Part 1)

The fork runs its **DEV Postgres via the Supabase CLI local stack** (`pnpm dlx supabase
start`). This gives **parity with the hosted Supabase QA/prod** — same Postgres build and
the `pgvector` extension — so schema and vector behaviour match what runs in the cloud.

> **Ports are pinned to the `546xx` block** (`supabase/config.toml`, committed): DB
> **54622**, API 54621, Studio 54623, shadow 54620. The CLI's own defaults are `543xx` —
> we moved off them so this stack **coexists with other local Supabase projects** without
> port clashes. If you run several Supabase stacks, keep each on its own block.

Prisma's `DATABASE_URL` points at that local Supabase DB:

```
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:54622/postgres"
```

**Inngest still runs via `docker-compose.dev.yml`** (`pnpm inngest:up`), independent
of the database choice.

> **Two Postgres options coexist in the repo — know which one you're using.**
> NextCRM's existing `docker-compose.dev.yml` ships its **own** `pgvector` Postgres on
> host port **5433** (started by `pnpm db:up`), and the `db:*` scripts plus
> `scripts/assert-local-db.sh` were written around that container. The guard in
> `assert-local-db.sh` only checks that the host is `localhost`/`127.0.0.1`/`::1` (it
> does **not** pin a port), so `pnpm db:migrate` and `pnpm db:seed` work fine against
> the Supabase-local DB on 54622. But `pnpm db:up` / `db:wait` / `db:reset` drive the
> **5433 docker-compose container and its volume**, not the Supabase stack — don't mix
> them with the Supabase-local path.
>
> **Decision — hybrid (canonical DEV DB = the Supabase CLI stack on 54622).** We
> deliberately do **not** repoint `db:up`/`db:wait`/`db:reset` or `assert-local-db.sh`
> at 54622: those edits would churn upstream's hottest file (`package.json`) and the
> compose file on every sync. Instead — run `npx supabase start`, point `DATABASE_URL`
> at 54622 (the host guard already allows it), and use the Supabase CLI for lifecycle
> (`supabase stop`, `supabase db reset`). `pnpm db:migrate`/`db:seed` follow
> `DATABASE_URL` and work on either path; the `:5433` docker-compose Postgres stays
> **exactly as upstream ships it** as a fallback. See `CUSTOMIZATIONS.md`.

---

## Part 1 — Fresh-clone setup (one-time)

```bash
# 1. Clone and install
git clone git@github.com:<org>/nextcrm-app-re.git
cd nextcrm-app-re
corepack enable        # makes the pinned pnpm available
pnpm install

# 2. Env vars: start from the scaffold, then pull Development-scoped values
cp .env.example .env    # Prisma reads .env (NOT .env.local); .gitignore excludes .env
pnpm i -g vercel        # if not already installed
vercel link             # links this directory to the Vercel project
vercel env pull         # writes Development-scoped values into .env / .env.local
#    → vercel env pull ONLY ever writes Development values. Production
#      secrets are never pulled to a local machine. (Playbook §11.)

# 3. Start the local Supabase Postgres (Docker must be running)
npx supabase start      # boots local Postgres (+ pgvector) on port 54622
npx supabase status     # prints the local DB URL, ports, and Studio URL

# 4. Point DATABASE_URL at the LOCAL Supabase DB in .env (see the DEV database note):
#      DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:54622/postgres"
#    Everything else pulled from Vercel (Upstash Redis, Resend, MinIO, etc.) stays as-is.

# 5. Apply migrations, then seed dev data
pnpm db:migrate         # db:guard + `prisma migrate deploy` (applies all migrations)
pnpm db:seed            # db:guard + SEED_DEMO_DATA=1 `prisma db seed`

# 6. Start Inngest (background jobs) — separate, keep running
pnpm inngest:up         # docker-compose.dev.yml: Inngest dev server on http://localhost:8288

# 7. Start the dev server
pnpm dev                # → http://localhost:3000
```

**Why `DATABASE_URL` matters (step 4):** `pnpm db:migrate`, `db:seed` and `db:reset`
inherit whatever `DATABASE_URL` is active and refuse to run against a non-local host
(`scripts/assert-local-db.sh`, wired as `pnpm db:guard`). The `.env` line above keeps
them pointed at your local Postgres. Prisma loads `.env` via dotenv, which does **not**
override an already-exported `DATABASE_URL` — so an exported var wins over `.env`. If
you temporarily swap `.env` to a remote URL for read-only access, **swap it back before
any `db:*` command** or the guard will (correctly) refuse.

**Alternative — docker-compose Postgres instead of Supabase-local.** If you use the
repo's built-in pgvector container rather than the Supabase CLI stack, set
`DATABASE_URL="postgresql://nextcrm:nextcrm@localhost:5433/nextcrm"` and use
`pnpm db:up && pnpm db:wait && pnpm db:migrate && pnpm db:seed` (or the all-in-one
`pnpm db:reset`). See the DEV database note above for why the two paths don't mix.

### Logging in locally (email OTP — no inbox needed)

Auth is **email-OTP only** (better-auth; no password login). Locally **no real email is
sent** — `.env` ships a dummy `RESEND_API_KEY`, so the send silently no-ops. Two ways to
get the code:

1. **Server log (easiest).** Enter your email on `http://localhost:3000` and click
   **Send code**, then read the `pnpm dev` terminal for:
   ```
   [Auth] OTP for you@example.com (sign-in): 123456
   ```
   This line is printed only when `NODE_ENV !== "production"` (see `lib/auth.ts`); it
   never runs in a deployed build.
2. **Test endpoint (for scripts/E2E).** After requesting a code, fetch it — better-auth's
   `testUtils` plugin captures it in memory (non-prod only):
   ```bash
   curl "http://localhost:3000/api/auth/test-otp?email=you@example.com"   # → {"otp":"123456"}
   ```
   `test-otp` returns `404 No OTP found` if you haven't requested a code first, and is a
   `404` entirely in production.

The **first user to sign in is auto-promoted to admin** and set `ACTIVE` (real better-auth
`databaseHooks.user.create.after` → `lib/auth-hooks.ts`); everyone after that starts as a
pending `user`.

> **Inviting other users in dev.** Admin → Users → Invite creates the user as `ACTIVE`
> immediately, then tries to email them. With the dummy Resend key that email send throws,
> so the UI shows *"Failed to invite user"* — but **the user was already created** and can
> sign in via the OTP flow above. The invite email is only a notification; it carries no
> code or magic link. (Real invite delivery needs a working `RESEND_API_KEY`.)

---

## Part 2 — Daily start / stop loop

Once set up, the everyday loop is short. Keep the long-running terminals open for
the session.

**Startup:**
1. Launch **Docker Desktop**; wait for it to go solid.
2. **Database:** `npx supabase start` (Supabase-local path) — or `pnpm db:up` for the
   docker-compose Postgres.
3. **Inngest + local S3:** `pnpm inngest:up` brings up `docker-compose.dev.yml` — the
   Inngest dev server (dashboard `http://localhost:8288`; `pnpm inngest:logs` to tail)
   **and SeaweedFS**, the local S3-compatible store on `http://localhost:9000` (a
   one-shot `createbucket` container makes the `nextcrm` bucket + CORS on first run).
   MinIO's public Docker images were gated in 2025, so local object storage uses
   SeaweedFS; `lib/minio.ts` is generic path-style S3 and treats it identically.
4. **Dev server:** `pnpm dev`.
5. Verify the app at `http://localhost:3000`.

**Shutdown (before rebooting):**
1. `Ctrl+C` the dev server.
2. `pnpm inngest:down` — stops the Inngest container.
3. `npx supabase stop` (or `pnpm db:down`) — stops the DB container, **preserves** state.
4. Quit Docker Desktop.

**Notes:**
- Remote REST services (Upstash Redis, Resend) need no local process. Object storage
  **does** run locally (SeaweedFS, started by `pnpm inngest:up`); R2 is cloud-only (QA/prod).
- `npx supabase stop` preserves data; `npx supabase stop --no-backup` discards it for a
  clean slate next boot. For the docker-compose path, `pnpm db:reset` re-creates the
  container/volume and re-applies all migrations + seed from scratch — **local only,
  never against a hosted project.**

---

## Part 3 — Seed data workflow

- **Single source of truth:** all seed rows live in `prisma/seeds/seed.ts` (with
  supporting `currencies.ts` / `invoices.ts`), run by **`pnpm db:seed`**, which sets
  `SEED_DEMO_DATA=1` and calls `prisma db seed`. Never hand-edit rows per environment.
- **`pnpm db:seed`** → your local DB. Run **after `pnpm db:migrate`** on a fresh DB (or
  after `pnpm db:reset`, which wipes the docker-compose DB), or any time new seed rows
  are added.
- The seed is **guarded** (`db:guard`) so it only ever runs against a local host — the
  same guard that protects `db:migrate`/`db:reset`. `SEED_DEMO_DATA=1` deliberately
  defeats the seed's own "don't inject demo records" gate, which is exactly why the
  guard refuses to point it at a shared/remote DB.
- Seed order discipline: **DEV first** (migrate → seed → verify). QA is seeded as part
  of its own environment setup — see `docs/guides/ENGINEERING_PLAYBOOK.md` §2.

TODO(rade): document the QA seeding path (there is currently no `seed:qa` script — QA
gets demo data via `pnpm db:seed`/`prisma db seed` run against the QA DB by whatever
provisioning step owns it; confirm and record the exact mechanism).

---

## Part 4 — The `qa` branch (stable QA URL)

Vercel branch-alias URLs (`app-git-<branch>-team.vercel.app`) change with every
branch name, so E2E targets and manual-test bookmarks churn. A **long-lived `qa`
branch** pinned to a fixed Vercel deployment gives a **stable URL** to test against:
**`qa.crm.radeengineering.com`** (Vercel Preview).

### Normally, `qa` advances automatically

After CI passes on `main`, **`migrate-qa.yml` migrates the QA database (Prisma
`migrate deploy`) and fast-forwards `qa` to the tested commit** — you do **not** resync
it by hand. `qa` is always "the last good `main`." See
`docs/guides/process/CI_AND_ENVIRONMENT_DESIGN.md` §§3–4.

### Force-push a feature branch to `qa` for pre-merge testing

On-demand — when you want to exercise an UNMERGED feature branch against the real
Vercel environment before merging:

```bash
git push origin <your-branch>:qa --force
```

Vercel rebuilds (~30s); test at `qa.crm.radeengineering.com`. This is a **manual
testing step, not part of the PR flow** — the next merge to `main` auto-advances `qa`
and overwrites it. It **cannot leak to production**: the promote step refuses any `qa`
tip that isn't an ancestor of `main` (CI/env guide §5).

### Rules

- `qa` is a **throwaway deployment target** — never open a PR *from* it, never merge
  *from* it. **PRs always target `main`.**
- Only one branch can occupy `qa` at a time (fine for a solo project).
- The QA database must be seeded so the deployment has data (Part 3).

---

## Part 5 — Environment model & non-negotiables

Three isolated tiers (full detail in `docs/guides/ENGINEERING_PLAYBOOK.md` §2):

```
DEV (your machine)            QA (qa branch → qa.crm.radeengineering.com)   PRODUCTION (production branch)
Supabase CLI local Postgres   <project>-qa hosted Supabase (DB host only)   <project>-prod hosted Supabase (DB host only)
Upstash Redis (dev)           Upstash Redis (qa)                            Upstash Redis (prod)
Resend (dev)                  Resend (qa)                                   Resend (live sending)
```

**The boundary is absolute — production credentials never exist on a dev machine.**
Env vars are scoped per environment in the Vercel dashboard (Production / Preview /
Development, where **Preview = our QA tier**); the same name carries a *different
value per scope*. Hard rules:

1. **Production secrets live only in Vercel's Production scope** — never pulled
   locally, never in a `.env` file, PR, or message.
2. **The production `DATABASE_URL` (and `BETTER_AUTH_SECRET`) are Production scope
   only** — treat the prod DB connection string as a root credential.
3. **Migrations reach QA/production only via the CI workflows** (`migrate-qa.yml`,
   `migrate-production.yml`, each running Prisma `migrate deploy`) — never run
   `prisma migrate deploy` against a hosted DB from a laptop, and **never
   `prisma db push`** anywhere (create migrations with `pnpm exec prisma migrate dev`;
   the guardrails workflow fails a PR whose `schema.prisma` and `prisma/migrations`
   drift apart). Local → dev → qa → prod, one direction.
   - TODO(rade): record the exact repo/environment secret names the migration
     workflows consume (the QA and Production `DATABASE_URL` connection strings) once
     `migrate-qa.yml` / `migrate-production.yml` are added — they do not exist in the
     repo yet.
4. Never modify/remove an env var without confirming the value with the owner
   (playbook §11). **A newly-*required* env var that is added to code but not set in a
   Vercel scope breaks that environment's deploy even though CI is green** — CI runs
   with its own env, so it won't catch a missing Vercel-scoped var.
5. **Dev/QA email safety (implemented).** Set **`EMAIL_REDIRECT_TO`** in the
   Development + Preview (QA) scopes to a single test inbox and **every** outbound
   recipient is rewritten to it, so a dev/QA run can send real Resend email without
   reaching a real address (`lib/email/redirect.ts`, applied centrally in
   `lib/resend.ts` for transactional and in the campaign sender). Leave it **unset in
   Production**; it also never redirects a production deploy (`VERCEL_ENV`). This
   matters because QA shares the prod sending domains — a QA bounce/complaint would
   otherwise hurt the shared domain reputation. See
   `docs/reference/ENVIRONMENT_VARIABLES.md`.

---

## Part 6 — Provisioning & go-live (3-tier: DEV → QA → PRODUCTION)

One-time, when you're ready to stand up the hosted tiers. **Order matters** (the `qa`
domain can only be mapped after `qa` has deployed once). Full rationale in
`docs/guides/process/CI_AND_ENVIRONMENT_DESIGN.md` §§5, 10 and its Porting checklist.

**1. Create the fixed branches** (or let the workflows create them — `migrate-qa.yml`
force-updates `qa`, the promote workflow advances `production`). To create them up
front so Vercel can be configured:

```bash
git push origin main:qa            # create the fixed qa branch from main
git push origin main:production    # create the fixed production branch from main
```

**2. Supabase (DB host only)** — create the `<project>-qa` and `<project>-prod`
projects; note each project's connection string, co-located with the Vercel region.
Two pooler/connectivity traps to get right (CI/env guide §9):
- **Session pooler vs transaction pooler.** Prisma `migrate deploy` needs a **session**
  connection (the direct/session pooler, port 5432) — the **transaction** pooler
  (6543) does not support the prepared statements / advisory locks migrations use. The
  app runtime can use the transaction pooler. Give the migration workflow the session
  URL and the runtime the pooled URL.
- **IPv4 vs IPv6.** Use the **IPv4 shared-pooler** connection string — a direct
  db-host connection is IPv6-only on Supabase and won't resolve from IPv4-only runners.

**3. Vercel — deploy config** (Project → Settings):
- Confirm **`vercel.json`** (`git.deploymentEnabled.main: false`) is committed, so
  `main` never deploys (feature → `main` builds nothing; QA/prod deploy off the fixed
  branches).
- **Git → Production Branch = `production`** (not `main`).
- Push once so `qa` deploys, then **Domains →** map **`qa.crm.radeengineering.com`** to
  the `qa` branch (a fixed alias), and the production domain to `production`.
- **Environment Variables**, per scope: **Development** (DEV), **Preview** (= our QA
  tier → `<project>-qa`), **Production** (→ `<project>-prod`). Production-only secrets
  go in **Production** only.

**4. GitHub — arm the workflows** (Settings → Environments / Secrets, and rulesets):
- **QA** and **Production** environment secrets: the respective `DATABASE_URL`
  connection strings (session-pooler, per step 2) that `migrate-qa.yml` /
  `migrate-production.yml` consume — plus **required reviewers** on the Production
  environment (the human release gate).
  - TODO(rade): pin the exact secret names once the migration workflows land.
- **Branch protection on `production`:** allow the Actions bot / promote workflow to
  push; do **not** require a PR for it. Never open PRs into `qa` (force-updated).
- Mark `ci.yml`'s jobs as **required status checks**.
- Arm the promote/migrate workflows with the repo variable that gates production
  migrations (until set, promotion is inert).

**5. First release:** run the **Promote to Production** action (defaults to the `qa`
tip; a code-only fast-forward of `production` from `qa`, gated on the required
reviewer).

---

## Adding a new developer

1. Add to the app **GitHub repo**.
2. Add to the **Vercel project** (so they can `vercel env pull` dev values).
3. Add to any **shared dev** services (e.g. Upstash Redis) — **not** production. The
   local DB (Supabase CLI) and object store (SeaweedFS) run on their machine, no accounts.
4. Add to **Sentry** / observability, if used.
5. They follow **Part 1** above.
6. **No production credentials** — production access is deployment-only; the prod
   DB is reachable only via the migration CI workflow.

---

## Quick reference

```bash
# Daily
npx supabase start && pnpm inngest:up && pnpm dev

# Fresh DB / after a migration
pnpm db:migrate && pnpm db:seed
#   docker-compose path instead: pnpm db:reset  (recreate container + migrate + seed)

# Create a new migration from a schema.prisma change (never `prisma db push`)
pnpm exec prisma migrate dev --name <change>

# Pre-push gate (mirrors CI — run from repo root)
pnpm lint && pnpm test        # add `pnpm test:e2e` for Playwright

# Stable-URL QA (qa AUTO-advances after CI — this is manual pre-merge testing)
git push origin <your-branch>:qa --force   # test a feature branch at qa.crm.radeengineering.com
```
