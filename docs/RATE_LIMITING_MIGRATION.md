# Rate Limiting Migration Checklist

Quick reference guide for migrating from in-memory to Redis-based rate limiting.

## Pre-Migration Checklist

- [ ] Confirm deployment uses multiple server instances (load balancer, Kubernetes, etc.)
- [ ] Redis server available (version 6.0+)
- [ ] Network connectivity from app servers to Redis confirmed
- [ ] Redis credentials and connection details obtained
- [ ] Backup current rate limiting implementation

## Step-by-Step Migration

### 1. Install Dependencies

```bash
npm install ioredis
# or
pnpm add ioredis
# or
yarn add ioredis
```

### 2. Configure Environment Variables

Add to `.env` or your environment configuration:

```env
REDIS_URL=redis://your-redis-host:6379
REDIS_PASSWORD=your-password-if-required
```

For production environments:

```env
# AWS ElastiCache
REDIS_URL=redis://your-cluster.cache.amazonaws.com:6379

# Redis Cloud
REDIS_URL=rediss://default:password@redis-12345.cloud.redislabs.com:12345

# Azure Cache
REDIS_URL=rediss://yourname.redis.cache.windows.net:6380
REDIS_PASSWORD=your-azure-password

# Upstash
REDIS_URL=rediss://your-endpoint.upstash.io:6380
REDIS_PASSWORD=your-upstash-token
```

### 3. Update Import Statements

Find all files importing rate limiting:

```bash
# Using grep
grep -r "from '@/lib/rate-limit'" app/ lib/ middleware.ts

# Using ripgrep (recommended)
rg "from '@/lib/rate-limit'" -t ts -t tsx
```

**Before:**
```typescript
import {
  checkRateLimit,
  applyRateLimit,
  getRateLimitStatus,
} from "@/lib/rate-limit";
```

**After:**
```typescript
import {
  checkRateLimit,
  applyRateLimit,
  getRateLimitStatus,
} from "@/lib/rate-limit-redis";
```

### 4. Update Function Calls (Add await)

The Redis version is async, so update all function calls:

**Before:**
```typescript
const result = checkRateLimit(organizationId, plan);

const status = getRateLimitStatus(organizationId, plan);

const response = applyRateLimit(response, organizationId, plan);
```

**After:**
```typescript
const result = await checkRateLimit(organizationId, plan);

const status = await getRateLimitStatus(organizationId, plan);

const response = await applyRateLimit(response, organizationId, plan);
```

### 5. Update Parent Functions

Make sure parent functions are async:

**Before:**
```typescript
export function GET(request: Request) {
  const result = checkRateLimit(orgId, plan);
  // ...
}
```

**After:**
```typescript
export async function GET(request: Request) {
  const result = await checkRateLimit(orgId, plan);
  // ...
}
```

### 6. Test Redis Connection

Run the test script:

```bash
# Start Redis (if using Docker)
docker run -d --name redis-ratelimit -p 6379:6379 redis:7-alpine

# Run tests
npx ts-node scripts/test-rate-limit-redis.ts
```

Expected output:
```
✅ Redis Connected
✅ Rate limiting working correctly
✅ All plan types configured
```

### 7. Common Files to Update

Typical locations where rate limiting is used:

- [ ] `middleware.ts` - Main middleware file
- [ ] `app/api/*/route.ts` - API route handlers
- [ ] `lib/api-helpers.ts` - API utility functions
- [ ] Any custom middleware or wrapper functions

### 8. Verify Changes

#### Local Testing

1. Start Redis server
2. Start your application
3. Make API requests and verify rate limiting works
4. Check Redis keys: `redis-cli KEYS "ratelimit:*"`

#### Deployment Testing

1. Deploy to staging environment first
2. Monitor logs for Redis connection messages
3. Test with multiple concurrent requests
4. Verify rate limits are shared across server instances
5. Monitor Redis memory usage
6. Test failover behavior (optional)

## Verification Commands

```bash
# Check Redis connection
redis-cli -h your-host -p 6379 ping
# Expected: PONG

# View rate limit keys
redis-cli -h your-host -p 6379 KEYS "ratelimit:*"

# View specific rate limit
redis-cli -h your-host -p 6379 GET "ratelimit:org-id"

# Monitor Redis commands in real-time
redis-cli -h your-host -p 6379 MONITOR
```

## Rollback Plan

If issues occur, quickly revert:

1. Change imports back to `@/lib/rate-limit`
2. Remove `await` keywords
3. Redeploy previous version
4. Debug Redis issues offline

```bash
# Quick rollback with git
git diff HEAD -- path/to/file.ts
git checkout HEAD -- path/to/file.ts
```

## Post-Migration Checklist

- [ ] All imports updated to `rate-limit-redis`
- [ ] All function calls have `await` keyword
- [ ] All parent functions are `async`
- [ ] Redis connection verified in all environments
- [ ] Load testing completed successfully
- [ ] Monitoring/alerts configured for Redis
- [ ] Documentation updated
- [ ] Team notified of changes

## Monitoring After Migration

### Key Metrics

1. **Redis Connection Status**
   - Monitor connection errors
   - Track reconnection attempts
   - Alert on connection failures

2. **Rate Limit Accuracy**
   - Verify limits enforced correctly
   - Check for bypass attempts
   - Monitor 429 response rates

3. **Performance**
   - Track rate limit check latency
   - Monitor Redis memory usage
   - Watch for slow queries

### Health Check Endpoint

Add a health check for Redis:

```typescript
// app/api/health/route.ts
import { isRedisHealthy } from "@/lib/rate-limit-redis";

export async function GET() {
  return Response.json({
    redis: isRedisHealthy(),
    timestamp: new Date().toISOString(),
  });
}
```

## Troubleshooting

### Issue: "Redis connection failed"

**Solutions:**
- Verify REDIS_URL is correct
- Check Redis server is running
- Verify firewall/security group rules
- Test with `redis-cli` from app server

### Issue: "NOAUTH Authentication required"

**Solutions:**
- Set REDIS_PASSWORD environment variable
- Or include password in URL: `redis://:password@host:port`

### Issue: Rate limits not working

**Solutions:**
- Verify all imports updated
- Check for missed `await` keywords
- Ensure all servers connect to same Redis
- Test with `test-rate-limit-redis.ts` script

### Issue: High latency

**Solutions:**
- Use Redis server closer to app servers
- Enable connection pooling (already default)
- Check network latency
- Consider Redis cluster for distribution

## Need Help?

- Review: `RATE_LIMITING_PRODUCTION_GUIDE.md`
- Check logs for detailed error messages
- Run test script: `npx ts-node scripts/test-rate-limit-redis.ts`
- Verify Redis with: `redis-cli info`

## Estimated Migration Time

- Small project (<10 files): 15-30 minutes
- Medium project (10-50 files): 1-2 hours
- Large project (>50 files): 2-4 hours

**Note:** Most time is spent on testing and verification, not code changes.
