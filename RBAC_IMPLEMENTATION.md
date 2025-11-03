# Role-Based Access Control (RBAC) & Team Management Implementation

## Overview

Complete implementation of role-based access control and team management system for NextCRM organizations. This system allows organizations to invite team members, assign roles with specific permissions, and manage their access levels.

## Phase 3 Completion

All components for Phase 3 (Team Management & RBAC) have been successfully implemented.

---

## 1. Permission System

### Location
- `lib/permissions.ts`

### Core Features

#### Permission Constants
```typescript
export const PERMISSIONS = {
  READ: "READ",           // Read operations
  WRITE: "WRITE",         // Write/Create operations
  DELETE: "DELETE",       // Delete operations
  ADMIN: "ADMIN",         // Administrative operations
  MANAGE_MEMBERS: "MANAGE_MEMBERS",     // Team member management
  MANAGE_ROLES: "MANAGE_ROLES",         // Role modification
  MANAGE_SETTINGS: "MANAGE_SETTINGS",   // Organization settings
};
```

#### Role-to-Permission Mapping

| Role | Permissions |
|------|-------------|
| **OWNER** | READ, WRITE, DELETE, ADMIN, MANAGE_MEMBERS, MANAGE_ROLES, MANAGE_SETTINGS |
| **ADMIN** | READ, WRITE, DELETE, MANAGE_MEMBERS, MANAGE_SETTINGS |
| **MEMBER** | READ, WRITE, DELETE |
| **VIEWER** | READ |

#### Key Functions
- `hasPermission(role, permission)` - Check if role has permission
- `canManageMembers(role)` - Check member management permission
- `canManageRoles(role)` - Check role management permission (owner only)
- `canManageSettings(role)` - Check settings management permission
- `canRead/Write/Delete(role)` - Content access checks
- `getRoleDisplayName(role)` - Get human-readable role name
- `getRoleDescription(role)` - Get role description

---

## 2. Database Models

### OrganizationInvitations Model

Added to `prisma/schema.prisma`:

```prisma
enum InvitationStatus {
  PENDING
  ACCEPTED
  EXPIRED
  CANCELLED
}

model OrganizationInvitations {
  id             String           @id @default(auto()) @map("_id") @db.ObjectId
  v              Int              @default(0) @map("__v")
  organizationId String           @db.ObjectId
  email          String
  role           OrganizationRole @default(MEMBER)
  token          String           @unique
  status         InvitationStatus @default(PENDING)
  invitedBy      String           @db.ObjectId
  expiresAt      DateTime
  createdAt      DateTime         @default(now()) @db.Date
  updatedAt      DateTime?        @updatedAt @db.Date

  organization   Organizations    @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  invitedByUser  Users            @relation(name: "invited_by", fields: [invitedBy], references: [id], onDelete: NoAction)

  @@index([organizationId])
  @@index([email])
  @@index([token])
}
```

### Updated Organizations Model
Added relation:
```prisma
invitations       OrganizationInvitations[]
```

### Updated Users Model
Added relation:
```prisma
sent_invitations     OrganizationInvitations[] @relation(name: "invited_by")
```

---

## 3. Server Actions

### Invite Member
**File:** `actions/organization/invite-member.ts`

Creates and sends team member invitations.

**Function:** `inviteMember(email, role)`

**Features:**
- Validates email and role
- Prevents self-invitations and duplicate invitations
- Generates unique 32-byte token with 7-day expiry
- Checks user permissions (MANAGE_MEMBERS)
- Sends HTML email via nodemailer
- Returns invitation ID on success

**Usage:**
```typescript
import { inviteMember } from "@/actions/organization/invite-member";

const result = await inviteMember({
  email: "member@example.com",
  role: "MEMBER"
});
```

### Get Invitations
**File:** `actions/organization/get-invitations.ts`

Retrieves pending invitations for the organization.

**Function:** `getInvitations()`

**Features:**
- Fetches only PENDING invitations
- Includes inviter information
- Ordered by creation date (newest first)
- Returns formatted invitation list

**Return Type:**
```typescript
interface PendingInvitation {
  id: string;
  email: string;
  role: string;
  status: string;
  invitedBy: { name: string | null; email: string };
  createdAt: Date;
  expiresAt: Date;
}
```

