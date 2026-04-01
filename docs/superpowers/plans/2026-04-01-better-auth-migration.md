# Better-Auth Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace next-auth with better-auth using Google OAuth + Email OTP, database sessions, and simple RBAC (admin/member/viewer).

**Architecture:** Big-bang swap per instance. better-auth instance in `lib/auth.ts` with Prisma adapter, `emailOTP` and `admin` plugins. New `session`, `account`, `verification` DB tables. Existing `users` table gets `role` column. All `getServerSession(authOptions)` calls replaced with `auth.api.getSession()`. `proxy.ts` updated from JWT decode to cookie-presence check.

**Tech Stack:** better-auth, Prisma (PostgreSQL), Resend (email OTP), Next.js 16 (proxy.ts), React Email

**Spec:** `docs/superpowers/specs/2026-04-01-better-auth-migration-design.md`

---

### Task 1: Install better-auth and remove next-auth packages

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install better-auth**

Run:
```bash
npm install better-auth
```

- [ ] **Step 2: Uninstall next-auth and its adapter**

Run:
```bash
npm uninstall next-auth @next-auth/prisma-adapter
```

- [ ] **Step 3: Verify installation**

Run:
```bash
npm ls better-auth
```
Expected: `better-auth@<version>` listed without errors.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: replace next-auth with better-auth package"
```

---

### Task 2: Add better-auth tables and role column to Prisma schema

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Generate better-auth schema additions**

Run:
```bash
npx auth generate --output prisma
```

This generates the `session`, `account`, and `verification` models. Review the output and merge it into `prisma/schema.prisma`.

- [ ] **Step 2: Add the three new models to Prisma schema**

Add these models to `prisma/schema.prisma`. The exact field names must match better-auth's expectations (camelCase by default):

```prisma
model Session {
  id        String   @id
  expiresAt DateTime
  token     String   @unique
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  ipAddress String?
  userAgent String?
  userId    String   @db.Uuid
  user      Users    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("session")
}

model Account {
  id                    String    @id
  accountId             String
  providerId            String
  userId                String    @db.Uuid
  user                  Users     @relation(fields: [userId], references: [id], onDelete: Cascade)
  accessToken           String?
  refreshToken          String?
  idToken               String?
  accessTokenExpiresAt  DateTime?
  refreshTokenExpiresAt DateTime?
  scope                 String?
  password              String?
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt

  @@map("account")
}

