// in lib/jobs/board-generation-job.ts
import db from '@/lib/db';
import { AgentOrchestrator } from '@/lib/ai/agent-orchestrator'; // Assuming this is your orchestrator entry point

interface BoardGenerationJobPayload {
  boardRequestId: string;
}

interface ToolResult {
  toolCallId: string;
  toolName: string;
  args: unknown;
  result: {
    boardId?: string;
    boardName?: string;
    error?: string;
  };
}

export async function runBoardGenerationJob(payload: BoardGenerationJobPayload) {
  const { boardRequestId } = payload;

  // 1. Update job status to PROCESSING
  await db.aIGeneratedBoardRequest.update({
    where: { id: boardRequestId },
    data: { status: 'PROCESSING' },
  });

  try {
    // 2. Fetch the request details
    const request = await db.aIGeneratedBoardRequest.findUnique({
      where: { id: boardRequestId },
    });

    if (!request) {
      throw new Error(`Board request ${boardRequestId} not found.`);
    }

    // 3. Invoke the AI Agent Orchestrator with explicit toolkit override
    const orchestrator = new AgentOrchestrator();
    const query = `Generate a comprehensive project board with sections and tasks based on this detailed brief: "${request.refinedPrompt}". Create organized board sections and populate them with relevant tasks.`;
    
    // Create proper context for the agent
    const context = {
      userId: request.userId,
      companyId: request.companyId,
      conversationId: `board-generation-${boardRequestId}`
    };
    
    // Force the orchestrator to use the boardWizard toolkit by overriding the intent classification
    const result = await orchestrator.orchestrate(
      query, 
      [], // Pass empty history for this self-contained task
      undefined, // No system prompt override
      ['boardWizard'], // Explicitly require the boardWizard toolkit
      context // Pass the proper context
    );

    // Extract result from the tool call
    console.log(`Job ${boardRequestId}: Full orchestration result:`, JSON.stringify(result, null, 2));
    
    const toolCalls = await result.toolCalls || [];
    const toolResults = await result.toolResults || [];
    
    console.log(`Job ${boardRequestId}: Tool calls received:`, toolCalls.map(t => t.toolName));
    console.log(`Job ${boardRequestId}: Tool results received:`, toolResults);
    
    // Look for the tool result in toolResults array (where the actual output is stored)
    const boardGenerationResult = (toolResults as ToolResult[]).find((result) => result.toolName === 'generateProjectBoard');
    
    if (!boardGenerationResult) {
      console.error(`Job ${boardRequestId}: Board generation tool result not found. Available results:`, (toolResults as ToolResult[]).map((r) => r.toolName));
      throw new Error('Board generation tool result not found');
    }
    
    console.log(`Job ${boardRequestId}: Found tool result:`, JSON.stringify(boardGenerationResult, null, 2));
    
    // Extract the actual result from the result property (not output)
    const toolResult = boardGenerationResult.result;
    console.log(`Job ${boardRequestId}: Extracted result:`, toolResult);
    
    if (!toolResult?.boardId) {
      console.error(`Job ${boardRequestId}: No boardId found in tool result:`, toolResult);
      throw new Error('Board generation tool did not return a valid boardId');
    }
    
    const { boardId } = toolResult;

    // 4. Update job status to COMPLETED
    await db.aIGeneratedBoardRequest.update({
      where: { id: boardRequestId },
      data: {
        status: 'COMPLETED',
        boardId: boardId,
      },
    });

    // 5. TODO: Trigger a user notification (e.g., via Pusher, Web Sockets, or other real-time service)
    // Note: revalidatePath removed from here as it can't be called during background job execution
    // The client-side auto-reload and router.refresh() will handle the UI updates
    console.log(`Job ${boardRequestId} completed successfully.`);

  } catch (error) {
    console.error(`Job ${boardRequestId} failed:`, error);
    // 6. Update job status to FAILED
    await db.aIGeneratedBoardRequest.update({
      where: { id: boardRequestId },
      data: {
        status: 'FAILED',
        failureReason: error instanceof Error ? error.message : 'An unknown error occurred',
      },
    });
    // 7. TODO: Trigger a user notification about the failure
  }
}

// This function would be called by your background job runner (e.g., Inngest, Quirrel, etc.)
// For example, with Inngest:
//
// import { Inngest } from "inngest";
// import { runBoardGenerationJob } from "./board-generation-job";
//
// export const inngest = new Inngest({ name: "TaskHQ" });
//
// export const generateBoard = inngest.createFunction(
//   { name: "Generate Project Board" },
//   { event: "board/generate.request" },
//   async ({ event }) => {
//     await runBoardGenerationJob(event.data);
//   }
// );
//
// And in `createBoardFromAi`, you'd call:
// await inngest.send({ name: "board/generate.request", data: { boardRequestId: boardRequest.id } });
//
// For now, we are calling it directly.