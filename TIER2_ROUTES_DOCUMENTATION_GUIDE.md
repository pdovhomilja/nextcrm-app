# Tier 2 Routes: Enterprise Documentation Guide

Quick reference for documenting the remaining 12 security-critical API routes.

---

## Group A: Billing Routes (2 remaining)

### Route 2: POST /api/billing/create-portal-session

**File:** `app/api/billing/create-portal-session/route.ts`

**Current State:** Basic OWNER check + Stripe API call

**Documentation Requirements:**

```typescript
/**
 * ============================================================================
 * POST /api/billing/create-portal-session - STRIPE CUSTOMER PORTAL
 * ============================================================================
 *
 * ENDPOINT: POST /api/billing/create-portal-session
 * RBAC: OWNER role only
 * RATE LIMIT: Plan-based (5 per hour for FREE, unlimited for ENTERPRISE)
 * AUDIT: Yes - Portal access logged for security
 *
 * PURPOSE:
 * Creates a Stripe Customer Portal session allowing workshop owners to manage
 * their subscription directly on Stripe (update payment method, view invoices,
 * manage billing contact info, view upcoming charges).
 *
 * BUSINESS CONTEXT:
 * Offloads subscription management to Stripe-hosted UI (more secure than
 * replicating features in our app). Owner can update payment method, change
 * billing email, cancel subscription without contacting support.
 *
 * AWMS MAPPING:
 * Workshop owner needs to update payment method after card expires or switch
 * to new payment processor. Portal provides self-service without support ticket.
 *
 * SECURITY:
 * - Authentication: Required (JWT session)
 * - Authorization: OWNER role only
 * - Rate limiting: Prevent portal spam access
 * - Audit logging: Track portal sessions created
 * - Session expiry: ~1 hour (Stripe default)
 *
 * REQUEST:
 * - Headers: Authorization: Bearer [session-token]
 * - Body: {} (empty, no parameters)
 *
 * RESPONSE:
 * - Success (200): { "url": "https://billing.stripe.com/..." }
 * - Error (400): No Stripe customer ID (never had subscription)
 * - Error (401): Unauthenticated
 * - Error (403): Not OWNER
 * - Error (500): Stripe API failure
 *
 * COMMON ERRORS:
 * 1. 400 Bad Request: "No Stripe customer found"
 *    CAUSE: Organization never created subscription
 *    USER FLOW: Show "No active subscription" and link to upgrade page
 *    MONITORING: Track frequency - suggests UX confusion
 *
 * 2. 403 Forbidden: "Only owners can access billing portal"
 *    CAUSE: ADMIN tries to manage billing (permission boundary)
 *    EXPECTED: Only shop owner should access portal
 *    RATIONALE: Prevent team members from modifying payment method
 *
 * DEBUGGING:
 * - Check: Does organization.stripeCustomerId exist in DB?
 * - Check: Is Stripe customer still valid?
 * - Check: Is Stripe API responding? (check status page)
 * - Fix: If stripeCustomerId missing, call getOrCreateStripeCustomer
 *
 * COMPLIANCE:
 * - SOC 2: CC6.1 - Logical access controls (OWNER enforcement)
 * - PCI DSS: 3.4 - Never store card data (Stripe handles)
 *
 * PERFORMANCE:
 * - Stripe portal session creation: ~200-400ms
 * - Database lookup: ~10ms
 * - Total latency: ~250-450ms
 *
 * MONITORING:
 * - Alert if: Portal access denied (403) > 5x per minute
 * - Track: Portal session generation rate
 * - Dashboard: Portal conversion to payment method update
 *
 * @route POST /api/billing/create-portal-session
 * @security CRITICAL - Stripe integration
 * @audit Required
 * @rbac OWNER only
 * @pci true
 */
```

**Key Differences from create-checkout-session:**
- No plan validation (portal is for existing subscribers)
- Check stripeCustomerId exists (not creating new customer)
- Simpler error handling (fewer failure modes)
- Session redirect happens on Stripe side

**Step-by-step inline comments needed:**
1. STEP 1: AUTHENTICATION
2. STEP 2: AUTHORIZATION (OWNER check)
3. STEP 3: RETRIEVE STRIPE CUSTOMER ID
4. STEP 4: VALIDATE CUSTOMER EXISTS
5. STEP 5: CREATE PORTAL SESSION
6. ERROR HANDLING

---

### Route 3: GET /api/billing/subscription

**File:** `app/api/billing/subscription/route.ts`

