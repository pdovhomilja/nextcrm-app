# PRD: Multi-Tenancy & Organization Management

**Version:** 1.0
**Status:** Critical - P0 Launch Blocker
**Owner:** Product Team
**Last Updated:** 2025-11-17
**Related PRDs:** [PRD-BILLING.md](./PRD-BILLING.md), [PRD-ADMIN.md](./PRD-ADMIN.md), [PRD-CRM-ACCOUNTS.md](./PRD-CRM-ACCOUNTS.md)

---

## 1. Executive Summary

Multi-tenancy is the foundational architecture enabling NextCRM to operate as a secure, scalable SaaS platform. This module provides complete data isolation between organizations, sophisticated 4-tier role-based access control (RBAC), and collaborative workspace features including team invitations, multi-organization user support, and organization lifecycle management.

**Key Value Proposition:**
- **Complete Data Isolation:** 100% guarantee that Organization A cannot access Organization B's data through database-level, ORM-level, and middleware-level enforcement
- **Flexible RBAC:** 4-tier permission system (Owner, Admin, Member, Viewer) with 30+ granular permissions controlling create, read, update, delete operations across all modules
- **Agency-Friendly:** Single users can participate in multiple organizations with different roles, perfect for consultants and agencies managing client accounts
- **Enterprise-Grade Security:** Session management, audit logging, invitation expiration, and organization deletion workflows meeting SOC 2 and GDPR requirements

**Target Release:** Q1 2025 (MUST ship before any paid launch)

---

## 2. Problem Statement

### Current Situation
SaaS platforms without proper multi-tenancy face catastrophic security risks where customers can accidentally or maliciously access other customers' data. Legacy systems use separate databases per customer, creating operational nightmares for maintenance, upgrades, and cost scaling. Without proper RBAC, organizations cannot safely delegate access to team members without risking data exposure.

### Why This Matters
Multi-tenancy failures are business-ending events:
- **Security Breaches:** 67% of SaaS breaches involve cross-tenant data leakage (Gartner Cloud Security Report)
- **Regulatory Penalties:** GDPR fines averaging €1.2M for data isolation failures
- **Customer Churn:** 89% of customers abandon SaaS products after discovering security issues
- **Operational Costs:** Per-tenant databases cost 10-50x more than properly architected multi-tenant systems at scale

### Success Vision
A marketing agency onboards 20 client organizations into NextCRM. Each client gets a completely isolated workspace with their own CRM data, projects, and documents. The agency staff can switch between client organizations seamlessly. Within each organization, clients can invite their own team members with appropriate permissions (Admins can manage billing, Members can edit records, Viewers can only see reports). When a client churns, the agency triggers organization deletion, entering a 30-day grace period before permanent data destruction. Throughout this workflow, audit logs track every access and change, and no organization ever sees another's data.

---

## 3. Target Users/Personas

### Primary Persona: Organization Owner
- **Role:** Company founder or department head who created the NextCRM organization
- **Goals:**
  - Maintain complete control over organization settings and billing
  - Invite team members and contractors with appropriate access levels
  - Remove access when team members leave the company
  - Transfer ownership when transitioning roles or selling business
- **Pain Points:**
  - Fear of losing control if delegating admin access
  - Uncertainty about what permissions team members actually have
  - No clear way to audit who accessed sensitive customer data
- **Use Cases:**
  - Creating organization on first signup and inviting 5-person sales team
  - Demoting former admin to member after organizational restructure
  - Deleting organization after company acquisition or project end

### Secondary Persona: Organization Admin
- **Role:** IT manager or operations lead delegated to manage team access
- **Goals:**
  - Onboard new employees quickly with consistent permissions
  - Disable access immediately when employees depart
  - Configure modules and settings without owner involvement
- **Pain Points:**
  - Cannot create/remove users without owner approval in some systems
  - Unclear permission boundaries between admin and owner roles
- **Use Cases:**
  - Bulk inviting 50 users from CSV during company rollout
  - Disabling modules (Projects, Invoices) not relevant to their team
  - Reviewing audit logs to investigate suspected data breach

### Tertiary Persona: Agency Consultant
- **Role:** Freelancer or agency staff working with multiple client organizations
- **Goals:**
  - Switch between client workspaces without multiple logins
  - Maintain separate email/password for personal vs. client work
  - View all organizations they have access to in one place
- **Pain Points:**
  - Managing 10+ separate logins for different client CRMs
  - Accidentally working in wrong organization's workspace
  - Losing access to historical data when contract ends
- **Use Cases:**
  - Accepting invitation to join client's organization as Admin
  - Switching between 5 active client organizations throughout workday
  - Creating personal organization for own business while consulting

### Quaternary Persona: Viewer Role User
- **Role:** Executive, board member, or external auditor needing read-only access
- **Goals:**
  - Monitor key metrics and reports without risk of changing data
  - Export data for external analysis
  - No risk of accidentally deleting or modifying records
- **Pain Points:**
  - Too much access leads to accidental data changes
  - Cannot prove they didn't modify data during audit reviews
- **Use Cases:**
  - Board member reviewing quarterly sales pipeline
  - External auditor exporting customer records for compliance review
  - Executive viewing dashboards without admin privileges