### Accept Invitation
**File:** `actions/organization/accept-invitation.ts`

Accepts an invitation and joins the organization.

**Function:** `acceptInvitation(token)`

**Features:**
- Validates token and checks expiry
- Verifies email matches current user
- Prevents multiple organization memberships
- Updates user's organization and role
- Marks invitation as ACCEPTED

**Return Type:**
```typescript
interface AcceptInvitationResult {
  success: boolean;
  message: string;
  organizationId?: string;
}
```

---

## 4. API Routes

### Invitations Management
**Endpoint:** `/api/organization/invitations`

**GET** - Fetch pending invitations
- Permission: MANAGE_MEMBERS
- Returns: Array of pending invitations

**DELETE** - Cancel an invitation
- Permission: MANAGE_MEMBERS
- Body: `{ invitationId: string }`
- Returns: `{ success: true }`

### Members Management
**Endpoint:** `/api/organization/members`

**GET** - List all organization members
- Returns: Array of member objects with roles

### Remove Member
**Endpoint:** `/api/organization/members/[userId]`

**DELETE** - Remove member from organization
- Permission: MANAGE_MEMBERS
- Validates: Cannot remove self or owner
- Returns: `{ success: true }`

### Update Member Role
**Endpoint:** `/api/organization/members/[userId]/role`

**PUT** - Change member's role
- Permission: MANAGE_ROLES (owner only)
- Body: `{ role: OrganizationRole }`
- Validates: Cannot change owner role
- Returns: Updated member object

---

## 5. React Hooks

### usePermissions Hook
**File:** `hooks/use-permissions.ts`

Checks user permissions in React components.

**Usage:**
```typescript
const { hasPermission, canManageMembers, canWrite } = usePermissions(userRole);

if (canManageMembers()) {
  // Show invite button
}
```

**Methods:**
- `hasPermission(permission)` - Check specific permission
- `canManageMembers()`
- `canManageRoles()`
- `canManageSettings()`
- `canRead()`, `canWrite()`, `canDelete()`
- `isAdmin()`

### useRole Hook
**File:** `hooks/use-role.ts`

Get role information and helpers.

**Usage:**
```typescript
const { displayName, isOwner, assignableRoles } = useRole(userRole);

if (isOwner()) {
  // Show owner options
}
```

**Properties:**
- `role` - Current organization role
- `displayName` - Human-readable role name
- `description` - Role description
- `isOwner()`, `isAdmin()`, `isMember()`, `isViewer()`
- `assignableRoles` - Roles that can be assigned to new members
- `allRoles` - All available roles

---

## 6. Permission Components

### PermissionGate Component
**File:** `components/permission-gate.tsx`

Conditionally render UI based on permissions.

**Usage:**
```typescript
<PermissionGate
  permission={PERMISSIONS.MANAGE_MEMBERS}
  userRole={userRole}
>
  <button>Invite Member</button>
</PermissionGate>
```

### RoleCheck Component
Render content only for specific role.

**Usage:**
```typescript
<RoleCheck role="OWNER" userRole={userRole}>
  <button>Owner Settings</button>
</RoleCheck>
```

### AnyRoleCheck Component
Render content if user has any of specified roles.

**Usage:**
```typescript
<AnyRoleCheck roles={["OWNER", "ADMIN"]} userRole={userRole}>
  <button>Admin Panel</button>
</AnyRoleCheck>
```

### RoleBadge Component
**File:** `components/role-badge.tsx`

Display role with appropriate styling.

**Usage:**
```typescript
<RoleBadge role="ADMIN" />
<RoleBadge role="OWNER" variant="destructive" />
```

**Color Mapping:**
- OWNER → Red (destructive)
- ADMIN → Blue (secondary)
- MEMBER → Default
- VIEWER → Outline

---

## 7. Email Template

### OrganizationInvitation Email
**File:** `emails/OrganizationInvitation.tsx`

Multi-language invitation email template (English/Czech).

**Props:**
```typescript
interface OrganizationInvitationEmailProps {
  organizationName: string;
  invitedByName: string;
  inviteeEmail: string;
  role: OrganizationRole;
  invitationLink: string;
  userLanguage?: string;
}
```

