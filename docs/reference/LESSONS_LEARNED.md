# Lessons Learned (central log)

> The cross-cutting trap log. **Append to this whenever you solve a recurring-type
> issue** — a surprise that will bite again, not a changelog entry. It is a
> **mandatory doc-sync target**: every doc-sync pass asks "what gotcha here is likely
> to recur, and is it captured?" (see `docs/guides/process/DOCUMENTATION_GUIDE.md`).
>
> **Two homes for lessons:** a lesson local to one unit of work stays in that
> phase/workstream spec's own Lessons Learned. Anything **cross-phase or recurring**
> is promoted **here**. When a trap generalizes to any project on this stack,
> consider promoting it further into the relevant guide (`platform/`, `process/`).
>
> **Entry format** — keep each one skimmable:
> - **Title** — the trap in one line.
> - **Symptom** — what you saw (the misleading part).
> - **Cause** — why it happens.
> - **Fix / rule** — what to do instead, stated as a rule.
> - *(optional)* **Tell** — the fastest way to recognize it next time.

---

## Server / Client boundary

### Prisma `Decimal` fields are not serializable across the server/client boundary

- **Symptom:** passing a query result that contains a money/quantity column (invoice
  totals, line-item amounts, product prices) into a Client Component throws
  "Only plain objects can be passed to Client Components" — or the value arrives as
  an opaque object instead of a number.
- **Cause:** Prisma returns `Decimal` columns as `Decimal` objects (a class
  instance), and Next.js can only serialize plain data across the RSC → Client
  boundary.
- **Fix / rule:** run any object/list that carries `Decimal` columns through
  `serializeDecimals()` / `serializeDecimalsList()` (`lib/serialize-decimals.ts`)
  in the Server Component before handing it to a Client Component. The helper
  converts anything with a `.toNumber()` to a plain number.
- **Tell:** the error names a Client Component boundary, and the offending field is
  a money or quantity column.

## Rendering / Next.js

### `robots.ts` / `sitemap.ts` (and other metadata files) must live at the app root

- **Symptom:** `app/[locale]/robots.ts` produced **no** `/robots.txt` at build
  — silently absent; or, once a root one is added too, a `Conflicting metadatas`
  build error.
- **Cause:** Next resolves special metadata conventions from the **app root**, not
  from inside a route group or a locale segment.
- **Fix / rule:** keep `robots.ts`, `sitemap.ts`, `manifest.ts`, `opengraph-image`,
  etc. directly under `app/` (never in a `(group)/` or `[locale]/`). Per-file
  behavior is inconsistent, so verify the generated output exists after a real
  `next build`.

## Frontend / Tailwind

### Tailwind v4 arbitrary data-attribute variants can compile to nothing, silently

- **Symptom:** `data-[pending=true]:opacity-50` had no effect; no error, no warning.
- **Cause:** Tailwind v4's compile of arbitrary data-attribute variants can drop the
  rule depending on how the attribute is produced.
- **Fix / rule:** for one-off React-driven state, prefer inline `style` (or a plain
  conditional class) over an arbitrary `data-[…]` variant. **Verify a rule exists by
  reading computed style**, not by eyeballing the class in the markup.

## Robustness

### A "never throws" reporter can still throw if its SDK is uninitialized

- **Symptom:** an error path that calls an observability SDK inside a `catch`
  re-threw and masked the original error.
- **Cause:** the SDK (Sentry, etc.) throws when uninitialized/stubbed — so the
  "safe" reporting call isn't safe.
- **Fix / rule:** route reporting through a wrapper that swallows its **own**
  failures, **and** try/catch the call site. A degradation path must log *why*, or an
  outage is invisible.

## Cross-platform (Windows / Mac / Linux CI)

### Import-path casing works locally on Mac/Windows but fails only in Linux CI

- **Symptom:** the build/lint is green on a Mac or Windows dev machine but CI fails
  with "module not found" for a path that clearly exists.
