# RBAC Implementation Checklist

**Purpose:** Track implementation progress
**Format:** Expandable checklist
**Last Updated:** November 4, 2025

---

## Pre-Implementation Preparation

### Understanding & Planning
- [ ] Read RBAC_AUDIT_SUMMARY.md (5 min)
- [ ] Read RBAC_AUDIT_REPORT.md (30 min)
- [ ] Read PERMISSION_MATRIX.md (15 min)
- [ ] Read RBAC_DEVELOPER_GUIDE.md (30 min)
- [ ] Team meeting to discuss plan (60 min)
- [ ] Assign responsibilities
- [ ] Schedule sprints
- [ ] Set up monitoring

### Environment Preparation
- [ ] Create feature flag `ENABLE_RBAC_ENFORCEMENT`
- [ ] Set up staging environment
- [ ] Configure monitoring and alerting
- [ ] Create rollback procedure documentation
- [ ] Set up test database
- [ ] Verify git workflow

---

## Phase 1: Critical Fixes (Week 1) - 8 hours

### Task 1: Fix Session Role Population (2 hours)

**File:** `lib/auth.ts`
**What:** Populate `session.user.organization_role` in session callback

- [ ] Update session callback to fetch organization_role
- [ ] Test with Google OAuth provider
- [ ] Test with GitHub OAuth provider
- [ ] Test with Credentials provider
- [ ] Verify role is accessible in routes
- [ ] Test with multiple logins

**Code Pattern:**
```typescript
// Fetch user with organization role
const user = await prismadb.users.findUnique({
  where: { id: user.id },
  select: { organization_role: true }
});
session.user.organization_role = user?.organization_role;
```

**Verification:**
- [ ] Session contains organization_role
- [ ] All auth methods work
- [ ] No null values for role

---

### Task 2: Protect Billing - Checkout Session (2 hours)

**File:** `app/api/billing/create-checkout-session/route.ts`
**What:** Add OWNER-only check

- [ ] Import `checkBillingAccess` from helpers
- [ ] Add permission check before Stripe call
- [ ] Return 403 if not owner
- [ ] Test with OWNER role → Should succeed
- [ ] Test with ADMIN role → Should fail
- [ ] Test with MEMBER role → Should fail
- [ ] Test with VIEWER role → Should fail
- [ ] Verify audit logging

**Code Pattern:**
```typescript
import { checkBillingAccess } from "@/lib/permission-helpers";

const check = await checkBillingAccess(user.id, user.organizationId);
if (!check.allowed) {
  return NextResponse.json(
    createPermissionDeniedResponse(check),
    { status: 403 }
  );
}
```

**Verification:**
- [ ] OWNER can access
- [ ] Others get 403
- [ ] Audit log entries created

---

### Task 3: Protect Billing - Portal Session (2 hours)

**File:** `app/api/billing/create-portal-session/route.ts`
**What:** Add OWNER-only check

- [ ] Import helpers
- [ ] Add permission check
- [ ] Test all roles
- [ ] Verify audit logging

**Verification:**
- [ ] OWNER can access
- [ ] Others get 403
- [ ] Same pattern as Task 2

---

### Task 4: Protect Organization Data Endpoints (2 hours)

**Files:**
- `app/api/organization/audit-logs/route.ts`
- `app/api/organization/export-data/route.ts`

**What:** Add ADMIN-only check to both

- [ ] Import `checkManageSettingsPermission` from helpers
- [ ] Add permission check to GET /audit-logs
- [ ] Add permission check to GET /export-data
- [ ] Test with OWNER role → Should succeed
- [ ] Test with ADMIN role → Should succeed
- [ ] Test with MEMBER role → Should fail
- [ ] Test with VIEWER role → Should fail
- [ ] Verify audit logging

**Code Pattern:**
```typescript
import { checkManageSettingsPermission } from "@/lib/permission-helpers";

const check = await checkManageSettingsPermission(user.id, user.organizationId);
if (!check.allowed) {
  return NextResponse.json(
    createPermissionDeniedResponse(check),
    { status: 403 }
  );
}
```

**Verification:**
- [ ] ADMIN+ can access
- [ ] MEMBER/VIEWER get 403
- [ ] Audit logs recorded

---

### Phase 1 Validation

