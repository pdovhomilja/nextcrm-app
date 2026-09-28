# Engineering Playbook

A portable, project-agnostic guide to the development workflow, tooling, testing
strategy, and working principles refined across prior projects. Drop this file
into the root of a new repo (or `docs/`) to bootstrap the same discipline from
day one.

> **How to use this file:** Read it top to bottom once. Then keep the two
> checklists at the end (Definition of Done, Pre-PR) close by — most of the rest
> is context that explains *why* those checklists exist. Adapt the stack section
> to whatever the new project actually uses; keep the principles as-is.

---

## 1. Tech Stack

The workflow below assumes (and is tuned for) this stack. Swap components as
needed — the *principles* travel even when the tools change.

| Layer | Technology |
|---|---|
| Hosting / deploy | Vercel (`crm.radeengineering.com`) |
| Framework | Next.js (App Router) |
| Relational data | Supabase-hosted PostgreSQL — **DB host only** (no Supabase Auth, no RLS, no PostgREST/`supabase-js`) |
| ORM + Auth | Prisma ORM + better-auth (authorization enforced in application code, server-side) |
| File / object storage | Cloudflare R2 (or S3-compatible) |
| Cache | Upstash Redis |
| Background jobs | Inngest |
| Email | Resend + React Email |
| Tests | Jest + ts-jest (unit), a DB-backed integration tier against real local Postgres, Playwright (E2E) |
| CI | GitHub Actions |
| Node / package manager | Node 22, pnpm 11 |

NextCRM is a **single-tenant** application: there is no tenant partitioning and
no `tenant_id`. Authorization is enforced entirely in application code (Prisma +
better-auth) on the server — there is no Row-Level Security to fall back on, so
**every query is scoped by hand** (see §9).

**Vercel platform notes** (correct as of 2026, override older assumptions):

- **Do not reach for `runtime = 'edge'` by default.** Fluid Compute (the
  default Node.js runtime) runs in the same regions at the same price with full
  Node.js APIs, longer durations, and reduced cold starts. Streaming / SSE / AI
  token streaming all work on Node.js — they are **not** Edge-exclusive.
- Middleware supports full Node.js (Fluid Compute), not edge-only.
- Default function timeout is 300s; Node.js 24 LTS is the default runtime.
- Vercel Postgres / KV are retired — provision databases via the Vercel
  Marketplace or use Supabase/Upstash directly.
- Prefer `vercel.ts` (`@vercel/config`) over `vercel.json` for typed,
  dynamic project config when config gets non-trivial.

---

## 2. The Environment Model (3-tier)

Changes always flow **left to right**, never backward. The fork runs a 3-tier
model:

```
   DEV (local)               QA                            PRODUCTION
   ───────────               ──                            ──────────
   Supabase CLI stack        Supabase-hosted QA DB         Supabase-hosted prod DB
   (supabase start, :54322)  Vercel Preview scope          Vercel Production scope
   Docker :5433 = fallback   Fixed `qa` branch pointer     crm.radeengineering.com
   Hot reload, fast loop     Shared stable QA preview      Gated promote only
   Seed: pnpm db:seed        (re-seed only when needed)    Never auto-touched
```

