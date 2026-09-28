---
name: fix-ci
description: Diagnose a failing CI run, propose a fix, verify locally, and push until CI is green. Use when CI is failing on the current branch, or when invoked by ship-phase after a push.
---

# Fix CI

Diagnose a failing CI run, propose a targeted fix, verify it locally, and push — repeating until CI is green.

## Workflow

### 1. Get the failing CI run

This is a fork; `gh` may default to the upstream repo, so pass `--repo radesix/nextcrm-app` explicitly.

```bash
gh run list --repo radesix/nextcrm-app --branch $(git branch --show-current) --limit 1 --json databaseId,status,conclusion,workflowName
gh run view --repo radesix/nextcrm-app <run-id> --log-failed
```

If the run is still in progress, wait for it first: `gh run watch --repo radesix/nextcrm-app <run-id>`. Prefer reading CI through the app's PR tools (ccd_pr `get_status`) over polling when a PR is bound.

### 2. Diagnose the failure

Apply the root-cause rule: list the top 3 likely causes ranked by probability, state how to verify each, and confirm the root cause before proposing anything.

| Failing check | Common causes |
|---|---|
| **Fast checks** (typecheck) | Type mismatches, missing types, changed API signatures, import path **casing** (works on macOS, fails on Linux CI) |
| **Fast checks** (Jest unit) | Logic bug; a mocked-Prisma expectation drift; a stray `document`/jsdom access |
| **Integration** (fresh-DB) | A migration doesn't apply in order on a clean DB; a DB-backed suite under `__tests__/` broke |
| **Production build** | Bad import, missing module, an env var referenced at build time, `prisma migrate deploy` failing |
| **E2E (Playwright)** | UI/route/selector change, RSC hydration timing, seed/data setup, Inngest dev server not ready, better-auth OTP flow |
| **Guardrails — Fork invariants** | An edit reverted a fork invariant (pnpm, no `prisma db push`, no active edge runtime, Prisma migrations present) — read the FAIL line |
| **Guardrails — schema/migration sync** | `prisma/schema.prisma` changed without a migration under `prisma/migrations/` — author one with `pnpm exec prisma migrate dev` |
| **Lint** (`pnpm lint`) | ESLint rule violations or import issues in changed files (`--max-warnings=0`) |

Run the relevant verification command locally to confirm the root cause — do not propose a fix from log output alone.

```bash
pnpm lint
pnpm exec tsc --noEmit
pnpm exec jest <failing-suite>                 # unit / DB-backed suite
pnpm exec playwright test <failing-spec> --reporter=list
pnpm run build                                  # prisma generate + migrate deploy + next build
bash scripts/check-invariants.sh               # Guardrails invariants
```

**DB-backed and E2E suites need a local Postgres** (`pnpm db:up` for the Docker `:5433` fallback, or `supabase start` on `:54322`) and — for E2E — Inngest (`pnpm inngest:up`) and a seed (`pnpm db:seed`). There is **no coverage-threshold script**; `pnpm test` runs Jest without a floor.

### 3. Propose a fix and pause

Present: the confirmed root cause (what command verified it and what it showed); the proposed fix (every file that will change and exactly what); any uncertainty or alternatives.

**Ask: "Any thoughts before I apply this?"** Wait for the response before touching any file.

### 4. Apply the fix

Make the targeted changes. Do not fix unrelated issues or clean up surrounding code — stay strictly scoped to what CI is failing on.

### 5. Verify locally

Re-run the specific check that was failing to confirm the fix before committing. Do not commit until local verification passes. If it still fails, return to step 3 with a revised proposal.

### 6. Commit and (with permission) push

Commit on the current feature branch with a focused message (e.g. `fix: resolve E2E selector mismatch on wizard step 4`). If a pre-commit hook fails, fix and create a **new** commit — never amend.

**A push re-triggers CI — confirm with the user before pushing** (even inside a fix-CI loop). Once cleared:

```bash
git push
```

### 7. Watch CI to completion

Pin the watch to the commit you just pushed — do not trust `gh run list --limit 1` alone if an older run might surface.

```bash
gh run watch --repo radesix/nextcrm-app \
  $(gh run list --repo radesix/nextcrm-app --branch $(git branch --show-current) --limit 1 --json databaseId --jq '.[0].databaseId') --exit-status
```

Remember heavy jobs are path-gated: a docs/CI-only fix runs only `fast` + guardrails, not E2E.

**If CI passes:** report success and exit. If invoked from ship-phase, return control to the PR step.

**If CI still fails:** return to step 1 with the new logs. Treat it as a fresh diagnosis — do not assume the same root cause carried over. Pause again with a new proposal before applying changes.

## Checklist

- [ ] Latest CI run retrieved and fully read (`--repo radesix/nextcrm-app`)
- [ ] Root cause verified locally (not assumed from log output)
- [ ] Fix proposed with file-level detail and confirmed with user
- [ ] Fix passes local verification before committing
- [ ] Committed on feature branch (not main/qa/production)
- [ ] Pushed (with permission)
- [ ] CI watched to completion, pinned to the pushed commit
- [ ] CI green — or new fix cycle started with fresh diagnosis
