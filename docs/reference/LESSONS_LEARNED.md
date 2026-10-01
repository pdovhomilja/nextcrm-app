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

### Re-check a state invariant in the job, not only in the emitter — events can be reordered

- **Symptom (latent):** the homepage upload-override rule ("an uploaded page is never AI-refined")
  was enforced only in the trigger action (`refine-homepage.ts` refuses when the current version
  is `UPLOAD`). But a `homepage/target.refine` event can be queued, then a `homepage/target.upload`
  completes and repoints `current_version_id` to an `UPLOAD` version, then the already-queued refine
  runs — silently turning the operator's uploaded design into an AI `HUMAN` version. Per-target
  `concurrency.limit:1` serializes execution but does **not** fix event *ordering*.
- **Cause:** the invariant was checked at the emitter (the action), which reads state that can change
  before the consumer (the Inngest job) runs. The gap between emit and run is a real window.
- **Fix / rule:** re-validate the load-bearing invariant **inside the job** at run time, after
  loading the row it acts on — don't trust that the emitter's precondition still holds. In
  `refineFlow` the `load-current-version` step now selects `pass_kind` and throws
  `NonRetriableError` (same refusal message as the action) if it is `UPLOAD`, before any model call.
  Persist FAILED + throw `NonRetriableError` so the run doesn't retry a permanently-invalid state.
- **Tell:** a guard that lives only in a server action/trigger while the actual mutation happens in a
  later-scheduled job; ask "what if the row changed between emit and run?"

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

### Headless chromium (`@sparticuz/chromium` + `playwright-core`) must be lazy-imported inside the handler

- **Symptom:** after adding the homepage-render job, every request to `/api/inngest` 500s on
  Vercel (Inngest can't sync), while local Mac dev is fine. Same failure family as the `sharp`
  entry above.
- **Cause:** `app/api/inngest/route.ts` eagerly imports every function file; a module-scope
  `import chromium from "@sparticuz/chromium"` / `import { chromium } from "playwright-core"`
  loads the binary-carrying packages when the route module is imported, and a resolution or
  native-load failure there takes down the whole route.
- **Fix / rule:** import both **inside** the function that launches the browser
  (`lib/homepage/render.ts` -> `await import(...)`), keep them in `serverExternalPackages`
  (`next.config.js`), and never re-export them from a module the Inngest route imports at
  scope. Diagnose from Vercel runtime logs for `/api/inngest`.
- **Tell:** `/api/inngest` 500 the deploy after a render/scrape/PDF dependency landed.

### `@sparticuz/chromium` vs `playwright-core` version skew — the Chromium MAJORs must match (CONFIRMED in prod)

- **Symptom:** every homepage render on Vercel failed with
  `page.screenshot: Target page, context or browser has been closed` — and a preceding
  `[HOMEPAGE_RENDER] setContent did not fully settle … Target page … has been closed`.
  The browser was already dead at `setContent` (the *first* page op, before any HTML
  loaded), and even `revert` (re-rendering previously-good stored HTML) failed identically,
  so it was not a heavy-page problem. Local Mac dev was fine — the serverless
  `@sparticuz/chromium` binary only runs on Linux, so this surfaced only once deployed.
- **Cause:** a two-major Chromium skew. `playwright-core` 1.58.2 drives Chromium **145**
  (see `node_modules/playwright-core/browsers.json`), but `@sparticuz/chromium` 147.0.2
  ships Chromium **147**. Playwright can start a binary of the wrong major but cannot
  reliably drive it over CDP, so the renderer crashes on/just after launch.
- **Fix / rule:** **keep the Chromium MAJOR equal on both sides.** There is no `@sparticuz`
  build for 145/146 (it jumps 143 → 147), so the fix was to move Playwright *up* to the
  major that matches the binary: `playwright-core` → **1.59.1** (Chromium 147), with
  `@sparticuz/chromium` left at 147.0.2 and `@playwright/test` pinned to the same 1.59.1
  (a caret had floated it to a newer major and pulled in a second `playwright-core`).
  Find the mapping authoritatively from each package's `browsers.json` / the `@sparticuz`
  version (its major = its Chromium major); don't trust memory. After any bump, re-verify on
  a **Vercel preview (QA)** — `scripts/smoke/homepage-render-smoke.cjs` only exercises the
  *local* Playwright chromium, never the serverless binary, so a green local smoke does **not**
  prove the serverless launch.
- **Tell:** homepage jobs go `FAILED` with a browser-launch / "…has been closed" / CDP error
  **only on Vercel**; `revert` of a known-good version fails the same way (→ it's the binary,
  not the generated HTML).

### Inngest: classify errors (transient→retry, terminal→fail-fast) or you throw away resume

- **Symptom:** a multi-step Inngest job (the homepage render loop: initial + 3 auto passes)
  that failed on a *late* step restarted from scratch — every retry re-ran all the earlier,
  already-completed passes (each an expensive Anthropic vision call), and a single flaky
  render marked the whole run `FAILED`.
- **Cause:** the flow's `catch` converted **every** error to `NonRetriableError` (one
  `failRun` helper), on the belief that retrying would "re-run the whole expensive flow." But
  Inngest **memoizes completed steps**: a retry replays finished steps from state and only
  re-runs the failed one. Blanket-`NonRetriableError` opted the job *out* of that free resume.
