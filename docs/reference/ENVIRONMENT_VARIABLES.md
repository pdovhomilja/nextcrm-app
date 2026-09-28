# Environment Variables (reference)

Authoritative list of every environment variable this fork reads, what it's for,
which Vercel scope it belongs in, and whether it's required. This file is the
human half of the **env-doc guard**: `scripts/check-env-docs.sh` (run by
`.github/workflows/guardrails.yml`) fails a PR if `.env.example` and this doc ever
disagree on which keys exist, so the two stay in lock-step.

> **Why this matters — there is no central env validator.** Every variable is read
> ad hoc from `process.env` at its point of use. CI builds with dummy env, so a
> newly-**required** variable that isn't set in a Vercel scope passes CI green and
> then **breaks that environment's deploy** (or first request). See
> `docs/reference/LESSONS_LEARNED.md` → *"A newly-required env var passes CI but
> breaks the Vercel deploy"*. Treat adding a required var as a deploy-affecting change.

## The three scopes

Vercel scopes each variable per environment; the **same name carries a different
value per scope** (`docs/guides/ENGINEERING_PLAYBOOK.md` §11):

| Scope | Tier | Database project | Notes |
|---|---|---|---|
| **Development** | DEV (local) | Supabase CLI stack (`:54622`) | Pulled via `vercel env pull`; production secrets never land here. |
| **Preview** | **QA** (`qa` branch → `qa.crm.radeengineering.com`) | `nextcrm-qa` | Preview = our QA tier. |
| **Production** | PRODUCTION (`production` branch → `crm.radeengineering.com`) | `nextcrm-prod` | Production-only secrets live **only** here. |

**Legend** — **Scope**: which Vercel scopes should carry the var (*All* = Dev +
Preview + Prod). **Required**: *Yes* = app throws/breaks without it; *Sending* /
*When active* / *Route* = required only when that feature is used; *No* = optional
with a fallback; *Legacy* = present in `.env.example` from upstream but **not read
in this fork's code** (kept for merge-friendliness).

<!-- env-doc:begin -->
<!-- The env-doc guard parses every `| `NAME` |` row between these markers and
     checks the set equals the keys in .env.example. Keep new app vars INSIDE. -->

### Core — database & auth

| Variable | Scope | Required | Purpose | Format / example |
|---|---|---|---|---|
| `DATABASE_URL` | All | Yes | Postgres connection string (Prisma). The Vercel deploy runs `prisma migrate deploy` with this. | Local `postgresql://postgres:postgres@127.0.0.1:54622/postgres`; hosted = **session** pooler, IPv4 (`SUPABASE_ON_VERCEL.md`). |
| `BETTER_AUTH_SECRET` | All | Yes | better-auth signing secret. The Production value is a root credential. | `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | All | Yes | Auth base URL. | `http://localhost:3000` / `https://crm.radeengineering.com` |
| `GOOGLE_ID` | All | Yes | Google OAuth client id (read at auth init). | from Google Cloud console |
| `GOOGLE_SECRET` | All | Yes | Google OAuth client secret. | from Google Cloud console |
| `EMAIL_ENCRYPTION_KEY` | All | Yes | 64-hex key encrypting stored email creds / API keys (`lib/email-crypto.ts` throws if malformed). | `openssl rand -hex 32` |

### Object storage (R2 / S3 — local SeaweedFS)

| Variable | Scope | Required | Purpose | Format / example |
|---|---|---|---|---|
| `MINIO_ENDPOINT` | All | Yes | S3 endpoint. `lib/minio.ts` throws at import if unset. | Local `http://localhost:9000` (SeaweedFS); hosted = R2 S3 endpoint |
| `MINIO_ACCESS_KEY` | All | Yes | S3 access key. | — |
| `MINIO_SECRET_KEY` | All | Yes | S3 secret key. | — |
| `MINIO_BUCKET` | All | Yes | Bucket name. | Local `nextcrm`; QA `rade-crm-qa`; prod `rade-crm-prod` |
| `NEXT_PUBLIC_MINIO_ENDPOINT` | All | Yes | Public base URL for presigned links (client-exposed). | Local `http://localhost:9000`; hosted = public R2 URL |
| `MINIO_PORT` | — | Legacy | Not read in this fork. | — |
| `MINIO_USE_SSL` | — | Legacy | Not read in this fork. | — |