**Current State:** OWNER check + fetch subscription data

**Documentation Requirements:**

```typescript
/**
 * ============================================================================
 * GET /api/billing/subscription - SUBSCRIPTION DETAILS & PAYMENT HISTORY
 * ============================================================================
 *
 * ENDPOINT: GET /api/billing/subscription
 * RBAC: OWNER role only
 * RATE LIMIT: Plan-based (60 per hour for FREE, unlimited for ENTERPRISE)
 * AUDIT: No - Read-only, low sensitivity
 *
 * PURPOSE:
 * Returns current organization subscription status, active plan, next billing
 * date, payment history (last 10 transactions), and invoice details.
 *
 * BUSINESS CONTEXT:
 * Dashboard widget shows billing status, upcoming charges, payment method
 * expiry warnings. Owner can see subscription cost breakdown and plan features.
 *
 * AWMS MAPPING:
 * Workshop owner checks their subscription plan (PRO vs ENTERPRISE) to verify
 * feature access. Sees next payment date and can plan cash flow accordingly.
 *
 * RESPONSE SCHEMA:
 * {
 *   "organization": {
 *     "id": "org_xxxxx",
 *     "name": "Joe's Auto Shop",
 *     "plan": "PRO",
 *     "status": "ACTIVE",
 *     "stripeCustomerId": "cus_xxxxx"
 *   },
 *   "subscription": {
 *     "id": "sub_xxxxx",
 *     "status": "active|past_due|trialing",
 *     "currentPeriodStart": "2025-01-01T00:00:00Z",
 *     "currentPeriodEnd": "2025-02-01T00:00:00Z",
 *     "amount": 2900,  // cents
 *     "currency": "usd"
 *   },
 *   "paymentHistory": [
 *     {
 *       "id": "pi_xxxxx",
 *       "amount": 2900,
 *       "status": "succeeded|failed",
 *       "createdAt": "2025-01-01T00:00:00Z"
 *     }
 *   ]
 * }
 *
 * COMMON ERRORS:
 * 1. 403 Forbidden: "Only owners can view billing"
 *    CAUSE: ADMIN/MEMBER tries to view subscription
 *    EXPECTED: Only owner has billing visibility
 *
 * 2. null subscription (but 200 OK)
 *    CAUSE: Organization on FREE plan (no subscription)
 *    HANDLING: Show "No active subscription" UI
 *    USER FLOW: Suggest upgrade path
 *
 * CACHING OPPORTUNITY:
 * - Current: Every request hits DB + Stripe
 * - Recommended: Cache for 5 minutes
 * - KEY: "org_subscription_{organizationId}"
 * - INVALIDATE: On webhook (subscription updated, payment received)
 *
 * PERFORMANCE:
 * - Database queries: 2 (user lookup, org with relations)
 * - Stripe API calls: 0 (we store subscription data)
 * - Total latency: ~50-100ms
 * - OPPORTUNITY: Add Redis caching to reduce to <10ms
 *
 * @route GET /api/billing/subscription
 * @security HIGH - Shows payment data
 * @audit Optional (read-only)
 * @rbac OWNER only
 * @cache 5 minutes
 */
```