---

## 4. Functional Requirements

### 4.1 Core Features

#### Feature 1: Organization Creation & Lifecycle Management
**Description:** Complete lifecycle management for organizations including creation, configuration, suspension, deletion with grace periods, and permanent destruction.

**User Stories:**
- As a new user, I want to create an organization during signup so I have a workspace for my team
- As an owner, I want to delete my organization with a safety period so I can recover if I made a mistake
- As an admin (NextCRM system admin), I want to suspend organizations for non-payment so I can enforce billing policies
- As an owner, I want to transfer ownership to another user so I can transition responsibilities

**Specifications:**
- **Organization Model Fields:**
  - `id`: ObjectId primary key
  - `name`: Organization name (required, 2-100 characters)
  - `slug`: URL-friendly identifier (unique, auto-generated from name, 2-50 characters, lowercase alphanumeric + hyphens)
  - `plan`: Enum (FREE, PRO, ENTERPRISE) - default FREE
  - `status`: Enum (ACTIVE, SUSPENDED, CANCELLED) - default ACTIVE
  - `ownerId`: User ObjectId (required, single owner at all times)
  - `settings`: JSON blob for module configuration, custom fields, etc. (default: `{}`)
  - `stripeCustomerId`: String (unique, nullable until first subscription)
  - `deleteScheduledAt`: DateTime (nullable, set when deletion initiated)
  - `createdAt`, `updatedAt`: Audit timestamps

- **Organization Creation Workflow:**
  1. User signs up or clicks "Create Organization" from organization switcher
  2. Form captures: Organization name (required), slug (auto-generated with manual override option)
  3. System creates organization record with user as Owner, status=ACTIVE, plan=FREE
  4. System creates OrganizationUsage record (all counters at 0)
  5. System updates user record: `organizationId` = new org ID, `organization_role` = OWNER
  6. Redirect to onboarding wizard or dashboard

- **Organization Deletion Workflow (30-Day Grace Period):**
  1. Owner clicks "Delete Organization" button
  2. Confirmation modal: "Are you sure? This will schedule deletion in 30 days. You can cancel anytime."
  3. On confirm: Set `deleteScheduledAt` = now() + 30 days, status = CANCELLED
  4. Daily cron job scans for orgs where `deleteScheduledAt` < now()
  5. For expired orgs: Hard delete organization record (cascade deletes all related data via Prisma relations)
  6. Send final email notification: "Organization [name] permanently deleted"

- **Organization Restoration (Before 30 Days):**
  - Owner clicks "Restore Organization" button (visible during grace period)
  - Clear `deleteScheduledAt` field, set status = ACTIVE
  - Send email: "Organization [name] has been restored"

- **Ownership Transfer:**
  - Owner navigates to Settings → Organization → Transfer Ownership
  - Select new owner from dropdown of existing Admins (cannot transfer to Member/Viewer)
  - Confirmation email sent to new owner with accept/decline link
  - On accept: Update `ownerId`, demote previous owner to Admin role
  - Audit log entry: "Ownership transferred from [User A] to [User B]"

**UI/UX Considerations:**
- Organization creation during signup integrated into registration flow (single-page, no navigation away)
- Organization switcher in top navigation bar (dropdown showing all orgs user belongs to with role badges)
- Deletion confirmation modal with 30-day countdown timer display
- Restoration banner displayed prominently on dashboard during grace period

---

#### Feature 2: 4-Tier Role-Based Access Control (RBAC)
**Description:** Hierarchical permission system with 4 roles (Owner, Admin, Member, Viewer) controlling 30+ permissions across all modules. Permissions enforced at middleware, API route, server action, and database query levels.

**User Stories:**
- As an owner, I want only admins and owners to manage billing so members can't see sensitive financial data
- As an admin, I want to prevent viewers from editing records so we maintain data integrity
- As a member, I want to edit my assigned accounts but not delete organization-wide data
- As a viewer, I want to export reports but not modify any data

**Specifications:**
- **Role Hierarchy (Descending Privilege):**
  1. **OWNER:** Full access + transfer ownership + delete organization + manage billing
  2. **ADMIN:** All permissions except ownership transfer, org deletion, and billing management (can view billing)
  3. **MEMBER:** Read all, create/edit assigned records, cannot delete, cannot manage users/settings
  4. **VIEWER:** Read-only access to all data, can export, cannot create/edit/delete

- **30+ Granular Permissions Matrix:**

