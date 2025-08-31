// in actions/tasks/refine-goal-conversation.ts
"use server";

import { z } from "zod";
import { AgentOrchestrator } from "@/lib/ai/agent-orchestrator";
import { ModelMessage } from "ai";
import { auth } from "@/auth";
import { getCurrentCompanyId } from "@/lib/auth-utils";

const RefineGoalSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string(),
    }),
  ),
  language: z.string().optional().default("English"),
});

// This is the expected return shape
export interface RefinementResult {
  isFinalBrief: boolean;
  content: string;
}

export async function refineGoalConversation(
  values: z.infer<typeof RefineGoalSchema>,
): Promise<RefinementResult> {
  console.log("refineGoalConversation called with:", {
    messagesCount: values.messages?.length,
    language: values.language,
  });

  const validatedFields = RefineGoalSchema.safeParse(values);
  if (!validatedFields.success) {
    console.error("Validation failed:", validatedFields.error);
    throw new Error("Invalid input: Invalid message format.");
  }

  const { messages, language } = validatedFields.data;
  console.log("Processing messages:", messages.length, "Language:", language);

  // Get user session and context
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized: No user session found");
  }

  const companyId = await getCurrentCompanyId();
  if (!companyId) {
    throw new Error("Company not found");
  }

  // 1. Define the system prompt for the refinement task
  const systemPrompt = `You are an expert project manager named "Wizard". Your goal is to help a user refine their high-level project idea into a clear, actionable project brief. 

  - Ask one clarifying question at a time to understand the project better
  - Keep your questions concise and targeted
  - Be thorough - ask about scope, timeline, resources, specific requirements, and success criteria
  - Only call the "proposeFinalBrief" tool when you have gathered comprehensive information about:
    * The exact scope and objectives of the project
    * Key deliverables and milestones
    * Target timeline or deadlines
    * Available resources or constraints
    * Success criteria or specific outcomes desired
  - You should typically ask 4-6 questions before proposing a final brief
  - Don't rush - make sure you understand the project thoroughly before ending the conversation
  - IMPORTANT: All responses must be in ${language}. Ask questions and provide the final brief in ${language}.`;

  // 2. Instantiate and run the orchestrator
  console.log("Calling orchestrator with context:", {
    userId: session.user.id,
    companyId,
  });
  const orchestrator = new AgentOrchestrator();
  const context = { userId: session.user.id, companyId };

  const result = await orchestrator.orchestrate(
    messages[messages.length - 1].content, // Pass the latest user message as the "query"
    messages as ModelMessage[], // Pass the full history
    systemPrompt, // Override the default system prompt
    ["boardWizard"], // Ensure the boardWizard toolkit is available
    context, // Pass the user context
  );

  console.log("Orchestrator result:", {
    hasToolCalls: !!result.toolCalls,
    hasText: !!result.text,
  });

  // 3. Process the result
  const toolCalls = (await result.toolCalls) || [];
  const finalBriefTool = toolCalls.find(
    (tool) => tool.toolName === "proposeFinalBrief",
  );
  const clarificationTool = toolCalls.find(
    (tool) => tool.toolName === "request_clarification",
  );

  console.log(
    "Found tool calls:",
    toolCalls.map((t) => t.toolName),
  );

  if (finalBriefTool) {
    // The AI has proposed a final brief - access the input.brief directly
    const finalBrief = (finalBriefTool as any).input?.brief;
    console.log("Final brief found:", finalBrief);

    return {
      isFinalBrief: true,
      content: finalBrief || "No brief content found",
    };
  } else if (clarificationTool) {
    // The AI has requested clarification - get the question from the tool call
    const question = (clarificationTool as any).input?.question;
    console.log("Clarification requested:", question);

    return {
      isFinalBrief: false,
      content: question || "Could you provide more details?",
    };
  } else {
    // The AI has generated a text response (a clarifying question)
    const textContent = await result.text;
    console.log("AI text response:", textContent);

    return {
      isFinalBrief: false,
      content:
        textContent || "Could you provide more details about your project?",
    };
  }
}
