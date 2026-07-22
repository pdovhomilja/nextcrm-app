# AQUNAMA Phase-0 Setup Runbook (manual configuration, no code)

Perform these steps as an **admin** user after deploying Phase 1.

## 1. Sales stages (Admin → CRM settings → Sales stage)
Create in this order — the target→deal conversion enters deals at the
lowest-order stage, so Pre-Sale MUST have the lowest order:

| Order | Name           |
|-------|----------------|
| 0     | Pre-Sale       |
| 1     | Qualified Lead |
| 2     | Purchase Order |
| 3     | Delivery       |
| 4     | Care           |

Note: the admin UI edits stage names only; `order` is set at creation.

## 2. Lead statuses (optional, if inbound leads are triaged before targets)
Create: `New`, `In Sequence`, `Paused`, `Recycled`, `Unsubscribed`, `Lost`.

## 3. Target lists = batches
One list per import batch / AiLead campaign. Naming convention:
`[YYYY-MM] <campaign name> — <ICP>` (e.g. `[2026-07] Healthcare CallCenter — Hospitals CZ`).

## 4. Sequences = campaigns
Per AiLead campaign batch: create a campaign, attach the batch's target
list, add 4 email steps authored by the sales rep. Suggested delays
(delay_days): step 0 = 0, step 1 = 3, step 2 = 7, step 3 = 10.
Call touches are manual in v1 — the rep works from the campaign stats page.

## 5. AiLead tool access
Issue an MCP API token (profile → API tokens) for the AiLead generator.
It pushes leads with `crm_create_target` + `crm_create_target_list` and
assigns lists to campaigns with `campaigns_assign_target_list`.

## 6. Working the funnel
- Response received → open the target → **Convert to deal** (creates
  account + contact + opportunity at Pre-Sale with campaign attribution).
- PO won → move the deal to Purchase Order and fill **budget/expected
  revenue** and **delivery deadline** (both on the opportunity form).
- The 3-month recycle and 45-day kill rule are Phase 2 (automated);
  until then track them manually via the campaign stats and deal
  last-activity dates.

## 7. Phase 2 automation (timers)

After deploying Phase 2, connect the automation in **Admin → CRM settings →
Sales stage**: each stage has an "Automation trigger" — set Pre-Sale →
pre_sale, Qualified Lead → qualified, Purchase Order → purchase_order,
Delivery → delivery, Care → care. Stages without a trigger are ignored by
the timers (renaming a stage never breaks automation; the trigger does).

All day counts below are the defaults — every one is editable at
**Admin → Funnel Settings** (instance-wide; changes apply to future stage
entries and the next timer runs).

What runs automatically:
- **Qualified entry** → 5-touch follow-up cadence as tasks for the deal's
  rep (+3 business days call, +7d email, +10d email/call, day 15 and day
  45 of the retention window). Leaves the stage → remaining touches cancel.
- **45-day kill rule** (daily 06:00 UTC): Qualified deals with no client
  activity (inbound synced email, logged activity) for 45 days are closed
  as Lost and the rep is emailed. Reopen by setting status back to Active.
- **Care entry** → +30d check-in, ~90d referral-ask, then quarterly tasks
  (8 quarters).
- **Recycle** (daily 06:30 UTC): targets whose sequence finished 90+ days
  ago with no conversion land in the "Recycled" target list; admins get a
  digest. Assign that list to a fresh campaign to re-try them.
- **Renewals** (Mondays 07:00 UTC): contract reminder dates and product
  renewal dates within 30 days become tasks for the account's rep.

## 8. Phase 3: quote approvals & case studies

