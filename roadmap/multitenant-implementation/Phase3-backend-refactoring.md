# Phase 3: Backend Refactoring & Authorization

## 1. Objective

The objective of this phase is to refactor the entire backend to be "company-aware." This involves deeply integrating the concept of the `activeCompanyId` into the application's core logic, from the user's session to every single database query. This phase is the most critical for enforcing the security and data isolation promised by the new multi-tenant architecture.

## 2. Technical Implementation Details

### 2.1. Update Authentication & Session Management

**File to Modify**: `auth.ts` and `types/next-auth.d.ts`

**Goal:** Augment the user's session object (`Session`) to carry all necessary multi-tenancy context on every request.

**Instructions:**

1.  **Update `next-auth.d.ts`**: Modify the `Session` and `User` interfaces to include the new fields.

    ```typescript
    import { CompanyMembership, CompanyRole } from "@prisma/client"; // Adjust import path

    declare module "next-auth" {
      interface Session {
        user: {
          id: string;
          activeCompanyId: string;
          activeCompanyRole: CompanyRole;
          memberships: Array<{
            companyId: string;
            companyName: string;
            role: CompanyRole;
          }>;
        } & DefaultSession["user"];
      }
    }
    ```

2.  **Update `auth.ts`**: Modify the `session` and `jwt` callbacks in your NextAuth configuration.

    ```typescript
    // In your NextAuth config (auth.ts)
    callbacks: {
      async session({ session, token }) {
        if (token.sub && session.user) {
          session.user.id = token.sub;
          session.user.activeCompanyId = token.activeCompanyId as string;
          session.user.activeCompanyRole = token.activeCompanyRole as CompanyRole;
          session.user.memberships = token.memberships as any; // Cast as needed
        }
        return session;
      },
      async jwt({ token, user }) {
        // On initial sign in
        if (user) {
          const memberships = await db.companyMembership.findMany({
            where: { userId: user.id },
            include: { company: true },
          });

          if (memberships.length > 0) {
            // Default to the first/oldest membership on login
            token.activeCompanyId = memberships[0].companyId;
            token.activeCompanyRole = memberships[0].role;
            token.memberships = memberships.map(m => ({
              companyId: m.companyId,
              companyName: m.company.name,
              role: m.role,
            }));
          }
        }
        return token;
      },
    },
    ```

### 2.2. Implement Centralized Authorization Middleware

**File to Modify**: `middleware.ts`

**Goal:** Create a security checkpoint that validates the user's company context from their URL and session, preventing them from accessing data outside their active company.

**Instructions:**
Update the main middleware function to extract the `cid` from the URL and compare it against the `activeCompanyId` in the user's session token. If they don't match, redirect the user to the correct URL for their active session.

```typescript
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request });

  if (token && request.nextUrl.pathname.startsWith("/app/")) {
    const urlCompanyId = request.nextUrl.pathname.split("/")[2];
    const sessionCompanyId = token.activeCompanyId;

    if (urlCompanyId && sessionCompanyId && urlCompanyId !== sessionCompanyId) {
      // The company ID in the URL does not match the active company in the session.
      // Redirect to the correct URL for their active session.
      const newPathname = request.nextUrl.pathname.replace(
        urlCompanyId,
        sessionCompanyId as string
      );
      return NextResponse.redirect(new URL(newPathname, request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*"],
};
```

### 2.3. Refactor All Server Actions & Data Access Logic

**Files to Modify**: All files within `actions/` and `app/api/`.

**Goal:** Eradicate all existing data queries and replace them with new, secure queries that are explicitly filtered by the user's `activeCompanyId`. This is a painstaking but essential process.

**General Strategy for each file/function:**

1.  **Get Session**: At the beginning of each server action or API route, get the authenticated session to access `session.user.activeCompanyId`.
2.  **Check for Session**: If the session is null, throw an authentication error.
3.  **Rewrite Prisma Queries**: Modify every Prisma call (`findFirst`, `findMany`, `update`, `delete`, etc.) to include a `where` clause that traverses the relationship up to the `Board` and filters by `companyId`.

**Example: Refactoring `getBoard`**

**Before:**

```typescript
export async function getBoard(boardId: string) {
  return await db.board.findUnique({
    where: { id: boardId },
    // ... includes
  });
}
```

**After:**

```typescript
export async function getBoard(boardId: string) {
  const session = await auth();
  if (!session?.user?.activeCompanyId) {
    throw new Error("Not authenticated");
  }

  return await db.board.findFirst({
    where: {
      id: boardId,
      companyId: session.user.activeCompanyId, // <-- CRITICAL SECURITY CHECK
    },
    // ... includes
  });
}
```

**Example: Refactoring `getTask`**

**Before:**

```typescript
export async function getTask(taskId: string) {
  return await db.task.findUnique({
    where: { id: taskId },
    // ... includes
  });
}
```

**After:**

```typescript
export async function getTask(taskId: string) {
  const session = await auth();
  if (!session?.user?.activeCompanyId) {
    throw new Error("Not authenticated");
  }

  return await db.task.findFirst({
    where: {
      id: taskId,
      // Traverse the relationship to enforce tenancy
      boardSection: {
        board: {
          companyId: session.user.activeCompanyId, // <-- CRITICAL SECURITY CHECK
        },
      },
    },
    // ... includes
  });
}
```

### 2.4. Implement New Company Management Server Actions

**File to Create**: `actions/company-actions.ts`

**Goal:** Create the new server actions defined in the implementation plan for managing company memberships and switching context.

**Instructions:**
Create the new file and implement the functions. Each function must start with an auth check.

```typescript
"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { CompanyRole } from "@prisma/client";
import { revalidatePath } from "next/cache";

// Example: switchActiveCompany
export async function switchActiveCompany(companyId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

  // Verify the user is actually a member of the company they're trying to switch to.
  const membership = await db.companyMembership.findUnique({
    where: {
      companyId_userId: {
        companyId: companyId,
        userId: session.user.id,
      },
    },
  });

  if (!membership) {
    throw new Error("Access denied: User is not a member of this company.");
  }

  // NOTE: This part is complex. Updating the live session token requires
  // specific logic with your auth provider (e.g., using auth().update).
  // For simplicity, a common pattern is to set a secure, httpOnly cookie
  // with the new activeCompanyId and have the JWT callback read from it.
  // Then, revalidate paths to trigger re-fetching.

  // A full implementation requires modifying the JWT callback to prioritize
  // a "switched-to-company-id" cookie over its existing token value.

  console.log(`User ${session.user.id} switching to company ${companyId}`);
  // In a real implementation, you would update the session token here.

  revalidatePath("/", "layout"); // Revalidate all data
}

// ... Implement other actions: inviteUser, acceptInvitation, etc.
// Remember to check for ADMIN/OWNER roles where necessary.
```

## 4. Definition of Done

- The NextAuth.js session is successfully updated to contain `activeCompanyId`, `activeCompanyRole`, and `memberships`.
- The middleware is implemented and correctly redirects users who access a URL with a mismatched company ID.
- **Every single data access function** in the `actions/` and `app/api/` directories has been refactored to include a `companyId` check in its database queries.
- The new `actions/company-actions.ts` file is created with the necessary server actions for company management.
- The application builds and runs without errors after these changes.
