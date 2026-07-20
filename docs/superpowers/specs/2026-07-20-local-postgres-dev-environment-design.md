# Local Postgres Development Environment — Design

**Date:** 2026-07-20
**Status:** Approved (design), pending implementation

## Problem

Local development currently runs `pnpm dev` on the host against the **shared remote dev database** (`10.100.90.10:5433/nextcrm-dev`). This has two concrete costs:

1. **Encrypted columns are unreadable locally.** `lib/email-crypto.ts` encrypts with `EMAIL_ENCRYPTION_KEY`, which differs between the deployed dev app and the local machine. A `CalendarConnection.refreshTokenEncrypted` written by the deployed app fails to decrypt locally with `Unsupported state or unable to authenticate data` — an opaque AES-GCM auth-tag failure that says nothing about keys. Observed 2026-07-20 while testing AQUNAMA Phase 4 Milestone C outbound calendar sync.
2. **Local experiments mutate shared state.** Any local write — including a stray `prisma db seed` — lands in the database the team shares.

The goal is a local Postgres in Docker with seeded data, so local development and testing are fully independent of the remote dev DB.

## Scope

**In scope:** a containerised Postgres for the host-dev workflow, migration and seed wiring, env changes, and npm scripts.

**Out of scope:** the full containerised stack (`docker-compose.yml`, which also runs the app and MinIO) is unchanged. Auth, seeding logic beyond one env override, and CI are unchanged.

## Architecture

### 1. Postgres service in `docker-compose.dev.yml`

`docker-compose.dev.yml` already exists for exactly this workflow — its header states it supports running `pnpm dev` on the host with only supporting services containerised — and it already runs the Inngest dev server. Postgres joins it as a second service.

