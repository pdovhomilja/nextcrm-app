// in actions/tasks/refine-goal-conversation.ts
'use server';

import { z } from 'zod';
import { AgentOrchestrator } from '@/lib/ai/agent-orchestrator';
import { CoreMessage } from 'ai';

const RefineGoalSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })),
});

// This is the expected return shape
export interface RefinementResult {
  isFinalBrief: boolean;
  content: string;
}

export async function refineGoalConversation(values: z.infer<typeof RefineGoalSchema>): Promise<RefinementResult> {
  const validatedFields = RefineGoalSchema.safeParse(values);
  if (!validatedFields.success) {
    throw new Error('Invalid input: Invalid message format.');
  }

  const { messages } = validatedFields.data;

  // 1. Define the system prompt for the refinement task
  const systemPrompt = `You are an expert project manager named "Wizard". Your goal is to help a user refine their high-level project idea into a clear, actionable project brief. 
  - Ask one clarifying question at a time. 
  - Keep your questions concise and targeted.
  - After 2-3 questions, or when you have enough information, you MUST call the "proposeFinalBrief" tool to summarize the plan and end the conversation.`;

  // 2. Instantiate and run the orchestrator
  const orchestrator = new AgentOrchestrator();
  const result = await orchestrator.orchestrate(
    messages[messages.length - 1].content, // Pass the latest user message as the "query"
    messages as CoreMessage[], // Pass the full history
    systemPrompt, // Override the default system prompt
    ['boardWizard'] // Ensure the boardWizard toolkit is available
  );

  // 3. Process the result
  const toolCalls = await result.toolCalls || [];
  const finalBriefTool = toolCalls.find(tool => tool.toolName === 'proposeFinalBrief');
  
  if (finalBriefTool) {
    // The AI has proposed a final brief - access the input.brief directly
    const finalBrief = (finalBriefTool as any).input?.brief;
    
    return {
      isFinalBrief: true,
      content: finalBrief || 'No brief content found',
    };
  } else {
    // The AI has generated a text response (a clarifying question)
    return {
      isFinalBrief: false,
      content: await result.text,
    };
  }
}