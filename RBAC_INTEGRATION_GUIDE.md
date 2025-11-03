# RBAC Integration Guide

Quick reference for integrating RBAC into existing NextCRM features.

## 1. Database Setup

### Run Migration
```bash
npx prisma migrate dev --name add_organization_invitations
```

This will:
- Add `InvitationStatus` enum
- Create `OrganizationInvitations` model
- Add relations to `Organizations` and `Users` models

### Generate Prisma Client
```bash
npx prisma generate
```

---

## 2. Protecting API Routes

### Check User Organization Membership
```typescript
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prismadb } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return new NextResponse("Unauthenticated", { status: 401 });
  }

  const user = await prismadb.users.findUnique({
    where: { email: session.user.email },
  });

  if (!user?.organizationId) {
    return new NextResponse("Not in organization", { status: 400 });
  }

  // Now check permissions
  // ...
}
```

### Check User Permissions
```typescript
import { canWrite, canDelete } from "@/lib/permissions";

// Check single permission
if (!canWrite(user.organization_role)) {
  return new NextResponse("Forbidden", { status: 403 });
}

// Check multiple permissions
if (!canWrite(user.organization_role) && !canDelete(user.organization_role)) {
  return new NextResponse("Forbidden", { status: 403 });
}
```

### Example: CRM Account Update
```typescript
// app/api/crm/account/[accountId]/route.ts
import { canWrite, canManageSettings } from "@/lib/permissions";

export async function PUT(req: Request, { params }: { params: { accountId: string } }) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return new NextResponse("Unauthenticated", { status: 401 });
  }

  const user = await prismadb.users.findUnique({
    where: { email: session.user.email },
  });

  if (!user?.organizationId) {
    return new NextResponse("Not in organization", { status: 400 });
  }

  // Check permission
  if (!canWrite(user.organization_role)) {
    return new NextResponse("Insufficient permissions", { status: 403 });
  }

  // Proceed with update
  // ...
}
```

---

## 3. Using in React Components

### Import and Use Hooks
```typescript
"use client";

import { usePermissions } from "@/hooks/use-permissions";
import { useRole } from "@/hooks/use-role";
import { getServerSession } from "next-auth";
import { prismadb } from "@/lib/prisma";

export function MyComponent() {
  const { canManageMembers, canWrite } = usePermissions(userRole);
  const { isOwner, displayName } = useRole(userRole);

  if (!canWrite()) {
    return <p>You don't have permission to edit this</p>;
  }

  return (
    <div>
      <p>Logged in as: {displayName}</p>
      {isOwner() && <button>Owner Settings</button>}
    </div>
  );
}
```

### Use Permission Gates
```typescript
import { PermissionGate, RoleCheck, AnyRoleCheck } from "@/components/permission-gate";
import { PERMISSIONS } from "@/lib/permissions";

export function CRMModule() {
  return (
    <div>
      {/* Only show delete button to those with DELETE permission */}
      <PermissionGate
        permission={PERMISSIONS.DELETE}
        userRole={userRole}
      >
        <button className="text-red-600">Delete</button>
      </PermissionGate>

      {/* Only show owner settings */}
      <RoleCheck role="OWNER" userRole={userRole}>
        <button>Owner Settings</button>
      </RoleCheck>

      {/* Show to admins and above */}
      <AnyRoleCheck roles={["OWNER", "ADMIN"]} userRole={userRole}>
        <button>Admin Panel</button>
      </AnyRoleCheck>
    </div>
  );
}
```

### Use Role Badge
```typescript
import { RoleBadge } from "@/components/role-badge";

export function UserCard({ user }) {
  return (
    <div>
      <h3>{user.name}</h3>
      <RoleBadge role={user.organization_role} />
    </div>
  );
}
```

---

## 4. Updating Settings Page

### Add Team Link
```typescript
// app/[locale]/(routes)/settings/page.tsx or similar
import Link from "next/link";

export function SettingsNav() {
  return (
    <nav className="space-y-2">
      <Link href="/settings/organization">Organization</Link>
      <Link href="/settings/team">Team Management</Link>
      <Link href="/settings/billing">Billing</Link>
    </nav>
  );
}
```

---

## 5. Server-Side Permission Checks

### In Page Components
```typescript
// app/[locale]/(routes)/settings/team/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prismadb } from "@/lib/prisma";
import { canManageMembers } from "@/lib/permissions";
import { redirect } from "next/navigation";

const TeamPage = async () => {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect("/sign-in");
  }

  const user = await prismadb.users.findUnique({
    where: { email: session.user.email },
  });

  if (!user?.organizationId) {
    redirect("/onboarding");
  }

  // Check permission
  if (!canManageMembers(user.organization_role)) {
    return <div>You don't have permission to manage team members</div>;
  }

  // Render team management UI
  // ...
};

export default TeamPage;
```

---

## 6. Updating Existing Features

