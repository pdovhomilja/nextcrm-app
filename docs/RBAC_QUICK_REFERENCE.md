# RBAC Quick Reference Guide

**Purpose:** Quick lookup for developers implementing RBAC
**Status:** RBAC Audit Complete
**Date:** November 4, 2025

---

## Role Quick Reference

| Role | Can Read | Can Write | Can Delete | Can Manage Team | Can Access Billing |
|------|----------|-----------|------------|-----------------|-------------------|
| **OWNER** | ✓ | ✓ | ✓ | ✓ | ✓ |
| **ADMIN** | ✓ | ✓ | ✓ | ✓ | ✗ |
| **MEMBER** | ✓ | ✓ | ✓ own | ✗ | ✗ |
| **VIEWER** | ✓ | ✗ | ✗ | ✗ | ✗ |

---

## Common Permission Checks

### Reading Data
```typescript
// Any logged-in member in the organization can read
// Just verify: organizationId match
```

### Creating Items
```typescript
import { checkWritePermission } from "@/lib/permission-helpers";

const check = await checkWritePermission(userId, orgId);
if (!check.allowed) return forbiddenResponse(check);
```

### Updating Items
```typescript
import { checkWritePermission } from "@/lib/permission-helpers";

const check = await checkWritePermission(userId, orgId);
if (!check.allowed) return forbiddenResponse(check);
```

### Deleting Own Items (MEMBER+)
```typescript
import { canModifyResource } from "@/lib/permission-helpers";

const check = await canModifyResource(
  userId,
  orgId,
  resourceId,
  "crm_Accounts",
  "delete"
);
if (!check.allowed) return forbiddenResponse(check);
```

### Team Management
```typescript
import { checkManageMembersPermission } from "@/lib/permission-helpers";

const check = await checkManageMembersPermission(userId, orgId);
if (!check.allowed) return forbiddenResponse(check);
```

### Billing Access (OWNER ONLY)
```typescript
import { checkBillingAccess } from "@/lib/permission-helpers";

const check = await checkBillingAccess(userId, orgId);
if (!check.allowed) return forbiddenResponse(check);
```

---

## Critical Vulnerabilities to Fix Immediately