### Email (Resend + nodemailer)

| Variable | Scope | Required | Purpose | Format / example |
|---|---|---|---|---|
| `RESEND_API_KEY` | All | No | Resend API key (OTP, invites, campaigns). Falls back to a DB service key; dummy locally (OTP is read from the dev log / `test-otp`). | `re_...` |
| `RESEND_FROM_EMAIL` | Preview, Prod | Sending | Verified sender for campaign email. | `noreply@crm.radeengineering.com` |
| `RESEND_WEBHOOK_SECRET` | Preview, Prod | No | Svix signing secret for the open/click-tracking webhook (`/api/campaigns/webhooks/resend`). | `whsec_...` |
| `EMAIL_FROM` | All | No | From address for the nodemailer path. | `noreply@yourdomain.com` |
| `EMAIL_HOST` | All | No | SMTP host (`lib/sendmail.ts`). | `smtp.example.com` |
| `EMAIL_USERNAME` | All | No | SMTP username. | — |
| `EMAIL_PASSWORD` | All | No | SMTP password. | — |
| `MAILTRAP_API_KEY` | All | No | Mailtrap key; falls back to a DB service key. | — |
| `SMTP_HOST` | — | Legacy | Not read in this fork (per-account email creds live in the DB). | — |
| `SMTP_PORT` | — | Legacy | Not read in this fork. | — |
| `SMTP_USER` | — | Legacy | Not read in this fork. | — |
| `SMTP_PASSWORD` | — | Legacy | Not read in this fork. | — |

### Cache / rate-limiting (Upstash Redis)

| Variable | Scope | Required | Purpose | Format / example |
|---|---|---|---|---|
| `UPSTASH_REDIS_REST_URL` | Preview, Prod | No | Enrichment rate-limiting. Skipped when unset in non-prod. | `https://...upstash.io` |
| `UPSTASH_REDIS_REST_TOKEN` | Preview, Prod | When active | Required together with the URL (`Redis.fromEnv()`). | — |

### Background jobs (Inngest)

| Variable | Scope | Required | Purpose | Format / example |
|---|---|---|---|---|
| `INNGEST_ID` | All | Yes | Inngest client id. | `nextcrm` |
| `INNGEST_APP_NAME` | All | Yes | Inngest app name. | `NextCRM` |
| `INNGEST_EVENT_KEY` | Preview, Prod | No | Event key (the local dev server needs none). | — |
| `INNGEST_SIGNING_KEY` | Preview, Prod | When hosted | Signing key for hosted Inngest. | `signkey_...` |

### AI providers (all optional — each falls back to a DB-stored key)

| Variable | Scope | Required | Purpose | Format / example |
|---|---|---|---|---|
| `OPENAI_API_KEY` | All | No | OpenAI (document enrichment, etc.). | `sk-...` |
| `ANTHROPIC_API_KEY` | All | No | Anthropic (enrichment agent). | `sk-ant-...` |
| `GROQ_API_KEY` | All | No | Groq provider. | — |
| `FIRECRAWL_API_KEY` | All | No | Firecrawl (contact enrichment). | `fc-...` |

### Integrations & public endpoints

| Variable | Scope | Required | Purpose | Format / example |
|---|---|---|---|---|
| `GOOGLE_CALENDAR_CLIENT_ID` | All | No | Google Calendar sync OAuth app. | — |
| `GOOGLE_CALENDAR_CLIENT_SECRET` | All | No | Google Calendar sync OAuth secret. | — |
| `E2B_API_KEY` | Preview, Prod | No | E2B sandbox for enrichment. | — |
| `E2B_ENRICHMENT_TEMPLATE` | All | No | E2B template; defaults to `nextcrm-enrichment`. | — |
| `NEXTCRM_TOKEN` | All | Route | Bearer token guarding the public create-lead endpoints (route 500s if unset when used). | random secret |
| `NEXTAUTH_URL` | All | No | Base URL for campaign unsubscribe links. | `https://crm.radeengineering.com` |
| `MAIL_ALLOW_PRIVATE_HOSTS` | All | No | SSRF gate (`lib/net/host-guard.ts`), default off. | unset, or `true` (dev only) |
| `ROSSUM_USERNAME` | — | Legacy | Not read in this fork. | — |
| `ROSSUM_PASSWORD` | — | Legacy | Not read in this fork. | — |
| `CRON_SECRET` | — | Legacy | Not read in this fork. | — |