| Permission | Owner | Admin | Member | Viewer |
|-----------|-------|-------|--------|--------|
| **Organization Management** |
| View organization settings | ✓ | ✓ | ✗ | ✗ |
| Update organization settings | ✓ | ✓ | ✗ | ✗ |
| Delete organization | ✓ | ✗ | ✗ | ✗ |
| Transfer ownership | ✓ | ✗ | ✗ | ✗ |
| Manage modules (enable/disable) | ✓ | ✓ | ✗ | ✗ |
| **User Management** |
| View all organization members | ✓ | ✓ | ✓ | ✓ |
| Invite new members | ✓ | ✓ | ✗ | ✗ |
| Remove members | ✓ | ✓ | ✗ | ✗ |
| Change member roles | ✓ | ✓ | ✗ | ✗ |
| View audit logs | ✓ | ✓ | ✗ | ✗ |
| **Billing** |
| View billing details | ✓ | ✓ | ✗ | ✗ |
| Manage subscriptions | ✓ | ✗ | ✗ | ✗ |
| Update payment methods | ✓ | ✗ | ✗ | ✗ |
| **CRM Records** |
| View all accounts/contacts/leads | ✓ | ✓ | ✓ | ✓ |
| Create accounts/contacts/leads | ✓ | ✓ | ✓ | ✗ |
| Edit assigned records | ✓ | ✓ | ✓ | ✗ |
| Edit all records | ✓ | ✓ | ✗ | ✗ |
| Delete records | ✓ | ✓ | ✗ | ✗ |
| Bulk operations | ✓ | ✓ | ✗ | ✗ |
| Export data | ✓ | ✓ | ✓ | ✓ |
| **Projects & Tasks** |
| View all projects | ✓ | ✓ | ✓ | ✓ |
| Create projects | ✓ | ✓ | ✓ | ✗ |
| Edit assigned projects | ✓ | ✓ | ✓ | ✗ |
| Delete projects | ✓ | ✓ | ✗ | ✗ |
| **Documents** |
| View documents | ✓ | ✓ | ✓ | ✓ |
| Upload documents | ✓ | ✓ | ✓ | ✗ |
| Delete documents | ✓ | ✓ | ✗ | ✗ |
| **Invoices** |
| View invoices | ✓ | ✓ | ✓ | ✓ |
| Create/edit invoices | ✓ | ✓ | ✓ | ✗ |
| Delete invoices | ✓ | ✓ | ✗ | ✗ |

- **Permission Enforcement Layers:**
  1. **Middleware Layer (middleware.tsx):** Check JWT token, extract organizationId and role, attach to request context
  2. **API Route Layer:** Use helper function `requireRole(['ADMIN', 'OWNER'])` at route start
  3. **Server Action Layer:** Pass user/org context from middleware, validate role before DB operations
  4. **Database Query Layer:** Prisma middleware auto-injects `organizationId` filter on all queries

- **Permission Helper Functions (lib/permissions.ts):**
```typescript
export function hasPermission(userRole: OrganizationRole, permission: Permission): boolean {
  const roleHierarchy = { OWNER: 4, ADMIN: 3, MEMBER: 2, VIEWER: 1 };
  const permissionRoles: Record<Permission, OrganizationRole[]> = {
    'organization:delete': ['OWNER'],
    'billing:manage': ['OWNER'],
    'users:invite': ['OWNER', 'ADMIN'],
    'records:edit_all': ['OWNER', 'ADMIN'],
    'records:delete': ['OWNER', 'ADMIN'],
    'records:create': ['OWNER', 'ADMIN', 'MEMBER'],
    'records:view': ['OWNER', 'ADMIN', 'MEMBER', 'VIEWER'],
    // ... 30+ permissions
  };
  return permissionRoles[permission].includes(userRole);
}

export function requireRole(allowedRoles: OrganizationRole[], userRole: OrganizationRole) {
  if (!allowedRoles.includes(userRole)) {
    throw new Error('Insufficient permissions');
  }
}
```

**UI/UX Considerations:**
- Role badges displayed next to user names in member lists (Owner: gold, Admin: blue, Member: gray, Viewer: light gray)
- Disabled UI elements for actions user lacks permission for (with tooltip explaining required role)
- Permission-denied error messages specify required role: "This action requires Admin or Owner role"
- Settings pages show/hide sections based on role (billing section hidden from Members/Viewers)

---

#### Feature 3: Team Invitation System
**Description:** Email-based invitation workflow enabling Owners/Admins to invite new team members with specific roles. Invitations expire after 7 days and support resending, cancellation, and tracking.

**User Stories:**
- As an owner, I want to invite my team via email so they can join my organization
- As an admin, I want to set the role (Admin, Member, Viewer) when inviting so users get correct permissions
- As an invitee, I want to accept an invitation link without creating a duplicate account
- As an owner, I want to cancel pending invitations if someone's employment offer is rescinded

**Specifications:**
- **OrganizationInvitations Model:**
  - `id`: ObjectId primary key
  - `organizationId`: Foreign key to Organizations (required)
  - `email`: Invitee email address (required, indexed)
  - `role`: OrganizationRole (ADMIN, MEMBER, VIEWER) - default MEMBER (cannot invite as OWNER)
  - `token`: Unique invitation token (UUID v4, indexed)
  - `status`: Enum (PENDING, ACCEPTED, EXPIRED, CANCELLED) - default PENDING
  - `invitedBy`: User ObjectId (who sent invitation)
  - `expiresAt`: DateTime (default: now() + 7 days)
  - `createdAt`, `updatedAt`: Audit timestamps

- **Invitation Creation Workflow:**
  1. Owner/Admin navigates to Settings → Team → Invite Member
  2. Form fields: Email (required, email validation), Role (dropdown: Admin/Member/Viewer)
  3. System checks:
     - User sending invite has OWNER or ADMIN role (RBAC check)
     - Email not already a member of organization
     - No existing PENDING invitation for this email
  4. Create invitation record: token=UUID(), status=PENDING, expiresAt=now()+7days
  5. Send email to invitee:
     - Subject: "[Inviter Name] invited you to join [Organization Name] on NextCRM"
     - Body: "You've been invited as [Role]. Click here to accept: [URL with token]"
     - Expiration notice: "This invitation expires in 7 days"
  6. Show success toast: "Invitation sent to [email]"

