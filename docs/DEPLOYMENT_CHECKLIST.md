# Production Deployment Checklist

**Version:** 1.0.0
**Last Updated:** November 4, 2025
**Purpose:** Pre-flight checklist for production deployments

---

## 🚦 Pre-Deployment (1 Hour Before)

### Code Quality

- [ ] All tests passing (`pnpm test`)
  - [ ] Unit tests (68 RBAC permission tests)
  - [ ] Integration tests (multi-tenancy, API security)
- [ ] No TypeScript errors (`pnpm type-check`)
- [ ] Linting clean (`pnpm lint`)
- [ ] Code review approved (minimum 1 reviewer)
- [ ] No console.log statements (production logging only)

### Security

- [ ] No secrets in code (all in `.env`)
- [ ] Environment variables set in Vercel
- [ ] API keys rotated (if > 90 days old)
- [ ] Rate limiting enabled
- [ ] RBAC enforcement enabled
- [ ] Audit logging enabled

### Database

- [ ] Database migration tested in staging
- [ ] Backup taken (manual snapshot before deployment)
- [ ] Rollback plan documented
- [ ] Indexes optimized (no missing indexes)
- [ ] Connection pool configured (max 100 connections)

### Dependencies

- [ ] No high/critical vulnerabilities (`pnpm audit`)
- [ ] Dependencies up-to-date (or documented why not)
- [ ] Package lock file committed (`pnpm-lock.yaml`)

---

## 🚀 Deployment (During Deployment)

### Vercel Deployment

- [ ] Build succeeds on Vercel
- [ ] No build warnings (or documented)
- [ ] Environment variables correct
- [ ] Custom domain configured (if applicable)
- [ ] SSL certificate active

### Post-Deployment Smoke Tests

- [ ] Homepage loads (`/`)
- [ ] Login works (`/sign-in`)
- [ ] Dashboard loads (`/dashboard`)
- [ ] API health check passes (`/api/health`)
- [ ] Create account works (`POST /api/crm/account`)
- [ ] Rate limiting active (check headers: `X-RateLimit-Limit`)
- [ ] RBAC enforcement active (403 for unauthorized)

---

## ✅ Post-Deployment (30 Minutes After)

### Monitoring

- [ ] Error rate < 1% (Vercel logs)
- [ ] Average response time < 200ms (Vercel analytics)
- [ ] No 500 errors (Vercel logs)
- [ ] Database query latency < 50ms (MongoDB Atlas)
- [ ] No connection pool exhaustion (MongoDB Atlas)

### User Verification

- [ ] Test user can login (use test account)
- [ ] Test user can create data (account, contact, lead)
- [ ] Test user can view data (dashboard, reports)
- [ ] Test user rate limit works (exceed FREE plan limit)

### Rollback Decision

**If any of the following are true, ROLLBACK IMMEDIATELY**:

- [ ] Error rate > 5%
- [ ] Average response time > 1 second
- [ ] Database connection failures
- [ ] Critical feature broken (login, create account)
- [ ] Security vulnerability introduced

**Rollback Procedure**: See [MAINTENANCE.md - Rollback Procedures](./MAINTENANCE.md#rollback-procedures)

---

## 📊 Deployment Metrics

Track the following for each deployment:

| **Metric**               | **Target**     | **Actual** | **Pass/Fail** |
|--------------------------|----------------|------------|---------------|
| Build Time               | < 5 minutes    |            |               |
| Error Rate               | < 1%           |            |               |
| Average Response Time    | < 200ms        |            |               |
| Database Query Time      | < 50ms         |            |               |
| Test Coverage            | > 80%          |            |               |
| Security Vulnerabilities | 0 high/critical|            |               |

---

## 🔐 Security Checklist (Every Deployment)

- [ ] **Authentication**: NextAuth.js configured correctly
- [ ] **Authorization**: RBAC middleware applied to all API routes
- [ ] **Rate Limiting**: Enabled for all endpoints (except bypassed)
- [ ] **Audit Logging**: All sensitive actions logged
- [ ] **Multi-Tenancy**: organizationId filter on all queries
- [ ] **Input Validation**: Zod schemas on all API inputs
- [ ] **HTTPS**: TLS 1.3 enabled (Vercel automatic)
- [ ] **CORS**: Restricted to same origin
- [ ] **CSP**: Content Security Policy headers set

---

## 📝 Deployment Notes Template

```markdown
## Deployment: [Date] [Time]

**Deployed By**: [Name]
**Version**: [Git SHA or Tag]
**Environment**: Production

### Changes Deployed
- [Feature/Fix 1]
- [Feature/Fix 2]
- [Feature/Fix 3]

### Pre-Deployment Checklist
- [x] All tests passing
- [x] Code review approved
- [x] Database backup taken
- [x] Security checks passed

### Post-Deployment Verification
- [x] Homepage loads
- [x] Login works
- [x] API health check passes
- [x] Error rate < 1%

### Issues Encountered
- None / [Issue description]

### Rollback Required
- No / Yes (reason)

### Next Steps
- Monitor for 24 hours
- Schedule security review (if security-related changes)
```

---

## 🚨 Emergency Hotfix Checklist

**When to Use**: Critical bug, security vulnerability, data corruption

### Expedited Process

- [ ] **Severity Assessment**: P0 (critical) or P1 (high)
- [ ] **Stakeholder Notification**: Engineering lead, security team (if security-related)
- [ ] **Code Fix**: Minimal change, single purpose
- [ ] **Testing**: Manual testing only (skip full test suite if time-critical)
- [ ] **Deployment**: Direct to main (skip PR if emergency)
- [ ] **Monitoring**: Watch for 1 hour after deployment
- [ ] **Post-Mortem**: Schedule within 24 hours

### Hotfix Approval

**P0 (Critical)**: Engineering lead approval (verbal OK)
**P1 (High)**: Code review by 1 engineer (can be async)

---

**Document Maintained By**: DevOps Team
**Last Review**: November 4, 2025
**Next Review**: Monthly
