import { findRelevantContent } from "@/components/ai/ai-assistant-v2";
import { openai } from "@ai-sdk/openai";
import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  UIMessage,
  tool,
} from "ai";
import { z } from 'zod/v3';
import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { withCompanyAccessValidation } from "@/lib/security/company-access-validator";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  // CRITICAL: Extract and validate user session for company context
  const session = await auth();
  //console.log("session", session);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const activeCompanyId = session.user.activeCompanyId;

  if (!activeCompanyId) {
    return NextResponse.json(
      { error: "No company context available" },
      { status: 400 }
    );
  }

  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: openai(process.env.AI_MODEL || "gpt-5"),
    system: `You are a helpful assistant. Check your knowledge base before answering any questions.
    Only respond to questions using information from tool calls.
    if no relevant information is found in the tool calls, respond, "Sorry, I don't know."`,
    messages: convertToModelMessages(messages),
    stopWhen: stepCountIs(5),
    tools: {
      /*       addResource: tool({
        description: `add a resource to your knowledge base.
            If the user provides a random piece of knowledge unprompted, use this tool without asking for confirmation.`,
        inputSchema: z.object({
          content: z
            .string()
            .describe("the content or resource to add to the knowledge base"),
        }),
        execute: async ({ content }) => createResource({ content }),
      }), */
      getInformation: tool({
        description: `get information from your knowledge base to answer questions.`,
        inputSchema: z.object({
          question: z.string().describe("the users question"),
        }),
        execute: async ({ question }) => {
          const result = await withCompanyAccessValidation(
            session.user.id,
            activeCompanyId,
            "ai_query",
            "search",
            () => findRelevantContent(question, activeCompanyId)
          );

          if (!result.success) {
            throw new Error(result.error || "Access denied");
          }

          return result.data || [];
        },
      }),
    },
  });

  return result.toUIMessageStreamResponse();
}
