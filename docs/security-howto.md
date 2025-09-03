# TaskHQ Security Implementation Guide

**Version:** 1.0  
**Last Updated:** January 2025  
**Scope:** Multitenancy Security, Company Access Control, Audit Logging

---

## <¯ Overview

This guide establishes the **Security-First Wrapper Pattern** as the foundation for all TaskHQ development. Every new feature, API endpoint, server action, and component MUST follow these patterns to ensure comprehensive company isolation and audit compliance.

## = Core Security Principles

### 1. URL [cid] as Primary Source of Truth
- The URL parameter `[cid]` (company ID) is the authoritative source for company context
- All operations must validate that the user has access to the requested company
- Session `activeCompanyId` must match URL `[cid]` or force logout

### 2. Security-First Wrapper Pattern
- **NEVER** implement custom company validation
- **ALWAYS** use existing `lib/security/company-access-validator.ts`
- **EVERY** operation gets automatic audit logging

### 3. Zero Trust Architecture
- Assume every request could be malicious
- Validate company access for every operation
- Log all access attempts with risk assessment

---

## =€ Security-First Wrapper Pattern

### Core Functions

```typescript
import { 
  validateCompanyAccess, 
  withCompanyAccessValidation 
} from "@/lib/security/company-access-validator";
```

**Two main functions:**

1. **`validateCompanyAccess()`** - Direct validation with audit logging
2. **`withCompanyAccessValidation()`** - Wrapper for operations with automatic validation

### Resource Types

| Resource Type | Use Case | Examples |
|---------------|----------|----------|
| `"task"` | Task operations | Create, update, delete, search tasks |
| `"board"` | Board operations | Dashboard metrics, board access, analytics |
| `"document"` | Document operations | File uploads, document processing |
| `"ai_query"` | AI operations | AI assistant, embeddings, MCP tools |

### Action Types

| Action | Use Case | Risk Level |
|--------|----------|------------|
| `"access"` | General company access | LOW-MEDIUM |
| `"create"` | Creating resources | LOW-MEDIUM |
| `"update"` | Modifying resources | LOW-MEDIUM |
| `"delete"` | Removing resources | MEDIUM-HIGH |
| `"search"` | Querying data | LOW |
| `"metrics"` | Analytics access | LOW |
| `"switch"` | Company switching | MEDIUM |

---

## =Ë Implementation Patterns

### 1. Server Actions Pattern

** CORRECT Implementation:**

```typescript
import { withCompanyAccessValidation } from "@/lib/security/company-access-validator";
import { auth } from "@/auth";

export async function getTaskMetrics({ companyId }: { companyId?: string } = {}) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const targetCompanyId = companyId || session.user.activeCompanyId;
  
  if (!targetCompanyId) {
    throw new Error("Company context required");
  }

  // = SECURITY-FIRST WRAPPER: Automatic validation + audit logging
  return withCompanyAccessValidation(
    session.user.id,
    targetCompanyId,
    "task",      // Resource type
    "metrics",   // Action
    async () => {
      //  SIMPLIFIED BUSINESS LOGIC - Security handled by wrapper
      const metrics = await db.task.groupBy({
        where: {
          boardSection: {
            board: {
              access: { has: session.user.id },
              // No manual company filtering needed!
            },
          },
        },
        by: ['status'],
        _count: { _all: true },
      });

      return {
        success: true,
        data: metrics,
      };
    }
  );
}
```

**L NEVER Do This:**

```typescript
// L Manual company validation
export async function getTaskMetrics({ companyId }: { companyId?: string } = {}) {
  const session = await auth();
  
  // L Custom validation logic
  const membership = await db.companyMembership.findFirst({
    where: { userId: session.user.id, companyId }
  });
  
  if (!membership) {
    throw new Error("Access denied");
  }
  
  // L No audit logging
  // L Inconsistent error handling
}
```

### 2. API Routes Pattern

