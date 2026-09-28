<!--
  WORKSTREAM SPEC template. Copy to docs/plans/phase-<N>-ws<M>-<slug>.md.
  A WORKSTREAM belongs to a phase spec and decomposes into one or more PRs.
  RULE: a spec describes intent, scope, decomposition, and acceptance — NEVER
  implementation code. No code fences, no snippets. Describe the change; don't write it.
  Delete this comment once started.
-->

# Phase <N> · WS<M>: <name>

**Phase:** `phase-<N>-<slug>.md`  ·  **Depends on:** <other WS, or —>

## Goal

<What this workstream delivers.>

## Trust boundary / risk

<Does this touch auth (better-auth), a public route, a money path (invoices), or a
Prisma migration? If so, name the boundary — it sets the depth of the pre-PR deep
review and which test tiers are required.>

## PR breakdown

<The decomposition into PRs. Mind migration ordering (CI/env guide §4a): additive
changes go migration-first, destructive changes go code-first / expand-contract.>

| PR | What it delivers | Migration? | Notes |
|---|---|---|---|
| 1 | <e.g. add column + backfill (migration only)> | additive | lands in QA before PR2 |
| 2 | <the reader/writer for the new column> | — | opens after PR1's migrate-qa succeeds |

## Acceptance criteria

- [ ] …

## Testing

<Which tiers (Jest unit / Playwright E2E) and the specific flows. Every E2E spec maps
to a step in a manual-testing doc, and vice versa (bidirectional parity).>

## Lessons Learned

<Local traps. Promote recurring/cross-phase ones to `docs/reference/LESSONS_LEARNED.md`.>

## Known Gaps

- …