### App identity / public branding (`NEXT_PUBLIC_*` — bundled to the browser)

| Variable | Scope | Required | Purpose | Format / example |
|---|---|---|---|---|
| `NEXT_PUBLIC_APP_URL` | All | Yes | App URL; `new URL(...)` throws if unset. | `http://localhost:3000` / `https://crm.radeengineering.com` |
| `NEXT_PUBLIC_APP_NAME` | All | No | App display name (fallback `NextCRM`). | `Rade Engineering CRM` |
| `NEXT_PUBLIC_APP_DOMAIN` | All | No | App domain (fallback `nextcrm.app`). | `crm.radeengineering.com` |
| `NEXT_PUBLIC_NEXT_VERSION` | All | No | Version string in the footer. | — |
| `NEXT_PUBLIC_DISCORD_INVITE_URL` | All | No | Support link (fallback `#`). | — |
| `NEXT_PUBLIC_GITHUB_REPO_URL` | All | No | Repo link (fallback `#`). | — |
| `NEXT_PUBLIC_GITHUB_ISSUES_URL` | All | No | Issues link (fallback `#`). | — |
| `NEXT_PUBLIC_GITHUB_REPO_API` | All | No | Repo API URL for the star count. | `https://api.github.com/repos/<owner>/<repo>` |
| `NEXT_PUBLIC_GITHUB_TOKEN` | All | No | ⚠️ **Client-exposed token** — bundled to the browser. Use only an unprivileged/public value; leave empty to fetch unauthenticated. A server-only fix is tracked separately. | leave empty |

<!-- env-doc:end -->

## Not app config (read in code, deliberately NOT in `.env.example`)

These are read from `process.env` but are framework-, CI-, seed-, test-, or
sandbox-runtime values — not application configuration — so they are excluded from
`.env.example` and from the parity gate. They form the ignore-list in
`scripts/check-env-docs.sh`; keep the two in sync.

| Variable | Where | Why excluded |
|---|---|---|
| `NODE_ENV`, `CI`, `VERCEL*`, `NEXT_RUNTIME` | many | Platform/framework-injected. |
| `SEED_DEMO_DATA`, `SEED_CONTACT_EMAIL`, `TEST_USER_EMAIL` | `prisma/seeds/`, tests | Seed/test only. |
| `DATABASE_URL_MONGO`, `DATABASE_URL_POSTGRES` | `scripts/migrate-mongo-to-postgres.ts` | One-off migration script. |
| `COMPANY_NAME`, `COMPANY_WEBSITE`, `TARGET_EMAIL`, `TARGET_NAME`, `KNOWN_DOMAIN` | `lib/enrichment/e2b/agent-script.ts` | Injected **inside** the E2B sandbox at runtime, not app config. |

## Production go-live checklist (Vercel **Production** scope)

Before running **Promote to Production**, set these in Vercel's **Production** scope
(build-migrates model: the prod deploy runs `prisma migrate deploy` against
`nextcrm-prod` using the Production `DATABASE_URL`). The promote workflow itself is a
code-only fast-forward — its only GitHub secret need is the **required-reviewer** gate
on the `production` environment, not a DB secret.

### ⚠️ Login-critical — the first email-OTP sign-in fails without these

