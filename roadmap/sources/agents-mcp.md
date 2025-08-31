Vercel MCP adapter

<https://github.com/vercel/mcp-adapter>

<https://www.npmjs.com/package/mcp-handler>

MCP TypeScript SDK

<https://github.com/modelcontextprotocol/typescript-sdk/tree/main?tab=readme-ov-file#server>

MCP with Next.JS

<https://vercel.com/templates/next.js/model-context-protocol-mcp-with-next-js>

Vercel AI SDK

Agents

<https://ai-sdk.dev/docs/foundations/agents>

---

## How-to Guide

### Vercel MCP Adapter & MCP Handler

The `mcp-handler` is a Vercel adapter for the Model Context Protocol (MCP). It's designed for real-time communication between applications and AI models. It supports Next.js and allows you to create an MCP server, define tools for the AI, and implement authorization.

#### Create an MCP Server in Next.js

1.  **Install the package:**

    ```bash
    npm install mcp-handler
    ```

2.  **Create an API route** (e.g., `app/api/mcp/route.ts`):

    ```typescript
    import { createMcpHandler } from "mcp-handler";
    import { vercelMcpAdapter } from "mcp-handler/vercel-adapter";
    import { z } from "zod";

    const handler = createMcpHandler({
      adapter: vercelMcpAdapter,
      // Optional: Add authorization
      // authorize: async ({ req }) => { /* ... */ },
      tools: {
        getWeather: {
          description: "Get the weather for a location",
          parameters: z.object({
            location: z.string(),
          }),
          run: async function* ({ location }) {
            yield { status: "running" };
            // Your tool logic here
            return { temp: Math.random() * 100 };
          },
        },
      },
    });

    export const GET = handler;
    export const POST = handler;
    ```

### Vercel AI SDK - Agents

The Vercel AI SDK provides patterns for building AI agents.

#### Agent Patterns

- **Sequential Processing (Chains):** For tasks with a defined order.
- **Routing:** The model chooses the next step.
- **Parallel Processing:** For independent tasks.
- **Orchestrator-Worker:** A main model coordinates specialized models.
- **Evaluator-Optimizer:** For quality control and feedback.
- **Multi-Step Tool Usage:** Iteratively use tools to solve problems.

#### Use the AI SDK with an Agent

```typescript
import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";

async function myAgent(prompt: string) {
  const result = await streamText({
    model: openai("gpt-4-turbo"),
    prompt,
    // Corresponds to tools in the MCP handler
    tools: {
      // ...
    },
  });

  return result.toAIStream();
}
```

### Combining MCP and AI SDK Agents

The client-side app communicates with the MCP endpoint. The MCP handler invokes the AI SDK agent with the user's prompt. The agent uses the tools provided by the MCP handler, and the results are streamed back to the client.
