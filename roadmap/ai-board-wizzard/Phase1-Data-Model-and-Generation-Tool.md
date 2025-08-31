# AI Board Wizard: Phase 1 - Data Model and Core Generation Tool

**Objective:** Set up the foundational database schema and the core AI tool for board generation. This phase creates the non-conversational, data-centric backbone of the feature.

## 1. Rationale

Before any frontend or complex backend logic is written, we need two things:

1.  A way to persist and track the state of an AI generation request.
2.  A core AI-powered function that can take a detailed prompt and produce a board.

This phase addresses both, creating a solid foundation for the subsequent orchestration and UI phases.

## 2. Step-by-Step Implementation Guide

### Step 2.1: Update Prisma Schema

The first step is to create the database model that will store the generation requests.

1.  **Navigate to `prisma/schema.prisma`**.
2.  **Add the `AIGenerationStatus` enum**: This defines the possible states of our background job.

    ```prisma
    enum AIGenerationStatus {
      PENDING
      PROCESSING
      COMPLETED
      FAILED
    }
    ```

3.  **Add the `AIGeneratedBoardRequest` model**: This table will store the prompt and track the job's lifecycle. Add the following model definition:

    ```prisma
    model AIGeneratedBoardRequest {
      id               String   @id @default(cuid())
      createdAt        DateTime @default(now())
      updatedAt        DateTime @updatedAt

      status           AIGenerationStatus @default(PENDING)
      refinedPrompt    String   @db.Text
      role             String

      userId           String
      user             User     @relation(fields: [userId], references: [id], onDelete: Cascade)
      companyId        String
      company          Company  @relation(fields: [companyId], references: [id], onDelete: Cascade)

      generatedBoardId String?  @unique
      generatedBoard   Board?   @relation(fields: [generatedBoardId], references: [id], onDelete: SetNull)

      failureReason    String?
    }
    ```

    _Note: Ensure the relations to `User`, `Company`, and `Board` are correctly defined based on your existing schema._

### Step 2.2: Apply Database Migration

1.  **Open your terminal**.
2.  **Run the Prisma migrate command** to apply these changes to your database.

    ```bash
    pnpm prisma migrate dev --name add_ai_board_wizard_requests
    ```

3.  **Verify the migration** by checking the new migration file in `prisma/migrations/` and ensuring your database schema has been updated.

### Step 2.3: Create the Board Wizard Toolkit

Now, we'll create the specialized AI tool for generating the board.

1.  **Create a new file** at `lib/ai/toolkits/board-wizard-toolkit.ts`.
2.  **Define the `generateProjectBoard` tool** inside this file. This tool will encapsulate the logic for calling the LLM and creating the board records.

    ```typescript
    // in lib/ai/toolkits/board-wizard-toolkit.ts
    import { z } from 'zod';
    import { createOpenAI } from '@ai-sdk/openai';
    import { generateObject } from 'ai';
    import { createBoard } from '@/actions/tasks/create-board';
    import { createBoardSection } from '@/actions/tasks/create-board-section';
    import { createTask } from '@/actions/tasks/create-task';

    // Define the expected JSON structure from the LLM
    const boardPlanSchema = z.object({
      boardName: z.string().describe('The name of the new project board.'),
      boardDescription: z.string().describe('A brief description of the project board.'),
      sections: z.array(z.object({
        name: z.string().describe('The name of a section or phase (e.g., "Phase 1: Research").'),
        tasks: z.array(z.object({
          name: z.string().describe('The title of a specific, actionable task.'),
          description: z.string().describe('A short description for the task.'),
        })),
      })),
    });

    export const boardWizardToolkit = {
      generateProjectBoard: {
        description: 'Generates and persists a complete project board with sections and tasks based on a detailed, user-approved project brief.',
        parameters: z.object({
          refinedPrompt: z.string().describe('The final, user-approved project brief.'),
          role: z.string().describe('The user's role for context (e.g., "Product Manager").'),
          userId: z.string(),
          companyId: z.string(),
        }),
        execute: async ({ refinedPrompt, role, userId, companyId }) => {
          console.log('Executing generateProjectBoard tool...');

          // 1. Call the LLM to get the structured board plan
          const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
          const { object: boardPlan } = await generateObject({
            model: openai('gpt-4o-mini'), // Or a more powerful model
            schema: boardPlanSchema,
            prompt: `You are an expert project planner. The user's role is "${role}". Based on the following project brief, generate a comprehensive project board plan with relevant sections and tasks. Brief: ${refinedPrompt}`,
          });

          // 2. Persist the generated plan to the database
          // Create the main board
          const board = await createBoard({
            name: boardPlan.boardName,
            description: boardPlan.boardDescription,
            companyId,
            userId,
          });

          if (!board || !board.id) {
            throw new Error('Failed to create board.');
          }

          // Create sections and tasks
          for (const section of boardPlan.sections) {
            const boardSection = await createBoardSection({
              name: section.name,
              boardId: board.id,
              companyId,
            });

            if (!boardSection || !boardSection.id) {
              console.warn(`Failed to create section: ${section.name}`);
              continue; // Continue to the next section
            }

            for (const task of section.tasks) {
              await createTask({
                name: task.name,
                description: task.description,
                boardId: board.id,
                sectionId: boardSection.id,
                companyId,
                // Default other required task fields (priority, etc.)
              });
            }
          }

          console.log(`Board "${board.name}" created successfully.`);
          return { boardId: board.id, boardName: board.name };
        },
      },
    };
    ```

### Step 2.4: Register the New Toolkit

Make the `AgentOrchestrator` aware of this new tool.

1.  **Navigate to `lib/ai/toolkits/index.ts`**.
2.  **Import and add the toolkit** to the `allToolkits` registry.

    ```typescript
    // in lib/ai/toolkits/index.ts
    import { projectToolkit } from "./project-toolkit";
    import { taskToolkit } from "./task-toolkit";
    import { boardWizardToolkit } from "./board-wizard-toolkit"; // <-- Import
    // ... import other toolkits

    const allToolkits = {
      projectAnalyzer: projectToolkit,
      taskManager: taskToolkit,
      boardWizard: boardWizardToolkit, // <-- Add to registry
      // ...
    };

    export function getToolkits(names: (keyof typeof allToolkits)[]) {
      // ... existing implementation
    }
    ```

## 3. Verification

- Confirm that the database migration was successful and the new table exists.
- Review the `board-wizard-toolkit.ts` file to ensure it correctly calls the LLM and the existing data creation actions.
- Ensure the toolkit is correctly registered and discoverable by the `AgentOrchestrator`.
