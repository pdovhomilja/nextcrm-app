<!-- Conventional-commit title, e.g. "feat: campaign scheduling" or "fix: invoice total rounding". -->

## What

<!-- One paragraph: what this delivers. -->

## Scope boundary

<!-- What this PR intentionally does and does NOT touch. -->

## Pre-PR gate

- [ ] Ran the `deep-review` skill; fixed 🔴 Critical / 🟠 High or deferred to **Known Gaps** with a reason
- [ ] Doc-sync walk complete; `docs/reference/LESSONS_LEARNED.md` updated if a recurring trap surfaced
- [ ] `pnpm lint` + `pnpm exec tsc --noEmit` + `pnpm test` pass locally
- [ ] Any schema change ships with a `prisma/migrations/` migration (never `prisma db push`)

## Testing

<!-- Unit / DB-backed / E2E. Note revert-verified regression tests + test totals. -->

## Migration / deploy notes

- [ ] N/A — no schema change, **or:**
- [ ] Migration applies at deploy time (Vercel build runs `prisma migrate deploy` against the target DB); change is additive-first / expand-contract so QA (new code) and production (old code) both tolerate it.
