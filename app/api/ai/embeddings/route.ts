import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { embeddingStorageService } from "@/lib/ai/embedding-storage";
import { dataExtractionService } from "@/lib/ai/data-extraction";
import { EmbeddingMonitor, PerformanceMonitor } from "@/lib/ai/monitoring";
import { validateAIConfig } from "@/lib/ai/config";
import { z } from "zod";

// Request validation schemas
const ProcessCompanySchema = z.object({
  action: z.literal("process_company"),
  companyId: z.string(),
});

const ProcessTasksSchema = z.object({
  action: z.literal("process_tasks"),
  taskIds: z.array(z.string()),
});

const ProcessSingleTaskSchema = z.object({
  action: z.literal("process_single_task"),
  taskId: z.string(),
});

const ProcessBoardsSchema = z.object({
  action: z.literal("process_boards"),
  boardIds: z.array(z.string()),
});

const RequestSchema = z.union([
  ProcessCompanySchema,
  ProcessTasksSchema,
  ProcessSingleTaskSchema,
  ProcessBoardsSchema,
]);

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Validate AI configuration
    const configValidation = validateAIConfig();
    if (!configValidation.valid) {
      return NextResponse.json(
        {
          error: "AI configuration invalid",
          details: configValidation.errors,
        },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validatedRequest = RequestSchema.parse(body);

    switch (validatedRequest.action) {
      case "process_company": {
        const { companyId } = validatedRequest;

        // Verify user has access to this company
        if (session.user.cid !== companyId) {
          return NextResponse.json(
            { error: "Access denied to company data" },
            { status: 403 }
          );
        }

        const results =
          await embeddingStorageService.processCompanyEmbeddings(companyId);

        return NextResponse.json({
          success: true,
          results,
          message: "Company embeddings processed successfully",
        });
      }

      case "process_tasks": {
        const { taskIds } = validatedRequest;

        if (taskIds.length === 0) {
          return NextResponse.json(
            { error: "No task IDs provided" },
            { status: 400 }
          );
        }

        // Verify user has access to these tasks (simplified check)
        const taskResults =
          await embeddingStorageService.batchProcessTaskEmbeddings(taskIds);

        return NextResponse.json({
          success: true,
          results: taskResults,
          message: `Processed ${taskResults.success} tasks successfully`,
        });
      }

      case "process_single_task": {
        const { taskId } = validatedRequest;

        const success =
          await embeddingStorageService.processTaskEmbedding(taskId);

        return NextResponse.json({
          success,
          message: success
            ? "Task embedding processed"
            : "Failed to process task embedding",
        });
      }

      case "process_boards": {
        const { boardIds } = validatedRequest;

        if (boardIds.length === 0) {
          return NextResponse.json(
            { error: "No board IDs provided" },
            { status: 400 }
          );
        }

        const boardResults =
          await embeddingStorageService.batchProcessBoardEmbeddings(boardIds);

        return NextResponse.json({
          success: true,
          results: boardResults,
          message: `Processed ${boardResults.success} boards successfully`,
        });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Embedding API error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request format", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const action = url.searchParams.get("action");

    switch (action) {
      case "stats": {
        const stats = await embeddingStorageService.getEmbeddingStats();
        const monitoringStats = EmbeddingMonitor.getStats();
        const performanceStats = PerformanceMonitor.getPerformanceStats();
        const costAlert = EmbeddingMonitor.getCostAlert();

        return NextResponse.json({
          success: true,
          data: {
            embeddings: stats,
            monitoring: monitoringStats,
            performance: performanceStats,
            costAlert,
          },
        });
      }

      case "health": {
        const healthStatus = await embeddingStorageService.getHealthStatus();

        return NextResponse.json(
          {
            success: true,
            health: healthStatus,
          },
          {
            status: healthStatus.healthy ? 200 : 503,
          }
        );
      }

      case "pending": {
        const companyId = session.user.cid;
        if (!companyId) {
          return NextResponse.json(
            { error: "Company context required" },
            { status: 400 }
          );
        }

        const [pendingTasks, pendingBoards] = await Promise.all([
          dataExtractionService.getTasksNeedingEmbeddingUpdate(companyId),
          dataExtractionService.getBoardsNeedingEmbeddingUpdate(companyId),
        ]);

        return NextResponse.json({
          success: true,
          data: {
            pendingTasks: pendingTasks.length,
            pendingBoards: pendingBoards.length,
            taskIds: pendingTasks.slice(0, 10), // First 10 for preview
            boardIds: pendingBoards.slice(0, 10), // First 10 for preview
          },
        });
      }

      default: {
        // Default to stats if no action specified
        const stats = await embeddingStorageService.getEmbeddingStats();

        return NextResponse.json({
          success: true,
          stats,
        });
      }
    }
  } catch (error) {
    console.error("Embedding stats error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { taskId, boardId } = await request.json();

    if (taskId) {
      await embeddingStorageService.deleteTaskEmbedding(taskId);
      return NextResponse.json({
        success: true,
        message: "Task embedding deleted successfully",
      });
    }

    if (boardId) {
      await embeddingStorageService.deleteBoardEmbedding(boardId);
      return NextResponse.json({
        success: true,
        message: "Board embedding deleted successfully",
      });
    }

    return NextResponse.json(
      { error: "Task ID or Board ID required" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Embedding deletion error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