- **Fix / rule:** split failures by whether a retry can help (`endRun` in
  `inngest/functions/generate-homepage.ts`). Throw `NonRetriableError` **at the source** for
  genuinely terminal states (missing key, deleted row, a guard, a not-found) → mark `FAILED`
  in-body immediately. For everything else (render crash, provider 5xx/429, a timeout, an R2
  blip) **rethrow the original error unchanged** so Inngest retries and resumes from the last
  completed step. Do **not** mark `FAILED` in-body for a transient error — leave the row
  `RUNNING` across the retry window and let the `onFailure` backstop record `FAILED` once
  retries are exhausted (keeps the "never stuck RUNNING" invariant). Consequence to expect: a
  transient failure now shows `RUNNING` for longer (the retry/backoff window) before `FAILED`,
  and its final row `error` carries the `onFailure` backstop prefix.
- **Gotcha:** a terminal error thrown *inside* a `step.run` (vs the flow body) only stays
  terminal if the runtime preserves `NonRetriableError` across the step boundary — prefer
  throwing terminal guards in the flow body, and QA-verify any that must live inside a step.
- **Tell:** an Inngest `catch` that wraps *all* errors in `NonRetriableError`; expensive early
  steps re-running on what should have been a resumable retry.

## AI / outbound email

### Claude wraps "return only JSON" output in code fences or a preamble — tolerate it

- **Symptom:** AI email generation intermittently fails with "AI returned an unexpected
  response" even though the model produced a perfectly good `{subject, html}` object.
