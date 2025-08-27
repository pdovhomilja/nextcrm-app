# Phase 4: Model Context Protocol (MCP) Server Modernization Plan

## 1. Executive Summary

This document outlines a strategic plan to modernize our Model Context Protocol (MCP) servers, currently implemented in the `app/api/mcp/` directory. The analysis of the existing MCP implementation reveals a disconnect between its structure and the newly refactored, toolkit-based AI agent architecture.

The current MCP servers are monolithic, defining multiple, broad capabilities within a single route. As described in the official **Model Context Protocol SDK documentation**, the protocol is fundamentally designed around exposing discrete, callable `tools`. Our current implementation groups unrelated tools, which contradicts this granular, single-purpose philosophy.

The proposed modernization will refactor these monolithic MCP servers into a collection of discrete, single-purpose API routes, each with its own `[transport]` handler. This change will create a cleaner, more scalable, and more maintainable architecture that perfectly aligns with both the new AI agent's "toolkit" design and the core principles of the MCP.

Key changes involve:

1.  **Decomposition**: Breaking down large, multi-purpose MCP servers (like `tasks/[transport]/route.ts`) into smaller, single-purpose tool directories (e.g., `tasks/create/[transport]/route.ts`).
2.  **Architectural Clarity**: Ensuring a one-to-one mapping between an AI tool and a dedicated MCP route, making the system's capabilities explicit in the file structure.
3.  **Standardization**: Simplifying the MCP server definitions to use the more direct `createMcprRouter` pattern, which is better suited for exposing a single, well-defined function.

## 2. Current MCP Architecture Analysis

Our current MCP implementation is spread across several directories. The core logic is inconsistent, with some services defined in a simple `route.ts` and others in a more complex `[transport]/route.ts`.

### Key Observations:

- **Monolithic Servers**: Files like `app/api/mcp/tasks/[transport]/route.ts` are prime examples of the old architecture. This single file defines three distinct, complex tools: `create_task`, `search_tasks`, and `update_task`. This approach is difficult to maintain and debug, and it creates a tight coupling between unrelated functionalities.
- **Inconsistent Structure**: The `analytics` and `search` servers use a clean, straightforward `createMcprRouter` approach in their root `route.ts` files. This is a good pattern. In contrast, the `tasks` and `boards` servers use a more verbose `createMcpHandler` in a nested `[transport]` directory. This inconsistency makes the architecture harder to understand.
- **Misalignment with AI Agent**: The new AI agent is designed around the concept of granular, composable tools (e.g., `analyzeProjectHealth`, `generateTaskRecommendations`). It expects to call a specific tool for a specific job. The monolithic MCP servers do not align with this model. For example, to use the `create_task` tool, the agent must know to call the generic "tasks" server, which is an unnecessary layer of indirection.

## 3. Alignment with Official MCP Documentation

The proposed modernization plan is strongly supported by the official MCP documentation. The documentation emphasizes a server architecture built around discrete, well-defined tools.

- **Emphasis on Tools**: The primary method for defining server capabilities is `server.tool(...)`. This highlights that the protocol is designed for a collection of individual, callable functions, not large, multi-purpose endpoints.
- **Schema-Defined Inputs**: The documentation shows that each tool should have a clear Zod schema for its parameters. Our plan to decompose the servers will naturally lead to smaller, more focused Zod schemas for each route, improving type safety and making it easier for the AI to generate valid requests.
- **Architectural Flexibility**: While the documentation provides the building blocks, the arrangement of those blocks is an architectural decision. Our plan applies the **Single Responsibility Principle** to the MCP server design, which is a best practice for creating maintainable and scalable systems.

By moving to a model where one tool equals one route, we are creating a more explicit and discoverable API that is a direct reflection of the AI's capabilities.

## 4. Proposed Modernization Plan

The goal of this refactoring is to create a one-to-one mapping between the AI's tools and the MCP's API endpoints, while fully respecting the `[transport]` requirement of the MCP specification.

### Visual Comparison of the File Structure

**Current Monolithic Structure:**

```
app/api/mcp/
└── tasks/
    └── [transport]/
        └── route.ts  // Defines create_task, search_tasks, update_task
```

**Proposed Decomposed Structure:**

```
app/api/mcp/
└── tasks/
    ├── create/
    │   └── [transport]/
    │       └── route.ts  // Defines only create_task
    ├── search/
    │   └── [transport]/
    │       └── route.ts  // Defines only search_tasks
    └── update/
        └── [transport]/
            └── route.ts  // Defines only update_task
```

### High-Level Plan:

1.  **Decompose the `tasks` Server**:
    - Delete the monolithic `app/api/mcp/tasks/[transport]/route.ts`.
    - Create three new, single-purpose directories: `create`, `search`, and `update`.
    - Inside each of these new directories, create a `[transport]/route.ts` file that implements the MCP logic for that single tool.
    - Each of these new routes will use the clean `createMcprRouter` pattern.

2.  **Decompose the `boards` Server**:
    - Apply the same decomposition pattern to the `boards` server.

3.  **Standardize All Servers**:
    - Ensure that all MCP routes, both old and new, follow the standardized `createMcprRouter` pattern for consistency.

4.  **Update the `simpleMCPClient`**:
    - The `simpleMCPClientPool` will be updated to call these new, more granular endpoints (e.g., `api/mcp/tasks/create`).

### Example of a Decomposed Route:

```typescript
// app/api/mcp/tasks/create/[transport]/route.ts
import { createMcprRouter } from "@vercel/mcp-adapter";
import { createTaskAction } from "@/actions/tasks/create-task";

const mcprRouter = createMcprRouter({
  tasks: {
    create_task: createTaskAction,
  },
});

export const POST = mcprRouter.handler;
```

This clarified structure is fully compliant with the MCP specification, but it is also more modular, readable, and better aligned with our modernized AI agent.

## 5. Future Considerations

This new, modular architecture makes it easier to adopt advanced MCP features in the future.

- **Elicitation**: The documentation describes a feature called "Elicitation," where a tool can request more information from the user. With our new design, we could create a dedicated `api/mcp/tasks/elicit-creation-details` route to handle this, without complicating the standard `create` route.
- **Tool Discovery**: A decomposed architecture makes it straightforward to implement a discovery endpoint (`api/mcp/discover`) that can programmatically list all available tools by inspecting the file system, providing a manifest of the AI's capabilities.
- **Authentication & Authorization**: Applying specific security policies to individual tools (e.g., only admins can use a `delete_user` tool) becomes much easier when each tool has its own dedicated API route.