- **Invitation Acceptance Workflow:**
  1. Invitee clicks email link: `/accept-invitation?token=[UUID]`
  2. System validates token:
     - Token exists in database
     - Status = PENDING
     - expiresAt > now() (not expired)
  3. If invitee has existing account:
     - Show modal: "Accept invitation as [existing email]?"
     - On confirm: Update user record: `organizationId`=[new org], `organization_role`=[invited role]
     - Update invitation status = ACCEPTED
  4. If invitee does not have account:
     - Redirect to registration form with email pre-filled
     - On registration complete: Same as step 3
  5. Send confirmation email to inviter: "[Email] accepted your invitation"
  6. Redirect to new organization dashboard

- **Invitation Expiration (Automated):**
  - Daily cron job scans for invitations where `expiresAt` < now() AND status = PENDING
  - Update status = EXPIRED
  - Send email to inviter: "Invitation to [email] has expired"

- **Invitation Cancellation:**
  - Owner/Admin clicks "Cancel" button next to pending invitation
  - Update status = CANCELLED
  - Send email to invitee: "Invitation to [Organization Name] has been cancelled"

- **Invitation Resending:**
  - If invitation is EXPIRED or CANCELLED, Owner/Admin can click "Resend"
  - Create new invitation record with new token and new expiresAt
  - Original invitation status remains (for audit trail)

**UI/UX Considerations:**
- Pending invitations list on Team settings page showing email, role, invited by, expiration countdown ("Expires in 3 days")
- Resend/Cancel action buttons for each invitation
- Invitation acceptance page branded with organization name and inviter details
- Clear error messages for expired or invalid tokens

---

#### Feature 4: Multi-Organization User Support
**Description:** Allow single users to belong to multiple organizations with different roles in each, enabling agency/consultant workflows and personal + work organization separation.

**User Stories:**
- As a consultant, I want to be a member of 5 client organizations so I can manage their CRMs from one account
- As a user, I want to switch between organizations without logging out so I can work efficiently
- As a user, I want to see which organization I'm currently working in so I don't make changes in the wrong workspace
- As an organization owner, I want to see all organizations where I'm a member so I can manage my access

**Specifications:**
- **User Model Multi-Org Fields:**
  - `organizationId`: Current active organization (nullable, user can belong to no org initially)
  - `organization_role`: Role in current organization (OWNER, ADMIN, MEMBER, VIEWER)
  - Many-to-many relationship: User can be in multiple Organizations via separate join mechanism

- **Multi-Organization Tracking:**
  - When user accepts invitation to new org, do NOT overwrite `organizationId`
  - Instead, add user to organization's `users` array (many-to-many relation)
  - User can belong to unlimited organizations (no hard limit)

- **Organization Switching:**
  1. User clicks organization switcher dropdown in top nav
  2. Dropdown shows all organizations user belongs to:
     - Organization name
     - User's role in that org (badge)
     - "Active" indicator for current org
  3. User clicks different organization
  4. System updates user session: `organizationId` = selected org, `organization_role` = role in that org
  5. Page refreshes to show new organization's data
  6. All subsequent API calls filtered to new organizationId

- **Session Management:**
  - JWT token stores: userId, organizationId (current), organization_role (current)
  - On organization switch: Issue new JWT with updated organizationId/role
  - Middleware validates organizationId on every request

- **Personal Organization Creation:**
  - New users can create "Personal" organization during signup
  - Users can create additional organizations anytime from switcher dropdown ("+ New Organization")
  - When creating new org, user automatically becomes OWNER

**UI/UX Considerations:**
- Organization switcher dropdown in top-left corner of navigation bar (always visible)
- Active organization highlighted in dropdown with checkmark
- Role badge displayed next to each organization name in switcher
- Breadcrumb showing current organization name on all pages
- Clear visual distinction (background color change?) when switching organizations

---

#### Feature 5: Data Isolation & Security
**Description:** Multi-layered data isolation architecture ensuring zero cross-organization data leakage through database constraints, ORM middleware, API route guards, and integration testing.

**User Stories:**
- As an organization owner, I want absolute guarantee that other organizations cannot see my data
- As a system admin, I want automated tests proving data isolation so I can deploy with confidence
- As a compliance officer, I want audit proof that no cross-org queries have occurred

**Specifications:**
- **Database-Level Isolation:**
  - Every data model (except Users, Organizations) has `organizationId` field (required, indexed)
  - Prisma schema enforces `organizationId` foreign key with `onDelete: Cascade`
  - MongoDB indexes on `organizationId` for query performance

