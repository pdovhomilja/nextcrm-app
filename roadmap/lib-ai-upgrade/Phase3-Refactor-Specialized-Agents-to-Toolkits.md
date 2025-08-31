# Phase 3: Refactor Specialized Agents to Toolkits

**Objective:** Decompose the monolithic, specialized agent classes in `specialized-agents.ts` into passive, composable "toolkits." This change centralizes decision-making in the core agent loop and allows for dynamic combination of capabilities based on the router's intent analysis.

**Parent Document:** [Pre-Implementation Analysis](pre-implementation.md)
**Prerequisites:**

- [Phase 1: Modernize Core Agent Logic](Phase1-Modernize-Core-Agent-Logic.md)
- [Phase 2: Implement Advanced Routing](Phase2-Implement-Advanced-Routing.md)

## 1. Rationale

The current architecture distributes critical decision-making logic across multiple specialized agent classes by overriding the `makeDecision` method. This leads to several problems:

- **Fragmented & Hidden Logic:** It's difficult to understand the agent's complete behavior without inspecting every subclass.
- **Poor Composability:** The system cannot easily combine capabilities from multiple agents (e.g., analyze a project _and then_ create a task) because each agent is a silo.
- **High Maintenance Overhead:** Adding or modifying capabilities requires changing class structures and complex, inherited logic.

This phase resolves these issues by transforming agents into toolkits. A toolkit is simply a collection of related, stateless functions (tools) with clear Zod schemas. This makes our system more modular, predictable, and flexible.

## 2. Step-by-Step Implementation Guide

### Step 2.1: Purge `makeDecision` Overrides

The primary task of this phase is to hunt down and eliminate all specialized decision logic.

1.  **Navigate to `specialized-agents.ts`**.
2.  For each class that extends `BaseAIAgent` (e.g., `ProjectAnalyzerAgent`, `TaskRecommenderAgent`):
    - **Delete the `makeDecision` method override.** Its logic is now obsolete.
    - Identify the core function(s) this agent was designed to perform.

### Step 2.2: Create Toolkits

Refactor the core logic of each specialized agent into a standalone toolkit file.

1.  **Create a `lib/ai/toolkits/` directory.** Inside, create files like `project-toolkit.ts`, `task-toolkit.ts`, etc.
2.  **Extract Logic into Tools:** Move the actual business logic from the agent classes into these new toolkit files, exposing them as tools.

**Example: Refactoring `ProjectAnalyzerAgent`**

- **Before (`specialized-agents.ts`):**

  ```typescript
  class ProjectAnalyzerAgent extends BaseAIAgent {
    // ... constructor ...
    async makeDecision(
      query: string,
      history: CoreMessage[],
    ): Promise<Decision> {
      if (query.toLowerCase().includes("analyze project health")) {
        return {
          action: "use_tools",
          tools: ["analyzeProjectHealth"],
          reasoning: "...",
        };
      }
      return super.makeDecision(query, history);
    }

    // Method containing the actual logic
    private async analyzeProjectHealth(params: any) {
      /* ... */
    }
  }
  ```

- **After (`lib/ai/toolkits/project-toolkit.ts`):**

  ```typescript
  import { z } from "zod";

  // The logic is now a self-contained tool
  export const projectToolkit = {
    analyzeProjectHealth: {
      description:
        "Analyzes the health of a specific project based on metrics like task completion, deadlines, and budget.",
      parameters: z.object({
        projectId: z.string().describe("The ID of the project to analyze."),
      }),
      execute: async ({ projectId }) => {
        console.log(`Analyzing health for project ${projectId}...`);
        // ... The actual analysis logic lives here ...
        const healthReport = {
          status: "At Risk",
          details: "Budget overrun by 15%.",
        };
        return healthReport;
      },
    },
  };
  ```

### Step 2.3: Create a Toolkit Registry

Create a simple mechanism to retrieve toolkits by name. This will be used by the orchestrator to construct the list of tools for the core agent.

```typescript
// in lib/ai/toolkits/index.ts (new file)

import { projectToolkit } from "./project-toolkit";
import { taskToolkit } from "./task-toolkit";
// ... import other toolkits

const allToolkits = {
  projectAnalyzer: projectToolkit,
  taskManager: taskToolkit,
  // ...
};

export function getToolkits(names: (keyof typeof allToolkits)[]) {
  let selectedTools = {};
  for (const name of names) {
    Object.assign(selectedTools, allToolkits[name]);
  }
  return selectedTools;
}
```

### Step 2.4: Update the Orchestrator

The `agent-orchestrator.ts` file, already modified in Phase 2, can now be fully realized.

```typescript
// in agent-orchestrator.ts

// ... imports
import { getToolkits } from './toolkits';

async orchestrate(query: string, history: CoreMessage[]) {
    // 1. Classify intent (from Phase 2)
    const intent = await classifyAndRouteQuery(query, history);

    // 2. Get the required tools using our new registry
    const requiredTools = getToolkits(intent.requiredToolkits);

    // 3. Instantiate the core agent with these tools
    const agent = new BaseAIAgent({ tools: requiredTools });

    // 4. Execute the query
    return agent.processQuery(query, history);
}
```

### Step 2.5: Cleanup

- Delete the now-empty or redundant specialized agent classes from `specialized-agents.ts`.
- The `AgentFactory` is likely no longer needed and can be removed.

## 3. Key Architectural Changes

- **Before:** Active, stateful-like agent classes with overridden, fragmented decision logic.
- **After:** Passive, stateless toolkits that are collections of functions.
- **Before:** Logic is tightly coupled to agent identity.
- **After:** Logic is decoupled into composable tools that can be dynamically combined.
- **Before:** System capabilities are difficult to discover and combine.
- **After:** System capabilities are explicitly defined in toolkits, selected by a router, and executed by a single core agent.

## 4. Verification Strategy

1.  **Unit Testing:** Each toolkit should have its own test file (e.g., `project-toolkit.test.ts`) that verifies the `execute` function of each tool within it.
2.  **Integration Testing:** The most critical tests are end-to-end.
    - **Test Case 1 (Multi-Toolkit Query):**
      - **Input:** "Analyze the 'Mobile App' project and create a high-priority task for the lead developer to address the budget overrun."
      - **Assert:**
        1.  The `Routing` agent correctly identifies `requiredToolkits` as `['projectAnalyzer', 'taskManager']`.
        2.  The `orchestrate` function correctly assembles tools from both toolkits.
        3.  The `streamText` loop in the core agent first calls `analyzeProjectHealth` and then, using the result of that call, calls `createTask` with the correct parameters.
    - This single, comprehensive test validates that all three phases are working together correctly.