> **DEV database (hybrid):** the canonical local DB is the **Supabase CLI stack**
> (`npx supabase start`, :54322) for parity with hosted Supabase; the Docker `:5433`
> compose (`pnpm db:up`) is left untouched as a fallback. We do not repoint the
> `db:*` scripts (avoids churning upstream's `package.json`). Full setup:
> `docs/guides/platform/LOCAL_DEV_GUIDE.md`.

`main` is the trunk: PRs merge into it, but **`main` does not deploy**. QA is a
fixed `qa` branch pointer that Vercel builds as a Preview; PRODUCTION is reached
only by a gated promote.

**Golden rules:**

1. **Everything is proven on DEV (local) first**, then QA, then PRODUCTION.
2. **Migrations reach QA and PRODUCTION only through the workflows**
   (`migrate-qa.yml`; `promote-production.yml` → `migrate-production.yml`) — never a
   manual apply, connector, or MCP apply from a machine. Those workflows run
   `prisma migrate deploy` against the Supabase **session pooler**. And **never
   dev-push** — a dev-time schema *sync* that skips migration files (in this stack,
   `prisma db push`): every schema change is a committed Prisma migration file under
   `prisma/migrations/`, authored with `prisma migrate dev`, in every system and
   environment. `prisma db push` is **banned** in this repo.
3. **Env vars are environment-scoped.** A secret set for Preview (= QA) is not
   automatically in Production. Verify scope before assuming a value exists
   (see §9 and §11).

> **Intended design note:** the WS3 promotion workflows (`migrate-qa.yml`,
> `migrate-production.yml`, `promote-production.yml`) are the *target* design and
> do **not** exist in the repo yet. Until they land, treat this section as the
> contract they must satisfy — never hand-apply a migration to a hosted DB in the
> meantime. One trap to design around: **a push made with the default
> `GITHUB_TOKEN` does not trigger another workflow** — so a workflow that advances
> the `qa` (or `production`) branch will not, by itself, fire the deploy/migrate
> workflow watching that branch. Use a PAT/app token (or `workflow_run`/explicit
> dispatch) when one workflow must trigger the next.

**For the hands-on mechanics** — fresh-clone setup, the daily start/stop loop
(`pnpm db:up` / `pnpm inngest:up`), and the seed commands — see
`docs/internal/aqunama-setup-runbook.md`.
<!-- TODO(rade): confirm/replace this runbook path if the fork adds a dedicated LOCAL_DEV_GUIDE and CI_AND_ENVIRONMENT_DESIGN under docs/guides/. -->


**Migration / seed promotion workflow** (the order matters):

```
# 1. DEV (local) first — always
pnpm exec prisma migrate dev --name <change>   # author the migration + apply to your local DEV DB (Supabase :54322 or Docker :5433)
pnpm db:seed                                   # seed local from the single-source seed script (guarded)
#    → verify the change works locally (app + tests)

# 2. THEN QA — automatically, after the PR MERGES
#    migrate-qa.yml runs `prisma migrate deploy` against the Supabase QA DB and advances `qa`.
#    Migrations reach hosted DBs ONLY through the workflows — never a manual apply.
#    Re-seed QA only if the migration actually needs it.

# 3. THEN PRODUCTION — via the gated promote (promote-production.yml → migrate-production.yml)
```

- **`pnpm db:migrate` / `pnpm db:seed` / `pnpm db:reset` are guarded** by
  `scripts/assert-local-db.sh`, which refuses to run when `DATABASE_URL` points at
  anything other than a local host (localhost / 127.0.0.1 / ::1). This is what stops
  a forgotten remote `DATABASE_URL` from seeding demo data (or replaying migrations
  over drift) into a shared DB. `pnpm db:reset` recreates the local Docker Postgres
  volume, re-migrates, and re-seeds.
- `prisma migrate deploy` applies **all** pending migrations in order — often
  including already-merged "catch-up" migrations from other branches, not just your
  PR's. Read the pending set before applying it to any shared DB.
- **Additive-first, destructive-last.** Split a schema change so the additive
  migration (new columns/tables, backfill) ships and deploys before the destructive
  one (drops, NOT NULL tightening) — so a rollback window exists and a mid-deploy old
  build still runs against the new schema.
- **Use the Supabase *session* pooler for migrations, not the transaction pooler
  or the direct host.** GitHub Actions runners and Vercel functions are
  IPv4-only, while the direct Postgres host is IPv6 — so a direct-host
  `DATABASE_URL` that works from an IPv6 laptop fails from CI/Vercel. The session
  pooler is IPv4-reachable and (unlike the transaction pooler) supports the
  session-level operations `prisma migrate deploy` needs.

**Production migrations** reach prod **only** through
`migrate-production.yml` (WS3, intended design): it runs after CI passes and a promote
is requested, checks whether migration files changed, then `prisma migrate deploy`
against the prod Supabase session pooler — forward-only, gated by a GitHub
`production` environment. No developer ever applies a migration to prod from a
machine.

---

## 3. Git & GitHub Workflow

These are hard rules, not preferences.

- **Never commit directly to `main`** (or any repo's default branch). This
  overrides any looser guidance. If work has started on `main`, create a feature
  branch **before** the first commit.
- **All changes reach `main` only via a pull request** — including docs-only and
  "trivial" changes. There is no small-enough exception. **`qa` and `production` are
  fixed branches too:** `qa` is force-updated by `migrate-qa.yml` (or a manual
  pre-merge force-push), and `production` is advanced only by the promote workflow —
  never commit or push to either by hand.
- **Commit locally as you work; do NOT `git push` without explicit permission.** A
  push triggers CI — and on `qa`/`production`, deploys and DB migrations — so it is an
  outward, cost-incurring action. Ask first. "Done" means merged-and-green via the
  proper path, not committed-locally-and-pushed.
- **After a PR merges, clean up:** `git checkout main && git pull`, then
  `git branch -d <branch>` (safe-delete). The remote branch auto-deletes on merge —
  don't leave stale local branches around.
- Use the `gh` CLI for GitHub operations (PRs, issues, checks).
- **Interactive git flags are unavailable in agent environments** (`git rebase
  -i`, `git add -i`) — avoid them.
- **This repo is a fork of `pdovhomilja/nextcrm-app`.** Pull upstream changes only
  through the sync lane — `scripts/sync-upstream.sh` — never by ad-hoc merging
  upstream into `main`. `.github/workflows/upstream-drift.yml` flags divergence,
  `.github/workflows/guardrails.yml` + `scripts/check-invariants.sh` enforce the
  fork's invariants on every PR, and fork-specific deviations from upstream are
  recorded in `CUSTOMIZATIONS.md` (keep it current when you diverge).

**Branch naming** — use conventional prefixes:

```
feat/<slug>      fix/<slug>       chore/<slug>
docs/<slug>      refactor/<slug>  test/<slug>
```

**Commit messages** — conventional commits (`feat(scope): …`, `fix(scope): …`).
When authored with an AI agent, end the commit body with a co-author trailer and
PR bodies with a generation note, per project convention.

---

## 4. The Pull-Request Procedure

The canonical order is **implement → deep review → fix findings → open PR**.
Reviewing *after* merge turns every finding into a follow-up PR instead of a
change to the original — so the review happens **before** the PR is opened.

```
1. Implement on a feature branch.
2. Deep review the diff (see §6). Scale the review to the risk.
3. Fix the findings.
4. Run quality gates locally:
      pnpm lint
      pnpm exec tsc --noEmit          # typecheck (no dedicated script; matches CI)
      pnpm exec jest --coverage       # coverage run — NOT bare `pnpm test`; see §7
      # plus the DB-backed integration suites if migrations / authorization / data access changed:
      pnpm exec jest __tests__/invoices/lifecycle.test.ts
5. Confirm docs are in sync (see §8).
6. Open the PR with gh, writing the description in the house style. Let it be
      merged — do not push to `main`.
7. Watch CI to completion, pinned to the pushed commit SHA (see §7).
```

**When to review vs. when it's overkill:** the test is *"does this change carry
NEW risk?"* A change to authorization scoping, a public route, an auth flow, or a
user-facing money path warrants a full pass. A pure rename with no behavioural
change, or a docs-only follow-up, does not.

---

## 5. Skills & Reusable Workflows

Skills are packaged, repeatable procedures. Two families:

**Project skills** (checked into `.claude/skills/`, tuned to this repo):

- `ship-phase` / `ship-pr` — complete a unit of work: update docs, run quality
  checks, commit, push, open the PR.
- `deep-review` — thorough, stack-specific code review (see §6).
- `fix-ci` — diagnose a failing CI run, propose a fix, verify locally, push
  until green.

**Superpowers** (generic engineering discipline) — a **global, user-scoped
plugin**, installed once per machine (not per-repo). Install via `/plugin` in an
interactive Claude Code terminal → the `superpowers` plugin from the
`claude-plugins-official` marketplace; verify the process skills (brainstorming,
systematic-debugging, test-driven-development, verification-before-completion)
appear in the session's skill list.

- `brainstorming` — use before any creative/build work to explore intent and
  requirements before implementation.
- `systematic-debugging` — use before proposing any fix for a bug or test
  failure.
- `test-driven-development` — write the test before the implementation.
- `verification-before-completion` — run the verification commands and confirm
  the output *before* claiming anything is done.
- `writing-plans` / `executing-plans` — for multi-step work.
- `using-git-worktrees` — isolate feature work.

**Precedence when they overlap:** project skills win on repo-specific mechanics
(doc locations, merge/PR steps, review content, stack details). Superpowers wins
on generic discipline (how to debug, how to plan, how to verify). Process skills
set the approach first; implementation skills carry it out.

**Rule:** when a workflow is invoked by name (e.g. a `/slash-command`), run the
actual skill — never substitute a hand-rolled approximation. If a project skill
is missing on a branch, merge `main` to pick it up rather than rebuilding it.

---

## 6. Code Review Dimensions

A deep review evaluates the diff across these axes, in priority order:

1. **Security** — authn/authorization gaps, injection, secrets in code,
   **missing or wrong per-query authorization scoping** (there is no RLS to fall
   back on — every query must be scoped server-side by hand), SSRF, unsafe
   deserialization, missing server-side feature gates (client-side gating is UX
   only, never enforcement).
2. **Correctness** — logic bugs, race conditions, null/undefined handling, error
   paths, off-by-one, incorrect assumptions about data shape.
3. **Efficiency & maintainability** — N+1 queries, needless re-renders, dead
   code, over-abstraction, readability, naming that matches surrounding code.
4. **Best practices & standards** — framework idioms, project conventions,
   consistent patterns with the existing codebase.

**Review mechanics:**

- Scale the review to the change. For a large diff, run **parallel passes per
  dimension** (security / correctness / docs-sync) rather than one linear pass.
- Every finding needs a concrete failure scenario (inputs/state → wrong
  output/crash), not a vague smell.
- Match the surrounding code's comment density, naming, and idioms when
  suggesting changes — new code should read like the code around it.

---

## 7. Testing Strategy

Three tiers, each catching a different class of failure. **They are not
interchangeable.**

### Unit (Jest)

Fast, isolated, heavily mocked — Prisma is mocked into a plain object, so nothing
touches a real database. The trap: a mocked Prisma client **cannot observe a
missing authorization scope at all** — a query that forgot its `where` guard
returns whatever the mock is told to return, identical to a correctly-scoped one.
Unit tests verify *logic*, not *authorization*. In this repo the unit suites are
everything jest runs with the DB-backed suites excluded
(`pnpm exec jest --testPathIgnorePatterns "__tests__/invoices/lifecycle"`).

### DB-backed integration (against real local Postgres)

The tier that runs Prisma against a **real** Postgres — the only place a migration,
a Prisma constraint, or a per-query authorization scope is exercised end to end.
Suites that need a database live under `__tests__/invoices/` (currently
`lifecycle.test.ts`); keep that path convention and the CI job's test list in sync
when you add one.

- **Run it whenever you touch migrations, authorization scoping, or server-side
  data access.** It needs a running local Postgres (`pnpm db:up`) with migrations
  applied (`pnpm db:migrate`).
- Because there is **no RLS**, an authorization bug does not surface as a denied
  query — it surfaces as **rows that should not be visible coming back**. Assert on
  the *actual rows returned* for a scoped caller, not merely that the call didn't
  throw. Asserting the absence of an error is the single most common way an
  authorization regression ships green.
- When a security fix changes behaviour, **invert** the existing characterisation
  test (assert the new correct behaviour) — don't delete it.
- This tier maps to the CI `integration` job (fresh pgvector Postgres → `prisma
  migrate deploy` → the DB-backed suites).

### E2E (Playwright)

Full-stack, real browser, real (dev) database. Covers the flows a user actually
performs. Common patterns to codify early:

- **RSC streaming trap** — navigate with `{ waitUntil: 'commit' }` then
  explicitly wait for hydration, rather than assuming the page is interactive on
  load.
- Use `{ times: 1 }` on one-shot route mocks so later navigations hit the real
  route.
- Mind **cleanup order** with better-auth user foreign keys — delete dependent
  rows before the user row, or the delete fails on the FK constraint.
- Watch the single-row-query trap (a `findFirst` that silently returns the first
  of several matches) and the `deleted_at` vs `cancelled_at` silent-filter trap
  (see §9).
- Tests that assert auth/logout behaviour must use a **throw-away user**, never
  a shared admin. The E2E seed provisions an admin user for `auth.setup` via
  `pnpm exec prisma db seed`.
- Keep a doc of these patterns — this kit ships `docs/testing/e2e-patterns.md`
  — and read it before writing or debugging any E2E test.

### Coverage & CI discipline

- **New logic ships with tests; prefer TDD** — write the failing test first (a bug
  fix reproduces the bug first). Cover behavior and edge cases, not line count.
  Can't unit-test it? Name the tier that does, or log a Known Gap — never ship
  untested logic silently.
- **Run coverage explicitly with `pnpm exec jest --coverage`, not bare
  `pnpm test`.** Bare `pnpm test` (= `jest`) can be green while telling you nothing
  about coverage.
  <!-- TODO(rade): no coverage threshold is wired into jest config / CI yet; decide whether to enforce a floor and gate on it. -->
- **Verify every regression test by reverting its fix.** Restore the changed
  file to its pre-fix state, confirm the new test *fails*, then restore the fix.
  A test that still passes with the fix removed is documentation, not a guard.
  - When reverting to verify, **do not** `git checkout -- <file>` on an
    uncommitted branch — that reverts to `main` and wipes your other edits. Use
    a reversible toggle (a stash, or an in-place edit you undo) instead.
- **After every push, watch CI to completion before reporting done.** Pin the
  watch to the pushed commit SHA — `gh run list --limit 1` can return a stale
  prior run. Never say "done" without confirming CI passed for *your* commit.
- If CI grows a `pnpm audit --audit-level=high --prod` gate, it can fail a branch
  for a newly-published transitive advisory unrelated to your diff (it fails on
  `main` too). Fix these in a **separate deps PR**, don't fold the bump into a
  feature PR.

**The pipeline itself** lives in `.github/workflows/ci.yml`: a `fast` job (`prisma
generate` → `tsc --noEmit` typecheck → unit `jest` with DB suites excluded), an
`integration` job (fresh pgvector Postgres → `prisma migrate deploy` → the
DB-backed suites), a `build` job (the production build: `prisma generate` +
`prisma migrate deploy` + `next build`), and an `e2e` job (Playwright against a
migrated + seeded Postgres). Two rules that keep it honest:

- **The production build is the only step that runs `next build`** — lint,
  typecheck, and jest all pass on a client component importing a server-only
  module, but the build fails; without this step a failed deploy is the first
  signal.
- **A required check must always run.** A required check that a `paths:` filter
  can skip blocks the PR forever (or gets branch protection quietly disabled). If
  you add a path filter, make the skip branch still emit a passing run. Likewise,
  **renaming a CI job means updating the branch-protection required-check list** —
  a required check that no longer exists blocks every PR.

---

## 8. Documentation Sync

Docs are part of the change, not an afterthought.

- **When editing any spec/doc, update ALL related files before reporting done.**
  Identify the full set that must stay in sync — typically: the top-level
  overview/blueprint, the relevant spec section(s), the data-model doc, the
  phase/roadmap doc, the manual-testing doc, and the E2E-patterns doc. Never edit
  one in isolation and call it complete.
- The **testing docs and data-model docs are the usual blind spots** — check
  them explicitly on every change. On a fork, `CUSTOMIZATIONS.md` is a third blind
  spot: when a change deepens (or removes) a deviation from upstream `nextcrm-app`,
  update it in the same PR.
- **Manual-test ↔ E2E parity:** every manual-testing checklist should have
  matching automated E2E specs covering the same flows (not just role-gating).
- Before opening a PR, walk the full doc-sync set and confirm each file is
  either updated or explicitly N/A.
- **This section covers *when* to update docs. For *how to write them well*** —
  the house style, Lessons Learned, Known Gaps, and where a given fact belongs —
  see `docs/guides/process/DOCUMENTATION_GUIDE.md`.

---

## 9. Data Access & Traps (Prisma + better-auth)

NextCRM is **single-tenant**, and Supabase is the **DB host only** — there is no
Row-Level Security, no PostgREST, no `supabase-js`, and no tenant partitioning.
That has one dominant consequence: **application code is the authorization
boundary, and there is nothing underneath it to catch a mistake.** The whole of
this section follows from that.

- **The application is the enforcement boundary — scope every query by hand.**
  Authorization lives in server-side code (Prisma queries guarded by better-auth
  session/permission checks), not in the database. Every read and write must
  filter to what the current caller is allowed to see (owner / assignee /
  permission), because a forgotten `where` clause returns real rows — there is no
  RLS to deny it. Client-side gating is UX only and is never the security boundary.
- **Soft deletes:** tables that support them use `deleted_at`; application queries
  filter `deleted_at IS NULL` (Prisma: `where: { deleted_at: null }`). Never
  hard-delete data that should be soft-deleted.
  - **Silent-filter trap (portable):** some entities use a `status` /
    `cancelled_at` lifecycle instead of a `deleted_at` column. Adding
    `deleted_at: null` to a query against a model that has no such field is a schema
    error at author time with Prisma (unlike a raw REST filter, which would return
    zero rows silently) — but the *conceptual* trap survives: filtering on the wrong
    lifecycle field silently hides or reveals rows. Know which lifecycle a model
    uses before you filter it.
- Write **audit-log entries for all significant state changes** (issue, cancel,
  status transitions, deletions).
- **Single-row queries:** Prisma `findUnique` requires a unique field; `findFirst`
  returns the **first** match of possibly many under whatever ordering applies — so
  code that treats its result as "the one row" misbehaves once real data has
  duplicates. Use `findUnique` on a genuinely unique key, or make the `where`
  guarantee ≤1 row before treating the result as singular.
- **`serializeDecimals()` at the server→client boundary.** Prisma `Decimal` values
  (invoice amounts, line totals) are not plain JSON and break when passed from a
  Server Component / server action into client code. Run results through
  `serializeDecimals()` (`lib/serialize-decimals.ts`, and `serializeDecimalsList()`
  for arrays) before returning them across that boundary — see the invoice actions
  under `actions/invoices/` for the pattern. Forgetting this is a runtime
  serialization error, not a compile error.
- Porting exact algorithms (normalization, hashing, ID derivation, etc.) from a
  prior system must be **byte-for-byte faithful** — silent drift becomes a
  data-integrity bug, not a crash.
- **Feature gates / authorization are enforced server-side.** Client-side gating
  is UX only and must never be the security boundary.

---

## 10. API & Feature-Gate Conventions

- Version API routes under a stable prefix (e.g. `/api/v1/…` for the main
  app-facing surface). Keep auth infrastructure routes (`/api/auth/…`) and the
  Inngest endpoint (`/api/inngest`) separate and exempt from the version prefix.
- **Feature gates are enforced server-side.** Client-side gating is UX only and
  must never be the security boundary.

---

## 11. Secrets & Environment Variables

- **Never modify, remove, or re-add a secret or env var without first confirming
  the correct value with the human.** Applies to `vercel env` commands, `.env.*`
  files, and Supabase config alike.
- **Do not assume local `.env.*` files are authoritative.** Values in Vercel or
  Supabase may have been set intentionally for reasons not visible in the repo.
- Env vars are **scoped per environment** (Development / Preview = QA /
  Production). Before go-live, verify that production-only secrets (Inngest signing
  keys, R2/S3 credentials, Resend keys, DB pooler URL, webhook signing secrets) are
  actually present in the **Production** scope — a value in Preview does not carry
  over.
- **A newly-required env var breaks Vercel while CI stays green.** CI supplies its
  own inert dummy env (see `ci.yml`), so a new `process.env.X` your code now reads
  passes every check — then the Vercel build (or runtime) fails because the var was
  never added to the Preview/Production scope. When you introduce a required env
  var, add it to the Vercel scopes in the same change; don't rely on CI to catch it.
- **Environment-scoped GitHub secrets are invisible without an `environment:` key.**
  A workflow job that needs a secret bound to the GitHub `production` environment
  must declare `environment: production`, or the secret reads as empty and the step
  fails confusingly. (Relevant to the WS3 migrate/promote workflows.)
- Never put personal or sensitive data in URL params or query strings.

---

## 12. Working Principles

These are the behavioural defaults that make the rest of the workflow reliable.

- **Verify, don't assert.** Measure before you speak. Label every claim as
  *verified* (you ran it and saw the output), *reported* (a tool/agent said so),
  or *inferred* (you reasoned it). Evidence before assertions, always.
- **Confirm before a batch of changes.** For any non-trivial set of edits,
  enumerate what you'll change and get explicit confirmation before writing code.
  This is cheaper than unwinding the wrong direction.
- **Before building any new UI surface** (page, route, form, component): confirm
  the intended location (new standalone vs. integrated), enumerate every file
  and route that will be created or modified, and get confirmation first.
- **Before diagnosing a non-obvious failure:** list the top 3 likely causes
  ranked by probability and state how you'll verify each — *before* changing any
  code. Don't apply a fix until a cause is verified. (This is
  `systematic-debugging`.)
- **Communicate plainly.** Define any invented label or shorthand on first use.
  Lead with the problem before the jargon. Decide obvious-default choices
  yourself rather than manufacturing micro-questions — but surface genuine forks
  where the answer changes the outcome.
- **Report outcomes faithfully.** If tests fail, say so with the output. If a
  step was skipped, say that. State "done and verified" plainly only when it is.

---

## 13. Persistent Memory / Context

If your agent supports it, maintain a persistent memory of hard-won,
non-obvious facts — one fact per file, with a one-line index entry. Good
candidates:

- **User/project profile** — who's working, constraints, goals not derivable
  from the code.
- **Feedback** — corrections and confirmed approaches, each with *why* and
  *how to apply*. (Most of §12 originated as feedback memories.)
- **Locked decisions** — architectural choices that shouldn't be re-litigated.
- **Traps** — the silent-failure and version-drift class of bugs that cost hours
  the first time.

Don't memorize what the repo already records (code structure, git history,
`CLAUDE.md`). Memorize what was *non-obvious* and would cost time to rediscover.

