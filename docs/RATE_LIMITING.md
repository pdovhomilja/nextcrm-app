# Rate Limiting Documentation

## Overview

NextCRM implements comprehensive API rate limiting to prevent abuse, ensure fair resource allocation, and protect infrastructure from overload. The system uses a **token bucket algorithm** with plan-based limits and endpoint-specific overrides.

## Architecture

### Components

1. **Core Rate Limiting** (`lib/rate-limit.ts`)
   - Token bucket implementation
   - In-memory storage (suitable for single-server deployments)
   - Automatic cleanup of expired entries

2. **Configuration** (`lib/rate-limit-config.ts`)
   - Plan-based default limits
   - Endpoint-specific overrides
   - Bypass patterns for health checks and webhooks

3. **Middleware** (`middleware/with-rate-limit.ts`)
   - Automatic rate limit enforcement
   - Header injection (X-RateLimit-*)
   - Audit logging for violations

4. **UI Components** (`components/rate-limit-indicator.tsx`)
   - User-facing rate limit status
   - Warning alerts when approaching limits
   - Inline badges for dashboards

## Rate Limit Tiers

### Default Plan Limits

| Plan | Requests | Window | Notes |
|------|----------|--------|-------|
| **FREE** | 100 | 1 hour | Suitable for small teams |
| **PRO** | 1,000 | 1 hour | For growing businesses |
| **ENTERPRISE** | 10,000 | 1 hour | High-volume operations |

### Endpoint-Specific Limits

#### Authentication Endpoints (Strict)
- **POST /api/auth/signin**: 10 requests/hour (per IP)
- **POST /api/auth/signup**: 5 requests/hour (per IP)
- **POST /api/user/passwordReset**: 5 requests/hour (per email)

**Rationale**: Prevent brute force attacks and account enumeration.

#### Email Sending
- **POST /api/invoice/send-by-email**:
  - FREE: 50/day
  - PRO/ENTERPRISE: Plan-level limits

**Rationale**: Prevent email spam and reduce costs.

#### File Uploads
- **POST /api/upload**:
  - FREE: 20/hour
  - PRO: Plan limits
  - ENTERPRISE: Unlimited

**Rationale**: Protect storage and bandwidth costs.

#### AI/OpenAI Endpoints
- **POST /api/openai/completion**:
  - FREE: 10/hour
  - PRO/ENTERPRISE: Plan limits

**Rationale**: Control OpenAI API costs.

#### Bulk Operations
- **POST /api/crm/contacts/create-from-remote**: 10/hour
- Admin users bypass this limit

**Rationale**: Prevent database overload from mass imports.

#### Data Export (Resource Intensive)
- **POST /api/organization/export-data**: 5/day
- ENTERPRISE: Unlimited

**Rationale**: Expensive operation requiring full database scan.

### Bypass Patterns

The following endpoints **bypass rate limiting entirely**:

- `/api/health` - Health checks
- `/api/webhooks/stripe` - Webhooks (signature verified separately)
- `/api/cron/*` - Cron jobs (CRON_SECRET verified)

## Implementation

### Applying Rate Limiting to Routes

#### Manual Application

```typescript
// app/api/example/route.ts
import { NextRequest, NextResponse } from "next/server";
import { rateLimited } from "@/middleware/with-rate-limit";

async function handleGET(req: NextRequest) {
  // Your handler logic
  return NextResponse.json({ success: true });
}

async function handlePOST(req: NextRequest) {
  // Your handler logic
  return NextResponse.json({ success: true });
}

// Apply rate limiting
export const GET = rateLimited(handleGET);
export const POST = rateLimited(handlePOST);
```

#### Bulk Application

Use the automated script to apply rate limiting to all routes:

```bash
# Preview changes
node scripts/apply-rate-limiting.js --dry-run

# Apply rate limiting
node scripts/apply-rate-limiting.js

# Rollback if needed
node scripts/apply-rate-limiting.js --rollback
```

The script:
- ✅ Adds rate limiting imports
- ✅ Converts exported functions to internal handlers
- ✅ Wraps handlers with `rateLimited()` middleware
- ✅ Creates backups before modifying
- ✅ Excludes health checks, webhooks, cron jobs

### Parameterized Routes

For routes with dynamic parameters like `[accountId]`:

