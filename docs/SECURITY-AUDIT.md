# TaskHQ Security Audit Report

**Audit Date:** January 2026
**Auditor:** Code Review Analysis
**Version:** 1.0
**Status:** Findings Documented - Remediation Required

---

## Executive Summary

This security audit identified **12 vulnerabilities** across the TaskHQ codebase, including **2 critical** and **3 high-severity** issues. The most significant findings involve missing authorization checks in task and board management operations, which could allow any authenticated user to modify or delete resources belonging to other users or companies.

### Severity Distribution

| Severity | Count | Description |
|----------|-------|-------------|
| **CRITICAL** | 2 | Immediate exploitation risk, data breach potential |
| **HIGH** | 3 | Serious security weakness, requires prompt attention |
| **MEDIUM** | 4 | Moderate risk, should be addressed in next sprint |
| **LOW** | 3 | Minor issues, address when convenient |

---

## Critical Vulnerabilities

### CVE-TH-001: Missing Authorization in `deleteTask`

**Severity:** CRITICAL
**CVSS Score:** 9.1 (Critical)
**File:** `/actions/tasks/delete-task.ts:6-17`

**Description:**

The `deleteTask` server action allows any authenticated user to delete ANY task in the system by simply knowing the task ID. There is no verification that the user has permission to delete the task.

**Vulnerable Code:**

```typescript
export async function deleteTask(taskId: string) {
  // Trigger embedding deletion (non-blocking)
  await triggerTaskEmbeddingDeletion(taskId).catch((error) => {
    console.error("Failed to delete task embedding:", error);
  });

  await db.task.delete({
    where: {
      id: taskId,  // No authorization check!
    },
  });
}
```

**Attack Vector:**

1. Attacker authenticates with any valid account
2. Attacker discovers or guesses task IDs (CUIDs are predictable)
3. Attacker calls `deleteTask(victimTaskId)`
4. Task is deleted without authorization check

**Impact:**
- Data loss for victim users
- Cross-tenant data destruction
- Denial of service through mass deletion

**Recommended Fix:**

```typescript
export async function deleteTask(taskId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  // Verify task ownership or board access
  const task = await db.task.findUnique({
    where: { id: taskId },
    include: {
      boardSection: {
        include: {
          board: true
        }
      }
    }
  });

  if (!task) {
    throw new Error("Task not found");
  }

  // Check: User created task OR user has board access OR user is company member
  const hasAccess =
    task.createdById === session.user.id ||
    task.assignedToId === session.user.id ||
    task.boardSection.board.access.includes(session.user.id);

  if (!hasAccess) {
    // Log security violation
    await logSecurityEvent({
      userId: session.user.id,
      action: "UNAUTHORIZED_DELETE_ATTEMPT",
      resource: "task",
      details: { taskId },
      timestamp: new Date(),
      risk: "high"
    });
    throw new Error("Access denied");
  }

  // Proceed with deletion
  await triggerTaskEmbeddingDeletion(taskId).catch(console.error);
  await db.task.delete({ where: { id: taskId } });
}
```

---

### CVE-TH-002: Missing Authorization in `editTask`

**Severity:** CRITICAL
**CVSS Score:** 9.1 (Critical)
**File:** `/actions/tasks/edit-task.ts:15-34`

**Description:**

The `editTask` server action allows any authenticated user to modify ANY task in the system without authorization verification.

**Vulnerable Code:**

```typescript
export const editTask = async (taskId: string, data: EditTaskInput) => {
  // Normalize dueDate if provided as string
  const normalized: EditTaskInput = {
    ...data,
    dueDate:
      typeof data.dueDate === "string" ? new Date(data.dueDate) : data.dueDate,
  };

  const updatedTask = await db.task.update({
    where: { id: taskId },  // No authorization check!
    data: normalized as any,
  });

  triggerTaskEmbeddingUpdate(updatedTask.id).catch(console.error);

  return { message: "Task updated successfully" };
};
```

**Attack Vector:**

1. Attacker changes task status, priority, or description
2. Attacker reassigns tasks to themselves
3. Attacker modifies due dates to cause project chaos

**Impact:**
- Data manipulation across tenants
- Project sabotage
- Data integrity violations

**Recommended Fix:**

```typescript
export const editTask = async (taskId: string, data: EditTaskInput) => {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  // Fetch task with board access info
  const task = await db.task.findUnique({
    where: { id: taskId },
    include: {
      boardSection: {
        include: { board: true }
      }
    }
  });

  if (!task) {
    throw new Error("Task not found");
  }

  // Verify access
  const hasAccess =
    task.createdById === session.user.id ||
    task.assignedToId === session.user.id ||
    task.boardSection.board.access.includes(session.user.id);

  if (!hasAccess) {
    throw new Error("Access denied");
  }

  // Proceed with update
  const normalized: EditTaskInput = {
    ...data,
    dueDate: typeof data.dueDate === "string" ? new Date(data.dueDate) : data.dueDate,
  };

  const updatedTask = await db.task.update({
    where: { id: taskId },
    data: normalized,
  });

  triggerTaskEmbeddingUpdate(updatedTask.id).catch(console.error);

  return { message: "Task updated successfully" };
};
```