- [ ] All 5 routes protected
- [ ] Session role properly populated
- [ ] All role levels tested
- [ ] Audit logging working
- [ ] No critical vulnerabilities remain
- [ ] Staging deployment successful
- [ ] Monitoring configured
- [ ] Ready for Phase 2

---

## Phase 2: CRM & Project Operations (Week 2) - 28 hours

### Task 1: CRM Account Operations (6 hours)

**Files:**
- `app/api/crm/account/route.ts` (POST, PUT)
- `app/api/crm/account/[accountId]/route.ts` (DELETE)

**POST - Create Account:**
- [ ] Add `checkWritePermission` check
- [ ] Test VIEWER → 403
- [ ] Test MEMBER → 200
- [ ] Test ADMIN → 200
- [ ] Test OWNER → 200

**PUT - Update Account:**
- [ ] Add `checkWritePermission` check
- [ ] Same testing as POST

**DELETE - Delete Account:**
- [ ] Add `canModifyResource` check
- [ ] Test VIEWER → 403
- [ ] Test MEMBER own → 200
- [ ] Test MEMBER other → 403
- [ ] Test ADMIN any → 200
- [ ] Verify createdBy field exists

**Code Pattern for DELETE:**
```typescript
import { canModifyResource } from "@/lib/permission-helpers";

const check = await canModifyResource(
  user.id,
  user.organizationId,
  params.accountId,
  "crm_Accounts",
  "delete"
);
if (!check.allowed) {
  return NextResponse.json(
    createPermissionDeniedResponse(check),
    { status: 403 }
  );
}
```

**Verification:**
- [ ] All operations protected
- [ ] Ownership validated on delete
- [ ] All roles tested

---

### Task 2: CRM Leads Operations (4 hours)

**Files:**
- `app/api/crm/leads/route.ts` (POST, PUT)
- `app/api/crm/leads/[leadId]/route.ts` (DELETE)

- [ ] Add permission checks to POST
- [ ] Add permission checks to PUT
- [ ] Add ownership checks to DELETE
- [ ] Test all role levels
- [ ] Verify ownership validation

**Same pattern as accounts**

---

### Task 3: CRM Contacts Operations (4 hours)

**Files:**
- `app/api/crm/contacts/route.ts` (POST, PUT)
- `app/api/crm/contacts/[contactId]/route.ts` (DELETE)

- [ ] Same implementation as leads

---

### Task 4: CRM Opportunities Operations (4 hours)

**Files:**
- `app/api/crm/opportunity/route.ts` (POST, PUT)
- `app/api/crm/opportunity/[opportunityId]/route.ts` (DELETE)

- [ ] Same implementation pattern

---

### Task 5: Project Operations (6 hours)

**Files:**
- `app/api/projects/route.ts` (POST, PUT)
- `app/api/projects/[id]/route.ts` (DELETE)
- `app/api/projects/sections/route.ts` (POST)
- `app/api/projects/sections/[id]/route.ts` (PUT, DELETE)
- `app/api/projects/tasks/create-task/route.ts` (POST)
- `app/api/projects/tasks/[id]/route.ts` (PUT, DELETE)

- [ ] Add permission checks to all POST operations
- [ ] Add permission checks to all PUT operations
- [ ] Add ownership checks to all DELETE operations
- [ ] Test all role levels
- [ ] Verify ownership validation

**Verification:**
- [ ] All project routes protected
- [ ] Ownership checks working
- [ ] Cross-org access prevented

---

### Phase 2 Validation

- [ ] 20+ CRM & project routes updated
- [ ] All role levels tested
- [ ] Ownership validation working
- [ ] Audit logging functional
- [ ] Performance acceptable
- [ ] Ready for Phase 3

---

## Phase 3: Complete Coverage & Testing (Week 3) - 36 hours

### Task 1: Document Operations (2 hours)

**File:** `app/api/documents/route.ts` and `[id]/route.ts`

- [ ] Add permission checks to POST
- [ ] Add permission checks to DELETE
- [ ] Add ownership validation
- [ ] Test all roles

---

### Task 2: Invoice Operations (2 hours)

**File:** `app/api/invoice/route.ts` and `[id]/route.ts`