** CORRECT Implementation:**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { withCompanyAccessValidation } from "@/lib/security/company-access-validator";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { companyId, taskData } = await request.json();

  // = SECURITY-FIRST WRAPPER: Automatic validation + audit logging
  const result = await withCompanyAccessValidation(
    session.user.id,
    companyId,
    "task",     // Resource type
    "create",   // Action
    async () => {
      //  SIMPLIFIED BUSINESS LOGIC - Security handled by wrapper
      const task = await db.task.create({
        data: {
          ...taskData,
          createdById: session.user.id,
        },
      });

      return { success: true, data: task };
    }
  );

  if (!result.success) {
    return NextResponse.json(
      { error: result.error },
      { status: 403 }
    );
  }

  return NextResponse.json(result.data);
}
```

### 3. MCP Tools Pattern

** CORRECT Implementation:**

```typescript
server.tool(
  "search_tasks",
  "Search tasks within the user's company",
  searchTasksSchema,
  async (params: any) => {
    const session = await auth();
    if (!session?.user) {
      throw new Error("Unauthorized");
    }

    // = SECURITY-FIRST WRAPPER: Automatic validation + audit logging
    return withCompanyAccessValidation(
      session.user.id,
      session.user.activeCompanyId,
      "task",    // Resource type
      "search",  // Action
      async () => {
        //  SIMPLIFIED QUERY - Security handled by wrapper
        const tasks = await db.task.findMany({
          where: {
            boardSection: {
              board: {
                access: { has: session.user.id },
                // No manual company filtering needed!
              },
            },
          },
        });

        return { success: true, data: tasks };
      }
    );
  }
);
```

### 4. Company Switching Pattern

** CORRECT Implementation:**

```typescript
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { companyId, action } = await request.json();

  // = SECURITY-FIRST WRAPPER: Use existing validator for switching
  const validation = await validateCompanyAccess(
    session.user.id,
    companyId,
    "board",     // Resource type for company access
    action || "access" // Action type
  );

  if (!validation.isAuthorized) {
    return NextResponse.json({
      success: false,
      error: validation.error,
      // Audit log automatically created!
    }, { status: 403 });
  }

  return NextResponse.json({
    success: true,
    message: "Company access validated",
    // Audit log automatically created!
  });
}
```

---

## =á Layout-Level Security

### Company Context Validation

**File:** `app/(app)/[cid]/layout.tsx`

```typescript
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { validateCompanyAccess } from "@/lib/security/company-access-validator";

