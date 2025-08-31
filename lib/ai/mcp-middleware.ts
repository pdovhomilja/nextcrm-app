import { NextRequest } from "next/server";
import { mcpAuthService, MCPAuthContext } from "./mcp-auth";

export interface MCPRequestHandler {
  (request: NextRequest, context: MCPAuthContext): Promise<Response>;
}

/**
 * MCP Authentication Middleware
 * Handles authentication for all MCP endpoint requests
 */
export function withMCPAuth(
  handler: MCPRequestHandler,
  requiredPermissions: string[] = ["read"],
) {
  return async (request: NextRequest): Promise<Response> => {
    try {
      // Step 1: Authenticate the request
      const incomingToken = request.headers.get("X-MCP-Internal-Token");
      console.log("MCP Auth - Incoming request headers:", {
        "X-MCP-Service": request.headers.get("X-MCP-Service"),
        "X-MCP-Internal-Token": incomingToken
          ? `present (${incomingToken.substring(0, 8)}...)`
          : "missing",
        "X-MCP-User-ID": request.headers.get("X-MCP-User-ID"),
        "X-MCP-Company-ID": request.headers.get("X-MCP-Company-ID"),
        tokenLength: incomingToken?.length,
      });

      const authResult = await mcpAuthService.authenticateRequest(request);

      console.log("MCP Auth Result:", {
        success: authResult.success,
        error: authResult.error,
        contextUserId: authResult.context?.userId,
      });

      if (!authResult.success) {
        console.log("MCP Auth failed, returning error response");
        return Response.json({
          jsonrpc: "2.0",
          id: null,
          error: authResult.error,
        });
      }

      // Step 2: Validate permissions
      const permissionCheck = mcpAuthService.validatePermissions(
        authResult.context!,
        requiredPermissions,
      );

      if (!permissionCheck.allowed) {
        return Response.json({
          jsonrpc: "2.0",
          id: null,
          error: {
            code: -32002,
            message: "Insufficient permissions",
            data: permissionCheck.reason,
          },
        });
      }

      // Step 3: Call the actual handler with authenticated context
      // Let the handler parse the request body to avoid "body already read" errors
      return await handler(request, authResult.context!);
    } catch (error) {
      console.error("MCP middleware error:", error);

      return Response.json({
        jsonrpc: "2.0",
        id: null,
        error: {
          code: -32603,
          message: "Internal server error",
          data: error instanceof Error ? error.message : "Unknown error",
        },
      });
    }
  };
}

/**
 * MCP JSON-RPC Response Helper
 */
export class MCPResponse {
  static success(id: string | number | null, result: unknown): Response {
    return Response.json({
      jsonrpc: "2.0",
      id,
      result,
    });
  }

  static error(
    id: string | number | null,
    code: number,
    message: string,
    data?: unknown,
  ): Response {
    return Response.json({
      jsonrpc: "2.0",
      id,
      error: {
        code,
        message,
        data,
      },
    });
  }

  static methodNotFound(
    id: string | number | null,
    method: string,
    availableMethods: string[],
  ): Response {
    return Response.json({
      jsonrpc: "2.0",
      id,
      error: {
        code: -32601,
        message: `Method '${method}' not found`,
        data: `Available methods: ${availableMethods.join(", ")}`,
      },
    });
  }

  static invalidParams(
    id: string | number | null,
    validationErrors: unknown[],
  ): Response {
    return Response.json({
      jsonrpc: "2.0",
      id,
      error: {
        code: -32602,
        message: "Invalid parameters",
        data: validationErrors,
      },
    });
  }

  static unauthorized(message = "Unauthorized"): Response {
    return Response.json({
      jsonrpc: "2.0",
      id: null,
      error: {
        code: -32001,
        message,
      },
    });
  }

  static forbidden(message = "Forbidden - insufficient permissions"): Response {
    return Response.json({
      jsonrpc: "2.0",
      id: null,
      error: {
        code: -32002,
        message,
      },
    });
  }
}

/**
 * MCP Method Router
 * Routes JSON-RPC method calls to appropriate handlers
 */
export class MCPMethodRouter {
  private methods: Map<
    string,
    (params: unknown, context: MCPAuthContext) => Promise<unknown>
  > = new Map();

