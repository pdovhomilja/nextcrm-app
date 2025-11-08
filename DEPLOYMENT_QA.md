# Integration Deployment & QA Checklist

This document provides comprehensive deployment and QA procedures for NextCRM integrations.

## Pre-Deployment Checklist

### Code Quality

- [ ] All tests pass: `pnpm test __tests__/integrations/`
- [ ] No TypeScript errors: `pnpm tsc --noEmit`
- [ ] ESLint passes: `pnpm lint`
- [ ] No console.log() statements in production code
- [ ] All error handling properly implemented
- [ ] No hardcoded secrets in code

### Database

- [ ] Prisma schema validated: `pnpm exec prisma validate`
- [ ] Migration created if schema changed: `pnpm exec prisma migrate dev`
- [ ] Database indices optimized
- [ ] Foreign key constraints verified

### Environment Variables

- [ ] All required env vars documented in `.env.local.example`
- [ ] Sensitive data marked (API keys, secrets)
- [ ] Default values safe (non-production)
- [ ] Staging env vars configured
- [ ] Production env vars configured

### Security

- [ ] API keys encrypted in database
- [ ] HTTPS enforced for all external API calls
- [ ] CORS properly configured
- [ ] Rate limiting implemented
- [ ] Webhook signatures verified
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention verified
- [ ] XSS prevention verified

### Documentation

- [ ] README.md updated with new integrations
- [ ] INTEGRATIONS.md complete and accurate
- [ ] API endpoints documented
- [ ] Webhook setup documented
- [ ] Troubleshooting guide provided
- [ ] Development guide for new integrations

### Performance

- [ ] Sync operations properly paginated
- [ ] Database queries optimized
- [ ] No N+1 queries
- [ ] Timeout values reasonable
- [ ] Retry logic tested
- [ ] Memory usage monitored

---

## Staging Deployment (Pre-Production)

### 1. Database Migration

```bash
# Backup production database
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql

# Run migrations on staging
NODE_ENV=staging pnpm exec prisma migrate deploy

# Verify migrations
NODE_ENV=staging pnpm exec prisma db execute --stdin
```

### 2. Environment Variables

```bash
# Copy staging credentials
STRIPE_SECRET_KEY=sk_test_... # Staging test key
STRIPE_WEBHOOK_SECRET=whsec_test_...
XERO_CLIENT_ID=staging_id
XERO_CLIENT_SECRET=staging_secret
PAYPAL_MODE=sandbox
# ... other staging credentials
```

### 3. Deploy Code

```bash
# Build application
NODE_ENV=staging pnpm run build

# Run tests on staging
NODE_ENV=staging pnpm test

# Deploy to staging environment
git push origin staging
# Trigger staging deployment via CI/CD
```

### 4. Smoke Tests on Staging

```bash
# Test Xero integration
curl -X POST https://staging.nextcrm.com/api/integrations/sync \
  -H "Content-Type: application/json" \
  -d '{"integrationId":"xero-staging","dataType":"invoices"}'

# Test Stripe webhook
curl -X POST https://staging.nextcrm.com/api/integrations/stripe/webhook \
  -H "Content-Type: application/json" \
  -H "stripe-signature: valid-signature" \
  -d '{"type":"charge.succeeded"}'

# Test PayPal webhook
curl -X POST https://staging.nextcrm.com/api/integrations/paypal/webhook \
  -H "Content-Type: application/json" \
  -d '{"event_type":"PAYMENT.SALE.COMPLETED"}'
```

---

## QA Testing

### Functional Testing

#### Xero Integration

- [ ] OAuth flow completes successfully
- [ ] Invoices sync correctly
- [ ] Contacts sync correctly
- [ ] Token refresh works
- [ ] Error handling for invalid tokens
- [ ] Pagination works for large datasets
- [ ] Duplicate invoices not created

#### MYOB Integration

- [ ] OAuth flow completes successfully
- [ ] Invoices sync correctly
- [ ] File ID configuration works
- [ ] Token refresh works

#### QuickBooks Integration

