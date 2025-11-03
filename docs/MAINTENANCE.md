# NextCRM → AWMS Maintenance Guide

**Version:** 2.0.0
**Last Updated:** November 4, 2025
**Audience:** Operations Team, DevOps, On-Call Engineers

---

## Table of Contents

- [Common Debugging Scenarios](#common-debugging-scenarios)
- [Log Locations and Formats](#log-locations-and-formats)
- [Database Maintenance](#database-maintenance)
- [Performance Monitoring](#performance-monitoring)
- [Rate Limit Management](#rate-limit-management)
- [Security Incident Procedures](#security-incident-procedures)
- [Backup and Recovery](#backup-and-recovery)
- [Deployment Procedures](#deployment-procedures)
- [Rollback Procedures](#rollback-procedures)

---

## Common Debugging Scenarios

### Scenario 1: "User Cannot Login"

**Symptoms**:
- User reports "Invalid credentials" despite correct password
- Multiple failed login attempts in audit logs
- No successful LOGIN audit log entry

**Diagnosis Steps**:

```bash
# 1. Check if user exists
mongo> db.users.findOne({ email: "user@example.com" })

# 2. Check user status
# Look for: userStatus (should be "ACTIVE", not "PENDING" or "INACTIVE")

# 3. Check password hash exists
# Look for: password field (should be bcrypt hash starting with "$2b$10$")

# 4. Check audit logs for failed attempts
mongo> db.audit_log.find({
  userId: "user_id_here",
  action: "LOGIN",
  createdAt: { $gte: new Date(Date.now() - 24*60*60*1000) }
}).sort({ createdAt: -1 }).limit(10)
```

**Common Causes**:
1. **User status is PENDING**: Admin approval required
   - **Solution**: Update status to ACTIVE: `UPDATE users SET userStatus='ACTIVE' WHERE id=?`
2. **Password not hashed**: OAuth user trying credentials login
   - **Solution**: User must use OAuth (Google/GitHub) or reset password
3. **Rate limited**: Too many failed attempts (10 per 15 min)
   - **Solution**: Wait 15 minutes or reset rate limit (see Rate Limit Management)
4. **Wrong organizationId**: User belongs to different org
   - **Solution**: Check `organizationId` field, transfer user if needed

---

### Scenario 2: "403 Forbidden on API Endpoint"

**Symptoms**:
- User reports "Permission denied" errors
- API returns 403 status code
- PERMISSION_DENIED entries in audit log

**Diagnosis Steps**:

```bash
# 1. Check user's role
mongo> db.users.findOne(
  { email: "user@example.com" },
  { organization_role: 1, organizationId: 1 }
)

# 2. Check permission requirements for endpoint
# See RBAC.md Permission Matrix

# 3. Check audit logs for denials
mongo> db.audit_log.find({
  action: "PERMISSION_DENIED",
  resource: "api_endpoint",
  resourceId: "/api/crm/account/abc123",
  userId: "user_id_here"
}).sort({ createdAt: -1 }).limit(5)

# 4. Check resource ownership (for MEMBER role)
mongo> db.crm_accounts.findOne(
  { _id: ObjectId("abc123") },
  { createdBy: 1, organizationId: 1 }
)
```

**Common Causes**:
1. **Insufficient role**: VIEWER trying to edit (needs MEMBER+)
   - **Solution**: Promote user to MEMBER (if appropriate)
2. **Ownership mismatch**: MEMBER trying to edit another user's record
   - **Solution**: ADMIN must edit, or transfer ownership
3. **Wrong organization**: User trying to access resource in different org
   - **Solution**: Verify `organizationId` matches, or deny access
4. **Missing role**: `organization_role` field is null
   - **Solution**: Assign default role (MEMBER)

---

### Scenario 3: "Rate Limit Exceeded (429)"

**Symptoms**:
- User reports "Too many requests" errors
- API returns 429 status code with Retry-After header
- RATE_LIMIT_EXCEEDED entries in audit log

**Diagnosis Steps**:

```bash
# 1. Check organization's plan
mongo> db.organizations.findOne(
  { _id: ObjectId("org_id") },
  { plan: 1, name: 1 }
)

# 2. Check rate limit violations
mongo> db.audit_log.find({
  organizationId: "org_id",
  action: "RATE_LIMIT_EXCEEDED",
  createdAt: { $gte: new Date(Date.now() - 60*60*1000) }
}).count()

# 3. Check if legitimate traffic spike
# Look at request patterns, time of day, endpoints hit

# 4. Check for distributed attack
mongo> db.audit_log.aggregate([
  { $match: { action: "RATE_LIMIT_EXCEEDED", createdAt: { $gte: new Date(Date.now() - 60*60*1000) }}},
  { $group: { _id: "$ipAddress", count: { $sum: 1 }}},
  { $sort: { count: -1 }},
  { $limit: 10 }
])
```

**Common Causes**:
1. **Legitimate spike**: Workshop busy day, inventory sync
   - **Solution**: Upgrade plan (FREE → PRO → ENTERPRISE)
2. **Inefficient client**: Mobile app polling too frequently
   - **Solution**: Implement caching, reduce polling frequency
3. **DDoS attack**: Distributed IPs hitting endpoints
   - **Solution**: Enable Cloudflare Challenge mode, block IP ranges
4. **Development environment**: Testing with production API
   - **Solution**: Use staging environment for testing

---

### Scenario 4: "Slow API Response Times"

**Symptoms**:
- Users report slow page loads
- API endpoints taking > 5 seconds
- Timeout errors (504 Gateway Timeout)

**Diagnosis Steps**:

```bash
# 1. Check Vercel function logs
# https://vercel.com/dashboard → Deployments → Logs
# Look for: Duration > 10s, Memory usage > 256 MB

# 2. Check MongoDB slow query log
mongo> db.system.profile.find({ millis: { $gt: 1000 }}).sort({ ts: -1 }).limit(10)

# 3. Check database connection count
mongo> db.serverStatus().connections

# 4. Check for missing indexes
mongo> db.crm_accounts.find({ organizationId: "org_id" }).explain("executionStats")
# Look for: stage: "COLLSCAN" (indicates missing index)
```

**Common Causes**:
1. **Missing index**: Full table scan on large collection
   - **Solution**: Add index on `organizationId` (see Database Maintenance)
2. **N+1 query problem**: Fetching related records in loop
   - **Solution**: Use Prisma `include` to fetch in single query
3. **Large result set**: Fetching 10,000+ records without pagination
   - **Solution**: Implement pagination (`take` and `skip`)
4. **Cold start**: Vercel function not warmed up (first request)
   - **Solution**: Normal, subsequent requests will be fast (<200ms)

---

## Log Locations and Formats

### Vercel Function Logs

**Location**: Vercel Dashboard → Project → Logs
**Retention**: 7 days (free), 30 days (Pro)
**Format**: JSON structured logs

```json
{
  "timestamp": "2025-11-04T10:30:45Z",
  "level": "info",
  "message": "[RATE_LIMIT] Rate limit exceeded for org:xyz789 on /api/crm/accounts",
  "requestId": "req_abc123",
  "userId": "user_def456",
  "organizationId": "org_xyz789"
}
```

**Common Log Patterns**:
- `[AUTH_SESSION]`: NextAuth session-related logs
- `[RATE_LIMIT]`: Rate limiting events
- `[PERMISSION_MIDDLEWARE_ERROR]`: RBAC failures
- `[AUDIT_LOG_ERROR]`: Audit logging failures
- `[DATABASE_ERROR]`: Prisma/MongoDB errors

---

### Audit Logs (Database)

**Location**: MongoDB → `audit_log` collection
**Retention**: 90 days (compliance requirement)
**Format**: MongoDB document

```javascript
{
  _id: ObjectId("..."),
  organizationId: "org_xyz789",
  userId: "user_abc123",
  action: "PERMISSION_DENIED",
  resource: "api_endpoint",
  resourceId: "/api/crm/account/123/delete",
  changes: {
    method: "DELETE",
    requiredPermission: "DELETE",
    requiredRole: "ADMIN",
    actualRole: "MEMBER"
  },
  ipAddress: "203.0.113.1",
  userAgent: "Mozilla/5.0 ...",
  createdAt: ISODate("2025-11-04T10:30:45Z")
}
```

**Querying Audit Logs**:

```javascript
// All actions by user in last 24 hours
db.audit_log.find({
  userId: "user_abc123",
  createdAt: { $gte: new Date(Date.now() - 24*60*60*1000) }
}).sort({ createdAt: -1 })

// All deletions in organization
db.audit_log.find({
  organizationId: "org_xyz789",
  action: "DELETE"
}).sort({ createdAt: -1 })

// All permission denials for endpoint
db.audit_log.find({
  action: "PERMISSION_DENIED",
  resourceId: { $regex: "/api/crm/account" }
})
```

---

## Database Maintenance

### Index Management

**Check Missing Indexes**:

```javascript
// For each collection, ensure organizationId is indexed
db.crm_accounts.getIndexes()
// Should see: { organizationId: 1 }

// Check index usage
db.crm_accounts.aggregate([
  { $indexStats: {} }
])
```

**Add Missing Index**:

```javascript
// Add index on organizationId
db.crm_accounts.createIndex({ organizationId: 1 })

// Compound index for common queries
db.crm_accounts.createIndex({ organizationId: 1, createdAt: -1 })

// Unique index (if applicable)
db.users.createIndex({ email: 1 }, { unique: true })
```

---

### Database Backup

**MongoDB Atlas Backups** (Automatic):
- Snapshots: Every 6 hours
- Retention: 7 days (point-in-time recovery)
- Location: Sydney + Singapore (cross-region)

**Manual Backup**:

```bash
# Export single collection
mongodump --uri="mongodb+srv://..." --collection=users --out=./backup

# Export entire database
mongodump --uri="mongodb+srv://..." --out=./backup

# Restore from backup
mongorestore --uri="mongodb+srv://..." ./backup
```

---

### Database Cleanup

**Remove Soft-Deleted Organizations** (Run Monthly):

```javascript
// Find orgs scheduled for deletion (30+ days ago)
db.organizations.find({
  deleteScheduledAt: { $lte: new Date(Date.now() - 30*24*60*60*1000) }
})

// Delete organization (cascades to all child records)
db.organizations.deleteOne({ _id: ObjectId("org_to_delete") })

// Verify child records deleted
db.crm_accounts.count({ organizationId: "org_to_delete" })
// Should be 0
```

**Cleanup Old Audit Logs** (Run Quarterly):

```javascript
// Delete audit logs older than 90 days
db.audit_log.deleteMany({
  createdAt: { $lt: new Date(Date.now() - 90*24*60*60*1000) }
})
```

---

## Performance Monitoring

### Key Metrics to Track

**API Performance**:
- Average response time: Target < 200ms (95th percentile)
- Error rate: Target < 1%
- Rate limit violations: Alert if > 100/minute

**Database Performance**:
- Query latency: Target < 50ms (95th percentile)
- Connection count: Alert if > 80 (max 100)
- Slow queries: Alert if query > 1 second

**Resource Utilization**:
- Vercel function memory: Alert if > 256 MB
- Vercel function duration: Alert if > 10 seconds
- MongoDB storage: Alert if > 80% of quota

---

### Monitoring Tools

**Vercel Analytics** (Built-in):
- Real-time traffic
- Error tracking
- Performance metrics

**MongoDB Atlas Monitoring** (Built-in):
- Query performance
- Connection count
- Storage usage
- Slow query log

**Future Integrations**:
- Sentry (error tracking)
- PagerDuty (alerting)
- Datadog (APM)

---

## Rate Limit Management

### View Current Rate Limits

```typescript
// In-memory rate limits (single instance only)
// Located in: lib/rate-limit.ts

// Check rate limit status for organization
import { getRateLimitStatus } from "@/lib/rate-limit";

const status = getRateLimitStatus("org:xyz789", "PRO");
console.log(status);
// {
//   remaining: 873,
//   resetTime: 1699123456000,
//   limit: 1000,
//   used: 127
// }
```

---

### Reset Rate Limit (Admin Only)

```typescript
// Reset rate limit for organization (emergency use only)
import { resetRateLimit } from "@/lib/rate-limit";

resetRateLimit("org:xyz789");
// Rate limit counter deleted, next request starts fresh
```

**When to Reset**:
- Legitimate traffic spike (workshop busy day)
- Development testing (accidentally hit limit)
- False positive (rate limiting error)

**When NOT to Reset**:
- Suspected DDoS attack (investigate first)
- Repeated violations (upgrade plan instead)
- Customer requests (explain plan limits first)

---

### Adjust Rate Limits

**Temporarily Increase Limit** (code change required):

```typescript
// lib/rate-limit-config.ts

// Add custom endpoint limit
export const ENDPOINT_RATE_LIMITS = {
  "/api/upload": {
    PRO: { requests: 5000, windowMs: 60 * 60 * 1000 }, // Temporarily 5x normal
  },
};

// Deploy to production
// Revert after temporary spike resolves
```

---

## Security Incident Procedures

### Incident Response Checklist

**P0 (Critical - Data Breach)**:

1. ☐ **Contain** (15 minutes):
   - Isolate affected systems
   - Revoke compromised credentials
   - Enable Cloudflare Challenge mode

2. ☐ **Investigate** (1 hour):
   - Query audit logs for unauthorized access
   - Identify scope (how many users/records affected)
   - Determine root cause

3. ☐ **Remediate** (4 hours):
   - Patch vulnerability
   - Force password reset for affected users
   - Rotate API keys and secrets

4. ☐ **Notify** (72 hours):
   - GDPR/Privacy Act compliance (DPA notification)
   - Affected users (email + dashboard notification)
   - Legal counsel

5. ☐ **Post-Mortem** (7 days):
   - Root cause analysis
   - Preventive measures
   - Update security documentation

---

**P1 (High - Security Event)**:

1. ☐ **Monitor** (1 hour):
   - Confirm attack is blocked
   - Check audit logs for patterns

2. ☐ **Block** (4 hours):
   - Add IP to blacklist
   - Enable Cloudflare rules

3. ☐ **Report** (24 hours):
   - Internal security report
   - Update monitoring alerts

---

### Common Security Queries

**Find Suspicious Activity**:

```javascript
// Failed login attempts from single IP
db.audit_log.aggregate([
  { $match: { action: "LOGIN", changes: { result: "failure" }}},
  { $group: { _id: "$ipAddress", count: { $sum: 1 }}},
  { $match: { count: { $gt: 10 }}},
  { $sort: { count: -1 }}
])

// Permission denials by user
db.audit_log.find({
  action: "PERMISSION_DENIED",
  userId: "user_abc123"
}).sort({ createdAt: -1 }).limit(20)

// Data exports in last 24 hours
db.audit_log.find({
  action: "EXPORT",
  createdAt: { $gte: new Date(Date.now() - 24*60*60*1000) }
})
```

---

## Backup and Recovery

### Full Backup Procedure

```bash
# 1. Backup database
mongodump --uri="$DATABASE_URL" --out=./backup-$(date +%Y%m%d)

# 2. Backup uploaded files (DigitalOcean Spaces)
aws s3 sync s3://nextcrm-files ./backup-files-$(date +%Y%m%d)

# 3. Backup environment variables
# Copy from Vercel Dashboard → Settings → Environment Variables

# 4. Backup code
git archive --format=tar.gz --output=./backup-code-$(date +%Y%m%d).tar.gz HEAD

# 5. Store backups securely (encrypted external drive or S3 Glacier)
```

---

### Recovery Procedure

**Scenario: Database Corruption**

```bash
# 1. Stop accepting traffic (maintenance mode)
# Vercel → Project → Settings → Custom Domains → Maintenance Page

# 2. Restore database from snapshot
mongorestore --uri="$DATABASE_URL" --drop ./backup-20251104

# 3. Verify data integrity
mongo "$DATABASE_URL" --eval "db.users.count(); db.crm_accounts.count();"

# 4. Test application
# Sign in, create account, view dashboard

# 5. Resume traffic
# Remove maintenance page
```

**RTO/RPO Targets**:
- Recovery Time Objective (RTO): 4 hours
- Recovery Point Objective (RPO): 6 hours (last snapshot)

---

## Deployment Procedures

### Standard Deployment (Git Push)

```bash
# 1. Create feature branch
git checkout -b feature/new-feature

# 2. Make changes, commit
git add .
git commit -m "feat: add new feature"

# 3. Push to GitHub
git push origin feature/new-feature

# 4. Create Pull Request
# GitHub → Pull Requests → New

# 5. Code review and approval
# Require 1 approval from team member

# 6. Merge to main (auto-deploys to production)
git checkout main
git merge feature/new-feature
git push origin main

# 7. Monitor deployment
# Vercel → Deployments → Latest
# Check: Build success, no errors in logs
```

**Vercel Auto-Deployment**:
- Push to `main` → Production
- Push to other branches → Preview deployment
- Every commit gets unique URL for testing

---

### Emergency Hotfix

```bash
# 1. Create hotfix branch
git checkout -b hotfix/critical-bug main

# 2. Fix bug, commit
git add .
git commit -m "fix: critical security vulnerability"

# 3. Push and merge immediately (skip PR)
git push origin hotfix/critical-bug
git checkout main
git merge hotfix/critical-bug
git push origin main

# 4. Monitor deployment (critical: verify fix works)
```

---

## Rollback Procedures

### Instant Rollback (Vercel)

**When to Rollback**:
- New deployment breaks critical functionality
- Database migration failed (data corruption)
- Security vulnerability introduced
- Error rate > 10%

**Steps**:

1. **Identify Last Good Deployment**:
   - Vercel Dashboard → Deployments
   - Find deployment before issue started

2. **Instant Rollback** (click button):
   - Deployments → [Last Good Deployment] → Actions → Promote to Production
   - Takes effect immediately (<1 minute)

3. **Verify Rollback**:
   - Test critical flows (login, create account, view dashboard)
   - Check error rate in logs

4. **Investigate Root Cause**:
   - Review diff between good and bad deployment
   - Fix issue in development, re-deploy

---

### Database Rollback (Manual)

**WARNING**: Database rollbacks are destructive (data loss possible).

**When to Use**:
- Migration corrupted data
- Schema change broke queries
- Data export/import failed

**Steps**:

```bash
# 1. Stop all traffic (enable maintenance mode)

# 2. Restore database from snapshot (point-in-time recovery)
# MongoDB Atlas → Clusters → Restore
# Select snapshot from before migration

# 3. Verify data integrity
mongo "$DATABASE_URL" --eval "db.users.count(); db.crm_accounts.count();"

# 4. Test application with restored database

# 5. Resume traffic (disable maintenance mode)
```

**Data Loss**:
- All data between snapshot and now is lost (up to 6 hours)
- Manual data re-entry required for critical records
- Communicate to affected users

---

## Contact Information

**On-Call Engineer**:
- Pager: Rotate weekly (see PagerDuty schedule)
- Slack: `#ops-alerts`
- Email: `oncall@example.com`

**Escalation**:
- Engineering Lead: `engineering@example.com`
- Security Team: `security@example.com`
- CEO (P0 only): `ceo@example.com`

**External Support**:
- Vercel Support: `https://vercel.com/support` (Pro plan: 24/7)
- MongoDB Atlas Support: `https://support.mongodb.com` (M10+: 24/7)
- Stripe Support: `https://support.stripe.com` (24/7)

---

**Document Maintained By**: Operations Team
**Last Review**: November 4, 2025
**Next Review**: February 1, 2026
