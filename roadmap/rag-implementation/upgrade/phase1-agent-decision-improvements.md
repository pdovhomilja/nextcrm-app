# Phase 1: Agent Decision Making Improvements

**Priority**: ⚠️ **RECOMMENDED UPGRADE**  
**Duration**: 1-2 days  
**Risk**: Low - Significant accuracy improvement with better user experience

## 🎯 **Objective**

Replace hardcoded keyword matching in `makeDecision` function with LLM-based intent classification using AI SDK v5 agents routing patterns.

## 📋 **Current Problem**

**File**: `/lib/ai/agent-core.ts` (lines 248-266)

**Issue**: Primitive keyword matching approach
```typescript
// ❌ CURRENT: Inflexible hardcoded patterns
const isSearchQuery =
  queryLower.includes("search") ||
  queryLower.includes("find") ||
  queryLower.includes("look for") ||
  // ... more hardcoded patterns

const isUpdateQuery =
  queryLower.includes("mark") ||
  queryLower.includes("make") ||
  queryLower.includes("set") ||
  // ... more hardcoded patterns
```

**Limitations**:
- Cannot handle natural language variations
- Language-dependent (English only)
- Maintenance overhead for new patterns
- False positives in complex queries
- No conversation context awareness

## 🔧 **Implementation Tasks**

### Task 1: Create LLM-Based Decision Function

**File**: `/lib/ai/agent-core.ts`

**Create new method**:
```typescript
/**
 * LLM-based decision making using GPT-5 intent classification
 */
private async makeLLMBasedDecision(
  query: string,
  context: AgentContext,
  history: AgentMessage[]
): Promise<AgentDecision> {
  const mcpToolCount = Object.keys(this.mcpTools).length;

  const intentClassificationPrompt = `Analyze this project management query and classify the user's intent.

Query: "${query}"
Available MCP tools: ${mcpToolCount > 0 ? Object.keys(this.mcpTools).slice(0, 10).join(", ") : "NONE"}
Recent conversation: ${history.slice(-2).map(m => `${m.role}: ${m.content}`).join("\\n")}

Classify the intent and recommend the optimal action strategy.`;

  try {
    const intentResult = await generateObject({
      model: aiConfig.structuredOutputModel, // GPT-5 for reasoning
      system: `You are an expert at understanding user intent in project management contexts.
      
Analyze the query and classify it into one of these action types:
- "search_query": User wants to find, search, or retrieve information about tasks/boards
- "update_query": User wants to modify, complete, or change task/board status  
- "create_query": User wants to create new tasks, boards, or items
- "analysis_query": User wants insights, analytics, or performance analysis
- "general_query": General questions that don't require specific tools

Consider natural language variations, context, and user intent rather than just keywords.`,
      prompt: intentClassificationPrompt,
      schema: z.object({
        intent: z.enum(["search_query", "update_query", "create_query", "analysis_query", "general_query"]),
        confidence: z.number().min(0).max(1),
        reasoning: z.string(),
        recommendedAction: z.enum(["respond", "use_tools", "request_clarification", "escalate"]),
        recommendedTools: z.array(z.string()).optional(),
        responseStrategy: z.enum(["direct", "rag_enhanced", "tool_orchestrated", "analytical"])
      })
    });

    const classification = intentResult.object;
    
    // Map intent to action with intelligent tool selection
    let toolsToUse: string[] = [];
    if (classification.recommendedAction === "use_tools" && mcpToolCount > 0) {
      switch (classification.intent) {
        case "search_query":
          toolsToUse = ["tasks_search_tasks", "tasks_contextual_search", "tasks_get_tasks"]
            .filter(tool => this.mcpTools[tool]);
          break;
        case "update_query":
          toolsToUse = ["tasks_search_tasks", "tasks_update_task"]
            .filter(tool => this.mcpTools[tool]);
          break;
        case "create_query":
          toolsToUse = ["tasks_create_task", "boards_create_board"]
            .filter(tool => this.mcpTools[tool]);
          break;
        case "analysis_query":
          toolsToUse = ["analytics_analyze_project_health", "analytics_analyze_team_performance"]
            .filter(tool => this.mcpTools[tool]);
          break;
      }
    }

    return {
      action: classification.recommendedAction,
      reasoning: classification.reasoning,
      confidence: classification.confidence,
      toolsToUse: toolsToUse.length > 0 ? toolsToUse : undefined,
      responseStrategy: classification.responseStrategy
    };

  } catch (error) {
    console.error("LLM-based decision making error:", error);
    
    // Fallback decision with improved logic
    return {
      action: mcpToolCount > 0 ? "use_tools" : "respond",
      reasoning: "Fallback decision due to LLM classification error",
      confidence: 0.5,
      responseStrategy: "direct",
    };
  }
}
```

### Task 2: Replace Existing makeDecision Function

**Replace lines 248-340 in `/lib/ai/agent-core.ts`**:

```typescript
/**
 * Make decision about how to handle the query using LLM-based routing
 */
protected async makeDecision(
  query: string,
  context: AgentContext,
  history: AgentMessage[]
): Promise<AgentDecision> {
  // Use LLM-based decision making instead of hardcoded patterns
  return this.makeLLMBasedDecision(query, context, history);
}
```

### Task 3: Remove Hardcoded Logic

