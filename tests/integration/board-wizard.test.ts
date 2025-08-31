import { describe, test, expect } from "@jest/globals";
import { AgentOrchestrator } from "@/lib/ai/agent-orchestrator";
import { ModelMessage } from "ai";

describe("AI Board Wizard Integration Test", () => {
  test("should call proposeFinalBrief tool when enough information is gathered", async () => {
    const agentOrchestrator = new AgentOrchestrator();

    const query = "I think that is all I need.";
    const history: ModelMessage[] = [
      {
        role: "user",
        content: "I want to build a website for my new coffee shop.",
      },
      {
        role: "assistant",
        content: "Great! What are the key features you want on your website?",
      },
      {
        role: "user",
        content:
          "I want a menu page, a contact page, and an online ordering system.",
      },
    ];

    const systemPrompt = `You are a project planning assistant. Your goal is to help the user refine their project idea into a clear, actionable brief. Ask clarifying questions to understand the project scope, goals, and key features. After 2-3 questions, or when you have enough information, you MUST call the \"proposeFinalBrief\" tool to summarize the plan and end the conversation.`;

    const result = await agentOrchestrator.orchestrate(
      query,
      history,
      systemPrompt,
      ["boardWizard"],
    );

    expect(result.toolCalls).toBeDefined();
    expect(result.toolCalls.length).toBeGreaterThan(0);
    expect(result.toolCalls[0].toolName).toBe("proposeFinalBrief");
    expect(typeof result.toolCalls[0].args.brief).toBe("string");
  }, 30000); // 30 second timeout for this test
});
