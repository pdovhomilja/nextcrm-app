# AI Board Wizard: Phase 4 - Interactive Refinement Backend

**Objective:** Create the server action to power the live, back-and-forth conversational goal refinement between the user and the AI.

**Prerequisites:**
- [Phase 1: Data Model and Core Generation Tool](Phase1-Data-Model-and-Generation-Tool.md) (for AI toolkit concepts)
- [Phase 3: Conversational UI Implementation](Phase3-Conversational-UI.md) (for frontend context)

## 1. Rationale

The conversational UI built in Phase 3 requires a backend that can intelligently respond to user input, ask relevant questions, and decide when enough information has been gathered. This phase implements that logic by creating a dedicated server action that uses the core AI agent in a specialized "conversational refinement" mode.

## 2. Step-by-Step Implementation Guide

### Step 2.1: Define a Tool for Proposing the Final Brief

We need a way for the AI to signal that the conversation is over and it's ready to propose the final project brief. A dedicated tool is the perfect mechanism for this.

1.  **Navigate to `lib/ai/toolkits/board-wizard-toolkit.ts`**, created in Phase 1.
2.  **Add a new tool** called `proposeFinalBrief` to the `boardWizardToolkit`.

    ```typescript
    // in lib/ai/toolkits/board-wizard-toolkit.ts
    import { z } from 'zod';
    // ... other imports

    export const boardWizardToolkit = {
      proposeFinalBrief: {
        description: 'Call this function when you have gathered enough information from the user to form a clear, actionable project brief. This signals the end of the conversation.',
        parameters: z.object({
          brief: z.string().describe('The final, summarized project brief, written in the second person as a confirmation to the user (e.g., "Okay, so you want to build a mobile app for...").'),
        }),
        execute: async ({ brief }) => {
          // This tool is a signal. It simply returns the brief.
          return { brief };
        },
      },

      generateProjectBoard: {
        // ... existing tool from Phase 1
      },
    };
    ```

### Step 2.2: Create the Refinement Server Action

This is the core server action that will be called by the UI on each turn of the conversation.

1.  **Create a new file** at `actions/tasks/refine-goal-conversation.ts`.
2.  **Implement the server action**. It will take the conversation history, invoke the AI agent, and return the AI's next message.

    ```typescript
    // in actions/tasks/refine-goal-conversation.ts
    'use server';

    import { z } from 'zod';
    import { AgentOrchestrator } from '@/lib/ai/agent-orchestrator';
    import { CoreMessage } from 'ai';

    const RefineGoalSchema = z.object({
      messages: z.array(z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string(),
      })),
    });

    // This is the expected return shape
    export interface RefinementResult {
      isFinalBrief: boolean;
      content: string;
    }

    export async function refineGoalConversation(values: z.infer<typeof RefineGoalSchema>): Promise<RefinementResult> {
      const validatedFields = RefineGoalSchema.safeParse(values);
      if (!validatedFields.success) {
        throw new Error('Invalid input: Invalid message format.');
      }

      const { messages } = validatedFields.data;

      // 1. Define the system prompt for the refinement task
      const systemPrompt = `You are an expert project manager named "Wizard". Your goal is to help a user refine their high-level project idea into a clear, actionable project brief. 
      - Ask one clarifying question at a time. 
      - Keep your questions concise and targeted.
      - After 2-3 questions, or when you have enough information, you MUST call the "proposeFinalBrief" tool to summarize the plan and end the conversation.`;

      // 2. Instantiate and run the orchestrator
      const orchestrator = new AgentOrchestrator();
      const result = await orchestrator.orchestrate(
        messages[messages.length - 1].content, // Pass the latest user message as the "query"
        messages as CoreMessage[], // Pass the full history
        systemPrompt, // Override the default system prompt
        ['boardWizard'] // Ensure the boardWizard toolkit is available
      );

      // 3. Process the result
      if (result.toolCalls?.some(tool => tool.toolName === 'proposeFinalBrief')) {
        // The AI has proposed a final brief
        const finalBrief = result.toolCalls.find(tool => tool.toolName === 'proposeFinalBrief').result.brief;
        return {
          isFinalBrief: true,
          content: finalBrief,
        };
      } else {
        // The AI has generated a text response (a clarifying question)
        return {
          isFinalBrief: false,
          content: result.text,
        };
      }
    }
    ```

### Step 2.3: Update the Agent Orchestrator (Optional but Recommended)

The `orchestrate` method in `agent-orchestrator.ts` may need to be updated to accept an optional `systemPrompt` override and a list of required toolkits to make it more flexible for specialized tasks like this.

**Example modification in `agent-orchestrator.ts`:**

```typescript
// in agent-orchestrator.ts
async orchestrate(
    query: string, 
    history: CoreMessage[],
    systemPromptOverride?: string,
    requiredToolkitsOverride?: string[]
) {
    // 1. Classify the intent (or skip if toolkits are overridden)
    const intent = requiredToolkitsOverride 
        ? { requiredToolkits: requiredToolkitsOverride } 
        : await classifyAndRouteQuery(query, history);

    // 2. Select tools based on intent
    const requiredTools = getToolkits(intent.requiredToolkits);

    // 3. Instantiate the core agent with the necessary tools and system prompt
    const agent = new BaseAIAgent({
        tools: requiredTools,
        systemPrompt: systemPromptOverride, // Pass the override to the agent core
    });

    // 4. Execute the query
    const result = await agent.processQuery(query, history);

    return result;
}
```

## 3. Verification

-   Using a tool like Postman or a simple test script, call the `refineGoalConversation` action with a sample message history.
-   **Test Case 1 (Clarification):** Send an initial goal. Verify the response has `isFinalBrief: false` and `content` contains a question.
-   **Test Case 2 (Final Brief):** Send a history of 2-3 turns. Verify the AI eventually responds with `isFinalBrief: true` and that the `content` is the summarized project brief.
-   Check the server logs to ensure the correct system prompt is being used and the `proposeFinalBrief` tool is being called as expected.
-   Integrate with the frontend from Phase 3 and test the end-to-end conversational flow in the UI.
