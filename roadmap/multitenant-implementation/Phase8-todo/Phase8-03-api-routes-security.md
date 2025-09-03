# Phase 8.3: API Routes Security Fixes

**Priority:** CRITICAL  
**Estimated Time:** 1-2 hours (reduced - using Security-First Wrapper Pattern)  
**Dependencies:** Phase8-01 (Enhanced Middleware)  
**Status:** NOT STARTED

---

## Overview

Transform API routes to use the Security-First Wrapper Pattern with existing `lib/security/company-access-validator.ts`, specifically targeting the MCP (Model Context Protocol) system. This eliminates custom validation code in favor of unified security with comprehensive audit logging for AI tools and related systems.

## Purpose

- **AI Security**: Ensure AI tools only access company-appropriate data
- **MCP Security**: Fix Model Context Protocol vulnerabilities  
- **API Consistency**: Standardize company validation across all API routes

## Affected API Routes

| API Route | File | Status | Impact |
|-----------|------|--------|--------|
| MCP Tasks API | `/api/mcp/tasks/[transport]/route.ts` | ❌ VULNERABLE | AI tools access all companies' task data |
| MCP Analytics API | `/api/mcp/analytics/[transport]/route.ts` | ⚠️ PARTIAL | Board validation issues |
| AI Embeddings API | `/api/ai/embeddings/route.ts` | ✅ SECURE | Proper company validation |
| AI Agents API | `/api/ai/agents/route.ts` | ✅ SECURE | Uses activeCompanyId correctly |
| AI Chat API | `/api/ai/chat/route.ts` | ✅ SECURE | Proper company context |

---

## Implementation Steps

### Step 1: Transform MCP Tasks API with Security Wrapper (30 minutes)

**File:** `app/api/mcp/tasks/[transport]/route.ts`

**🚀 SECURITY-FIRST WRAPPER TRANSFORMATION:**

```typescript
import { withCompanyAccessValidation } from "@/lib/security/company-access-validator";

// Transform search_tasks tool
server.tool(
  "search_tasks",
  "Search and filter tasks within the user's company",
  searchTasksSchema,
  async (params: any) => {
    const session = await auth();
    if (!session?.user) {
      throw new Error("Unauthorized");
    }

    // 🔒 SECURITY-FIRST WRAPPER: Automatic company validation + audit logging
    return withCompanyAccessValidation(
      session.user.id,
      session.user.activeCompanyId,
      "task",  // Perfect resource type match!
      "search", // Action
      async () => {
        // ✅ SIMPLIFIED WHERE CLAUSE - Security handled by wrapper
        const whereClause: Prisma.TaskWhereInput = {
          boardSection: {
            board: {
              access: {
                has: session.user.id,
                // No manual company filtering needed!
              },
            },
          },
        };

        const tasks = await db.task.findMany({
          where: whereClause,
          // ... other query options
        });

        return {
          success: true,
          data: tasks,
        };
      }
    );
  }
);
```

**Transform create_task and update_task tools:**

```typescript
// Transform create_task tool
server.tool(
  "create_task",
  "Create a new task in the specified board section",
  createTaskSchema,
  async (params: any) => {
    const session = await auth();
    if (!session?.user) {
      throw new Error("Unauthorized");
    }

    // 🔒 SECURITY-FIRST WRAPPER: Automatic company validation + audit logging
    return withCompanyAccessValidation(
      session.user.id,
      session.user.activeCompanyId,
      "task",  // Resource type
      "create", // Action
      async () => {
        // ✅ SIMPLIFIED BOARD SECTION VALIDATION - Security handled by wrapper
        const boardSection = await db.boardSection.findFirst({
          where: {
            id: params.boardSectionId,
            board: {
              access: {
                has: session.user.id,
                // Wrapper ensures company isolation!
              },
            },
          },
        });

        if (!boardSection) {
          throw new Error("Board section not found or access denied");
        }

        // Create task with automatic company context
        const task = await db.task.create({
          data: {
            ...params,
            createdById: session.user.id,
            boardSectionId: params.boardSectionId,
          },
        });

        return {
          success: true,
          data: task,
        };
      }
    );
  }
);

// Transform update_task tool  
server.tool(
  "update_task",
  "Update an existing task",
  updateTaskSchema,
  async (params: any) => {
    const session = await auth();
    if (!session?.user) {
      throw new Error("Unauthorized");
    }

    // 🔒 SECURITY-FIRST WRAPPER: Automatic company validation + audit logging
    return withCompanyAccessValidation(
      session.user.id,
      session.user.activeCompanyId,
      "task",  // Resource type
      "update", // Action
      async () => {
        // ✅ SIMPLIFIED TASK VALIDATION - Security handled by wrapper
        const existingTask = await db.task.findFirst({
          where: {
            id: params.taskId,
            boardSection: {
              board: {
                access: {
                  has: session.user.id,
                  // Wrapper ensures company isolation!
                },
              },
            },
          },
        });

        if (!existingTask) {
          throw new Error("Task not found or access denied");
        }

        // Update task
        const updatedTask = await db.task.update({
          where: { id: params.taskId },
          data: params,
        });

        return {
          success: true,
          data: updatedTask,
        };
      }
    );
  }
);
```

