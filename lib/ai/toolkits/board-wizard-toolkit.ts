import { z } from 'zod';
import { createOpenAI } from '@ai-sdk/openai';
import { generateObject, tool } from 'ai';
import { createBoard } from '@/actions/tasks/create-board';
import { createBoardSection } from '@/actions/tasks/create-board-section';
import { createTask } from '@/actions/tasks/create-task';
import { AgentContext } from '../agent-core';

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

export const getBoardWizardToolkit = (context: AgentContext) => ({
  proposeFinalBrief: tool({
    description: 'Call this function when you have gathered enough information from the user to form a clear, actionable project brief. This signals the end of the conversation.',
    inputSchema: z.object({
      brief: z.string().describe('The final, summarized project brief, written in the second person as a confirmation to the user (e.g., "Okay, so you want to build a mobile app for...").'),
    }),
    execute: async ({ brief }) => {
      // This tool is a signal. It simply returns the brief.
      return { brief };
    },
  }),

  generateProjectBoard: tool({
    description: 'Generates and persists a complete project board with sections and tasks based on a detailed, user-approved project brief.',
    inputSchema: z.object({
      refinedPrompt: z.string().describe('The final, user-approved project brief.'),
      role: z.string().describe('The user\'s role for context (e.g., "Product Manager").'),
    }),
    execute: async ({ refinedPrompt, role }) => {
      console.log('Executing generateProjectBoard tool...');
      console.log('Context userId:', context.userId, 'companyId:', context.companyId);
      
      try {
        // 1. Call the LLM to get the structured board plan
        console.log('Starting generateObject call...');
        const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const { object: boardPlan } = await generateObject({
          model: openai('gpt-4o-mini'),
          schema: boardPlanSchema,
          prompt: `You are an expert project planner. The user's role is "${role}". 

Based on the following project brief, generate exactly ONE comprehensive project board plan with relevant sections and tasks.

Important: Return only a single JSON object with the following structure:
- boardName: A clear, concise name for the project board
- boardDescription: A brief description of the project
- sections: An array of 3-6 sections, each with a name and 4-8 tasks

Each task should have:
- name: Clear, actionable task name
- description: Detailed description of what needs to be done

Project Brief: ${refinedPrompt}`,
        });
        console.log('Generated board plan:', JSON.stringify(boardPlan, null, 2));

        // 2. Persist the generated plan to the database
        console.log('Creating main board...');
        const board = await createBoard({
          name: boardPlan.boardName,
          description: boardPlan.boardDescription,
        });
        console.log('Created board:', board);

        if (!board || 'error' in board) {
          throw new Error('Failed to create board: ' + (board && 'error' in board ? board.error : 'Unknown error'));
        }

        // Create sections and tasks
        console.log(`Creating ${boardPlan.sections.length} sections...`);
        for (const section of boardPlan.sections) {
          console.log(`Creating section: ${section.name}`);
          const boardSection = await createBoardSection(board.id, section.name, true);

          if (!boardSection || !boardSection.id) {
            console.warn(`Failed to create section: ${section.name}`);
            continue; // Continue to the next section
          }

          console.log(`Creating ${section.tasks.length} tasks for section: ${section.name}`);
          for (const task of section.tasks) {
            await createTask({
              title: task.name,
              description: task.description,
              priority: 'MEDIUM', // Default priority
              status: 'NEW', // Default status
            }, boardSection.id);
          }
        }
        
        console.log(`Board "${board.name}" created successfully with ID: ${board.id}`);
        return { boardId: board.id, boardName: board.name };
      } catch (error) {
        console.error('Error in generateProjectBoard:', error);
        throw error;
      }
    },
  }),
});
