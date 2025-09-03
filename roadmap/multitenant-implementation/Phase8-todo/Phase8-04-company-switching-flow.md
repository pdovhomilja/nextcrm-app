# Phase 8.4: Company Switching Flow Redesign

**Priority:** HIGH  
**Estimated Time:** 1-2 hours (reduced - using Security-First Wrapper Pattern)  
**Dependencies:** Phase8-01 (Enhanced Middleware)  
**Status:** NOT STARTED

---

## Overview

Redesign the company switching user experience to work seamlessly with the new URL [cid] as primary source of truth architecture. The new middleware requires proper session synchronization before URL navigation.

## Purpose

- **UX Consistency**: Smooth company switching without unexpected logouts
- **Session Sync**: Ensure session.activeCompanyId matches URL [cid] before navigation
- **Error Handling**: Graceful fallbacks when company switching fails
- **User Feedback**: Clear communication during company transitions

## Current vs New Flow

### ❌ Old Flow (Vulnerable):
1. User clicks company in dropdown
2. Frontend immediately navigates to `/newCompany/dashboard`
3. Backend uses session.activeCompanyId (potentially stale)
4. User sees wrong company data

### ✅ New Flow (Secure):
1. User clicks company in dropdown
2. Frontend calls `session.update({ activeCompanyId: newCompanyId })`
3. Wait for session update to complete
4. Frontend navigates to `/newCompanyId/dashboard`
5. Middleware validates URL vs session match
6. If validation passes, user sees correct data
7. If validation fails, user is logged out (security breach detected)

---

## Implementation Steps

### Step 1: Create Company Switching Hook with Security-First Validation (25 minutes)

**File:** `hooks/use-company-switching.ts` (new file)

```typescript
"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export interface CompanySwitchingState {
  isLoading: boolean;
  error: string | null;
  currentCompanyId: string | null;
}

export function useCompanySwitching() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const [state, setState] = useState<CompanySwitchingState>({
    isLoading: false,
    error: null,
    currentCompanyId: session?.user?.activeCompanyId || null,
  });

  const switchCompany = async (newCompanyId: string, redirectPath: string = "/dashboard") => {
    if (state.currentCompanyId === newCompanyId) {
      // Already in target company, just navigate
      router.push(`/${newCompanyId}${redirectPath}`);
      return true;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // 🔒 SECURITY-FIRST VALIDATION: Use existing company validator
      const validateResponse = await fetch('/api/company/validate-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          companyId: newCompanyId,
          action: 'switch'
        }),
      });

      const validation = await validateResponse.json();

      if (!validation.success) {
        setState(prev => ({ ...prev, error: validation.error }));
        toast.error(validation.error || "Access denied to selected company");
        return false;
      }

      // Step 1: Update session with new company (validation passed)
      await update({ activeCompanyId: newCompanyId });

      // Step 2: Wait a brief moment for session to propagate
      await new Promise(resolve => setTimeout(resolve, 100));

      // Step 3: Navigate to new company context
      router.push(`/${newCompanyId}${redirectPath}`);

      // Step 4: Update local state
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        currentCompanyId: newCompanyId 
      }));

      toast.success("Company switched successfully");
      return true;

    } catch (error) {
      console.error("Company switch failed:", error);
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: "Failed to switch company" 
      }));

      toast.error("Failed to switch company. Please try logging in again.");
      
      // Redirect to login on failure
      router.push("/auth/signin");
      return false;
    }
  };

  const getCurrentCompany = () => {
    const currentId = state.currentCompanyId || session?.user?.activeCompanyId;
    return session?.user?.memberships?.find((m: any) => m.companyId === currentId);
  };

  const getAvailableCompanies = () => {
    return session?.user?.memberships || [];
  };

  return {
    ...state,
    switchCompany,
    getCurrentCompany,
    getAvailableCompanies,
  };
}
```

### Step 1.1: Create Company Validation API Route (15 minutes)

