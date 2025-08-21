import { NextRequest } from "next/server";
import { auth } from "@/auth";
import db from "@/lib/db";

export interface SecurityAuditLog {
  userId: string;
  action: string;
  resource: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  details: Record<string, any>;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
  risk: "low" | "medium" | "high";
}

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

export class AISecurityService {
  private static instance: AISecurityService;
  private rateLimitStore: Map<string, { count: number; resetTime: number }> =
    new Map();

  // Rate limit configurations
  private rateLimits: Record<string, RateLimitConfig> = {
    "ai-chat": { windowMs: 60000, maxRequests: 30 }, // 30 requests per minute
    "ai-suggestions": { windowMs: 300000, maxRequests: 20 }, // 20 requests per 5 minutes
    "ai-analysis": { windowMs: 900000, maxRequests: 10 }, // 10 requests per 15 minutes
    "document-processing": { windowMs: 3600000, maxRequests: 50 }, // 50 per hour
  };

  static getInstance(): AISecurityService {
    if (!AISecurityService.instance) {
      AISecurityService.instance = new AISecurityService();
    }
    return AISecurityService.instance;
  }

  /**
   * Check rate limits for AI operations
   */
  async checkRateLimit(
    userId: string,
    operation: string,
    request?: NextRequest
  ): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: number;
    retryAfter?: number;
  }> {
    const config = this.rateLimits[operation];
    if (!config) {
      return { allowed: true, remaining: Infinity, resetTime: 0 };
    }

    const key = `${userId}:${operation}`;
    const now = Date.now();
    const current = this.rateLimitStore.get(key);

    // Reset if window expired
    if (!current || now > current.resetTime) {
      const newResetTime = now + config.windowMs;
      this.rateLimitStore.set(key, { count: 1, resetTime: newResetTime });

      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetTime: newResetTime,
      };
    }

    // Check if limit exceeded
    if (current.count >= config.maxRequests) {
      await this.logSecurityEvent({
        userId,
        action: "RATE_LIMIT_EXCEEDED",
        resource: operation,
        details: {
          currentCount: current.count,
          maxRequests: config.maxRequests,
          windowMs: config.windowMs,
        },
        timestamp: new Date(),
        ipAddress:
          request?.headers.get("x-forwarded-for") ||
          request?.headers.get("x-real-ip") ||
          undefined,
        userAgent: request?.headers.get("user-agent") || undefined,
        risk: "medium",
      });

      return {
        allowed: false,
        remaining: 0,
        resetTime: current.resetTime,
        retryAfter: Math.ceil((current.resetTime - now) / 1000),
      };
    }

    // Increment counter
    current.count += 1;
    this.rateLimitStore.set(key, current);

    return {
      allowed: true,
      remaining: config.maxRequests - current.count,
      resetTime: current.resetTime,
    };
  }

  /**
   * Log security events for audit trail
   */
  async logSecurityEvent(event: SecurityAuditLog): Promise<void> {
    try {
      await db.securityAuditLog.create({
        data: {
          userId: event.userId,
          action: event.action,
          resource: event.resource,
          details: event.details,
          timestamp: event.timestamp,
          ipAddress: event.ipAddress,
          userAgent: event.userAgent,
          risk: event.risk,
        },
      });

      // Alert on high-risk events
      if (event.risk === "high") {
        await this.alertHighRiskEvent(event);
      }
    } catch (error) {
      console.error("Failed to log security event:", error);
    }
  }

  /**
   * Validate and sanitize AI input
   */
  validateAIInput(
    input: string,
    maxLength: number = 4000
  ): {
    isValid: boolean;
    sanitized: string;
    warnings: string[];
  } {
    const warnings: string[] = [];
    let sanitized = input;

    // Check length
    if (input.length > maxLength) {
      sanitized = input.substring(0, maxLength);
      warnings.push(`Input truncated to ${maxLength} characters`);
    }

    // Remove potentially malicious patterns
    const maliciousPatterns = [
      /javascript:/gi,
      /<script[^>]*>.*?<\/script>/gi,
      /on\w+\s*=/gi,
      /data:text\/html/gi,
    ];

    maliciousPatterns.forEach((pattern) => {
      if (pattern.test(sanitized)) {
        sanitized = sanitized.replace(pattern, "[FILTERED]");
        warnings.push("Potentially malicious content filtered");
      }
    });

    // Check for potential data exfiltration attempts
    const sensitivePatterns = [
      /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, // Credit card patterns
      /\b\d{3}-\d{2}-\d{4}\b/g, // SSN patterns
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Email patterns
    ];

    sensitivePatterns.forEach((pattern) => {
      if (pattern.test(sanitized)) {
        warnings.push("Potentially sensitive information detected");
      }
    });

    return {
      isValid: warnings.length === 0,
      sanitized,
      warnings,
    };
  }

  /**
   * Check user permissions for AI operations
   */
  async checkAIPermissions(
    userId: string,
    operation: string,
    _resourceId?: string // eslint-disable-line @typescript-eslint/no-unused-vars
  ): Promise<{ allowed: boolean; reason?: string }> {
    try {
      const user = await db.user.findUnique({
        where: { id: userId },
        select: { 
          role: true,
          memberships: {
            select: {
              companyId: true,
              role: true
            }
          }
        },
      });

      if (!user) {
        return { allowed: false, reason: "User not found" };
      }

      // Check operation-specific permissions
      switch (operation) {
        case "ai-admin":
          return {
            allowed: user.role === "ADMIN",
            reason: user.role !== "ADMIN" ? "Admin role required" : undefined,
          };

        case "document-processing":
          return {
            allowed: ["ADMIN", "EDITOR", "MEDIA"].includes(user.role),
            reason: !["ADMIN", "EDITOR", "MEDIA"].includes(user.role)
              ? "Insufficient permissions"
              : undefined,
          };

        case "ai-analysis":
          return {
            allowed: ["ADMIN", "EDITOR", "CONTRIBUTOR"].includes(user.role),
            reason: !["ADMIN", "EDITOR", "CONTRIBUTOR"].includes(user.role)
              ? "Insufficient permissions"
              : undefined,
          };

        default:
          // Basic AI operations allowed for all authenticated users
          return { allowed: true };
      }
    } catch (error) {
      console.error("Permission check error:", error);
      return { allowed: false, reason: "Permission check failed" };
    }
  }

  /**
   * Implement data privacy controls
   */
  async anonymizeUserData(userId: string): Promise<void> {
    try {
      // Anonymize conversation history
      await db.aIMessage.updateMany({
        where: {
          conversation: { userId },
        },
        data: {
          content: "[ANONYMIZED]",
          metadata: {},
        },
      });

      // Anonymize conversation summaries
      await db.conversationSummary.updateMany({
        where: {
          conversation: { userId },
        },
        data: {
          summary: "[ANONYMIZED]",
          keyTopics: [],
          actionItems: [],
        },
      });

      await this.logSecurityEvent({
        userId,
        action: "DATA_ANONYMIZED",
        resource: "user_data",
        details: { anonymizedAt: new Date() },
        timestamp: new Date(),
        risk: "low",
      });
    } catch (error) {
      console.error("Data anonymization error:", error);
      throw error;
    }
  }

  /**
   * Delete user AI data (GDPR compliance)
   */
  async deleteUserAIData(userId: string): Promise<void> {
    try {
      // Delete conversations and messages
      await db.aIMessage.deleteMany({
        where: {
          conversation: { userId },
        },
      });

      await db.aIConversation.deleteMany({
        where: { userId },
      });

      // Delete user documents
      await db.document.deleteMany({
        where: { uploadedBy: userId },
      });

      await this.logSecurityEvent({
        userId,
        action: "DATA_DELETED",
        resource: "user_ai_data",
        details: { deletedAt: new Date(), gdprCompliance: true },
        timestamp: new Date(),
        risk: "low",
      });
    } catch (error) {
      console.error("Data deletion error:", error);
      throw error;
    }
  }

  /**
   * Alert on high-risk security events
   */
  private async alertHighRiskEvent(event: SecurityAuditLog): Promise<void> {
    // In production, this would integrate with alerting systems
    console.warn("HIGH RISK SECURITY EVENT:", {
      userId: event.userId,
      action: event.action,
      resource: event.resource,
      timestamp: event.timestamp,
      details: event.details,
    });

    // Could integrate with services like:
    // - Slack/Discord webhooks
    // - Email alerts
    // - PagerDuty
    // - Security incident response systems
  }

  /**
   * Clean up old rate limit data
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, data] of this.rateLimitStore.entries()) {
      if (now > data.resetTime) {
        this.rateLimitStore.delete(key);
      }
    }
  }

  /**
   * Get security metrics
   */
  async getSecurityMetrics(
    timeRange: "hour" | "day" | "week" = "day"
  ): Promise<{
    totalEvents: number;
    highRiskEvents: number;
    rateLimitViolations: number;
    topActions: Array<{ action: string; count: number }>;
  }> {
    const hoursBack = timeRange === "hour" ? 1 : timeRange === "day" ? 24 : 168;
    const since = new Date(Date.now() - hoursBack * 60 * 60 * 1000);

    try {
      const events = await db.securityAuditLog.findMany({
        where: {
          timestamp: { gte: since },
        },
        select: {
          action: true,
          risk: true,
        },
      });

      const actionCounts = events.reduce(
        (acc, event) => {
          acc[event.action] = (acc[event.action] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

      const topActions = Object.entries(actionCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([action, count]) => ({ action, count }));

      return {
        totalEvents: events.length,
        highRiskEvents: events.filter((e) => e.risk === "high").length,
        rateLimitViolations: events.filter(
          (e) => e.action === "RATE_LIMIT_EXCEEDED"
        ).length,
        topActions,
      };
    } catch (error) {
      console.error("Error getting security metrics:", error);
      return {
        totalEvents: 0,
        highRiskEvents: 0,
        rateLimitViolations: 0,
        topActions: [],
      };
    }
  }
}

export const aiSecurity = AISecurityService.getInstance();

// Middleware for API routes
export async function withAISecurity(
  request: NextRequest,
  operation: string,
  handler: () => Promise<Response>
): Promise<Response> {
  try {
    const session = await auth();
    if (!session?.user) {
      return new Response("Unauthorized", { status: 401 });
    }

    // Check rate limits
    const rateLimitResult = await aiSecurity.checkRateLimit(
      session.user.id,
      operation,
      request
    );

    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({
          error: "Rate limit exceeded",
          retryAfter: rateLimitResult.retryAfter,
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
            "X-RateLimit-Reset": new Date(
              rateLimitResult.resetTime
            ).toISOString(),
            ...(rateLimitResult.retryAfter && {
              "Retry-After": rateLimitResult.retryAfter.toString(),
            }),
          },
        }
      );
    }

    // Check permissions
    const permissionResult = await aiSecurity.checkAIPermissions(
      session.user.id,
      operation
    );

    if (!permissionResult.allowed) {
      await aiSecurity.logSecurityEvent({
        userId: session.user.id,
        action: "PERMISSION_DENIED",
        resource: operation,
        details: { reason: permissionResult.reason },
        timestamp: new Date(),
        ipAddress:
          request.headers.get("x-forwarded-for") ||
          request.headers.get("x-real-ip") ||
          undefined,
        userAgent: request.headers.get("user-agent") || undefined,
        risk: "medium",
      });

      return new Response(
        JSON.stringify({
          error: "Insufficient permissions",
          reason: permissionResult.reason,
        }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    // Execute handler
    const response = await handler();

    // Log successful operation
    await aiSecurity.logSecurityEvent({
      userId: session.user.id,
      action: "AI_OPERATION",
      resource: operation,
      details: { status: "success" },
      timestamp: new Date(),
      ipAddress:
        request.headers.get("x-forwarded-for") ||
        request.headers.get("x-real-ip") ||
        undefined,
      userAgent: request.headers.get("user-agent") || undefined,
      risk: "low",
    });

    return response;
  } catch (error) {
    console.error("AI Security middleware error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
