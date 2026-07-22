# Local Postgres Development Environment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Run `pnpm dev` against a local Dockerised Postgres with seeded data, fully independent of the shared remote dev database.

**Architecture:** A `postgres` service joins the existing `docker-compose.dev.yml` (the host-dev support file that already runs Inngest). `DATABASE_URL` in `.env` is repointed at it — in `.env`, not `.env.local`, because the Prisma CLI reads only `.env`. A set of `db:*` npm scripts wrap up/down/migrate/seed/reset. The existing seed is reused; only the demo contact's email becomes env-overridable.

**Tech Stack:** Docker Compose, `pgvector/pgvector:pg17`, Prisma 7, `ts-node` seed, pnpm.

Spec: `docs/superpowers/specs/2026-07-20-local-postgres-dev-environment-design.md`

## Global Constraints

- Migrations: **`prisma migrate deploy` only, never `prisma migrate dev`** (project-wide rule: the remote dev DB has schema-vs-migration drift).
- Image must be `pgvector/pgvector:pg17`. Migration `20260320000000_add_pgvector_embeddings` runs `CREATE EXTENSION IF NOT EXISTS vector`; a plain `postgres` image fails the replay.
- Host port **5433** (verified free on 2026-07-20). Container port stays 5432.
- Local credentials are exactly `nextcrm` / `nextcrm` / database `nextcrm`. Throwaway values, not secrets.
- Local `DATABASE_URL` is exactly `postgresql://nextcrm:nextcrm@localhost:5433/nextcrm`.
- `DATABASE_URL` goes in **`.env`**, never `.env.local` — the Prisma CLI does not read `.env.local`, so splitting them would point `migrate`/`seed` at the remote shared database.
- The remote dev URL must be **preserved as a commented line**, never deleted.
- `docker-compose.yml` (the full containerised stack) must not be modified.
- Never run a command that removes the `inngest_data` volume — `docker compose down -v` on this file would destroy Inngest run history. Target the postgres service and volume explicitly.
- Do not print or commit any secret values from `.env` / `.env.local`.
- Run jest via `./node_modules/.bin/jest <path>` (never `pnpm test` — `ERR_PNPM_IGNORED_BUILDS` in this environment).
- All work on `dev`; conventional commits; one commit per task.

---

### Task 1: Postgres service + up/down scripts

**Files:**
- Modify: `docker-compose.dev.yml` (add `postgres` service; add volume; update header comment)
- Modify: `package.json` (add `db:up`, `db:down`, `db:wait`)

**Interfaces:**
- Produces: a healthy Postgres on `localhost:5433` with the `vector` extension available; npm scripts `db:up`, `db:down`, `db:wait` consumed by Tasks 2 and 3.

- [ ] **Step 1: Add the service to `docker-compose.dev.yml`**

Insert this service after the `inngest` service block (before the top-level `volumes:` key):

```yaml
  # --- PostgreSQL (pgvector) for local host-dev ---
  # Separate from docker-compose.yml's postgres: that one belongs to the full
  # containerised stack and deliberately does not publish a host port. This one
  # is published so `pnpm dev` on the host can reach it, and uses its own volume
  # so the two workflows never share state.
  postgres:
    image: pgvector/pgvector:pg17
    container_name: nextcrm-dev-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: nextcrm
      POSTGRES_PASSWORD: nextcrm
      POSTGRES_DB: nextcrm
    ports:
      # 5433 on the host: 5432 is left free for any system Postgres.
      # Bound to loopback only (not 0.0.0.0): credentials are the throwaway
      # nextcrm/nextcrm pair above, so this must not be reachable from the
      # LAN/VPN/any other network interface — only from this machine.
      - "127.0.0.1:5433:5432"
    volumes:
      - postgres_dev_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U nextcrm -d nextcrm"]
      interval: 5s
      timeout: 5s
      retries: 10
```

- [ ] **Step 2: Register the volume**

Change the trailing `volumes:` block from:

```yaml
volumes:
  inngest_data:
```

to:

```yaml
volumes:
  inngest_data:
  postgres_dev_data:
```

- [ ] **Step 3: Update the file header comment**

The header currently documents only Inngest. Replace lines 1-10 with:

```yaml
# Local development support services for nextcrm-dev.
#
# This is NOT the full containerized stack — that lives in docker-compose.yml
# and runs the app in Docker too. This file supports the workflow where you
# run `pnpm dev` on the host and only the supporting services are containerized.
#
#   pnpm db:up          # start Postgres (localhost:5433)
#   pnpm inngest:up     # start everything in this file (Inngest + Postgres)
#   pnpm dev            # then run the app on the host
#
# Inngest dashboard: http://localhost:8288
# Postgres:          postgresql://nextcrm:nextcrm@localhost:5433/nextcrm
```