| Route | Issue | Fix |
|-------|-------|-----|
| POST /api/billing/* | No role check | Add OWNER check |
| GET /api/organization/export-data | No role check | Add ADMIN check |
| GET /api/organization/audit-logs | No role check | Add ADMIN check |
| All CRM DELETE | No ownership check | Add canModifyResource() check |

---

## Implementation Checklist

For each new API route:

```
□ Authentication check (session exists)
□ Organization verification (user in same org)
□ Permission check (appropriate level)
□ Ownership check (for delete/update)
□ Input validation
□ Database operation
□ Audit logging (if sensitive)
□ Error response
□ Test with all roles
```

---

## Error Response Template

```typescript
import { createPermissionDeniedResponse } from "@/lib/permission-helpers";

const result = await checkWritePermission(userId, orgId);
if (!result.allowed) {
  return NextResponse.json(
    createPermissionDeniedResponse(result),
    { status: 403 }
  );
}
```

---

## Testing Checklist

```
For each API route:
□ Test VIEWER role → 403 (if write/delete/admin)
□ Test MEMBER role → 200 (for allowed ops)
□ Test ADMIN role → 200 (for all ops)
□ Test OWNER role → 200 (for all ops)
□ Test MEMBER deleting others' items → 403
□ Test ADMIN deleting others' items → 200
□ Test cross-org access → 403 always
```

---

## Most Common Mistakes

1. **Forgetting permission check**
   ```typescript
   // ❌ WRONG - Only checks session
   if (!session) return Unauthorized
   // ✓ CORRECT - Checks permission
   const check = await checkWritePermission(user.id, orgId)
   ```

2. **Trusting frontend validation**
   ```typescript
   // ❌ WRONG - Relies on frontend
   // ✓ CORRECT - Always validate on backend
   const check = await checkWritePermission(user.id, orgId)
   ```

3. **Missing ownership check on delete**
   ```typescript
   // ❌ WRONG - MEMBER can delete anyone's resource
   if (resource.organizationId !== orgId) return Forbidden

   // ✓ CORRECT - MEMBER can only delete own
   const check = await canModifyResource(user.id, orgId, id, "crm_Accounts", "delete")
   ```

4. **Not logging permission denials**
   ```typescript
   // ❌ WRONG - No audit trail
   if (!check.allowed) return Forbidden

   // ✓ CORRECT - Logged automatically by helper functions
   ```

5. **Wrong error status code**
   ```typescript
   // ❌ WRONG - Should be 403 Forbidden
   return NextResponse.json({error: "No access"}, {status: 400})

   // ✓ CORRECT - 403 for permission denied
   return NextResponse.json({error: "Forbidden"}, {status: 403})
   ```

---

## Permission Helper Functions

| Function | Use For | Returns |
|----------|---------|---------|
| `checkReadPermission()` | Verify read access | PermissionCheckResult |
| `checkWritePermission()` | Verify create/update access | PermissionCheckResult |
| `checkDeletePermission()` | Verify delete access | PermissionCheckResult |
| `checkManageMembersPermission()` | Verify admin team ops | PermissionCheckResult |
| `checkManageRolesPermission()` | Verify owner role ops | PermissionCheckResult |
| `checkManageSettingsPermission()` | Verify admin settings | PermissionCheckResult |
| `checkBillingAccess()` | Verify billing access | PermissionCheckResult |
| `checkDeleteOrganizationPermission()` | Verify org deletion | PermissionCheckResult |
| `canModifyResource()` | Verify resource ownership | PermissionCheckResult |
| `createPermissionDeniedResponse()` | Format error response | Object |

---

## API Route Protection Status

### Fully Protected ✓
- GET /api/organization
- POST /api/organization
- Organization member management
- Team invitations
- CRM reads
- Project reads

### Needs Protection ❌
- All CRM POST/PUT/DELETE
- All Project POST/PUT/DELETE
- All Document operations
- All Invoice operations
- Billing routes
- Organization export/audit-logs

---

## Deployment Safeguards

```typescript
// Use feature flag during rollout
if (process.env.ENABLE_RBAC_ENFORCEMENT === "false") {
  // Skip permission checks (temporarily during rollout)
  console.warn("RBAC enforcement disabled - security risk!")
} else {
  // Enforce permissions
  const check = await checkWritePermission(user.id, orgId)
  if (!check.allowed) return forbiddenResponse(check)
}
```

---

## Where to Find What

| Need | Location |
|------|----------|
| Permission definitions | `lib/permissions.ts` |
| Permission helpers | `lib/permission-helpers.ts` |
| Permission middleware | `middleware/require-permission.ts` |
| Full audit report | `docs/RBAC_AUDIT_REPORT.md` |
| Permission matrix | `docs/PERMISSION_MATRIX.md` |
| Implementation guide | `docs/RBAC_DEVELOPER_GUIDE.md` |
| Implementation status | `docs/RBAC_IMPLEMENTATION_STATUS.md` |

---

## Quick Debugging

```typescript
// Check what role a user has
const user = await prismadb.users.findUnique({
  where: { id: userId },
  select: { organization_role: true }
});
console.log("User role:", user.organization_role);

// Check if permission would pass
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
const allowed = hasPermission(role, PERMISSIONS.WRITE);
console.log("Can write:", allowed);

// Check permission details
const check = await checkWritePermission(userId, orgId);
console.log("Permission check result:", check);
```

---

## Common HTTP Status Codes

| Code | Meaning | When to Use |
|------|---------|------------|
| 401 | Unauthorized | No session/token |
| 403 | Forbidden | Session exists but permission denied |
| 404 | Not Found | Resource doesn't exist (also use for forbidden) |
| 400 | Bad Request | Invalid input data |
| 500 | Internal Error | Server error |

---

## Related Documentation

1. **RBAC_AUDIT_REPORT.md** - Complete vulnerability findings
2. **PERMISSION_MATRIX.md** - Every API route and its protection level
3. **RBAC_DEVELOPER_GUIDE.md** - Detailed implementation instructions
4. **RBAC_IMPLEMENTATION_STATUS.md** - Implementation roadmap

---

## Quick Implementation Template

```typescript
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prismadb } from "@/lib/prisma";
import {
  checkWritePermission,
  createPermissionDeniedResponse,
} from "@/lib/permission-helpers";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return new NextResponse("Unauthenticated", { status: 401 });
  }

  try {
    const body = await req.json();

    const user = await prismadb.users.findUnique({
      where: { email: session.user.email },
    });

    if (!user?.organizationId) {
      return new NextResponse("User organization not found", { status: 401 });
    }

    // CHECK PERMISSION
    const permissionCheck = await checkWritePermission(
      user.id,
      user.organizationId
    );

    if (!permissionCheck.allowed) {
      return NextResponse.json(
        createPermissionDeniedResponse(permissionCheck),
        { status: 403 }
      );
    }

    // CREATE ITEM
    const newItem = await prismadb.crm_Accounts.create({
      data: {
        organizationId: user.organizationId,
        createdBy: user.id,
        ...body,
      },
    });

    return NextResponse.json(newItem);
  } catch (error) {
    console.error("[ROUTE_ERROR]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
```

---

## Key Dates

- **Audit Completed:** November 4, 2025
- **Phase 1 Target:** November 11, 2025 (1 week)
- **Phase 2 Target:** November 18, 2025 (2 weeks)
- **Phase 3 Target:** November 25, 2025 (3 weeks)
- **Phase 4 Target:** December 2, 2025 (4 weeks)
- **Production Deployment:** Mid-December 2025

---

**Questions?** See the full RBAC_DEVELOPER_GUIDE.md or RBAC_AUDIT_REPORT.md