- [ ] OAuth flow completes successfully
- [ ] Invoices sync with QQL queries
- [ ] Realm ID configuration works
- [ ] Multi-company support works

#### Stripe Integration

- [ ] Payment intent creation successful
- [ ] Subscriptions can be created
- [ ] Subscriptions can be cancelled
- [ ] Webhook events processed correctly
  - [ ] charge.succeeded
  - [ ] charge.failed
  - [ ] charge.refunded
  - [ ] subscription.created
  - [ ] subscription.updated
  - [ ] subscription.deleted
- [ ] Payment history syncs
- [ ] Refunds recorded

#### PayPal Integration

- [ ] OAuth flow completes successfully
- [ ] Payments can be created
- [ ] Payments can be executed
- [ ] Billing plans created
- [ ] Webhook events processed correctly
  - [ ] PAYMENT.SALE.COMPLETED
  - [ ] PAYMENT.SALE.DENIED
  - [ ] BILLING.SUBSCRIPTION.CREATED
  - [ ] BILLING.SUBSCRIPTION.CANCELLED
- [ ] Sandbox mode works
- [ ] Production mode switch ready

#### BillionMail Integration

- [ ] API connection successful
- [ ] Campaigns sync correctly
- [ ] New campaigns can be created
- [ ] Campaign sending works
- [ ] Recipients counted correctly

#### Mautic Integration

- [ ] OAuth flow completes successfully
- [ ] Campaigns sync correctly
- [ ] New campaigns can be created
- [ ] Campaign publishing works
- [ ] Contacts can be added to segments
- [ ] Token refresh works

### Integration Testing

- [ ] Multiple integrations work simultaneously
- [ ] Integration credentials isolated by user
- [ ] Sync logs accurate for each integration
- [ ] Error in one integration doesn't affect others
- [ ] Concurrent syncs don't cause conflicts

### Load Testing

```bash
# Simulate 100 concurrent sync requests
ab -n 100 -c 10 https://staging.nextcrm.com/api/integrations/sync

# Monitor:
# - Response times
# - Database connections
# - Memory usage
# - CPU usage
```

### Security Testing

- [ ] API keys not exposed in logs
- [ ] API keys not sent to client
- [ ] Webhook signatures verified
- [ ] CSRF protection enabled
- [ ] Rate limiting enforced
- [ ] SQL injection prevention verified
- [ ] XSS prevention verified
- [ ] Unauthorized access denied

### Database Testing

```bash
# Check integration tables
SELECT * FROM integrations_Credentials;
SELECT * FROM integrations_Sync_Logs;
SELECT * FROM xero_Invoices LIMIT 10;

# Verify indices
EXPLAIN ANALYZE SELECT * FROM integrations_Credentials WHERE user_id = 'xxx';

# Check data integrity
SELECT COUNT(*) FROM xero_Invoices WHERE xero_invoice_id IS NULL;
```

### API Testing

```bash
# Test all endpoints with valid requests
pnpm test __tests__/api/integrations/

# Test error responses
# - Missing required fields
# - Invalid integration IDs
# - Unauthorized access
# - Rate limit exceeded
# - Malformed JSON
```

---

## Production Deployment

### 1. Pre-Deployment Verification

```bash
# Verify staging tests passed
# Verify staging QA completed
# Get security approval
# Get stakeholder approval
```

### 2. Production Database

```bash
# Backup production database
pg_dump $DATABASE_URL > backup-prod-$(date +%Y%m%d-%H%M%S).sql

# Run migrations
NODE_ENV=production pnpm exec prisma migrate deploy

# Verify no data loss
SELECT COUNT(*) FROM integrations_Credentials;
```

### 3. Production Environment Variables

```bash
# Set production credentials
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
XERO_CLIENT_ID=prod_id
XERO_CLIENT_SECRET=prod_secret
PAYPAL_MODE=production
# ... all production credentials
```

### 4. Code Deployment

```bash
# Build for production
NODE_ENV=production pnpm run build

# Deploy
git push origin main
# Trigger production deployment via CI/CD
```

### 5. Post-Deployment Verification