- **ORM-Level Isolation (Prisma Middleware):**
```typescript
// lib/prisma.ts
prisma.$use(async (params, next) => {
  const orgIdFromContext = getOrgIdFromContext(); // Extract from request context

  // Inject organizationId filter on all read queries
  if (params.action === 'findMany' || params.action === 'findFirst' || params.action === 'findUnique') {
    params.args.where = {
      ...params.args.where,
      organizationId: orgIdFromContext,
    };
  }

  // Inject organizationId on all create operations
  if (params.action === 'create') {
    params.args.data.organizationId = orgIdFromContext;
  }

  return next(params);
});
```

- **Middleware-Level Isolation:**
  - Extract organizationId from JWT token on every request
  - Validate organizationId matches user's current organization
  - Reject requests with mismatched organizationId (401 Unauthorized)

- **API Route Guards:**
  - All API routes start with: `const { organizationId, role } = await getUserContext(req);`
  - All database queries explicitly include: `where: { organizationId }`
  - Never trust organizationId from request body/params (always use token value)

- **Integration Testing:**
  - Create 2 test organizations (Org A, Org B)
  - Create test data in each org
  - Attempt cross-org queries (e.g., User A queries Org B data)
  - Assert: All queries return 0 results or 401 errors
  - Run tests in CI/CD on every commit

- **Audit Logging:**
  - Log all data access attempts with organizationId, userId, resource, action
  - Alert on any queries without organizationId filter (indicates potential bug)
  - Monthly security review: Scan audit logs for suspicious cross-org access patterns

**UI/UX Considerations:**
- No UI elements (this is backend security)
- Error messages never leak info about other orgs ("Record not found" instead of "Access denied to Org B")

---

### 4.2 Secondary Features

#### Feature 6: Organization Settings & Configuration
**Description:** Admin panel for organization-level settings including name, logo, modules enabled, custom fields, and timezone.

**Specifications:**
- Settings stored in `Organizations.settings` JSON field
- Editable by Owner/Admin only
- Settings include: organization logo URL, timezone, date format, default currency, enabled modules array

#### Feature 7: Organization Usage Tracking
**Description:** Track resource consumption per organization for billing and quota enforcement.

**Specifications:**
- `OrganizationUsage` model tracks: usersCount, contactsCount, storageBytes, projectsCount, documentsCount, etc.
- Updated in real-time or via nightly batch job
- Used to enforce plan limits (e.g., FREE plan limited to 5 users)

#### Feature 8: Audit Logging
**Description:** Complete audit trail of all organization-level actions for security and compliance.

**Specifications:**
- `AuditLog` model captures: action (CREATE, UPDATE, DELETE, INVITE, REMOVE), resource, resourceId, changes (JSON diff), userId, organizationId, timestamp
- Retention: 7 years for SOC 2 compliance
- Searchable by date range, user, action type, resource

#### Feature 9: Session Management
**Description:** Track active user sessions with device, location, IP address for security monitoring.

**Specifications:**
- `UserSession` model tracks: token (JWT), ipAddress, userAgent, device, location, isActive, lastActivityAt, expiresAt
- Allow users to view active sessions and revoke individual sessions
- Auto-expire sessions after 30 days of inactivity

---

## 5. Non-Functional Requirements

### 5.1 Performance
- **Organization Switching:** Switch between organizations in <500ms (update JWT, refresh UI)
- **Data Query Performance:** All organizationId-filtered queries return in <300ms for databases up to 1M records
- **Invitation Email Delivery:** Invitation emails sent within 30 seconds of creation
- **Concurrent Users:** Support 10,000 users across 1,000 organizations without performance degradation
- **Database Indexes:** All models have compound indexes on (organizationId, createdAt) for optimal query performance

### 5.2 Security
- **Data Isolation Testing:** 100% of integration tests pass proving zero cross-org data leakage
- **JWT Security:** Tokens signed with HS256, 24-hour expiration, refresh token rotation
- **Password Requirements:** Minimum 8 characters, 1 uppercase, 1 lowercase, 1 number (for credential-based auth)
- **Invitation Token Security:** UUID v4 tokens (128-bit entropy), HTTPS-only links, 7-day expiration
- **RBAC Enforcement:** 100% of API routes validate user role before operations
- **Audit Logging:** All organization-level actions logged with timestamp, user, IP address
- **Session Security:** Automatic session expiration after 30 days, revocation on password change

### 5.3 Scalability
- **Organizations:** Support up to 100,000 organizations in single database
- **Users per Organization:** No hard limit (largest org tested: 10,000 users)
- **Invitations:** Handle 1,000 simultaneous invitation sends without rate limiting
- **Database Sharding:** Architecture supports future horizontal scaling via MongoDB sharding on organizationId

### 5.4 Compliance
- **GDPR:**
  - Organization deletion provides 30-day right to withdraw consent
  - Audit logs prove data processing transparency
  - User can request data export of all their organization data
- **SOC 2 Type II:**
  - Audit logs retained for 7 years
  - Encryption at rest (MongoDB encryption) and in transit (TLS 1.3)
  - Automatic session expiration and revocation
- **Privacy Act:**
  - User email addresses not shared with other organizations
  - Invitation emails contain unsubscribe link

---

## 6. Acceptance Criteria