```typescript
import { rateLimitedWithParams } from "@/middleware/with-rate-limit";

async function handleGET(
  req: NextRequest,
  { params }: { params: { accountId: string } }
) {
  const { accountId } = params;
  // Handler logic
}

export const GET = rateLimitedWithParams(handleGET);
```

## Response Headers

All rate-limited responses include standard headers:

```http
X-RateLimit-Limit: 1000        # Total requests allowed
X-RateLimit-Remaining: 847     # Requests remaining in window
X-RateLimit-Reset: 1704567890  # Unix timestamp when limit resets
```

### Rate Limit Exceeded (429)

When rate limit is exceeded:

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 3600
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1704567890

{
  "error": "Too Many Requests",
  "message": "Rate limit exceeded. Please try again later.",
  "retryAfter": 3600
}
```

## UI Integration

### Dashboard Widget

```tsx
import { RateLimitIndicator } from "@/components/rate-limit-indicator";

export function Dashboard() {
  return (
    <div>
      <RateLimitIndicator organizationId={orgId} />
      {/* Rest of dashboard */}
    </div>
  );
}
```

**Behavior**:
- Shows alert when >75% used (yellow)
- Shows critical alert when >90% used (red)
- Displays progress bar and reset time
- Links to billing/upgrade page

### Navbar Badge

```tsx
import { RateLimitBadge } from "@/components/rate-limit-indicator";

export function Navbar() {
  return (
    <nav>
      <RateLimitBadge organizationId={orgId} className="ml-4" />
    </nav>
  );
}
```

**Behavior**:
- Compact inline badge
- Hover tooltip with details
- Color-coded by severity

## Monitoring & Admin

### Check Rate Limit Status

```typescript
// API Endpoint: GET /api/rate-limit
const response = await fetch('/api/rate-limit');
const status = await response.json();

console.log(status);
// {
//   limit: 1000,
//   remaining: 847,
//   resetIn: "45 minutes",
//   percentUsed: 15
// }
```

### Admin: Reset Rate Limit

```typescript
import { resetRateLimit } from "@/lib/rate-limit";

// Reset limit for specific organization
resetRateLimit("org:org_123abc");

// Reset limit for IP
resetRateLimit("ip:192.168.1.1");
```

### Admin: View All Rate Limits

```typescript
import { getAllRateLimits } from "@/lib/rate-limit";

const allLimits = getAllRateLimits();
for (const [identifier, data] of allLimits.entries()) {
  console.log(`${identifier}: ${data.count} requests, resets at ${new Date(data.resetTime)}`);
}
```

### Audit Logging

Rate limit violations are automatically logged to the `AuditLog` table:

```typescript
{
  action: "RATE_LIMIT_EXCEEDED",
  resourceType: "API",
  resourceId: "/api/crm/accounts",
  metadata: {
    endpoint: "/api/crm/accounts",
    plan: "FREE",
    limit: 100,
    resetTime: "2024-01-06T12:00:00Z"
  },
  result: "failure"
}
```

Query violations:

```typescript
const violations = await prisma.auditLog.findMany({
  where: {
    action: "RATE_LIMIT_EXCEEDED",
    createdAt: { gte: startDate }
  },
  orderBy: { createdAt: "desc" }
});
```

## Testing

### Local Testing

1. **Set low limits for testing**:

```typescript
// lib/rate-limit-config.ts (temporary)
export const DEFAULT_RATE_LIMITS = {
  FREE: { requests: 5, windowMs: 60 * 1000 }, // 5 req/minute for testing
  // ...
};
```

2. **Hit endpoint repeatedly**:

```bash
for i in {1..10}; do
  curl http://localhost:3000/api/crm/accounts \
    -H "Cookie: next-auth.session-token=..." \
    -i
