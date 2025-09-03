# Phase 8.1: Enhanced Middleware Security Implementation

**Priority:** CRITICAL - HIGHEST PRIORITY  
**Estimated Time:** 1.5-2 hours (reduced - using existing validator)  
**Dependencies:** None  
**Status:** NOT STARTED

---

## Overview

Implement server-side security validation in company layout components with URL [cid] validation. Since PrismaAdapter stores sessions in database, validation must occur in server components that can access the database, not in Edge Runtime middleware.

## Purpose

- **Primary Goal**: Make URL `[cid]` the authoritative source of truth for company context
- **Security Goal**: Prevent URL manipulation attacks by validating against session data
- **Audit Goal**: Log all company access attempts with security risk assessment

## Key Security Benefits

✅ **Eliminates Middleware Security Gap completely**  
✅ **Solves Session vs URL Company ID Mismatch**  
✅ **Prevents URL manipulation attacks**  
✅ **Creates comprehensive audit trail**

---

## Implementation Steps

### Step 1: Backup Current Middleware (5 minutes)
```bash
# Backup existing middleware
cp middleware.ts middleware.ts.backup
```

### Step 2: Install Required Dependencies (10 minutes)
Verify Next-Auth integration for async middleware:
```bash
# Check if auth() function is available for middleware
# May need to update Next-Auth configuration
```

### Step 3: Keep Current Middleware + Add Layout Security (60 minutes)

**🚨 CRITICAL CORRECTION:** With PrismaAdapter + database sessions, middleware cannot access session data in Edge Runtime. Security validation must happen in server components.

**File to modify:** `middleware.ts` - **KEEP CURRENT IMPLEMENTATION**

Your current middleware is architecturally correct:
- ✅ URL format validation in Edge Runtime
- ✅ Company ID header passing
- ✅ Delegates validation to server components

**Add Layout-Level Security:**

**File:** `app/(app)/[cid]/layout.tsx`

```typescript
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { signOut } from "next-auth/react";

interface CompanyLayoutProps {
  children: React.ReactNode;
  params: Promise<{ cid: string }>;
}

export default async function CompanyLayout({ 
  children, 
  params 
}: CompanyLayoutProps) {
  const { cid } = await params;
  
  // 🔒 SERVER-SIDE SECURITY VALIDATION
  const session = await auth();
  
  if (!session?.user) {
    redirect("/auth/signin");
  }

  // 🚨 CRITICAL: URL [cid] vs Session activeCompanyId validation
  if (session.user.activeCompanyId !== cid) {
    console.warn("SECURITY: Company context mismatch detected", {
      userId: session.user.id,
      urlCompany: cid,
      sessionCompany: session.user.activeCompanyId,
      timestamp: new Date().toISOString(),
    });

    // Force logout via server action
    redirect("/api/auth/force-logout?reason=company-mismatch");
  }

  // 🔒 ADDITIONAL: User membership verification
  // Note: This requires fetching fresh membership data
  const hasAccess = await validateUserCompanyAccess(session.user.id, cid);
  
  if (!hasAccess) {
    console.error("SECURITY: Unauthorized company access attempt", {
      userId: session.user.id,
      email: session.user.email,
      attemptedCompany: cid,
      timestamp: new Date().toISOString(),
    });

    redirect("/api/auth/force-logout?reason=unauthorized-company");
  }

  return <>{children}</>;
}

// Note: Using existing lib/security/company-access-validator.ts
// No helper functions needed - comprehensive validation already implemented
```

**Create Force Logout API Route:**

**File:** `app/api/auth/force-logout/route.ts` (new file)

```typescript
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const reason = searchParams.get("reason");
  
  // Log security event
  console.error("SECURITY: Forced logout executed", {
    reason,
    timestamp: new Date().toISOString(),
    userAgent: request.headers.get("user-agent"),
  });

  // Clear all session cookies
  const cookieStore = cookies();
  cookieStore.delete("next-auth.session-token");
  cookieStore.delete("__Secure-next-auth.session-token");
  cookieStore.delete("next-auth.csrf-token");
  cookieStore.delete("__Host-next-auth.csrf-token");

  // Redirect to sign in
  return NextResponse.redirect(new URL("/auth/signin", request.url));
}
```

### Step 4: Use Existing Security Validator (15 minutes)

**🚨 CORRECTION:** Use the existing `lib/security/company-access-validator.ts` instead of creating duplicate code!

**File:** `app/(app)/[cid]/layout.tsx` - Update imports and validation:

