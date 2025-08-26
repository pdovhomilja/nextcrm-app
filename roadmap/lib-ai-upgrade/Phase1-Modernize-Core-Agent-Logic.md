
# Phase 1: Modernize Core Agent Logic (`agent-core.ts`)

**Objective:** Refactor the `BaseAIAgent` class in `agent-core.ts` to replace the rigid, multi-step decision-making process with a modern, single-loop agentic architecture using the Vercel AI SDK's `generateText` or `streamText` functions.

**Parent Document:** [Pre-Implementation Analysis](pre-implementation.md)

## 1. Rationale

The current implementation in `agent-core.ts` suffers from several critical limitations identified in our analysis:

- **Redundant LLM Calls:** The `makeDecision` -> `switch` -> `orchestrateTools` flow results in at least two separate LLM calls for most tool-use operations, increasing latency and cost.
- **Brittle State Management:** The `switch` statement is a form of hard-coded state management that is difficult to extend and maintain.
- **Complex & Fragile Prompting:** We are forcing a powerful LLM into a deterministic workflow using complex prompts and manual keyword-based hints (`isSearchQuery`, etc.).

This phase will address these issues by adopting the **`Multi-Step Tool Usage`** pattern. By consolidating logic into a single, iterative agentic loop, we will reduce complexity, improve performance, and fully leverage the LLM's native reasoning capabilities.

## 2. Step-by-Step Implementation Guide

### Step 2.1: Overhaul `processQuery` in `agent-core.ts`

The `processQuery` method will be the centerpiece of this refactoring effort.

1.  **Remove `makeDecision`:** Delete the `makeDecision` method call from `processQuery`. The logic contained within its prompt will be migrated to the `system` prompt of the new `generateText` call.
2.  **Eliminate the `switch` block:** The entire `switch (decision.action)` block must be removed. This is the primary source of rigidity we are targeting.
3.  **Implement the `generateText` Loop:** Introduce a single call to `generateText` (or `streamText` for streaming responses). This call will become the new core of `processQuery`.

**Example of the new `processQuery` structure:**

```typescript
// in agent-core.ts
import { streamText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';

// Define your OpenAI provider instance
const openai = createOpenAI({
    // ... your credentials
});

// ... inside BaseAIAgent class

async processQuery(query: string, history: CoreMessage[]) {
    const systemPrompt = `You are a helpful AI assistant... \                         Your role is to assist users by answering questions and using available tools to manage tasks, projects, and users. \                         You can ask for clarification if a query is ambiguous.`;

    const { text, toolCalls, finishReason } = await streamText({
        model: openai('gpt-4o-mini'), // Or dynamically select model
        system: systemPrompt,
        messages: [...history, { role: 'user', content: query }],
        tools: this.getAvailableTools(), // Method to aggregate tools
    });

    // The iterative tool-calling loop is now handled by the AI SDK.
    // We just need to process the results.

    // ... handle tool calls and final response

    return { text, toolCalls };
}
```

### Step 2.2: Refactor Capabilities as Tools

All agent capabilities must be exposed as discrete, Zod-defined tools.

1.  **Deprecate `prepareToolParams`:** This method, which manually extracts parameters, is now obsolete. The LLM will generate tool parameters directly based on the Zod schema. This function should be deleted.
2.  **Create a `tools` directory:** Inside `lib/ai/`, create a `tools/` directory to house tool definitions (e.g., `task-tools.ts`, `rag-tools.ts`).
3.  **Define Tools with Zod Schemas:** Refactor existing functionalities into tool definitions.

**Example: Creating a `request_clarification` tool:**

```typescript
// in lib/ai/tools/common-tools.ts
import { z } from 'zod';

export const commonTools = {
    request_clarification: {
        description: 'Ask the user a clarifying question when their request is ambiguous or incomplete.',
        parameters: z.object({
            question: z.string().describe('The specific question to ask the user.'),
        }),
        execute: async ({ question }) => {
            // This tool might not perform an action but serves as a signal
            // for the agent to respond with the question.
            return { was_clarification_requested: true, question };
        }
    }
};
```

**Example: Creating a `rag_search` tool:**

```typescript
// in lib/ai/tools/rag-tools.ts
import { z } from 'zod';

export const ragTools = {
    rag_search: {
        description: 'Search the knowledge base for relevant documents and context to answer a user query.',
        parameters: z.object({
            searchText: z.string().describe('The text to search for in the knowledge base.'),
        }),
        execute: async ({ searchText }) => {
            // ... logic to call the embedding search service
            const results = await embeddingSearchService.search(searchText);
            return { results };
        }
    }
};
```

### Step 2.3: Centralize Tool Management

1.  **Create `getAvailableTools`:** In `BaseAIAgent`, create a method that aggregates all tools available to the agent. Initially, this will include the common tools and RAG tools. In Phase 3, this method will be updated to include tools from the specialized "toolkits."

```typescript
// in agent-core.ts, inside BaseAIAgent

private getAvailableTools() {
    // In Phase 1, this is simple. It will become more dynamic later.
    return { ...commonTools, ...ragTools };
}
```

## 3. Key Architectural Changes

-   **Before:** A rigid, multi-step process (`makeDecision` -> `switch` -> `orchestrateTools`) that separates the decision from the action.
-   **After:** A single, iterative agentic loop (`streamText` or `generateText`) where the LLM decides at each step whether to call a tool or generate a text response.
-   **Before:** Manual, keyword-based logic (`determineContextType`, `prepareToolParams`).
-   **After:** LLM-driven parameter generation based on Zod schemas, eliminating manual data extraction.

## 4. Verification Strategy

1.  **Unit Testing:** Create a test file for `agent-core.ts`.
2.  **Mock the AI SDK:** Use a library like `vitest` or `jest` to mock the `streamText` function.
3.  **Test Case 1 (Simple Response):**
    -   **Input:** A simple query like "Hello".
    -   **Mock:** Configure the mocked `streamText` to return a simple text response without tool calls.
    -   **Assert:** Verify that `processQuery` returns the expected text and an empty `toolCalls` array.
4.  **Test Case 2 (Tool Use):**
    -   **Input:** A query requiring a tool, like "Search for project alpha".
    -   **Mock:** Configure the mocked `streamText` to return a `toolCalls` array containing a call to `rag_search` with the parameter `{ searchText: 'project alpha' }`.
    -   **Assert:** Verify that `processQuery` correctly identifies the tool call and its parameters.

```