# AI Agent Architecture Modernization: Pre-Implementation Analysis

## 1. Executive Summary

This document outlines a strategic plan to modernize our AI agent architecture, currently implemented in the `lib/ai/` directory. The analysis of the existing code, specifically `agent-core.ts` and `agent-orchestrator.ts`, reveals an early-generation agentic design that, while functional, relies on brittle, hard-coded logic for decision-making and agent selection.

The Vercel AI SDK documentation on modern agentic patterns—such as Routing, Multi-Step Tool Usage, and Sequential Processing—offers a clear path forward. We propose to refactor our architecture to replace the rigid, keyword-driven decision trees with more dynamic, LLM-native patterns.

This upgrade will transition our system from a command-and-control flow to a more autonomous, reasoning-based process. The key changes involve:

1.  **Eliminating hard-coded decision logic** in `agent-core.ts` in favor of a unified, multi-step tool-use loop.
2.  **Replacing simple agent selection** in `agent-orchestrator.ts` with an advanced **Routing** mechanism that classifies user intent.

The outcome will be a more robust, scalable, and intelligent AI system that is easier to maintain and extend, and is better aligned with the state-of-the-art in AI agent design.

## 2. Current Architecture Analysis

Our current AI system is primarily defined by two files: `agent-orchestrator.ts` (the "brain") and `agent-core.ts` (the "nervous system").

### `agent-orchestrator.ts`

- **Role**: Acts as a high-level router, selecting the appropriate specialized agent(s) for a given query. This embodies a classic **Orchestrator-Worker** pattern.
- **Mechanism**: The `selectAgents` function uses `generateObject` to choose a `primaryAgent` and optional `supportingAgents`.
- **Limitations**:
  - **Brittle Fallback**: It relies on a keyword-based `if/else` chain (`queryLower.includes(...)`) as a fallback. This is inflexible and difficult to scale. If the LLM call fails, the routing logic becomes primitive.
  - **Simple Routing**: The selection is a simple choice from a list of agent roles. It doesn't capture deeper user intent, query complexity, or the required operational sequence.

### `agent-core.ts`

- **Role**: The `BaseAIAgent` class provides the core execution logic for all agents. It decides _how_ to handle a query after an agent has been selected.
- **Mechanism**: The `processQuery` method follows a rigid, multi-step process:
  1.  `makeDecision`: An initial LLM call to decide between actions like `respond`, `use_tools`, `request_clarification`.
  2.  `switch (decision.action)`: A large switch statement executes the chosen action.
  3.  `orchestrateTools`: If tools are needed, a _second_ LLM call (`generateText` with `stopWhen`) is made to execute them.
- **Limitations**:
  - **Redundant LLM Calls**: The process often involves at least two separate LLM calls—one to decide, and another to act. This increases latency and cost.
  - **Complex Prompt Engineering**: The `makeDecision` prompt is complex and fragile. It uses manually injected `IMPORTANT:` hints based on keyword matching (`isSearchQuery`, `isUpdateQuery`) to guide the LLM. This is a clear sign that we are forcing a modern LLM to fit an outdated, deterministic workflow.
  - **Pre-emptive Decision Making**: The system tries to decide everything upfront. Modern agentic patterns show that it's more effective to give the LLM a set of tools and a goal, and let it determine the sequence of steps iteratively.

### `specialized-agents.ts`

- **Role**: This file defines concrete implementations of `BaseAIAgent`, creating a roster of specialized workers like `ProjectAnalyzerAgent` and `TaskRecommenderAgent`.
- **Mechanism**: Each specialized agent class extends the base agent and, crucially, **overrides the `makeDecision` method**. This injects domain-specific, keyword-based logic (`if (queryLower.includes('analyze')) ...`) to force the agent to use specific tools for certain queries.
- **Limitations**:
  - **Fragmented Logic**: The practice of overriding `makeDecision` scatters the system's core routing and decision-making logic across multiple files and classes. This makes it difficult to get a holistic view of the agent's behavior and introduces maintenance overhead.
  - **Code Duplication**: Each override repeats a similar pattern of keyword checking, which is a form of code duplication that makes the system more brittle.
  - **Limited Composability**: Because the specialized logic is baked into the agent's decision-making process, it's difficult to combine the capabilities of multiple agents for a complex query.

## 3. Proposed Modernization with Vercel AI SDK Patterns

We will refactor the architecture to adopt patterns described in the Vercel AI SDK documentation, moving from explicit conditional logic to implicit, LLM-driven reasoning.

