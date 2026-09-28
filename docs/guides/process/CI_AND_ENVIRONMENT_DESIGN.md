# CI & Environment Design (portable reference)

> **What this is.** A self-contained description of this project's CI, environment,
> migration, and deploy design — with the *rationale* behind each decision — written
> so it can be lifted to another repo and reproduced. The in-place companions are
> `docs/guides/ENGINEERING_PLAYBOOK.md` §2 (the environment model) and
> `docs/guides/platform/LOCAL_DEV_GUIDE.md` (the operational how-to); this doc is the
> consolidated "why + how to rebuild it," ending in a **[Porting checklist](#porting-checklist)**.
>
> **This fork's shape (Rade Engineering CRM).** 3-tier — feature branches →
> `main` (integration trunk, **no deploy**) → `qa` (Vercel Preview,
> `qa.crm.radeengineering.com`) → `production` (gated). Migrations are **Prisma**
> (`prisma migrate deploy`), never Supabase-CLI or `prisma db push`. Supabase is the
> **Postgres host only** — Prisma + better-auth own the schema and sessions; there is
> **no** Supabase Auth, RLS, PostgREST, or `supabase-js`, and the app is
> **single-tenant** (no `tenant_id`). The 2-tier column is kept below purely as
> portable rationale — this fork runs the full 3-tier model.

---

## 0. Two-tier or three-tier? (decide this first)

The single most confusing thing to get wrong is *how many environments you have and
what each is called*. Pick one model at project start and name everything after it.
**This fork chose 3-tier;** the 2-tier column stays for portability.

**Not every app needs three tiers.** A 2-tier model is legitimate and simpler.

| | **2-tier** | **3-tier** |
|---|---|---|
| Environments | **DEV** → **PRODUCTION** | **DEV** → **QA** → **PRODUCTION** |
| DEV = localhost | ✅ local stack | ✅ local stack |
| Shared hosted test env | ❌ none | ✅ **QA** (stable URL) |
| `main` deploys to | production | *nothing* (integration trunk only) |
| Promotion to prod | merge to `main` → deploy | gated **Promote** button from `qa` |
| Workflows | `ci.yml`, `migrate-production.yml` | + `migrate-qa.yml`, `promote-production.yml` |

> **3-tier comes in two database topologies.** The table's 3-tier column is the default
> **two-DB** shape (isolated `<project>-qa`). A **one-DB** variant keeps all three
> branches but shares a single production DB between the QA preview and production — see
> **[§5a](#5a-the-one-db-3-tier-variant-shared-production-database)** (and its ⚠ warning
> that QA then writes to prod). *Environments and database count are independent choices.*

### Canonical names — use these exact words everywhere

The names are chosen to kill a specific past confusion: a middle-tier database
suffixed `-dev` reads as "the developer's local DB." So the middle tier is **QA**,
never "dev" or "preview," and every remote DB self-labels its tier.

| Tier | **Canonical name** | Git branch | Supabase project | Subdomain | Vercel scope¹ | Local config |
|---|---|---|---|---|---|---|
| 1 | **DEV** (a.k.a. "Local") | feature branches | local `supabase start` stack (:54322, pgvector) | `localhost:3000` | *Development* | `.env` / `.env.local` |
| 2 | **QA** | `qa` (fixed, fast-forwarded) | `<project>-qa` | `qa.crm.radeengineering.com` | *Preview* | Vercel Preview scope |
| 3 | **PRODUCTION** | `production` (fast-forwarded) | `<project>-prod` | `crm.radeengineering.com` | *Production* | Vercel Production scope |

> **TODO(rade):** `<project>-qa` / `<project>-prod` are the hosted Supabase projects;
> they are provisioned as part of WS3 (the migration workflows) and the actual project
> refs are not yet chosen. The local DEV DB is the Supabase CLI stack (`supabase start`,
> port 54322, pgvector), used as the DEV database for parity with the hosted tiers.

- **DEV** is the only tier you iterate on fast and destructively. "Works on DEV"
  means the *same* migration history as the hosted tiers, not an approximation.
- **QA** is a *shared, hosted, stable-URL* environment for integration and
  stakeholder review. Because it is shared it is **never mutated by hand** — it is a
  pure function of "the last good `main` commit."
- **PRODUCTION** is touched by exactly one, human-gated path.

> ¹ **The one unavoidable name collision.** Vercel's built-in env scopes are fixed
> as *Development / Preview / Production* and cannot be renamed. So our logical
> **QA** tier maps onto Vercel's **Preview** scope. Everywhere it matters this guide
> writes "QA (Vercel's *Preview* scope)". Don't let Vercel's label leak back into
> our branch/DB/subdomain names — those stay `qa` (`qa.crm.radeengineering.com`).

**The one invariant everything else serves:** changes flow **left → right, never
backward**. You prove a change on DEV, it is promoted to QA automatically on merge,
and it reaches production only through a deliberate, gated promotion. No step ever
copies state right-to-left (e.g. prod → QA), and no human applies a change directly
to a hosted environment from a workstation.

> **2-tier readers:** stop here for the environment model — you have DEV and
> PRODUCTION only. Read §6 (secrets), §7 (CI), §8 (the build), §9 (pooler). Skip
> §§3–5 (the QA branch, QA migrations, and the promote button) — they don't exist in
> your model; `main` deploys straight to production.

---

## 1. The shape at a glance (3-tier)

```
   DEV                          QA                              PRODUCTION
   ───                          ──                              ──────────
   Local Supabase stack         Hosted DB: <project>-qa         Hosted DB: <project>-prod
   (supabase start, :54322)     Vercel Preview deploy           Vercel Production deploy
   next dev, hot reload         git: `qa` branch (fixed)        git: `production` branch
   git: feature branches        integration + stakeholder       real users, real data
   prove everything here        review (qa.crm.radeengineering.com)
```

Behind this sits **one migration system**: **Prisma**. `prisma/migrations/*` is the
single source of schema truth for every tier; `prisma migrate deploy` is the only
thing that applies it to a hosted DB.

---

## 2. Why three tiers (and why the strict direction)

The left→right rule exists because the failure mode it prevents is expensive and
silent: a hand-applied change to a shared environment that no one else can see in
git. If QA drifts from `main`, every "it works on QA" becomes unreliable. So the
design makes the drift structurally impossible: **QA *is* a promoted `main` commit,
and production *is* a promoted QA commit.**

---

## 3. The stable QA URL is a git branch pointer

**Decision.** A long-lived `qa` branch is pinned to a fixed hosting deployment,
giving a stable URL (`qa.crm.radeengineering.com`) instead of a new per-commit URL each time.

**Why.** Stakeholders, E2E tests, and integrations need one URL
(`qa.crm.radeengineering.com`) that always points at "the current good QA build," not
a URL that changes on every deploy.

**How.** Vercel is configured so the `qa` branch maps to a fixed deployment/alias. A
post-merge workflow (§4) force-updates `qa` to the exact `main` commit that just
passed CI. Nothing merges *into* `qa` and no PR is ever opened *from* it — it is a
throwaway pointer that is force-moved, not a development branch.

---

## 4. Migrations are automated, and never hand-applied

**Decision.** On merge to `main`, `migrate-qa.yml` (WS3 — not yet created) runs
`prisma migrate deploy` against the `<project>-qa` database automatically, then
fast-forwards `qa`. `migrate deploy` connects through the Supabase **session pooler**
(port 5432 — see §9), and it is the *only* path that mutates the QA schema.

**Why log `migrate status` first.** `prisma migrate deploy` applies **all** pending
migrations in `prisma/migrations/` in lexical (timestamp) order — including "catch-up"
migrations merged on other branches, not just this PR's. Logging
`prisma migrate status` (which lists exactly the not-yet-applied set) *before* the real
deploy is the **audit trail** that replaces the human who used to eyeball that list.
Read it when the catch-up set includes anything schema-destructive.

**Why never hand-apply (the load-bearing rule).** Applying a migration to a hosted
DB from a workstation — or through a database "connector"/MCP tool — corrupts Prisma's
`_prisma_migrations` bookkeeping table in ways that surface much later:
- A console/MCP that runs the migration SQL directly never inserts the matching
  `_prisma_migrations` row, so the next `prisma migrate deploy` re-runs the file and
  fails on "relation already exists."
- A connector that stamps a row with a different checksum or a rolled-back state makes
  the next `migrate deploy` fail permanently on "migration ... failed to apply cleanly"
  / checksum mismatch, needing a manual `migrate resolve` to unstick.

Both are silent until the next automated run breaks. **Migrations reach hosted DBs
only through the workflows.**

**Never `prisma db push`.** `db push` is a dev-time schema *sync* that applies changes
without producing a migration file. It leaves CI nothing to apply and drifts the
schema, so it is banned in every environment — local included. Generate the migration
file (`prisma migrate dev` locally), commit it, let CI apply it with
`prisma migrate deploy`. Applying committed files is the migration approach; `db push`
is not. The fork enforces this two ways: `scripts/assert-local-db.sh` (wired as the
`db:guard` script) refuses destructive/seeding Prisma commands against a non-local
`DATABASE_URL`, and `.github/workflows/guardrails.yml` runs a **shadow-DB drift check**
(`prisma migrate diff --from-migrations ./prisma/migrations --to-schema-datamodel
./prisma/schema.prisma --exit-code`) that fails any PR whose `schema.prisma` was edited
without a matching migration — the exact drift a `db push` would produce.

**Forward-only.** Hosted migrations are never rolled back; you fix forward with a new
migration. Rollback belongs to DEV only.

**Promotion is the workflow's last step.** After the migration job succeeds (or
correctly skips because no files changed), the workflow force-updates `qa` to the
exact CI-tested `main` SHA. A failed/cancelled migration **blocks** promotion, so a
broken migration never reaches the shared QA environment.

