# RBAC Developer Guide

**Purpose:** Guide developers on implementing role-based access control in NextCRM
**Audience:** Backend developers implementing API routes and server actions
**Last Updated:** November 4, 2025

---

## Quick Start

### 1. For API Routes - Permission Check Pattern

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
    // ... validate input ...

    const user = await prismadb.users.findUnique({
      where: { email: session.user.email },
    });

    if (!user?.organizationId) {
      return new NextResponse("User organization not found", { status: 401 });
    }

    // Check write permission
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

    // Proceed with operation
    const newItem = await prismadb.crm_Accounts.create({
      data: {
        organizationId: user.organizationId,
        createdBy: user.id,
        // ... other fields ...
      },
    });

    return NextResponse.json(newItem);
  } catch (error) {
    console.error("[ROUTE_ERROR]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
```

### 2. For DELETE Operations - Add Ownership Check

```typescript
import { canModifyResource } from "@/lib/permission-helpers";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return new NextResponse("Unauthenticated", { status: 401 });
  }

  try {
    const user = await prismadb.users.findUnique({
      where: { email: session.user.email },
    });

    if (!user?.organizationId) {
      return new NextResponse("User organization not found", { status: 401 });
    }

    // Check if user can delete this specific resource
    const canDelete = await canModifyResource(
      user.id,
      user.organizationId,
      id,
      "crm_Accounts",
      "delete"
    );

    if (!canDelete.allowed) {
      return NextResponse.json(
        createPermissionDeniedResponse(canDelete),
        { status: 403 }
      );
    }

    // Proceed with deletion
    await prismadb.crm_Accounts.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE_ERROR]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
```

### 3. For Admin-Only Operations

```typescript
import { checkManageMembersPermission } from "@/lib/permission-helpers";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return new NextResponse("Unauthenticated", { status: 401 });
  }

  try {
    const user = await prismadb.users.findUnique({
      where: { email: session.user.email },
    });

    if (!user?.organizationId) {
      return new NextResponse("User organization not found", { status: 401 });
    }

    // Check admin permission
    const permissionCheck = await checkManageMembersPermission(
      user.id,
      user.organizationId
    );

    if (!permissionCheck.allowed) {
      return NextResponse.json(
        createPermissionDeniedResponse(permissionCheck),
        { status: 403 }
      );
    }

    // Proceed with admin operation (invite user, etc.)
    // ...

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[ADMIN_OPERATION_ERROR]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
```

### 4. For Owner-Only Operations (Billing)

```typescript
import { checkBillingAccess } from "@/lib/permission-helpers";

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

    // Check OWNER-only permission
    const permissionCheck = await checkBillingAccess(
      user.id,
      user.organizationId
    );

    if (!permissionCheck.allowed) {
      return NextResponse.json(
        createPermissionDeniedResponse(permissionCheck),
        { status: 403 }
      );
    }

    // Proceed with billing operation
    // ...

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[BILLING_ERROR]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
```

### 5. For Server Actions

```typescript
import { checkWritePermission } from "@/lib/permission-helpers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prismadb } from "@/lib/prisma";

export async function createNewAccount(formData: {
  name: string;
  email: string;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return {
      error: "Unauthorized",
      success: false,
    };
  }

  try {
    const user = await prismadb.users.findUnique({
      where: { email: session.user.email },
    });

    if (!user?.organizationId) {
      return {
        error: "User organization not found",
        success: false,
      };
    }

    // Check permission
    const permissionCheck = await checkWritePermission(
      user.id,
      user.organizationId
    );

    if (!permissionCheck.allowed) {
      return {
        error: permissionCheck.reason || "Insufficient permissions",
        success: false,
        code: "INSUFFICIENT_PERMISSIONS",
      };
    }

    // Create the account
    const account = await prismadb.crm_Accounts.create({
      data: {
        organizationId: user.organizationId,
        createdBy: user.id,
        name: formData.name,
        email: formData.email,
      },
    });

    return {
      success: true,
      data: account,
    };
  } catch (error) {
    console.error("[CREATE_ACCOUNT_ERROR]", error);
    return {
      error: "Failed to create account",
      success: false,
    };
  }
}
```

---

## Available Permission Check Functions

### Read Operations

```typescript
// Check if user can read content
checkReadPermission(userId: string, organizationId: string)
→ PermissionCheckResult
```

### Write Operations

```typescript
// Check if user can create/modify content
checkWritePermission(userId: string, organizationId: string)
→ PermissionCheckResult
```

### Delete Operations

```typescript
// Check if user can delete (with optional ownership check)
checkDeletePermission(
  userId: string,
  organizationId: string,
  resourceCreatedBy?: string,
  allowAdminOverride?: boolean
)
→ PermissionCheckResult
```

### Team Management

```typescript
// Check if user can invite/remove members, assign roles
checkManageMembersPermission(userId: string, organizationId: string)
→ PermissionCheckResult

// Check if user can manage roles (OWNER only)
checkManageRolesPermission(userId: string, organizationId: string)
→ PermissionCheckResult
```

### Organization Management

```typescript
// Check if user can manage settings (ADMIN+)
checkManageSettingsPermission(userId: string, organizationId: string)
→ PermissionCheckResult

// Check if user can access billing (OWNER only)
checkBillingAccess(userId: string, organizationId: string)
→ PermissionCheckResult

// Check if user can delete organization (OWNER only)
checkDeleteOrganizationPermission(userId: string, organizationId: string)
→ PermissionCheckResult
```

### Resource-Level Checks

```typescript
// Check if user can modify (update/delete) a specific resource
canModifyResource(
  userId: string,
  organizationId: string,
  resourceId: string,
  resourceModel: "crm_Accounts" | "crm_Leads" | "crm_Contacts" | "crm_Opportunities" | "boards" | "sections" | "tasks",
  operation: "update" | "delete"
)
→ PermissionCheckResult
```

---

## Permission Check Result

All permission check functions return:

```typescript
interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;              // Why permission was denied
  requiredRole?: OrganizationRole;  // Role that would have access
  actualRole?: OrganizationRole;    // User's actual role
}
```

### Usage Pattern

```typescript
const result = await checkWritePermission(userId, orgId);

