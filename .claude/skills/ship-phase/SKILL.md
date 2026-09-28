---
name: ship-phase
description: Complete a phase or feature — run a deep review, update all docs, run quality checks, commit, push, and open a PR. Use when the user says "ship the phase", "wrap up this feature", "ready to ship", or similar.
---

# Ship Phase

Complete the current phase/feature by finalizing the code, closing out documentation, running quality checks, and shipping a PR.

## Workflow

### 1. Identify the unit of work

Read the current branch name to determine what's being shipped (e.g. `feat/campaigns-scheduling` → the campaigns-scheduling feature). Confirm with the user if ambiguous.

### 2. Code review (do this first)

Run a full code review **before** anything else, so the code is finalized before any doc or test is written against it. Invoke the `deep-review` skill on the branch.

Present the severity-ranked findings, then resolve anything 🔴 Critical or 🟠 High — fix them (with the user's go-ahead) or get an explicit decision to defer, recording deferrals as Known Gaps. Medium/Low are the user's call.

**Apply all accepted fixes now, before moving on.** Everything downstream — change plan, testing docs, E2E tests, spec updates — must be derived from the post-review code.

### 3. Produce a change plan and wait for confirmation

Now that the code is final, derive the full scope of changes and present a plan.

```bash
git diff $(git merge-base HEAD main) HEAD --name-only
git diff $(git merge-base HEAD main) HEAD
```

Produce a structured plan covering every file that will be created or updated, grouped by category (feature/phase doc, testing doc, E2E tests, spec/overview docs, "no changes needed", and "flagged / not auto-generated"). For each file, state what will change and why.

**Wait for explicit confirmation** before making any edits. If the user redirects or removes items, update your understanding before proceeding.

### 4. Update the feature/phase doc

Locate the doc for this unit of work under `docs/` (the fork already carries `docs/specs/`, `docs/superpowers/plans/`, and the ported `docs/guides|reference|templates|testing`). If none exists, create one from the matching template in `docs/templates/` (they carry these headings).
- Set the status to ✅ Complete and check off the implementation checklist
- Add a `## Lessons Learned` section (including anything surfaced by the review) — surprises/traps, not a changelog; **promote recurring/cross-phase ones to `docs/reference/LESSONS_LEARNED.md`** (the mandatory central log)
- Add deferred review findings to a `## Known Gaps` section
- Add a `## Manual Testing` pointer to the testing doc

### 5. Create or update the manual testing doc

Every scenario names its E2E spec and vice versa (bidirectional parity).

**If it does not exist:** create it from `docs/templates/manual-testing-template.md`, filling it from what was actually implemented (read the feature doc and branch diff): prerequisites, numbered scenarios each with step-by-step **Verify** checks, and a Known Gaps section.

**If it exists:** do not assume it's current. Compare against the branch diff — any UI/route/data-model change may invalidate scenarios or require new ones. Update accordingly.

### 6. E2E test sync

For each scenario in the manual testing doc: find the matching Playwright spec (`docs/testing/e2e-patterns.md` for conventions) and verify it still reflects current UI/routes/data model; update it if the implementation changed; if a scenario has no coverage and isn't in Known Gaps, flag it (add coverage or record the gap).

Do not add E2E tests speculatively — only update or flag what the diff shows has changed.

### 7. Documentation sync

Execute the spec/overview updates identified in the confirmed plan. Walk the full doc-sync set and confirm each is updated or explicitly N/A:

| If changes touch... | Update... |
|---|---|
| Prisma schema, migrations, indexes | data-model / feature doc, `PROJECT_STRUCTURE.md` |
| Routes, pages, components, server actions, API/MCP endpoints | feature/module doc, overview |
| Auth (better-auth), roles, feature gates | the relevant feature doc |
| Email (Resend), file storage (R2/S3), Inngest jobs, security | platform/feature doc |
| Playwright tests, helpers, patterns | `docs/testing/e2e-patterns.md`, `docs/testing/e2e-commands.md` |
| A new/removed env var | `docs/reference/ENVIRONMENT_VARIABLES.md` (once WS4 lands) + `.env.example` |
| A new top-level dir / moved module | `docs/reference/PROJECT_STRUCTURE.md` |

**Spawn parallel agents** where multiple doc families need updating, then a coordinator pass checks cross-doc consistency.

### 8. Quality check

Ask: "Should we run lint and typecheck before committing?" If yes, run them and fix failures.

```bash
pnpm lint
pnpm exec tsc --noEmit
pnpm test                    # Jest (no coverage threshold is wired yet)
```

**Lint triage:** `git stash` does not stash untracked files, so an error in a never-committed file is not "pre-existing from CI's perspective" — CI sees it for the first time on this PR. Only dismiss an error as pre-existing if it appeared in a passing CI run on an earlier commit.

### 9. Commit

Commit on the feature branch. If a pre-commit hook fails, fix and create a **new** commit (never amend). Use conventional commits. End the message with the agent's Co-Authored-By footer.

### 10. Get permission, then push, open PR, and watch CI

**A push triggers CI, and opening the PR does too — confirm with the user before pushing.** Do not auto-push a "ship." Once cleared:

```bash
git push -u origin $(git branch --show-current)
gh pr create --repo radesix/nextcrm-app --base main \
  --head radesix:$(git branch --show-current) --title "..." --body "..."
```

`gh` may default to upstream — pass `--repo radesix/nextcrm-app` and `--head radesix:<branch>` explicitly. PR body: follow `docs/guides/process/PR_DESCRIPTION_GUIDE.md` — what was delivered, key decisions, deep-review outcome, tests (revert-verified notes + totals), docs synced, and an after-merge migration note if applicable. End with the Claude Code footer. Then watch CI to completion, pinned to the pushed commit (heavy jobs are path-gated — a non-code PR runs only `fast` + guardrails):

```bash
gh run watch --repo radesix/nextcrm-app <run-id> --exit-status
```

**If CI passes:** done. **If CI fails:** invoke `fix-ci` inline. Do not mark complete until CI is green.

### 11. After merge — clean up

```bash
git checkout main && git pull
git branch -d <branch-name>          # remote branch auto-deletes on merge
```

If the merge included `prisma/migrations/`, tell the user the workflow will apply it — `migrate-qa.yml` runs `prisma migrate deploy` against the QA Supabase DB and advances `qa` after CI on `main`; production migrations go through the Promote button (`promote-production.yml`). Never a manual `prisma db push` or hand-applied migration to a hosted DB.

## Checklist

- [ ] Unit of work identified from branch name
- [ ] `deep-review` run **first**; Critical/High fixed or explicitly deferred; all accepted fixes applied before any docs written
- [ ] Change plan presented and confirmed before any doc edits
- [ ] Feature/phase doc set to ✅ Complete, checklist checked off
- [ ] Lessons Learned + Known Gaps sections added
- [ ] Manual testing doc created or updated to reflect current implementation
- [ ] E2E tests checked and updated for changed scenarios; gaps covered or flagged
- [ ] Full doc-sync set walked; each updated or N/A
- [ ] `pnpm lint` + `pnpm exec tsc --noEmit` + `pnpm test` pass
- [ ] Committed on feature branch (not main/qa/production)
- [ ] Pushed and confirmed on remote
- [ ] PR opened (`--repo radesix/nextcrm-app`); CI watched to green (fix-ci invoked if needed)
- [ ] Local branch deleted after merge; Prisma migration reminder offered if applicable