### 4a. Migrations through CI — the ordering discipline (read this)

Once the build job compiles against the QA database (§8), CI's build can prerender
against a QA database that **doesn't have the new migration yet** (migrations reach QA
only *after* merge, via `migrate-qa.yml`'s `prisma migrate deploy`). So the timing of
schema-vs-code changes across PRs matters. The governing rule:

> **The DB is always migrated *ahead of* the code that depends on it, and stays
> *behind* the code that still depends on the old shape.**

That single rule splits by change type — and a flat "always migrate in the first PR"
rule quietly breaks on drops/renames:

- **Additive** (new column/table/enum value) → **migration-first.** PR1 = migration
  only; merge it and let `migrate-qa` land it in QA; **then** PR2 = the code that
  reads/writes it. *PR2 must not merge until PR1's migration has actually applied to
  QA* — PR2's build and QA runtime both depend on it.
- **Destructive** (drop/rename column or table) → **code-first (expand/contract).**
  If PR1 drops a column the currently-deployed code still reads, you break running QA
  (and prod) in the window between the migration deploy and the code deploy. So
  deploy code that stops using it **first**, then drop in a later PR. A rename is
  never in-place: **add-new → backfill → switch reads/writes → drop-old**, across
  separate PRs.

**Tell for this trap:** green locally, red in CI at "Generating static pages." Your
local DB is already migrated; CI's QA DB is not. Reproduce the CI condition before
pushing.