---

## High Severity Vulnerabilities

### CVE-TH-003: Missing Authorization in `deleteBoard`

**Severity:** HIGH
**CVSS Score:** 8.1 (High)
**File:** `/actions/tasks/delete-board.ts:11-42`

**Description:**

The `deleteBoard` function deletes entire boards (including all sections and tasks) without verifying the caller has permission.

**Vulnerable Code:**

```typescript
export async function deleteBoard(boardId: string) {
  const sections = await db.boardSection.findMany({
    where: { boardId: boardId },
  });

  for (const section of sections) {
    const tasks = await db.task.findMany({
      where: { boardSectionId: section.id },
    });
    for (const task of tasks) {
      await deleteTask(task.id);  // Cascades to unauthorized deletions
    }
    await deleteBoardSection(section.id, boardId);
  }

  await triggerBoardEmbeddingDeletion(boardId).catch(console.error);
  await db.board.delete({ where: { id: boardId } });

  return { message: "Board deleted successfully" };
}
```

**Impact:**
- Mass data deletion
- Complete project/board destruction
- Cross-tenant data loss

**Recommended Fix:**

```typescript
export async function deleteBoard(boardId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const board = await db.board.findUnique({
    where: { id: boardId },
  });

  if (!board) {
    throw new Error("Board not found");
  }

  // Only board creator or company admin can delete
  if (board.createdBy !== session.user.id) {
    // Check if user is company admin
    const membership = await db.companyMembership.findFirst({
      where: {
        userId: session.user.id,
        companyId: board.companyId!,
        role: { in: ["ADMIN", "OWNER"] }
      }
    });

    if (!membership) {
      throw new Error("Access denied: Only board creator or admin can delete boards");
    }
  }

  // Proceed with deletion...
}
```

---

### CVE-TH-004: Insufficient Authorization in `getBoard`

**Severity:** HIGH
**CVSS Score:** 7.5 (High)
**File:** `/actions/tasks/get-board.ts:3-10`

**Description:**

The `getBoard` function returns any board by ID without checking if the user has access to it.

**Vulnerable Code:**

```typescript
export async function getBoard(boardId: string) {
  const board = await db.board.findUnique({
    where: { id: boardId },
  });
  return board;  // No access check!
}
```

**Impact:**
- Information disclosure
- Cross-tenant data leakage
- Enumeration of board contents

**Recommended Fix:**

```typescript
export async function getBoard(boardId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const board = await db.board.findUnique({
    where: { id: boardId },
  });

  if (!board) {
    return null;
  }

  // Verify access: user is in company OR has explicit access
  const hasAccess = board.access.includes(session.user.id);
  const isCompanyMember = board.companyId && await db.companyMembership.findFirst({
    where: {
      userId: session.user.id,
      companyId: board.companyId
    }
  });

  if (!hasAccess && !isCompanyMember) {
    return null; // Or throw "Access denied"
  }

  return board;
}
```

---

### CVE-TH-005: Missing Company Isolation in Task Position Updates

**Severity:** HIGH
**CVSS Score:** 7.5 (High)
**File:** `/actions/tasks/update-task-position.ts:6-147`

**Description:**

Multiple functions (`updateTaskPosition`, `updateTaskPositions`, `moveTaskToTopOfSection`, `moveTaskBetweenSectionsAtPosition`) allow modifying task positions without verifying the user has access to the board.

**Vulnerable Code:**

```typescript
export async function updateTaskPosition(taskId: string, newPosition: number) {
  try {
    await db.task.update({
      where: { id: taskId },  // No authorization!
      data: { position: newPosition },
    });
  } catch (error) {
    throw new Error(`Failed to update task position: ${error}`);
  }
}
```

**Impact:**
- Task order manipulation across tenants
- Board structure corruption
- Data integrity issues

---

## Medium Severity Vulnerabilities

### CVE-TH-006: No File Size Validation in Document Upload

**Severity:** MEDIUM
**CVSS Score:** 5.3 (Medium)
**File:** `/app/api/ai/documents/route.ts:16-92`

**Description:**

The document upload endpoint does not validate file size before processing, allowing potential denial of service through large file uploads.

**Vulnerable Code:**

```typescript
const uploadSchema = z.object({
  filename: z.string(),
  mimeType: z.string(),
  size: z.number(),  // Validated but not enforced!
  companyId: z.string(),
  taskId: z.string().optional(),
  boardId: z.string().optional(),
});

// Later...
const arrayBuffer = await file.arrayBuffer();
const buffer = Buffer.from(arrayBuffer);  // No size check before allocation
```