### Core Functionality
- [ ] User can create organization during signup with name and slug
- [ ] User can create additional organizations from organization switcher
- [ ] Owner can delete organization (soft delete with 30-day grace period)
- [ ] Owner can restore organization during grace period (before permanent deletion)
- [ ] Cron job permanently deletes organizations after 30-day grace period
- [ ] Owner can transfer ownership to existing Admin (requires acceptance)
- [ ] Owner/Admin can invite new members via email with role assignment (Admin, Member, Viewer)
- [ ] Invitee receives email with unique invitation link
- [ ] Invitee can accept invitation (creates account if new user, joins org if existing user)
- [ ] Invitation expires after 7 days (automated cron job)
- [ ] Owner/Admin can cancel pending invitation
- [ ] Owner/Admin can resend expired invitation (creates new token)
- [ ] User can belong to multiple organizations with different roles
- [ ] User can switch between organizations via dropdown (updates session, refreshes UI)
- [ ] Organization switcher shows all orgs user belongs to with role badges
- [ ] All data queries automatically filtered by organizationId (Prisma middleware)
- [ ] API routes validate user role before operations (RBAC enforcement)
- [ ] Users can view team members list with roles
- [ ] Owner/Admin can change member roles (except cannot change Owner)
- [ ] Owner/Admin can remove members (user remains in system, removed from org)

### Security & Data Isolation
- [ ] Integration tests prove zero cross-org data leakage (User A cannot query Org B data)
- [ ] All database queries include organizationId filter (no unfiltered queries)
- [ ] Middleware validates organizationId from JWT on every request
- [ ] RBAC tests pass for all 30+ permissions (Owner/Admin/Member/Viewer)
- [ ] Viewer role cannot create, edit, or delete any records
- [ ] Member role cannot delete records or manage users
- [ ] Admin role cannot transfer ownership or manage billing
- [ ] Owner has full access to all operations
- [ ] Audit logs capture all organization-level actions (invite, remove, role change, deletion)
- [ ] Session tokens expire after 30 days of inactivity
- [ ] User can view active sessions and revoke individual sessions

### Performance
- [ ] Organization switching completes in <500ms (tested with network throttling)
- [ ] Data queries return in <300ms for database with 100K records per organization
- [ ] Invitation email sent within 30 seconds of creation
- [ ] Organization creation completes in <1 second (including OrganizationUsage record)

### Compliance
- [ ] Organization deletion workflow meets GDPR right to erasure (30-day grace period)
- [ ] Audit logs retained for 7 years (SOC 2 requirement)
- [ ] Invitation emails include unsubscribe link
- [ ] User can export all organization data in JSON format

---

## 7. Success Metrics

| Metric Category | Metric | Target | Measurement Method |
|----------------|--------|--------|-------------------|
| **Adoption** | Organizations created per month | 500+ | Database count of new orgs |
| **Engagement** | Average team size per organization | 5+ users | Mean usersCount from OrganizationUsage |
| **Invitation Conversion** | Invitation acceptance rate | >70% | (Accepted invitations / Total sent) * 100 |
| **Multi-Org Usage** | Users belonging to 2+ orgs | >20% | Count users with multiple org memberships |
| **Security** | Cross-org data leakage incidents | 0 | Audit log alerts + security reviews |
| **Performance** | Organization switch latency | <500ms (p95) | DataDog RUM tracking |
| **Data Quality** | Organizations with complete settings | >90% | Orgs with non-empty settings JSON |
| **Churn Prevention** | Organizations restored during grace period | >30% | (Restored orgs / Deleted orgs) * 100 |
| **Support Volume** | RBAC-related support tickets | <2 per 1000 users/month | Zendesk ticket tagging |

**Key Performance Indicators (KPIs):**
1. **Zero Security Incidents:** 0 reported cross-organization data breaches or leaks
2. **Team Collaboration Rate:** 80%+ of organizations have 2+ active users (multi-user adoption)
3. **Permission Clarity:** <5 support tickets per month about "what can I do with my role?"

---

## 8. Dependencies

### Internal Dependencies
| Dependency | Type | Status | Impact if Delayed |
|-----------|------|--------|------------------|
| User Authentication (NextAuth.js) | Hard | Complete | Cannot issue JWT tokens with organizationId/role claims |
| Database Schema (Prisma) | Hard | Complete | Organizations model must exist before multi-tenancy |
| Email Service (Resend) | Hard | Complete | Cannot send invitation emails |
| Session Management | Hard | In Progress | Organization switching won't persist across refreshes |

### External Dependencies
| Dependency | Provider | SLA | Risk Level |
|-----------|----------|-----|-----------|
| MongoDB Atlas | MongoDB Inc | 99.95% uptime | Low (managed service with backups) |
| NextAuth.js | Vercel | Community support | Low (mature OSS, v5 stable) |
| Prisma ORM | Prisma Labs | Community support | Low (stable 5.x release) |
| Resend Email API | Resend | 99.9% uptime | Medium (backup: SendGrid integration) |

### Technical Dependencies
- **Database:** MongoDB 6.0+ with full-text search indexes
- **APIs:**
  - `/api/organizations` - CRUD operations
  - `/api/organizations/[id]/members` - User management
  - `/api/invitations` - Invitation lifecycle
- **Infrastructure:**
  - Vercel Edge Runtime for middleware (organization filtering)
  - Cron jobs via Vercel Cron or separate scheduler for invitation expiration, org deletion

---

