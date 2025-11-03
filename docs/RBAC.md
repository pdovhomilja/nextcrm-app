# RBAC Implementation Guide

**Version:** 2.0.0
**Last Updated:** November 4, 2025
**Audience:** Developers, Security Team, Product Managers

---

## Table of Contents

- [Overview](#overview)
- [Role Definitions](#role-definitions)
- [Permission Matrix](#permission-matrix)
- [Implementation Patterns](#implementation-patterns)
- [Testing Guide](#testing-guide)
- [Common Scenarios](#common-scenarios)
- [Troubleshooting](#troubleshooting)

---

## Overview

NextCRM implements a **4-tier Role-Based Access Control (RBAC)** system with hierarchical permissions. Every user in an organization is assigned exactly one role that determines their access level.

### Design Principles

1. **Hierarchical Roles**: Each role inherits all permissions from roles below it
2. **Explicit Permission Checks**: Every API route and Server Action enforces permissions
3. **Audit Everything**: All permission denials are logged for security forensics
4. **Fail Secure**: On error, deny access (never grant by default)
5. **Organization-Scoped**: Roles are per-organization (user can have different roles in different orgs)

---

## Role Definitions

### VIEWER (Read-Only)

**Purpose**: External stakeholders, auditors, clients who need visibility but no editing rights.

**Permissions**:
- ✅ **READ**: All organization data (accounts, contacts, leads, opportunities, invoices, documents, projects)
- ❌ **CREATE**: Cannot create any records
- ❌ **UPDATE**: Cannot edit any records
- ❌ **DELETE**: Cannot delete any records
- ❌ **INVITE**: Cannot invite team members
- ❌ **MANAGE**: Cannot access settings or billing

**AWMS Use Cases**:
- External auditor reviewing service records
- Vehicle owner viewing their service history (customer portal)
- Insurance adjuster verifying repair work
- Fleet manager monitoring multiple workshops (read-only across locations)

**Code Example**:
```typescript
const role = "VIEWER";
canRead(role);        // ✅ true
canWrite(role);       // ❌ false
canDelete(role);      // ❌ false
canManageMembers(role); // ❌ false
```

---

### MEMBER (Default Role)

**Purpose**: General staff who create and manage their own work.

**Permissions**:
- ✅ **READ**: All organization data
- ✅ **CREATE**: Any resource (accounts, contacts, leads, opportunities, tasks, documents)
- ✅ **UPDATE**: Only resources they created (`createdBy = userId`)
- ✅ **DELETE**: Only resources they created (`createdBy = userId`)
- ❌ **INVITE**: Cannot invite team members
- ❌ **MANAGE**: Cannot access settings or billing

**AWMS Use Cases**:
- Automotive technician managing their assigned repair jobs
- Service advisor creating customer accounts and service quotes
- Parts clerk updating inventory for orders they process
- Mobile mechanic documenting on-site repairs

**Ownership Rules**:
- MEMBER can only edit/delete records where `createdBy = their userId`
- ADMIN can override and edit/delete any record (escalation path)
- System records (created by cron jobs, webhooks) are not owned by any user → only ADMIN can edit

**Code Example**:
```typescript
const role = "MEMBER";
const userId = "user_abc123";
const resourceCreatedBy = "user_abc123";

canRead(role);        // ✅ true
canWrite(role);       // ✅ true
canDelete(role);      // ✅ true (for own resources)

// Ownership check
if (role === "MEMBER" && resourceCreatedBy !== userId) {
  // ❌ Cannot edit resources created by others
}
```

---

### ADMIN (Team Manager)

**Purpose**: Team leads, shop managers who manage staff and all resources.

**Permissions**:
- ✅ **READ**: All organization data
- ✅ **CREATE**: Any resource
- ✅ **UPDATE**: Any resource (regardless of creator)
- ✅ **DELETE**: Any resource (regardless of creator)
- ✅ **INVITE**: Invite new team members (assign role up to MEMBER)
- ✅ **REMOVE**: Remove team members (except OWNER)
- ✅ **MANAGE**: Organization settings (name, slug, logo)
- ❌ **BILLING**: Cannot access billing or subscriptions
- ❌ **ROLE_CHANGE**: Cannot promote to ADMIN or OWNER

**AWMS Use Cases**:
- Workshop manager overseeing technician schedules
- Service manager approving quotes and closing jobs
- Regional manager managing multiple workshop locations
- Quality control lead reviewing all repair work

**Code Example**:
```typescript
const role = "ADMIN";
canRead(role);            // ✅ true
canWrite(role);           // ✅ true
canDelete(role);          // ✅ true
canManageMembers(role);   // ✅ true
canManageSettings(role);  // ✅ true
canManageRoles(role);     // ❌ false (OWNER only)
```

---

### OWNER (Organization Owner)

**Purpose**: Business owner or franchise owner with full control.

**Permissions**:
- ✅ **ALL ADMIN PERMISSIONS** (full data access + team management)
- ✅ **ROLE_CHANGE**: Promote/demote members to any role (including ADMIN)
- ✅ **BILLING**: Access billing, subscriptions, payment methods
- ✅ **DELETE_ORG**: Delete entire organization (30-day grace period)
- ✅ **EXPORT_DATA**: Bulk data export (GDPR compliance)

**Restrictions**:
- **Only 1 OWNER per organization** (enforced at database level via `ownerId` field)
- OWNER cannot demote themselves (must transfer ownership first)
- Deleting OWNER user requires ownership transfer or org deletion

**AWMS Use Cases**:
- Workshop owner managing business financials
- Franchise owner controlling multiple locations
- Business partner with full decision-making authority

**Code Example**:
```typescript
const role = "OWNER";
canRead(role);              // ✅ true
canWrite(role);             // ✅ true
canDelete(role);            // ✅ true
canManageMembers(role);     // ✅ true
canManageSettings(role);    // ✅ true
canManageRoles(role);       // ✅ true
canAccessBilling(role);     // ✅ true
canDeleteOrganization(role); // ✅ true
```

---

## Permission Matrix

### Complete Permission Grid

| **Operation**                      | **VIEWER** | **MEMBER** | **ADMIN** | **OWNER** | **API Endpoint**                        |
|------------------------------------|------------|------------|-----------|-----------|----------------------------------------|
| **Read** (accounts, contacts, etc.)| ✅         | ✅         | ✅        | ✅        | `GET /api/crm/*`                       |
| **Create** (new records)           | ❌         | ✅         | ✅        | ✅        | `POST /api/crm/*`                      |
| **Update** (own records)           | ❌         | ✅         | ✅        | ✅        | `PUT /api/crm/*/[id]`                  |
| **Update** (any record)            | ❌         | ❌         | ✅        | ✅        | `PUT /api/crm/*/[id]`                  |
| **Delete** (own records)           | ❌         | ✅         | ✅        | ✅        | `DELETE /api/crm/*/[id]`               |
| **Delete** (any record)            | ❌         | ❌         | ✅        | ✅        | `DELETE /api/crm/*/[id]`               |
| **Invite** team members            | ❌         | ❌         | ✅        | ✅        | `POST /api/organization/invitations`   |
| **Remove** team members            | ❌         | ❌         | ✅        | ✅        | `DELETE /api/organization/members/[id]`|
| **Change** roles (VIEWER/MEMBER)   | ❌         | ❌         | ❌        | ✅        | `PUT /api/organization/members/[id]/role` |
| **Change** roles (ADMIN)           | ❌         | ❌         | ❌        | ✅        | `PUT /api/organization/members/[id]/role` |
| **Manage** org settings            | ❌         | ❌         | ✅        | ✅        | `PUT /api/organization`                |
| **Access** billing                 | ❌         | ❌         | ❌        | ✅        | `GET /api/billing/*`                   |
| **Export** org data                | ❌         | ❌         | ✅        | ✅        | `GET /api/organization/export-data`    |
| **Delete** organization            | ❌         | ❌         | ❌        | ✅        | `POST /api/organization/delete`        |
| **View** audit logs                | ❌         | ❌         | ✅        | ✅        | `GET /api/organization/audit-logs`     |

---

## Implementation Patterns

### Pattern 1: Middleware (API Routes)

Use `requirePermission()` middleware for API route protection:

```typescript
// app/api/crm/account/route.ts
import { requirePermission, PERMISSIONS } from "@/middleware/require-permission";
import { withRateLimit } from "@/middleware/with-rate-limit";

async function handleGET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const orgId = session.user.organizationId;

  const accounts = await prismadb.crm_Accounts.findMany({
    where: { organizationId: orgId },
  });

  return NextResponse.json(accounts);
}

async function handlePOST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const orgId = session.user.organizationId;

  const body = await req.json();
  const account = await prismadb.crm_Accounts.create({
    data: {
      ...body,
      organizationId: orgId,
      createdBy: session.user.id,
    },
  });

  return NextResponse.json(account);
}

// Apply middleware (rate limiting + permission check)
export const GET = withRateLimit(requirePermission(PERMISSIONS.READ)(handleGET));
export const POST = withRateLimit(requirePermission(PERMISSIONS.WRITE)(handlePOST));
```

---

### Pattern 2: Server Actions

Use `checkWritePermission()` helpers in Server Actions:

```typescript
// actions/crm/delete-account.ts
"use server";

import { getServerSession } from "next-auth";
import { checkDeletePermission } from "@/lib/permission-helpers";

export async function deleteAccount(accountId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");

  const userId = session.user.id;
  const orgId = session.user.organizationId;

  // Fetch account to check ownership
  const account = await prismadb.crm_Accounts.findUnique({
    where: { id: accountId },
    select: { organizationId: true, createdBy: true },
  });

  if (!account) throw new Error("Account not found");
  if (account.organizationId !== orgId) throw new Error("Forbidden");

  // Check permission (considers ownership for MEMBER role)
  const permissionCheck = await checkDeletePermission(
    userId,
    orgId,
    account.createdBy,
    true // allowAdminOverride
  );

  if (!permissionCheck.allowed) {
    throw new Error(permissionCheck.reason || "Permission denied");
  }

  // Delete account
  await prismadb.crm_Accounts.delete({ where: { id: accountId }});

  return { success: true };
}
```

---

### Pattern 3: UI Component Guards

Use `hasPermission()` to conditionally render UI elements:

```typescript
// components/account-actions.tsx
"use client";

import { useSession } from "next-auth/react";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";

export function AccountActions({ account }) {
  const { data: session } = useSession();
  const userRole = session?.user?.organization_role;

  const canEdit = hasPermission(userRole, PERMISSIONS.WRITE);
  const canDelete = hasPermission(userRole, PERMISSIONS.DELETE);

  return (
    <div>
      {canEdit && <Button onClick={() => editAccount(account)}>Edit</Button>}
      {canDelete && <Button onClick={() => deleteAccount(account)}>Delete</Button>}
    </div>
  );
}
```

---

## Testing Guide

### Unit Tests (68 Tests Total)

```bash
pnpm test tests/unit/lib/permissions.test.ts
```

**Coverage**:
- All role × permission combinations (4 roles × 17 permissions)
- Edge cases (null role, undefined role, invalid role)
- Permission helpers (checkReadPermission, checkWritePermission, etc.)
- Role comparison (isAdmin, canManageRoles, etc.)

**Example Test**:
```typescript
describe("hasPermission", () => {
  it("VIEWER can read", () => {
    expect(hasPermission("VIEWER", PERMISSIONS.READ)).toBe(true);
  });

  it("VIEWER cannot write", () => {
    expect(hasPermission("VIEWER", PERMISSIONS.WRITE)).toBe(false);
  });

  it("MEMBER can write", () => {
    expect(hasPermission("MEMBER", PERMISSIONS.WRITE)).toBe(true);
  });

  it("ADMIN can manage members", () => {
    expect(hasPermission("ADMIN", PERMISSIONS.MANAGE_MEMBERS)).toBe(true);
  });

  it("OWNER can access billing", () => {
    expect(hasPermission("OWNER", PERMISSIONS.ACCESS_BILLING)).toBe(true);
  });
});
```

---

### Integration Tests

```bash
pnpm test tests/integration/api/multi-tenancy.test.ts
```

**Scenarios Tested**:
1. VIEWER can GET but not POST/PUT/DELETE
2. MEMBER can create account, edit own account, but not edit others' accounts
3. ADMIN can edit any account
4. OWNER can access billing endpoints
5. Cross-tenant data isolation (user in org A cannot access org B data)

---

### Manual Testing Checklist

**Before Production Deployment**:

- [ ] **VIEWER Role**
  - [ ] Can view dashboard, all CRM data, invoices, projects
  - [ ] Cannot see "Create" buttons in UI
  - [ ] POST/PUT/DELETE requests return 403
  - [ ] Cannot access Settings or Billing pages

- [ ] **MEMBER Role**
  - [ ] Can create new accounts, contacts, leads
  - [ ] Can edit own records (created by this user)
  - [ ] Cannot edit records created by other members
  - [ ] DELETE own records works, DELETE others' records returns 403
  - [ ] Cannot access Team management or Billing

- [ ] **ADMIN Role**
  - [ ] Can edit any record (regardless of creator)
  - [ ] Can delete any record
  - [ ] Can invite new members (assign VIEWER or MEMBER role)
  - [ ] Cannot promote to ADMIN (only OWNER can)
  - [ ] Can access Settings, but not Billing

- [ ] **OWNER Role**
  - [ ] Can change any member's role (including to ADMIN)
  - [ ] Can access Billing page, Stripe Customer Portal
  - [ ] Can delete organization (shows 30-day grace period warning)
  - [ ] Can export organization data (GDPR compliance)

---

## Common Scenarios

### Scenario 1: Promote Member to Admin

**Requirement**: Only OWNER can promote to ADMIN.

**Implementation**:
```typescript
// app/api/organization/members/[userId]/role/route.ts
export async function PUT(req: NextRequest, { params }) {
  const session = await getServerSession(authOptions);
  const userRole = session.user.organization_role;

  if (userRole !== "OWNER") {
    return NextResponse.json(
      { error: "Only organization owners can change roles" },
      { status: 403 }
    );
  }

  const { newRole } = await req.json();

  await prismadb.users.update({
    where: { id: params.userId },
    data: { organization_role: newRole },
  });

  // Log role change for audit trail
  await logRoleChange(
    params.userId,
    "MEMBER",
    newRole,
    { organizationId: session.user.organizationId, userId: session.user.id }
  );

  return NextResponse.json({ success: true });
}
```

---

### Scenario 2: MEMBER Edits Another User's Record

**Requirement**: MEMBER can only edit own records.

**Implementation**:
```typescript
// app/api/crm/account/[accountId]/route.ts
export async function PUT(req: NextRequest, { params }) {
  const session = await getServerSession(authOptions);
  const userRole = session.user.organization_role;
  const userId = session.user.id;

  // Fetch account to check creator
  const account = await prismadb.crm_Accounts.findUnique({
    where: { id: params.accountId },
    select: { createdBy: true, organizationId: true },
  });

  if (!account) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Multi-tenancy check
  if (account.organizationId !== session.user.organizationId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Ownership check (MEMBER can only edit own records)
  if (userRole === "MEMBER" && account.createdBy !== userId) {
    return NextResponse.json(
      { error: "You can only edit accounts you created" },
      { status: 403 }
    );
  }

  // Update account
  const updated = await prismadb.crm_Accounts.update({
    where: { id: params.accountId },
    data: await req.json(),
  });

  return NextResponse.json(updated);
}
```

---

### Scenario 3: ADMIN Overrides MEMBER Restrictions

**Requirement**: ADMIN can edit any record, even if they didn't create it.

**Implementation**: Same code as Scenario 2, but ADMIN bypasses ownership check:

```typescript
// Ownership check (MEMBER restricted, ADMIN/OWNER can edit anything)
if (userRole === "MEMBER" && account.createdBy !== userId) {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

// ADMIN/OWNER continue past this check and can edit any record
```

---

### Scenario 4: Customer Portal (Read-Only Access)

**Requirement**: Vehicle owners can view their service history but not edit.

**Implementation** (Future):
```typescript
// Create customer user with VIEWER role in workshop's organization
const customer = await prismadb.users.create({
  data: {
    email: "customer@example.com",
    organizationId: workshopOrgId,
    organization_role: "VIEWER",  // ← Read-only
  },
});

// Customer can GET /api/crm/accounts (their account only)
// Customer CANNOT POST/PUT/DELETE (VIEWER role prevents it)
```

---

## Troubleshooting

### Problem: User Cannot Edit Their Own Records

**Symptom**: MEMBER role user gets 403 when editing account they created.

**Diagnosis**:
1. Check `createdBy` field on record: `SELECT createdBy FROM crm_Accounts WHERE id = ?`
2. Check user's ID: `SELECT id FROM users WHERE email = ?`
3. Verify `createdBy` matches user's `id`

**Common Causes**:
- Record created by different user (e.g., ADMIN created it)
- Record created by system (e.g., webhook, cron job) → `createdBy` is null
- User's ID changed (e.g., after data migration)

**Solution**:
- If record has no creator (`createdBy = null`), assign it to requesting user
- If record belongs to another user, ADMIN must edit it (or ADMIN transfers ownership)

---

### Problem: OWNER Cannot Delete Organization

**Symptom**: OWNER gets 403 when trying to delete organization.

**Diagnosis**:
1. Check user's role: `SELECT organization_role FROM users WHERE id = ?`
2. Check user is organization owner: `SELECT ownerId FROM organizations WHERE id = ?`
3. Verify `userId` matches `ownerId`

**Common Causes**:
- User has ADMIN role but is not the owner (only OWNER can delete org)
- Ownership was transferred to another user
- User belongs to wrong organization (session has old `organizationId`)

**Solution**:
- Transfer ownership to user first: `UPDATE organizations SET ownerId = ? WHERE id = ?`
- Or use account with OWNER role

---

### Problem: Permission Denied Not Logged

**Symptom**: Audit log missing entries for permission denials.

**Diagnosis**:
1. Check audit log table: `SELECT * FROM audit_log WHERE action = 'PERMISSION_DENIED'`
2. Check middleware execution: Look for `[PERMISSION_MIDDLEWARE_ERROR]` in logs
3. Verify `organizationId` is set (audit logging requires valid org)

**Common Causes**:
- User has no `organizationId` (not onboarded yet)
- Database connection failure (audit log insert failed)
- Middleware error (exception thrown before logging)

**Solution**:
- Ensure user completes onboarding (assigns to organization)
- Check database connectivity
- Review middleware error logs

---

### Problem: Rate Limiting Interfering with RBAC

**Symptom**: User gets 429 before 403 (rate limit before permission check).

**Diagnosis**: Rate limiting middleware runs BEFORE permission middleware.

**Explanation**: This is **intentional design**:
- Rate limiting protects against DDoS (must run first)
- Permission checks are expensive (database queries)
- Rate limiting prevents attackers from probing permissions

**Solution**: No action needed (working as designed).

---

## Related Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture overview
- [SECURITY.md](./SECURITY.md) - Security controls and compliance
- [MAINTENANCE.md](./MAINTENANCE.md) - Operational guide

---

**Document Maintained By**: Engineering Team
**Last Review**: November 4, 2025
**Next Review**: February 1, 2026