**Unique aspects:**
- Read-only endpoint (no mutations)
- Shows payment sensitive data
- Caching opportunity (payment data doesn't change mid-billing-cycle)
- Multiple queries to join org + subscription + payment history

**Steps to document:**
1. AUTHENTICATION
2. AUTHORIZATION (OWNER check)
3. DATA RETRIEVAL (user + org + subscription relations)
4. RESPONSE FORMATTING
5. CACHING STRATEGY
6. ERROR HANDLING

---

## Group B: Organization Management (5 routes)

### Route 4: POST/DELETE/GET /api/organization/delete

**File:** `app/api/organization/delete/route.ts`

**Current State:** Has comprehensive logic (soft-delete, confirmation, Stripe cancellation)

**Key Documentation Needs:**

- **POST:** Schedule soft-delete (30-day retention)
  - Token-based confirmation flow
  - Stripe subscription cancellation
  - Status change to SUSPENDED

- **DELETE:** Cancel scheduled deletion
  - Restore organization to ACTIVE
  - Restore Stripe subscription? (not implemented)

- **GET:** Check deletion status
  - Days remaining
  - Cancellation deadline
  - Recovery UI state

**AWMS Context:**
- Workshop owner can request account deletion
- 30-day retention for backup/recovery
- Data erasure scheduled after 30 days
- GDPR right to be forgotten compliance

**Critical Documentation Points:**
```
Deletion Workflow:
├─ Owner clicks "Delete Organization"
├─ System requires confirmation token + org name
├─ DELETE /api/organization/delete (POST)
│  ├─ Schedule soft-delete in 30 days
│  ├─ Set status = SUSPENDED
│  ├─ Cancel active Stripe subscriptions
│  └─ Log deletion request → auditLog
├─ Cron job runs at day 30
│  ├─ Hard-delete all data
│  ├─ Remove from Stripe (if desired)
│  └─ Send final notification
└─ Users cannot login to deleted org
```

---

### Route 5: POST/GET /api/organization/export-data

**File:** `app/api/organization/export-data/route.ts`

**Current State:** Comprehensive GDPR export implementation

**Key Documentation Needs:**

- **Compliance Context:** GDPR Article 15 (right to access)
- **Export Format:** JSON with metadata + statistics
- **Rate Limiting:** 1 export per hour (prevent abuse)
- **Data Excluded:** File URLs (for security), sensitive system fields
- **Audit Trail:** dataExport table tracks who exported when

**AWMS Context:**
- Workshop owner can request full data backup
- Includes customers, invoices, staff records, projects
- Format suitable for migration to competitor software
- Required for business continuity

---

### Route 6: GET/POST /api/organization/audit-logs

**File:** `app/api/organization/audit-logs/route.ts`

**Current State:** Query + export functionality

**Key Documentation Needs:**

- **GET:** Query audit logs with filtering
  - Pagination (page + limit)
  - Filter by action, resource, user, date range
  - CSV/JSON export support

- **POST:** Get statistics/aggregates
  - Most active users
  - Action frequency
  - Resource modification patterns

**Compliance Context:**
- SOC 2 Type II requirement
- 90-day retention minimum
- Tamper-proof (append-only log)
- Accessible to OWNER/ADMIN only

---

### Route 7: GET /api/organization/members

**File:** `app/api/organization/members/route.ts`

**Current State:** Simple member listing

**Key Documentation Needs:**

- Privacy: Only list members of same organization
- Role display: Show role + created_date
- Pagination: Not yet implemented (recommend limit + offset)
- Search: Not yet implemented (recommend name/email search)

**AWMS Context:**
- Service advisor views team roster
- Manager manages staff access
- Staff count affects plan limits (PRO = 10 max, ENTERPRISE = unlimited)

---

### Route 8: DELETE /api/organization/members/[userId]

**File:** `app/api/organization/members/[userId]/route.ts`

**Current State:** Removes member from org

**Key Documentation Needs:**

- Permission check: ADMIN or OWNER (not just any OWNER)
- Self-removal: Can't remove yourself (prevent lock-out)
- Owner protection: Can't remove org owner (unless self)
- Cascade: What happens to their tasks/assignments?
- Audit: Log member removal with reason

---

### Route 9: PUT /api/organization/members/[userId]/role

**File:** `app/api/organization/members/[userId]/role/route.ts`

**Current State:** Updates member role

**Key Documentation Needs:**

- Role hierarchy: Can only raise/lower within authorized scope
- Owner immutability: Owner role can't be changed
- Assignable roles: Define MEMBER, ADMIN (can't assign OWNER)
- Cascade effects: Role change affects feature access immediately
- Audit: Track all role changes

---

### Route 10: GET/DELETE /api/organization/invitations

**File:** `app/api/organization/invitations/route.ts`

**Current State:** List + cancel invitations

**Key Documentation Needs:**

- **GET:** List pending invitations
  - Who invited whom
  - When (created date)
  - Expiry status
  - Resend capability

- **DELETE:** Cancel invitation
  - Invitation status → CANCELLED
  - Can rescind before acceptance
  - Notify invited user (optional)

**AWMS Context:**
- Manager invites mechanics to workshop
- Invitation links via email
- Expires after 7 days (configurable)
- Resend option for bounced emails

---

## Group C: Resource CRUD Routes (3 routes)

### Route 11: DELETE /api/crm/account/[accountId]

**File:** `app/api/crm/account/[accountId]/route.ts`

**Documentation Points:**
- Organization isolation check (can't delete another org's account)
- Cascade: Delete contacts, opportunities, related records
- Soft-delete option: Archive instead of hard-delete
- Audit: Who deleted what account when
- Business impact: Workshop deletes customer record

---

### Route 12: DELETE /api/projects/[projectId]

**File:** `app/api/projects/[projectId]/route.ts`

**Documentation Points:**
- Cascade: Delete sections + all tasks
- Member notifications: Assigned team members notified
- Archive alternative: Keep data but hide from UI
- Audit: Project deletion trail
- Performance: Large projects may have 100s of tasks

---

### Route 13: GET/DELETE /api/user/[userId]

**File:** `app/api/user/[userId]/route.ts`

**Documentation Points:**
- CRITICAL SECURITY: Who can delete users?
  - Self-deletion (with confirmation)
  - OWNER deletion (of other members)
  - NOT ADMIN deletion of other users
- Account data: What happens to their projects?
- Reassign: Tasks should be reassigned before deletion
- Audit: User deletion is serious event

---

## Template Checklist for Each Route

For EVERY Tier 2 route, ensure:

### Route-Level Documentation (120-150 lines minimum)

- [ ] Purpose statement
- [ ] Business context
- [ ] AWMS automotive mapping
- [ ] Full request/response schema
- [ ] 3+ common error scenarios with debugging
- [ ] RBAC requirements (which roles allowed)
- [ ] Rate limit configuration
- [ ] Audit logging policy
- [ ] Performance characteristics
- [ ] Compliance mapping (SOC 2 / GDPR / PCI)
- [ ] @route, @security, @audit, @rbac annotations

### Handler Function Documentation (40-60 lines)

- [ ] Parameter descriptions
- [ ] Return type and success response example
- [ ] Exception scenarios
- [ ] Security notes
- [ ] Performance impact

### Inline Comments (for each major section)

- [ ] STEP 1: AUTHENTICATION
  - [ ] How session verified
  - [ ] Error case handling

- [ ] STEP 2: AUTHORIZATION
  - [ ] Which roles allowed
  - [ ] Permission logic explanation
  - [ ] Audit logging

- [ ] STEP 3-6: Core logic
  - [ ] Why each step needed
  - [ ] Common failure modes
  - [ ] Performance considerations

- [ ] ERROR HANDLING
  - [ ] Try-catch with specific errors
  - [ ] Logging and monitoring
  - [ ] User-facing vs internal errors

---

## Priority Order for Implementation

**Week 1 (Billing - easiest to hardest):**
1. POST /api/billing/create-portal-session (30 min)
2. GET /api/billing/subscription (30 min)

**Week 2 (Organization Core):**
3. POST/DELETE/GET /api/organization/delete (90 min - complex)
4. POST/GET /api/organization/export-data (60 min)

**Week 3 (Audit & Management):**
5. GET/POST /api/organization/audit-logs (60 min)
6. GET /api/organization/members (20 min - simple)
7. DELETE /api/organization/members/[userId] (30 min)
8. PUT /api/organization/members/[userId]/role (30 min)
9. GET/DELETE /api/organization/invitations (45 min)

**Week 4 (CRUD):**
10. DELETE /api/crm/account/[accountId] (30 min)
11. DELETE /api/projects/[projectId] (30 min)
12. GET/DELETE /api/user/[userId] (45 min - complex permissions)

**Total Estimated Time:** ~480 minutes = 8 hours

---

## Quality Gates

Before considering route "DONE":

- [ ] Route-level JSDoc > 100 lines
- [ ] Handler function JSDoc > 40 lines
- [ ] Minimum 3 inline comment sections (auth, authz, error)
- [ ] AWMS automotive context included
- [ ] Compliance mappings (SOC 2, GDPR, PCI) present
- [ ] Performance characteristics documented
- [ ] Monitoring/alerting recommendations included
- [ ] All error scenarios explained
- [ ] Debugging guide provided
- [ ] Peer review completed
- [ ] No "TODO" comments remaining

---

## Reference: Documentation Ratio Metrics

| Metric | Target | Reference |
|--------|--------|-----------|
| JSDoc lines | 100-150 | with-rate-limit.ts = 653 lines |
| Inline comment lines | 200-300 | create-checkout-session.ts = 340 lines |
| Code-to-comment ratio | 1:2 to 1:3 | Enterprise standard |
| Error scenarios | 3+ | At least security, validation, system errors |
| AWMS context | 2-3 sentences | Not just generic tech docs |
| Compliance annotations | 2+ frameworks | SOC 2, GDPR minimum |

---

**Document Status:** Ready for implementation
**Created:** 2025-11-04
**For:** NextCRM → AWMS Tier 2 Route Documentation Enhancement