Note for the implementer: `pnpm inngest:up` passes no service name, so it now starts **both** services. That is intended; the header change documents it.

- [ ] **Step 4: Add the scripts to `package.json`**

Add these three entries to the `scripts` object, next to the existing `inngest:*` entries:

```json
    "db:up": "docker compose -f docker-compose.dev.yml up -d postgres",
    "db:down": "docker compose -f docker-compose.dev.yml stop postgres",
    "db:wait": "i=0; until docker compose -f docker-compose.dev.yml exec -T postgres pg_isready -U nextcrm -d nextcrm >/dev/null 2>&1; do i=$((i+1)); if [ \"$i\" -ge 60 ]; then echo 'db:wait: postgres did not become ready after 60 attempts (~90-120s: each attempt is a `docker compose exec` plus a 1s sleep) (container not running or not healthy) - run `pnpm db:up` and check `docker compose -f docker-compose.dev.yml ps postgres`' >&2; exit 1; fi; sleep 1; done",
```

Note for the implementer: the retry loop must be **bounded**. An unbounded
`until … sleep 1; done` hangs forever when the container is absent or crash-looping,
and because `db:reset` chains `db:up && db:wait && db:migrate`, an unbounded wait
turns a missing container into a silent hang instead of a failure. 60 attempts,
a diagnostic on stderr, and a non-zero exit.

- [ ] **Step 5: Start it and verify health**

Run:

```bash
pnpm db:up && pnpm db:wait && docker compose -f docker-compose.dev.yml ps postgres
```

Expected: the `postgres` service is listed with state `running` and status `(healthy)`.

- [ ] **Step 6: Verify the pgvector extension is installable**

Run:

```bash
docker compose -f docker-compose.dev.yml exec -T postgres \
  psql -U nextcrm -d nextcrm -c 'CREATE EXTENSION IF NOT EXISTS vector;' -c '\dx vector'
```

Expected: `CREATE EXTENSION`, then a table listing the `vector` extension with its version. If this fails, the image is wrong — stop and re-check Step 1.

- [ ] **Step 7: Verify the port is reachable from the host**

Run:

```bash
docker compose -f docker-compose.dev.yml exec -T postgres pg_isready -U nextcrm -d nextcrm && nc -z localhost 5433 && echo "host port 5433 reachable"
```

Expected: `accepting connections` followed by `host port 5433 reachable`.

- [ ] **Step 8: Commit**

```bash
git add docker-compose.dev.yml package.json
git commit -m "feat(dev): local pgvector Postgres service for host development"
```

---

### Task 2: Point the app and Prisma CLI at the local database

**Files:**
- Modify: `.env` (lines 7-9 region — repoint `DATABASE_URL`)
- Modify: `package.json` (add `db:migrate`)

**Interfaces:**
- Consumes: the running Postgres from Task 1.
- Produces: `DATABASE_URL=postgresql://nextcrm:nextcrm@localhost:5433/nextcrm` active in `.env`; npm script `db:migrate`; the full 44-migration chain applied to the local database.

- [ ] **Step 1: Repoint `DATABASE_URL` in `.env`**

The relevant region of `.env` currently looks like this (secrets redacted here — leave the real values intact in the file):

```
# Main DATABASE_URL for Prisma (currently PostgreSQL - nextcrm-demo)
DATABASE_URL="postgresql://nextcrm-dev:<REDACTED>@10.100.90.10:5433/nextcrm-dev"
#DATABASE_URL=postgresql://nextcrm-xmation:<REDACTED>@10.100.90.10:5433/nextcrm-xmation
```

Comment out the active remote line and add the local one as active, keeping both remote lines intact. Result:

```
# Main DATABASE_URL for Prisma.
# Local Docker Postgres (docker-compose.dev.yml, `pnpm db:up`) — the default.
# Both Next.js and the Prisma CLI read this file; the CLI does NOT read
# .env.local, so this must live here or `migrate`/`seed` would target remote.
DATABASE_URL="postgresql://nextcrm:nextcrm@localhost:5433/nextcrm"
# Remote shared dev DB — uncomment (and comment the local line) to reach it.
#DATABASE_URL="postgresql://nextcrm-dev:<KEEP EXISTING VALUE>@10.100.90.10:5433/nextcrm-dev"
#DATABASE_URL=postgresql://nextcrm-xmation:<KEEP EXISTING VALUE>@10.100.90.10:5433/nextcrm-xmation
```

