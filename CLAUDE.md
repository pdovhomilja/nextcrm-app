# Developer Guide (Agent Instructions)

> This file is loaded automatically at the start of every session and is the
> **authoritative** agent guide for this fork. Where it differs from `AGENTS.md`
> (an upstream-maintained file), **this file wins** — most importantly on the
> git/deploy workflow: this is the **Rade Engineering fork** on a 3-tier Vercel
> model, not upstream's `dev`→`main` Coolify flow. The imperative rules here are
> the summary; the guides under `docs/guides/` carry the rationale and detail.

**What this project is.** A fork of
[`pdovhomilja/nextcrm-app`](https://github.com/pdovhomilja/nextcrm-app) being
adapted into the **Rade Engineering CRM** (target: `crm.radeengineering.com`).
Keep fork divergence low and merge-friendly — see [`CUSTOMIZATIONS.md`](CUSTOMIZATIONS.md)
for every deliberate deviation and the upstream sync/contribute recipes.

**Adoption rollout status** (of the starter-kit ways-of-working):
- ✅ **Upstream-sync lane + guardrails** — `scripts/sync-upstream.sh`,
  `.github/workflows/guardrails.yml`, `upstream-drift.yml`, `scripts/check-invariants.sh`.
- ✅ **WS1 — conventions & guides** — this file + `docs/guides/`, `docs/reference/`, `docs/templates/`.
- ✅ **WS2 — skills** — `.claude/skills/deep-review`, `fix-ci`, `ship-phase`.
- ✅ **CI cost** — heavy jobs (`integration`/`build`/`e2e`) path-gated to code changes.
- ✅ **WS3 — 3-tier CI/CD** — `vercel.json`, `advance-qa.yml`, `promote-production.yml`, PR template (build-migrates: Vercel deploy applies migrations).
- ⏳ **WS4 — env & secrets** (`docs/reference/ENVIRONMENT_VARIABLES.md` + env-doc guard).

---

## Reference Docs — read the relevant one before the matching task

**This file is loaded every session. The guides below are NOT** — open the
relevant one *before* doing the matching work.

| Guide | Read it before… |
|---|---|
| `docs/guides/ENGINEERING_PLAYBOOK.md` | anything — the rationale behind every rule here. Skim first when onboarding. |
| `docs/guides/process/CI_AND_ENVIRONMENT_DESIGN.md` | anything touching environments, branches, Prisma migrations through CI, or the deploy/promote flow. |
| `docs/guides/platform/LOCAL_DEV_GUIDE.md` | setting up a fresh clone, starting the local stack, seeding, or force-pushing the `qa` branch. |
| `docs/guides/platform/SUPABASE_ON_VERCEL.md` | setting `DATABASE_URL`, choosing a pooler, or debugging a connection/pooler incident (`ENETUNREACH`, `EMAXCONNSESSION`, `57P01`). |
| `docs/guides/platform/ISR_AND_CACHING.md` | adding a cache/Upstash call, marking a route `force-dynamic`/`force-static`, or debugging an ISR 500 / `econnrefused` burst. |
| `docs/guides/process/PR_DESCRIPTION_GUIDE.md` | writing any PR description. |
| `docs/guides/process/DOCUMENTATION_GUIDE.md` | writing/updating any doc, a Lessons Learned entry, or a memory. |
| `docs/reference/LESSONS_LEARNED.md` | **append to it** whenever you solve a recurring-type issue; skim before debugging a familiar-smelling failure. |
| `docs/reference/PROJECT_STRUCTURE.md` | a structural change (new top-level dir, moved module, new route group) — update it in the same PR. |
| `docs/testing/e2e-patterns.md` | writing or debugging **any** Playwright E2E test. |
| `CUSTOMIZATIONS.md` | syncing upstream in, contributing back, or making any new fork-specific deviation. |

---

## Stack Reference

| Layer | Technology |
|---|---|
| Hosting / deploy | **Vercel** (Fluid Compute / Node.js runtime) |
| Framework | Next.js 16 (App Router), React 19 |
| Relational data | **Supabase Postgres** (DB host only) via **Prisma 7** (`@prisma/adapter-pg`, pgvector) |
| Auth | **better-auth** (application-level; bcrypt) — **not** Supabase Auth, **no RLS** |
| File storage | Cloudflare R2 / AWS S3 (`@aws-sdk/client-s3`) |
| Cache / rate-limit | Upstash Redis (`@upstash/redis`, `@upstash/ratelimit`) |
| Background jobs | Inngest |
| Email | Resend + React Email (+ nodemailer/IMAP) |
| Package manager | **pnpm 11** (Node 22) |
| Unit tests | **Jest** (+ ts-jest) · E2E: Playwright |
| i18n | next-intl |

**Vercel platform notes (2026):** Do NOT set `runtime = 'edge'` — Fluid Compute
(default Node.js) runs in the same regions at the same price with full Node.js
APIs and longer durations; streaming/SSE/AI-token streaming work on Node.js.
Node.js 24 LTS is default; function timeout is 300s. Prefer `vercel.ts` over
`vercel.json` for non-trivial config.

**Supabase is the database host only.** We keep Prisma as the ORM and better-auth
for login. There is no Supabase Auth, no RLS, no PostgREST/`supabase-js`. The
security boundary is **application code** (server-side checks in actions/route
handlers) — so scope every query by hand; there is no RLS to fall back on.

---

## Git & Workflow Conventions

- **Never commit directly to a fixed branch — `main`, `qa`, or `production`.** All
  three are protected. This overrides any looser guidance (and supersedes
  `AGENTS.md` §4, which describes the old upstream `dev`→`main` flow). How each updates:
  - **`main`** — the integration trunk. Reached **only via a PR** from a feature
    branch, including docs-only/"trivial" changes. `main` does **not** deploy
    (`vercel.json`). If work started on `main`, create a feature branch **before**
    the first commit.
  - **`qa`** — a fixed deploy pointer, **force-updated**: automatically by
    `advance-qa.yml` after CI passes on `main`, or manually
    (`git push origin <branch>:qa --force`) only to preview an unmerged branch.
    Maps to Vercel *Preview* at `qa.crm.radeengineering.com`. Never open a PR from/into it.
  - **`production`** — advanced **only** by `promote-production.yml` (the gated
    Promote button). Never push, commit, merge, or PR to it directly.
- **We do not use upstream's `dev` branch.** Feature → `main` (PR) → `qa` → `production`.
- **Commit locally as you work, but do NOT `git push` without explicit permission.**
  A push triggers CI — and on `qa`/`production`, deploys and DB migrations — so it
  is an outward, cost-incurring action. Ask before pushing. Local commits are cheap.
- **Pre-PR gate — two mandatory steps, in order, BEFORE opening the PR:**
  1. **Run the `deep-review` skill** and fix every finding, or
     defer to Known Gaps with a reason. Scale depth to risk (a money path, auth
     flow, public route, or migration warrants a full pass; a pure rename does not).
  2. **Complete the doc-sync walk** (see Documentation Sync) — including appending
     any recurring gotcha to `LESSONS_LEARNED.md`.
     Canonical order: **implement → deep-review → fix → doc-sync → open PR → CI green.**
- **Write PR descriptions in the house style** (`docs/guides/process/PR_DESCRIPTION_GUIDE.md`):
  conventional-commit title; fix = Symptom→Root cause→Fix→Test→Checks; feature =
  What→Trust boundary→Testing→Deep review→Docs synced; cite test totals; call out
  **Revert-verified** regression tests.
- **Package manager is pnpm** — `pnpm install --frozen-lockfile` in CI. Never `npm`/`yarn`.
- **Case matters in CI (Linux) even though macOS ignores it.** Match import path
  casing to the real filename exactly, or it fails only in CI.
- **After an approved push, watch CI to completion before reporting done.** Pin the
  watch to the pushed commit SHA. Never say done without confirming CI passed for *this* commit.
- **Once a PR merges, clean up the local branch:** `git checkout main && git pull`,
  then `git branch -d <branch>` (safe-delete). The remote branch auto-deletes on merge.
- Conventional branch prefixes (`feat/`, `fix/`, `chore/`, `docs/`, `refactor/`,
  `test/`) and conventional commit messages. Use the `gh` CLI for GitHub ops;
  interactive git flags (`rebase -i`, `add -i`) are unavailable.
- **`release-please` runs on `main`** for version bumps + `CHANGELOG.md`. Don't
  hand-edit the version field or changelog; production still ships via the Promote
  button, not release tags.

### Upstream (fork hygiene)
- **Never merge upstream straight into `main`.** Use `bash scripts/sync-upstream.sh`
  (merges on your workstation, opens a PR so CI + Guardrails validate before `main`).
- **Contribute back from a clean upstream base**, not this customized `main`:
  `git switch -c fix/x upstream/main` → isolated change → PR to `pdovhomilja/nextcrm-app`.
  Full recipes in `CUSTOMIZATIONS.md`.

---

## Testing

- **New logic ships with tests; prefer TDD.** Write the failing test first, then
  the implementation; for a bug fix, the test reproduces the bug before you fix it.
- **Three tiers (mirroring `ci.yml`):**
  - **Unit (Jest, mocked)** — fast; DB is mocked. Run: `pnpm test` (or
    `pnpm exec jest`). CI runs these in the `fast` job, excluding DB-backed suites.
  - **DB-backed integration (Jest + real Postgres)** — suites that need a real
    database (convention: under `__tests__/invoices/`) run in CI's `integration`
    job against a fresh `pgvector` DB with all migrations applied.
  - **E2E (Playwright)** — read `docs/testing/e2e-patterns.md` first. CI's `e2e`
    job seeds an admin user and runs an Inngest dev server. Mind RSC streaming
    hydration waits, `{ times: 1 }` one-shot mocks, auth-user FK cleanup order,
    and `maybeSingle()` multiple-row traps.
- **Verify every regression test by reverting its fix.** Toggle the fix off,
  confirm the new test *fails*, restore. A test that passes with the fix removed is
  documentation, not a guard. Do **not** `git checkout -- <file>` to revert on an
  uncommitted branch — use a reversible toggle or stash.
- **`pnpm lint` is `eslint . --max-warnings=0`.** Run lint + typecheck
  (`pnpm exec tsc --noEmit`) before pushing.

---

## Data & Prisma Conventions

- **The security boundary is application code, not the database.** No RLS: every
  server action / route handler must scope its own queries (by user/owner) and
  enforce authorization server-side. Client-side checks are UX only.
- **Prisma `Decimal` is not serializable across the server→client boundary.** Wrap
  Prisma results with `serializeDecimals()` / `serializeDecimalsList()` from
  `lib/serialize-decimals.ts` in every server action and Server Component that
  passes Decimal-bearing objects to Client Components. Symptoms otherwise: silent
  `undefined` returns, hydration mismatches, broken `router.push()` after an action.
- **Soft deletes:** tables use `deleted_at`; queries filter `WHERE deleted_at IS NULL`.
  Don't hard-delete data that should be soft-deleted. (Trap: filtering
  `deleted_at IS NULL` on a table with no such column returns zero rows silently —
  know which tables use `status`/lifecycle instead.)