**File:** `app/api/company/validate-access/route.ts` (new file)

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { validateCompanyAccess } from "@/lib/security/company-access-validator";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { companyId, action } = await request.json();

  // 🔒 SECURITY-FIRST VALIDATION: Use existing company validator
  const validation = await validateCompanyAccess(
    session.user.id,
    companyId,
    "board",  // Resource type for general company access
    undefined, // No specific resource ID
    action || "access" // Action type
  );

  if (!validation.isAuthorized) {
    return NextResponse.json({
      success: false,
      error: validation.error,
      // Audit log automatically created by validator!
    }, { status: 403 });
  }

  return NextResponse.json({
    success: true,
    message: "Company access validated",
    // Audit log automatically created by validator!
  });
}
```

### Step 2: Update Company Selector Component (60 minutes)

Find the current company selector component (likely in nav or sidebar) and update it:

**Expected file locations:**
- `components/nav-user.tsx`
- `components/app-sidebar.tsx`
- `components/company-selector.tsx`

**Update the component to use the new hook:**

```typescript
"use client";

import { useCompanySwitching } from "@/hooks/use-company-switching";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Building2, Loader2 } from "lucide-react";

export function CompanySelector() {
  const { 
    isLoading, 
    switchCompany, 
    getCurrentCompany, 
    getAvailableCompanies 
  } = useCompanySwitching();

  const currentCompany = getCurrentCompany();
  const availableCompanies = getAvailableCompanies();

  const handleCompanySwitch = async (companyId: string) => {
    await switchCompany(companyId);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="w-full justify-between">
          <div className="flex items-center">
            <Building2 className="mr-2 h-4 w-4" />
            <span className="truncate">
              {currentCompany?.company?.name || "Select Company"}
            </span>
          </div>
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56">
        {availableCompanies.map((membership: any) => (
          <DropdownMenuItem
            key={membership.companyId}
            onClick={() => handleCompanySwitch(membership.companyId)}
            disabled={isLoading}
            className="cursor-pointer"
          >
            <Building2 className="mr-2 h-4 w-4" />
            <div className="flex flex-col">
              <span>{membership.company.name}</span>
              <span className="text-xs text-muted-foreground">
                {membership.role}
              </span>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

### Step 3: Add Loading States to Critical Pages (30 minutes)

Update dashboard and other key pages to show loading states during company switches:

**File:** `app/(app)/[cid]/dashboard/page.tsx`

Add loading handling:

```typescript
import { Suspense } from "react";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";

export default async function DashboardPage({ params }: { params: Promise<{ cid: string }> }) {
  const { cid } = await params;
  
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
      </div>
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent companyId={cid} />
      </Suspense>
    </div>
  );
}

async function DashboardContent({ companyId }: { companyId: string }) {
  // Move all the server actions here
  const [taskMetricsResult, boardMetricsResult] = await Promise.all([
    getTaskMetrics({ companyId }),
    getBoardMetrics({ companyId }),
  ]);

  // ... rest of dashboard content
}
```

**Create dashboard skeleton component:**

**File:** `components/dashboard/dashboard-skeleton.tsx` (new file)

```typescript
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      {/* Metrics cards skeleton */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-[100px]" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-7 w-[60px] mb-1" />
              <Skeleton className="h-3 w-[120px]" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts skeleton */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <Skeleton className="h-5 w-[150px]" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[200px] w-full" />
          </CardContent>
        </Card>
        <Card className="col-span-3">
          <CardHeader>
            <Skeleton className="h-5 w-[120px]" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[200px] w-full" />
          </CardContent>
        </Card>
      </div>

      {/* Table skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-[100px]" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

### Step 4: Update Navigation Links (30 minutes)

Find all navigation components and update them to use current company context:

**Files to check:**
- `components/nav-main.tsx`
- `components/nav-secondary.tsx` 
- `components/app-sidebar.tsx`

**Update navigation links to be company-aware:**

```typescript
"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";

export function NavMain() {
  const { data: session } = useSession();
  const currentCompanyId = session?.user?.activeCompanyId;

  if (!currentCompanyId) {
    return null; // Don't show nav if no company context
  }

  const navItems = [
    {
      title: "Dashboard",
      href: `/${currentCompanyId}/dashboard`,
    },
    {
      title: "Tasks",
      href: `/${currentCompanyId}/tasks`,
    },
    {
      title: "AI Assistant",
      href: `/${currentCompanyId}/ai-assistant-v2`,
    },
    // ... other nav items
  ];

  return (
    <nav className="space-y-2">
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="block px-2 py-1 rounded hover:bg-accent"
        >
          {item.title}
        </Link>
      ))}
    </nav>
  );
}
```

### Step 5: Handle Edge Cases (30 minutes)

**Add error boundaries for company switching failures:**

**File:** `components/company-switch-error-boundary.tsx` (new file)

```typescript
"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

export function CompanySwitchErrorBoundary({ error, reset }: Props) {
  useEffect(() => {
    console.error("Company switch error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
      <AlertCircle className="h-12 w-12 text-destructive" />
      <div className="text-center space-y-2">
        <h2 className="text-lg font-semibold">Company Switch Failed</h2>
        <p className="text-muted-foreground max-w-md">
          There was an issue switching companies. This might be due to a 
          session timeout or access permissions change.
        </p>
      </div>
      <div className="flex space-x-2">
        <Button onClick={reset}>Try Again</Button>
        <Button variant="outline" onClick={() => window.location.href = "/auth/signin"}>
          Sign In Again
        </Button>
      </div>
    </div>
  );
}
```

---

## Testing Steps

### Test 1: Normal Company Switching (15 minutes)
1. Login with user who has access to multiple companies
2. Note current dashboard data
3. Use company selector to switch to different company
4. Verify loading state shows briefly
5. Verify dashboard shows different company's data
6. Check URL matches selected company

### Test 2: Company Switching with Network Issues (10 minutes)
1. Throttle network to simulate slow connection
2. Attempt to switch companies
3. Verify loading state persists until completion
4. Verify graceful error handling if timeout occurs

### Test 3: Rapid Company Switching (10 minutes)
1. Quickly switch between companies multiple times
2. Verify no race conditions or stale data
3. Verify final state matches last selected company

### Test 4: Unauthorized Access Prevention (10 minutes)
1. Remove user from Company B (via database)
2. Try to switch to Company B
3. Verify error message and prevention
4. Verify user remains in accessible company

---

## Validation Checklist

- [ ] Company selector shows loading states during switches
- [ ] Session updates before URL navigation
- [ ] Error handling for failed company switches
- [ ] Navigation links are company-aware
- [ ] Dashboard shows loading skeleton during switches
- [ ] Toast notifications provide user feedback
- [ ] Unauthorized company access is prevented
- [ ] Middleware validation passes after switch
- [ ] No race conditions with rapid switching

---

## Files Modified - ENHANCED with Security-First Validation

1. `hooks/use-company-switching.ts` - **ENHANCED** with Security-First Validation
2. `app/api/company/validate-access/route.ts` - **NEW** API route using existing validator
3. `components/company-selector.tsx` - Updated component (find actual file)
4. `components/dashboard/dashboard-skeleton.tsx` - Loading skeleton for smooth transitions
5. `app/(app)/[cid]/dashboard/page.tsx` - Add Suspense boundaries  
6. `components/nav-main.tsx` - Company-aware navigation
7. Any other navigation components found

## UX Impact - AMPLIFIED

✅ **Smooth company transitions with comprehensive security validation**  
✅ **Automatic audit logging for all company switching attempts**  
✅ **Loading states prevent user confusion during validation**  
✅ **Enhanced error handling with detailed security feedback**  
✅ **Consistent navigation experience with unified security patterns**  
✅ **Security monitoring for suspicious company switching behavior**

## Performance Considerations

- **Session updates add ~100-200ms to company switches**
- **Loading skeletons improve perceived performance**
- **Suspense boundaries prevent entire page re-renders**

## Rollback Plan

If company switching becomes problematic:
1. Revert to direct URL navigation (less secure)
2. Keep middleware validation but add bypass mechanism
3. Gradually re-implement with more testing

## Success Criteria

✅ **Company switching works smoothly without unexpected logouts**  
✅ **Clear user feedback during all company operations**  
✅ **No security vulnerabilities in company switching flow**  
✅ **Graceful error handling for edge cases**

---

**⚠️ IMPORTANT NOTE:** This redesign is essential for user experience with the new security middleware. Test thoroughly with various user scenarios and network conditions.