```typescript
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { validateCompanyAccess } from "@/lib/security/company-access-validator";

interface CompanyLayoutProps {
  children: React.ReactNode;
  params: Promise<{ cid: string }>;
}

export default async function CompanyLayout({ 
  children, 
  params 
}: CompanyLayoutProps) {
  const { cid } = await params;
  
  // 🔒 SERVER-SIDE SECURITY VALIDATION
  const session = await auth();
  
  if (!session?.user) {
    redirect("/auth/signin");
  }

  // 🚨 CRITICAL: URL [cid] vs Session activeCompanyId validation
  if (session.user.activeCompanyId !== cid) {
    console.warn("SECURITY: Company context mismatch detected", {
      userId: session.user.id,
      urlCompany: cid,
      sessionCompany: session.user.activeCompanyId,
      timestamp: new Date().toISOString(),
    });

    // Force logout via server action
    redirect("/api/auth/force-logout?reason=company-mismatch");
  }

  // 🔒 ADDITIONAL: Use existing company access validator with audit logging
  const validation = await validateCompanyAccess(
    session.user.id,
    cid,
    "board", // Resource type for company access
    undefined, // No specific resource ID
    "access" // Action type
  );
  
  if (!validation.isAuthorized) {
    console.error("SECURITY: Company access validation failed", {
      userId: session.user.id,
      email: session.user.email,
      attemptedCompany: cid,
      error: validation.error,
      auditLog: validation.auditLog,
      timestamp: new Date().toISOString(),
    });

    redirect("/api/auth/force-logout?reason=unauthorized-company");
  }

  return <>{children}</>;
}
```

### Step 5: Test Layout Security Implementation (30 minutes)

**Test Cases:**
1. **Valid Access Test**
   - Login with valid user
   - Navigate to `/validCompanyId/dashboard`
   - Should work normally

2. **Company Mismatch Test**
   - Login with Company A active
   - Try to navigate to `/companyB/dashboard`
   - Should be logged out immediately

3. **URL Manipulation Test**
   - Login normally
   - Manually change URL to unauthorized company
   - Should be logged out immediately

4. **No Session Test**
   - Access company route without login
   - Should redirect to `/auth/signin`

### Step 5: Monitor Security Logs (15 minutes)

Check console/logs for security events:
```bash
# Watch for security warnings
tail -f logs/application.log | grep "SECURITY:"
```

Expected log patterns:
- `SECURITY: URL/Session company mismatch detected`
- `SECURITY: Unauthorized company access attempt`

---

## Validation Checklist

- [ ] Layout security validation compiles without errors
- [ ] Valid company access works normally
- [ ] URL manipulation attempts trigger forced logout
- [ ] Session/URL mismatch attempts trigger forced logout
- [ ] Security events are logged properly
- [ ] Force logout API route clears session cookies
- [ ] Public routes remain accessible (middleware unchanged)
- [ ] API routes remain accessible (middleware unchanged)
- [ ] Existing company access validator works correctly
- [ ] Security audit logs are created for access attempts
- [ ] Layout redirects work properly on security violations

---

## Files Modified

- `app/(app)/[cid]/layout.tsx` - Add server-side company validation using existing security validator
- `app/api/auth/force-logout/route.ts` - New API route for security logout
- `middleware.ts` - **NO CHANGES** (current implementation is correct)
- `lib/security/company-access-validator.ts` - **NO CHANGES** (existing validator used)

## Security Impact

**BEFORE:** Users could manipulate URLs to access any company data  
**AFTER:** All company access attempts validated using existing security framework with:
- ✅ **Comprehensive audit logging** to `securityAuditLog` table
- ✅ **Risk assessment** (low/high) for each access attempt
- ✅ **Detailed violation tracking** with timestamps and user context
- ✅ **Forced logout** on security violations

## Performance Considerations

- **Layout-level validation**: Adds ~50-100ms per page load (not per request)
- **Database queries**: One validation query per company route access
- **Memory impact**: Minimal (server component validation)
- **Caching**: Can be optimized with Next.js caching strategies

## Rollback Plan

If layout security causes issues:
1. Remove security validation from `app/(app)/[cid]/layout.tsx`
2. Delete `app/api/auth/force-logout/route.ts`
3. Existing `lib/security/company-access-validator.ts` remains unchanged
4. Middleware remains unchanged (no backup needed)

---

## Next Steps

After completing this phase:
1. **Test thoroughly** with multiple user accounts
2. **Monitor security logs** for false positives
3. **Proceed to Phase8-02** (Dashboard Server Actions)
4. **Update company switching flow** in Phase8-04

## Success Criteria

✅ **No URL manipulation attacks possible**  
✅ **All company context mismatches logged and blocked**  
✅ **Performance impact acceptable (<100ms per request)**  
✅ **Zero false positive logouts for valid users**

---

**⚠️ CRITICAL NOTE:** This middleware is the foundation for all other security fixes. Do not proceed with other phases until this is working correctly.