# Rate Limiting System Documentation

Complete documentation for NextCRM's rate limiting implementation.

## Overview

NextCRM implements a token bucket algorithm for API rate limiting with two implementations:

1. **In-Memory** (`lib/rate-limit.ts`) - For single-server deployments
2. **Redis-Based** (`lib/rate-limit-redis.ts`) - For multi-server/production deployments

## Quick Start

### For Development (Single Server)

```typescript
// Use in-memory implementation (default)
import { checkRateLimit, applyRateLimit } from "@/lib/rate-limit";

// In your API route
export async function GET(request: Request) {
  const { organizationId, plan } = getOrgDetails(request);

  const result = checkRateLimit(organizationId, plan);

  if (!result.allowed) {
    return new Response("Rate limit exceeded", { status: 429 });
  }

  // Process request...
}
```

### For Production (Multiple Servers)

```typescript
// Use Redis implementation
import { checkRateLimit, applyRateLimit } from "@/lib/rate-limit-redis";

// In your API route (note: async)
export async function GET(request: Request) {
  const { organizationId, plan } = getOrgDetails(request);

  const result = await checkRateLimit(organizationId, plan); // Note: await

  if (!result.allowed) {
    return new Response("Rate limit exceeded", { status: 429 });
  }

  // Process request...
}
```

## Rate Limit Tiers

| Plan | Requests | Window | Description |
|------|----------|--------|-------------|
| FREE | 100 | 1 hour | Free tier users |
| PRO | 1,000 | 1 hour | Professional plan |
| ENTERPRISE | 10,000 | 1 hour | Enterprise customers |

## API Reference

### checkRateLimit()

Check if a request is within the rate limit and increment counter.

```typescript
const result = await checkRateLimit(organizationId, plan);

// Returns:
{
  allowed: boolean,      // true if within limit
  remaining: number,     // requests remaining
  resetTime: number,     // timestamp when limit resets
  limit: number         // total limit per window
}
```

### getRateLimitStatus()

Get current rate limit status without incrementing counter.

```typescript
const status = await getRateLimitStatus(organizationId, plan);

// Returns:
{
  remaining: number,     // requests remaining
  resetTime: number,     // timestamp when limit resets
  limit: number,        // total limit per window
  used: number          // requests used so far
}
```

### applyRateLimit()

Convenience function to check rate limit and add headers to response.

```typescript
const response = NextResponse.json({ data });
const rateLimitedResponse = await applyRateLimit(
  response,
  organizationId,
  plan
);

// Automatically:
// - Checks rate limit
// - Returns 429 if exceeded
// - Adds rate limit headers
// - Returns response unchanged if allowed
```

### createRateLimitHeaders()

Create standard rate limit headers.

```typescript
const headers = createRateLimitHeaders(limit, remaining, resetTime);

// Returns:
{
  "X-RateLimit-Limit": "100",
  "X-RateLimit-Remaining": "95",
  "X-RateLimit-Reset": "1699564800",
  "Retry-After": "300"  // Only if limit exceeded
}
```

### resetRateLimit() (Admin)

Reset rate limit for an organization.

```typescript
await resetRateLimit(organizationId);
// Counter reset to 0, new window starts
```

### getAllRateLimits() (Admin)

Get all rate limit entries for monitoring.

```typescript
const limits = await getAllRateLimits();
// Returns Map<string, RateLimitData>
```

## Response Headers

All rate-limited endpoints include these headers:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1699564800
```

When rate limit is exceeded:

```http
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1699564800
Retry-After: 300

{
  "error": "Too Many Requests",
  "message": "Rate limit exceeded. Please try again later.",
  "retryAfter": 300
}
```

## Implementation Patterns

### Pattern 1: Manual Check

```typescript
export async function GET(request: Request) {
  const { orgId, plan } = await getAuthDetails(request);

  const rateLimit = await checkRateLimit(orgId, plan);

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      {
        status: 429,
        headers: createRateLimitHeaders(
          rateLimit.limit,
          rateLimit.remaining,
          rateLimit.resetTime
        )
      }
    );
  }

  // Your API logic here
  const data = await processRequest();

  const response = NextResponse.json({ data });

  // Add rate limit headers
  const headers = createRateLimitHeaders(
    rateLimit.limit,
    rateLimit.remaining,
    rateLimit.resetTime
  );

  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}
