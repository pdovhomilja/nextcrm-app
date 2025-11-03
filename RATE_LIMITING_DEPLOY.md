# Rate Limiting Deployment Guide

## Quick Start

Apply comprehensive API rate limiting to all 89 NextCRM routes:

```bash
# 1. Preview changes (recommended first step)
node scripts/apply-rate-limiting.js --dry-run

# 2. Apply rate limiting
node scripts/apply-rate-limiting.js

# 3. Test locally
pnpm dev

# 4. Run tests
pnpm test tests/rate-limiting.test.ts

# 5. Deploy
git add -A
git commit -m "feat: implement comprehensive API rate limiting"
git push origin main
```

## What Gets Applied

### ✅ Protected Routes (80 files)
- All CRM endpoints (accounts, contacts, leads, opportunities)
- All project management endpoints
- All invoice endpoints
- All organization management
- All user management
- All file upload endpoints
- All billing/Stripe endpoints
- All admin endpoints

### ⚠️ Excluded Routes (5 files)
- `/api/health` - Health checks
- `/api/webhooks/stripe` - Webhook validation
- `/api/cron/*` - Cron job endpoints
- `/api/auth/[...nextauth]` - NextAuth internal

### ✅ Already Applied (4 files)
- `/api/user/passwordReset`
- `/api/organization/*`
- `/api/crm/account/*`

## Rate Limits

| Plan | Default | Auth | Email | Upload | AI |
|------|---------|------|-------|--------|-----|
| **FREE** | 100/hr | 10/hr | 50/day | 20/hr | 10/hr |
| **PRO** | 1000/hr | 10/hr | Plan limit | Plan limit | Plan limit |
| **ENTERPRISE** | 10000/hr | 10/hr | Unlimited | Unlimited | Plan limit |

## Testing After Deployment

### Test 1: Verify Headers

```bash
curl -i http://localhost:3000/api/crm/accounts \
  -H "Cookie: next-auth.session-token=YOUR_SESSION"

# Should see:
# X-RateLimit-Limit: 100
# X-RateLimit-Remaining: 99
# X-RateLimit-Reset: 1704567890
```

### Test 2: Verify Rate Limiting Works

```bash
# Exhaust rate limit
for i in {1..105}; do
  curl http://localhost:3000/api/crm/accounts \
    -H "Cookie: ..." -s -o /dev/null -w "%{http_code}\n"
done

# Should see:
# 200 (×100)
# 429 (×5)
```

### Test 3: Verify Excluded Endpoints

```bash
# Health check should never rate limit
for i in {1..1000}; do
  curl -s http://localhost:3000/api/health | grep -q "healthy" && echo "OK"
done

# All should return OK
```

## Rollback

If issues arise:

```bash
# Option 1: Use script rollback
node scripts/apply-rate-limiting.js --rollback

# Option 2: Use git
git revert HEAD

# Option 3: Restore specific file
cp app/api/some/route.ts.backup app/api/some/route.ts
```

## Monitoring

### Check Rate Limit Violations

```typescript
// In admin panel or API
const violations = await prisma.auditLog.findMany({
  where: {
    action: "RATE_LIMIT_EXCEEDED",
    createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
  },
  orderBy: { createdAt: "desc" }
});

console.log(`${violations.length} rate limit violations in last 24h`);
```

### Check Current Usage

```bash
# API endpoint
curl http://localhost:3000/api/rate-limit \
  -H "Cookie: next-auth.session-token=YOUR_SESSION"

# Response:
# {
#   "limit": 100,
#   "remaining": 73,
#   "resetIn": "42 minutes",
#   "percentUsed": 27
# }
```

## Troubleshooting

### Error: "rateLimited is not defined"

**Cause**: Import missing
**Fix**: Run script again, it will add the import

### Error: "Cannot find module '@/middleware/with-rate-limit'"

**Cause**: TypeScript path resolution
**Fix**: Restart TypeScript server or rebuild

### Rate limiting not working

**Check 1**: Verify middleware applied
```typescript
// Should have:
export const GET = rateLimited(handleGET);

// Not:
export async function GET() { ... }
```

**Check 2**: Check session
```bash
# Must have valid session for org-based limiting
curl -i http://localhost:3000/api/your-endpoint \
  -H "Cookie: next-auth.session-token=VALID_TOKEN"
```

## Documentation

- **Full Guide**: `docs/RATE_LIMITING.md`
- **Implementation Summary**: `docs/RATE_LIMITING_IMPLEMENTATION_SUMMARY.md`
- **Tests**: `tests/rate-limiting.test.ts`
- **Configuration**: `lib/rate-limit-config.ts`

## Support

Questions? Check:
1. This deployment guide
2. Full documentation (`docs/RATE_LIMITING.md`)
3. Audit logs for violations
4. TypeScript compilation errors

## Success Checklist

- [ ] Dry-run completed successfully
- [ ] Script applied to 80 routes
- [ ] No TypeScript errors
- [ ] Rate limit headers visible in responses
- [ ] 429 responses work correctly
- [ ] Health endpoint still works
- [ ] Tests pass
- [ ] UI components show rate limit status
- [ ] Audit logs capture violations
- [ ] Rollback plan tested

## Next Steps After Deployment

1. **Monitor for 48 hours** - Watch for unexpected violations
2. **Gather feedback** - Are limits too strict/loose?
3. **Adjust if needed** - Update `lib/rate-limit-config.ts`
4. **Consider Redis** - For multi-server deployments
5. **Add analytics** - Dashboard for rate limit metrics

---

**Deployment Status**: ✅ Ready

**Last Updated**: 2025-01-06
