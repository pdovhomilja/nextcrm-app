<!--
  Manual-testing doc template.
  Copy to docs/testing/<feature>-manual-testing.md (or phase-N-manual-testing.md)
  and fill in.

  PARITY IS BIDIRECTIONAL: every scenario here names its matching E2E spec, AND every
  E2E spec appears as a scenario here (see CLAUDE.md / process/DOCUMENTATION_GUIDE.md).
  Add a scenario and its spec in the same PR. Anything not E2E-covered goes in Known
  Gaps with a reason. A spec safe to run against drifting QA data → tag it `@portable`
  (see e2e-patterns.md).
  Delete this comment once started.
-->

# <Feature / Phase name> — Manual Browser Testing Guide

Covers the end-user browser testing for <feature>. Run against your **local**
environment after meeting the prerequisites below.

## Prerequisites

```bash
# Terminal 1 — local Postgres + Inngest dev server (docker-compose.dev.yml)
pnpm inngest:up

# Terminal 2 — dev server
pnpm dev
```

- **Seed:** `pnpm db:seed` (run after `pnpm db:reset`, or if this feature needs
  specific seed rows).
- **URL:** <the page(s) under test, e.g. http://localhost:3000/…>
- TODO: any feature-specific setup (test-mode keys, a seeded record, a role).

## Test accounts

TODO: which account(s) to sign in as, or "public — no account needed."

---

## 1. <First scenario — what it proves>

**E2E:** `tests/e2e/<file>.spec.ts` › `<test name>` <!-- the spec that automates this -->

1. <step>
2. **Verify:** <the exact observable outcome — text, state, redirect, value>
3. <step>
4. **Verify:** <…>

## 2. <Second scenario>

**E2E:** `tests/e2e/<file>.spec.ts` › `<test name>`

1. <step>
2. **Verify:** <…>

<!-- Add one numbered scenario per distinct flow. Each step is an action; each
     **Verify** is a concrete, checkable assertion (not "looks right"). Every
     scenario names its E2E spec above; every E2E spec has a scenario here. -->

---

## Known Gaps

<!-- Flows deliberately NOT covered here or by E2E, each with a reason —
     e.g. "email delivery: not browser-testable, covered by unit test". Never a
     silent omission. See DOCUMENTATION_GUIDE.md §4. -->

- …