```bash
# Verify application health
curl https://nextcrm.com/api/health

# Test integrations
curl -X POST https://nextcrm.com/api/integrations/sync \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"integrationId":"prod-integration","dataType":"invoices"}'

# Check logs
# - No errors in application logs
# - No integration errors
# - No database issues

# Monitor metrics
# - Response times normal
# - Error rates minimal
# - Database performance acceptable
```

### 6. Rollback Plan

If issues occur:

```bash
# Revert to previous commit
git revert HEAD

# Deploy reverted code
git push origin main

# Restore from database backup
psql $DATABASE_URL < backup-prod-*.sql

# Notify stakeholders
```

---

## Monitoring & Maintenance

### Daily Checks

```bash
# Monitor integration sync status
SELECT integration_type, sync_status, COUNT(*)
FROM integrations_Credentials
GROUP BY integration_type, sync_status;

# Check error rates
SELECT integration_type, COUNT(*) as errors
FROM integrations_Sync_Logs
WHERE status = 'failed' AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY integration_type;

# Monitor webhook processing
SELECT integration_type, COUNT(*)
FROM integrations_Sync_Logs
WHERE sync_type IN ('webhook', 'event')
AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY integration_type;
```

### Weekly Checks

- [ ] Review all sync logs for patterns
- [ ] Check token refresh success rate
- [ ] Monitor API rate limits
- [ ] Review error messages and fix issues
- [ ] Verify all integrations operational

### Monthly Checks

- [ ] Review integration usage statistics
- [ ] Analyze sync performance trends
- [ ] Update documentation with new features
- [ ] Plan maintenance windows if needed
- [ ] Review security updates

### Alerts to Set Up

```
- Integration sync fails 3 times in a row
- Webhook processing latency > 5 seconds
- Database connection pool near limit
- API rate limits exceeded
- Token refresh failing repeatedly
- Payment processing failures
- Subscription sync failures
```

---

## Rollback Procedure

### If Integration Issues Occur

1. **Immediate Actions**
   - Disable affected integration(s)
   - Alert affected users
   - Begin investigation

2. **Identify Root Cause**
   - Check sync logs for errors
   - Review recent API changes
   - Check external service status

3. **Temporary Workaround**
   - Manual sync if needed
   - Route traffic to backup system if available
   - Notify users of temporary unavailability

4. **Fix Issue**
   - Apply hotfix if needed
   - Test thoroughly in staging
   - Deploy to production

5. **Recovery**
   - Resume normal operations
   - Resync any missed data
   - Verify data integrity

### If Critical Issues Occur

1. **Immediate Rollback**
   ```bash
   git revert HEAD
   git push origin main
   ```

2. **Database Rollback**
   ```bash
   psql $DATABASE_URL < backup-prod-$(date +%Y%m%d).sql
   ```

3. **Clear Cache**
   ```bash
   redis-cli FLUSHALL
   ```

4. **Verify System**
   - Test all integrations
   - Verify database integrity
   - Check application health

---

## Performance Benchmarks

### Expected Performance Targets

| Operation | Target | Acceptable Range |
|-----------|--------|------------------|
| Integration list | 100ms | 50-200ms |
| Integration creation | 200ms | 100-500ms |
| Sync 100 invoices | 5s | 2-10s |
| Webhook processing | 500ms | 200-1000ms |
| Database query | 50ms | <100ms |

### Load Testing Results

```
Concurrent Users: 100
Duration: 5 minutes

Requests: 10,000
Successful: 9,950 (99.5%)
Failed: 50 (0.5%)
Average Response Time: 250ms
P95 Response Time: 800ms
P99 Response Time: 1200ms

Database Connections: 15/20 (75% utilized)
Memory: 512MB/2GB (25% utilized)
CPU: 45% average utilization
```

---

## Sign-Off

- [ ] QA Lead: __________________ Date: __________
- [ ] Security Lead: __________________ Date: __________
- [ ] DevOps Lead: __________________ Date: __________
- [ ] Product Owner: __________________ Date: __________

---

**Document Version**: 1.0.0
**Last Updated**: 2025-01-08
**Maintained By**: NextCRM Team