if (!result.allowed) {
  // Create error response with details
  return NextResponse.json(
    {
      error: "Forbidden",
      message: result.reason,
      requiredRole: result.requiredRole,
      actualRole: result.actualRole,
    },
    { status: 403 }
  );
}

// Proceed with operation
```

---

## Role Hierarchy

```
OWNER (100)  ← Full access
  ↓
ADMIN (50)   ← Manage team & settings
  ↓
MEMBER (10)  ← Create/edit own items
  ↓
VIEWER (5)   ← Read-only access
```

### Permission Grants by Role

| Permission | OWNER | ADMIN | MEMBER | VIEWER |
|-----------|-------|-------|--------|--------|
| READ | ✓ | ✓ | ✓ | ✓ |
| WRITE | ✓ | ✓ | ✓ | ✗ |
| DELETE | ✓ | ✓ | ✓ (own only) | ✗ |
| MANAGE_MEMBERS | ✓ | ✓ | ✗ | ✗ |
| MANAGE_SETTINGS | ✓ | ✓ | ✗ | ✗ |
| MANAGE_BILLING | ✓ | ✗ | ✗ | ✗ |
| MANAGE_ROLES | ✓ | ✗ | ✗ | ✗ |

---

## Common Patterns

### Pattern 1: Simple CRUD with Role Check

```typescript
// POST - Create (MEMBER+)
export async function POST(req: Request) {
  const user = getUser();
  const check = await checkWritePermission(user.id, user.organizationId);
  if (!check.allowed) return forbiddenResponse(check);

  // Create item
}

// PUT - Update (MEMBER+)
export async function PUT(req: Request) {
  const user = getUser();
  const check = await checkWritePermission(user.id, user.organizationId);
  if (!check.allowed) return forbiddenResponse(check);

  // Update item
}

// DELETE - Delete (MEMBER own only, ADMIN any)
export async function DELETE(req: Request) {
  const user = getUser();
  const resource = getResource();
  const check = await canModifyResource(
    user.id,
    user.organizationId,
    resource.id,
    "crm_Accounts",
    "delete"
  );
  if (!check.allowed) return forbiddenResponse(check);

  // Delete item
}
```

### Pattern 2: Admin-Only Operation

```typescript
export async function POST(req: Request) {
  const user = getUser();

  // Check admin permission
  const check = await checkManageMembersPermission(
    user.id,
    user.organizationId
  );

  if (!check.allowed) {
    return NextResponse.json(
      createPermissionDeniedResponse(check),
      { status: 403 }
    );
  }

  // Perform admin operation
}
```

### Pattern 3: Owner-Only Operation

```typescript
export async function POST(req: Request) {
  const user = getUser();

  // Check owner permission
  const check = await checkBillingAccess(user.id, user.organizationId);

  if (!check.allowed) {
    return NextResponse.json(
      createPermissionDeniedResponse(check),
      { status: 403 }
    );
  }

  // Access billing
}
```

---

## Testing Permissions

### Test Case Template

```typescript
describe("CRM Account API - Permissions", () => {
  // VIEWER cannot create
  it("VIEWER role cannot create account", async () => {
    const response = await fetch("/api/crm/account", {
      method: "POST",
      headers: { Authorization: `Bearer ${viewerToken}` },
      body: JSON.stringify({ name: "Test Account" }),
    });

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: "Forbidden",
      code: "INSUFFICIENT_PERMISSIONS",
      requiredRole: "MEMBER",
      actualRole: "VIEWER",
    });
  });

  // MEMBER can create
  it("MEMBER role can create account", async () => {
    const response = await fetch("/api/crm/account", {
      method: "POST",
      headers: { Authorization: `Bearer ${memberToken}` },
      body: JSON.stringify({ name: "Test Account" }),
    });

    expect(response.status).toBe(200);
  });

  // MEMBER cannot delete others' items
  it("MEMBER cannot delete other user's account", async () => {
    const response = await fetch("/api/crm/account/other-account-id", {
      method: "DELETE",
      headers: { Authorization: `Bearer ${memberToken}` },
    });

    expect(response.status).toBe(403);
  });

  // ADMIN can delete any item
  it("ADMIN can delete any account", async () => {
    const response = await fetch("/api/crm/account/other-account-id", {
      method: "DELETE",
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    expect(response.status).toBe(200);
  });
});
```

---

## Audit Logging

All permission checks are automatically logged. To view permission denial events:

```typescript
// Fetch permission denial events
const auditLogs = await prismadb.auditLog.findMany({
  where: {
    organizationId: orgId,
    action: "PERMISSION_DENIED",
  },
  orderBy: { timestamp: "desc" },
  take: 100,
});