In production `sendVerificationOTP` (`lib/auth.ts`) **rethrows** on a send failure (in
non-prod it's swallowed and the code is logged), so a broken send = no login:

- **`RESEND_API_KEY`** — sends the OTP. `resendHelper` falls back to a DB service key,
  but a fresh `nextcrm-prod` has none, so the env var is effectively required.
  **Use a NEW, Production-only Resend key** (Sending access), *not* the shared QA key
  (that key also serves the marketing site — don't couple prod to it). Scope it to the
  prod sending domains `mail.radeengineering.com` (transactional/OTP) **and**
  `crm.radeengineering.com` (campaigns), both verified in the same Resend account.
- **`EMAIL_FROM`** — the OTP `from` address: `` `${NEXT_PUBLIC_APP_NAME} <${EMAIL_FROM}>` ``.
  If unset, the send is `…<undefined>` and Resend rejects it. Set e.g.
  `noreply@mail.radeengineering.com` (matching QA); its domain must be verified for the key.

### Required for the app to boot / core function

`DATABASE_URL` (session pooler, IPv4 — see `SUPABASE_ON_VERCEL.md`),
`BETTER_AUTH_SECRET`, `BETTER_AUTH_URL=https://crm.radeengineering.com`,
`EMAIL_ENCRYPTION_KEY`, `NEXTAUTH_URL=https://crm.radeengineering.com`,
`MINIO_ENDPOINT` / `MINIO_ACCESS_KEY` / `MINIO_SECRET_KEY` / `MINIO_BUCKET=rade-crm-prod` / `NEXT_PUBLIC_MINIO_ENDPOINT` (R2 prod — `lib/minio.ts` throws at import if missing),
`INNGEST_ID`, `INNGEST_APP_NAME`, `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`,
`NEXT_PUBLIC_APP_URL=https://crm.radeengineering.com`, `NEXT_PUBLIC_APP_NAME`.

### Google sign-in — NOT used in this deployment

`GOOGLE_ID` / `GOOGLE_SECRET` power **only** the "Sign in with Google" button
(`socialProviders.google` in `lib/auth.ts`). **Decision: Google sign-in is not used.**
The clean fix is to **gate the provider in code** so it's only registered when both vars
are set — then no button shows and no creds are needed in any scope (tracked as a small
follow-up code change). Until that lands, the vars are read with `!` at auth init, so set
`GOOGLE_ID` / `GOOGLE_SECRET` to **placeholders** in Production (matching QA) to satisfy
the reads. If Google login is ever wanted: real values from Google Cloud → OAuth client,
redirect `https://crm.radeengineering.com/api/auth/callback/google`.

### For live campaigns / tracking

`RESEND_FROM_EMAIL` (campaign sender), `RESEND_WEBHOOK_SECRET` (the **production**
Resend webhook's signing secret — the QA one won't verify prod deliveries).

### Optional (only if the feature is used)

`UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`, `E2B_API_KEY`, AI keys,
`GOOGLE_CALENDAR_*`, `NEXTCRM_TOKEN`, `NEXT_PUBLIC_APP_DOMAIN=crm.radeengineering.com`.

### Current state — gaps to close (snapshot 2026-09-28)

Diffed against the live Vercel **Production** scope; **update or delete this block once
closed** (it's a point-in-time snapshot, not a standing rule):

| Var | Status | Priority |
|---|---|---|
| `RESEND_API_KEY` | **Missing** in Production (only in Preview) | 🔴 Login-critical — new prod-only key |
| `EMAIL_FROM` | **Missing** in Production (only in Preview) | 🔴 Login-critical |
| `RESEND_WEBHOOK_SECRET` | Missing (only QA endpoint's secret) | 🟠 No prod open/click tracking until set |
| `GOOGLE_ID` / `GOOGLE_SECRET` | Missing (placeholders in Preview) | ⚪ Google sign-in not used — gate in code (follow-up), or set placeholders as interim |
| `NEXT_PUBLIC_APP_DOMAIN` | Absent everywhere | ⚪ Optional (fallback `nextcrm.app`) |
| everything else in the lists above | ✅ Already set correctly in Production | — |

Hygiene: real secrets entered in Preview/Production must be stored **Sensitive**, not
Plain (Vercel flags Plain secrets `readable-secret`). `JWT_SECRET`, `GITHUB_*`, `IMAP_*`
present in some scopes are **not read by this fork** (CI/legacy) — leave as-is.

### Then promote

1. Set the vars above (login-critical first).
2. Arm the `PRODUCTION_PROMOTE_ENABLED` repo variable (promotion is inert until set).
3. Confirm the GitHub **`production` environment** has the required-reviewer gate.
4. Run the **Promote to Production** action (a code-only fast-forward of `production`
   from `qa`, gated on the reviewer).
5. Verify: the prod deploy migrated `nextcrm-prod`, and email-OTP login works — in prod
   the OTP arrives by **real email** now (no dev-log line, no `test-otp` endpoint).

## Adding or renaming a variable

1. Add the key to `.env.example` (in the fork block if it's a fork addition).
2. Document it in a table **inside the `env-doc` markers** above.
3. If it's required, add it to every Vercel scope in the **same** PR (or gate the
   consumer fail-closed until Preview + Production carry it).
4. Run `bash scripts/check-env-docs.sh` — it must pass with no parity failures.
