import { AgentFactory } from "../specialized-agents";
import { agentOrchestrator } from "../agent-orchestrator";
import { mcpClientPool } from "../mcp-client-pool";

describe("AI Agent System Integration", () => {
  beforeAll(async () => {
    await mcpClientPool.initialize();
  });

  afterAll(async () => {
    await mcpClientPool.close();
  });

  describe("Agent Factory", () => {
    test("should create specialized agents", async () => {
      const analyzer = await AgentFactory.getAgent("analyzer");
      expect(analyzer.getStatus().role).toBe("Project Analyzer");
      expect(analyzer.getCapabilities()).toContain("project_health_analysis");
    });

    test("should reuse existing agents", async () => {
      const agent1 = await AgentFactory.getAgent("recommender");
      const agent2 = await AgentFactory.getAgent("recommender");
      expect(agent1).toBe(agent2); // Should be same instance
    });
  });

  describe("Agent Orchestrator", () => {
    test("should select appropriate agent for analysis queries", async () => {
      const selection = await agentOrchestrator.selectAgents(
        "How is my project performing?",
        { userId: "test", companyId: "test" }
      );

      expect(selection.primaryAgent).toBe("analyzer");
    });

    test("should process single agent requests", async () => {
      const response = await agentOrchestrator.processSingleAgent(
        "What tasks should I prioritize?",
        { userId: "test", companyId: "test" },
        "recommender"
      );

      expect(response.primaryResponse).toBeTruthy();
      expect(response.agentResponses).toHaveLength(1);
      expect(response.metadata.orchestrationStrategy).toBe("single-agent");
    });

    test("should handle multi-agent coordination", async () => {
      const response = await agentOrchestrator.processMultiAgent(
        "How is my project doing and what should I focus on next?",
        { userId: "test", companyId: "test" },
        ["analyzer", "recommender"]
      );

      expect(response.primaryResponse).toBeTruthy();
      expect(response.agentResponses.length).toBeGreaterThan(0);
      expect(response.metadata.orchestrationStrategy).toBe(
        "multi-agent-collaborative"
      );
    });

    test("should handle orchestration errors gracefully", async () => {
      const response = await agentOrchestrator.processSingleAgent(
        "test query",
        { userId: "", companyId: "" }, // Invalid context
        "analyzer"
      );

      expect(response.primaryResponse).toBeTruthy();
      expect(response.metadata.orchestrationStrategy).toMatch(/error/);
    });
  });

  describe("Performance Metrics", () => {
    test("should track agent performance", async () => {
      await agentOrchestrator.processSingleAgent(
        "Test query for metrics",
        { userId: "test", companyId: "test" },
        "tracker"
      );

      const metrics = agentOrchestrator.getPerformanceMetrics();
      expect(metrics.tracker).toBeDefined();
      expect(metrics.tracker.totalQueries).toBeGreaterThan(0);
    });
  });
});
