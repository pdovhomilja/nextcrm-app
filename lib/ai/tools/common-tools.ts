import { tool } from "ai";
import { z } from "zod/v3";

export const commonTools = {
  request_clarification: tool({
    description:
      "Ask the user a clarifying question when their request is ambiguous or incomplete.",
    inputSchema: z.object({
      question: z.string().describe("The specific question to ask the user."),
    }),
    execute: async ({ question }: { question: string }) => {
      // This tool serves as a signal for the agent to respond with the question.
      // The actual response generation will be handled by the calling logic.
      return { was_clarification_requested: true, question };
    },
  }),
};