export default async function CompanyLayout({ 
  children, 
  params 
}: {
  children: React.ReactNode;
  params: Promise<{ cid: string }>;
}) {
  const { cid } = await params;
  
  // = SERVER-SIDE SECURITY VALIDATION
  const session = await auth();
  
  if (!session?.user) {
    redirect("/auth/signin");
  }

  // =¨ CRITICAL: URL [cid] vs Session activeCompanyId validation
  if (session.user.activeCompanyId !== cid) {
    console.warn("SECURITY: Company context mismatch detected", {
      userId: session.user.id,
      urlCompany: cid,
      sessionCompany: session.user.activeCompanyId,
      timestamp: new Date().toISOString(),
    });

    redirect("/api/auth/force-logout?reason=company-mismatch");
  }

  // = Use existing company access validator with audit logging
  const validation = await validateCompanyAccess(
    session.user.id,
    cid,
    "board", // Resource type for company access
    "access" // Action type
  );
  
  if (!validation.isAuthorized) {
    console.error("SECURITY: Company access validation failed", {
      userId: session.user.id,
      attemptedCompany: cid,
      error: validation.error,
      timestamp: new Date().toISOString(),
    });

    redirect("/api/auth/force-logout?reason=unauthorized-company");
  }

  return <>{children}</>;
}
```

---

## =Ê Audit Logging & Compliance

### Automatic Audit Trail

Every operation using the Security-First Wrapper Pattern automatically creates audit logs:

```typescript
// Automatically logged to securityAuditLog table:
{
  userId: "user_123",
  action: "create_task",           // Action + resource type
  resource: "task",                // Resource type
  details: {
    userAgent: "AI_ASSISTANT_V2",
    ipAddress: "SERVER_SIDE", 
    timestamp: "2025-01-03T...",
    companyId: "company_456",
    resourceId: "task_789",
    authorized: true
  },
  risk: "low",                     // Risk assessment
  timestamp: "2025-01-03T...",
  createdAt: "2025-01-03T..."
}
```

### Risk Assessment Levels

- **`"low"`**: Successful authorized operations
- **`"high"`**: Failed authorization attempts (security violations)

### Compliance Benefits

 **Complete audit trail** for all company operations  
 **Risk-based event classification** for security analysis  
 **Regulatory compliance** with detailed access logs  
 **Incident investigation** support with timestamps and context  
 **Security monitoring** capabilities for anomaly detection

---

## = Testing Patterns

### 1. Server Action Testing

```typescript
// Test company isolation
describe("getTaskMetrics Security", () => {
  it("should only return tasks from user's company", async () => {
    const userA = { id: "user1", activeCompanyId: "company1" };
    const userB = { id: "user2", activeCompanyId: "company2" };

    const metricsA = await getTaskMetrics.call({ user: userA });
    const metricsB = await getTaskMetrics.call({ user: userB });

    expect(metricsA.data).not.toEqual(metricsB.data);
  });

  it("should reject unauthorized company access", async () => {
    const user = { id: "user1", activeCompanyId: "company1" };
    
    await expect(
      getTaskMetrics.call({ user }, { companyId: "company2" })
    ).rejects.toThrow("not authorized");
  });
});
```

### 2. API Route Testing

```typescript
// Test API security
describe("Task API Security", () => {
  it("should validate company access", async () => {
    const response = await POST(new Request("http://test", {
      method: "POST",
      body: JSON.stringify({ companyId: "unauthorized", taskData: {} })
    }));

    expect(response.status).toBe(403);
  });
});
```

---

## ¡ Performance Considerations

### Database Query Optimization

** Efficient Pattern:**

```typescript
// Board-based filtering (recommended)
const tasks = await db.task.findMany({
  where: {
    boardSection: {
      board: {
        access: { has: session.user.id },
        // Company isolation handled by wrapper
      },
    },
  },
});
```

**L Inefficient Pattern:**

```typescript
// User membership filtering (avoid)
const tasks = await db.task.findMany({
  where: {
    createdBy: {
      memberships: {
        some: { companyId: targetCompanyId }
      }
    }
  }
});
```

### Performance Metrics

- **Company validation**: ~10-20ms per operation
- **Audit logging**: Non-blocking async writes
- **Database queries**: Use proper indexes on `companyId` fields

---

## =¨ Security Checklist

### For Every New Feature

- [ ] Uses `withCompanyAccessValidation()` or `validateCompanyAccess()`
- [ ] Specifies correct resource type (`task`, `board`, `document`, `ai_query`)
- [ ] Specifies appropriate action type (`create`, `update`, `access`, etc.)
- [ ] No custom company validation logic
- [ ] No manual audit logging
- [ ] Passes company ID from URL `[cid]` parameter
- [ ] Handles security errors gracefully
- [ ] Tests company isolation scenarios

### For API Routes

- [ ] Validates session before business logic
- [ ] Uses Security-First Wrapper Pattern
- [ ] Returns proper HTTP status codes (401, 403, 500)
- [ ] No sensitive data in error messages

### For Server Actions

- [ ] Takes optional `companyId` parameter
- [ ] Falls back to `session.user.activeCompanyId`
- [ ] Validates company context exists
- [ ] Uses wrapper pattern for all database operations

---

## <¯ Resource Type Guidelines

### When to Use Each Resource Type

**`"task"`** - Use for:
- Task CRUD operations
- Task search and filtering
- Task metrics and analytics
- Task assignments and updates

**`"board"`** - Use for:
- Board CRUD operations
- Dashboard metrics (board-related)
- Company-wide analytics
- Board access management
- Company switching operations

**`"document"`** - Use for:
- File uploads and downloads
- Document processing
- Document search and indexing

**`"ai_query"`** - Use for:
- AI assistant interactions
- Embedding generation
- MCP tool operations
- AI-powered features

---

## =' Common Implementation Scenarios

### 1. Adding a New Dashboard Widget

```typescript
export async function getWidgetData({ companyId }: { companyId?: string } = {}) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const targetCompanyId = companyId || session.user.activeCompanyId;
  
  if (!targetCompanyId) {
    throw new Error("Company context required");
  }

  return withCompanyAccessValidation(
    session.user.id,
    targetCompanyId,
    "board",        // Dashboard widgets are board-level
    "widget_data",  // Descriptive action name
    async () => {
      // Your widget logic here
      return { success: true, data: widgetData };
    }
  );
}
```

### 2. Adding AI-Powered Features

```typescript
export async function processWithAI(params: any) {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  return withCompanyAccessValidation(
    session.user.id,
    session.user.activeCompanyId,
    "ai_query",     // AI operations
    "process",      // Action type
    async () => {
      // AI processing logic here
      return { success: true, data: result };
    }
  );
}
```

### 3. Adding File Upload Features

```typescript
export async function uploadDocument(formData: FormData) {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  const companyId = formData.get("companyId") as string;

  return withCompanyAccessValidation(
    session.user.id,
    companyId,
    "document",   // Document operations
    "upload",     // Action type
    async () => {
      // File upload logic here
      return { success: true, data: document };
    }
  );
}
```

---

## =È Migration Guide

### Updating Existing Code

1. **Identify all company-related operations**
2. **Replace custom validation with wrapper pattern**
3. **Add proper resource types and actions**
4. **Remove manual audit logging**
5. **Test company isolation thoroughly**

### Before/After Example

**L Before (Custom Validation):**

```typescript
export async function getTasks(companyId: string) {
  const session = await auth();
  
  // Custom validation
  const membership = await db.companyMembership.findFirst({
    where: { userId: session.user.id, companyId }
  });
  
  if (!membership) {
    throw new Error("Access denied");
  }
  
  const tasks = await db.task.findMany({
    where: { 
      boardSection: { 
        board: { companyId } 
      } 
    }
  });
  
  return tasks;
}
```

** After (Security-First Wrapper):**

```typescript
export async function getTasks({ companyId }: { companyId?: string } = {}) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const targetCompanyId = companyId || session.user.activeCompanyId;
  
  if (!targetCompanyId) {
    throw new Error("Company context required");
  }

  return withCompanyAccessValidation(
    session.user.id,
    targetCompanyId,
    "task",
    "access",
    async () => {
      const tasks = await db.task.findMany({
        where: {
          boardSection: {
            board: {
              access: { has: session.user.id },
            },
          },
        },
      });

      return { success: true, data: tasks };
    }
  );
}
```

---

## <‰ Success Criteria

### Security Implementation is Complete When:

 **Zero custom company validation code exists**  
 **All operations use Security-First Wrapper Pattern**  
 **Complete audit trail for all company operations**  
 **Consistent error handling across all features**  
 **Company isolation verified through testing**  
 **Performance impact acceptable (<100ms overhead)**  
 **Compliance requirements met through audit logs**

---

##   Critical Reminders

1. **NEVER bypass the Security-First Wrapper Pattern**
2. **ALWAYS validate company access for every operation**
3. **NEVER create custom company validation logic**
4. **ALWAYS use appropriate resource types and actions**
5. **NEVER skip audit logging**
6. **ALWAYS test company isolation scenarios**
7. **NEVER expose sensitive company data across tenants**

---

## =Þ Support & Questions

For security implementation questions:

1. **Reference this guide first**
2. **Check existing patterns in codebase**
3. **Test company isolation thoroughly**
4. **Document any new patterns discovered**

**Remember: Security is not optional. Every feature must implement these patterns for TaskHQ's multi-tenant architecture to remain secure and compliant.**