```

### Pattern 2: Automatic (Recommended)

```typescript
export async function GET(request: Request) {
  const { orgId, plan } = await getAuthDetails(request);

  // Your API logic here
  const data = await processRequest();

  const response = NextResponse.json({ data });

  // Automatically check limit and add headers
  return await applyRateLimit(response, orgId, plan);
}
```

### Pattern 3: Middleware (Global)

```typescript
// middleware.ts
import { checkRateLimit } from "@/lib/rate-limit-redis";

export async function middleware(request: NextRequest) {
  const { orgId, plan } = getAuthFromRequest(request);

  if (request.nextUrl.pathname.startsWith('/api/')) {
    const result = await checkRateLimit(orgId, plan);

    if (!result.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        { status: 429 }
      );
    }
  }

  return NextResponse.next();
}
```

### Pattern 4: Status Endpoint

```typescript
// app/api/rate-limit/status/route.ts
import { getRateLimitStatus } from "@/lib/rate-limit-redis";

export async function GET(request: Request) {
  const { orgId, plan } = await getAuthDetails(request);

  const status = await getRateLimitStatus(orgId, plan);

  return NextResponse.json({
    limit: status.limit,
    used: status.used,
    remaining: status.remaining,
    resetTime: new Date(status.resetTime).toISOString(),
    resetIn: Math.floor((status.resetTime - Date.now()) / 1000),
  });
}
```

## Setup Instructions

### Development Setup (In-Memory)

No setup required! Just import and use:

```typescript
import { checkRateLimit } from "@/lib/rate-limit";
```

### Production Setup (Redis)

1. **Install Redis**

```bash
# Docker (recommended)
docker run -d --name redis -p 6379:6379 redis:7-alpine

# Or with docker-compose
docker-compose -f docker-compose.redis.yml up -d
```

2. **Install ioredis**

```bash
npm install ioredis
```

3. **Configure Environment**

```env
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=your-password  # Optional
```

4. **Update Imports**

```typescript
// Change from:
import { checkRateLimit } from "@/lib/rate-limit";

// To:
import { checkRateLimit } from "@/lib/rate-limit-redis";
```

5. **Add await Keywords**

```typescript
// Change from:
const result = checkRateLimit(orgId, plan);

// To:
const result = await checkRateLimit(orgId, plan);
```

## Testing

### Run Test Suite

```bash
# Start Redis
docker-compose -f docker-compose.redis.yml up -d

# Run tests
npx ts-node scripts/test-rate-limit-redis.ts
```

Expected output:
```
✅ Redis Connected
✅ Rate limiting working correctly
✅ Distributed behavior verified
✅ All plan types configured
```

### Manual Testing

```bash
# Check Redis is running
redis-cli ping
# Expected: PONG

# View rate limit keys
redis-cli KEYS "ratelimit:*"

# View specific rate limit
redis-cli GET "ratelimit:org-123"
```

## Monitoring

### Health Check

```typescript
import { isRedisHealthy } from "@/lib/rate-limit-redis";

export async function GET() {
  return Response.json({
    redis: isRedisHealthy(),
    timestamp: Date.now(),
  });
}
```

### Admin Dashboard

```typescript
import { getAllRateLimits } from "@/lib/rate-limit-redis";

export async function GET() {
  const limits = await getAllRateLimits();

  return Response.json({
    total: limits.size,
    organizations: Array.from(limits.entries()).map(([key, data]) => ({
      organization: key,
      count: data.count,
      resetTime: new Date(data.resetTime).toISOString(),
    })),
  });
}
```

### Redis Metrics

```bash
# Connection info
redis-cli INFO clients

# Memory usage
redis-cli INFO memory

# Performance stats
redis-cli INFO stats