**Impact:**
- Memory exhaustion
- Server resource depletion
- Denial of service

**Recommended Fix:**

```typescript
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const uploadSchema = z.object({
  filename: z.string(),
  mimeType: z.string(),
  size: z.number().max(MAX_FILE_SIZE, "File too large"),
  companyId: z.string(),
  taskId: z.string().optional(),
  boardId: z.string().optional(),
});

// Before processing
if (file.size > MAX_FILE_SIZE) {
  return NextResponse.json(
    { error: `File size exceeds maximum of ${MAX_FILE_SIZE / 1024 / 1024}MB` },
    { status: 413 }
  );
}
```

---

### CVE-TH-007: In-Memory Rate Limiting (Non-Scalable)

**Severity:** MEDIUM
**CVSS Score:** 5.0 (Medium)
**File:** `/lib/security/ai-security.ts:26-27`

**Description:**

Rate limiting uses an in-memory Map that is lost on server restart and doesn't work across multiple server instances.

**Vulnerable Code:**

```typescript
private rateLimitStore: Map<string, { count: number; resetTime: number }> =
  new Map();
```

**Impact:**
- Rate limits reset on deployment/restart
- Ineffective in multi-instance deployments
- Potential for abuse during scaling events

**Recommended Fix:**

Use Redis or another distributed cache:

```typescript
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

async checkRateLimit(userId: string, operation: string) {
  const key = `ratelimit:${userId}:${operation}`;
  const config = this.rateLimits[operation];

  const current = await redis.incr(key);
  if (current === 1) {
    await redis.expire(key, Math.ceil(config.windowMs / 1000));
  }

  return {
    allowed: current <= config.maxRequests,
    remaining: Math.max(0, config.maxRequests - current),
    resetTime: await redis.ttl(key) * 1000 + Date.now()
  };
}
```

---

### CVE-TH-008: Hardcoded Audit Log Values

**Severity:** MEDIUM
**CVSS Score:** 4.3 (Medium)
**File:** `/lib/security/company-access-validator.ts:58-59`

**Description:**

Security audit logs contain hardcoded values for userAgent and ipAddress, reducing forensic value.

**Vulnerable Code:**

```typescript
await db.securityAuditLog.create({
  data: {
    userId,
    action: `${action}_${resourceType}`,
    resource: resourceType,
    details: {
      userAgent: "AI_ASSISTANT_V2",  // Hardcoded!
      ipAddress: "SERVER_SIDE",       // Hardcoded!
      timestamp: auditLog.timestamp.toISOString(),
      companyId,
      resourceId: resourceId || null,
      authorized: isAuthorized,
    },
    // ...
  },
});
```

**Impact:**
- Reduced audit trail quality
- Inability to trace attack origins
- Compliance gaps

**Recommended Fix:**

Pass request context through the validation chain:

```typescript
export async function validateCompanyAccess(
  userId: string,
  companyId: string,
  resourceType: string,
  resourceId?: string,
  action: string = "read",
  requestContext?: { ipAddress?: string; userAgent?: string }
) {
  // ...
  details: {
    userAgent: requestContext?.userAgent || "UNKNOWN",
    ipAddress: requestContext?.ipAddress || "UNKNOWN",
    // ...
  }
}
```

---

### CVE-TH-009: Unused `userId` Parameter in `getBoards`

**Severity:** MEDIUM
**CVSS Score:** 4.0 (Medium)
**File:** `/actions/tasks/get-boards.ts:6-53`

**Description:**

The `userId` parameter is accepted but the session's user ID from `auth()` is not actually used for authorization. The function only checks `companyId` without verifying the session user belongs to that company.

**Vulnerable Code:**

```typescript
export async function getBoards(
  userId: string,       // Accepted but not validated
  query?: string,
  companyId?: string
) {
  const session = await auth();  // Session fetched but userId not compared

  if (!companyId) {
    throw new Error("No active company found");
  }

  const boards = await db.board.findMany({
    where: {
      AND: [
        {
          OR: [
            { companyId: companyId },  // Only checks companyId, not user membership
          ],
        },
        // ...
      ],
    },
  });
  return boards;
}
```