**Critical:** do not retype the remote credentials — comment the existing line in place so its value is preserved byte-for-byte. Do not print the file's secret values in any output.

- [ ] **Step 2: Confirm `.env.local` does not define `DATABASE_URL`**

Run:

```bash
grep -c '^DATABASE_URL' .env.local
```

Expected: `0`. If it is not 0, a `.env.local` entry would override `.env` for Next.js and silently split the app from the CLI — remove it before continuing.

- [ ] **Step 3: Add the migrate script to `package.json`**

Add to the `scripts` object:

```json
    "db:migrate": "prisma migrate deploy",
```

- [ ] **Step 4: Apply the migration chain**

Run:

```bash
pnpm db:migrate
```

Expected: Prisma reports `44 migrations found in prisma/migrations`, applies them in order ending with `20260719203102_aqunama_p4c_scope_level`, and finishes with `All migrations have been successfully applied.`

If any migration fails, stop — do not edit migrations to force them through. The chain is known to replay clean on a fresh pgvector database (CI enforces this), so a failure means the database is not actually fresh or the image is wrong.

- [ ] **Step 5: Verify the schema landed on the local database**

Run:

```bash
docker compose -f docker-compose.dev.yml exec -T postgres psql -U nextcrm -d nextcrm \
  -c 'select count(*) as applied from _prisma_migrations where finished_at is not null;' \
  -c "select count(*) as calendar_cols from information_schema.columns where table_name='CalendarConnection' and column_name='scopeLevel';"
```

Expected: `applied` is `44`, and `calendar_cols` is `1` (proving the newest migration ran).

- [ ] **Step 6: Verify the Prisma CLI resolved the local URL, not the remote one**

Run:

```bash
pnpm exec prisma migrate status
```

Expected: it reports the datasource host as `localhost:5433` and `Database schema is up to date!`. If the output names `10.100.90.10`, the CLI is still reading the remote URL — re-check Step 1 before continuing, because every later command would target the shared database.

- [ ] **Step 7: Commit**

```bash
git add .env package.json
git commit -m "feat(dev): point DATABASE_URL at local Postgres, add db:migrate"
```

Note: verify `.env` is git-ignored before committing. Run `git check-ignore -q .env && echo IGNORED`. If it prints `IGNORED`, `git add .env` is a no-op and only `package.json` is committed — that is expected and correct; do not force-add `.env`.

---

### Task 3: Seed the local database

**Files:**
- Modify: `prisma/seeds/seed.ts` (demo contact email → env-overridable)
- Modify: `package.json` (add `db:seed`, `db:reset`)

**Interfaces:**
- Consumes: the migrated local database from Task 2; the `db:up`/`db:wait`/`db:migrate` scripts from Tasks 1-2.
- Produces: npm scripts `db:seed` and `db:reset`; a seeded local database containing lookup tables, an admin test user, and the demo CRM dataset.

- [ ] **Step 1: Make the demo contact email overridable**

In `prisma/seeds/seed.ts`, inside the demo-dataset block, the demo contact is created with a hardcoded email. Change this line:

```typescript
        email: "demo-contact@nextcrm.app",
```

to:

```typescript
        email: process.env.SEED_CONTACT_EMAIL || "demo-contact@nextcrm.app",
```

Leave the surrounding `findFirst`/`create` structure untouched — the contact is matched on `last_name: "Demo Contact"` and created only when absent, which is the existing idempotency contract that CI relies on.

- [ ] **Step 2: Add a comment recording the override's limitation**

Directly above the line changed in Step 1, add:

```typescript
        // Overridable so local calendar testing can direct invites to a real
        // inbox. Only takes effect on a database where this contact does not
        // yet exist (it is created, never updated) — i.e. after `pnpm db:reset`,
        // not on a re-run of `db:seed` against an existing row.
```

- [ ] **Step 3: Add the seed and reset scripts to `package.json`**

Add to the `scripts` object:

```json
    "db:seed": "SEED_DEMO_DATA=1 prisma db seed",
    "db:reset": "docker compose -f docker-compose.dev.yml rm -sfv postgres && docker volume rm -f nextcrm-dev_postgres_dev_data && pnpm db:up && pnpm db:wait && pnpm db:migrate && pnpm db:seed",
```