- **Cause:** the prompt says "Return ONLY valid JSON", but Anthropic models often reply
  with a chatty preamble and/or a ```` ```json ```` fence around the object. A bare
  `JSON.parse(text)` throws on either.
- **Fix / rule:** never `JSON.parse` raw model text. Extract the object first — strip a
  fence if present, then slice from the first `{` to the last `}` — and only then parse
  and validate the shape (`extractJsonObject` in `actions/crm/targets/generate-target-email.ts`).
  Keep failure a clean user-facing error, not a throw. The E2E mock deliberately returns
  fenced + preambled output so this stays covered.
- **Tell:** intermittent JSON-parse failures on LLM output that "works when you retry".

### A one-off cold email must never be retryable by a post-send bookkeeping failure

- **Symptom (the trap avoided):** the email is already delivered, then a later step
  (mark `SENT`, write the activity, audit log, `revalidatePath`) throws — the action
  returns an error, the operator clicks Send again, and the prospect gets a **duplicate
  cold email**.
- **Cause:** send + bookkeeping share one try/error path, so a DB/audit hiccup after the
  provider accepted the message looks identical to "the send failed".
- **Fix / rule:** split the two phases in `actions/crm/targets/send-target-email.ts`.
  Render + send failures (returned **or** thrown) mark the row `FAILED` and return an
  error; everything **after** the provider accepted the message is wrapped in its own
  try/catch that logs and still returns success. Never let a side-effect that follows an
  irreversible external send surface as a user-visible failure.
- **Tell:** any "send then record" action whose error return can be reached after the
  external call succeeded.

### An email unsubscribe link must not mutate on GET

- Email unsubscribe links must not mutate on GET (scanners/prefetchers auto-visit) — GET
  shows a confirm form, POST mutates; pair with `List-Unsubscribe-Post` for RFC 8058
  one-click. See `app/api/crm/targets/unsubscribe/route.ts`.

### Outbound email must fail closed on a missing base URL (NEXTAUTH_URL)

- **Symptom / risk:** the List-Unsubscribe header and footer link are built from
  `NEXTAUTH_URL`; with it unset the email ships with a dead (relative/empty) unsubscribe link.
- **Fix / rule:** the send path returns an error **before creating a draft** when the base URL
  is missing, rather than sending. Any outbound-email link that must be absolute (unsubscribe,
  tracking) should fail closed, not fall back to an empty string.
- **Tell:** a template/link builder with `?? ""` on an env-derived origin.

### Fetching a prospect's website (`company_website`) is an SSRF surface

- **Risk:** the homepage generator loads `company_website` in a headless browser to screenshot
  and mine brand assets. That URL is user/CSV/MCP-supplied data, so it can point at
  `localhost`, cloud metadata (`169.254.169.254`), or an internal host.
- **Rule:** every fetch of a prospect URL goes through the shared host guard
  (`assertPublicHost`, `lib/net/host-guard.ts`) **before** navigation, with a hard timeout and
  **downloads disabled** (`lib/homepage/harvest-source.ts`). A blank or blocked URL degrades to
  "generate without a source screenshot", never a failed job. `MAIL_ALLOW_PRIVATE_HOSTS` must
  never be set in Preview/Production; the harvester also refuses to run if it is set in a
  hosted env (fail-safe). Assert the blocked-URL path in a test.
- **Accepted residual — DNS-rebinding TOCTOU:** the guard resolves the host, then the browser
  resolves it again, so a hostile DNS server could answer differently the second time. The
  blast radius is bounded to a screenshot/brand-copy of whatever that answer serves (no
  response is returned to the caller). Host-resolver pinning (`--host-resolver-rules` /
  routing through a pinned IP) is a possible fast-follow.

### Serving model-generated HTML: isolate the host AND sandbox the document

- **Risk:** the preview page is LLM-generated from scraped third-party content (so it can
  contain script) and `/p/[slug]` is reachable on every host, including the authenticated CRM
  host, where a stray script would otherwise run with CRM cookies.
- **Rule (defence in depth):** (1) publish/link the previews on the dedicated
  `previews.` host (`NEXT_PUBLIC_PREVIEWS_BASE_URL`), and (2) always send
  `Content-Security-Policy: sandbox allow-scripts` (`lib/homepage/serve.ts`, **without**
  `allow-same-origin`) so the document gets an opaque origin — scripts and CDN Tailwind still
  run, but no cookies/storage/same-origin fetches reach the CRM session. The in-app preview
  `<iframe sandbox="allow-scripts">` matches. Also `noindex`, `nosniff`, and a generic 404 for
  every miss (no slug enumeration). **Never add `allow-same-origin`.**
- **Tell:** any change to `/p/` headers or the iframe `sandbox` attribute that adds
  `allow-same-origin`, or serves the HTML from the CRM origin without the CSP.

### Gate the public preview on "has a published version", not on job `status`

- **Symptom:** an already-emailed `/p/<slug>` link 404s while a refine/regenerate/revert runs
  (`status=RUNNING`) and after a failed refine (`status=FAILED`), even though the previously
  published R2 object is intact.
- **Cause:** the serve gate required `status: "READY"`, but the job flips status through
  RUNNING/FAILED without touching the live R2 object.
- **Rule:** `lib/homepage/serve.ts` gates on `current_version_id: { not: null }` (plus
  `deletedAt: null`). A never-published page (no version) still 404s. Never key public
  availability off a transient job status.
- **Related (Inngest state):** never return base64 image data from a `step.run` — every step
  output is persisted in run state and can hit output limits on media-rich pages. Do
  render + screenshot + vision inside one step, or pass a short transient R2 key
  (`previews/<slug>/tmp/source.png`) between steps.

### Non-streaming vision calls share the render step's ~300s budget — keep `max_tokens` modest (streaming is the follow-up)

- **Symptom (latent):** a large `max_tokens` (e.g. 32000) on the homepage generate/refine call can run
  past the generate abort (`GENERATE_TIMEOUT_MS`, 200s) and, combined with the headless render in the
  same Inngest step (`RENDER_TIMEOUT_MS`, 60s), blow the ~300s Vercel function budget on very large pages.
- **Cause:** `lib/homepage/provider.ts` makes a **non-streaming** Messages call, so the whole completion
  must finish inside one request; output time scales with tokens. A big ceiling is only safe if the model
  actually stops early.
- **Rule / fix:** `DEFAULT_MAX_TOKENS` in `lib/homepage/settings.ts` is **16000** (not the originally
  planned ~32000); `clampMaxTokens` still allows admins to go up to the per-model ceiling
  (`MODEL_MAX_TOKENS`), at their own risk. **Follow-up to raise it safely:** switch the call to streaming
  (or move render into its own `step.run`) so the generate and render budgets stop competing.
- **Tell:** a long page that "times out / aborts" only at high admin `max_tokens`; lowering the value
  (or a shorter brief) makes it complete.

### Next.js Server Actions cap request bodies at ~1 MB — file/large-body uploads need a route handler

- **Symptom:** uploading a self-contained HTML page of a few hundred KB to a few MB via a `"use server"`
  action is rejected before any of your own size/validation code runs.
- **Cause:** Next.js limits Server Action request bodies to ~1 MB by default (`serverActions.bodySizeLimit`).
  Route handlers are bounded by the platform instead (Vercel ~4.5 MB).
- **Rule / fix:** take any upload or large JSON body through a **route handler**, not a server action. The
  homepage upload override is `app/api/crm/targets/[id]/upload-homepage/route.ts` (auth + APPROVED gate in
  the route; the validate/stage/send/audit core lives in `lib/homepage/upload-homepage-core.ts`). Keep the
  app cap under the platform limit with headroom for JSON escaping (`MAX_UPLOAD_BYTES` = 4 MB, client
  pre-check ~3.5 MB), and surface a 413 as "too large". Shared constants go in a plain module
  (`lib/homepage/upload-limits.ts`) — a `"use server"` file may only export async functions.
- **Tell:** a generic failure/413 on a moderately large action payload with no server log from your code.

### Admin-editable prompts vs the code-owned machine contract — always append the contract

- **Rule:** the admin-editable `HOMEPAGE_BASE` prompt carries *creative direction* only. Everything the
  pipeline mechanically depends on — the JSON output shape, the allowed egress hosts / pinned GSAP URL
  (imported from `lib/homepage/render-allowlist.ts` so the prompt and renderer can't drift), the logo
  placeholder token, and the "never invent contact details/facts" rule — lives in `MACHINE_CONTRACT`
  (`lib/homepage/prompt.ts`) and is **always appended** by `buildSystemPrompt`. A weak or edited base can
  then degrade design quality but cannot break parsing, egress, or logo substitution.
- **Also:** authoring/editing `HOMEPAGE_BASE` prompts is admin-gated server-side in
  create/update/delete-prompt (the prompt library is otherwise open to any authenticated user).

## Testing

### A slow/near-timeout E2E CI run is usually the Playwright browser install, not flaky tests

- **Symptom:** the `E2E (Playwright)` CI job ran ~21min (vs a normal ~11–12min) and
  looked like it was about to blow the 30min job cap, so "flaky tests" got the blame.
- **Cause:** the Playwright test phase was fine — `116 passed (~8.5min)`, **0 flaky, 0
  retries used**, identically on both the slow and fast runs. The variance was **one
  setup step**: `pnpm exec playwright install --with-deps chromium` took **~11m45s** on
  the slow run (uncached browser download + `apt-get` for OS libs, both at the mercy of
  the runner's CDN/apt-mirror luck). The `attempts: 3` lines in the log were the *app's*
  AWS-S3 SDK retrying inside the dev server — not test retries.
- **Fix / rule:** before blaming the suite, read the **per-step timestamps** of the job
  (`gh run view --job=<id> --log`, diff the step start times) and the Playwright summary
  line (`N passed (Xm)` + any `flaky`). Cache the browser under `~/.cache/ms-playwright`
  keyed to the Playwright version; run `install chromium` (cached) and `install-deps`
  (apt) as separate steps. Add a Playwright `globalTimeout` (CI) so a genuine hang fails
  fast under the GitHub job cap instead of silently crawling to it — but note it guards
  only the test phase, not the install steps before it.
- **Tell:** E2E wall-clock swings run-to-run while the `N passed (Xm)` figure stays
  constant → it's setup/infra time, not the tests.

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

### Server-side third-party calls can't be mocked with `page.route` — use a base-URL seam

- **Symptom:** an E2E that "mocks" Anthropic/Resend with `page.route('**/api.anthropic.com/**')`
  passes the interception setup but the flow still hits the real API (or fails with an
  auth error in CI's dummy-key env).
- **Cause:** those calls happen inside **server actions** running in the Next server
  process; Playwright's `page.route` only sees the browser's own requests.
- **Fix / rule:** give the server an env-configurable base URL (`ANTHROPIC_BASE_URL`; the
  `resend` SDK already honours `RESEND_BASE_URL`), point both at a mock HTTP server the
  spec starts, set them in `playwright.config.ts` (so `pnpm dev` inherits them), and
  assert on what the mock **received** — that also proves the server picked up the seam
  before anything irreversible (a send) is clicked. Kill any pre-existing dev server first
  (`reuseExistingServer` keeps its old env).
- **Tell:** an E2E "mock" whose call counter stays 0.

### Two specs in one file share a fixture prefix — one's cleanup deletes the other's rows

- **Symptom:** a spec passes alone (`-g name`) but fails in the full file with fixtures
  "missing" (an empty prompt list, `toHaveValue("")`), differing by run order.
- **Cause:** two `describe`s ran in parallel workers and both cleaned up with
  `DELETE … WHERE name LIKE '<PREFIX>%'` on the same prefix, so the fast one wiped the
  slow one's seeded rows mid-test.
- **Fix / rule:** give each independent describe its own fixture prefix, or make the file
  `test.describe.configure({ mode: "serial" })`. Cleanup must only match rows that
  describe itself created.
- **Tell:** flaky "fixture not found" that vanishes when the failing test is run alone.

### An E2E that needs private object storage can't run in CI's e2e job — probe and skip, don't fail

- **Symptom:** a spec that seeds/reads R2 passes locally (SeaweedFS on `:9000`) but fails in
  CI with `ECONNREFUSED 127.0.0.1:9000`, or the served route silently 404s.
- **Cause:** CI's `e2e` job has `MINIO_*` set to dummy values but **no S3 service** — only
  Postgres + Inngest. Storage-backed code takes a different path there (see "Environment-
  branched code paths" in `e2e-patterns.md`).
- **Fix / rule:** keep DB-only assertions (drawer, versions, "no object -> generic 404")
  unconditional; gate the storage-backed assertions on a reachability probe in `beforeAll`
  and `test.skip` with an explicit reason. Never let the probe fail the run. If storage-backed
  coverage matters in CI, add an S3 service container to the job instead.

### `@sparticuz/chromium`'s binary isn't file-traced — serverless launch fails while CI stays green

- **Symptom:** the homepage Inngest job works locally but on Vercel the render step throws at
  `chromium.executablePath()` / launch (missing binary), even though CI (unit + build) was green.
- **Cause:** the brotli-packed chromium binary lives in `node_modules/@sparticuz/chromium/bin/`
  and is loaded at **runtime**, so Next's dependency tracer never sees it and omits it from the
  serverless bundle. CI never bundles for Vercel, so it can't catch this.
- **Fix / rule:** add the package's `bin/**` to `outputFileTracingIncludes` for the function that
  launches it (`"/api/inngest"` here) in `next.config.js`. Verify on the FIRST QA deploy, together
  with the playwright-core/@sparticuz chromium-version skew.

### Returning `{ failed: true }` from an Inngest flow marks the run green — throw after persisting FAILED

- **Symptom:** a background job's row is correctly `FAILED` and the user sees the error, but the
  Inngest dashboard shows the run **Completed** (green), `onFailure` never fires, and there's no log
  of the underlying error (only a truncated message on the row).
- **Cause:** a flow that catches its error and `return`s a value tells Inngest the run succeeded.
  The stack is lost and alerting/backstops don't trigger.
- **Fix / rule:** in the catch, `console.error` with context, persist `status: FAILED` to the row,
  THEN `throw new NonRetriableError(message)` — the run shows red, `onFailure` fires as a backstop,
  and the whole (expensive) flow is not retried. Reserve plain `throw`/retries for genuinely
  transient step failures; step-level retries already cover those before the flow catch runs.
- **Tell:** tests that `await handler()` on a failure path must switch to `.rejects` / swallow the
  throw (the DB-state assertions still hold because FAILED was persisted before the throw).

### Rendering LLM-generated HTML in headless chromium is an SSRF egress hole — block the network at render

- **Symptom:** the harvest step guards outbound requests (SSRF), but the *render* step loads
  model HTML with scripts enabled and no egress restriction — indirect prompt injection (via
  prospect-controlled copy) could emit `<img>/fetch()` at internal hosts that fire from the server.
- **Fix / rule:** the generated document is required to be self-contained, so ENFORCE it — install
  `context.route("**/*", r => r.abort())` before `setContent` so only the in-memory document +
  `data:`/`blob:` render. It also removes the `networkidle` flakiness (switch to `waitUntil: "load"`).
