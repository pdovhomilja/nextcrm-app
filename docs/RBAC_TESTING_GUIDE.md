# RBAC Security Fixes - Quick Testing Guide

**Date:** November 4, 2025
**Purpose:** Quick reference for testing all RBAC fixes

---

## Quick Start

### 1. Verify Session Includes Role

```bash
# Start dev server
pnpm dev

# In browser console, after login:
const session = await fetch('/api/auth/session').then(r => r.json());
console.log(session.user.organization_role);
// Should output: OWNER, ADMIN, MEMBER, or VIEWER
```

### 2. Test Billing Endpoints

#### Create Checkout Session

**Should FAIL (403):**
```bash
curl -X POST http://localhost:3000/api/billing/create-checkout-session \
  -H "Content-Type: application/json" \
  -H "Cookie: [MEMBER_SESSION_COOKIE]" \
  -d '{"plan":"PRO"}'

# Expected response:
# HTTP 403 Forbidden
# {
#   "error": "Forbidden",
#   "message": "Only organization owners can create billing checkouts",
#   "code": "OWNER_ONLY",
#   "requiredRole": "OWNER"
# }
```

**Should SUCCEED (200):**
```bash
curl -X POST http://localhost:3000/api/billing/create-checkout-session \
  -H "Content-Type: application/json" \
  -H "Cookie: [OWNER_SESSION_COOKIE]" \
  -d '{"plan":"PRO"}'

# Expected response:
# HTTP 200 OK
# {
#   "url": "https://checkout.stripe.com/pay/cs_live_..."
# }
```

#### View Billing Portal

**Should FAIL (403):**
```bash
curl -X POST http://localhost:3000/api/billing/create-portal-session \
  -H "Cookie: [MEMBER_SESSION_COOKIE]"

# Expected response:
# HTTP 403 Forbidden
# {
#   "error": "Forbidden",
#   "message": "Only organization owners can access the billing portal",
#   "code": "OWNER_ONLY",
#   "requiredRole": "OWNER"
# }
```

**Should SUCCEED (200):**
```bash
curl -X POST http://localhost:3000/api/billing/create-portal-session \
  -H "Cookie: [OWNER_SESSION_COOKIE]"

# Expected response:
# HTTP 200 OK
# {
#   "url": "https://billing.stripe.com/..."
# }
```

#### Get Subscription

**Should FAIL (403):**
```bash
curl -X GET http://localhost:3000/api/billing/subscription \
  -H "Cookie: [MEMBER_SESSION_COOKIE]"

# Expected response:
# HTTP 403 Forbidden
# {
#   "error": "Forbidden",
#   "message": "Only organization owners can view billing subscriptions",
#   "code": "OWNER_ONLY",
#   "requiredRole": "OWNER"
# }
```

**Should SUCCEED (200):**
```bash
curl -X GET http://localhost:3000/api/billing/subscription \
  -H "Cookie: [OWNER_SESSION_COOKIE]"

# Expected response:
# HTTP 200 OK
# {
#   "organization": { ... },
#   "subscription": { ... },
#   "paymentHistory": [ ... ]
# }
```

### 3. Test Organization Delete Status

**Should FAIL (403):**
```bash
curl -X GET http://localhost:3000/api/organization/delete \
  -H "Cookie: [MEMBER_SESSION_COOKIE]"

# Expected response:
# HTTP 403 Forbidden
# {
#   "error": "Only organization owners can view deletion status"
# }
```

**Should SUCCEED (200):**
```bash
curl -X GET http://localhost:3000/api/organization/delete \
  -H "Cookie: [OWNER_SESSION_COOKIE]"

# Expected response:
# HTTP 200 OK
# {
#   "organizationId": "...",
#   "organizationName": "...",
#   "status": "ACTIVE",
#   "isScheduledForDeletion": false,
#   "deleteScheduledAt": null,
#   "daysRemaining": null,
#   "canCancel": false
# }
```

---

## Testing By Role

### Test Matrix

| Endpoint | Method | VIEWER | MEMBER | ADMIN | OWNER |
|----------|--------|--------|--------|-------|-------|
| `/api/billing/create-checkout-session` | POST | 403 | 403 | 403 | 200 |
| `/api/billing/create-portal-session` | POST | 403 | 403 | 403 | 200 |
| `/api/billing/subscription` | GET | 403 | 403 | 403 | 200 |
| `/api/organization/delete` | GET | 403 | 403 | 403 | 200 |
| `/api/organization/delete` | POST | 403 | 403 | 403 | 200 |
| `/api/organization/delete` | DELETE | 403 | 403 | 403 | 200 |
| `/api/organization/export-data` | POST | 403 | 403 | 403 | 200 |
| `/api/organization/export-data` | GET | 403 | 403 | 403 | 200 |
| `/api/organization/audit-logs` | GET | 403 | 403 | 200 | 200 |