**Complementary mitigation:** keep prerendered list queries selecting *only the
columns they render*, so an additive change doesn't force strict PR ordering at all.

---

## 5. Production is promoted from `qa`, by one gated button

**Decision.** Production is not a merge target. A manual "Promote to Production"
workflow (`promote-production.yml`, `workflow_dispatch` — WS3, not yet created) ships
the confirmed `qa` state to production: validate → migrate (`prisma migrate deploy`
against `<project>-prod`) → fast-forward the `production` branch (which Vercel deploys).

**Why promote from `qa`, not `main`.** `main` is the integration trunk and can run
*ahead* of what is confirmed on QA, and can even contain a commit whose QA migration
**failed** (the promote-qa step only advances `qa` on success). So `main`'s tip is
not a safe production source. Promoting from `qa` guarantees production can only ever
receive a commit that already migrated cleanly in QA and is live on the QA URL. The
button defaults its target to the `qa` tip and **asserts the target is an ancestor of
`main`** (merged + CI-tested; also blocks an ad-hoc branch force-pushed to `qa` from
leaking to prod).

**Why an orchestrator, not a branch-push trigger (the subtle one).** The tempting
design is "push the release commit to `production`, and let a workflow that triggers
on push-to-`production` run the migrations." **It silently never migrates:** GitHub
Actions deliberately will **not** trigger a workflow from an event created with the
default `GITHUB_TOKEN` (its anti-recursion rule). So a push made by a workflow using
that token fires no `push`-triggered workflow. The fix is to orchestrate migrate +
advance within **one** run: `promote-production.yml` calls `migrate-production.yml`
as a **reusable workflow** (`workflow_call`) and only *after* it succeeds
fast-forwards `production`. (Vercel's own Git integration is *not* subject to the
`GITHUB_TOKEN` rule, so it still deploys off that push — only *Actions* workflows are
suppressed.)