- **Image:** `pgvector/pgvector:pg17`, matching `docker-compose.yml`. The `vector` extension is **required**: `prisma/migrations/20260320000000_add_pgvector_embeddings/migration.sql` runs `CREATE EXTENSION IF NOT EXISTS vector`, so a plain `postgres` image fails the migration replay. This is the only extension the 44-migration chain creates.
- **Host port:** `5433` (verified free; `5432`, `5434`, `5435` also free — `55433` is taken by an unrelated project's container). Published, unlike `docker-compose.yml`'s Postgres, whose `ports:` block is deliberately commented out.
- **Volume:** its own named volume, distinct from the full-stack compose's `postgres_data`, so the two workflows never share state.
- **Healthcheck:** `pg_isready`, mirroring the existing service in `docker-compose.yml`.
- **Credentials:** `nextcrm` / `nextcrm` / db `nextcrm`. Local throwaway values, not secrets.

Rejected alternatives:
- *Uncommenting `ports:` in `docker-compose.yml`* — that file is the full stack (app + MinIO); starting only Postgres from it is awkward and shares the full-stack volume.
- *A standalone `docker run` script* — loses healthcheck, restart policy, and volume management, and diverges from repo convention.

### 2. Environment wiring

`DATABASE_URL` moves to the local database **in `.env`**, not `.env.local`.

This is load-bearing. Next.js loads `.env.local` over `.env`, but **the Prisma CLI reads `.env` only — it never reads `.env.local`**. Putting the local URL in `.env.local` would give `pnpm dev` the local DB while `prisma migrate deploy` and `prisma db seed` silently targeted the **remote shared** database. Setting it in `.env` keeps the app and the CLI in agreement, and is why no hardcoded script URLs or `dotenv-cli` dependency are needed.

`.env` line 8 (remote dev) is commented and labelled; the local URL becomes the active value. This follows the pattern already present at line 9, where an alternate URL sits commented. The remote string is preserved, one comment-swap away.

**Accepted consequence:** every Prisma command now targets local by default. Reaching the remote dev DB becomes a deliberate edit. Given the shared-DB key mismatch that motivated this work, that is the correct default.

`.env.local` needs no `DATABASE_URL` entry.

### 3. Scripts

Added to `package.json`, alongside the existing `inngest:*` scripts:

| Script | Action |
|---|---|
| `db:up` | `docker compose -f docker-compose.dev.yml up -d postgres` |
| `db:down` | stop the service (volume retained) |
| `db:migrate` | `prisma migrate deploy` |
| `db:seed` | `SEED_DEMO_DATA=1 prisma db seed` |
| `db:reset` | destroy volume → `db:up` → wait healthy → `db:migrate` → `db:seed` |

`migrate deploy`, never `migrate dev`: the project's standing rule (dev-DB drift). The chain replays clean on a fresh database, which CI already enforces against `pgvector/pgvector:pg16`.

`db:reset` must wait for the healthcheck before migrating — a fresh container accepts TCP connections before Postgres is ready.

### 4. Seed

`prisma/seeds/seed.ts` is reused unchanged except for one override.

Already seeded: lookup tables (opportunity types/stages, industries, contact types, lead sources/statuses/types), currencies, invoice defaults, and a `TEST_USER_EMAIL` user (default `test@nextcrm.app`) upserted as `role: "admin"`, `userStatus: "ACTIVE"`. A demo CRM dataset — account, contact, lead, opportunity, 3 targets — is gated behind `CI === "true" || SEED_DEMO_DATA === "1"`; the `db:seed` script supplies the latter.

**Change:** the demo contact's email (`prisma/seeds/seed.ts`, currently the literal `"demo-contact@nextcrm.app"`) becomes `process.env.SEED_CONTACT_EMAIL || "demo-contact@nextcrm.app"`, so calendar testing can direct invites to a real inbox.

**Explicit limitation:** the demo contact is created only when absent (matched on `last_name: "Demo Contact"`). Setting `SEED_CONTACT_EMAIL` therefore takes effect **only on a database where that contact does not yet exist** — i.e. after `db:reset`, not on a re-run of `db:seed` against an existing row. This preserves the existing idempotency contract rather than converting the create into an update, which would surprise CI. Documented rather than fixed.

### 5. Login

No code changes. Auth is Better Auth with `emailAndPassword` disabled — passwordless email OTP or Google social login.

In non-production, the Resend send failure is swallowed (`lib/auth.ts:80-87`) and the OTP is captured by `testUtils({ captureOTP: true })`. The repo already exposes `GET /api/auth/test-otp?email=<email>` (`app/api/auth/test-otp/route.ts`), unauthenticated and gated only on `NODE_ENV !== "production"`. `tests/auth.setup.ts` already automates this flow.

Local login:
```bash
curl -X POST localhost:3000/api/auth/email-otp/send-verification-otp \
  -H 'Content-Type: application/json' -d '{"email":"test@nextcrm.app","type":"sign-in"}'
curl "localhost:3000/api/auth/test-otp?email=test@nextcrm.app"   # → {"otp":"123456"}
```
Paste the code into the UI. The seeded user is `admin`/`ACTIVE`, so no approval step. No Resend key and no real mailbox required.

### 6. Manual prerequisite for calendar testing

Testing Google Calendar sync locally additionally requires
`http://localhost:3000/api/profile/calendar-connections/google/callback`
registered as an authorized redirect URI on the **`GOOGLE_CALENDAR_*`** OAuth client in Google Cloud (distinct from the `GOOGLE_ID`/`GOOGLE_SECRET` client used for login). This is a console change, not code.

Once done, a calendar connection created locally is encrypted and decrypted with the same local `EMAIL_ENCRYPTION_KEY`, eliminating the key-mismatch failure entirely.

## Verification

1. `pnpm db:reset` completes: container healthy, all 44 migrations applied, seed reports lookup tables + test user + demo dataset.
2. `psql` to `localhost:5433` shows the `vector` extension present and `_prisma_migrations` with 44 applied rows.
3. `pnpm dev` boots and the app reads the local DB (demo account/contact visible in CRM).
4. OTP login succeeds end to end via the two curl calls above.
5. The remote dev DB is untouched — its `CalendarConnection` row and demo tables are unchanged.
6. `pnpm db:down && pnpm db:up` preserves data; `pnpm db:reset` discards it.

## Risks

- **Habitual Prisma commands now hit local.** Accepted and intended; reaching remote requires editing `.env`.
- **Port 5433 could later collide.** Verified free today. The port is a single value in `docker-compose.dev.yml` and `.env`, so changing it is a two-line edit.
- **Seed drift from remote dev.** The local dataset is fixtures, not a clone; behaviour that depends on real remote data will not reproduce locally. Out of scope by choice.