- **Write audit-log entries for significant state changes.**
- `.maybeSingle()`-style single-row reads throw/return null on **multiple** rows —
  use only where the filter guarantees ≤1 row.
- **Feature gates are enforced server-side;** client-side gating is UX only.

---

## Environments & Migrations

> **3-tier: DEV → QA → PRODUCTION.** DEV = your local machine (local Supabase
> stack + Docker Inngest). QA = the fixed `qa` branch on the `nextcrm-qa` Supabase
> project at `qa.crm.radeengineering.com` (Vercel *Preview*). PRODUCTION = the
> `production` branch on `nextcrm-prod`. Canonical detail in
> `docs/guides/process/CI_AND_ENVIRONMENT_DESIGN.md`.

- **Prove everything on DEV first**, then QA, then PRODUCTION. Changes flow
  **left → right, never backward** — no hand-applied change to a hosted environment.
- **NEVER `prisma db push`** — every schema change is a committed migration file
  (`pnpm exec prisma migrate dev` to author). `db push` drifts the schema and
  leaves CI nothing to apply; the Guardrails invariant check forbids it in scripts,
  and the schema/migration-sync check fails a schema edit that ships without a migration.
- **DEV database (hybrid):** the canonical local DB is the **Supabase CLI stack**
  (`pnpm dlx supabase start`, :54622 — ports pinned to the `546xx` block in
  `supabase/config.toml` to coexist with other local Supabase stacks) for hosted
  parity; the Docker `:5433` compose (`pnpm db:up`) is an untouched upstream fallback.
  We do **not** repoint the `db:*` scripts (that would churn upstream's `package.json`).
- **DEV (local) loop:** `pnpm dlx supabase start` (or `pnpm db:up` for the Docker
  fallback) → set `DATABASE_URL` (→ `127.0.0.1:54622`) → `pnpm db:migrate` →
  `pnpm db:seed` → `pnpm dev`. `pnpm db:migrate`/`db:seed` follow `DATABASE_URL`;
  `scripts/assert-local-db.sh` refuses them when `DATABASE_URL` points at a non-local
  host (it allows any `127.0.0.1`/`localhost`/`::1`) — respect it.
- **Migrations reach QA and PRODUCTION only through a deploy — never a manual
  apply, DB connector, or MCP apply from a machine.** NextCRM's build runs
  `prisma migrate deploy`, so the **Vercel deploy migrates its own database**:
  `advance-qa.yml` fast-forwards `qa` after CI on `main` → Vercel builds `qa` →
  migrations apply to `nextcrm-qa`. `promote-production.yml` (gated) fast-forwards
  `production` → Vercel builds `production` → migrations apply to `nextcrm-prod`.
  Only `qa`/`production` build (Vercel Ignored Build Step), so PR previews never
  migrate QA.
- **Migration-through-CI ordering:** **additive** changes go **migration-first**
  (migration PR lands in QA, then the code PR); **destructive** changes go
  **code-first / expand-contract** (stop using → deploy → drop later).
- **When a PR adds `prisma/migrations/`, remind the user after it merges** that the
  workflow will apply it — don't apply by hand and don't apply before merge.
- The seed script (`prisma/seeds/seed.ts`) is the **single source of truth** for
  seed data — don't hand-edit rows in one environment.

---

## Secrets & Environment Variables

- **Never modify, remove, or re-add a secret/env var without first confirming the
  value with the user.** Applies to Vercel env, `.env.*`, and Supabase config.
- **Don't assume local `.env.*` are authoritative** — Vercel/Supabase values may be
  set intentionally for reasons not visible in the repo.
- Env vars are scoped per Vercel environment: **Development** (DEV), **Preview**
  (**= our QA tier**), **Production**. Before go-live, verify production-only
  secrets exist in the **Production** scope.
- **A newly-*required* env var breaks every Vercel deploy while CI stays green** —
  CI builds with dummy env, so a required-env schema is first *actually* enforced on
  Vercel. Add later-phase keys as optional with a fail-closed consumer until the
  same PR that adds them to Preview+Production promotes them.
- Never put personal/sensitive data in URL params or query strings.

---

## Documentation Sync

- **When editing any spec/doc, update ALL related files before reporting done.**
  Walk the doc-sync set (overview/spec, data-model, phase/workstream specs,
  manual-testing doc, E2E-patterns, **PROJECT_STRUCTURE**, and — once WS4 lands —
  **ENVIRONMENT_VARIABLES**); confirm each updated or explicitly N/A. The **testing
  and data-model docs are the usual blind spots.**
- **`docs/reference/LESSONS_LEARNED.md` is a MANDATORY doc-sync target.** Every pass
  asks "what gotcha here is likely to recur, and is it captured?" — and appends it.
- **Specs follow phase → workstream → PR** and describe intent/scope/acceptance —
  **never implementation code**. Start from `docs/templates/`.
- **Manual-test ↔ E2E parity is BIDIRECTIONAL** — every manual step has a matching
  E2E spec and vice-versa; add the counterpart in the same PR.
- For *how* to write docs, follow `docs/guides/process/DOCUMENTATION_GUIDE.md`.

---

## Working Principles

- **Verify, don't assert.** Measure before you speak. Label claims *verified* (ran
  it, saw output), *reported* (a tool said so), or *inferred* (reasoned).
- **Confirm before a batch of changes.** Enumerate what you'll change and get
  explicit confirmation before writing code.
- **Before building any new UI surface** (page/route/form/component): confirm the
  intended location, enumerate every file/route created or modified, get confirmation.
- **Before diagnosing a non-obvious failure:** list the top 3 likely causes ranked
  by probability and how you'll verify each — before changing code.
- **Communicate plainly.** Define invented labels on first use; lead with the
  problem before the jargon. Decide obvious-default choices yourself; surface genuine forks.
- When a workflow is invoked by name (a slash command / skill), run the actual
  skill — never a hand-rolled approximation.

---

## Skills

Project skills in `.claude/skills/` (run the actual skill when invoked by name):
- **`deep-review`** — thorough pre-PR review (security, money paths, correctness). Step 1 of the pre-PR gate.
- **`ship-phase`** — finish a unit of work: deep review → doc-sync → checks → commit → push → PR.
- **`fix-ci`** — diagnose a failing CI run, fix, verify locally, push until green.

Superpowers process skills (brainstorming, systematic-debugging, TDD,
verification-before-completion) set the approach; project skills win on
repo-specific mechanics.

---

See `docs/guides/ENGINEERING_PLAYBOOK.md` for the full rationale behind every rule above.