- **Tradeoff it creates:** blocking egress ALSO blocks a legit remote logo `<img src>`, so the
  screenshot (email image + vision self-critique) would diverge from the served page. Fix: at harvest,
  fetch the logo bytes (re-validate the host with the SAME SSRF guard, `page.request` bypasses CORS,
  cap size) and inline them as a `data:` URI. Feed the model a placeholder token (never the base64 — it
  would blow up prompt tokens), persist the data URI on the row (`logo_data_uri`) so refine/revert can
  reuse it, and substitute the placeholder only at render + upload time.

### A bare `:locale` redirect in next.config swallows `/api/*` and 404s every API call it prefixes

- **Symptom:** every `fetch()` to `/api/crm/targets/*` (generate-homepage, enrich, …) fails in the UI
  with the generic "Something went wrong. Please try again", and the **serverless function logs are
  empty** — the request never reached a function.
- **Cause:** `redirects()` had `source: "/:locale/crm/targets/:path*"`. A **bare `:locale` matches ANY
  first segment, including the literal `api`**, so `/api/crm/targets/<id>/generate-homepage`
  308-redirects to `/api/campaigns/targets/<id>/generate-homepage`, which has no route → 404. The
  browser follows the 308 (POST preserved), the drawer's `res.json()` fails on the 404 HTML, and it
  shows the generic error. The redirect fires at the routing layer *before* any function, hence no logs.