# Monitor commands in real-time
redis-cli MONITOR
```

## Troubleshooting

### Common Issues

#### "Cannot find module '@/lib/rate-limit'"

**Solution**: Check import path matches your project structure.

#### "Redis connection failed"

**Solutions**:
- Verify Redis is running: `redis-cli ping`
- Check REDIS_URL in environment variables
- Verify network connectivity
- Check firewall rules

#### "NOAUTH Authentication required"

**Solution**: Set REDIS_PASSWORD environment variable.

#### "Rate limits not working across servers"

**Solution**: Ensure all servers:
- Use Redis implementation (not in-memory)
- Connect to the same Redis instance
- Have correct REDIS_URL configured

#### "High latency"

**Solutions**:
- Use Redis server closer to app servers
- Check network latency
- Consider Redis Cluster
- Verify connection pooling is enabled (default)

## Security Best Practices

1. **Use Authentication**
   ```env
   REDIS_PASSWORD=strong-random-password
   ```

2. **Enable TLS in Production**
   ```env
   REDIS_URL=rediss://host:6380  # Note: rediss (with 's')
   ```

3. **Network Security**
   - Use private networks (VPC)
   - Configure firewall rules
   - Never expose Redis to public internet

4. **Disable Dangerous Commands**
   ```conf
   # redis.conf
   rename-command FLUSHDB ""
   rename-command FLUSHALL ""
   ```

## Performance Optimization

1. **Connection Pooling** (Already enabled)
   ```typescript
   // Automatic in rate-limit-redis.ts
   maxRetriesPerRequest: 3
   enableOfflineQueue: true
   ```

2. **Memory Limits**
   ```conf
   # redis.conf
   maxmemory 256mb
   maxmemory-policy allkeys-lru
   ```

3. **Persistence** (Optional)
   ```conf
   # For AOF persistence
   appendonly yes
   appendfsync everysec
   ```

## Architecture Diagrams

### In-Memory Architecture

```
┌──────────┐
│  Client  │
└────┬─────┘
     │
     ▼
┌─────────────────┐
│   Server (1)    │
│                 │
│  ┌───────────┐  │
│  │    Map    │  │
│  │  org-1: 5 │  │
│  └───────────┘  │
└─────────────────┘
```

### Redis Architecture (Multi-Server)

```
┌──────────┐
│  Client  │
└────┬─────┘
     │
     ▼
┌──────────────┐
│Load Balancer │
└──────┬───────┘
       │
   ┌───┴───┬───────┐
   ▼       ▼       ▼
┌─────┐ ┌─────┐ ┌─────┐
│Srv 1│ │Srv 2│ │Srv 3│
└──┬──┘ └──┬──┘ └──┬──┘
   │       │       │
   └───┬───┴───┬───┘
       ▼       ▼
   ┌──────────────┐
   │    Redis     │
   │  org-1: 15   │
   └──────────────┘
```

## Documentation Index

- **[RATE_LIMITING_PRODUCTION_GUIDE.md](./RATE_LIMITING_PRODUCTION_GUIDE.md)** - Complete production deployment guide
- **[RATE_LIMITING_MIGRATION.md](./RATE_LIMITING_MIGRATION.md)** - Step-by-step migration checklist
- **[RATE_LIMITING_COMPARISON.md](./RATE_LIMITING_COMPARISON.md)** - Detailed comparison of implementations

## Related Files

- `lib/rate-limit.ts` - In-memory implementation
- `lib/rate-limit-redis.ts` - Redis implementation
- `scripts/test-rate-limit-redis.ts` - Test suite
- `docker-compose.redis.yml` - Redis setup (development)
- `docker-compose.redis-secure.yml` - Redis setup (with auth)

## Support

For issues or questions:

1. Check the troubleshooting section above
2. Review logs for error messages
3. Run the test script: `npx ts-node scripts/test-rate-limit-redis.ts`
4. Verify Redis connection: `redis-cli ping`
5. Check environment variables are set correctly

## Contributing

When modifying rate limiting:

1. Maintain API compatibility between implementations
2. Add tests for new features
3. Update documentation
4. Test both in-memory and Redis versions
5. Benchmark performance changes

## License

Same as NextCRM project license.
