/**
 * Rate Limiting Configuration
 * Per-endpoint rate limit rules and configurations
 */

import { OrganizationPlan } from "@prisma/client";

export interface EndpointRateLimitConfig {
  requests: number;
  windowMs: number;
  skipForPlans?: OrganizationPlan[]; // Plans that bypass this limit
  bypassForAdmin?: boolean; // Admin users bypass
  useIPFallback?: boolean; // Use IP if no org (for auth endpoints)
}

/**
 * Default rate limits by organization plan
 */
export const DEFAULT_RATE_LIMITS: Record<
  OrganizationPlan,
  { requests: number; windowMs: number }
> = {
  FREE: { requests: 100, windowMs: 60 * 60 * 1000 }, // 100 req/hour
  PRO: { requests: 1000, windowMs: 60 * 60 * 1000 }, // 1,000 req/hour
  ENTERPRISE: { requests: 10000, windowMs: 60 * 60 * 1000 }, // 10,000 req/hour
};

/**
 * Special rate limit configurations for specific endpoint patterns
 */
export const ENDPOINT_RATE_LIMITS: Record<string, EndpointRateLimitConfig> = {
  // Authentication endpoints - Strictest limits to prevent brute force
  "/api/auth/signin": {
    requests: 10,
    windowMs: 60 * 60 * 1000, // 10 attempts per hour
    useIPFallback: true,
  },
  "/api/auth/signup": {
    requests: 5,
    windowMs: 60 * 60 * 1000, // 5 signups per hour per IP
    useIPFallback: true,
  },
  "/api/user/passwordReset": {
    requests: 5,
    windowMs: 60 * 60 * 1000, // 5 password reset per hour
    useIPFallback: true,
  },

  // Email sending - Daily limits
  "/api/invoice/send-by-email": {
    requests: 50, // FREE users
    windowMs: 24 * 60 * 60 * 1000, // 50 per day for FREE
    skipForPlans: ["PRO", "ENTERPRISE"], // PRO/ENTERPRISE get org-level limits
  },

  // File uploads - Lower limits, bigger impact
  "/api/upload": {
    requests: 20,
    windowMs: 60 * 60 * 1000, // 20 uploads per hour for FREE
    skipForPlans: ["ENTERPRISE"], // ENTERPRISE unlimited
  },

  // OpenAI endpoints - Cost-sensitive
  "/api/openai/completion": {
    requests: 10,
    windowMs: 60 * 60 * 1000, // 10 per hour for FREE
    skipForPlans: ["PRO", "ENTERPRISE"],
  },
  "/api/openai/create-chat-completion": {
    requests: 10,
    windowMs: 60 * 60 * 1000,
    skipForPlans: ["PRO", "ENTERPRISE"],
  },

  // Bulk operations - Lower limits
  "/api/crm/contacts/create-from-remote": {
    requests: 10,
    windowMs: 60 * 60 * 1000,
    bypassForAdmin: true,
  },

  // Data export - Resource intensive
  "/api/organization/export-data": {
    requests: 5,
    windowMs: 24 * 60 * 60 * 1000, // 5 exports per day
    skipForPlans: ["ENTERPRISE"],
  },

  // External service integrations
  "/api/invoice/rossum": {
    requests: 50,
    windowMs: 60 * 60 * 1000,
    skipForPlans: ["ENTERPRISE"],
  },
};

/**
 * Endpoints that bypass rate limiting entirely
 */
export const RATE_LIMIT_BYPASS_PATTERNS = [
  "/api/health", // Health checks
  "/api/webhooks/stripe", // Stripe webhooks (signature verified separately)
  "/api/cron/", // Cron jobs (CRON_SECRET verified separately)
];

/**
 * Get rate limit configuration for an endpoint
 */
export function getRateLimitConfig(
  pathname: string,
  plan: OrganizationPlan,
  isAdmin: boolean = false
): EndpointRateLimitConfig | null {
  // Check if endpoint should bypass rate limiting
  if (RATE_LIMIT_BYPASS_PATTERNS.some((pattern) => pathname.startsWith(pattern))) {
    return null;
  }

  // Check for exact endpoint match
  if (ENDPOINT_RATE_LIMITS[pathname]) {
    const config = ENDPOINT_RATE_LIMITS[pathname];

    // Check if plan is in skip list
    if (config.skipForPlans?.includes(plan)) {
      return null; // No rate limit for this plan
    }

    // Check admin bypass
    if (config.bypassForAdmin && isAdmin) {
      return null;
    }

    return config;
  }

  // Check for pattern matches
  for (const [pattern, config] of Object.entries(ENDPOINT_RATE_LIMITS)) {
    if (pathname.startsWith(pattern)) {
      if (config.skipForPlans?.includes(plan)) {
        return null;
      }
      if (config.bypassForAdmin && isAdmin) {
        return null;
      }
      return config;
    }
  }

  // Return default plan-based limit
  return {
    requests: DEFAULT_RATE_LIMITS[plan].requests,
    windowMs: DEFAULT_RATE_LIMITS[plan].windowMs,
  };
}

/**
 * Get identifier for rate limiting (organizationId or IP)
 */
export function getRateLimitIdentifier(
  organizationId: string | null | undefined,
  ipAddress: string | null,
  useIPFallback: boolean = false
): string {
  if (organizationId) {
    return `org:${organizationId}`;
  }

  if (useIPFallback && ipAddress) {
    return `ip:${ipAddress}`;
  }

  // Fallback to IP if no org (should rarely happen for authenticated routes)
  return `ip:${ipAddress || "unknown"}`;
}

/**
 * Format rate limit info for user display
 */
export function formatRateLimitInfo(
  limit: number,
  remaining: number,
  resetTime: number
): {
  limit: number;
  remaining: number;
  resetIn: string;
  percentUsed: number;
} {
  const now = Date.now();
  const resetInMs = resetTime - now;
  const resetInMinutes = Math.ceil(resetInMs / 1000 / 60);
  const resetInHours = Math.ceil(resetInMs / 1000 / 60 / 60);

  let resetIn: string;
  if (resetInMinutes < 60) {
    resetIn = `${resetInMinutes} minute${resetInMinutes !== 1 ? "s" : ""}`;
  } else {
    resetIn = `${resetInHours} hour${resetInHours !== 1 ? "s" : ""}`;
  }

  const percentUsed = Math.round(((limit - remaining) / limit) * 100);

  return {
    limit,
    remaining,
    resetIn,
    percentUsed,
  };
}
