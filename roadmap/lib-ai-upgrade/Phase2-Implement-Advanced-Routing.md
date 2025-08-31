# Phase 2: Implement Advanced Routing (`agent-orchestrator.ts`)

**Objective:** Replace the brittle, keyword-driven `selectAgents` function in `agent-orchestrator.ts` with a sophisticated, LLM-powered **`Routing`** agent. This new router will classify user intent into a rich, structured object, providing better context for downstream processing.

**Parent Document:** [Pre-Implementation Analysis](pre-implementation.md)
**Prerequisite:** [Phase 1: Modernize Core Agent Logic](Phase1-Modernize-Core-Agent-Logic.md)

## 1. Rationale

The current `selectAgents` function relies on a fragile `if/else` chain as a fallback, which is difficult to scale and maintain. The routing decision itself is simplistic, merely selecting a `primaryAgent`. This fails to capture the nuances of user intent, such as the domain, complexity, or specific capabilities required.

By implementing the `Routing` pattern as described in the Vercel AI SDK documentation, we replace this primitive logic with an intelligent classification step. This provides a robust, scalable, and context-aware foundation for the entire agentic process.

## 2. Step-by-Step Implementation Guide

### Step 2.1: Define the Intent Schema

Create a new Zod schema that defines the structure of our classified intent. This schema is the heart of the new routing mechanism.

```typescript
// in lib/ai/routing/schema.ts (new file)
import { z } from 'zod';

export const IntentSchema = z.object({
  queryType: z.enum([
    "data_retrieval",       // Fetching information (e.g., 'get my tasks')
    "data_mutation",        // Changing data (e.g., 'create a task', 'update project status')
    "analytical_question",  // Requires analysis or insight (e.g., 'which project is behind schedule?')
    "general_conversation", // Chitchat or questions not related to data
  ]).describe('The overall category of the user's query.'),

  domain: z.enum(["tasks", "projects", "users", "metrics", "general"]).describe('The primary data domain the query pertains to.'),

  complexity: z.enum(["simple", "complex", "multi_step"]).describe('The estimated complexity of the query.'),

  requiredToolkits: z.array(z.enum(["taskManager", "projectAnalyzer", "userDirectory", "reporting"]))
    .describe('A list of specialized toolkits needed to fulfill the request.'),

  reasoning: z.string().describe('A brief explanation of why these classifications were chosen.'),
});

export type Intent = z.infer<typeof IntentSchema>;
```

### Step 2.2: Create the `classifyAndRouteQuery` Function

This new function will replace `selectAgents`. It takes the user query and returns a structured `Intent` object.

1.  **Create `lib/ai/routing/router.ts`:** This new file will house the routing logic.
2.  **Implement the function:** Use the AI SDK's `generateObject` to perform the classification.

```typescript
// in lib/ai/routing/router.ts
import { generateObject } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { IntentSchema } from "./schema";
import type { CoreMessage } from "ai";

const openai = createOpenAI({
  /* ... credentials ... */
});

export async function classifyAndRouteQuery(
  query: string,
  history: CoreMessage[],
) {
  const systemPrompt = `You are an expert query router. Your job is to analyze the user's query and classify it according to the provided schema. 
    Select the most appropriate toolkits required to answer the query.`;

  const { object: intent } = await generateObject({
    model: openai("gpt-4o-mini"), // Use a fast model for routing
    schema: IntentSchema,
    prompt: `User query: "${query}"`,
    system: systemPrompt,
    messages: history,
  });

  return intent;
}
```

### Step 2.3: Integrate the Router into `agent-orchestrator.ts`

1.  **Deprecate `selectAgents`:** Remove the `selectAgents` function and its associated `if/else` fallback logic entirely.
2.  **Update the `orchestrate` method:** Modify the main orchestration logic to call `classifyAndRouteQuery` first. The output of this function will then determine how the `BaseAIAgent` (from Phase 1) is invoked.

```typescript
// in agent-orchestrator.ts

import { classifyAndRouteQuery } from './routing/router';
import { BaseAIAgent } from './agent-core';
import { getToolkits } from './toolkits'; // New function to get tools (see Phase 3)

// ...

async orchestrate(query: string, history: CoreMessage[]) {
    // 1. Classify the intent
    const intent = await classifyAndRouteQuery(query, history);

    // 2. Select tools based on intent
    // This part anticipates Phase 3, where agents become toolkits.
    const requiredTools = getToolkits(intent.requiredToolkits);

    // 3. Instantiate the core agent with the necessary tools
    const agent = new BaseAIAgent({
        tools: requiredTools,
        // Potentially use intent.complexity to choose a more powerful model
        model: intent.complexity === 'complex' ? openai('gpt-4o') : openai('gpt-4o-mini'),
    });

    // 4. Execute the query using the modernized agent core
    const result = await agent.processQuery(query, history);

    return result;
}
```

## 3. Key Architectural Changes

- **Before:** A brittle, keyword-based function (`selectAgents`) that returns a simple agent name.
- **After:** A robust, LLM-based function (`classifyAndRouteQuery`) that returns a rich, structured `Intent` object.
- **Before:** Routing logic is mixed with orchestration logic.
- **After:** Routing is a distinct, self-contained step at the beginning of the orchestration process.

## 4. Verification Strategy

1.  **Unit Testing for `classifyAndRouteQuery`:**
    - Create a test file `router.test.ts`.
    - Mock the `generateObject` function.
    - **Test Case 1 (Data Mutation):** Input: "Create a new task to fix the login bug." Assert that `queryType` is `data_mutation`, `domain` is `tasks`, and `requiredToolkits` includes `taskManager`.
    - **Test Case 2 (Analytical Question):** Input: "Why is the marketing project delayed?" Assert that `queryType` is `analytical_question`, `domain` is `projects`, and `requiredToolkits` includes `projectAnalyzer`.
    - **Test Case 3 (General Conversation):** Input: "Hello, how are you?" Assert that `queryType` is `general_conversation` and `domain` is `general`.
2.  **Integration Testing:**
    - Write a test for the `orchestrate` function that provides a query and asserts that `classifyAndRouteQuery` is called first, and its output is then used to configure the `BaseAIAgent` instance.