  /**
   * Register a method handler
   */
  register(
    method: string,
    handler: (params: unknown, context: MCPAuthContext) => Promise<unknown>,
  ): void {
    this.methods.set(method, handler);
  }

  /**
   * Execute a method
   */
  async execute(
    method: string,
    params: unknown,
    context: MCPAuthContext,
  ): Promise<unknown> {
    const handler = this.methods.get(method);

    if (!handler) {
      throw new Error(`Method '${method}' not found`);
    }

    return await handler(params, context);
  }

  /**
   * Get all registered method names
   */
  getAvailableMethods(): string[] {
    return Array.from(this.methods.keys());
  }

  /**
   * Check if method exists
   */
  hasMethod(method: string): boolean {
    return this.methods.has(method);
  }
}

/**
 * Create standardized MCP endpoint handler
 */
export function createMCPHandler(
  router: MCPMethodRouter,
  requiredPermissions: string[] = ["read"],
) {
  const handler: MCPRequestHandler = async (request, context) => {
    try {
      // Handle GET requests (SSE connection establishment)
      if (request.method === "GET") {
        return handleSSEConnection(context);
      }

      // Handle POST requests (JSON-RPC method calls)
      if (request.method === "POST") {
        const body = await request.json();
        const { method, params: methodParams, id } = body;

        if (!method) {
          return MCPResponse.error(
            id,
            -32600,
            "Invalid Request - method field required",
          );
        }

        if (!router.hasMethod(method)) {
          return MCPResponse.methodNotFound(
            id,
            method,
            router.getAvailableMethods(),
          );
        }

        console.log(`MCP Handler - Executing method ${method} with context:`, {
          userId: context.userId,
          companyId: context.companyId,
          params: methodParams,
        });

        const result = await router.execute(
          method,
          methodParams || {},
          context,
        );

        console.log(`MCP Handler - Method ${method} execution completed:`, {
          success: true,
          resultType: typeof result,
        });

        return MCPResponse.success(id, result);
      }

      // Handle OPTIONS requests (CORS)
      if (request.method === "OPTIONS") {
        return new Response(null, {
          status: 200,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers":
              "Content-Type, Authorization, X-MCP-Service, X-MCP-Internal-Token",
          },
        });
      }

      return MCPResponse.error(
        null,
        -32601,
        `Method ${request.method} not allowed`,
      );
    } catch (error) {
      console.error("MCP handler error:", error);
      return MCPResponse.error(
        null,
        -32603,
        "Internal server error",
        error instanceof Error ? error.message : "Unknown error",
      );
    }
  };

  return withMCPAuth(handler, requiredPermissions);
}

/**
 * Handle SSE connection establishment
 */
async function handleSSEConnection(context: MCPAuthContext): Promise<Response> {
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();

  // Send SSE headers
  const response = new Response(readable, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });

  // Initialize SSE connection
  (async () => {
    try {
      // Send connection established event
      await writer.write(
        new TextEncoder().encode(
          `event: connect\ndata: ${JSON.stringify({
            type: "connect",
            user: {
              id: context.userId,
              companyId: context.companyId,
              role: context.role,
            },
            capabilities: {
              authenticated: true,
              permissions: ["read", "write"],
            },
            timestamp: new Date().toISOString(),
          })}\n\n`,
        ),
      );

      // Keep connection alive with periodic heartbeat
      const heartbeatInterval = setInterval(async () => {
        try {
          await writer.write(
            new TextEncoder().encode(
              `event: heartbeat\ndata: ${JSON.stringify({
                type: "heartbeat",
                timestamp: new Date().toISOString(),
                userId: context.userId,
              })}\n\n`,
            ),
          );
        } catch (error) {
          console.error("SSE heartbeat error:", error);
          clearInterval(heartbeatInterval);
        }
      }, 30000); // 30 second heartbeat

      // Handle disconnect
      // Note: In a real implementation, you'd handle client disconnect events
    } catch (error) {
      console.error("SSE initialization error:", error);
      await writer.write(
        new TextEncoder().encode(
          `event: error\ndata: ${JSON.stringify({
            type: "error",
            message: "Failed to initialize connection",
            error: error instanceof Error ? error.message : "Unknown error",
          })}\n\n`,
        ),
      );
      writer.close();
    }
  })();

  return response;
}