- [ ] Add permission checks to POST
- [ ] Add permission checks to DELETE
- [ ] Add ownership validation
- [ ] Test all roles

---

### Task 3: Server Actions Protection (12 hours)

**Locations:** `actions/crm/`, `actions/projects/`, `actions/organization/`

For each server action:
- [ ] Verify authentication
- [ ] Add permission check
- [ ] Add ownership check (if applicable)
- [ ] Test with different roles

**Server Actions to Review:**
- [ ] actions/crm/*/create
- [ ] actions/crm/*/update
- [ ] actions/crm/*/delete
- [ ] actions/projects/*/create
- [ ] actions/projects/*/update
- [ ] actions/projects/*/delete
- [ ] actions/organization/*/manage
- [ ] Other sensitive actions

---

### Task 4: Comprehensive Audit Logging (8 hours)

**Files:** Multiple routes

- [ ] Verify all permission denials are logged
- [ ] Add logging to sensitive operations
- [ ] Add logging to team member changes
- [ ] Create audit log viewer query
- [ ] Test log entries
- [ ] Verify timestamp accuracy
- [ ] Check log retention

**Operations to Log:**
- [ ] All permission denials (auto-logged by helpers)
- [ ] Team member invitations
- [ ] Role assignments
- [ ] Member removals
- [ ] Data exports
- [ ] Billing operations
- [ ] Organization deletions

---

### Task 5: RBAC Test Suite (12 hours)

**Create test files:**
- [ ] `tests/integration/rbac-crm.test.ts`
- [ ] `tests/integration/rbac-projects.test.ts`
- [ ] `tests/integration/rbac-billing.test.ts`
- [ ] `tests/integration/rbac-team.test.ts`
- [ ] `tests/integration/rbac-ownership.test.ts`

**For each test file:**
- [ ] Test VIEWER cannot write/delete
- [ ] Test MEMBER can read
- [ ] Test MEMBER can create
- [ ] Test MEMBER cannot delete others'
- [ ] Test ADMIN can do everything
- [ ] Test OWNER can do everything
- [ ] Test cross-org access blocked
- [ ] Test audit logging

**Test Template:**
```typescript
describe("RBAC - CRM Accounts", () => {
  it("VIEWER cannot create account", async () => {
    const result = await createAccount(viewerUser, {...});
    expect(result).toHaveProperty("error");
    expect(result.code).toBe("INSUFFICIENT_PERMISSIONS");
  });

  it("MEMBER can create account", async () => {
    const result = await createAccount(memberUser, {...});
    expect(result).toHaveProperty("success", true);
  });

  it("MEMBER cannot delete other's account", async () => {
    const result = await deleteAccount(memberUser, otherUserAccount.id);
    expect(result).toHaveProperty("error");
  });

  it("ADMIN can delete any account", async () => {
    const result = await deleteAccount(adminUser, memberUserAccount.id);
    expect(result).toHaveProperty("success", true);
  });
});
```

---

### Phase 3 Validation

- [ ] 100+ document & invoice routes checked
- [ ] 15+ server actions protected
- [ ] Audit logging comprehensive
- [ ] Test coverage >90%
- [ ] All tests passing
- [ ] Ready for Phase 4 & deployment

---

## Phase 4: Polish & Optimization (Week 4+) - 34 hours

### Task 1: UI Permission Gates (8 hours)

**File:** `hooks/use-permissions.ts` (NEW)

- [ ] Create usePermissions hook
- [ ] Export helper functions
- [ ] Add to components
- [ ] Test on key UI elements
- [ ] Document usage

**Hook Methods:**
- [ ] `can(permission)` - Can user perform action?
- [ ] `canCreateItems` - Can create?
- [ ] `canDeleteItems` - Can delete?
- [ ] `canManageTeam` - Can manage team?
- [ ] `isAdmin` - Is admin?
- [ ] `isOwner` - Is owner?

---

### Task 2: Admin Dashboard (12 hours)

**Page:** `app/[locale]/(routes)/admin/team/page.tsx`

- [ ] List all team members
- [ ] Show role for each member
- [ ] Allow role changes (OWNER only)
- [ ] Allow member removal (ADMIN+)
- [ ] Show member status
- [ ] Show last login
- [ ] Invite new members (ADMIN+)

---

### Task 3: Audit Log Viewer (8 hours)

**Page:** `app/[locale]/(routes)/admin/audit-logs/page.tsx`

- [ ] Display permission denial events
- [ ] Filter by action type
- [ ] Filter by user
- [ ] Filter by date range
- [ ] Show IP address
- [ ] Show user agent
- [ ] Export logs

---

### Task 4: Performance Optimization (6 hours)

- [ ] Cache permission checks (Redis)
- [ ] Batch permission checks
- [ ] Optimize database queries
- [ ] Monitor query performance
- [ ] Profile API routes
- [ ] Identify bottlenecks
- [ ] Implement caching strategy

---

### Phase 4 Validation

- [ ] UI looks professional
- [ ] Admin dashboard functional
- [ ] Audit log viewer working
- [ ] Performance optimized
- [ ] Ready for production

---

## Deployment Preparation

### Pre-Deployment (Before Deploy)

- [ ] All phases complete
- [ ] All tests passing (>95%)
- [ ] Staging testing complete
- [ ] Performance meets SLA
- [ ] Monitoring configured
- [ ] Alerts configured
- [ ] Runbooks created
- [ ] Team trained
- [ ] Rollback plan documented
- [ ] Feature flag set to `false`

### Deployment Steps (Day Of)

1. **Pre-Deploy Checks**
   - [ ] Database backups taken
   - [ ] Monitoring active
   - [ ] On-call team ready
   - [ ] Communication channels open

2. **Initial Deploy**
   - [ ] Deploy code with ENABLE_RBAC_ENFORCEMENT=false
   - [ ] Verify deployment successful
   - [ ] Check error rates
   - [ ] Monitor for issues (24 hours)

3. **Phase 1 Rollout**
   - [ ] Enable for 10% of users
   - [ ] Monitor for issues (48 hours)
   - [ ] Check audit logs
   - [ ] Gather feedback

4. **Phase 2 Rollout**
   - [ ] Enable for 50% of users
   - [ ] Monitor for issues (48 hours)
   - [ ] Check performance impact

5. **Phase 3 Rollout**
   - [ ] Enable for 100% of users
   - [ ] Monitor for issues (72 hours)
   - [ ] Verify all routes protected

6. **Post-Deployment**
   - [ ] Remove feature flag
   - [ ] Monitor for 1 week
   - [ ] Gather user feedback
   - [ ] Update documentation
   - [ ] Schedule retrospective

---

## Post-Implementation

### Monitoring (Ongoing)

- [ ] Check audit logs daily for first week
- [ ] Monitor error rates
- [ ] Track permission denial rates
- [ ] Monitor API performance
- [ ] Verify cross-org access attempts (should be 0)
- [ ] Check for any security events

### Documentation Updates

- [ ] Update API documentation
- [ ] Update architecture diagrams
- [ ] Update security documentation
- [ ] Create runbooks for permission issues
- [ ] Document troubleshooting steps

### Team Communication

- [ ] Send deployment notice to all users
- [ ] Provide feedback channel
- [ ] Host Q&A session
- [ ] Create knowledge base articles
- [ ] Document lessons learned

---

## Sign-Off

### Review Checklist

- [ ] All checklist items completed
- [ ] Tests passing
- [ ] Code reviewed
- [ ] Security team approved
- [ ] Performance acceptable
- [ ] Documentation complete
- [ ] Team trained

### Final Approvals

- [ ] Tech Lead Sign-off: _______________  Date: _______
- [ ] Security Lead Sign-off: _______________  Date: _______
- [ ] Product Manager Sign-off: _______________  Date: _______
- [ ] CTO/Engineering Lead Sign-off: _______________  Date: _______

---

## Notes & Status

```
Week 1 (Phase 1): _______________
Week 2 (Phase 2): _______________
Week 3 (Phase 3): _______________
Week 4 (Phase 4): _______________
Deployment: _______________
Post-Deployment: _______________
```

### Issues & Blockers

```
Issue 1: _______________
Status: [ ] Open [ ] Closed
Resolution: _______________

Issue 2: _______________
Status: [ ] Open [ ] Closed
Resolution: _______________
```

---

**Document Status:** DRAFT - READY FOR IMPLEMENTATION
**Last Updated:** November 4, 2025
**Next Review:** December 1, 2025