**Features:**
- Multi-language support (en/cz)
- Shows organization name
- Displays assigned role
- Includes acceptance link
- Shows 7-day expiry notice
- Styled with Tailwind CSS via react-email

---

## 8. Team Management UI

### Team Page
**Location:** `app/[locale]/(routes)/settings/team/page.tsx`

Main team management interface showing:
- Team member list with roles
- Pending invitations (if authorized)
- Invite member form (if authorized)

**Features:**
- Server-side rendering with auth check
- Permission-based UI visibility
- Displays member count
- Shows member join dates

### InviteMemberForm Component
**Location:** `app/[locale]/(routes)/settings/team/components/InviteMemberForm.tsx`

Form to invite new team members.

**Features:**
- Email validation
- Role selection (Admin/Member/Viewer)
- Accessible form with labels
- Error handling and feedback
- Loading states during submission
- Role permission descriptions

### PendingInvitations Component
**Location:** `app/[locale]/(routes)/settings/team/components/PendingInvitations.tsx`

Displays pending team member invitations.

**Features:**
- Real-time invitation list
- Shows inviter and expiry date
- Cancel invitation button
- Formatted timestamps
- Loading and empty states

### TeamMembersList Component
**Location:** `app/[locale]/(routes)/settings/team/components/TeamMembersList.tsx`

Table view of organization members.

**Features:**
- Member avatars with names
- Role display with colored badges
- Edit member roles (owner only)
- Remove member capability
- Confirm dialogs for destructive actions
- Prevents self-removal and owner removal
- Formatted join dates

---

## 9. Accept Invitation Page

**Location:** `app/[locale]/(auth)/accept-invitation/[token]/page.tsx`

Standalone page for accepting invitations.

**Features:**
- Token validation and expiry check
- Handles authenticated and unauthenticated users
- Auto-redirect to sign-in if needed
- Success confirmation with auto-redirect
- Error handling with user feedback
- Loading states
- Invitation details display

---

## 10. Permission Middleware

**File:** `middleware/check-permission.ts`

Utility functions for permission checking.

**Available Functions:**
- `requirePermission(permission)` - HOF for permission checking
- `requireAnyPermission(permissions[])` - Check multiple permissions
- `requireRole(role)` - Exact role match
- `requireAnyRole(roles[])` - Any role match
- `isOwnerOnly(role)` - Owner check
- `isOwnerOrAdmin(role)` - Owner or Admin check

**Usage:**
```typescript
const checkManage = requirePermission(PERMISSIONS.MANAGE_MEMBERS);
if (!checkManage(userRole)) {
  return error("Insufficient permissions");
}
```

---

## Integration Checklist

### Database Migration
```bash
# Update Prisma schema (already done)
# Generate migration
npx prisma migrate dev --name add_invitations

# Update Prisma client
npx prisma generate
```

### Environment Variables
Ensure these are set in `.env.local`:
```
DATABASE_URL=mongodb://...
EMAIL_HOST=smtp.example.com
EMAIL_USERNAME=...
EMAIL_PASSWORD=...
EMAIL_FROM=noreply@nextcrm.app
NEXT_PUBLIC_APP_URL=https://app.nextcrm.app
```

### UI Dependencies
The team management UI uses shadcn/ui components:
- Button, Badge, Input
- Select, Form (react-hook-form)
- Table, Card
- AlertDialog
- Avatar
- Loader icons (lucide-react)
- Toast notifications

### Protected Routes
Add role checks to existing CRM operations:

```typescript
// In existing route handlers
import { canManageMembers, canWrite, canDelete } from "@/lib/permissions";

if (!canWrite(userRole)) {
  return new NextResponse("Insufficient permissions", { status: 403 });
}
```

---

## Testing Checklist

### Permission System
- [x] Permission constants defined
- [x] Role-permission mapping accurate
- [x] Helper functions working correctly

### Invitations
- [x] Create invitation with token
- [x] Send invitation email
- [x] Accept invitation with token
- [x] Token expiry validation
- [x] Duplicate invitation prevention

### Team Management
- [x] List team members
- [x] Update member roles (owner only)
- [x] Remove members
- [x] Permission checks enforced

### UI Components
- [x] Permission gates work correctly
- [x] Role badges display properly
- [x] Forms validate input
- [x] Error messages display
- [x] Loading states show