- Reps: open the deal → **Request approval** (attach the SOW/quote to the
  deal's documents first). The deal cannot move into the Qualified stage
  until a manager/admin approves — the kanban/form will refuse with an
  explanatory error.
- Managers/admins (CSO): work the **CRM → Approvals** queue — approve, or
  reject with a note (the rep is emailed either way). Re-request after
  fixing a rejection.
- Case studies: on the account detail, reps flag **case-study candidates**;
  managers/admins approve them (spec §3.8).

## Local development against a local Postgres

Local dev runs against a Dockerised Postgres, not the shared remote dev DB.

**Prerequisite — create `.env`.** `.env` is gitignored, so a fresh clone has
none and every Prisma command fails with `Environment variable not found:
DATABASE_URL`. Create it (copy `.env.example`) with the local default:

```bash
DATABASE_URL="postgresql://nextcrm:nextcrm@localhost:5433/nextcrm"
```

`DATABASE_URL` belongs in `.env`, **not** `.env.local`: the Prisma CLI reads
only `.env`, so a URL placed in `.env.local` is invisible to `migrate`/`seed`
and those commands silently fall through to whatever `.env` holds. Everything
else (API keys and so on) goes in `.env.local` as usual.

```bash
pnpm db:up        # start Postgres on 127.0.0.1:5433
pnpm db:wait      # block until Postgres accepts connections — see note below
pnpm db:migrate   # apply the migration chain (migrate deploy — never migrate dev)
pnpm db:seed      # lookup tables + admin user + demo CRM dataset
pnpm dev
```

`pnpm db:wait` is not optional. `db:up` returns as soon as the container is
*created*, not when Postgres is *ready*. On a first run the volume is empty, so
the container runs `initdb` — several seconds with the socket closed — and
`db:migrate` fails with `Can't reach database server at localhost:5433`.

`pnpm db:reset` destroys the volume and rebuilds from scratch. It touches only
the postgres service — Inngest run history survives.

To point the demo contact at a real inbox (for calendar invite testing):
`SEED_CONTACT_EMAIL=you@example.com pnpm db:reset`. The override applies only to
a freshly created contact, so it needs a reset rather than a bare re-seed. Note
that this deliberately writes a **real** inbox address into your local database —
anything the app emails to the demo contact will actually reach you.

### The local-database guard

`db:migrate`, `db:seed` and `db:reset` each run `scripts/assert-local-db.sh`
first and refuse to proceed unless `DATABASE_URL` resolves to `localhost` /
`127.0.0.1`. This exists because the remote-access instructions below have you
swap `.env` to the shared remote URL: with a stale `.env`, `pnpm db:seed` would
write the demo CRM records and the `test@nextcrm.app` admin user into the shared
dev database (it sets `SEED_DEMO_DATA=1`, which defeats the seed's own guard),
and `pnpm db:reset` would additionally replay migrations over known drift.

The guard resolves `DATABASE_URL` the same way the Prisma CLI does — an exported
environment variable wins, otherwise the value is read from `.env`. It affects
only these pnpm scripts; CI calls `pnpm exec prisma migrate deploy` and
`pnpm exec prisma db seed` directly, and `pnpm build` calls `prisma migrate
deploy` directly, so none of them go through the guard.

### Script asymmetries worth knowing

- `pnpm inngest:up` passes no service name, so it starts **both** Inngest and
  Postgres. `pnpm inngest:down` runs `docker compose down` and therefore
  *removes* the Postgres container as well — but without `-v`, so the named
  volumes survive and `pnpm db:up` brings the data back. This is asymmetric with
  `pnpm db:down`, which only *stops* Postgres.
- Never run `docker compose -f docker-compose.dev.yml down -v`: that destroys
  `inngest_data` too and loses Inngest run history.

### Deliberate divergence: Postgres 17 locally, 16 in CI

`docker-compose.dev.yml` pins `pgvector/pgvector:pg17` while GitHub Actions uses
`pgvector/pgvector:pg16`. Local development therefore validates the migration
chain against a major version CI never exercises. This is a known, accepted
choice — pg17 matches `docker-compose.yml` (the full containerised stack) — and
not an oversight. If a migration ever behaves differently across the two, CI is
the authority, since it mirrors what the deployment replays against.

### Logging in without waiting for email

Auth is passwordless (Better Auth email OTP). If `RESEND_API_KEY` is set in
`.env.local`, `resendHelper()` returns a live client and local dev sends
**real** OTP emails through Resend. If it is not set (e.g. a fresh clone that
hasn't configured it yet), `resendHelper()` throws and the send fails
harmlessly — the error is caught and logged. Either way you do not need to
wait for an email: the `testUtils({ captureOTP: true })` plugin captures the
code regardless of whether the send succeeded, and the test-OTP route returns
it directly:

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
