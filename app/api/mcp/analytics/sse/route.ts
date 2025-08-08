import { NextRequest } from "next/server";
import { auth } from "@/auth";

// MCP SSE Protocol Headers
const SSE_HEADERS = {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  'Connection': 'keep-alive',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return new Response('Unauthorized', { status: 401 });
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
              type: 'connect',
              server: 'analytics',
              capabilities: {
                tools: {
                  project_health: { description: 'Analyze overall project health and metrics' },
                  task_analytics: { description: 'Generate task completion and performance analytics' },
                  team_productivity: { description: 'Analyze team productivity and workload distribution' },
                  bottleneck_analysis: { description: 'Identify workflow bottlenecks and delays' },
                  progress_forecasting: { description: 'Forecast project completion and milestone dates' },
                  performance_insights: { description: 'Generate performance insights and recommendations' },
                }
              },
              timestamp: new Date().toISOString()
            })}\n\n`
          )
        );

        // Keep connection alive with periodic heartbeat
        const heartbeatInterval = setInterval(async () => {
          try {
            await writer.write(
              new TextEncoder().encode(
                `event: heartbeat\ndata: ${JSON.stringify({
                  type: 'heartbeat',
                  timestamp: new Date().toISOString()
                })}\n\n`
              )
            );
          } catch (error) {
            console.error('SSE heartbeat error:', error);
            clearInterval(heartbeatInterval);
          }
        }, 30000); // 30 second heartbeat

        // Handle disconnect
        request.signal.addEventListener('abort', () => {
          console.log('MCP analytics SSE connection closed');
          clearInterval(heartbeatInterval);
          writer.close();
        });

      } catch (error) {
        console.error('MCP analytics SSE initialization error:', error);
        await writer.write(
          new TextEncoder().encode(
            `event: error\ndata: ${JSON.stringify({
              type: 'error',
              message: 'Failed to initialize MCP analytics connection',
              error: error instanceof Error ? error.message : 'Unknown error'
            })}\n\n`
          )
        );
        writer.close();
      }
    })();

    return response;

  } catch (error) {
    console.error('MCP analytics SSE route error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return new Response('Unauthorized', { status: 401 });
    }

    const body = await request.json();
    const { method, params, id } = body;

    // Handle MCP analytics tool invocations
    let result;
    
    switch (method) {
      case 'project_health':
        result = {
          content: [{
            type: 'text',
            text: JSON.stringify({
              message: 'Project health analysis - placeholder implementation',
              status: 'success',
              note: 'MCP project health analytics tool is now connected via SSE transport',
              params: params,
              analysisType: 'project_health',
              metrics: {
                completionRate: '75%',
                overdueTasks: 3,
                averageCompletionTime: '2.5 days',
                teamVelocity: 'stable'
              },
              timestamp: new Date().toISOString()
            }, null, 2)
          }]
        };
        break;

      case 'task_analytics':
        result = {
          content: [{
            type: 'text',
            text: JSON.stringify({
              message: 'Task analytics - placeholder implementation',
              status: 'success',
              note: 'MCP task analytics tool is now connected via SSE transport',
              params: params,
              analysisType: 'task_analytics',
              metrics: {
                totalTasks: 42,
                completedTasks: 31,
                inProgressTasks: 8,
                blockedTasks: 3
              },
              timestamp: new Date().toISOString()
            }, null, 2)
          }]
        };
        break;

      case 'team_productivity':
        result = {
          content: [{
            type: 'text',
            text: JSON.stringify({
              message: 'Team productivity analysis - placeholder implementation',
              status: 'success',
              note: 'MCP team productivity analytics tool is now connected via SSE transport',
              params: params,
              analysisType: 'team_productivity',
              metrics: {
                teamSize: 5,
                avgTasksPerMember: 8.4,
                productivityTrend: 'increasing',
                workloadBalance: 'good'
              },
              timestamp: new Date().toISOString()
            }, null, 2)
          }]
        };
        break;

      case 'bottleneck_analysis':
        result = {
          content: [{
            type: 'text',
            text: JSON.stringify({
              message: 'Bottleneck analysis - placeholder implementation',
              status: 'success',
              note: 'MCP bottleneck analysis tool is now connected via SSE transport',
              params: params,
              analysisType: 'bottleneck_analysis',
              bottlenecks: [
                { type: 'review_delay', impact: 'high', tasks: 5 },
                { type: 'resource_constraint', impact: 'medium', tasks: 2 }
              ],
              timestamp: new Date().toISOString()
            }, null, 2)
          }]
        };
        break;

      case 'progress_forecasting':
        result = {
          content: [{
            type: 'text',
            text: JSON.stringify({
              message: 'Progress forecasting - placeholder implementation',
              status: 'success',
              note: 'MCP progress forecasting tool is now connected via SSE transport',
              params: params,
              analysisType: 'progress_forecasting',
              forecast: {
                estimatedCompletion: '2024-02-15',
                confidence: '85%',
                milestoneRisk: 'low',
                recommendedActions: ['Increase QA resources', 'Schedule design review']
              },
              timestamp: new Date().toISOString()
            }, null, 2)
          }]
        };
        break;

      case 'performance_insights':
        result = {
          content: [{
            type: 'text',
            text: JSON.stringify({
              message: 'Performance insights - placeholder implementation',
              status: 'success',
              note: 'MCP performance insights tool is now connected via SSE transport',
              params: params,
              analysisType: 'performance_insights',
              insights: [
                'Task completion rate has improved 15% this sprint',
                'Code review cycle time reduced by 1.2 days',
                'Team velocity is stable but could benefit from automation'
              ],
              timestamp: new Date().toISOString()
            }, null, 2)
          }]
        };
        break;

      default:
        result = {
          error: {
            code: -32601,
            message: `Analytics method '${method}' not found`
          }
        };
    }

    return Response.json({
      jsonrpc: '2.0',
      id: id,
      result: result
    });

  } catch (error) {
    console.error('MCP analytics POST error:', error);
    return Response.json({
      jsonrpc: '2.0',
      id: null,
      error: {
        code: -32603,
        message: 'Internal error',
        data: error instanceof Error ? error.message : 'Unknown error'
      }
    });
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}