---

## Verification Checklist

### Phase 1: Session Tests (15 mins)

- [ ] Create new user - session has organization_role
- [ ] Login existing user - session has organization_role
- [ ] User with no org - session.user.organization_role is null/default
- [ ] Google OAuth - session has organization_role
- [ ] GitHub OAuth - session has organization_role
- [ ] Credentials provider - session has organization_role

**Command to verify:**
```javascript
// In browser console after login
const s = await fetch('/api/auth/session').then(r => r.json());
console.log('Role:', s.user.organization_role);
```

### Phase 2: Billing Endpoint Tests (20 mins)

**Setup:**
1. Create org with OWNER user
2. Invite MEMBER, ADMIN users
3. Have 4 users with different roles

**Test Checkout (3 tests):**
- [ ] VIEWER: `curl -X POST .../api/billing/create-checkout-session` → 403
- [ ] MEMBER: `curl -X POST .../api/billing/create-checkout-session` → 403
- [ ] ADMIN: `curl -X POST .../api/billing/create-checkout-session` → 403
- [ ] OWNER: `curl -X POST .../api/billing/create-checkout-session` → 200

**Test Portal (3 tests):**
- [ ] VIEWER: `curl -X POST .../api/billing/create-portal-session` → 403
- [ ] MEMBER: `curl -X POST .../api/billing/create-portal-session` → 403
- [ ] ADMIN: `curl -X POST .../api/billing/create-portal-session` → 403
- [ ] OWNER: `curl -X POST .../api/billing/create-portal-session` → 200

**Test Subscription (3 tests):**
- [ ] VIEWER: `curl -X GET .../api/billing/subscription` → 403
- [ ] MEMBER: `curl -X GET .../api/billing/subscription` → 403
- [ ] ADMIN: `curl -X GET .../api/billing/subscription` → 403
- [ ] OWNER: `curl -X GET .../api/billing/subscription` → 200

### Phase 3: Organization Tests (10 mins)

**Test Delete Status:**
- [ ] VIEWER: `curl -X GET .../api/organization/delete` → 403
- [ ] MEMBER: `curl -X GET .../api/organization/delete` → 403
- [ ] ADMIN: `curl -X GET .../api/organization/delete` → 403
- [ ] OWNER: `curl -X GET .../api/organization/delete` → 200

### Phase 4: Audit Logging (10 mins)

**Test Audit Trail:**
- [ ] View audit logs: `curl -X GET .../api/organization/audit-logs`
- [ ] Filter by billing: `curl -X GET '.../api/organization/audit-logs?resource=billing'`
- [ ] Filter by denied: `curl -X GET '.../api/organization/audit-logs?action=PERMISSION_DENIED'`
- [ ] Export as CSV: `curl -X GET '.../api/organization/audit-logs?export=csv'`

**Verify in logs:**
```json
{
  "action": "PERMISSION_DENIED",
  "resource": "billing",
  "resourceId": "checkout-session|portal-session|subscription",
  "changes": {
    "requiredRole": "OWNER",
    "actualRole": "MEMBER|ADMIN|VIEWER"
  },
  "severity": "warning"
}
```

---

## Advanced Testing

### Performance Test

```bash
# Test 100 requests from MEMBER (should all be 403)
for i in {1..100}; do
  curl -s -w "%{http_code}\n" \
    -X POST http://localhost:3000/api/billing/create-checkout-session \
    -H "Cookie: [MEMBER_SESSION]" \
    -H "Content-Type: application/json" \
    -d '{"plan":"PRO"}' -o /dev/null
done

# All should be 403, no server errors
```

### Concurrent Request Test

```bash
# Test concurrent requests from different roles
# (verify no race conditions)

# In terminal 1: OWNER request
curl -X POST .../api/billing/create-checkout-session \
  -H "Cookie: [OWNER_SESSION]" \
  -H "Content-Type: application/json" \
  -d '{"plan":"PRO"}'

# In terminal 2: MEMBER request (simultaneous)
curl -X POST .../api/billing/create-checkout-session \
  -H "Cookie: [MEMBER_SESSION]" \
  -H "Content-Type: application/json" \
  -d '{"plan":"PRO"}'

# Both should return appropriate responses immediately
```