Note for the implementer: `db:reset` removes only the postgres container and its named volume. It must **not** use `docker compose down -v`, which would also destroy `inngest_data` and lose Inngest run history. The volume name is `nextcrm-dev_postgres_dev_data` because `docker-compose.dev.yml` sets `name: nextcrm-dev`.

- [ ] **Step 4: Run the seed**

Run:

```bash
pnpm db:seed
```

Expected output includes `Lead Types seeded`, `Test user seeded: test@nextcrm.app`, and — because `SEED_DEMO_DATA=1` is set by the script — it must **not** print `Demo CRM dataset skipped`. If you see the "skipped" line, the env var is not reaching the seed process.

- [ ] **Step 5: Verify the seeded rows**

Run:

```bash
docker compose -f docker-compose.dev.yml exec -T postgres psql -U nextcrm -d nextcrm \
  -c "select email, role, \"userStatus\" from \"Users\";" \
  -c "select name from \"crm_Accounts\";" \
  -c "select first_name, last_name, email from \"crm_Contacts\";"
```

Expected: one user `test@nextcrm.app` with role `admin` and status `ACTIVE`; an account `Seed Demo Account`; a contact `Seed Demo Contact` with email `demo-contact@nextcrm.app`.

- [ ] **Step 6: Verify the full reset cycle, including the email override**

Run:

```bash
SEED_CONTACT_EMAIL=you@example.com pnpm db:reset
docker compose -f docker-compose.dev.yml exec -T postgres psql -U nextcrm -d nextcrm \
  -c "select email from \"crm_Contacts\";"
```

Expected: the reset completes (volume removed, container recreated, 44 migrations applied, seed run) and the contact's email is `you@example.com`, proving the override reaches a freshly created row.

Then confirm Inngest history survived:

```bash
docker compose -f docker-compose.dev.yml ps inngest
```

Expected: still `running` — `db:reset` must not have touched it.

- [ ] **Step 7: Restore the default contact email**

Run:

```bash
pnpm db:reset
```

Expected: contact email back to `demo-contact@nextcrm.app`. This leaves the database in a clean known state for Task 4.

- [ ] **Step 8: Commit**

```bash
git add prisma/seeds/seed.ts package.json
git commit -m "feat(dev): seed local database, add db:seed and db:reset"
```

---

### Task 4: End-to-end verification gate + runbook

**Files:**
- Modify: `docs/internal/aqunama-setup-runbook.md` (add a local-development section)

**Interfaces:**
- Consumes: everything from Tasks 1-3.

- [ ] **Step 1: Boot the app against the local database**

Run `pnpm dev` in one terminal. In another, confirm the app is serving and reading the local DB:

```bash
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3000/
```

Expected: `200` (or a `3xx` redirect to the sign-in page). Check the `pnpm dev` output for Prisma connection errors — there must be none.

- [ ] **Step 2: Verify OTP login end to end**

Run:

```bash
curl -s -X POST http://localhost:3000/api/auth/email-otp/send-verification-otp \
  -H 'Content-Type: application/json' -d '{"email":"test@nextcrm.app","type":"sign-in"}'
sleep 1
curl -s "http://localhost:3000/api/auth/test-otp?email=test@nextcrm.app"
```

Expected: the second call returns JSON of the form `{"otp":"123456"}` with a six-digit code — `testUtils({ captureOTP: true })` captures it independently of the send outcome. Note that with `RESEND_API_KEY` present in `.env.local` the send is a live Resend API call, so a real email is also delivered; the `[Auth] OTP email send failed …` log line in `lib/auth.ts` only appears if the SDK *throws*, which it does not for ordinary send errors.

Then sign in through the browser at `http://localhost:3000` using that email and code, and confirm you land in the app as an admin.

- [ ] **Step 3: Confirm the demo data is visible in the UI**

Navigate to the CRM accounts list and confirm `Seed Demo Account` appears, then open it and confirm `Seed Demo Contact` is listed under its contacts.

- [ ] **Step 4: Confirm the remote dev database was not touched**

Run:

```bash
grep -c '^DATABASE_URL="postgresql://nextcrm:nextcrm@localhost:5433/nextcrm"' .env
```

Expected: `1` — the active URL is the local one. This is the guard that every command in Tasks 2-3 ran locally.

- [ ] **Step 5: Confirm data survives a stop/start but not a reset**

Run:

```bash
pnpm db:down && pnpm db:up && pnpm db:wait
docker compose -f docker-compose.dev.yml exec -T postgres psql -U nextcrm -d nextcrm \
  -c "select count(*) as accounts from \"crm_Accounts\";"
```