- **Cause:** macOS and Windows filesystems are **case-insensitive**; Linux CI is
  **case-sensitive**. `import './Foo'` resolves to `foo.tsx` locally but not on Linux.
- **Fix / rule:** match import path casing to the real filename **exactly**. When CI
  can't find a module that exists, suspect casing first.

## Package management / lockfile

### `pnpm install --frozen-lockfile` fails in CI when the lockfile drifts

- **Symptom:** local `pnpm install` is green, but CI (which runs
  `--frozen-lockfile`, as `pnpm/action-setup` + `pnpm install` does by default on
  CI) fails with "lockfile is not up to date" / "cannot install with frozen
  lockfile" — or a dependency change is silently missing because the lockfile was
  never regenerated.
- **Cause:** editing `package.json` without re-running `pnpm install` leaves
  `pnpm-lock.yaml` out of sync; CI refuses to reconcile it.
- **Fix / rule:** any dependency change commits the regenerated `pnpm-lock.yaml` in
  the **same** PR. This repo pins pnpm via `packageManager` (`pnpm@11.x`) and
  `engines` (Node ≥22.12) — use that pnpm, not a globally-installed different major,
  or the lockfile format can churn.

## Git / CI automation

### A workflow can't create a branch with `git push origin HEAD:<name>`

- **Symptom:** a workflow that force-updates a mirror branch (`qa` / staging) works once
  the branch exists but fails on the **first** run with `error: The destination you
  provided is not a full refname … Did you mean … 'HEAD:refs/heads/qa'?`.
- **Cause:** when `<src>` is a commit (`HEAD`), git won't infer the full destination
  refname for a branch that doesn't exist yet — so a bare `HEAD:qa` can only *update* an
  existing branch, never *create* one.
- **Fix / rule:** fully-qualify the destination — `git push origin HEAD:refs/heads/qa
  --force` — in any workflow that force-advances a fixed branch. Works whether the branch
  was pre-created or not; don't rely on a go-live runbook having created it first.

### A newly-required env var passes CI but breaks the Vercel deploy

- **Symptom:** lint / Jest / typecheck are all green on the PR, but the Vercel build
  (or the first request after deploy) fails — a page 500s or the build aborts on a
  missing variable that "works on my machine."
- **Cause:** there is no central env validator, so a new required variable is read
  ad hoc from `process.env`. CI never exercises the production build path with the
  production env, and `build` runs `prisma migrate deploy` (which needs
  `DATABASE_URL`) — so a var CI doesn't need is only discovered at deploy time. A
  local `.env` / `.env.local` masks it entirely.
- **Fix / rule:** when you add a required env var, add it to **every** Vercel
  environment (and `.env.example` / `.env.local.example`) in the same change, and
  call it out in the PR description. Treat "new env var" as a deploy-affecting change,
  not a code-only one.

## Database / migrations

### Never `prisma db push` — every schema change is a committed migration

- **Symptom:** schema is fine locally but a deployed environment has the wrong or
  empty schema — or the QA/production schema changes with no migration file to show
  for it.
- **Cause:** `prisma db push` syncs the schema straight to the DB and generates **no
  migration file**. Nothing is committed for CI to apply, and if the active
  `DATABASE_URL` points at a hosted DB the push rewrites *that* DB.
- **Fix / rule:** **never db-push.** Use `prisma migrate dev` locally so every change
  produces a committed migration, and let CI apply them with `prisma migrate deploy`
  (the `build` script already runs `prisma migrate deploy`). The ban is on the
  file-skipping dev *sync*, not on applying committed migrations.

### `db:seed` / `db:reset` against a remote `DATABASE_URL` seeds/destroys the shared DB

- **Symptom:** running `pnpm db:seed` or `pnpm db:reset` unexpectedly writes the demo
  CRM dataset and the `test@nextcrm.app` admin user into — or drops the volume behind
  — the **shared** remote dev database.