**Why migrate-before-deploy.** The orchestrator runs migrations *before* advancing
the branch, so production schema is never behind the code Vercel is about to deploy.

**Two human approvals by design.** The `Production` GitHub *environment* has required
reviewers, and both the migrate step and the promote/deploy step pass through it — so
the release asks for approval twice: once to migrate the live DB, again to ship the
code. (Tunable to one gate; it's an environment setting, not a workflow change.)

**Linear / prefix rule.** `production` can only be fast-forwarded to a commit already
on `main`/`qa`. You ship a **prefix** of tested history — never a cherry-picked or
divergent commit. To hold a PR back, don't merge it to `main` yet (or revert) — you
can't skip it at promotion.

**Inert until armed.** Every job is gated on a repository variable
(`PRODUCTION_MIGRATIONS_ENABLED`), so the button does nothing until production is
provisioned and that flag is set.

### 5a. The one-DB 3-tier variant (shared production database)

A project can want the **3-branch shape** — a stable `qa` preview *and* a gated
production release — **without** a second database. This variant keeps all three
branches but points **one** database (production) at both the QA preview and production.
It is documented for portability; **this fork uses the two-DB shape** (§§3–5 above),
which is the default.

> **⚠ QA writes to production.** With a single shared DB, the `qa` preview is a live
> front onto **production data** — reads *and writes*. Anything edited through QA, and
> any webhook/side-effecting flow (Inngest jobs, Resend email) exercised there, mutates
> **production**. Use this variant only when QA is for **visual / integration review**,
> not for exercising data mutations. Schema/data isolation needs the two-DB variant.

**Shape.**
- `main` = integration trunk, **not deployed** (`vercel.json` disables `main`).
- `qa` = fast-forwarded from `main` after CI, pinned to `qa.crm.radeengineering.com`
  (Vercel *Preview*).
- `production` = fast-forwarded from `qa` by the gated button (Vercel *Production*).
- **One DB** (`<project>-prod`). DEV is local. Vercel **Preview** and **Production** both
  set `DATABASE_URL` to the prod DB. No `<project>-qa`, no `QA_DATABASE_URL` secret.

**Migrations run at the `main` stage, against prod** — there is no QA DB to stage them
on. So this variant has the **same migration-safety profile as 2-tier**: a migration
hits prod as soon as it merges to `main`, *before* the code reaches `qa` or
`production`. The **migration-first / expand-contract discipline (§4a) is therefore
mandatory, not optional** — `qa` (new code) and the still-live production (old code)
both run against the just-migrated schema, so every migration must be backward
compatible.

- **The main-stage migration workflow** — **`migrate-qa.yml` already *is* this workflow**,
  minus the target: it triggers on the guarded `workflow_run` on CI/`main`, carries the
  same-repo/fork-PR guard, path-gates via a **`check-migrations` diff job** (a
  `workflow_run` trigger **can't** use a native `paths:` filter — it diffs `HEAD~1..HEAD`
  against `prisma/migrations/**` instead), and ends in a branch-advance (`promote-qa`)
  job. For the one-DB variant, take that structure and **retarget the migrate job at
  `environment: Production` + `PROD_DATABASE_URL`** (still `prisma migrate deploy`, just
  pointed at the prod pooler). Keep its branch-advance job as **`advance-qa`** — it already
  fully-qualifies the ref (`git push origin HEAD:refs/heads/qa --force`, so it creates `qa`
  on run #1) and runs only when the migration succeeded or correctly skipped:
  ```yaml
  advance-qa: # migrate-qa.yml's existing promote-qa job, unchanged
    needs: [check-migrations, migrate]
    if: >-
      always() &&
      needs.check-migrations.result == 'success' &&
      (needs.migrate.result == 'success' || needs.migrate.result == 'skipped')
    runs-on: ubuntu-latest
    permissions: { contents: write }
    steps:
      - uses: actions/checkout@v4
        with: { ref: '${{ github.event.workflow_run.head_sha || github.sha }}' }
      - run: git push origin HEAD:refs/heads/qa --force
  ```
  Because the migrate job is path-gated (only runs when `prisma/migrations/**` changed),
  the `Production`-environment reviewer prompt fires **only on schema-changing merges**;
  code-only merges skip migrate and advance `qa` unattended. (Name the file for its true
  job — it migrates prod — and **delete the reusable `migrate-production.yml`**, which the
  code-only promote below no longer calls.)
- **`promote-production.yml`** — **code-only**: keep `validate` (target = `qa` tip, assert
  ancestor of `main`) and the fast-forward of `production` from `qa`, and **rewire the rest
  so it references no deleted job**: delete the `migrate` job and `validate`'s
  pending-migration diff step/output, and change the advance job to **`needs: [validate]`**
  with **`if: always() && needs.validate.result == 'success'`** (drop the
  `needs.migrate.result` clause). The DB was already migrated at the `main` stage. This
  *is* the "fast-forward production from `qa`" gate.

**Trade-off.** One shared DB means `qa` cannot test a schema change in isolation — the
migration is already live on prod. Land migrations in their own earlier PR, additive /
expand-contract, so `qa` reflects them before you promote. Want isolation? Use two DBs
(the default two-DB shape, §§3–5). This fork's default is **two-DB**.

---

## 6. Secret scoping — the rule that quietly breaks things

**Decision.** Secrets are scoped to **GitHub *Environments*** (`QA`, `Production`),
not to the repository, and are prefixed by tier (`QA_*`, `PROD_*`).

**Why environment-scoped, not repo-level.** At repo level, the `QA_`/`PROD_` prefix
would be the *only* thing separating the tiers — a typo would point a migration at
the wrong database. Environment scoping makes the boundary structural: a job only
sees a tier's secrets if it declares `environment: <tier>`.

**The trap this creates (and its fix).** Because secrets are environment-scoped, **a
job that declares no `environment:` cannot read them** — the reference resolves to an
empty string, silently. This bites the DB-backed build (§8): the build job must
declare `environment: QA` to read the QA `DATABASE_URL` secret. Before adding a scoped
secret to a job, confirm the job declares the matching environment.

**Throwaway secrets for jobs that don't need the real thing.** `prisma migrate deploy`
runs only DDL — it never signs sessions or encrypts — so give a migration job a
*throwaway random value* for any app secret it nominally requires (`BETTER_AUTH_SECRET`,
`EMAIL_ENCRYPTION_KEY`, the Inngest keys), not the real one. The always-on `ci.yml`
already models this: its top-level `env:` block is a wall of inert dummy values
(`ci-only-dummy-secret-…`) that satisfy module-level imports without granting CI any
real credential. **Give CI the least secret that makes it run.**

**GitHub Environment ≠ Vercel scope.** A GitHub *Environment* scopes Actions secrets
and approval gates only; it is invisible to the running app. The app's runtime env
vars are configured separately in Vercel per scope (§0, note ¹). Don't conflate them.

---

## 7. CI structure

**The always-on CI workflow** (`ci.yml`) runs on every PR and push to `main` (and
`dev`). It is a four-job pipeline, each job on the pgvector Postgres service image
where it needs a database:

- **`fast`** — no DB service: `prisma generate`, `tsc --noEmit` typecheck, and the
  Jest unit suite (DB-backed suites under `__tests__/invoices/` are excluded here). A
  typo or failing unit test costs ~1 minute here instead of spinning up the DB jobs.
- **`integration`** (`needs: fast`) — boots `pgvector/pgvector:pg16`, runs
  `prisma migrate deploy` against a **fresh** database (proving the whole migration
  history replays cleanly, including `CREATE EXTENSION vector`), then runs the
  DB-backed Jest suites.
- **`build`** (`needs: fast`) — the production build (`prisma generate && prisma
  migrate deploy && next build`) against the pgvector service, mirroring the deploy
  build.
- **`e2e`** (`needs: fast`) — `prisma migrate deploy` + seed, starts the **Inngest**
  dev server (campaign submit paths await `inngest.send()`), and runs **Playwright**
  (chromium) whose `webServer` starts `pnpm dev`.

This is the required gate. `build` and the DB jobs run **in parallel** off `fast` (no
cross-`needs:`), because a build doesn't depend on the integration or e2e suites.

> **No contract/RLS tier.** This fork has **no Row-Level Security** — authorization is
> enforced in application code (better-auth + permission checks), not in Postgres. So
> there is no RLS contract job to run; the DB-backed guarantees are the `integration`
> suite (fresh-DB migrate + Jest) and the `build` job.

**Required status checks live in a repo *ruleset*** (or classic branch protection).
Gotcha: a check only appears in the "require status checks" search list *after it has
run at least once*, and a required check name must match the job's `name:` exactly —
rename a job (e.g. `Integration (fresh-DB migrations + DB suites)`) and you must update
the required-check name in the ruleset, or every PR blocks waiting for a check that no
longer reports.

---

## 8. The DB-backed build — a graduation path, not a day-one requirement

**Current state: fresh-DB build.** The fork's `ci.yml` `build` job runs the
production-mode build (`prisma generate && prisma migrate deploy && next build`)
against the ephemeral pgvector service — a *fresh* DB migrated from scratch, with the
inert dummy `env:` values. DB-backed pages render at runtime (ISR/dynamic), not at
build, so this ships CI green without touching any hosted tier, and the §4a
migration-ordering trap mostly disappears *at build time*.

**Target end-state: live QA-DB build.** Once you have DB-backed pages you want
prerendered to CDN-cached static/ISR HTML, graduate the build job to compile against
the **`<project>-qa`** database instead of the fresh service DB. This is a known
target, **not** a blocker — don't hold the project up for it. (**TODO(rade):** the QA
Supabase project and the graduated build wiring land with WS3.)

**You're ready to switch when:** you have content/data pages worth prerendering; the
pooler + `DB_POOL_MAX` are configured (§9); and the §4a migration-first discipline is
in force (a live-QA-DB build makes the ordering trap real).

When you do switch, carry these over:

- **Scope the build job `environment: QA`** so it can read the QA DB secret (§6).
- **Name it a production-*mode* build, not a production-*environment* deploy** — it
  compiles + prerenders against QA data and discards the output. Call it "CI build
  (QA DB)".
- **Connection budget — the counter-intuitive part.** Setting `DB_POOL_MAX=1` to
  "spare the pooler" **deadlocks the build**: pages issue *concurrent* per-render
  queries, so a 1-connection `pg` pool (the one behind `@prisma/adapter-pg`) starves
  the prerender and every page times out. A modest pool (e.g. 5) builds cleanly. The
  real mitigation is a **`concurrency` group that serializes gate builds**, not a
  starved pool. (`ci.yml` already sets `concurrency: ci-${{ github.ref }}`.)
- **Fail-fast, don't bake stale fallbacks.** Shared chrome (nav/footer) fetched at
  build must **fail the build** on a *configured-DB* error rather than silently
  falling back to defaults — else a transient blip bakes degraded chrome into static
  HTML for the whole ISR window. Distinguish "no DB configured" (legitimate → fallback
  fine) from "DB configured but erroring during the build" (→ throw).
- **Accepted coupling.** A required DB-backed build couples merges to QA-DB uptime.
  Accept it (isolated job + retry + runbook) or drop the build from the required set.

---

## 9. Connection & pooler reference (hosted Postgres)

The connection *shape* is load-bearing and easy to get wrong:

- **GitHub runners and Vercel are IPv4-only; Supabase's direct host
  (`db.<ref>.supabase.co`) is IPv6-only** (IPv4 is a paid add-on). So CI/CD and
  Vercel builds/runtime must connect through the **shared pooler**
  (`aws-<n>-<region>.pooler.supabase.com`, an IPv4 endpoint), never the direct host.
  **Tell for the wrong string:** host `db.<ref>.supabase.co` + a plain `postgres`
  username. When Supabase drops the direct IPv4 A-record, *every* build fails at once
  with `ENETUNREACH <ipv6>` — a docs-only commit will look like the cause.
- **Session pooler vs transaction pooler.** The shared pooler serves both: **session**
  mode (port 5432) for prepared statements, DDL, and `prisma migrate deploy`;
  **transaction** mode (port 6543) multiplexes aggressively for serverless runtime. Use
  session mode for migrations and the CI build; prefer transaction mode for serverless
  app runtime at launch (see `docs/guides/platform/SUPABASE_ON_VERCEL.md`).
- **Pool sizing at build:** see §8 — keep the per-build pool modest and *serialize*
  builds rather than starving the pool.
- **Co-locate the DB region with the Vercel region.** Connection *mode* never fixes
  geography — a cross-region hop dwarfs it.

---

## 10. Host (Vercel) deploy configuration (3-tier)

- **Production branch = `production`** (not `main`). Vercel deploys production only
  from the `production` branch that the promote button advances.
- **`main` never deploys.** `vercel.json` sets `git.deploymentEnabled.main: false`,
  so merging to `main` deploys nothing. QA comes from `qa`; production from
  `production`. (**TODO(rade):** the repo has **no `vercel.json` yet** — it lands with
  the Vercel wiring in WS3; until then, disable `main` deploys in the Vercel project's
  Git settings.)
- **`qa` branch → stable alias.** The `qa` branch maps to the fixed
  `qa.crm.radeengineering.com` URL (§3). Per-PR branches still get their own ephemeral
  preview deployments.
- Runtime env vars are configured per Vercel scope (Development / Preview /
  Production, where **Preview = QA**); production-only secrets (live keys, Inngest
  signing keys, Resend keys, R2/S3 credentials, Upstash Redis) must exist in the
  Production scope before go-live.

*(2-tier: skip this section. `main` is the production branch and deploys on merge;
there is no `qa` branch and no `git.deploymentEnabled` override.)*

---

## 11. What "done" looks like (verifying the pipeline)

- **Migration promoted:** `migrate-qa.yml` is green (`prisma migrate deploy` applied
  cleanly) and the `qa` branch points at the tested `main` SHA.
- **Static win live (once on the DB-backed build):** prerendered pages on
  `qa.crm.radeengineering.com` return `x-vercel-cache: HIT` (after a first `PRERENDER`)
  with low TTFB; genuinely dynamic pages return `MISS`. Probe with two requests (the
  edge cache populates on the first).
- **Freshness:** a data edit reflects on the affected static page within the
  revalidation window (on-demand `revalidateTag` + a time-based backstop).
- **Reset ⇒ revalidate:** once pages are static/ISR, a QA data reset must be followed
  by a revalidation, or the CDN keeps serving old pages until the backstop.

---

## Porting checklist

Reproduce the **3-tier** design on a new repo in this order (2-tier: do steps 1, 3,
7, 8 only, with `main` as the production branch):

1. **Two hosted DB projects** (`<project>-qa`, `<project>-prod`) + a **local** Supabase
   stack (`supabase start`, :54322, pgvector). Confirm the **session-pooler**
   connection string for each (IPv4, port 5432) as `DATABASE_URL`, co-located with the
   Vercel region.
2. **Branches:** `main` (trunk), a throwaway force-moved `qa`, and a protected
   `production`. Vercel: production branch = `production`; disable deploys from
   `main`; map `qa` to the stable `qa.crm.radeengineering.com` alias.
3. **GitHub Environments** `QA` and `Production` with **tier-prefixed,
   environment-scoped** secrets (`QA_*` on QA, `PROD_*` on Production — e.g.
   `QA_DATABASE_URL` / `PROD_DATABASE_URL`). Give migration/build jobs **throwaway**
   secrets where the real value isn't needed. Put required reviewers on `Production`.
4. **`migrate-qa.yml`:** on `workflow_run` of CI on `main`, run
   `prisma migrate status` (audit log) then `prisma migrate deploy` against
   `<project>-qa`; path-gate on `prisma/migrations/**` via a `check-migrations`
   `HEAD~1..HEAD` diff (a `workflow_run` trigger can't use native `paths:`), then
   force-update `qa` to the tested SHA. Guard the trigger to same-repo `push` events (a
   fork PR branch literally named `main` would otherwise satisfy `branches: [main]` and
   run with QA secrets).
5. **`migrate-production.yml`:** a **reusable** workflow (`workflow_call` +
   `workflow_dispatch` for break-glass) that runs `prisma migrate deploy` against
   `<project>-prod`; gated by `PRODUCTION_MIGRATIONS_ENABLED` so it's inert until armed.
   It does **not** trigger off `main`.
6. **`promote-production.yml`:** the `workflow_dispatch` button — validate
   (default = `qa` tip; assert ancestor of `main`; detect pending migrations over
   `production..target`) → call `migrate-production.yml` (`secrets: inherit`) →
   fast-forward `production`. Gated by the same arming variable. Pass dispatch inputs
   and step outputs through `env:` (never interpolate `${{ github.event.inputs.* }}`
   into a `run:` block). Allow the workflow to push to `production` in branch
   protection.
7. **CI (`ci.yml`):** the always-on required workflow — the four-job pipeline
   `fast` (typecheck + Jest unit) → `integration` (fresh-DB `prisma migrate deploy` on
   pgvector + DB Jest suites) → `build` (`next build`) → `e2e` (Playwright + Inngest),
   with `integration`/`build`/`e2e` all `needs: fast` so they fan out in parallel.
   Ship the `build` job against the fresh service DB (§8); when you graduate to the
   QA-DB build, give it `environment: QA`, the QA `DATABASE_URL`, a `concurrency` group,
   and throwaway build secrets. **The build job runs in PARALLEL with the check jobs
   (only `needs: fast`)** — a build doesn't depend on the integration/e2e suites, so
   gating it behind them only makes it wait. (No contract/RLS tier — this fork has no
   RLS.) The Prisma schema/migration **drift check** lives in the separate
   `guardrails.yml` (shadow-DB `prisma migrate diff`).
8. **Required checks:** in the repo ruleset, require the `fast`/`integration` jobs (and
   the `build` job once it's QA-DB-backed) — after each has run once. **Required checks
   are matched by job NAME**, so renaming/splitting a required job means updating the
   ruleset in lockstep, or every PR blocks forever on a check that never reports.
9. **Arm production (later):** provision the Production environment secrets +
   `<project>-prod`, set the Vercel Production Branch, add branch protection allowing
   the promote workflow to push, then set `PRODUCTION_MIGRATIONS_ENABLED=true`. First
   release is the first Promote-to-Production run.

**Traps to carry over verbatim (each cost real debugging):**
`GITHUB_TOKEN` pushes trigger no workflow (§5) · environment-scoped secrets are
invisible to jobs without `environment:` (§6) · session vs transaction pooler, and
IPv4 runners/Vercel vs IPv6 direct host (§9) · `DB_POOL_MAX=1` deadlocks the prerender
(§8) · a renamed job needs its required-check name updated (§7) · never hand-apply a
hosted migration / never `prisma db push` (§4) · additive migrations go first,
destructive changes go last (§4a) · a new required env var breaks Vercel while CI stays
green (CI runs on inert dummies; Vercel runtime needs the real value in the right scope
— §6, §10).