## 9. Out of Scope

The following items are explicitly **NOT** included in this release:

- [ ] Single Sign-On (SSO) via SAML 2.0 or OAuth 2.0 (future: enterprise feature)
- [ ] Custom role creation beyond 4 default roles (future: advanced RBAC)
- [ ] Granular field-level permissions (e.g., hide specific fields from Members) (future: advanced RBAC)
- [ ] Organization templates with pre-configured settings and data (future: enterprise onboarding)
- [ ] White-label organization branding (custom domains, logos in emails) (future: enterprise feature)
- [ ] Cross-organization data sharing or collaboration (future: partner ecosystem)
- [ ] Two-factor authentication (2FA) enforcement at organization level (future: security enhancement)
- [ ] IP whitelisting for organization access (future: enterprise security)
- [ ] Organization-level API keys for integrations (future: developer platform)
- [ ] Advanced audit log analytics and alerting (future: security monitoring dashboard)
- [ ] Organization cloning or duplication (future: agency workflows)
- [ ] Hierarchical organizations (parent-child org relationships) (future: enterprise hierarchies)

**Future Considerations:**
- SSO integration for enterprises (SAML, Azure AD, Okta)
- Custom role builder allowing orgs to create roles beyond default 4
- Organization marketplace for templates, integrations, and add-ons

---

## 10. Risks & Mitigation

| Risk | Probability | Impact | Mitigation Strategy | Owner |
|------|------------|--------|-------------------|-------|
| **Cross-Org Data Leakage:** Bug in Prisma middleware allows user to query other org's data | Low | Critical | Comprehensive integration tests covering all models, manual security audit, bug bounty program post-launch | Security Engineer |
| **RBAC Complexity:** Developers add endpoints without proper role checks | High | High | Code review checklist requiring permission checks, automated linting to detect missing `requireRole()` calls | Engineering Lead |
| **Invitation Email Delivery:** Emails flagged as spam, invitees don't receive them | Medium | High | Use reputable email service (Resend), implement SPF/DKIM/DMARC, monitor bounce rates, add fallback "copy invitation link" option | Backend Engineer |
| **Performance Degradation:** Large organizations (1000+ users) experience slow member list loading | Medium | Medium | Implement pagination on member lists, add Redis caching for organization metadata, optimize database indexes | Performance Engineer |
| **Ownership Transfer Disputes:** Users dispute ownership transfers claiming they didn't authorize | Low | High | Require email confirmation from both parties, audit log all transfers with IP addresses, add cooldown period (24 hours) | Product Manager |
| **Session Hijacking:** Attacker steals JWT token and accesses organization | Low | Critical | Short JWT expiration (24h), refresh token rotation, anomaly detection (unusual IP/location), session revocation on password change | Security Engineer |

**Risk Categories:**
- **Security Risks:** Data isolation failures, RBAC bypasses, session hijacking
- **Usability Risks:** Invitation friction (email delivery, expiration), role confusion
- **Technical Risks:** Database performance at scale, Prisma middleware bugs
- **Legal Risks:** GDPR compliance failures, data retention violations

---

## 11. Launch Requirements

### Pre-Launch Checklist

#### Development
- [ ] All acceptance criteria met (100% of checkboxes in section 6)
- [ ] Code review completed by 2+ senior engineers (security-focused review)
- [ ] Unit tests passing with >95% coverage on RBAC logic and data isolation
- [ ] Integration tests passing for all cross-org data leakage scenarios (100+ test cases)
- [ ] Performance testing completed with 1,000 organizations, 10,000 users (meets latency targets)
- [ ] Security penetration testing by external firm (focus on RBAC bypasses, data leakage)
- [ ] GDPR compliance audit completed (30-day deletion grace period, audit logs, data export)

#### QA
- [ ] Functional testing completed for all organization lifecycle workflows (create, delete, restore, transfer)
- [ ] Functional testing completed for all invitation workflows (send, accept, expire, cancel, resend)
- [ ] RBAC testing completed for all 30+ permissions (Owner, Admin, Member, Viewer)
- [ ] Multi-organization testing completed (user switches between orgs, data properly isolated)
- [ ] Cross-browser testing (Chrome, Firefox, Safari, Edge - latest 2 versions)
- [ ] Mobile responsive testing for organization switcher and team management UI
- [ ] Load testing passed with 10,000 concurrent users across 1,000 organizations

#### Documentation
- [ ] User documentation: "Getting Started with Organizations" guide (with screenshots)
- [ ] User documentation: "Understanding Roles and Permissions" reference
- [ ] User documentation: "Inviting Team Members" tutorial
- [ ] Admin guide: "Managing Organizations at Scale"
- [ ] Developer documentation: RBAC implementation guide for adding new features
- [ ] API documentation: Organizations and invitations endpoints
- [ ] Security documentation: Data isolation architecture and testing methodology

#### Operations
- [ ] Monitoring configured: Organization creation rate, invitation acceptance rate, org deletion rate
- [ ] Alerting configured: Cross-org query attempts, RBAC permission denials (anomaly detection)
- [ ] Database indexes validated: (organizationId, createdAt) indexes on all models
- [ ] Cron jobs deployed and tested: Invitation expiration, organization deletion
- [ ] Backup and restore procedure tested for organization data recovery
- [ ] Incident response runbook ready: "Data Leakage Response Playbook"