model Verification {
  id         String    @id
  identifier String
  value      String
  expiresAt  DateTime
  createdAt  DateTime? @default(now())
  updatedAt  DateTime? @updatedAt

  @@map("verification")
}
```

- [ ] **Step 3: Add role column and relations to Users model**

In `prisma/schema.prisma`, add the `role` field and relations to the `Users` model:

```prisma
model Users {
  // ... existing fields ...
  role         String       @default("member")  // "admin", "member", "viewer"
  // ... existing relations ...
  sessions     Session[]
  accounts     Account[]
}
```

Add the `role` field after `is_account_admin` and the `sessions`/`accounts` relations at the end of the relations block.

- [ ] **Step 4: Create and apply the migration**

Run:
```bash
npx prisma migrate dev --name add-better-auth-tables-and-role
```
Expected: Migration created and applied successfully. Three new tables created, `role` column added to `users`.

- [ ] **Step 5: Verify schema**

Run:
```bash
npx prisma db pull --force
```
Then check that `session`, `account`, `verification` tables exist and `users.role` column is present.

- [ ] **Step 6: Commit**

```bash
git add prisma/
git commit -m "feat(db): add better-auth session/account/verification tables and role column"
```

---

### Task 3: Create data migration script to backfill roles

**Files:**
- Create: `scripts/migration/backfill-roles.ts`

- [ ] **Step 1: Write the idempotent migration script**

Create `scripts/migration/backfill-roles.ts`:

```typescript
/**
 * Backfill the `role` column from existing `is_admin` / `is_account_admin` flags.
 * Idempotent: safe to run multiple times.
 *
 * Mapping:
 *   is_admin = true              → role = "admin"
 *   is_account_admin = true      → role = "member"
 *   both false                   → role = "member"
 *
 * Run: npx tsx scripts/migration/backfill-roles.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting role backfill...");

  // Admins first (is_admin takes precedence)
  const adminResult = await prisma.users.updateMany({
    where: { is_admin: true, role: "member" },
    data: { role: "admin" },
  });
  console.log(`  Updated ${adminResult.count} users to role=admin`);

  // is_account_admin users stay as "member" (already the default)
  // No action needed — they already have role="member"

  const summary = await prisma.users.groupBy({
    by: ["role"],
    _count: { role: true },
  });
  console.log("Role distribution:", summary);

  console.log("Role backfill complete.");
}

main()
  .catch((e) => {
    console.error("Backfill failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
```

- [ ] **Step 2: Run the script locally**

Run:
```bash
npx tsx scripts/migration/backfill-roles.ts
```
Expected: Output showing number of users updated and role distribution.

- [ ] **Step 3: Verify roles in database**

Run:
```bash
npx prisma studio
```
Check the Users table — `is_admin: true` users should have `role: "admin"`, all others `role: "member"`.

- [ ] **Step 4: Commit**

```bash
git add scripts/migration/backfill-roles.ts
git commit -m "feat(migration): add idempotent role backfill script"
```

---

### Task 4: Create RBAC permissions definition

**Files:**
- Create: `lib/auth-permissions.ts`

- [ ] **Step 1: Write the access control definitions**

Create `lib/auth-permissions.ts`:

```typescript
import { createAccessControl } from "better-auth/plugins/access";

const statements = {
  user: ["create", "read", "update", "delete", "changeRole", "activate", "deactivate"],
  crm: ["create", "read", "update", "delete"],
  project: ["create", "read", "update", "delete"],
  report: ["read", "export"],
  settings: ["read", "update"],
} as const;

export const ac = createAccessControl(statements);

export const admin = ac.newRole({
  user: ["create", "read", "update", "delete", "changeRole", "activate", "deactivate"],
  crm: ["create", "read", "update", "delete"],
  project: ["create", "read", "update", "delete"],
  report: ["read", "export"],
  settings: ["read", "update"],
});

export const member = ac.newRole({
  user: ["read"],
  crm: ["create", "read", "update", "delete"],
  project: ["create", "read", "update", "delete"],
  report: ["read", "export"],
  settings: ["read"],
});

export const viewer = ac.newRole({
  user: ["read"],
  crm: ["read"],
  project: ["read"],
  report: ["read"],
  settings: ["read"],
});
```

- [ ] **Step 2: Commit**

```bash
git add lib/auth-permissions.ts
git commit -m "feat(auth): add RBAC permission definitions for admin/member/viewer"
```

---

### Task 5: Create better-auth server instance

**Files:**
- Modify: `lib/auth.ts` (full rewrite)

- [ ] **Step 1: Write the new auth configuration**

Replace the entire contents of `lib/auth.ts` with:

```typescript
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { emailOTP } from "better-auth/plugins";
import { admin as adminPlugin } from "better-auth/plugins";
import { prismadb } from "@/lib/prisma";
import { ac, admin, member, viewer } from "@/lib/auth-permissions";
import { newUserNotify } from "@/lib/new-user-notify";
import resendHelper from "@/lib/resend";

const isDemo = process.env.NEXT_PUBLIC_APP_URL === "https://demo.nextcrm.io";

export const auth = betterAuth({
  database: prismaAdapter(prismadb, { provider: "postgresql" }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,

  session: {
    expiresIn: 60 * 60 * 24 * 7,       // 7 days
    updateAge: 60 * 60 * 24,            // refresh every 24 hours
  },

  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "member",
        input: false,
      },
      userStatus: {
        type: "string",
        defaultValue: isDemo ? "ACTIVE" : "PENDING",
        input: false,
      },
      userLanguage: {
        type: "string",
        defaultValue: "en",
        input: false,
      },
      avatar: {
        type: "string",
        required: false,
        input: false,
      },
    },
  },

  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_ID!,
      clientSecret: process.env.GOOGLE_SECRET!,
    },
  },

  emailAndPassword: {
    enabled: false,
  },

  plugins: [
    emailOTP({
      sendVerificationOTP: async ({ email, otp, type }) => {
        const resend = await resendHelper();
        await resend.emails.send({
          from: `${process.env.NEXT_PUBLIC_APP_NAME} <${process.env.EMAIL_FROM}>`,
          to: email,
          subject: `Your verification code: ${otp}`,
          text: `Your one-time verification code is: ${otp}\n\nThis code expires in 5 minutes.\n\nIf you did not request this, please ignore this email.`,
        });
      },
    }),
    adminPlugin({
      ac,
      roles: { admin, member, viewer },
      defaultRole: "member",
    }),
  ],

  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["google"],
    },
  },

  callbacks: {
    async onUserCreated(user) {
      // Check if this is the first user — make them admin
      const count = await prismadb.users.count();
      if (count === 1) {
        await prismadb.users.update({
          where: { id: user.id },
          data: { role: "admin", userStatus: "ACTIVE" },
        });
      } else if (!isDemo) {
        // Notify admins about new pending user
        const dbUser = await prismadb.users.findUnique({ where: { id: user.id } });
        if (dbUser) {
          await newUserNotify(dbUser);
        }
      }
    },
  },
});

export type Session = typeof auth.$Infer.Session;
```

- [ ] **Step 2: Verify TypeScript compiles**

Run:
```bash
npx tsc --noEmit lib/auth.ts 2>&1 | head -20
```
Fix any type errors before proceeding.

- [ ] **Step 3: Commit**

```bash
git add lib/auth.ts
git commit -m "feat(auth): rewrite auth config with better-auth, Google OAuth, email OTP, RBAC"
```

---

### Task 6: Create better-auth client instance

**Files:**
- Create: `lib/auth-client.ts`

- [ ] **Step 1: Write the auth client**

Create `lib/auth-client.ts`:

```typescript
import { createAuthClient } from "better-auth/react";
import { emailOTPClient, adminClient } from "better-auth/client/plugins";
import { ac, admin, member, viewer } from "@/lib/auth-permissions";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL,
  plugins: [
    emailOTPClient(),
    adminClient({
      ac,
      roles: { admin, member, viewer },
    }),
  ],
});

export const { signIn, signOut, useSession } = authClient;
```

- [ ] **Step 2: Commit**

```bash
git add lib/auth-client.ts
git commit -m "feat(auth): add better-auth client with email OTP and admin plugins"
```

---

### Task 7: Create better-auth API route handler

**Files:**
- Delete: `app/api/auth/[...nextauth]/route.ts`
- Create: `app/api/auth/[...all]/route.ts`

- [ ] **Step 1: Delete the old NextAuth route handler**

Run:
```bash
rm -rf app/api/auth/\\[...nextauth\\]
```

- [ ] **Step 2: Create the new better-auth route handler**

Create directory and file `app/api/auth/[...all]/route.ts`:

```typescript
import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

export const { GET, POST } = toNextJsHandler(auth);
```

- [ ] **Step 3: Commit**

```bash
git add -A app/api/auth/
git commit -m "feat(auth): replace NextAuth route handler with better-auth catch-all"
```

---

### Task 8: Create server-side auth helper

**Files:**
- Create: `lib/auth-server.ts`

This helper centralizes the server-side session retrieval pattern used across ~25 files. Instead of repeating the `auth.api.getSession({ headers: await headers() })` pattern, we export a single function.

- [ ] **Step 1: Write the server helper**

Create `lib/auth-server.ts`:

```typescript
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function getSession() {
  return auth.api.getSession({
    headers: await headers(),
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/auth-server.ts
git commit -m "feat(auth): add server-side getSession helper"
```

---

### Task 9: Update proxy.ts for better-auth

**Files:**
- Modify: `proxy.ts`

- [ ] **Step 1: Replace next-auth JWT check with better-auth cookie check**

Replace the entire contents of `proxy.ts`:

```typescript
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { getSessionCookie } from "better-auth/cookies";
import { NextRequest, NextResponse } from "next/server";

const intlMiddleware = createMiddleware(routing);

// Admin-only API paths — cookie presence checked here, role checked server-side
const ADMIN_ONLY_PATHS = [
  "/api/user/activateAdmin",
  "/api/user/deactivateAdmin",
  "/api/user/activate",
  "/api/user/deactivate",
  "/api/user/inviteuser",
  "/api/admin",
];

export async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // Inngest webhook — pass through, Inngest handles its own auth via signing key
  if (path.startsWith("/api/inngest")) {
    return NextResponse.next();
  }

  // better-auth API routes — pass through to better-auth handler
  if (path.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  const sessionCookie = getSessionCookie(req);

  // Admin-only routes — require session cookie (role checked server-side)
  if (ADMIN_ONLY_PATHS.some((p) => path.startsWith(p))) {
    if (!sessionCookie) {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }
    return NextResponse.next();
  }

  // Non-API routes — redirect to sign-in if no session cookie
  if (!path.startsWith("/api")) {
    if (!sessionCookie) {
      // Allow auth pages (sign-in, register, pending, inactive)
      const authPaths = ["/sign-in", "/register", "/pending", "/inactive"];
      const isAuthPage = authPaths.some((p) => path.includes(p));
      if (!isAuthPage) {
        return NextResponse.redirect(new URL("/sign-in", req.nextUrl));
      }
    }
  }

  // Non-API routes — delegate to next-intl
  return intlMiddleware(req);
}

export const config = {
  matcher: [
    // Admin-only API paths
    "/api/user/activateAdmin/:path*",
    "/api/user/deactivateAdmin/:path*",
    "/api/user/activate/:path*",
    "/api/user/deactivate/:path*",
    "/api/user/inviteuser",
    "/api/admin/:path*",
    // better-auth API
    "/api/auth/:path*",
    // All non-API routes (existing intl matcher)
    "/((?!api|trpc|_next|_vercel|.*\\..*).*)",
  ],
};
```

- [ ] **Step 2: Commit**

```bash
git add proxy.ts
git commit -m "feat(auth): update proxy.ts from next-auth JWT to better-auth cookie check"
```

---

### Task 10: Update new-user-notify to use role instead of is_admin

**Files:**
- Modify: `lib/new-user-notify.ts`

- [ ] **Step 1: Replace is_admin query with role query**

Replace the contents of `lib/new-user-notify.ts`:

```typescript
import { Users } from "@prisma/client";

import { prismadb } from "./prisma";
import sendEmail from "./sendmail";

export async function newUserNotify(newUser: Users) {
  const admins = await prismadb.users.findMany({
    where: {
      role: "admin",
    },
  });

  admins.forEach(async (admin) => {
    await sendEmail({
      from: process.env.EMAIL_FROM,
      to: admin.email,
      subject: `New User Registration with PENDING state`,
      text: `New User Registered: ${newUser.name} \n\n Please login to ${process.env.NEXT_PUBLIC_APP_URL}/admin/users and activate them. \n\n Thank you \n\n ${process.env.NEXT_PUBLIC_APP_NAME}`,
    });

    console.log("Email sent to admin");
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/new-user-notify.ts
git commit -m "refactor(auth): use role field instead of is_admin in new-user-notify"
```

---

### Task 11: Update type definitions

**Files:**
- Modify: `types/next-auth.d.ts` → rename to `types/auth.d.ts`

- [ ] **Step 1: Delete old next-auth type definitions**

Run:
```bash
rm types/next-auth.d.ts
```

The session type is now exported from `lib/auth.ts` as `Session` via `auth.$Infer.Session`. No separate type declaration file needed — consumers import `Session` from `@/lib/auth`.

- [ ] **Step 2: Commit**

```bash
git add types/next-auth.d.ts
git commit -m "chore: remove next-auth type definitions"
```

---

### Task 12: Rewrite LoginComponent for Google OAuth + Email OTP

**Files:**
- Modify: `app/[locale]/(auth)/sign-in/components/LoginComponent.tsx` (full rewrite)

- [ ] **Step 1: Write the new login component**

Replace the entire contents of `app/[locale]/(auth)/sign-in/components/LoginComponent.tsx`:

```tsx
"use client";

import React, { useState } from "react";
import { authClient } from "@/lib/auth-client";

import { Icons } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { MailIcon } from "lucide-react";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

type Step = "email" | "otp";

export function LoginComponent() {
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");

  const loginWithGoogle = async () => {
    setIsLoading(true);
    try {
      await authClient.signIn.social({
        provider: "google",
        callbackURL: "/",
      });
    } catch (error) {
      toast.error("Something went wrong with Google sign-in.");
    } finally {
      setIsLoading(false);
    }
  };

  const sendOtp = async () => {
    if (!email) {
      toast.error("Please enter your email address.");
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await authClient.emailOtp.sendVerificationOtp({
        email,
        type: "sign-in",
      });
      if (error) {
        toast.error(error.message || "Failed to send verification code.");
        return;
      }
      setStep("otp");
      toast.success("Verification code sent to your email.");
    } catch (error) {
      toast.error("Failed to send verification code.");
    } finally {
      setIsLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (otp.length !== 6) {
      toast.error("Please enter the 6-digit code.");
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await authClient.emailOtp.verifyEmail({
        email,
        otp,
      });
      if (error) {
        toast.error(error.message || "Invalid or expired code.");
        return;
      }
      toast.success("Login successful.");
      window.location.href = "/";
    } catch (error) {
      toast.error("Verification failed.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="shadow-lg my-5">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl">Login</CardTitle>
        <CardDescription>Choose your sign-in method</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <Button
          variant="outline"
          onClick={loginWithGoogle}
          disabled={isLoading}
          className="w-full"
        >
          <Icons.google className="mr-2 h-4 w-4" />
          Continue with Google
        </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              Or continue with email
            </span>
          </div>
        </div>

        {step === "email" && (
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                onKeyDown={(e) => e.key === "Enter" && sendOtp()}
              />
            </div>
            <Button onClick={sendOtp} disabled={isLoading || !email}>
              <MailIcon className="mr-2 h-4 w-4" />
              Send verification code
            </Button>
          </div>
        )}

        {step === "otp" && (
          <div className="grid gap-3">
            <p className="text-sm text-muted-foreground">
              Enter the 6-digit code sent to <strong>{email}</strong>
            </p>
            <div className="flex justify-center">
              <InputOTP
                maxLength={6}
                value={otp}
                onChange={setOtp}
                disabled={isLoading}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>
            <Button onClick={verifyOtp} disabled={isLoading || otp.length !== 6}>
              Verify and sign in
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setStep("email");
                setOtp("");
              }}
              disabled={isLoading}
            >
              Use a different email
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Verify the InputOTP component exists in shadcn**

Run:
```bash
ls components/ui/input-otp.tsx 2>/dev/null || npx shadcn@latest add input-otp
```

- [ ] **Step 3: Commit**

```bash
git add app/[locale]/(auth)/sign-in/components/LoginComponent.tsx components/ui/input-otp.tsx
git commit -m "feat(auth): rewrite login page with Google OAuth + Email OTP"
```

---

### Task 13: Remove register page and password-related files

**Files:**
- Delete: `app/[locale]/(auth)/register/` (entire directory)
- Delete: `actions/auth/register-user.ts`
- Delete: `actions/auth/password-reset.ts`
- Delete: `emails/PasswordReset.tsx`
- Delete: `components/UserAuthForm.tsx` (if it only contains next-auth signIn)

- [ ] **Step 1: Remove register page**

Run:
```bash
rm -rf "app/[locale]/(auth)/register"
```

- [ ] **Step 2: Remove password-related actions and email template**

Run:
```bash
rm actions/auth/register-user.ts
rm actions/auth/password-reset.ts
rm emails/PasswordReset.tsx
```

- [ ] **Step 3: Check if UserAuthForm.tsx is used elsewhere**

Run:
```bash
grep -r "UserAuthForm" --include="*.tsx" --include="*.ts" -l
```

If only referenced by deleted files, remove it:
```bash
rm components/UserAuthForm.tsx
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore(auth): remove register page, password reset, and credentials flow"
```

---

### Task 14: Update routes layout auth check

**Files:**
- Modify: `app/[locale]/(routes)/layout.tsx`

- [ ] **Step 1: Replace getServerSession with better-auth getSession**

In `app/[locale]/(routes)/layout.tsx`, replace lines 1-3 and 51:

Old imports (lines 1-3):
```typescript
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
```

New imports:
```typescript
import { getSession } from "@/lib/auth-server";
```

Old session call (line 51):
```typescript
  const session = await getServerSession(authOptions);
```

New session call:
```typescript
  const session = await getSession();
```

Also update the session property accesses — `session.user.isAdmin` is no longer used in this file (the layout only checks `userStatus`), so no other changes needed. The `session.user.id`, `session.user.userLanguage`, `session.user.image` properties are available via better-auth's `additionalFields`.

- [ ] **Step 2: Verify the layout compiles**

Run:
```bash
npx tsc --noEmit "app/[locale]/(routes)/layout.tsx" 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add "app/[locale]/(routes)/layout.tsx"
git commit -m "refactor(auth): update routes layout to use better-auth session"
```

---

### Task 15: Update all server-side page auth checks (batch 1 — CRM pages)

**Files:**
- Modify: `app/[locale]/(routes)/crm/contacts/enrichment/page.tsx`
- Modify: `app/[locale]/(routes)/crm/contacts/[contactId]/components/HistoryTab.tsx`
- Modify: `app/[locale]/(routes)/crm/accounts/[accountId]/components/HistoryTab.tsx`
- Modify: `app/[locale]/(routes)/crm/contracts/[contractId]/components/HistoryTab.tsx`
- Modify: `app/[locale]/(routes)/crm/leads/[leadId]/components/HistoryTab.tsx`
- Modify: `app/[locale]/(routes)/crm/opportunities/[opportunityId]/components/HistoryTab.tsx`
- Modify: `app/[locale]/(routes)/crm/dashboard/[userId]/page.tsx`
- Modify: `app/[locale]/(routes)/crm/dashboard/user/page.tsx`

- [ ] **Step 1: In each file, apply the same transformation**

For every file listed above, replace:

```typescript
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
```
with:
```typescript
import { getSession } from "@/lib/auth-server";
```

And replace:
```typescript
const session = await getServerSession(authOptions);
```
with:
```typescript
const session = await getSession();
```

Any check like `if (!session?.user?.id)` becomes `if (!session)` (better-auth sessions always have user.id if they exist).

Any reference to `session.user.isAdmin` becomes `session.user.role === "admin"`.

- [ ] **Step 2: Verify compilation**

Run:
```bash
npx tsc --noEmit 2>&1 | grep -i error | head -20
```

- [ ] **Step 3: Commit**

```bash
git add "app/[locale]/(routes)/crm/"
git commit -m "refactor(auth): update CRM pages to use better-auth session"
```

---

### Task 16: Update all server-side page auth checks (batch 2 — projects, emails, admin, other)

**Files:**
- Modify: `app/[locale]/(routes)/projects/page.tsx`
- Modify: `app/[locale]/(routes)/projects/dashboard/page.tsx`
- Modify: `app/[locale]/(routes)/projects/boards/[boardId]/page.tsx`
- Modify: `app/[locale]/(routes)/projects/_components/ProjectsView.tsx`
- Modify: `app/[locale]/(routes)/projects/tasks/[userId]/page.tsx`
- Modify: `app/[locale]/(routes)/projects/tasks/viewtask/[taskId]/page.tsx`
- Modify: `app/[locale]/(routes)/emails/page.tsx`
- Modify: `app/[locale]/(routes)/admin/audit-log/page.tsx`
- Modify: `app/[locale]/(routes)/admin/llm-keys/page.tsx`
- Modify: `app/[locale]/(routes)/admin/users/page.tsx`
- Modify: `app/[locale]/(routes)/campaigns/targets/enrichment/page.tsx`
- Modify: `app/[locale]/(routes)/page.tsx`

- [ ] **Step 1: Apply the same transformation as Task 15**

Same pattern in each file:
- Replace `getServerSession`/`authOptions` imports with `getSession` from `@/lib/auth-server`
- Replace `getServerSession(authOptions)` calls with `getSession()`
- Replace `session.user.isAdmin` with `session.user.role === "admin"`
- Replace `!session?.user?.id` checks with `!session`

Special case for `admin/users/page.tsx` (line 22):
```typescript
// OLD
if (!session?.user?.isAdmin) {
// NEW
if (session?.user?.role !== "admin") {
```

- [ ] **Step 2: Verify compilation**

Run:
```bash
npx tsc --noEmit 2>&1 | grep -i error | head -20
```

- [ ] **Step 3: Commit**

```bash
git add "app/[locale]/(routes)/"
git commit -m "refactor(auth): update remaining pages to use better-auth session"
```

---

### Task 17: Update pending and inactive auth pages

**Files:**
- Modify: `app/[locale]/(auth)/pending/page.tsx`
- Modify: `app/[locale]/(auth)/inactive/page.tsx`

- [ ] **Step 1: Update pending page**

Replace next-auth imports and session calls with better-auth equivalents:

```typescript
// OLD
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
// ...
const session = await getServerSession(authOptions);

// NEW
import { getSession } from "@/lib/auth-server";
// ...
const session = await getSession();
```

Also update admin query in pending page — replace `is_admin: true` with `role: "admin"` in the Prisma query that fetches admin contacts.

- [ ] **Step 2: Update inactive page**

Same transformation as pending page.

- [ ] **Step 3: Commit**

```bash
git add "app/[locale]/(auth)/pending/" "app/[locale]/(auth)/inactive/"
git commit -m "refactor(auth): update pending/inactive pages to better-auth"
```

---

### Task 18: Update all API routes

**Files:**
- Modify: `app/api/crm/contacts/[id]/route.ts`
- Modify: `app/api/crm/contacts/enrich-bulk/route.ts`
- Modify: `app/api/crm/contacts/enrich/route.ts`
- Modify: `app/api/crm/targets/[id]/contacts/[contactId]/enrich/route.ts`
- Modify: `app/api/crm/targets/[id]/contacts/route.ts`
- Modify: `app/api/crm/targets/[id]/enrich/route.ts`
- Modify: `app/api/crm/targets/[id]/route.ts`
- Modify: `app/api/crm/targets/enrich-bulk/route.ts`
- Modify: `app/api/crm/targets/enrich/route.ts`
- Modify: `app/api/feedback/route.ts`
- Modify: `app/api/reports/export/route.ts`
- Modify: `app/api/upload/presigned-url/route.ts`

- [ ] **Step 1: In each API route file, apply the same transformation**

Replace:
```typescript
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
```
with:
```typescript
import { getSession } from "@/lib/auth-server";
```

Replace:
```typescript
const session = await getServerSession(authOptions);
if (!session?.user?.id) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```
with:
```typescript
const session = await getSession();
if (!session) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```

Where `session.user.id` is used later in the handler (e.g., for `updatedBy`), it remains `session.user.id` — no change needed.

- [ ] **Step 2: Verify compilation**

Run:
```bash
npx tsc --noEmit 2>&1 | grep -i error | head -20
```

- [ ] **Step 3: Commit**

```bash
git add app/api/
git commit -m "refactor(auth): update all API routes to use better-auth session"
```

---

### Task 19: Update server actions with auth checks

**Files:**
- Modify: `actions/admin/users/activate-admin.ts` → rename to `actions/admin/users/set-role.ts`
- Delete: `actions/admin/users/deactivate-admin.ts`
- Modify: `actions/admin/users/invite-user.ts`
- Modify: `actions/admin/users/activate-user.ts`
- Modify: `actions/admin/users/deactivate-user.ts`
- Modify: `actions/admin/users/delete-user.ts`
- Modify: `actions/admin/update-gpt-model.ts`
- Modify: `actions/admin/send-mail-to-all/index.ts`
- Modify: `actions/user/update-profile.ts`
- Modify: `actions/user/set-new-password.ts` → delete (no passwords)
- Modify: `actions/user/set-language.ts`
- Modify: `app/[locale]/(routes)/admin/actions/api-keys.ts`
- Modify: `app/[locale]/(routes)/profile/actions/api-keys.ts`

- [ ] **Step 1: Replace activate-admin and deactivate-admin with set-role**

Delete `actions/admin/users/deactivate-admin.ts` and replace `actions/admin/users/activate-admin.ts` with a new `actions/admin/users/set-role.ts`:

```typescript
"use server";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

const VALID_ROLES = ["admin", "member", "viewer"] as const;
type Role = (typeof VALID_ROLES)[number];

export const setUserRole = async (userId: string, role: Role) => {
  const session = await getSession();
  if (!session) return { error: "Unauthorized" };
  if (session.user.role !== "admin") return { error: "Forbidden" };

  if (!userId) return { error: "userId is required" };
  if (!VALID_ROLES.includes(role)) return { error: "Invalid role" };

  // Prevent removing own admin role
  if (userId === session.user.id && role !== "admin") {
    return { error: "Cannot remove your own admin role" };
  }

  try {
    const user = await prismadb.users.update({
      where: { id: userId },
      data: { role },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        role: true,
        userLanguage: true,
        userStatus: true,
        lastLoginAt: true,
      },
    });
    revalidatePath("/[locale]/(routes)/admin", "page");
    return { data: user };
  } catch (error) {
    console.log("[SET_USER_ROLE]", error);
    return { error: "Failed to update user role" };
  }
};
```

- [ ] **Step 2: Update invite-user to remove password generation**

Replace `actions/admin/users/invite-user.ts`:

```typescript
"use server";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import InviteUserEmail from "@/emails/InviteUser";
import resendHelper from "@/lib/resend";
import { revalidatePath } from "next/cache";
import { Language } from "@prisma/client";

export const inviteUser = async (data: {
  name: string;
  email: string;
  language: string;
}) => {
  const session = await getSession();
  if (!session) return { error: "Unauthorized" };
  if (session.user.role !== "admin") return { error: "Forbidden" };

  const { name, email, language } = data;

  if (!name || !email || !language) {
    return { error: "Name, Email, and Language is required!" };
  }

  let resend;
  try {
    resend = await resendHelper();
  } catch (error: any) {
    return { error: error?.message || "Resend API key is not configured" };
  }

  const checkexisting = await prismadb.users.findFirst({
    where: { email },
  });

  if (checkexisting) {
    return { error: "User already exists!" };
  }

  try {
    const user = await prismadb.users.create({
      data: {
        name,
        email,
        userStatus: "ACTIVE",
        userLanguage: language as Language,
        role: "member",
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        role: true,
        userLanguage: true,
        userStatus: true,
        lastLoginAt: true,
      },
    });

    if (!user) {
      return { error: "User not created" };
    }

    await resend.emails.send({
      from: `${process.env.NEXT_PUBLIC_APP_NAME} <${process.env.EMAIL_FROM}>`,
      to: user.email,
      subject: `You have been invited to ${process.env.NEXT_PUBLIC_APP_NAME}`,
      react: InviteUserEmail({
        invitedByUsername: session.user?.name || "admin",
        username: user.name!,
        userLanguage: language,
      }),
    });

    revalidatePath("/[locale]/(routes)/admin", "page");
    return { data: user };
  } catch (error) {
    console.log("[INVITE_USER]", error);
    return { error: "Failed to invite user" };
  }
};
```

- [ ] **Step 3: Update all other action files**

In each remaining action file, apply the same import transformation:

```typescript
// OLD
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
// ...
const session = await getServerSession(authOptions);

// NEW
import { getSession } from "@/lib/auth-server";
// ...
const session = await getSession();
```

Replace `session.user.isAdmin` with `session.user.role === "admin"` wherever used.

Delete `actions/user/set-new-password.ts` (no password management in new auth).

- [ ] **Step 4: Verify compilation**

Run:
```bash
npx tsc --noEmit 2>&1 | grep -i error | head -20
```

- [ ] **Step 5: Commit**

```bash
git add actions/ "app/[locale]/(routes)/admin/actions/" "app/[locale]/(routes)/profile/actions/"
git commit -m "refactor(auth): update all server actions to better-auth with RBAC"
```

---

### Task 20: Update InviteUser email template (remove password)

**Files:**
- Modify: `emails/InviteUser.tsx`

- [ ] **Step 1: Remove password from the email template**

Update `emails/InviteUser.tsx` — remove the `invitedUserPassword` prop and the password display section. The email should now say "Sign in using your email address" instead of showing a password:

Change the interface:
```typescript
interface VercelInviteUserEmailProps {
  username: string;
  invitedByUsername: string;
  userLanguage: string;
}
```

Replace the password text section (lines 74-83) with:
```tsx
<Text className="text-black text-sm leading-[24px]">
  {userLanguage === "en"
    ? `To accept this invitation, click the button below and sign in with your email address.`
    : `Pro přijetí této pozvánky klikněte na tlačítko níže a přihlaste se pomocí své e-mailové adresy.`}
</Text>
```

- [ ] **Step 2: Commit**

```bash
git add emails/InviteUser.tsx
git commit -m "refactor(auth): remove password from invite email template"
```

---

### Task 21: Update admin user management UI for RBAC

**Files:**
- Modify: `app/[locale]/(routes)/admin/users/table-components/columns.tsx`
- Modify: `app/[locale]/(routes)/admin/users/table-data/schema.tsx`
- Modify: `app/[locale]/(routes)/admin/users/table-data/data.tsx`
- Modify: `app/[locale]/(routes)/admin/users/table-components/data-table-toolbar.tsx`
- Modify: `app/[locale]/(routes)/admin/users/components/IviteForm.tsx`
- Modify: `app/[locale]/(routes)/components/app-sidebar.tsx`
- Modify: `app/[locale]/(routes)/components/menu-items/Administration.tsx`

- [ ] **Step 1: Update the user table columns to show role instead of is_admin/is_account_admin**

In `columns.tsx`, replace the `is_admin` and `is_account_admin` column definitions with a single `role` column. Add a role change dropdown in the row actions.

In `schema.tsx`, update the data schema to include `role` field instead of `is_admin`/`is_account_admin`.

In `data.tsx`, update filter options to use roles instead of admin flags.

- [ ] **Step 2: Update sidebar and admin menu to check role instead of isAdmin**

In `app-sidebar.tsx` and `Administration.tsx`, replace:
```typescript
session.user.isAdmin
```
with:
```typescript
session.user.role === "admin"
```

- [ ] **Step 3: Verify compilation**

Run:
```bash
npx tsc --noEmit 2>&1 | grep -i error | head -20
```

- [ ] **Step 4: Commit**

```bash
git add "app/[locale]/(routes)/admin/users/" "app/[locale]/(routes)/components/"
git commit -m "feat(auth): update admin UI with role dropdown replacing admin flags"
```

---

### Task 22: Update remaining isAdmin references across the codebase

**Files (47 files reference is_admin or isAdmin):**
- Modify: `actions/reports/users.ts`
- Modify: `actions/crm/audit-log/get-audit-log-admin.ts`
- Modify: `actions/crm/opportunity/dashboard/set-inactive.ts`
- Modify: `actions/crm/opportunities/restore-opportunity.ts`
- Modify: `actions/crm/leads/restore-lead.ts`
- Modify: `actions/crm/contracts/restore-contract/index.ts`
- Modify: `actions/crm/contacts/restore-contact.ts`
- Modify: `actions/crm/accounts/restore-account.ts`
- Modify: `components/crm/audit-log/Timeline.tsx`
- Modify: `components/crm/audit-log/AdminTable.tsx`
- Modify: `lib/auth-guards.ts`
- Modify: `prisma/seeds/seed.ts`
- Modify: `types/types.d.ts`
- Modify: `scripts/validation/table-schema.ts`
- Modify: `scripts/migration/transformers/users-transformer.ts`

- [ ] **Step 1: Find and replace isAdmin with role-based checks**

For each file, apply the appropriate transformation:

**Server actions** (restore-*, set-inactive, get-audit-log-admin):
```typescript
// OLD
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
const session = await getServerSession(authOptions);
if (!session?.user?.isAdmin) ...

// NEW
import { getSession } from "@/lib/auth-server";
const session = await getSession();
if (session?.user?.role !== "admin") ...
```

**Prisma queries** that filter by `is_admin: true`:
```typescript
// OLD
where: { is_admin: true }
// NEW
where: { role: "admin" }
```

**Client components** receiving `isAdmin` prop:
Update prop types from `isAdmin: boolean` to `role: string` and check `role === "admin"`.

**lib/auth-guards.ts**: Update guard functions to use `role` field.

**Seed file** (`prisma/seeds/seed.ts`): Update seed data to include `role: "admin"` instead of `is_admin: true`.

- [ ] **Step 2: Verify no remaining next-auth imports**

Run:
```bash
grep -r "next-auth" --include="*.ts" --include="*.tsx" -l
```
Expected: No results (or only in `node_modules/`).

- [ ] **Step 3: Verify no remaining getServerSession calls**

Run:
```bash
grep -r "getServerSession" --include="*.ts" --include="*.tsx" -l
```
Expected: No results.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor(auth): replace all isAdmin/is_admin references with role-based checks"
```

---

### Task 23: Update environment variables

**Files:**
- Modify: `.env.example`

- [ ] **Step 1: Update .env.example**

Replace the auth-related environment variables:

```bash
# Better Auth
BETTER_AUTH_SECRET="generate-with-openssl-rand-base64-32"
BETTER_AUTH_URL="http://localhost:3000"

# Google OAuth
GOOGLE_ID="your-google-client-id"
GOOGLE_SECRET="your-google-client-secret"

# Email (Resend)
RESEND_API_KEY="your-resend-api-key"
EMAIL_FROM="no-reply@example.com"
```

Remove the old variables:
```bash
# Remove these:
# NEXTAUTH_URL
# NEXTAUTH_SECRET
# JWT_SECRET
# GITHUB_ID
# GITHUB_SECRET
```

- [ ] **Step 2: Commit**

```bash
git add .env.example
git commit -m "chore: update .env.example for better-auth migration"
```

---

### Task 24: Full compilation and smoke test

**Files:** None (verification only)

- [ ] **Step 1: Run full TypeScript compilation**

Run:
```bash
npx tsc --noEmit
```
Expected: Zero errors.

- [ ] **Step 2: Run Prisma generate**

Run:
```bash
npx prisma generate
```
Expected: Success.

- [ ] **Step 3: Start the dev server**

Run:
```bash
npm run dev
```
Expected: Server starts without errors.

- [ ] **Step 4: Test sign-in page loads**

Open `http://localhost:3000/sign-in` — should show Google button and email OTP form. No password fields.

- [ ] **Step 5: Test Google OAuth flow**

Click "Continue with Google" — should redirect to Google consent, then back to the app.

- [ ] **Step 6: Test Email OTP flow**

Enter an email, receive OTP via Resend, enter code — should sign in.

- [ ] **Step 7: Test PENDING user flow (non-demo)**

Sign up with a new email. Verify:
- User created with `PENDING` status
- Redirected to `/pending` page
- Admin receives notification email

- [ ] **Step 8: Test admin panel**

Log in as admin. Navigate to admin users page. Verify:
- Role dropdown shows instead of admin toggle
- Can change user roles
- Can activate/deactivate users

- [ ] **Step 9: Test sign-out**

Click sign out. Verify:
- Redirected to `/sign-in`
- Accessing protected routes redirects to `/sign-in`
- Session row deleted from database

- [ ] **Step 10: Commit any fixes**

```bash
git add -A
git commit -m "fix(auth): address smoke test findings"
```

---

### Task 25: Run security audit checklist

**Files:** None (verification only)

Follow the complete security audit checklist from the design spec (Section 9). For each item:

- [ ] **Step 1: Verify no password login paths remain**

Run:
```bash
grep -r "password" --include="*.tsx" --include="*.ts" -l | grep -v node_modules | grep -v ".prisma" | grep -v "scripts/"
```
Review every result — ensure no login/auth flow uses passwords.

- [ ] **Step 2: Verify all routes have auth checks**

Run:
```bash
grep -rL "getSession\|auth.api.getSession" app/\[locale\]/\(routes\)/ --include="*.tsx" --include="*.ts"
```
Review any files WITHOUT auth checks — they should be either non-page files (components, utils) or intentionally public.

- [ ] **Step 3: Verify all API routes have auth checks**

Run:
```bash
for f in $(find app/api -name "route.ts" | grep -v "auth/\[...all\]" | grep -v "__"); do
  if ! grep -q "getSession" "$f"; then
    echo "NO AUTH CHECK: $f"
  fi
done
```
Review any flagged routes — they should be intentionally public (webhooks, etc.).

- [ ] **Step 4: Verify admin routes check role**

Run:
```bash
grep -r "role.*admin" --include="*.ts" --include="*.tsx" -l | head -20
```
Cross-reference with the admin-only paths in `proxy.ts`.

- [ ] **Step 5: Verify old next-auth cookies are not relied upon**

Search for any references to `next-auth.session-token` or `next-auth.csrf-token`:
```bash
grep -r "next-auth" --include="*.ts" --include="*.tsx" -l | grep -v node_modules
```
Expected: No results.

- [ ] **Step 6: Document findings and commit**

If any security issues found, fix them immediately and commit:
```bash
git add -A
git commit -m "security(auth): address audit findings"
```

---

### Task 26: Write per-instance deployment runbook

**Files:**
- Create: `docs/deployment/better-auth-migration-runbook.md`

- [ ] **Step 1: Write the deployment runbook**

Create `docs/deployment/better-auth-migration-runbook.md`:

```markdown
# Better-Auth Migration Runbook

## Pre-Migration Checklist
- [ ] Announce maintenance window to users (minimum 1 hour notice)
- [ ] Verify `BETTER_AUTH_SECRET` generated: `openssl rand -base64 32`
- [ ] Verify `BETTER_AUTH_URL` set to instance URL
- [ ] Verify `GOOGLE_ID` and `GOOGLE_SECRET` configured
- [ ] Verify `RESEND_API_KEY` and `EMAIL_FROM` configured
- [ ] Remove `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `JWT_SECRET`, `GITHUB_ID`, `GITHUB_SECRET`
- [ ] Database backup taken

## Migration Steps
1. Enable maintenance mode
2. Deploy new code
3. Run database migration: `npx prisma migrate deploy`
4. Run role backfill: `npx tsx scripts/migration/backfill-roles.ts`
5. Verify: `curl -I https://<instance>/api/auth/ok` (should return 200)
6. Disable maintenance mode
7. Test sign-in flow manually

## Rollback Procedure
1. Enable maintenance mode
2. Revert to previous code deploy
3. Old auth columns (`password`, `is_admin`, `is_account_admin`) are intact
4. New tables (`session`, `account`, `verification`) are harmless
5. Disable maintenance mode
6. Users log in with old credentials

## Post-Migration Verification
- [ ] Admin can sign in via Google
- [ ] Non-admin can sign in via Email OTP
- [ ] PENDING flow works (new user → pending → admin approves → active)
- [ ] Sign-out invalidates session
- [ ] Protected routes redirect unauthenticated users
- [ ] Admin panel shows role dropdown

## Instance Rollout Order
1. Lowest-risk instance first
2. Monitor for 24-48 hours
3. Proceed to next instance
4. After all instances stable: schedule cleanup PR
```

- [ ] **Step 2: Commit**

```bash
git add docs/deployment/better-auth-migration-runbook.md
git commit -m "docs: add better-auth migration deployment runbook"
```