**Impact:**
- Potential unauthorized access to company boards
- Confusing API (accepts userId but doesn't use it)

---

## Low Severity Vulnerabilities

### CVE-TH-010: DOMPurify Installed But Not Used

**Severity:** LOW
**CVSS Score:** 3.1 (Low)
**File:** `package.json`

**Description:**

DOMPurify is listed as a dependency but there's no evidence of its use in the codebase. User-generated content in task descriptions may be rendered without sanitization.

**Impact:**
- Potential XSS if content is rendered as HTML
- False sense of security

**Recommended Action:**

Either implement DOMPurify usage or remove the unused dependency. If rendering user content as HTML:

```typescript
import DOMPurify from "dompurify";

const sanitizedDescription = DOMPurify.sanitize(task.description);
```

---

### CVE-TH-011: Type Safety Issues with `as any` Casts

**Severity:** LOW
**CVSS Score:** 2.0 (Low)
**Files:** Multiple vector search files

**Description:**

Raw SQL queries return results cast with `as any[]`, bypassing TypeScript type checking.

**Vulnerable Pattern:**

```typescript
return (searchResults as any[]).map((row) => ({
  id: row.task_id,
  // ...
}));
```

**Impact:**
- Runtime errors from unexpected data shapes
- Maintenance difficulties

---

### CVE-TH-012: Sensitive Email Patterns in Input Validation Warnings Only

**Severity:** LOW
**CVSS Score:** 2.5 (Low)
**File:** `/lib/security/ai-security.ts:180-189`

**Description:**

Sensitive data patterns (credit cards, SSN, emails) are detected but only generate warnings without blocking or redacting.

**Current Code:**

```typescript
sensitivePatterns.forEach((pattern) => {
  if (pattern.test(sanitized)) {
    warnings.push("Potentially sensitive information detected");
  }
});
```

**Recommended Enhancement:**

Consider redacting detected sensitive patterns:

```typescript
sensitivePatterns.forEach((pattern, patternName) => {
  if (pattern.test(sanitized)) {
    sanitized = sanitized.replace(pattern, "[REDACTED]");
    warnings.push(`${patternName} pattern detected and redacted`);
  }
});
```

---

## Remediation Priority Matrix

| Priority | Vulnerability | Estimated Effort | Business Impact |
|----------|--------------|------------------|-----------------|
| 1 (Immediate) | CVE-TH-001: deleteTask auth | 2-4 hours | Critical - Data Loss |
| 2 (Immediate) | CVE-TH-002: editTask auth | 2-4 hours | Critical - Data Manipulation |
| 3 (This Week) | CVE-TH-003: deleteBoard auth | 2-4 hours | High - Mass Data Loss |
| 4 (This Week) | CVE-TH-004: getBoard auth | 1-2 hours | High - Data Leakage |
| 5 (This Week) | CVE-TH-005: Position updates auth | 4-6 hours | High - Data Integrity |
| 6 (Next Sprint) | CVE-TH-006: File size validation | 1 hour | Medium - DoS |
| 7 (Next Sprint) | CVE-TH-007: Distributed rate limiting | 4-8 hours | Medium - Scale |
| 8 (Next Sprint) | CVE-TH-008: Audit log context | 2-4 hours | Medium - Forensics |
| 9 (Next Sprint) | CVE-TH-009: getBoards authorization | 2-3 hours | Medium - Access Control |
| 10 (Backlog) | CVE-TH-010: DOMPurify usage | 2-4 hours | Low - XSS |
| 11 (Backlog) | CVE-TH-011: Type safety | 4-8 hours | Low - Maintenance |
| 12 (Backlog) | CVE-TH-012: Sensitive data redaction | 2-4 hours | Low - Privacy |

---

## Security Recommendations Summary

### Immediate Actions (0-7 days)

1. **Add authorization checks to all task/board CRUD operations**
2. **Implement company isolation in all server actions**
3. **Create centralized authorization middleware**

### Short-Term Actions (1-4 weeks)

4. **Migrate rate limiting to Redis**
5. **Add file size and type validation**
6. **Implement request context propagation for audit logs**
7. **Review and fix all `getBoard*`, `getTask*` functions**

### Long-Term Improvements

8. **Implement row-level security at database level**
9. **Add automated security testing in CI/CD**
10. **Regular security audits and penetration testing**
11. **Security headers review (CSP, HSTS, etc.)**
12. **Dependency vulnerability scanning**

---

## Appendix: Files Requiring Immediate Review

```
/actions/tasks/delete-task.ts      - CRITICAL
/actions/tasks/edit-task.ts        - CRITICAL
/actions/tasks/delete-board.ts     - HIGH
/actions/tasks/get-board.ts        - HIGH
/actions/tasks/update-task-position.ts - HIGH
/actions/tasks/delete-board-section.ts - REVIEW NEEDED
/actions/tasks/update-section-position.ts - REVIEW NEEDED
/actions/tasks/create-task.ts      - Partial (has auth, needs company check)
/actions/tasks/get-boards.ts       - MEDIUM (userId unused)
/actions/tasks/get-tasks.ts        - REVIEW NEEDED
/actions/tasks/mark-done.ts        - REVIEW NEEDED
```

---

*This report is confidential and intended for internal use only.*
*Report Version: 1.0*
*Next Scheduled Audit: Q2 2026*