### A. Refactoring `agent-orchestrator.ts` with the `Routing` Pattern

Instead of simply selecting an agent, we will implement the **`Routing`** pattern to perform a more sophisticated classification of the user's query.

- **Proposed Change**: The `selectAgents` function will be replaced with a `classifyAndRouteQuery` function.
- **New Mechanism**:
  1.  This function will use `generateObject` to extract a structured "Intent" object from the query.
  2.  This `Intent` object will be richer than the current output. Instead of just a `primaryAgent`, it will classify the query along several axes:
      ```typescript
      // Example Intent Schema
      const IntentSchema = z.object({
        queryType: z.enum([
          "data_retrieval",
          "data_mutation",
          "analytical_question",
          "general_conversation",
        ]),
        domain: z.enum(["tasks", "projects", "users", "metrics"]),
        complexity: z.enum(["simple", "complex", "multi_step"]),
        requiredAgents: z.array(
          z.enum(["analyzer", "recommender", "tracker", "optimizer"])
        ),
        reasoning: z.string(),
      });
      ```
  3.  The output of this classification will then be used to dynamically select and configure the necessary agent(s), potentially even selecting different models (`gpt-4o-mini` for simple queries, `gpt-4o` for complex ones) as shown in the AI SDK documentation.
- **Benefit**: This eliminates the brittle keyword-based fallback and provides a much richer contextual foundation for the subsequent processing steps.

### B. Refactoring `agent-core.ts` with `Multi-Step Tool Usage`

We will simplify the core agent logic by removing the `makeDecision` step and fully embracing the iterative, agentic loop provided by `generateText` with `stopWhen`.

- **Proposed Change**: The `processQuery` method in `BaseAIAgent` will be radically simplified. The explicit `makeDecision` call and the subsequent `switch` statement will be removed.
- **New Mechanism**:
  1.  The `processQuery` method will make a **single, primary call** to `generateText` (or `streamText`).
  2.  All capabilities—database tools, RAG lookups, clarification requests—will be provided as `tools` to this call.
      - A `rag_search` tool will perform RAG lookups.
      - A `request_clarification` tool will allow the LLM to ask the user a question.
  3.  The complex logic currently in the `makeDecision` prompt will be moved into the `system` prompt of the `generateText` call. This allows the LLM to use its reasoning capabilities to decide which tool to use, or whether to respond directly, at each step of the iterative process.
  4.  The `stopWhen` condition will manage the lifecycle of the interaction, ending when the LLM generates a text response instead of a tool call.

- **Benefit**:
  - **Reduced Complexity**: Eliminates the need for a state machine (`switch` statement) in our code.
  - **Improved Performance**: Reduces latency and cost by consolidating multiple LLM calls into a single, iterative agentic loop.
  - **Increased Intelligence**: Fully leverages the LLM's ability to reason and plan multi-step tasks (e.g., "first, find the task with `search_tasks`, then update it with `update_task`"). This removes our brittle prompt injections for sequential tasks.

### C. Refactoring `specialized-agents.ts` from Agents to Toolkits

- **Proposed Change**: The specialized agent classes (`ProjectAnalyzerAgent`, etc.) will be refactored from being active, decision-making entities into passive "toolkits" that simply provide their unique capabilities to the core agent.
- **New Mechanism**:
  1.  The `makeDecision` method overrides will be completely removed from all specialized agent classes. Their only responsibility will be to house the logic for their specific domain.
  2.  The core functionality of each class (e.g., `analyzeProjectHealth`) will be exposed as a discrete, composable tool that can be called by the main agent loop.
  3.  The `Routing` agent will identify which specialized capabilities (now tools) are required for a query, and the core agent will execute them as part of its `Multi-Step Tool Usage` loop.
- **Benefit**:
  - **Centralized Control**: Decision-making logic is no longer fragmented across multiple agent classes. It is centralized in the `Routing` agent and the main agent's reasoning loop.
  - **Enhanced Composability**: This change transforms monolithic agents into a library of callable functions (tools). The system can now dynamically combine capabilities to answer complex, multi-domain queries (e.g., "Analyze project health _and then_ recommend a task to fix the biggest problem").
  - **Simplified Maintenance**: Adding new specialized capabilities becomes a matter of adding a new tool/function, not a new class with custom, hard-coded decision rules.

## 4. Detailed Analysis of Conditional Logic Blocks