Expected: `accounts` is `1` — stopping and starting the service retains the volume, so seeded data survives. (`pnpm db:reset` is the operation that discards it, already exercised in Task 3 Step 6.)

- [ ] **Step 6: Confirm the test suite still passes**

Run:

```bash
./node_modules/.bin/jest
```

Expected: all suites pass (baseline 204 suites / 1096 tests, 0 failures). The seed change touches a file the unit suite does not import, so no change in counts is expected.

- [ ] **Step 7: Document it in the runbook**

Append this section to `docs/internal/aqunama-setup-runbook.md`:

```markdown
## Local development against a local Postgres

Local dev runs against a Dockerised Postgres, not the shared remote dev DB.

Prerequisite: `.env` is gitignored, so a fresh clone has none. Create it with
`DATABASE_URL="postgresql://nextcrm:nextcrm@localhost:5433/nextcrm"`. It must be
`.env`, not `.env.local` — the Prisma CLI reads only `.env`.

```bash
pnpm db:up        # start Postgres on 127.0.0.1:5433
pnpm db:wait      # required: db:up returns before initdb finishes on a first run
pnpm db:migrate   # apply the migration chain (migrate deploy — never migrate dev)
pnpm db:seed      # lookup tables + admin user + demo CRM dataset
pnpm dev
```

`pnpm db:reset` destroys the volume and rebuilds from scratch. It touches only
the postgres service — Inngest run history survives.

To point the demo contact at a real inbox (for calendar invite testing):
`SEED_CONTACT_EMAIL=you@example.com pnpm db:reset`. The override applies only to
a freshly created contact, so it needs a reset rather than a bare re-seed, and it
puts a real inbox into the local database.

The shipped runbook section additionally documents the local-database guard
(`scripts/assert-local-db.sh`), the `inngest:up`/`inngest:down` asymmetry, and the
deliberate pg17-local / pg16-CI divergence. Treat the runbook as authoritative.

### Logging in without waiting for email

Auth is passwordless (Better Auth email OTP). With `RESEND_API_KEY` set in
`.env.local`, local dev sends **real** OTP email — but you need not wait for it,
because `testUtils({ captureOTP: true })` captures the code regardless:

```bash
curl -X POST localhost:3000/api/auth/email-otp/send-verification-otp \
  -H 'Content-Type: application/json' -d '{"email":"test@nextcrm.app","type":"sign-in"}'
curl "localhost:3000/api/auth/test-otp?email=test@nextcrm.app"   # → {"otp":"123456"}
```

Paste the code into the sign-in form. The route is gated on
`NODE_ENV !== "production"`.

### Why local-only, and the trap it avoids

`lib/email-crypto.ts` encrypts with `EMAIL_ENCRYPTION_KEY`, which differs
between the deployed dev app and a local machine. Pointing local dev at the
shared remote DB means any encrypted column written by the deployed app —
notably `CalendarConnection.refreshTokenEncrypted` — fails to decrypt locally
with `Unsupported state or unable to authenticate data`, an opaque AES-GCM
auth-tag error that names neither keys nor environments. With a local database,
writes and reads use the same key and the problem disappears.

Corollary: do not re-run the Google Calendar OAuth connect flow from localhost
while `.env` points at the remote DB — it re-encrypts the row with the local key
and breaks the deployed app for that connection.

### Reaching the remote dev DB

`DATABASE_URL` lives in `.env` (not `.env.local` — the Prisma CLI does not read
`.env.local`, so splitting them would point `migrate`/`seed` at remote). Both
remote URLs are preserved there as commented lines; swap the comments to switch.

### Testing Google Calendar sync locally

Register `http://localhost:3000/api/profile/calendar-connections/google/callback`
as an authorized redirect URI on the **`GOOGLE_CALENDAR_*`** OAuth client in
Google Cloud — this is a different client from the `GOOGLE_ID`/`GOOGLE_SECRET`
one used for login.
```

- [ ] **Step 8: Commit**

```bash
git add docs/internal/aqunama-setup-runbook.md
git commit -m "docs: local Postgres development workflow in the setup runbook"
```

---

## Notes for the executor

- Tasks 1-3 each leave the database in a working state; Task 4 only verifies and documents.
- If `pnpm db:up` fails with a port conflict, port 5433 was taken between planning and execution. Change the host side of the mapping in `docker-compose.dev.yml` and the port in `.env`'s `DATABASE_URL` to match — those are the only two places it appears.
- `.env` is expected to be git-ignored; Task 2's commit will contain only `package.json`. That is correct.
