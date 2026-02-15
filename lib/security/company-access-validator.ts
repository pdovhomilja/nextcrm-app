import db from "@/lib/db";
import { auth } from "@/auth";

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

/**
 * SECURITY: Get authenticated user session or throw.
 * Returns userId and activeCompanyId for authorization checks.
 */
export async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Not authenticated");
  }
  const activeCompanyId = session.user.activeCompanyId;
  if (!activeCompanyId) {
    throw new Error("No active company");
  }
  return { userId: session.user.id, activeCompanyId };
}

/**
 * SECURITY: Verify the caller has access to a task's board.
 * Checks: task exists, board belongs to user's company, user is creator/assignee/board member.
 */
export async function verifyTaskAccess(
  taskId: string,
  userId: string,
  companyId: string
) {
  const task = await db.task.findUnique({
    where: { id: taskId },
    include: { boardSection: { include: { board: true } } },
  });
  if (!task) {
    throw new Error("Task not found");
  }
  const board = task.boardSection.board;
  if (board.companyId !== companyId) {
    throw new Error("Access denied");
  }
  const hasAccess =
    task.createdById === userId ||
    task.assignedToId === userId ||
    board.access.includes(userId) ||
    board.createdBy === userId;
  if (!hasAccess) {
    throw new Error("Access denied");
  }
  return task;
}

/**
 * SECURITY: Verify the caller has access to a board.
 * Checks: board exists, belongs to user's company, user is creator/member or company member.
 */
export async function verifyBoardAccess(
  boardId: string,
  userId: string,
  companyId: string
) {
  const board = await db.board.findUnique({ where: { id: boardId } });
  if (!board) {
    throw new Error("Board not found");
  }
  if (board.companyId !== companyId) {
    throw new Error("Access denied");
  }
  const hasAccess =
    board.access.includes(userId) || board.createdBy === userId;
  if (!hasAccess) {
    // Fall back to company membership check
    const membership = await db.companyMembership.findFirst({
      where: { userId, companyId },
    });
    if (!membership) {
      throw new Error("Access denied");
    }
  }
  return board;
}

/**
 * SECURITY: Verify the caller can delete a board (must be creator or company ADMIN/OWNER).
 */
export async function verifyBoardDeleteAccess(
  boardId: string,
  userId: string,
  companyId: string
) {
  const board = await verifyBoardAccess(boardId, userId, companyId);
  if (board.createdBy !== userId) {
    const membership = await db.companyMembership.findFirst({
      where: { userId, companyId, role: { in: ["ADMIN", "OWNER"] } },
    });
    if (!membership) {
      throw new Error("Only the board creator or company admin can delete boards");
    }
  }
  return board;
}

/**
 * SECURITY: Verify the caller has access to a board section's board.
 */
export async function verifySectionAccess(
  sectionId: string,
  userId: string,
  companyId: string
) {
  const section = await db.boardSection.findUnique({
    where: { id: sectionId },
    include: { board: true },
  });
  if (!section) {
    throw new Error("Board section not found");
  }
  if (section.board.companyId !== companyId) {
    throw new Error("Access denied");
  }
  const hasAccess =
    section.board.access.includes(userId) ||
    section.board.createdBy === userId;
  if (!hasAccess) {
    const membership = await db.companyMembership.findFirst({
      where: { userId, companyId },
    });
    if (!membership) {
      throw new Error("Access denied");
    }
  }
  return section;
}