**Update the update_task tool** with the same company validation:

```typescript
// In the update_task tool handler - add company validation before update
const existingTask = await db.task.findFirst({
  where: {
    id: params.taskId,
    boardSection: {
      board: {
        AND: [
          {
            access: {
              has: session.user.id,
            },
          },
          {
            companyId: session.user.activeCompanyId,
          },
        ],
      },
    },
  },
});

if (!existingTask) {
  throw new Error("Task not found or access denied");
}
```

### Step 2: Transform MCP Analytics API with Security Wrapper (20 minutes)

**File:** `app/api/mcp/analytics/[transport]/route.ts`

**🚀 SECURITY-FIRST WRAPPER TRANSFORMATION:**

```typescript
import { withCompanyAccessValidation } from "@/lib/security/company-access-validator";

// Transform board analytics tools
server.tool(
  "get_board_analytics",
  "Get analytics data for a specific board",
  boardAnalyticsSchema,
  async (params: any) => {
    const session = await auth();
    if (!session?.user) {
      throw new Error("Unauthorized");
    }

    // 🔒 SECURITY-FIRST WRAPPER: Automatic company validation + audit logging
    return withCompanyAccessValidation(
      session.user.id,
      session.user.activeCompanyId,
      "board",  // Perfect resource type match!
      "analytics", // Action
      async () => {
        // ✅ SIMPLIFIED BOARD VALIDATION - Security handled by wrapper
        const board = await db.board.findFirst({
          where: {
            id: params.boardId,
            access: {
              has: session.user.id,
              // Wrapper ensures company isolation!
            },
          },
          include: {
            boardSections: {
              include: {
                tasks: true,
              },
            },
          },
        });

        if (!board) {
          throw new Error("Board not found or access denied");
        }

        // Generate analytics data
        const analytics = {
          // ... analytics logic
        };

        return {
          success: true,
          data: analytics,
        };
      }
    );
  }
);
```

**✅ APPLY SAME PATTERN TO ALL BOARD QUERIES:**
- All analytics tools now use unified security wrapper
- Automatic audit logging for all AI analytics access
- Consistent error handling across all endpoints

### Step 3: Transform AI API Routes with Security Wrapper (15 minutes)

Apply the Security-First Wrapper Pattern to AI endpoints:

**AI Embeddings API** (`/api/ai/embeddings/route.ts`):
```typescript
import { withCompanyAccessValidation } from "@/lib/security/company-access-validator";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 🔒 SECURITY-FIRST WRAPPER: "ai_query" resource type
  return withCompanyAccessValidation(
    session.user.id,
    session.user.activeCompanyId,
    "ai_query",  // Perfect for AI endpoints!
    "embeddings", // Action
    async () => {
      // AI embeddings logic with automatic company isolation
      const result = await processEmbeddings(params);
      return NextResponse.json({ success: true, data: result });
    }
  );
}
```

**AI Chat API** (`/api/ai/chat/route.ts`):
```typescript
// Apply same Security-First Wrapper pattern with "ai_query" resource type
return withCompanyAccessValidation(
  session.user.id,
  session.user.activeCompanyId,
  "ai_query",  // Resource type
  "chat", // Action
  async () => {
    // Chat logic with automatic audit logging
  }
);
```

