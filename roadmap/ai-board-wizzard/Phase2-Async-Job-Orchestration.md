# AI Board Wizard: Phase 2 - Asynchronous Job Orchestration

**Objective:** Create the backend server actions to manage the asynchronous, persistent workflow for board generation. This phase connects the user's final request to the background processing system.

**Prerequisite:** [Phase 1: Data Model and Core Generation Tool](Phase1-Data-Model-and-Generation-Tool.md)

## 1. Rationale

The AI board generation process can be slow. To avoid a poor user experience, we must not block the user while the AI works. This phase implements the backend logic to handle this asynchronously. It involves creating a record of the user's request and then triggering a background job to fulfill it, providing a robust and reliable system.

## 2. Step-by-Step Implementation Guide

### Step 2.1: Create the Asynchronous Trigger Action

This server action is the entry point for the asynchronous part of the flow. It persists the user's request and kicks off the background job.

1.  **Create a new file** at `actions/tasks/create-board-from-ai.ts`.
2.  **Implement the server action**. This action will:
    a. Receive the user-approved `refinedPrompt` and `role`.
    b. Create an entry in the `AIGeneratedBoardRequest` table.
    c. Trigger the background job.

    ```typescript
    // in actions/tasks/create-board-from-ai.ts
    "use server";

    import { z } from "zod";
    import { auth } from "@/auth";
    import { db } from "@/lib/db";
    import { getCompanyId } from "@/lib/auth-utils";
    import { runBoardGenerationJob } from "@/lib/jobs/board-generation-job"; // We will create this next

    const CreateBoardFromAiSchema = z.object({
      refinedPrompt: z.string().min(10, "The project brief is too short."),
      role: z.string(),
    });

    export async function createBoardFromAi(
      values: z.infer<typeof CreateBoardFromAiSchema>,
    ) {
      const session = await auth();
      if (!session?.user?.id) {
        return { error: "Unauthorized" };
      }
      const companyId = await getCompanyId(session.user.id);
      if (!companyId) {
        return { error: "Company not found" };
      }

      const validatedFields = CreateBoardFromAiSchema.safeParse(values);
      if (!validatedFields.success) {
        return { error: "Invalid fields" };
      }

      const { refinedPrompt, role } = validatedFields.data;

      // 1. Persist the request to the database
      const boardRequest = await db.aIGeneratedBoardRequest.create({
        data: {
          userId: session.user.id,
          companyId,
          refinedPrompt,
          role,
          status: "PENDING",
        },
      });

      // 2. Trigger the background job (fire-and-forget)
      // We do not `await` this call. The client gets an immediate response.
      runBoardGenerationJob({ boardRequestId: boardRequest.id });

      return {
        success:
          "Board generation has started! We will notify you upon completion.",
      };
    }
    ```

### Step 2.2: Implement the Background Job Logic

Here we define the actual work that happens in the background. For a Next.js application, we can achieve a simple background job by defining a function that is called without being awaited. For production-grade reliability, a dedicated queueing system like Inngest, Vercel Cron, or Upstash QStash is recommended.

1.  **Create a new file** at `lib/jobs/board-generation-job.ts`.
2.  **Define the `runBoardGenerationJob` function**. This function will contain the core logic for the job.

    ```typescript
    // in lib/jobs/board-generation-job.ts
    import { db } from "@/lib/db";
    import { AgentOrchestrator } from "@/lib/ai/agent-orchestrator"; // Assuming this is your orchestrator entry point

    interface BoardGenerationJobPayload {
      boardRequestId: string;
    }

    export async function runBoardGenerationJob(
      payload: BoardGenerationJobPayload,
    ) {
      const { boardRequestId } = payload;

      // 1. Update job status to PROCESSING
      await db.aIGeneratedBoardRequest.update({
        where: { id: boardRequestId },
        data: { status: "PROCESSING" },
      });

      try {
        // 2. Fetch the request details
        const request = await db.aIGeneratedBoardRequest.findUnique({
          where: { id: boardRequestId },
        });

        if (!request) {
          throw new Error(`Board request ${boardRequestId} not found.`);
        }

        // 3. Invoke the AI Agent Orchestrator
        const orchestrator = new AgentOrchestrator();
        const query = `Using the boardWizard toolkit, generate a project board based on this brief: "${request.refinedPrompt}"`;

        // The orchestrator should be configured to find and use the `generateProjectBoard` tool
        const result = await orchestrator.orchestrate(query, []); // Pass empty history for this self-contained task

        // Assuming the tool returns { boardId, boardName }
        const { boardId } = result.toolCalls[0].result;

        // 4. Update job status to COMPLETED
        await db.aIGeneratedBoardRequest.update({
          where: { id: boardRequestId },
          data: {
            status: "COMPLETED",
            generatedBoardId: boardId,
          },
        });

        // 5. TODO: Trigger a user notification (e.g., via Pusher, Web Sockets, or other real-time service)
        console.log(`Job ${boardRequestId} completed successfully.`);
      } catch (error) {
        console.error(`Job ${boardRequestId} failed:`, error);
        // 6. Update job status to FAILED
        await db.aIGeneratedBoardRequest.update({
          where: { id: boardRequestId },
          data: {
            status: "FAILED",
            failureReason:
              error instanceof Error
                ? error.message
                : "An unknown error occurred",
          },
        });
        // 7. TODO: Trigger a user notification about the failure
      }
    }
    ```

## 3. Verification

- Manually call the `createBoardFromAi` action from a test script or a temporary UI button.
- Check the database to confirm that an `AIGeneratedBoardRequest` record is created with a `PENDING` status.
- Observe the server logs to see the `runBoardGenerationJob` function execute.
- After a few moments, check the database record again. Its status should have changed to `COMPLETED` (on success) or `FAILED` (on error).
- If successful, a new board should exist in the `Board` table, and its ID should be linked in the `AIGeneratedBoardRequest` record.