---

## 14. Checklists

### Definition of Done

- [ ] Change implemented on a feature branch (never `main`).
- [ ] Deep review completed and findings fixed — **before** the PR.
- [ ] `pnpm lint` + `pnpm exec tsc --noEmit` pass.
- [ ] `pnpm exec jest --coverage` passes (not just bare `pnpm test`).
- [ ] DB-backed integration suites run if migrations / authorization / data access
      changed, asserting on the **actual rows returned** for a scoped caller.
- [ ] New regression tests verified by reverting the fix.
- [ ] Docs synced (full doc-sync set walked, each updated or N/A; `CUSTOMIZATIONS.md`
      too if a deviation from upstream changed).
- [ ] Committed **and pushed**; change confirmed on the remote.
- [ ] PR opened via `gh`; CI watched to green, pinned to the commit SHA.
- [ ] Migrations, if any: reach QA/PROD **only via the workflows** (`migrate-qa.yml`;
      promote → `migrate-production.yml`) after merge — never a manual `prisma migrate
      deploy` (or, banned outright, `prisma db push`) against a hosted DB, never
      before merge.

### Pre-PR quick gate

```bash
pnpm lint && pnpm exec tsc --noEmit && pnpm exec jest --coverage
# plus, if migrations / authorization / data access touched:
pnpm exec jest __tests__/invoices/lifecycle.test.ts   # DB-backed suites (needs pnpm db:up + pnpm db:migrate)
```

---

*Adapt the stack and script names to the target project. Keep §3–§12 verbatim —
those are the parts that took real projects to learn.*