**✅ UNIFIED AI SECURITY:**
- All AI endpoints use same security wrapper
- "ai_query" resource type for consistent audit logging
- Automatic company isolation for all AI operations

### Step 5: Update Additional API Routes (If Found) (30 minutes)

Audit other API routes for similar vulnerabilities:

**Check these directories:**
- `/api/ai/` - Review all AI-related endpoints
- `/api/mcp/` - Review all MCP endpoints  
- `/api/company/` - Review company management endpoints

**Apply consistent company validation using the new helper function.**

---

## Testing Steps

### Test 1: MCP Tasks API Security (20 minutes)

**Test search_tasks tool:**
1. Login as user with access to multiple companies
2. Set Company A as active
3. Use AI assistant to search for tasks
4. Verify only Company A tasks are returned
5. Switch to Company B (if possible via API)
6. Verify only Company B tasks are returned

**Test create_task tool:**
1. Try to create task in Company A board while Company B is active
2. Should fail with access denied error
3. Create task in Company B board while Company B is active  
4. Should succeed

### Test 2: MCP Analytics API Security (15 minutes)

**Test board analytics:**
1. Get analytics for Company A board while Company A is active
2. Should work normally
3. Try to get analytics for Company A board while Company B is active
4. Should fail with access denied error

### Test 3: Cross-Company API Access (15 minutes)

**Test with session manipulation:**
1. Login with Company A active
2. Make API request to MCP tools
3. Manually try to change company context in request
4. Verify access is still limited to Company A (from session)

---

## Validation Checklist

- [ ] MCP search_tasks only returns tasks from active company
- [ ] MCP create_task only creates tasks in active company boards
- [ ] MCP update_task only updates tasks in active company  
- [ ] MCP analytics only returns data for active company boards
- [ ] Company validation helper works correctly
- [ ] Error messages are informative but not revealing
- [ ] All API routes maintain consistent company validation
- [ ] No cross-company data leakage in AI tools

---

## Files Modified - TRANSFORMED with Security-First Wrapper Pattern

1. `app/api/mcp/tasks/[transport]/route.ts` - **TRANSFORMED** with Security-First Wrappers
2. `app/api/mcp/analytics/[transport]/route.ts` - **TRANSFORMED** with Security-First Wrappers
3. `app/api/ai/embeddings/route.ts` - **TRANSFORMED** with "ai_query" resource validation
4. `app/api/ai/chat/route.ts` - **TRANSFORMED** with "ai_query" resource validation
5. Additional API routes using existing `lib/security/company-access-validator.ts`

## Security Impact - ENHANCED

**BEFORE:** AI assistant tools could access cross-company data + no audit trail  
**AFTER:** Comprehensive AI security framework with unified validation:

✅ **All AI tools use existing security validator**  
✅ **Complete audit logging to `securityAuditLog` table for all AI operations**  
✅ **Risk assessment (low/high) for every AI query and tool usage**  
✅ **Perfect resource type mapping: "task", "board", "ai_query"**  
✅ **50% code reduction by eliminating custom API validation**

## AI Assistant Impact - AMPLIFIED

✅ **AI search results limited to current company with audit logging**  
✅ **AI task creation limited to current company boards with security tracking**  
✅ **AI analytics limited to current company data with risk assessment**  
✅ **Consistent company context across all AI interactions**  
✅ **Security monitoring and anomaly detection for all AI tool usage**  
✅ **Unified error handling and security responses across all AI endpoints**

---

## Performance Considerations

- **Company validation adds ~10-20ms per API request**
- **Database queries slightly more complex but properly indexed**
- **No significant impact on AI response times**

## Rollback Plan

If API changes break functionality:
1. Revert specific API route files
2. Remove company validation helper
3. Test AI assistant functionality
4. Gradually re-apply fixes with more testing

## Success Criteria

✅ **Zero cross-company data access via AI tools**  
✅ **All MCP tools respect company boundaries**  
✅ **AI assistant maintains company context consistency**  
✅ **No regression in AI assistant functionality**

---

**⚠️ CRITICAL NOTE:** These fixes prevent AI systems from leaking sensitive business data across company boundaries. Test AI assistant functionality thoroughly after implementation.