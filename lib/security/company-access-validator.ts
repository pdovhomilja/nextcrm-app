import db from "@/lib/db";

interface AccessValidationResult {
  isAuthorized: boolean;
  error?: string;
  auditLog?: {
    userId: string;
    companyId: string;
    resourceType: string;
    resourceId: string;
    action: string;
    authorized: boolean;
    timestamp: Date;
  };
}

/**
 * SECURITY: Validates that a user has access to a company's resources
 * This is critical for multi-tenant data isolation
 */
export async function validateCompanyAccess(
  userId: string,
  companyId: string,
  resourceType: "task" | "board" | "document" | "ai_query",
  resourceId?: string,
  action: string = "read"
): Promise<AccessValidationResult> {
  try {
    // Check if user is a member of the company
    const membership = await db.companyMembership.findFirst({
      where: {
        userId,
        companyId,
      },
    });

    const isAuthorized = !!membership;

    // Create audit log entry
    const auditLog = {
      userId,
      companyId,
      resourceType,
      resourceId: resourceId || "N/A",
      action,
      authorized: isAuthorized,
      timestamp: new Date(),
    };

    // Log security audit entry
    try {
      await db.securityAuditLog.create({
        data: {
          userId,
          action: `${action}_${resourceType}`,
          resource: resourceType,
          details: {
            userAgent: "AI_ASSISTANT_V2",
            ipAddress: "SERVER_SIDE",
            timestamp: auditLog.timestamp.toISOString(),
            companyId,
            resourceId: resourceId || null,
            authorized: isAuthorized,
          },
          timestamp: auditLog.timestamp,
          risk: isAuthorized ? "low" : "high",
          createdAt: auditLog.timestamp,
        },
      });
    } catch (auditError) {
      console.error("Failed to create audit log:", auditError);
      // Don't fail the validation if audit logging fails
    }

    if (!isAuthorized) {
      return {
        isAuthorized: false,
        error: `User ${userId} is not authorized to access company ${companyId} resources`,
        auditLog,
      };
    }

    return {
      isAuthorized: true,
      auditLog,
    };
  } catch (error) {
    console.error("Company access validation error:", error);

    // Create error audit log
    const errorAuditLog = {
      userId,
      companyId,
      resourceType,
      resourceId: resourceId || "N/A",
      action,
      authorized: false,
      timestamp: new Date(),
    };

    return {
      isAuthorized: false,
      error: "Access validation failed due to system error",
      auditLog: errorAuditLog,
    };
  }
}

/**
 * SECURITY: Middleware function for AI endpoints to validate company access
 */
export async function withCompanyAccessValidation<T>(
  userId: string,
  companyId: string,
  resourceType: "task" | "board" | "document" | "ai_query",
  action: string,
  operation: () => Promise<T>
): Promise<{ success: boolean; data?: T; error?: string }> {
  const validation = await validateCompanyAccess(
    userId,
    companyId,
    resourceType,
    undefined,
    action
  );

  if (!validation.isAuthorized) {
    console.warn("SECURITY VIOLATION ATTEMPT:", {
      userId,
      companyId,
      resourceType,
      action,
      error: validation.error,
      timestamp: new Date().toISOString(),
    });

    return {
      success: false,
      error: validation.error || "Access denied",
    };
  }

  try {
    const result = await operation();
    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error("Operation failed after access validation:", error);
    return {
      success: false,
      error: "Operation failed",
    };
  }
}
