# Better-Auth Migration Design Spec

**Date:** 2026-04-01
**Status:** Approved
**Approach:** Big-bang swap per instance with short maintenance window

## Overview

Replace next-auth with better-auth across the entire application. Auth methods change from Google OAuth + GitHub OAuth + email/password to Google OAuth + Email OTP only. Sessions move from JWT to database-backed. Simple RBAC replaces boolean admin flags. Security is the top priority.

## Requirements

- Google OAuth and Email OTP as the only auth methods (no passwords)
- Database sessions with instant revocation
- Simple RBAC: `admin`, `member`, `viewer`
- PENDING user approval flow preserved (admin must activate new users in production)
- Demo instance (`demo.nextcrm.io`) auto-activates new users
- Safe migration for multiple production instances with separate databases
- Short maintenance window acceptable per instance
- Existing users must re-verify email on first post-migration login
- Rollback capability without data loss

## 1. Core Auth Configuration

### `lib/auth.ts` — better-auth instance

- **Prisma adapter** with existing PrismaClient (PostgreSQL)
- **Google OAuth** via `socialProviders.google` using `GOOGLE_ID` / `GOOGLE_SECRET`
- **Email OTP plugin** — sends codes via Resend through `sendVerificationOTP` callback
- **Admin plugin** with `createAccessControl` for RBAC
- **Database sessions** (better-auth default) — stored in `session` table
- `emailAndPassword: { enabled: false }` — explicitly disabled

### `lib/auth-client.ts` — client-side helper

- `createAuthClient()` with `adminClient` plugin for role-aware checks
- Used on login page and where client-side role checks are needed

### `lib/auth-permissions.ts` — access control definitions

- Three roles defined via `createAccessControl`: `admin`, `member`, `viewer`
- Exported for use in both server and client auth configs

### API handler

- Delete `app/api/auth/[...nextauth]/route.ts`
- Create `app/api/auth/[...all]/route.ts`:
  ```typescript
  import { auth } from "@/lib/auth";
  import { toNextJsHandler } from "better-auth/next-js";
  export const { GET, POST } = toNextJsHandler(auth);
  ```

## 2. Route Protection with `proxy.ts`

### Modify existing `proxy.ts` (not create new)

**Changes:**
1. Replace `getToken` from `next-auth/jwt` with `getSessionCookie` from `better-auth/cookies`
2. Add unauthenticated redirect: requests to `/(routes)/*` without session cookie redirect to `/sign-in`
3. Keep `next-intl` integration — `intlMiddleware` unchanged
4. Keep Inngest webhook passthrough (`/api/inngest`) — unchanged

**Admin-only route handling change:**
- Current: proxy decodes JWT to check `isAdmin` claim
- New: proxy does cookie-presence check only (no JWT to decode)
- Admin role enforcement moves entirely to server-side API route handlers
- This is more secure: validates against DB session instead of trusting JWT claims

**Proxy flow:**
```
Request → /api/inngest? → passthrough
        → Admin API? → cookie check → no cookie = 401, has cookie = next()
        → Non-API? → cookie check → no cookie = redirect /sign-in
                   → intlMiddleware for i18n
```

**Defense-in-depth:** proxy is layer 1 (cookie presence, fast). Server-side `auth.api.getSession()` is layer 2 (DB session validation, authoritative). Both layers required.

## 3. Authentication Flow & UI

### Login page rewrite (`components/LoginComponent.tsx`)

Two auth methods presented as clear options:

1. **Google OAuth button** — `authClient.signIn.social({ provider: "google" })`
2. **Email OTP** — two-step UI:
   - Step 1: email input → `authClient.emailOtp.sendVerificationOtp({ email, type: "sign-in" })`
   - Step 2: 6-digit code input → `authClient.emailOtp.verifyEmail({ email, otp })`

No password fields. No password reset dialog.

### OTP delivery

- Configured in `emailOTP` plugin's `sendVerificationOTP` callback in `lib/auth.ts`
- Sends branded email via Resend with 6-digit code
- 5-minute expiry (better-auth default)
- Rate limiting per-email handled by better-auth

### User creation paths

| Path | Status | Role |
|---|---|---|
| First user ever | `ACTIVE` | `admin` |
| Self-signup (production) | `PENDING` | `member` |
| Self-signup (demo: `NEXT_PUBLIC_APP_URL === "https://demo.nextcrm.io"`) | `ACTIVE` | `member` |
| Admin invitation | `ACTIVE` | `member` |

### PENDING user flow (unchanged)