The proposed modernization directly targets and eliminates numerous `if/else` and `switch` blocks that contribute to the current system's rigidity. Here is a file-by-file breakdown of the key conditional logic blocks and how the new architecture will improve them.

#### `agent-orchestrator.ts`

- **Function**: `selectAgents`
  - **Logic**: `if/else if` chain for keyword-based fallback routing.
  - **Problem**: Brittle, not scalable, and disconnected from the LLM's reasoning capabilities.
  - **Resolution**: The **`Routing`** pattern will replace this entirely. An LLM call with a rich `IntentSchema` will classify the query's type, domain, and complexity, making manual keyword matching obsolete.

- **Function**: `orchestrate`
  - **Logic**: `if (multiAgentMode ...)` to decide between single vs. multi-agent processing.
  - **Problem**: The decision is based on a simple boolean flag.
  - **Resolution**: The new `Routing` agent's output will determine if multiple capabilities (and thus, agents or tools) are needed. The logic will be driven by a more intelligent, context-aware classification.

#### `agent-core.ts`

- **Function**: `processQuery`
  - **Logic**: The main `switch (decision.action)` block.
  - **Problem**: This creates a rigid, multi-step process with redundant LLM calls (one to decide, one to act).
  - **Resolution**: This entire block will be removed and replaced by the **`Multi-Step Tool Usage`** pattern. A single agentic loop will allow the LLM to iteratively decide whether to call a tool or respond, collapsing the decision and action steps.

- **Function**: `prepareToolParams`
  - **Logic**: `switch (method)` to prepare parameters for different tools.
  - **Problem**: This function manually performs logic (e.g., extracting a search term from a sentence) that the LLM is perfectly capable of doing.
  - **Resolution**: This function will be eliminated. In the new pattern, the LLM will be given the tool's Zod schema and will be responsible for generating the correct parameters directly from the user's query and conversation context.

- **Function**: `determineContextType`
  - **Logic**: `if/else if` chain to categorize a query based on keywords.
  - **Problem**: Another example of brittle, hard-coded classification logic.
  - **Resolution**: This will be absorbed into the new **`Routing`** agent's responsibilities. The router will determine the query's domain and context as part of its structured output.

#### `specialized-agents.ts`

- **Function**: `makeDecision` (in `ProjectAnalyzerAgent`, `TaskRecommenderAgent`)
  - **Logic**: `if` statements that override the base agent's decision logic based on keywords.
  - **Problem**: Distributes decision-making logic across multiple classes, making the system's behavior harder to predict and maintain.
  - **Resolution**: These overrides will be removed. The specialized logic of these agents will be exposed as discrete tools (e.g., a `project_health_analysis` tool). The `Routing` agent will determine which tools are relevant, and the primary agent loop will execute them. This centralizes control and makes specialized capabilities composable.

- **Function**: `AgentFactory.getAgent`
  - **Logic**: `switch (agentType)`
  - **Problem**: None. This is a standard and appropriate use of a switch statement for a factory pattern.
  - **Resolution**: This logic will be retained as it is not part of the agentic reasoning flow.

## 5. High-Level Implementation Plan

1.  **Phase 1: Modernize `BaseAIAgent` (`agent-core.ts`)**
    - Refactor `processQuery` to remove the `makeDecision` -> `switch` flow.
    - Implement the new single-loop `generateText` logic.
    - Adapt RAG and other capabilities to be exposed as tools within this loop.
    - Update `orchestrateTools` to be the central part of the new `processQuery`.

2.  **Phase 2: Implement Advanced Routing (`agent-orchestrator.ts`)**
    - Replace `selectAgents` with the new `classifyAndRouteQuery` function using a richer Zod schema for intent classification.
    - Update the `orchestrate` method to use the new routing output to drive the modernized `BaseAIAgent`.

3.  **Phase 3: Update Specialized Agents**
    - Review and update the `specialized-agents.ts` to ensure their capabilities and prompts align with the new, simpler, and more powerful core architecture. Most of their logic should now be expressible in their system prompts and the tools they have access to.

4.  **Note on Dependencies**: During implementation, it was discovered that toolkits must not directly import any singleton MCP client pool that the MCP server routes also use for registration. This creates a circular dependency and race condition in the Next.js App Router. The correct pattern is for toolkits to use a separate, simple MCP client (like `simpleMCPClientPool`) that makes direct `fetch` requests to the API endpoints, ensuring the client is fully decoupled from the server initialization process.

This phased approach ensures a controlled migration, allowing us to validate each major architectural change before proceeding to the next.