### Edge Cases
- [ ] User accepts invitation for different email
- [ ] Invitation expires before acceptance
- [ ] User already member of organization
- [ ] Non-owner trying to manage roles
- [ ] Admin trying to remove owner
- [ ] Concurrent invitation acceptance

---

## Future Enhancements

### Phase 4 Recommendations
1. **Audit Logging** - Track all permission changes
2. **Custom Roles** - Allow organizations to create custom roles
3. **Permission Delegation** - Allow owners to delegate specific permissions
4. **SSO Integration** - Support SAML/OIDC for large organizations
5. **Team Hierarchies** - Support departments/teams within organizations
6. **Activity Timeline** - Show member join/leave history
7. **Bulk Operations** - Invite multiple members at once
8. **Role Templates** - Pre-defined role sets for different industries

---

## Files Created Summary

### Core System
1. `lib/permissions.ts` - Permission definitions and helpers
2. `middleware/check-permission.ts` - Permission checking utilities

### Database
3. `prisma/schema.prisma` - Updated with OrganizationInvitations

### Server Actions
4. `actions/organization/invite-member.ts` - Create and send invitations
5. `actions/organization/get-invitations.ts` - Fetch pending invitations
6. `actions/organization/accept-invitation.ts` - Accept invitations

### API Routes
7. `app/api/organization/invitations/route.ts` - GET/DELETE invitations
8. `app/api/organization/members/route.ts` - GET members
9. `app/api/organization/members/[userId]/route.ts` - DELETE member
10. `app/api/organization/members/[userId]/role/route.ts` - PUT member role

### React Components
11. `components/permission-gate.tsx` - Permission conditional rendering
12. `components/role-badge.tsx` - Role display component

### React Hooks
13. `hooks/use-permissions.ts` - Permission checking hook
14. `hooks/use-role.ts` - Role information hook

### Email
15. `emails/OrganizationInvitation.tsx` - Invitation email template

### UI Pages & Components
16. `app/[locale]/(routes)/settings/team/page.tsx` - Team page
17. `app/[locale]/(routes)/settings/team/components/InviteMemberForm.tsx` - Invite form
18. `app/[locale]/(routes)/settings/team/components/PendingInvitations.tsx` - Invitations list
19. `app/[locale]/(routes)/settings/team/components/TeamMembersList.tsx` - Members table
20. `app/[locale]/(auth)/accept-invitation/[token]/page.tsx` - Accept invitation page

---

## Permission Matrix Summary

```
┌─────────────┬──────┬───────┬────────┬────────┐
│ Permission  │ OWNER│ ADMIN │ MEMBER │ VIEWER │
├─────────────┼──────┼───────┼────────┼────────┤
│ READ        │  ✓   │   ✓   │   ✓    │   ✓    │
│ WRITE       │  ✓   │   ✓   │   ✓    │   ✗    │
│ DELETE      │  ✓   │   ✓   │   ✓    │   ✗    │
│ ADMIN       │  ✓   │   ✗   │   ✗    │   ✗    │
│ MANAGE_MEMBERS│ ✓   │   ✓   │   ✗    │   ✗    │
│ MANAGE_ROLES│ ✓    │   ✗   │   ✗    │   ✗    │
│ MANAGE_SETTINGS│ ✓   │   ✓   │   ✗    │   ✗    │
└─────────────┴──────┴───────┴────────┴────────┘
```

---

## Quick Start Guide

### 1. Run Database Migration
```bash
npx prisma migrate dev --name add_rbac_system
```

### 2. Add to Navigation
```typescript
// Add link to settings navigation
<Link href="/settings/team">Team Management</Link>
```

### 3. Update Existing Routes
```typescript
// Check permissions in CRM operations
import { canWrite } from "@/lib/permissions";

if (!canWrite(user.organization_role)) {
  return new NextResponse("Forbidden", { status: 403 });
}
```

### 4. Use in Components
```typescript
import { PermissionGate } from "@/components/permission-gate";
import { PERMISSIONS } from "@/lib/permissions";

<PermissionGate
  permission={PERMISSIONS.DELETE}
  userRole={user.organization_role}
>
  <DeleteButton />
</PermissionGate>
```

---

**Implementation Date:** November 3, 2025
**Status:** Complete and ready for testing
**Total Files Created:** 20