### CRM Accounts - Add Permission Check
```typescript
// app/api/crm/account/route.ts
import { canWrite } from "@/lib/permissions";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  const user = await prismadb.users.findUnique({
    where: { email: session.user.email },
  });

  // NEW: Check permission
  if (!canWrite(user!.organization_role)) {
    return new NextResponse("Insufficient permissions", { status: 403 });
  }

  // Existing code continues...
}
```

### CRM Leads - Add Permission Check
```typescript
// Add similar permission checks to CRM lead routes
export async function DELETE(req: Request) {
  // ... existing auth checks

  // NEW: Check permission
  if (!canDelete(user!.organization_role)) {
    return new NextResponse("Insufficient permissions", { status: 403 });
  }

  // Existing code continues...
}
```

### Contacts, Opportunities, etc.
Apply the same pattern to all CRM modules.

---

## 7. Testing the System

### Test Invitation Flow
```bash
# 1. Start the app
npm run dev

# 2. Log in as owner
# 3. Go to /settings/team
# 4. Send invitation to test@example.com
# 5. Check console for email (or actual email)
# 6. Open invitation link
# 7. Accept invitation
```

### Test Permission Checks
```typescript
// Create test scenarios
const testCases = [
  { role: "OWNER", permission: "DELETE", expected: true },
  { role: "VIEWER", permission: "DELETE", expected: false },
  { role: "MEMBER", permission: "MANAGE_MEMBERS", expected: false },
  { role: "ADMIN", permission: "MANAGE_MEMBERS", expected: true },
];

testCases.forEach(({ role, permission, expected }) => {
  const result = hasPermission(role, permission);
  console.assert(result === expected, `Failed: ${role} ${permission}`);
});
```

---

## 8. Configuration

### Email Configuration
Ensure `.env.local` has:
```
EMAIL_HOST=your-smtp-host
EMAIL_USERNAME=your-email
EMAIL_PASSWORD=your-password
EMAIL_FROM=noreply@yourapp.com
NEXT_PUBLIC_APP_URL=https://yourapp.com
```

### Invitation Token Expiry
Currently set to 7 days. To change:
```typescript
// actions/organization/invite-member.ts
const expiresAt = new Date();
expiresAt.setDate(expiresAt.getDate() + 7); // Change 7 to desired days
```

---

## 9. Common Integration Patterns

### Pattern 1: Protect Sensitive Operations
```typescript
async function deleteCRMData(userId: string, userRole: OrganizationRole) {
  if (!canDelete(userRole)) {
    throw new Error("Insufficient permissions");
  }

  // Perform deletion
  await prismadb.crm_Leads.delete({ where: { id: userId } });
}
```

### Pattern 2: Conditional UI Rendering
```typescript
function CRMModule({ userRole }: { userRole: OrganizationRole }) {
  return (
    <>
      <PermissionGate permission={PERMISSIONS.READ} userRole={userRole}>
        <div>Read content</div>
      </PermissionGate>

      <PermissionGate permission={PERMISSIONS.WRITE} userRole={userRole}>
        <button>Edit</button>
      </PermissionGate>

      <PermissionGate permission={PERMISSIONS.DELETE} userRole={userRole}>
        <button className="text-red-600">Delete</button>
      </PermissionGate>
    </>
  );
}
```

### Pattern 3: Role-Based Workflows
```typescript
function handleWorkflow(userRole: OrganizationRole) {
  if (userRole === "OWNER") {
    // Owner-specific logic
    return "Owner workflow";
  }

  if (["OWNER", "ADMIN"].includes(userRole)) {
    // Admin logic
    return "Admin workflow";
  }

  return "User workflow";
}
```

---

## 10. Troubleshooting

### Invitations Not Sending
1. Check email configuration in `.env.local`
2. Verify SMTP credentials
3. Check server logs for errors
4. Test email service independently

### Permission Denied Errors
1. Verify user has correct organization_role
2. Check permission matrix in `lib/permissions.ts`
3. Ensure permission checks match role permissions
4. Check middleware is being applied

### Database Issues
1. Run `npx prisma db push` if migrations fail
2. Check MongoDB connection string
3. Verify indexes are created
4. Check for duplicate unique fields

### Token Issues
1. Verify token is being generated correctly
2. Check token expiry logic
3. Ensure token is URL-safe
4. Verify token is passed in invitation URL

---

## Next Steps

1. **Run database migration** - `npx prisma migrate dev`
2. **Test invitation system** - Send yourself an invitation
3. **Update existing routes** - Add permission checks to CRM endpoints
4. **Update UI components** - Add permission gates
5. **Test permissions** - Try different roles and operations
6. **Deploy** - Push to production once tested

---

## Support

For issues or questions:
1. Check `RBAC_IMPLEMENTATION.md` for detailed documentation
2. Review individual component files for implementation details
3. Test permission matrix against your use cases
4. Enable debug logging in development

---

**Last Updated:** November 3, 2025
**Status:** Ready for integration
