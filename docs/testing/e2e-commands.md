# E2E Commands — how to run the Playwright suites

Quick reference for running the end-to-end tests. Patterns and traps live in
`e2e-patterns.md`; this is just the commands.

## Prerequisites (DEV / local)

```bash
pnpm inngest:up           # local Postgres + Inngest dev server the suite runs against
pnpm db:migrate           # apply Prisma migrations (guarded to a local DB)
pnpm db:seed              # seed the fixtures + the test@nextcrm.app admin (DEV/local)
```

Playwright starts the dev server itself (see `webServer` in `playwright.config.ts`,
which runs `pnpm dev`); if you'd rather run it yourself, start `pnpm dev` first —
`reuseExistingServer` (off in CI) picks it up.

## Authentication

Auth state is provisioned once by the `setup` project in `tests/auth.setup.ts`,
which every browser project depends on. It signs in the seeded admin
(`TEST_USER_EMAIL`, default `test@nextcrm.app`) through better-auth's **email-OTP**
flow: it requests an OTP, reads it back from the `test-otp` capture endpoint
(`/api/auth/test-otp`, backed by the better-auth `testUtils` plugin), completes
sign-in, and saves the session to `playwright/.auth/user.json` (gitignored).
Unauthenticated specs opt out with
`test.use({ storageState: { cookies: [], origins: [] } })`.

## Run modes

```bash
pnpm test:e2e                                  # headless — what CI runs (default)
pnpm test:e2e:ui                               # Playwright UI mode (watch/pick/debug)
pnpm test:e2e:headed                           # headed browser (watch it drive)
pnpm test:e2e:debug                            # Playwright inspector
pnpm test:e2e tests/e2e/<file>.spec.ts         # a single file (any mode)
pnpm exec playwright show-report               # open the last HTML report
```

The suite runs the specs across chromium, firefox, webkit, and the mobile Chrome /
Safari device profiles (see the `projects` in `playwright.config.ts`).

## Run against the deployed QA

The 3-tier Vercel pipeline (feature → main [no deploy] → qa → production) gives a
stable `qa.<domain>` URL. Targeting the suite at it (real TLS, Vercel deployment
protection) is not yet wired into `playwright.config.ts`.

TODO(rade): add a deployed-QA target — an env switch for `baseURL`, a
`VERCEL_AUTOMATION_BYPASS_SECRET` bypass header (see the "Deployed QA environment"
section in `e2e-patterns.md`), and a `@portable`-style tag so only drift-safe specs
run there. Confirm the convention against `tests/` before documenting it here.

## Notes

- A flaky-looking failure is almost always one of the RSC-streaming traps in
  `e2e-patterns.md` — read that before "fixing" a timeout.
- **Every spec must map to a step in a manual-testing doc, and vice versa** (see the
  parity rule in `docs/guides/process/DOCUMENTATION_GUIDE.md`).
- TODO(rade): add any project-specific suite splits (e.g. per-module, smoke vs full).