#### Legal & Compliance
- [ ] Privacy policy updated to explain multi-tenancy and data isolation
- [ ] Terms of service updated with organization deletion policy (30-day grace period)
- [ ] GDPR compliance verified: Data export, deletion workflows, audit logs
- [ ] SOC 2 audit checklist completed: Audit log retention, encryption, access controls
- [ ] Data Processing Agreement (DPA) template ready for enterprise customers

#### Go-to-Market
- [ ] Marketing materials: "Secure Multi-Tenancy" landing page explaining data isolation
- [ ] Sales enablement: Competitive positioning vs. shared-database CRMs
- [ ] Customer support training: RBAC troubleshooting, invitation issues
- [ ] Beta testing completed with 20 organizations (5 single-user, 10 teams, 5 agencies)
- [ ] Feedback incorporated: Simplified permission names, improved error messages

---

## Appendix

### A. RBAC Permission Reference

**Complete 30+ Permission List:**
1. `organization:view` - View organization settings
2. `organization:update` - Update organization settings
3. `organization:delete` - Delete organization
4. `organization:transfer` - Transfer ownership
5. `modules:manage` - Enable/disable modules
6. `users:view` - View organization members
7. `users:invite` - Invite new members
8. `users:remove` - Remove members
9. `users:role_change` - Change member roles
10. `billing:view` - View billing details
11. `billing:manage` - Manage subscriptions and payment methods
12. `records:view_all` - View all CRM records
13. `records:view_assigned` - View assigned records
14. `records:create` - Create new records
15. `records:edit_assigned` - Edit assigned records
16. `records:edit_all` - Edit all records
17. `records:delete` - Delete records
18. `records:bulk_operations` - Perform bulk operations
19. `records:export` - Export data to CSV/JSON
20. `projects:view` - View all projects
21. `projects:create` - Create projects
22. `projects:edit_assigned` - Edit assigned projects
23. `projects:edit_all` - Edit all projects
24. `projects:delete` - Delete projects
25. `documents:view` - View documents
26. `documents:upload` - Upload documents
27. `documents:delete` - Delete documents
28. `invoices:view` - View invoices
29. `invoices:create` - Create/edit invoices
30. `invoices:delete` - Delete invoices
31. `audit_logs:view` - View audit logs
32. `settings:view` - View organization settings
33. `settings:update` - Update organization settings

### B. Database Schema

See [prisma/schema.prisma](../../prisma/schema.prisma):
- `Organizations` model (lines 62-96)
- `OrganizationInvitations` model (lines 98-118)
- `OrganizationUsage` model (lines 867-886)
- `AuditLog` model (lines 908-930)
- `UserSession` model (lines 933-952)

### C. API Specifications

**Key Endpoints:**
- `POST /api/organizations` - Create organization
- `GET /api/organizations/[id]` - Get organization details
- `PUT /api/organizations/[id]` - Update organization
- `DELETE /api/organizations/[id]` - Soft delete organization (schedule for deletion)
- `POST /api/organizations/[id]/restore` - Restore deleted organization
- `POST /api/organizations/[id]/transfer-ownership` - Transfer ownership
- `GET /api/organizations/[id]/members` - List organization members
- `POST /api/organizations/[id]/members` - Invite member
- `PUT /api/organizations/[id]/members/[userId]` - Update member role
- `DELETE /api/organizations/[id]/members/[userId]` - Remove member
- `POST /api/invitations` - Create invitation
- `GET /api/invitations/[token]` - Get invitation details
- `POST /api/invitations/[token]/accept` - Accept invitation
- `POST /api/invitations/[id]/cancel` - Cancel invitation
- `POST /api/invitations/[id]/resend` - Resend invitation
- `POST /api/auth/switch-organization` - Switch active organization

### D. Integration Test Examples

**Cross-Org Data Isolation Test:**
```typescript
describe('Multi-Tenancy Data Isolation', () => {
  it('should prevent User A from accessing Org B data', async () => {
    // Setup: Create 2 orgs with test data
    const orgA = await createTestOrg('Org A');
    const orgB = await createTestOrg('Org B');
    const userA = await createTestUser(orgA.id, 'MEMBER');
    await createTestAccount(orgB.id, 'Secret Account');

    // Test: User A attempts to query Org B account
    const token = generateJWT(userA.id, orgA.id, 'MEMBER');
    const response = await fetch('/api/crm/accounts', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const accounts = await response.json();

    // Assert: User A sees 0 accounts (cannot see Org B data)
    expect(accounts.length).toBe(0);
  });
});
```

### E. Related Documents
- [Technical Design: Data Isolation Architecture](../ARCHITECTURE.md)
- [Security Architecture: RBAC Implementation](../RBAC.md)
- [Compliance Documentation: GDPR & SOC 2 Checklist](../COMPLIANCE.md)

---

## Change Log

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-17 | Product Team | Initial draft based on existing NextCRM codebase |

---

## Approval

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Product Manager | TBD | | |
| Engineering Lead | TBD | | |
| Security Lead | TBD | | |
| Legal | TBD | | |