- `/(routes)/layout.tsx` checks `session.user.userStatus`
- `PENDING` → redirect to `/pending` page ("Your account must be allowed by Admin")
- `INACTIVE` → redirect to `/inactive` page
- Admin activates user via admin panel → status set to `ACTIVE`

### Admin invitation flow (updated)

- Current: admin enters email/name → user created `ACTIVE` with temp password → email with password
- New: admin enters email/name → user created `ACTIVE` with role `member` → email with sign-in link (user authenticates via OTP on first visit, no password to communicate)

### Existing user re-verification on migration

- User signs in via Google or Email OTP
- Matched by email to existing user record → linked to new `account` table entry
- Status preserved (`ACTIVE` stays `ACTIVE`, `PENDING` stays `PENDING`)
- `lastLoginAt` updated, DB session created

### Sign-out

- `authClient.signOut()` → DB session row deleted server-side
- Redirect to `/sign-in`

### Files affected

- `components/LoginComponent.tsx` — full rewrite
- `actions/auth/register-user.ts` — delete (user creation moves into better-auth hooks)
- `actions/auth/password-reset.ts` — delete
- `actions/admin/users/invite-user.ts` — rewrite (no password generation, send OTP invite link)

## 4. Database Migration & Schema

### New tables (via `npx auth generate --output prisma`)

- **`session`** — `id`, `token`, `userId`, `expiresAt`, `ipAddress`, `userAgent`, `createdAt`, `updatedAt`
- **`account`** — `id`, `userId`, `accountId`, `providerId`, `accessToken`, `refreshToken`, `expiresAt`
- **`verification`** — `id`, `identifier`, `value`, `expiresAt`, `createdAt`, `updatedAt`

### Changes to existing `users` table

| Change | Details |
|---|---|
| Add `role` column | `String @default("member")` — values: `admin`, `member`, `viewer` |
| Keep `password` | Temporarily for rollback safety. Removed in follow-up cleanup PR |
| Keep `is_admin`, `is_account_admin` | Temporarily. Migration backfills `role`, then removed in cleanup |
| Keep `userStatus` | Unchanged — `ACTIVE`/`PENDING`/`INACTIVE` flow preserved |

### Data migration script (per-instance)

1. Backfill `role` from existing flags:
   - `is_admin = true` → `role = "admin"`
   - `is_account_admin = true` AND `is_admin = false` → `role = "member"`
   - Neither → `role = "member"`
2. All existing sessions invalidated (JWT sessions become meaningless; new DB session table starts empty)
3. No `account` records pre-created — populated on first login when users re-verify
4. Script must be **idempotent** (safe to run multiple times)

### Rollback safety

- Old columns (`password`, `is_admin`, `is_account_admin`) preserved
- Rollback: revert code deploy → old columns still intact → users log in with old credentials
- Cleanup PR after all instances stable: remove old columns

## 5. RBAC Implementation

### Role definitions (`lib/auth-permissions.ts`)

| Role | Permissions |
|---|---|
| `admin` | Full system access: manage users, change roles, activate/deactivate, all CRUD, settings |
| `member` | Standard CRM user: CRUD on contacts, accounts, leads, campaigns, projects, reports |
| `viewer` | Read-only: view all CRM data, no create/edit/delete |

### Enforcement layers

1. **Proxy** (`proxy.ts`): admin API paths get cookie-presence check only
2. **Server-side admin API routes**: `auth.api.getSession()` + `role === "admin"` check → 403 if not
3. **Admin pages** (`/(routes)/admin/*`): server component redirect for non-admins
4. **Viewer restrictions**: enforced at API route level — POST/PATCH/DELETE blocked, GET allowed

### Role migration mapping

| Current flags | New role |
|---|---|
| `is_admin: true` | `admin` |
| `is_account_admin: true`, `is_admin: false` | `member` |
| Both `false` | `member` |

No `viewer` users exist today — available for admins to assign going forward.

### Admin panel changes

- Replace "Activate Admin" / "Deactivate Admin" buttons with role dropdown (`admin` / `member` / `viewer`)
- Keep "Activate User" / "Deactivate User" for status management (separate concern from roles)
- Only `admin` role can change other users' roles

## 6. Environment Variables

### Remove

| Variable | Reason |
|---|---|
| `NEXTAUTH_URL` | better-auth uses `baseURL` or auto-detects |
| `NEXTAUTH_SECRET` | Replaced by `BETTER_AUTH_SECRET` |
| `JWT_SECRET` | No more JWT sessions |
| `GITHUB_ID` | Dropping GitHub OAuth |
| `GITHUB_SECRET` | Dropping GitHub OAuth |

