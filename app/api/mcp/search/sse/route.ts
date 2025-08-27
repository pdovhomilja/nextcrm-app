/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { getUserByEmail } from "@/actions/user";
import { ragProcessor } from "@/lib/ai/rag-processor";
import { embeddingStorageService } from "@/lib/ai/embedding-storage";
import { embeddingService } from "@/lib/ai/embedding-service";
import db from "@/lib/db";
import { z } from 'zod/v3';

// MCP SSE Protocol Headers
const SSE_HEADERS = {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  'Connection': 'keep-alive',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Validation schemas for MCP search tool parameters
const SemanticSearchSchema = z.object({
  query: z.string().min(1, "Search query is required"),
  limit: z.number().min(1).max(50).optional().default(10),
  minSimilarity: z.number().min(0).max(1).optional().default(0.7),
  boardId: z.string().optional(),
  includeContext: z.boolean().optional().default(true),
});

const VectorSearchSchema = z.object({
  embedding: z.array(z.number()).optional(),
  query: z.string().optional(),
  limit: z.number().min(1).max(50).optional().default(10),
  minSimilarity: z.number().min(0).max(1).optional().default(0.7),
  boardId: z.string().optional(),
});

const KeywordSearchSchema = z.object({
  query: z.string().min(1, "Search query is required"),
  fields: z.array(z.enum(['title', 'description', 'content'])).optional().default(['title', 'description']),
  boardId: z.string().optional(),
  status: z.enum(['NEW', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'ON_HOLD']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  limit: z.number().min(1).max(100).optional().default(20),
});

const SearchHistorySchema = z.object({
  userId: z.string().optional(),
  limit: z.number().min(1).max(100).optional().default(20),
  searchType: z.enum(['semantic', 'vector', 'keyword', 'contextual']).optional(),
});

const ContextualSearchSchema = z.object({
  query: z.string().min(1, "Search query is required"),
  boardId: z.string().optional(),
  taskId: z.string().optional(),
  contextType: z.enum(['general', 'task_specific', 'board_analysis', 'recommendation']).optional(),
  useRAG: z.boolean().optional().default(true),
  maxOutputTokens: z.number().min(100).max(16000).optional().default(8000),
});

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
              server: 'search',
              capabilities: {
                tools: {
                  semantic_search: { description: 'Perform semantic search across tasks and content' },
                  vector_search: { description: 'Vector-based similarity search' },
                  keyword_search: { description: 'Traditional keyword-based search' },
                  search_history: { description: 'Search through conversation and task history' },
                  contextual_search: { description: 'Context-aware search with RAG integration' },
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
          console.log('MCP search SSE connection closed');
          clearInterval(heartbeatInterval);
          writer.close();
        });

      } catch (error) {
        console.error('MCP search SSE initialization error:', error);
        await writer.write(
          new TextEncoder().encode(
            `event: error\ndata: ${JSON.stringify({
              type: 'error',
              message: 'Failed to initialize MCP search connection',
              error: error instanceof Error ? error.message : 'Unknown error'
            })}\n\n`
          )
        );
        writer.close();
      }
    })();

    return response;

  } catch (error) {
    console.error('MCP search SSE route error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.email) {
      return Response.json({
        jsonrpc: '2.0',
        id: null,
        error: { code: -32001, message: 'Unauthorized - user session required' }
      });
    }

    const user = await getUserByEmail(session.user.email);
    if (!user?.id) {
      return Response.json({
        jsonrpc: '2.0',
        id: null,
        error: { code: -32001, message: 'Unauthorized - user not found' }
      });
    }

    const body = await request.json();
    const { method, params = {}, id } = body;

    let result;
    
    switch (method) {
      case 'semantic_search': {
        const validation = SemanticSearchSchema.safeParse(params);
        if (!validation.success) {
          result = {
            error: {
              code: -32602,
              message: 'Invalid parameters',
              data: validation.error.issues
            }
          };
          break;
        }

        const { query, limit, minSimilarity, boardId, includeContext } = validation.data;

        try {
          // Generate embedding for the search query
          const queryEmbedding = await embeddingService.generateEmbedding(query);
          
          // Perform vector similarity search
          const embeddingArray = `[${queryEmbedding.join(",")}]`;
          
          let whereClause = '';
          const params: any[] = [embeddingArray, minSimilarity, limit];
          
          if (boardId) {
            whereClause = `
              INNER JOIN tasks t ON te.task_id = t.id 
              INNER JOIN board_sections bs ON t.board_section_id = bs.id 
              WHERE bs.board_id = $4 AND (1 - (te.embedding <=> $1::vector)) >= $2
            `;
            params.push(boardId);
          } else {
            whereClause = `WHERE (1 - (te.embedding <=> $1::vector)) >= $2`;
          }

          const searchResults = await db.$queryRaw`
            SELECT 
              te.task_id,
              te.content,
              te.metadata,
              (1 - (te.embedding <=> ${embeddingArray}::vector)) as similarity,
              t.title,
              t.description,
              t.status,
              t.priority,
              t.created_at,
              t.updated_at,
              u_assigned.name as assigned_to,
              u_created.name as created_by,
              bs.name as section_name,
              b.name as board_name
            FROM task_embeddings te
            INNER JOIN tasks t ON te.task_id = t.id
            INNER JOIN board_sections bs ON t.board_section_id = bs.id
            INNER JOIN boards b ON bs.board_id = b.id
            LEFT JOIN users u_assigned ON t.assigned_to_id = u_assigned.id
            LEFT JOIN users u_created ON t.created_by_id = u_created.id
            ${boardId ? `WHERE bs.board_id = ${boardId} AND` : 'WHERE'} (1 - (te.embedding <=> ${embeddingArray}::vector)) >= ${minSimilarity}
            ORDER BY similarity DESC
            LIMIT ${limit}
          ` as any[];

          // Add contextual information if requested
          let contextualInfo = null;
          if (includeContext && searchResults.length > 0) {
            const ragQuery = {
              query,
              companyId: session.user.activeCompanyId || '',
              userId: user.id,
              boardId,
              contextType: 'general' as const,
              options: { includeContext: true, includeSources: true }
            };
            
            contextualInfo = await ragProcessor.processQuery(ragQuery);
          }

          result = {
            content: [{
              type: 'text',
              text: JSON.stringify({
                success: true,
                message: `Found ${searchResults.length} semantically similar tasks`,
                searchType: 'semantic',
                query: query,
                results: searchResults.map((row: any) => ({
                  taskId: row.task_id,
                  title: row.title,
                  description: row.description,
                  status: row.status,
                  priority: row.priority,
                  similarity: parseFloat(row.similarity),
                  assignedTo: row.assigned_to,
                  createdBy: row.created_by,
                  section: row.section_name,
                  board: row.board_name,
                  createdAt: row.created_at,
                  updatedAt: row.updated_at,
                  extractedContent: row.content?.substring(0, 200) + '...'
                })),
                contextualInfo: contextualInfo ? {
                  response: contextualInfo.response,
                  confidence: contextualInfo.confidence,
                  sources: contextualInfo.sources,
                  suggestedActions: contextualInfo.suggestedActions
                } : null,
                searchParams: validation.data,
                timestamp: new Date().toISOString()
              }, null, 2)
            }]
          };
        } catch (error) {
          result = {
            error: {
              code: -32603,
              message: 'Failed to perform semantic search',
              data: error instanceof Error ? error.message : 'Unknown error'
            }
          };
        }
        break;
      }

      case 'vector_search': {
        const validation = VectorSearchSchema.safeParse(params);
        if (!validation.success) {
          result = {
            error: {
              code: -32602,
              message: 'Invalid parameters',
              data: validation.error.issues
            }
          };
          break;
        }

        const { embedding: inputEmbedding, query, limit, minSimilarity, boardId } = validation.data;

        try {
          let queryEmbedding: number[];
          
          // Use provided embedding or generate from query
          if (inputEmbedding && inputEmbedding.length > 0) {
            queryEmbedding = inputEmbedding;
          } else if (query) {
            queryEmbedding = await embeddingService.generateEmbedding(query);
          } else {
            result = {
              error: {
                code: -32602,
                message: 'Either embedding array or query string must be provided'
              }
            };
            break;
          }

          const embeddingArray = `[${queryEmbedding.join(",")}]`;
          
          const searchResults = await db.$queryRaw`
            SELECT 
              te.task_id,
              te.content,
              te.metadata,
              (1 - (te.embedding <=> ${embeddingArray}::vector)) as similarity,
              t.title,
              t.description,
              t.status,
              t.priority,
              t.created_at,
              u_assigned.name as assigned_to,
              u_created.name as created_by,
              bs.name as section_name,
              b.name as board_name
            FROM task_embeddings te
            INNER JOIN tasks t ON te.task_id = t.id
            INNER JOIN board_sections bs ON t.board_section_id = bs.id
            INNER JOIN boards b ON bs.board_id = b.id
            LEFT JOIN users u_assigned ON t.assigned_to_id = u_assigned.id
            LEFT JOIN users u_created ON t.created_by_id = u_created.id
            ${boardId ? `WHERE bs.board_id = ${boardId} AND` : 'WHERE'} (1 - (te.embedding <=> ${embeddingArray}::vector)) >= ${minSimilarity}
            ORDER BY similarity DESC
            LIMIT ${limit}
          ` as any[];

          result = {
            content: [{
              type: 'text',
              text: JSON.stringify({
                success: true,
                message: `Found ${searchResults.length} similar tasks using vector search`,
                searchType: 'vector',
                embeddingDimensions: queryEmbedding.length,
                results: searchResults.map((row: any) => ({
                  taskId: row.task_id,
                  title: row.title,
                  description: row.description,
                  status: row.status,
                  priority: row.priority,
                  similarity: parseFloat(row.similarity),
                  assignedTo: row.assigned_to,
                  createdBy: row.created_by,
                  section: row.section_name,
                  board: row.board_name,
                  createdAt: row.created_at
                })),
                searchParams: validation.data,
                timestamp: new Date().toISOString()
              }, null, 2)
            }]
          };
        } catch (error) {
          result = {
            error: {
              code: -32603,
              message: 'Failed to perform vector search',
              data: error instanceof Error ? error.message : 'Unknown error'
            }
          };
        }
        break;
      }

      case 'keyword_search': {
        const validation = KeywordSearchSchema.safeParse(params);
        if (!validation.success) {
          result = {
            error: {
              code: -32602,
              message: 'Invalid parameters',
              data: validation.error.issues
            }
          };
          break;
        }

        const { query, fields, boardId, status, priority, limit } = validation.data;

        try {
          const whereClause: any = {};
          
          // Build search conditions
          if (fields.includes('title') && fields.includes('description')) {
            whereClause.OR = [
              { title: { contains: query, mode: 'insensitive' } },
              { description: { contains: query, mode: 'insensitive' } }
            ];
          } else if (fields.includes('title')) {
            whereClause.title = { contains: query, mode: 'insensitive' };
          } else if (fields.includes('description')) {
            whereClause.description = { contains: query, mode: 'insensitive' };
          }

          // Add filters
          if (status) whereClause.status = status;
          if (priority) whereClause.priority = priority;
          if (boardId) {
            whereClause.boardSection = { boardId };
          }

          const searchResults = await db.task.findMany({
            where: whereClause,
            include: {
              assignedTo: { select: { name: true, email: true } },
              createdBy: { select: { name: true, email: true } },
              boardSection: {
                select: {
                  name: true,
                  board: { select: { name: true, id: true } }
                }
              }
            },
            orderBy: [
              { priority: 'desc' },
              { createdAt: 'desc' }
            ],
            take: limit
          });

          result = {
            content: [{
              type: 'text',
              text: JSON.stringify({
                success: true,
                message: `Found ${searchResults.length} tasks matching keyword search`,
                searchType: 'keyword',
                query: query,
                searchFields: fields,
                results: searchResults.map(task => ({
                  taskId: task.id,
                  title: task.title,
                  description: task.description,
                  status: task.status,
                  priority: task.priority,
                  assignedTo: {
                    name: task.assignedTo.name,
                    email: task.assignedTo.email
                  },
                  createdBy: {
                    name: task.createdBy.name,
                    email: task.createdBy.email
                  },
                  section: task.boardSection.name,
                  board: {
                    id: task.boardSection.board.id,
                    name: task.boardSection.board.name
                  },
                  createdAt: task.createdAt,
                  updatedAt: task.updatedAt
                })),
                searchParams: validation.data,
                timestamp: new Date().toISOString()
              }, null, 2)
            }]
          };
        } catch (error) {
          result = {
            error: {
              code: -32603,
              message: 'Failed to perform keyword search',
              data: error instanceof Error ? error.message : 'Unknown error'
            }
          };
        }
        break;
      }

      case 'search_history': {
        const validation = SearchHistorySchema.safeParse(params);
        if (!validation.success) {
          result = {
            error: {
              code: -32602,
              message: 'Invalid parameters',
              data: validation.error.issues
            }
          };
          break;
        }

        const { userId: targetUserId, limit, searchType } = validation.data;
        const searchUserId = targetUserId || user.id;

        try {
          // This would typically query a search_history table
          // For now, we'll provide a placeholder implementation
          const searchHistory = [
            {
              id: 'search_1',
              query: 'high priority tasks',
              searchType: 'semantic',
              resultCount: 8,
              timestamp: new Date(Date.now() - 1000 * 60 * 30) // 30 minutes ago
            },
            {
              id: 'search_2',
              query: 'bug reports',
              searchType: 'keyword',
              resultCount: 3,
              timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2) // 2 hours ago
            },
            {
              id: 'search_3',
              query: 'overdue tasks',
              searchType: 'contextual',
              resultCount: 12,
              timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24) // 1 day ago
            }
          ].filter(item => !searchType || item.searchType === searchType)
           .slice(0, limit);

          result = {
            content: [{
              type: 'text',
              text: JSON.stringify({
                success: true,
                message: `Retrieved ${searchHistory.length} search history entries`,
                searchType: 'history',
                userId: searchUserId,
                history: searchHistory,
                searchParams: validation.data,
                timestamp: new Date().toISOString()
              }, null, 2)
            }]
          };
        } catch (error) {
          result = {
            error: {
              code: -32603,
              message: 'Failed to retrieve search history',
              data: error instanceof Error ? error.message : 'Unknown error'
            }
          };
        }
        break;
      }

      case 'contextual_search': {
        const validation = ContextualSearchSchema.safeParse(params);
        if (!validation.success) {
          result = {
            error: {
              code: -32602,
              message: 'Invalid parameters',
              data: validation.error.issues
            }
          };
          break;
        }

        const { query, boardId, taskId, contextType, useRAG, maxOutputTokens } = validation.data;

        try {
          if (useRAG) {
            const ragQuery = {
              query,
              companyId: session.user.activeCompanyId || '',
              userId: user.id,
              boardId,
              taskId,
              contextType,
              options: {
                includeContext: true,
                maxOutputTokens,
                includeSources: true
              }
            };

            const ragResponse = await ragProcessor.processQuery(ragQuery);

            result = {
              content: [{
                type: 'text',
                text: JSON.stringify({
                  success: true,
                  message: 'Contextual search completed with RAG processing',
                  searchType: 'contextual',
                  query: query,
                  ragResponse: {
                    response: ragResponse.response,
                    confidence: ragResponse.confidence,
                    sources: ragResponse.sources,
                    contextSummary: ragResponse.contextSummary,
                    suggestedActions: ragResponse.suggestedActions,
                    queryClassification: ragResponse.queryClassification,
                    processingTime: ragResponse.processingTime
                  },
                  searchParams: validation.data,
                  timestamp: new Date().toISOString()
                }, null, 2)
              }]
            };
          } else {
            // Fallback to basic semantic search without RAG
            const queryEmbedding = await embeddingService.generateEmbedding(query);
            const embeddingArray = `[${queryEmbedding.join(",")}]`;
            
            const searchResults = await db.$queryRaw`
              SELECT 
                te.task_id,
                te.content,
                (1 - (te.embedding <=> ${embeddingArray}::vector)) as similarity,
                t.title,
                t.description,
                t.status,
                t.priority,
                u_assigned.name as assigned_to,
                bs.name as section_name,
                b.name as board_name
              FROM task_embeddings te
              INNER JOIN tasks t ON te.task_id = t.id
              INNER JOIN board_sections bs ON t.board_section_id = bs.id
              INNER JOIN boards b ON bs.board_id = b.id
              LEFT JOIN users u_assigned ON t.assigned_to_id = u_assigned.id
              ${boardId ? `WHERE bs.board_id = ${boardId} AND` : 'WHERE'} (1 - (te.embedding <=> ${embeddingArray}::vector)) >= 0.7
              ORDER BY similarity DESC
              LIMIT 10
            ` as any[];

            result = {
              content: [{
                type: 'text',
                text: JSON.stringify({
                  success: true,
                  message: 'Contextual search completed without RAG processing',
                  searchType: 'contextual',
                  query: query,
                  results: searchResults.map((row: any) => ({
                    taskId: row.task_id,
                    title: row.title,
                    description: row.description,
                    similarity: parseFloat(row.similarity),
                    assignedTo: row.assigned_to,
                    section: row.section_name,
                    board: row.board_name
                  })),
                  searchParams: validation.data,
                  timestamp: new Date().toISOString()
                }, null, 2)
              }]
            };
          }
        } catch (error) {
          result = {
            error: {
              code: -32603,
              message: 'Failed to perform contextual search',
              data: error instanceof Error ? error.message : 'Unknown error'
            }
          };
        }
        break;
      }

      default:
        result = {
          error: {
            code: -32601,
            message: `Search method '${method}' not found`,
            data: `Available methods: semantic_search, vector_search, keyword_search, search_history, contextual_search`
          }
        };
    }

    return Response.json({
      jsonrpc: '2.0',
      id: id,
      result: result
    });

  } catch (error) {
    console.error('MCP search POST error:', error);
    return Response.json({
      jsonrpc: '2.0',
      id: null,
      error: {
        code: -32603,
        message: 'Internal server error',
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