### Session Persistence Test

```bash
# Login once, verify role persists across requests
TOKEN=$(curl -X POST .../auth/signin \
  -d 'email=owner@test.com&password=test' \
  -c /tmp/cookies.txt \
  | jq -r '.token')

# Request 1
curl -X GET .../api/billing/subscription \
  -b /tmp/cookies.txt

# Request 2 (same session)
curl -X GET .../api/billing/subscription \
  -b /tmp/cookies.txt

# Both should work - session persists
```

---

## Expected Error Messages

### Missing Session
```json
HTTP 401
{
  "error": "Unauthorized"
}
```

### Wrong Role
```json
HTTP 403
{
  "error": "Forbidden",
  "message": "Only organization owners can [action]",
  "code": "OWNER_ONLY",
  "requiredRole": "OWNER"
}
```

### No Organization
```json
HTTP 404
{
  "error": "Organization not found"
}
```

### Invalid Input
```json
HTTP 400
{
  "error": "Invalid plan"
}
```

---

## Debugging Failed Tests

### Session Role is Undefined

**Problem:** `session.user.organization_role` is undefined

**Causes:**
1. User has no organization assigned
2. Session cache not cleared
3. Database not updated

**Fix:**
```bash
# Clear session cache
rm -rf .next

# Restart dev server
pnpm dev

# Or create test user with org:
# 1. Sign up new user
# 2. Create organization
# 3. Re-login
```

### Billing Endpoint Returns Success for MEMBER

**Problem:** MEMBER can still access billing endpoints

**Causes:**
1. File not saved properly
2. Dev server not reloaded
3. Old code still running

**Fix:**
```bash
# Verify changes were saved
cat app/api/billing/create-checkout-session/route.ts | grep "organization_role"

# Restart dev server with cache clear
rm -rf .next
pnpm dev
```

### Audit Logs Not Appearing

**Problem:** Permission denials not logged

**Causes:**
1. logAuditEvent function not imported
2. Database connection issue
3. Audit logging wrapped in try-catch

**Fix:**
```bash
# Check for import
grep "logAuditEvent" app/api/billing/create-checkout-session/route.ts

# Check database
mongosh  # or your DB client
db.auditLog.find({action: "PERMISSION_DENIED"}).count()
```

---

## Test Report Template

Use this template to document test results:

```markdown
# RBAC Security Fixes - Test Report

**Date:** [DATE]
**Tester:** [NAME]
**Environment:** [dev|staging|prod]

## Session Tests
- [ ] New user has role: PASS / FAIL
- [ ] Existing user has role: PASS / FAIL
- [ ] OAuth users have role: PASS / FAIL

## Billing Tests
- [ ] VIEWER checkout: 403 ✓
- [ ] MEMBER checkout: 403 ✓
- [ ] ADMIN checkout: 403 ✓
- [ ] OWNER checkout: 200 ✓

## Organization Tests
- [ ] MEMBER delete status: 403 ✓
- [ ] ADMIN delete status: 403 ✓
- [ ] OWNER delete status: 200 ✓

## Audit Logging
- [ ] Failures logged: PASS / FAIL
- [ ] Correct user ID: PASS / FAIL
- [ ] Correct role: PASS / FAIL

## Performance
- [ ] Response time <500ms: PASS / FAIL
- [ ] No server errors: PASS / FAIL

## Overall Status
[ ] PASS - Ready to deploy
[ ] FAIL - Issues found:
  - Issue 1: [Description]
  - Issue 2: [Description]
```

---

## When Tests Pass

All tests should pass before deployment:

1. All 403s appear correctly for wrong roles
2. 200 responses for correct roles
3. Audit logs capture all failures
4. Session always has organization_role
5. No performance degradation

**Next Step:** Deploy to staging for integration testing

---

## Still Having Issues?

### Check Logs

```bash
# Development logs
pnpm dev

# Look for:
# - "[AUDIT_LOG_ERROR]" messages
# - Permission check logs
# - Role mismatch messages
```

### Verify Database

```bash
# MongoDB
mongosh
db.users.findOne({email: "test@example.com"})
# Check: organization_role, organizationId

db.auditLog.find({}).sort({createdAt: -1}).limit(5)
# Check: PERMISSION_DENIED entries
```

### Check TypeScript

```bash
# Compile check
npx tsc --noEmit

# Should have no errors
```

---

**Last Updated:** November 4, 2025
**Status:** Ready for Testing
