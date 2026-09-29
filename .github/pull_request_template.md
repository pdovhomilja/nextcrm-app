<!-- Conventional-commit title, e.g. "feat: campaign scheduling" or "fix: invoice total rounding". -->

## What

<!-- One paragraph: what this delivers. -->

## Scope boundary

<!-- What this PR intentionally does and does NOT touch. -->

## Core changes (upstream impact)

<!-- REQUIRED. This fork tracks upstream, so name every UPSTREAM-OWNED file this PR edits
     (a file that exists at upstream/main — check: `git cat-file -e upstream/main:<path>`).
     New files carry no merge risk — don't list them. For each upstream file say whether the
     edit is an insert-only hook or a REWRITE of upstream lines (the real conflict surface),
     the risk, and why it was unavoidable. If nothing upstream-owned changed, say so. Full
     per-file detail goes in docs/reference/UPSTREAM_IMPACT_LOG.md and is linked here. -->

- **None — fully additive (new files / fork-owned files only).**  _— or —_
- `path/to/upstream/file` — _insert-only hook_ / **rewrite** — risk: low/med/high — why unavoidable
- **Impact log:** `docs/reference/UPSTREAM_IMPACT_LOG.md` › _<this change's entry>_

## Pre-PR gate

- [ ] Ran the `deep-review` skill; fixed 🔴 Critical / 🟠 High or deferred to **Known Gaps** with a reason
- [ ] Change designed additively (new files / wrappers); edits to upstream-owned files are thin, insertion-only hooks where possible
- [ ] **Core changes** section above filled in; if any upstream-owned file changed, `docs/reference/UPSTREAM_IMPACT_LOG.md` updated and linked
- [ ] Doc-sync walk complete; `docs/reference/LESSONS_LEARNED.md` updated if a recurring trap surfaced
- [ ] `pnpm lint` + `pnpm exec tsc --noEmit` + `pnpm test` pass locally
- [ ] Any schema change ships with a `prisma/migrations/` migration (never `prisma db push`)

## Testing

<!-- Unit / DB-backed / E2E. Note revert-verified regression tests + test totals. -->

## Migration / deploy notes

- [ ] N/A — no schema change, **or:**
- [ ] Migration applies at deploy time (Vercel build runs `prisma migrate deploy` against the target DB); change is additive-first / expand-contract so QA (new code) and production (old code) both tolerate it.