- **Fix / rule:** constrain the locale segment to the real locale set —
  `/:locale(en|cz|de|uk)/crm/...` (extracted to `lib/legacy-redirects.js`, unit-tested). Never leave a
  bare `:locale` on a redirect whose path shares a prefix with `/api`.
- **Tell:** a feature's POST "just fails" with no server log; confirm with
  `curl -s -D - --max-redirs 0 -X POST <url>` — a `308` to a non-existent path is the smoking gun.

### A server action that THROWS shows users a redacted crash in production — return `{data}|{error}`

- **Symptom:** an AI/API call in a server action fails and the user sees "An error occurred in the
  Server Components render. The specific message is omitted in production builds … a digest property
  is included" — even though the client caller has a `try/catch` that sets an error message.
- **Cause:** Next.js **redacts errors thrown from server actions** at the server→client boundary in
  production. The client's `catch` receives the redacted message, not the real one (e.g. an OpenAI
  429). Only THROWN errors are redacted — **returned values are not**.
- **Fix / rule:** server actions should **return** a discriminated result (`{ data } | { error }`)
  with a friendly message, not throw, for expected failures (rate limit, bad key, timeout, bad
  response). If the throwing action is upstream-owned, wrap it in a fork-owned action that catches
  server-side (the real message is visible there) and returns the mapped error — see
  `actions/campaigns/templates/generate-template-safe.ts`.
