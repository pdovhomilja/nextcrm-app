# Phase 0: Critical Production Fix

**Priority**: 🚨 **CRITICAL - PRODUCTION BREAKING**  
**Duration**: 2-4 hours  
**Risk**: HIGH - Currently breaking task recommendation functionality

## 🎯 **Immediate Issue to Resolve**

**Current Error**:
```bash
Task Recommender agent processing error: Error [AI_APICallError]: Invalid schema for function 'tasks_search_tasks': schema must be a JSON Schema of 'type: "object"', got 'type: "None"'.
    at async TaskRecommenderAgent.orchestrateTools (lib/ai/agent-core.ts:477:22)
    at async POST (app/api/ai/suggest/route.ts:94:28)
```

**Root Cause**: Agent-core tool schema mismatch with MCP servers

## 📋 **Tasks**

### 1. Fix Missing Tool Schema in Agent-Core

**File**: `/lib/ai/agent-core.ts` (lines 361-425)

**Problem**: Missing `search_find_similar_tasks` schema in `toolSchemasByMethod`

**Fix Required**:
```typescript
const toolSchemasByMethod: Record<string, z.ZodTypeAny> = {
  // ... existing schemas
  
  // ✅ ADD MISSING SCHEMA:
  find_similar_tasks: z.object({
    searchTerm: z.string().min(1, "Search term is required"),
    boardId: z.string().optional(),
    limit: z.number().int().positive().max(10).default(5),
    userId: z.string().optional(),
    companyId: z.string().optional(),
  }),
  
  // ✅ VERIFY EXISTING SCHEMAS MATCH MCP SERVERS EXACTLY
};
```

### 2. Verify Tool Name Mapping

**Check**: Ensure tool names in agent-core match MCP server tool names exactly
- `tasks_search_tasks` ✓
- `search_find_similar_tasks` ❌ (missing)
- `tasks_get_tasks` ✓
- `tasks_create_task` ✓
- `tasks_update_task` ✓

### 3. Add Comprehensive Error Handling

**Location**: `agent-core.ts:477` (orchestrateTools method)

**Add**:
```typescript
// Before generateText call
const availableToolNames = toolNames.filter((n) => this.mcpTools[n]);
if (availableToolNames.length === 0) {
  console.warn(`No MCP tools available for requested tools: ${toolNames.join(", ")}`);
  return { results: [], summary: "No tools available - falling back to direct response" };
}

// Validate schemas exist for all tools
const missingSchemas = availableToolNames.filter(name => {
  const [, ...methodParts] = name.split("_");
  const method = methodParts.join("_");
  return !toolSchemasByMethod[method] && !toolSchemasByMethod.__fallback;
});

if (missingSchemas.length > 0) {
  console.error(`Missing schemas for tools: ${missingSchemas.join(", ")}`);
  // Continue with fallback schema but log the issue
}
```

## ✅ **Validation Steps**

1. **Test the specific failing endpoint**:
   ```bash
   curl -X POST http://localhost:3000/api/ai/suggest \
   -H "Content-Type: application/json" \
   -d '{"query": "find similar tasks", "boardId": "test"}'
   ```

2. **Verify no schema errors in logs**:
   - Look for `Invalid schema for function` errors
   - Check tool orchestration logs

3. **Test task recommendation functionality**:
   - Navigate to task recommendation feature
   - Verify no `AI_APICallError` occurs

## 🔧 **Implementation Steps**

### Step 1: Identify Missing Schemas (5 minutes)
```bash
# Search for tool usage in codebase
grep -r "search_find_similar_tasks" app/api/
grep -r "find_similar_tasks" lib/ai/
```

### Step 2: Add Missing Schema (10 minutes)
- Open `/lib/ai/agent-core.ts`
- Navigate to `toolSchemasByMethod` (around line 361)
- Add missing schema for `find_similar_tasks`
- Verify all other schemas match MCP server implementations

### Step 3: Test Fix (15 minutes)
- Start development server: `pnpm dev`
- Test failing endpoint
- Verify error is resolved
- Test related functionality

### Step 4: Deploy Fix (30 minutes)
- Commit changes
- Deploy to production
- Monitor logs for resolution

## 📊 **Success Criteria**

- [ ] No `AI_APICallError` with `type: "None"` errors
- [ ] Task recommendation endpoint responds successfully
- [ ] All MCP tool schemas properly validated
- [ ] No breaking changes to existing functionality

## 🚨 **Rollback Plan**

If issues occur:
1. Revert changes to `agent-core.ts`
2. Redeploy previous version
3. Monitor for stability return

## 📝 **Next Phase**

Once this critical fix is deployed and validated, proceed to **Phase 1: Agent Decision Making Improvements** for the longer-term solution.