**Delete the following from makeDecision function**:
- `isSearchQuery` variable and logic (lines 248-256)
- `isUpdateQuery` variable and logic (lines 258-266)
- All hardcoded keyword matching arrays
- Related conditional logic

### Task 4: Add Enhanced Logging

**Add decision logging system**:
```typescript
// Add to processQuery method after decision is made
console.log(`Agent Decision: ${decision.action} (${decision.confidence * 100}% confidence)`, {
  reasoning: decision.reasoning,
  toolsToUse: decision.toolsToUse,
  responseStrategy: decision.responseStrategy,
  query: query.substring(0, 100) + (query.length > 100 ? "..." : "")
});
```

### Task 5: Error Handling Enhancement

**Improve error handling in makeLLMBasedDecision**:
```typescript
} catch (error) {
  console.error("LLM-based decision making error:", error);
  
  // Log detailed error information
  console.error("Query that caused error:", query);
  console.error("Available tools:", Object.keys(this.mcpTools).length);
  console.error("Context:", { userId: context.userId, boardId: context.boardId });
  
  // Enhanced fallback decision based on simple heuristics
  const hasSearchTerms = query.toLowerCase().includes("find") || 
                         query.toLowerCase().includes("search") ||
                         query.toLowerCase().includes("show");
  
  return {
    action: mcpToolCount > 0 && hasSearchTerms ? "use_tools" : "respond",
    reasoning: `Fallback decision due to LLM error: ${error instanceof Error ? error.message : "Unknown error"}`,
    confidence: 0.3, // Lower confidence for fallback
    toolsToUse: hasSearchTerms ? ["tasks_search_tasks"] : undefined,
    responseStrategy: "direct",
  };
}
```

## 🧪 **Testing Strategy**

### Test Cases

**1. Natural Language Queries**:
```typescript
const testQueries = [
  "Can you find tasks related to authentication?",
  "Show me all high priority tasks",
  "Mark the user registration task as completed",
  "Create a new task for API documentation", 
  "How is our project performing this month?",
  "I need help understanding the codebase"
];
```

**2. Edge Cases**:
- Empty queries
- Very long queries
- Queries in different languages
- Ambiguous queries
- Queries with typos

**3. Integration Tests**:
- Test with real MCP tools
- Verify tool selection accuracy
- Check fallback behavior when LLM fails
- Validate confidence scoring

### Test Implementation

**Create test file**: `/lib/ai/__tests__/agent-decision-making.test.ts`

```typescript
import { BaseAIAgent } from '../agent-core';
import { AgentContext } from '../agent-core';

describe('LLM-Based Decision Making', () => {
  let agent: BaseAIAgent;
  
  beforeEach(() => {
    agent = new TestAgent('test', 'test-agent', ['search', 'create', 'update']);
  });

  test('should classify search queries correctly', async () => {
    const decision = await agent.makeDecision(
      "Find all tasks assigned to John",
      mockContext,
      []
    );
    
    expect(decision.action).toBe("use_tools");
    expect(decision.toolsToUse).toContain("tasks_search_tasks");
    expect(decision.confidence).toBeGreaterThan(0.7);
  });

  test('should handle fallback when LLM fails', async () => {
    // Mock LLM failure
    jest.spyOn(aiConfig, 'structuredOutputModel').mockRejectedValue(new Error("API Error"));
    
    const decision = await agent.makeDecision(
      "Find tasks",
      mockContext,
      []
    );
    
    expect(decision.action).toBe("use_tools");
    expect(decision.confidence).toBeLessThan(0.5);
    expect(decision.reasoning).toContain("Fallback");
  });
});
```

## 📊 **Success Metrics**

### Quantitative Metrics
- **Accuracy**: >85% correct intent classification
- **Response Time**: <2 seconds for decision making
- **Confidence**: Average confidence >75%
- **Tool Selection**: >90% appropriate tool selection

### Qualitative Metrics
- **Natural Language**: Handles conversational queries correctly
- **Context Awareness**: Uses conversation history appropriately
- **Multi-language**: Basic support for non-English queries
- **Error Handling**: Graceful degradation when LLM fails

## ✅ **Validation Checklist**

- [ ] **LLM-based decision function created and tested**
- [ ] **Hardcoded keyword matching completely removed**
- [ ] **Enhanced error handling implemented**
- [ ] **Comprehensive logging system added** 
- [ ] **Unit tests cover all major scenarios**
- [ ] **Integration tests pass with real MCP tools**
- [ ] **Performance monitoring shows acceptable latency**
- [ ] **Confidence scoring works accurately**
- [ ] **Tool selection maps correctly to intent types**
- [ ] **Fallback behavior functions properly**

## 🎯 **Expected Improvements**

1. **Accuracy**: 20-30% improvement in intent classification
2. **User Experience**: Better handling of natural language queries  
3. **Maintenance**: No more manual keyword pattern updates
4. **Scalability**: Automatic adaptation to new query types
5. **Internationalization**: Natural multi-language support
6. **Context Awareness**: Uses conversation history for better decisions

## 📈 **Performance Monitoring**

After deployment, monitor:
- Decision making latency
- Classification accuracy rate
- Fallback frequency  
- Tool selection success rate
- User satisfaction with query handling

## 📝 **Next Phase**

Upon successful completion, proceed to **Phase 2: Database Performance Optimization** for vector search improvements.