- **Tell:** a `500` on the page's own `POST` (the server-action invocation) with a `digest`, and a
  client `catch` that only ever shows the generic redacted string.

---

## Prospecting / lead quality

### Prospecting with no contact-email gate loads a majority of uncontactable targets

- **Symptom:** a QA audit of the first prospecting run found **42 of 57 loaded targets (74%)** had no
  reachable email of any kind — no `company_email` role inbox, no person `email`, and no
  `crm_Target_Contact` row with an email. An outbound-redesign pipeline can't act on a lead it can't
  email, so most of the list was dead on arrival.
- **Cause:** the `prospect` skill treated email as an *always-collect* enrichment field — captured
  when found, but **never a gate**. A site that qualified on redesign signals was loaded whether or
  not a contact existed.
- **Fix / rule:** the skill now has a **contactability** input. Default intent is `email-required`
  (drop — and don't count toward N — any candidate with neither a role inbox nor a person's email);
  `include-no-email` opts out. The mode is **asked when the prompt doesn't clearly specify it**, never
  silently defaulted. Never invent an inbox to clear the gate — a guessed address is fabrication.
- **Tell:** to audit a loaded batch, join `crm_Targets` to `crm_Target_Contact` and count rows where
  `company_email`, `email`, `personal_email`, and every contact `email` are all null (read-only SQL
  against the env's Supabase project).

---

### `??` does not fall through an empty string — blank form fields break fallback chains

- **Symptom:** an APPROVED COMPANY target with a real `company_email` was rejected at send with
  "This target has no email address," even though the address was clearly set in the UI.
- **Cause:** `resolveTargetRecipient` chained `target.email ?? target.company_email ?? …`. The
  Update-target form stores *cleared* fields as `""` (not `null`), and `??` only falls through on
  `null`/`undefined` — so `"" ?? company_email` returns `""`, which is falsy → "no address." The
  target had `email: ""`, `personal_email: ""`, `company_email: "real@addr"`.
- **Fix / rule:** at any fallback chain over user-editable string columns, treat blank/whitespace as
  absent — `const pick = v => v?.trim() || null; pick(a) ?? pick(b) ?? pick(c)` — don't rely on `??`
  alone. This also repairs existing `""` rows without a data migration. (Related: forms could store
  `null` for blanks, but fixing at the read point is the robust, retroactive fix.)
- **Tell:** a "missing X" error where the value is visibly present, on a record that was *edited*
  (`updatedBy` set) — an edit that rewrote a sibling field to `""`.

## Frontend / React

### TipTap silently strips tags with no matching extension (e.g. `<img>` without Image)

- **Symptom:** an AI-generated email with an embedded `<img>` showed in the first preview,
  but editing it in the TipTap editor made the image vanish; typing `<img …>` or a merge tag
  only produced literal text, never an image.
- **Cause:** TipTap keeps only nodes/marks its **schema** knows. The editor ran StarterKit +
  Link + Underline — **no Image extension** — so any `<img>` is dropped on load/`getHTML()`,
  and there's no command to insert one.
- **Fix / rule:** add `@tiptap/extension-image` (and a toolbar button → `setImage`). Pin the
  extension to the **exact same version as `@tiptap/core`** — a caret range resolves to a newer
  minor and pulls a **second `@tiptap/core`**, which breaks the editor (nodes from the wrong
  core). The sanitizer must also allow `img`/`src` (it does), and merge tags in `src` must be
  resolved **before** sanitizing so the scheme check sees a real URL.

### A public unsubscribe link must NOT mutate on GET — scanners auto-GET it

- **Symptom:** testing a campaign unsubscribe, the recipient was already unsubscribed before
  anyone clicked — or a prospect got opted out without acting.
- **Cause:** the campaign route unsubscribed on **GET**. Email clients and security stacks
  prefetch/scan links (Safe Links, spam filters, chat unfurlers), so a GET fires without intent.
- **Fix / rule:** `GET` = a confirm form only (never mutates); `POST` = the mutation (form button
  + RFC 8058 one-click via the `List-Unsubscribe-Post` header). The target route already did this;
  the campaign route was brought in line. Same root cause as the homepage-view prefetch trap.

### TipTap's `content` prop is read once — remount with a `key` to load new content

- **Symptom:** an editor seeded from server/AI state (`<TipTapEditor content={bodyHtml} />`) stayed
  blank / stale when `bodyHtml` arrived or changed after mount.
- **Cause:** `useEditor({ content })` only applies `content` at creation; there is no effect that
  calls `editor.commands.setContent` on prop change, so later updates are ignored.
- **Fix / rule:** bump a `key` on the editor (`<TipTapEditor key={version} content={…} />`) to remount
  it when fresh content should load (e.g. after an AI generate), and keep the key **stable while the
  user types** so it is not remounted on every keystroke (which would lose the cursor). Do NOT add a
  reactive `setContent` effect to the shared editor — it fights the user's caret. E2E: editing a
  contenteditable is timing-sensitive — prefer select-all + type (deterministic replace) over
  click-to-position + append.

### Public links get prefetched — raw hit counts overcount human views

- **Symptom:** a view counter on a public URL (e.g. the `/p/<slug>` homepage preview) that's emailed
  to prospects will register "views" the prospect never made.
- **Cause:** email clients and security stacks **prefetch/scan links** the moment the email arrives —
  Outlook Safe Links, Gmail/Proofpoint scanners, and chat unfurlers (Slack/Discord/WhatsApp/iMessage)
  all GET the URL with bot-ish user agents. So a "view" often means "a filter looked," not "a human
  looked."
- **Fix / rule:** filter by user agent before counting (require a browser-like `Mozilla/...`, exclude
  known bot/prefetcher/CLI markers — see `lib/homepage/views.ts`). It's **approximate** — some scanners
  spoof browser UAs and slip through, some privacy browsers are missed. Treat the number as a "did a
  human likely look?" signal; for exact traffic use real website analytics. Record best-effort and
  non-blocking (never fail serving on a tracking write).

<!-- Add new entries above this line, newest-relevant first within each section.
     Create a new `## <area>` heading when a trap doesn't fit an existing one. -->