- **Cause:** these commands inherit whatever `DATABASE_URL` is active. The setup
  runbook has developers point `.env` at the shared remote URL for access; if they
  forget to swap back, the destructive/seeding commands run there. `db:seed` also
  sets `SEED_DEMO_DATA=1`, which deliberately defeats the seed's own "no demo
  records" gate.
- **Fix / rule:** the destructive/seeding scripts are guarded — `db:migrate`,
  `db:seed`, `db:reset` all run `scripts/assert-local-db.sh` first, which parses the
  effective `DATABASE_URL` (matching Prisma's dotenv resolution order) and **refuses**
  to run against a non-local host. Keep new destructive DB scripts behind that guard
  (`pnpm db:guard`); never bypass it to "just reseed quickly."

### `prisma migrate diff` reports benign baseline drift — don't guard with it

- **Symptom:** `prisma migrate diff --from-migrations ./prisma/migrations --to-schema
  ./prisma/schema.prisma --exit-code` exits **2 (drift)** on a clean checkout, listing
  `id` columns whose default "changed from `gen_random_uuid()` to `None`" plus a couple
  of FK differences — even though migrations apply cleanly and the app works.
- **Cause:** the migrations create DB-level `DEFAULT gen_random_uuid()` while
  `schema.prisma` models those ids as app-generated (no DB default). This is a
  **known, benign baseline drift** in the upstream repo — its own `docs/superpowers/`
  plans carry a standing rule to author migrations via `prisma migrate diff
  --from-schema … --to-schema … --script` + fresh-DB replay, precisely because
  `migrate dev` against the dev DB drifts.
- **Fix / rule:** do **not** build a CI guard on a full `migrate diff` (it would fail
  every PR). The Guardrails **schema/migration-sync** check is instead **git-based** —
  it fails only when a PR edits `prisma/schema.prisma` without adding a migration under
  `prisma/migrations/`. Migrations-apply-in-order is proven separately by `ci.yml`'s
  fresh-DB `prisma migrate deploy`. Also note: Prisma 7 renamed the flag to
  `--to-schema` (not `--to-schema-datamodel`) and has **no** `--shadow-database-url`
  flag (shadow DB is set via `datasource.shadowDatabaseUrl` in a Prisma config file).

## Auth / local dev

### The dev login OTP never arrives by email — retrieve it from the server log or `test-otp`

- **Symptom:** signing in locally, the email-OTP "verification code" email never
  shows up in any inbox, so login looks broken. Hitting
  `/api/auth/test-otp?email=…` first returns `404 No OTP found`.
- **Cause:** auth is email-OTP only (better-auth) and **dev sends no real email** —
  `.env` ships a dummy `RESEND_API_KEY`, so `sendVerificationOTP`'s Resend call
  no-ops (it 401s and is swallowed in non-prod). The code is instead captured in
  memory by the `testUtils` plugin, which is enabled **only** when
  `NODE_ENV !== "production"` and only **after** a code has been requested.
- **Fix / rule:** two ways to get the code locally — (1) request it on the login page,
  then read the `pnpm dev` server log for `[Auth] OTP for … : 123456` (printed
  non-prod-only from `lib/auth.ts`); (2) for scripts/E2E, request first, then
  `GET /api/auth/test-otp?email=…`. You must trigger the send before either works.
  The first user to sign in is auto-promoted to admin + `ACTIVE`
  (`lib/auth-hooks.ts`). Inviting a user in dev shows "Failed to invite user"
  (same dummy-key send failure) but the user **is** created `ACTIVE` and can sign in
  via the OTP flow — the invite email carries no code or magic link.
- **Tell:** "no OTP email in dev" + a dummy/placeholder `RESEND_API_KEY` in `.env`.

---

<!-- Add new entries above this line, newest-relevant first within each section.
     Create a new `## <area>` heading when a trap doesn't fit an existing one. -->
