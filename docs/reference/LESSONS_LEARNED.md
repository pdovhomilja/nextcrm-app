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

### A `NEXT_PUBLIC_` variable is inlined into the client bundle — never put a secret in one

- **Symptom:** a token/key read via `process.env.NEXT_PUBLIC_*` (even inside a
  server-only function) ends up readable in the browser bundle.
- **Cause:** Next.js **statically replaces** every `NEXT_PUBLIC_*` reference at build
  time, everywhere, and ships the value to the client — regardless of where it's read.
  (Real case here: `NEXT_PUBLIC_GITHUB_TOKEN` in `get-repo-stars.ts`.)
- **Fix / rule:** secrets/tokens use a **server-only** name (no `NEXT_PUBLIC_` prefix)
  and are read only in server code. `NEXT_PUBLIC_*` is for values that are safe to be
  public (URLs, names, feature flags). If a value must reach the client, fetch it
  through a server action/route, don't inline it.

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

### A too-strict client row-schema turns nullable DB data into a whole-page crash

- **Symptom:** an account/opportunity detail (or the accounts list) shows
  **"This page couldn't load"** with **no digest** and **no red console error the
  user notices**; DevTools Network shows only a placeholder ("Content unavailable.
  Resource was not cached"). The server request returns **200** — it's a
  **client-side** failure. Console (once captured) shows
  `ZodError … path ["contacts",0,"first_name"] expected string, received null`
  plus React **#419**.
- **Cause:** a table row-schema (`accounts/table-data/schema.tsx`) declared a
  contact field `z.string().optional()`, which rejects an explicit `null`. But
  `crm_Contacts.first_name` is **nullable in the DB**, and a company contact
  (created by a **target→opportunity conversion**) has a null first name. The
  schema is parsed **during render** (`data-table-row-actions:
  accountSchema.parse(row.original)`), so the reject throws mid-render → the whole
  page fails to hydrate.
- **Fix / rule:** **read/display schemas must be at least as permissive as the DB
  column** — use `.nullish()` for a DB-nullable field, not `.optional()` (which
  only allows `undefined`). A display schema should never enforce a business rule
  by throwing; bad data should still render so it can be seen and fixed.
  Enforcement (e.g. "individuals must have a name") belongs on the **write path**.
- **Tell:** server 200 + no digest + `React #419` → look for a client-side
  `.parse()` (zod) over row data, and diff the schema against the Prisma model's
  nullability.

## Frontend / Tailwind

### A TanStack faceted filter over an array-valued column needs a column-level `getUniqueValues`

- **Symptom:** a new faceted (multi-select) filter built on a column whose accessor
  returns an **array** (e.g. the target's list names / tags) shows no options, or
  options that are whole arrays, and matching misbehaves.
- **Cause:** `getFacetedUniqueValues()` counts whatever `row.getUniqueValues(colId)`
  returns, and the **default** is `[row.getValue(colId)]` — for an array accessor
  that's `[["A","B"]]`, so the facet keys on the array object, not on `"A"`/`"B"`.
- **Fix / rule:** define `getUniqueValues: (row) => string[]` on that column
  (returning the flattened values), and keep it in sync with the accessor (factor a
  shared helper). Then the facet lists each individual value. String-accessor
  columns (e.g. Industry) don't need this — only array-valued ones.
- **Tell:** an empty/garbled options list on a faceted filter whose column accessor
  returns an array.

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

### An uncapped `pg` pool exhausts the session-mode pooler → *every* page 500s

- **Symptom:** the whole app shows "This page couldn't load" with a digest (e.g.
  `3914836991`) on **every** route at once. Vercel runtime logs show better-auth
  `APIError: Failed to get session` (`FAILED_TO_GET_SESSION`), and underneath it
  `DriverAdapterError: (EMAXCONNSESSION) max clients reached in session mode -
  max clients are limited to pool_size: 15`. Looks like a specific user action
  (e.g. "convert target to deal") broke the site — but that action was only the
  straw that pushed concurrent connections over the ceiling.
- **Cause:** every page needs the session, so once the DB pool is exhausted the
  session read fails and *all* pages fail. Upstream's `lib/prisma.ts` builds the
  `pg` pool with **no `max`**, so it uses pg's default of **10 per function
  instance**; against the hosted **session-mode** pooler (`pool_size 15`), ~2 warm
  Vercel instances exhaust it — with barely any real traffic.
- **Fix / rule:** cap the pool from `DB_POOL_MAX` (default 3, **never 1**) and set
  the env var on **every** scope — `new Pool({ connectionString, max: Number(process.env.DB_POOL_MAX) || 3 })`.
  Use `|| 3`, not `?? 3`: an empty-string/invalid value coerces to `0`/`NaN`, and
  pg treats a falsy `max` as its default of **10**, silently re-creating the
  exhaustion. Also attach `pool.on("error", …)` (Supavisor idle-reaps / `57P01`).
  For real scale, move request handlers to the **transaction** pooler (`6543`) —
  `max` can't beat the session-mode ceiling. See `SUPABASE_ON_VERCEL.md` §3–4.
- **Tell:** `EMAXCONNSESSION … session mode … pool_size: 15` in Vercel logs, and a
  site-wide `FAILED_TO_GET_SESSION` rather than one broken route.

### `prisma migrate dev` is interactive — it can't author a migration in an agent shell

- **Symptom:** `pnpm exec prisma migrate dev --name X` aborts with *"Prisma Migrate has
  detected that the environment is non-interactive"* (often after applying a pending
  migration first), so no new migration file is created.
- **Cause:** `migrate dev` needs a TTY (it prompts, uses a shadow DB, and can offer a
  reset). Agent/non-TTY shells don't provide one.
- **Fix / rule:** hand-author the migration file the way this repo already does —
  `prisma/migrations/<timestamp>_<name>/migration.sql`, additive and idempotent
  (`CREATE TYPE … EXCEPTION WHEN duplicate_object`, `ADD COLUMN IF NOT EXISTS`,
  `CREATE INDEX IF NOT EXISTS`) — then apply with `prisma migrate deploy` (non-inter-
  active) and `prisma generate`. This matches the enum/column migrations already in
  the repo and is exactly what CI's build runs.
- **Also:** `migrate dev --create-only` can abort the same way when the local DB has
  pre-existing drift (it wants to reset). Don't reset a shared local DB to get past it —
  hand-author the migration as above.
- **Tell:** the error text says "non-interactive"; `migrate deploy` has no such gate.

### A dev server started before a schema change keeps a stale Prisma client — writes fail with a generic error

- **Symptom:** after adding a column/enum and running `prisma migrate deploy` + `prisma generate`,
  creating the record in the UI shows a generic *"Failed to create target"* (a broad `catch` in the
  server action), and the dev-server log shows nothing. The DB has the column; `tsc` is happy.
- **Cause:** the running `next dev` process cached the old generated client on `globalThis`, which
  rejects the new field as an unknown argument. The action's blanket `catch { return { error } }`
  hides the real Prisma message.
- **Fix / rule:** **restart the dev server** after any schema change + `prisma generate`. In E2E,
  make sure the server Playwright reuses (`reuseExistingServer`) was started *after* the client was
  regenerated. If a swallowed error is hiding the cause, log the caught error in the catch.
- **Tell:** a write that includes the new column fails generically while reads and the DB itself are fine.

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

### The session pooler exhausts under normal load and takes down the *whole* app, not just one route

- **Symptom:** a page throws "This page could not load" with digest `FAILED_TO_GET_SESSION`;
  soon **every** page 500s, not just the one you were on. A public write (e.g. the
  web-lead endpoint) also 500s at the same moment. Runtime logs show
  `(EMAXCONNSESSION) max clients reached in session mode - pool_size: 15`.
- **Cause:** on the Supabase **session** pooler (`:5432`) every connection is a
  dedicated session. Each warm Vercel instance holds up to `DB_POOL_MAX` (3) of the
  ~15-connection pool, so a handful of concurrent instances (pages + Inngest +
  background work) exhaust it. Because *every* server render does a better-auth
  **session lookup**, once the pool is dry auth fails app-wide — the "one page"
  symptom is misleading. The per-instance `DB_POOL_MAX` cap can't prevent this;
  instances × cap still overruns 15.
- **Fix / rule:** point the **runtime** pool at the **transaction** pooler (`:6543`)
  via `RUNTIME_DATABASE_URL` (`lib/db/runtime-database-url.ts`); keep `DATABASE_URL`
  on the session pooler (`:5432`) for `prisma migrate deploy`. Raising the Supabase
  pool size is a stop-gap; transaction mode is the real fix because it multiplexes.
  Never move `DATABASE_URL` itself to `:6543` (breaks migration DDL/advisory locks).
- **Tell:** the digest resolves to `FAILED_TO_GET_SESSION` and the error underneath
  it is `EMAXCONNSESSION … session mode`. It's infra, not the feature you just shipped.

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

## MCP server / integrations

### An MCP tool's Zod schema silently strips undeclared fields — keep it at parity with the write path

- **Symptom:** `crm_create_target` "accepted" `company_website`/`industry`/`city` (no
  error) but they never landed in the DB — the handler forwarded them via `...rest`, yet
  they were gone before it ran.
- **Cause:** the tool validates args with `z.object({...}).parse()`, which **drops keys
  the schema doesn't declare**. So a field missing from the schema is stripped at the
  boundary, even though the handler would happily persist it. A test that calls the
  handler directly passes (it bypasses the schema) — the gap only shows through `.parse()`.
- **Fix / rule:** keep MCP create/update schemas at parity with the real write surface
  (here: `lib/spreadsheet/target-fields.ts`, the CSV importable set), and assert parity
  in a test that reads the schema `.shape` — don't test the handler in isolation.
- **Tell:** an MCP write "succeeds" but a field is missing afterward, with no validation error.

### A new target field must be added to every hand-maintained field list — one is easy to miss

- **Symptom:** a new `crm_Targets` column works in the form and MCP but is missing from the CSV
  import mapping (or the auto-suggested mapping never proposes it).
- **Cause:** the target field set is duplicated by hand: `lib/spreadsheet/target-fields.ts` (import/
  export set), the MCP tool Zod schemas, the create/update action arg types, **and**
  `actions/crm/targets/suggest-mapping.ts`, which keeps its **own hardcoded field array** and does
  not read `target-fields.ts`.
- **Fix / rule:** when adding a target field, grep for a sibling field (e.g. `company_website`) and
  update every hit; don't assume `target-fields.ts` is the only list. Note `target-fields.ts` also
  drives CSV/XLSX **export**, so a new field there adds an export column.
- **Tell:** a field imports fine when mapped manually but is never auto-mapped.

### The MCP Streamable-HTTP transport path is `/api/mcp/mcp`, not `/api/mcp/http`

- **Symptom:** an MCP client fails to connect to the CRM's server with
  `ENDPOINT_NOT_FOUND` / a 404 at `…/api/mcp/http`, even though the app is up and the
  token is valid.
- **Cause:** the route is `app/api/mcp/[transport]/route.ts` with `mcp-handler`, whose
  transport segments are **`mcp`** (Streamable HTTP) and **`sse`** (legacy) — there is
  no `http` transport. Some **archived plan/spec docs** under `docs/superpowers/` and
  older curl snippets said `/api/mcp/http`; that path never routed (see the
  `fix(mcp): set basePath so /api/mcp/{mcp,sse} actually route` commit).
- **Fix / rule:** connect to **`/api/mcp/mcp`** (Streamable HTTP, POST-only — a GET
  returns 405, which confirms it exists) or `/api/mcp/sse` (SSE). **Trust `README.md`
  and the `SKILL.md` files (already correct) over historical `docs/superpowers/` plans.**
  Verify live with `curl -i -X POST https://<host>/api/mcp/mcp -H 'Accept: application/json, text/event-stream' -d '{"jsonrpc":"2.0","id":1,"method":"initialize",...}'` → expect a `200` with an `initialize` result.
- **Tell:** `ENDPOINT_NOT_FOUND` on `/api/mcp/http`; a GET to `/api/mcp/mcp` returns 405 (exists) while `/api/mcp/http` returns 404.

### Vercel Deployment Protection blocks token-auth MCP clients on the QA/Preview tier

- **Symptom:** the QA MCP server fails with **HTTP 401** whose body contains a Vercel
  SSO callback (`vercel_auth_callback: https://vercel.com/sso-api?url=…`), even with a
  valid app Bearer token. Browsers reach QA fine (you're logged into Vercel).
- **Cause:** Vercel **Deployment Protection** (Vercel Authentication) is **on by
  default for Preview** (`qa.crm.radeengineering.com`). It intercepts every request
  with an SSO gate *before* it reaches the app, so a Bearer token never gets a chance —
  the 401 is Vercel's, not the app's.
- **Fix / rule:** either add a **Protection Bypass for Automation** secret and send it
  as an `x-vercel-protection-bypass` header alongside the app token, or turn off Vercel
  Authentication for Preview (makes QA publicly reachable — the app still requires OTP
  login). Production's custom domain is not protection-gated, so prod needs neither.
- **Tell:** a 401 whose JSON mentions `vercel.com/sso-api` — that's Vercel's gate, not the app.

## Background jobs / Inngest

### A top-level native-module import in ANY Inngest function 500s the whole `/api/inngest` route on Vercel

- **Symptom:** every request to `/api/inngest` (GET/POST/PUT) returns **500** on Vercel;
  Inngest can't sync the app ("Sync new app" → *internal server error response from url*),
  the branch/custom environment never registers, and events 404 with
  `Inngest API Error: 404 Branch environment does not exist`. Downstream, everything that
  dispatches Inngest events (enrichment, embeddings, email sync, campaign sends, calendar)
  looks broken with unrelated-seeming errors (e.g. the UI's generic "failed to start
  enrichment"). Works fine on local Mac dev, so it only shows up once deployed.
- **Cause:** `app/api/inngest/route.ts` eagerly imports **all** functions. One function did
  a top-level `import sharp from "sharp"`, so sharp's native libvips binding loaded when the
  route module was imported. On Vercel's serverless runtime that `.so` isn't loadable
  (`ERR_DLOPEN_FAILED: libvips-cpp.so…`) → the route throws at import time → 500 for every
  request. The Inngest "branch environment does not exist" 404 and all the key/env theories
  are red herrings two layers downstream of the real import-time crash.
- **Fix / rule:** never import a native/heavy module at module scope in an Inngest function
  file — lazy-load inside the handler: `const sharp = (await import("sharp")).default;`.
  Diagnose from **Vercel runtime logs for `/api/inngest`** (the real error names the module),
  not from the Inngest env error. Making the native module actually run on Vercel (file
  tracing of the `.so`) is a separate fix that unused features can defer.
- **Tell:** `/api/inngest` 500 in Vercel logs citing `Failed to load external module …`;
  Inngest "Sync new app" returns *internal server error response from url*.

## Testing

### A schema-validated MCP-tool test needs a strict-format UUID, not the shared placeholder id

- **Symptom:** a new test that parses args **through** a tool's Zod schema fails with
  `ZodError … Invalid UUID` on `id`, while sibling tests using the same id pass.
- **Cause:** most MCP tool tests call the handler directly (`run(name, args)`), which
  **bypasses Zod**, so a loose placeholder like `11111111-1111-1111-1111-111111111111`
  never gets validated. `z.string().uuid()` enforces the RFC version/variant nibbles, which
  that placeholder violates — only a `schema.parse(...)` path hits it.
- **Fix / rule:** in a test that parses through the schema (to exercise a schema change),
  use a valid UUID such as `11111111-1111-4111-8111-111111111111` (v4, variant-8), not the
  handler-direct placeholder.
- **Tell:** `Invalid UUID` on `id` appearing only in tests that call `schema.parse(...)`.

### Changing a UI placeholder/label breaks E2E specs that locate by exact text

- **Symptom:** E2E goes red after a purely cosmetic UI copy change — e.g.
  `expect(getByPlaceholder('Filter by name or company ...')).toBeVisible()` fails
  "element(s) not found", and a later `.fill()` on the same locator times out.
- **Cause:** the placeholder was reworded (added "industry") but specs still matched
  the **old exact string**. Nothing else changed; CI (8 min) was the first to catch it.
- **Fix / rule:** locate stable inputs by a **prefix regex** (`getByPlaceholder(/Filter by name/)`)
  or by role, not the full copy. When you change any user-visible string, **grep the
  `tests/e2e` specs and the manual-test docs for the old text in the same PR** — the
  manual↔E2E parity walk should catch it before pushing.
- **Tell:** an E2E `getByPlaceholder`/`getByText`/`getByRole({name})` failing right
  after a copy tweak, with the source change touching only display text.

---

<!-- Add new entries above this line, newest-relevant first within each section.
     Create a new `## <area>` heading when a trap doesn't fit an existing one. -->