done
```

3. **Verify 429 response**:

```http
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 0
Retry-After: 42
```

### Integration Tests

```typescript
describe("Rate Limiting", () => {
  it("should enforce rate limits", async () => {
    const responses = [];

    // Make requests beyond limit
    for (let i = 0; i < 10; i++) {
      const res = await fetch("/api/test-endpoint");
      responses.push(res.status);
    }

    // First 5 succeed (for FREE plan)
    expect(responses.slice(0, 5)).toEqual([200, 200, 200, 200, 200]);

    // Next requests fail
    expect(responses.slice(5)).toEqual([429, 429, 429, 429, 429]);
  });

  it("should reset after window expires", async () => {
    // Exhaust limit
    for (let i = 0; i < 5; i++) {
      await fetch("/api/test-endpoint");
    }

    // Wait for window to expire
    await new Promise(resolve => setTimeout(resolve, 61000));

    // Should succeed again
    const res = await fetch("/api/test-endpoint");
    expect(res.status).toBe(200);
  });
});
```

## Production Considerations

### Single-Server vs. Multi-Server

**Current Implementation**: In-memory storage (single-server only)

**⚠️ WARNING**: If deploying behind a load balancer or using multiple instances:

1. Each server maintains its own counter
2. Effective limit = (limit × number of servers)
3. Example: 3 servers with 100 req/hour = 300 actual req/hour

**Solution for Multi-Server**: Use Redis-based rate limiting

### Redis Implementation (Future)

For production deployments with multiple servers:

```typescript
// lib/rate-limit-redis.ts
import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL);

export async function checkRateLimit(
  identifier: string,
  plan: OrganizationPlan
) {
  const key = `ratelimit:${identifier}`;
  const limit = RATE_LIMITS[plan];

  const count = await redis.incr(key);

  if (count === 1) {
    await redis.expire(key, limit.windowMs / 1000);
  }

  const ttl = await redis.ttl(key);
  const resetTime = Date.now() + (ttl * 1000);

  return {
    allowed: count <= limit.requests,
    remaining: Math.max(0, limit.requests - count),
    resetTime,
    limit: limit.requests,
  };
}
```

Then update `middleware/with-rate-limit.ts` to use Redis implementation.

### Performance Impact

Rate limiting adds minimal overhead:
- In-memory lookups: < 1ms
- Header injection: < 0.1ms
- Audit logging: Async, non-blocking

Measured impact: **< 2ms per request**

### Security Best Practices

1. **Never expose rate limit implementation details** in error messages
2. **Log violations** for security monitoring
3. **Use IP-based limiting** for unauthenticated endpoints
4. **Implement graduated response** (warn before blocking)
5. **Monitor for distributed attacks** (many IPs, one target)

## Troubleshooting

### Rate Limit Not Working

**Check 1**: Verify middleware is applied

```typescript
// Should have this pattern:
export const GET = rateLimited(handleGET);

// NOT this:
export async function GET() { ... }
```

**Check 2**: Check bypass patterns

```typescript
// In rate-limit-config.ts
RATE_LIMIT_BYPASS_PATTERNS // Does your endpoint match?
```

**Check 3**: Verify session

Rate limiting requires valid session for org-based limits. Check:
```bash
curl -i http://localhost:3000/api/your-endpoint
# Should see X-RateLimit-* headers
```

### Rate Limit Too Aggressive

**Temporary Fix**: Reset specific identifier

```typescript
import { resetRateLimit } from "@/lib/rate-limit";
resetRateLimit("org:org_123abc");
```

**Permanent Fix**: Adjust config

```typescript
// lib/rate-limit-config.ts
ENDPOINT_RATE_LIMITS["/api/your/endpoint"] = {
  requests: 200,  // Increase limit
  windowMs: 60 * 60 * 1000,
};
```

### Headers Not Showing

Ensure response is properly returned:

```typescript
// ✅ Correct
export const GET = rateLimited(handleGET);

// ❌ Wrong - headers won't be added
export async function GET() {
  return NextResponse.json({ data });
}
```

## Roadmap

- [ ] Redis backend for distributed rate limiting
- [ ] Per-user rate limiting (in addition to per-org)
- [ ] Dynamic rate limits based on subscription tier
- [ ] Rate limit analytics dashboard
- [ ] Automatic rate limit adjustment based on load
- [ ] Burst allowance (short-term spike handling)
- [ ] Rate limit webhooks (notify when approaching limits)

## Support

For questions or issues:
- Check this documentation
- Review `lib/rate-limit.ts` source code
- Check audit logs for violations
- Contact support with organization ID and timestamp

## Related Documentation

- [Multi-Tenancy Architecture](./MULTI_TENANCY.md)
- [Quota Enforcement](./QUOTA_ENFORCEMENT.md)
- [Security Best Practices](./SECURITY.md)
- [Monitoring & Observability](./MONITORING.md)
