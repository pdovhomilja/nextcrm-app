import { NextRequest } from "next/server";
import { auth } from "@/auth";

// MCP SSE Protocol Headers
const SSE_HEADERS = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache",
  Connection: "keep-alive",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();

    // Send SSE headers
    const response = new Response(readable, {
      status: 200,
      headers: SSE_HEADERS,
    });

    // Initialize MCP SSE connection
    (async () => {
      try {
        // Send connection established event
        await writer.write(
          new TextEncoder().encode(
            `event: connect\ndata: ${JSON.stringify({
              type: "connect",
              server: "boards",
              capabilities: {
                tools: {
                  create_board: { description: "Create a new project board" },
                  update_board: {
                    description: "Update board details and configuration",
                  },
                  delete_board: { description: "Delete a project board" },
                  get_boards: {
                    description: "Get all boards for the current user/company",
                  },
                  create_board_section: {
                    description: "Create a new section in a board",
                  },
                  update_board_section: {
                    description: "Update board section details",
                  },
                  delete_board_section: {
                    description: "Delete a board section",
                  },
                  reorder_sections: { description: "Reorder board sections" },
                  board_permissions: {
                    description: "Manage board access and permissions",
                  },
                },
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
                })}\n\n`,
              ),
            );
          } catch (error) {
            console.error("SSE heartbeat error:", error);
            clearInterval(heartbeatInterval);
          }
        }, 30000); // 30 second heartbeat

        // Handle disconnect
        request.signal.addEventListener("abort", () => {
          console.log("MCP boards SSE connection closed");
          clearInterval(heartbeatInterval);
          writer.close();
        });
      } catch (error) {
        console.error("MCP boards SSE initialization error:", error);
        await writer.write(
          new TextEncoder().encode(
            `event: error\ndata: ${JSON.stringify({
              type: "error",
              message: "Failed to initialize MCP boards connection",
              error: error instanceof Error ? error.message : "Unknown error",
            })}\n\n`,
          ),
        );
        writer.close();
      }
    })();

    return response;
  } catch (error) {
    console.error("MCP boards SSE route error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return new Response("Unauthorized", { status: 401 });
    }

    const body = await request.json();
    const { method, params, id } = body;

    // Handle MCP board management tool invocations
    let result;

    switch (method) {
      case "create_board":
        result = {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  message:
                    "Board creation functionality - placeholder implementation",
                  status: "success",
                  note: "MCP board creation tool is now connected via SSE transport",
                  params: params,
                  operation: "create_board",
                  boardId: `board_${Date.now()}`,
                  timestamp: new Date().toISOString(),
                },
                null,
                2,
              ),
            },
          ],
        };
        break;

      case "update_board":
        result = {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  message:
                    "Board update functionality - placeholder implementation",
                  status: "success",
                  note: "MCP board update tool is now connected via SSE transport",
                  params: params,
                  operation: "update_board",
                  timestamp: new Date().toISOString(),
                },
                null,
                2,
              ),
            },
          ],
        };
        break;

      case "delete_board":
        result = {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  message:
                    "Board deletion functionality - placeholder implementation",
                  status: "success",
                  note: "MCP board deletion tool is now connected via SSE transport",
                  params: params,
                  operation: "delete_board",
                  timestamp: new Date().toISOString(),
                },
                null,
                2,
              ),
            },
          ],
        };
        break;

      case "get_boards":
        result = {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  message:
                    "Board retrieval functionality - placeholder implementation",
                  status: "success",
                  note: "MCP board retrieval tool is now connected via SSE transport",
                  params: params,
                  operation: "get_boards",
                  boards: [
                    { id: "board_1", name: "Project Alpha", taskCount: 15 },
                    { id: "board_2", name: "Marketing Campaign", taskCount: 8 },
                  ],
                  timestamp: new Date().toISOString(),
                },
                null,
                2,
              ),
            },
          ],
        };
        break;

      case "create_board_section":
        result = {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  message:
                    "Board section creation functionality - placeholder implementation",
                  status: "success",
                  note: "MCP board section creation tool is now connected via SSE transport",
                  params: params,
                  operation: "create_board_section",
                  sectionId: `section_${Date.now()}`,
                  timestamp: new Date().toISOString(),
                },
                null,
                2,
              ),
            },
          ],
        };
        break;

      case "update_board_section":
        result = {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  message:
                    "Board section update functionality - placeholder implementation",
                  status: "success",
                  note: "MCP board section update tool is now connected via SSE transport",
                  params: params,
                  operation: "update_board_section",
                  timestamp: new Date().toISOString(),
                },
                null,
                2,
              ),
            },
          ],
        };
        break;

      case "delete_board_section":
        result = {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  message:
                    "Board section deletion functionality - placeholder implementation",
                  status: "success",
                  note: "MCP board section deletion tool is now connected via SSE transport",
                  params: params,
                  operation: "delete_board_section",
                  timestamp: new Date().toISOString(),
                },
                null,
                2,
              ),
            },
          ],
        };
        break;

      case "reorder_sections":
        result = {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  message:
                    "Board section reordering functionality - placeholder implementation",
                  status: "success",
                  note: "MCP board section reordering tool is now connected via SSE transport",
                  params: params,
                  operation: "reorder_sections",
                  timestamp: new Date().toISOString(),
                },
                null,
                2,
              ),
            },
          ],
        };
        break;

      case "board_permissions":
        result = {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  message:
                    "Board permissions management functionality - placeholder implementation",
                  status: "success",
                  note: "MCP board permissions tool is now connected via SSE transport",
                  params: params,
                  operation: "board_permissions",
                  currentPermissions: ["view", "edit", "manage"],
                  timestamp: new Date().toISOString(),
                },
                null,
                2,
              ),
            },
          ],
        };
        break;

      default:
        result = {
          error: {
            code: -32601,
            message: `Board method '${method}' not found`,
          },
        };
    }

    return Response.json({
      jsonrpc: "2.0",
      id: id,
      result: result,
    });
  } catch (error) {
    console.error("MCP boards POST error:", error);
    return Response.json({
      jsonrpc: "2.0",
      id: null,
      error: {
        code: -32603,
        message: "Internal error",
        data: error instanceof Error ? error.message : "Unknown error",
      },
    });
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