### Add

| Variable | Purpose |
|---|---|
| `BETTER_AUTH_SECRET` | Session signing & encryption — `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | Base URL for auth callbacks |

### Keep

| Variable | Purpose |
|---|---|
| `GOOGLE_ID` | Google OAuth client ID |
| `GOOGLE_SECRET` | Google OAuth client secret |
| `RESEND_API_KEY` | Email delivery — now also used for OTP |
| `NEXT_PUBLIC_APP_URL` | Demo mode detection |

### Package changes

- Remove: `next-auth`
- Add: `better-auth`

## 7. Server-Side Session Replacement

Systematic replacement across ~15 pages and ~23 API routes.

### Pages pattern

```typescript
// OLD
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
const session = await getServerSession(authOptions);
if (!session) redirect("/sign-in");

// NEW
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
const session = await auth.api.getSession({ headers: await headers() });
if (!session) redirect("/sign-in");
```

### API routes pattern

```typescript
// OLD
const session = await getServerSession(authOptions);
if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

// NEW
const session = await auth.api.getSession({ headers: await headers() });
if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
```

### Session object shape change

| Old (`next-auth`) | New (`better-auth`) |
|---|---|
| `session.user.id` | `session.user.id` |
| `session.user.email` | `session.user.email` |
| `session.user.name` | `session.user.name` |
| `session.user.isAdmin` | `session.user.role === "admin"` |
| `session.user.userStatus` | `session.user.userStatus` (custom field) |
| `session.user.userLanguage` | `session.user.userLanguage` (custom field) |
| `session.user.avatar` | `session.user.image` (better-auth convention) |

Custom fields (`userStatus`, `userLanguage`, `role`) added to session via better-auth's `user.additionalFields` configuration.

## 8. Per-Instance Deployment Sequence

1. Announce maintenance window to users
2. Enable maintenance mode
3. Run `prisma migrate deploy` (adds new tables + `role` column)
4. Run data migration script (backfill roles from `is_admin` / `is_account_admin`)
5. Deploy new code (better-auth replaces next-auth)
6. Verify: hit `/api/auth/ok` or equivalent health check
7. Disable maintenance mode
8. Users re-login via Google or Email OTP — triggers re-verification

**Rollback:** revert deploy → old auth columns intact → users use old credentials. New empty tables (`session`, `account`, `verification`) are harmless.

**Instance rollout order:** migrate lowest-risk instance first, verify for 24-48 hours, then proceed to remaining instances.

## 9. Security Audit Checklist

### Authentication surface
- [ ] No password-based login paths remain
- [ ] OTP codes expire after 5 minutes, single-use
- [ ] OTP rate limiting active per-email
- [ ] Google OAuth callback URL restricted to known domains
- [ ] `BETTER_AUTH_SECRET` unique per instance, minimum 32 bytes

### Session security
- [ ] All sessions stored in DB, no JWT fallback
- [ ] Session expiry: 7 days idle, 30 days absolute
- [ ] Session invalidated on sign-out (DB row deleted)
- [ ] Old next-auth cookies (`next-auth.session-token`, `next-auth.csrf-token`) cleared on first visit

### Route protection — zero gaps
- [ ] Every `/(routes)/*` page has server-side `auth.api.getSession()` check
- [ ] Every API route (all 23) has session validation
- [ ] Admin API routes check `role === "admin"` server-side
- [ ] `proxy.ts` redirects unauthenticated non-API requests to `/sign-in`
- [ ] Inngest webhook passthrough preserved
- [ ] Any public API endpoints explicitly allowlisted in proxy and documented

### RBAC
- [ ] `viewer` role blocked from POST/PATCH/DELETE endpoints
- [ ] Only `admin` can change user roles and activate/deactivate users
- [ ] Role stored in DB, not derived from cookie/token

### Migration safety
- [ ] Old auth columns preserved for rollback
- [ ] Data migration script is idempotent
- [ ] Rollback procedure documented and tested

### PENDING user flow
- [ ] New self-signup users get `PENDING` in production
- [ ] Demo instance auto-activates
- [ ] `PENDING` users cannot access `/(routes)/*` content

## 10. Cleanup PR (after all instances stable)

- Remove `password` column from `users` table
- Remove `is_admin` and `is_account_admin` columns
- Remove old env vars from `.env.example`
- Remove `next-auth` from `package.json` (if not already)
- Update any remaining references to old session shape