// Logs contain:
// - userId: who attempted the action
// - resource: which API endpoint
// - requiredRole: what role was needed
// - actualRole: what role they had
// - ip: their IP address
// - timestamp: when it happened
```

---

## Troubleshooting

### Issue: Permission check always fails

**Check:**
1. Is `organization_role` populated in the session?
2. Is the user actually in the organization?
3. Are you using the correct permission check function?

**Debug:**
```typescript
const user = await prismadb.users.findUnique({
  where: { id: userId },
  select: {
    organizationId: true,
    organization_role: true,
  },
});

console.log("User org:", user.organizationId);
console.log("User role:", user.organization_role);
```

### Issue: Can't access resource that should be allowed

**Check:**
1. Is the resource in the same organization?
2. For MEMBER delete, is the user the creator?
3. Have you passed the `allowAdminOverride` parameter correctly?

**Debug:**
```typescript
const resource = await prismadb.crm_Accounts.findUnique({
  where: { id: resourceId },
  select: {
    organizationId: true,
    createdBy: true,
  },
});

console.log("Resource org:", resource.organizationId);
console.log("Resource creator:", resource.createdBy);
console.log("Requesting user:", userId);
```

### Issue: Different behavior in dev vs production

**Check:**
1. Are environment variables set correctly?
2. Is the database populated with correct roles?
3. Are you testing with the same user data?

---

## Best Practices

### DO:
- ✓ Check permissions on EVERY sensitive operation
- ✓ Use the helper functions - don't check `organization_role` manually
- ✓ Include permission checks in Server Actions
- ✓ Log permission denials for security monitoring
- ✓ Test with different roles before deploying
- ✓ Return clear error messages to frontend
- ✓ Verify organization membership before operations

### DON'T:
- ✗ Trust the frontend permission validation
- ✗ Skip permission checks for "internal" endpoints
- ✗ Assume a route is protected without verification
- ✗ Allow MEMBER to delete resources they don't own
- ✗ Ignore permission denials in audit logs
- ✗ Hardcode role names - use constants
- ✗ Return detailed error messages about why permission denied (security risk)

---

## Checklist for New Routes

When implementing a new protected route:

- [ ] Identify required permission/role
- [ ] Get user and verify organization membership
- [ ] Call appropriate permission check function
- [ ] Return 403 if permission denied
- [ ] For DELETE/UPDATE: verify resource ownership if needed
- [ ] Add audit logging for sensitive operations
- [ ] Write tests for all role levels
- [ ] Document permission requirement in comments
- [ ] Update permission matrix
- [ ] Test with each role (VIEWER, MEMBER, ADMIN, OWNER)

---

## Reference: Permission Constants

```typescript
// From lib/permissions.ts
export const PERMISSIONS = {
  READ: "READ",
  WRITE: "WRITE",
  DELETE: "DELETE",
  ADMIN: "ADMIN",
  MANAGE_MEMBERS: "MANAGE_MEMBERS",
  MANAGE_ROLES: "MANAGE_ROLES",
  MANAGE_SETTINGS: "MANAGE_SETTINGS",
};

export const ROLE_PERMISSIONS = {
  OWNER: [READ, WRITE, DELETE, ADMIN, MANAGE_MEMBERS, MANAGE_ROLES, MANAGE_SETTINGS],
  ADMIN: [READ, WRITE, DELETE, MANAGE_MEMBERS, MANAGE_SETTINGS],
  MEMBER: [READ, WRITE, DELETE],
  VIEWER: [READ],
};
```

---

## More Information

- **Audit Report:** See `docs/RBAC_AUDIT_REPORT.md`
- **Permission Matrix:** See `docs/PERMISSION_MATRIX.md`
- **Permission System:** See `lib/permissions.ts`
- **Permission Helpers:** See `lib/permission-helpers.ts`

