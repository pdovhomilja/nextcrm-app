import { BaseAIAgent, AgentContext, AgentMessage } from "./agent-core";
import { generateObject } from "ai";
import { aiConfig } from "./config";
import { z } from "zod";

/**
 * Project Analyzer Agent - Specializes in project health analysis
 */
export class ProjectAnalyzerAgent extends BaseAIAgent {
  constructor() {
    super("project-analyzer", "Project Analyzer", [
      "project_health_analysis",
      "bottleneck_identification",
      "performance_metrics",
      "trend_analysis",
      "risk_assessment",
    ]);
  }

  /**
   * Perform comprehensive project analysis
   */
  async analyzeProjectHealth(
    boardId: string,
    context: AgentContext
  ): Promise<{
    healthScore: number;
    insights: Array<{
      category: string;
      finding: string;
      severity: "low" | "medium" | "high" | "critical";
      recommendation: string;
    }>;
    metrics: {
      completionRate: number;
      avgTaskDuration: number;
      teamEfficiency: number;
      bottlenecks: string[];
    };
  }> {
    try {
      // Use MCP analytics tools to gather data
      const analyticsResult = await this.orchestrateTools(
        `Analyze project health for board ${boardId}`,
        { ...context, boardId },
        ["analytics_analyze_project_health", "search_semantic_search_tasks"]
      );

      // Generate structured analysis
      const analysisResult = await generateObject({
        model: aiConfig.structuredOutputModel,
        system: `You are a project health analysis expert. Analyze the provided data and generate comprehensive insights.`,
        prompt: `Analyze this project data and provide health assessment:
        
Tool results: ${JSON.stringify(analyticsResult.results, null, 2)}

Provide detailed analysis with actionable insights.`,
        schema: z.object({
          healthScore: z.number().min(0).max(100),
          insights: z.array(
            z.object({
              category: z.string(),
              finding: z.string(),
              severity: z.enum(["low", "medium", "high", "critical"]),
              recommendation: z.string(),
            })
          ),
          metrics: z.object({
            completionRate: z.number().min(0).max(1),
            avgTaskDuration: z.number(),
            teamEfficiency: z.number().min(0).max(1),
            bottlenecks: z.array(z.string()),
          }),
        }),
        temperature: 0.4,
      });

      return analysisResult.object;
    } catch (error) {
      console.error("Project analysis error:", error);
      throw error;
    }
  }

  /**
   * Override decision making for project analysis queries
   */
  protected async makeDecision(
    query: string,
    context: AgentContext,
    history: AgentMessage[]
  ) {
    const queryLower = query.toLowerCase();

    // Always use tools for analysis queries
    if (
      queryLower.includes("analyze") ||
      queryLower.includes("health") ||
      queryLower.includes("performance")
    ) {
      return {
        action: "use_tools" as const,
        reasoning:
          "Project analysis requires data gathering from analytics tools",
        confidence: 0.9,
        toolsToUse: [
          "analytics_analyze_project_health",
          "search_semantic_search_tasks",
        ],
        responseStrategy: "analytical" as const,
      };
    }

    return super.makeDecision(query, context, history);
  }
}

/**
 * Task Recommender Agent - Specializes in task prioritization and recommendations
 */
export class TaskRecommenderAgent extends BaseAIAgent {
  constructor() {
    super("task-recommender", "Task Recommender", [
      "task_prioritization",
      "assignment_optimization",
      "workload_balancing",
      "skill_matching",
      "deadline_optimization",
    ]);
  }

  /**
   * Generate task recommendations
   */
  async generateTaskRecommendations(
    userId: string,
    context: AgentContext,
    criteria: string[] = ["priority", "skill_match", "workload"]
  ): Promise<{
    recommendations: Array<{
      type:
        | "create_task"
        | "reassign_task"
        | "adjust_priority"
        | "extend_deadline";
      taskId?: string;
      title: string;
      description: string;
      reasoning: string;
      confidence: number;
      estimatedImpact: "low" | "medium" | "high";
    }>;
    workloadAnalysis: {
      currentCapacity: number;
      recommendedTasks: number;
      balanceScore: number;
    };
  }> {
    try {
      // Get user's current tasks and workload
      const userTasksResult = await this.orchestrateTools(
        `Get current tasks and workload for user ${userId}`,
        { ...context, taskId: userId },
        ["tasks_search_tasks", "search_find_similar_tasks"]
      );

      // Generate recommendations
      const recommendationResult = await generateObject({
        model: aiConfig.structuredOutputModel,
        system: `You are a task recommendation expert. Analyze user workload and project needs to suggest optimal task assignments and priorities.`,
        prompt: `Based on this user's current workload, generate task recommendations:

User data: ${JSON.stringify(userTasksResult.results, null, 2)}
Criteria: ${criteria.join(", ")}

Generate specific, actionable recommendations for task management.`,
        schema: z.object({
          recommendations: z
            .array(
              z.object({
                type: z.enum([
                  "create_task",
                  "reassign_task",
                  "adjust_priority",
                  "extend_deadline",
                ]),
                taskId: z.string().optional(),
                title: z.string(),
                description: z.string(),
                reasoning: z.string(),
                confidence: z.number().min(0).max(1),
                estimatedImpact: z.enum(["low", "medium", "high"]),
              })
            )
            .max(5),
          workloadAnalysis: z.object({
            currentCapacity: z.number().min(0).max(1),
            recommendedTasks: z.number(),
            balanceScore: z.number().min(0).max(1),
          }),
        }),
        temperature: 0.5,
      });

      return recommendationResult.object;
    } catch (error) {
      console.error("Task recommendation error:", error);
      throw error;
    }
  }

  /**
   * Override decision making for recommendation queries
   */
  protected async makeDecision(
    query: string,
    context: AgentContext,
    history: AgentMessage[]
  ) {
    const queryLower = query.toLowerCase();

    if (
      queryLower.includes("recommend") ||
      queryLower.includes("suggest") ||
      queryLower.includes("should")
    ) {
      return {
        action: "use_tools" as const,
        reasoning:
          "Recommendations require analysis of current tasks and workload",
        confidence: 0.85,
        toolsToUse: ["tasks_search_tasks", "search_find_similar_tasks"],
        responseStrategy: "tool_orchestrated" as const,
      };
    }

    return super.makeDecision(query, context, history);
  }
}

/**
 * Progress Tracker Agent - Specializes in monitoring project progress
 */
export class ProgressTrackerAgent extends BaseAIAgent {
  constructor() {
    super("progress-tracker", "Progress Tracker", [
      "milestone_tracking",
      "deadline_monitoring",
      "velocity_calculation",
      "burndown_analysis",
      "completion_forecasting",
    ]);
  }

  /**
   * Track project progress
   */
  async trackProjectProgress(
    boardId: string,
    timeRange: "week" | "month" | "quarter",
    context: AgentContext
  ): Promise<{
    progressSummary: {
      completedTasks: number;
      totalTasks: number;
      completionRate: number;
      onTrackMilestones: number;
      delayedMilestones: number;
    };
    trends: Array<{
      metric: string;
      direction: "up" | "down" | "stable";
      change: number;
      significance: "low" | "medium" | "high";
    }>;
    forecasts: {
      estimatedCompletion: Date;
      confidenceInterval: { min: Date; max: Date };
      riskFactors: string[];
    };
  }> {
    try {
      // Gather progress data using MCP tools
      const progressData = await this.orchestrateTools(
        `Track progress for board ${boardId} over ${timeRange}`,
        { ...context, boardId },
        ["analytics_analyze_project_health", "tasks_search_tasks"]
      );

      // Generate progress analysis
      const progressResult = await generateObject({
        model: aiConfig.structuredOutputModel,
        system: `You are a project progress tracking expert. Analyze project data to provide progress insights and forecasts.`,
        prompt: `Analyze this project progress data:

Data: ${JSON.stringify(progressData.results, null, 2)}
Time range: ${timeRange}

Provide comprehensive progress tracking analysis.`,
        schema: z.object({
          progressSummary: z.object({
            completedTasks: z.number(),
            totalTasks: z.number(),
            completionRate: z.number().min(0).max(1),
            onTrackMilestones: z.number(),
            delayedMilestones: z.number(),
          }),
          trends: z.array(
            z.object({
              metric: z.string(),
              direction: z.enum(["up", "down", "stable"]),
              change: z.number(),
              significance: z.enum(["low", "medium", "high"]),
            })
          ),
          forecasts: z.object({
            estimatedCompletion: z.string(), // Will be converted to Date
            confidenceInterval: z.object({
              min: z.string(),
              max: z.string(),
            }),
            riskFactors: z.array(z.string()),
          }),
        }),
        temperature: 0.3,
      });

      // Convert string dates to Date objects
      const result = {
        ...progressResult.object,
        forecasts: {
          ...progressResult.object.forecasts,
          estimatedCompletion: new Date(
            progressResult.object.forecasts.estimatedCompletion
          ),
          confidenceInterval: {
            min: new Date(
              progressResult.object.forecasts.confidenceInterval.min
            ),
            max: new Date(
              progressResult.object.forecasts.confidenceInterval.max
            ),
          },
        },
      };

      return result;
    } catch (error) {
      console.error("Progress tracking error:", error);
      throw error;
    }
  }
}

/**
 * Resource Optimizer Agent - Specializes in resource allocation
 */
export class ResourceOptimizerAgent extends BaseAIAgent {
  constructor() {
    super("resource-optimizer", "Resource Optimizer", [
      "workload_optimization",
      "skill_allocation",
      "capacity_planning",
      "team_balancing",
      "resource_forecasting",
    ]);
  }

  /**
   * Optimize team resources
   */
  async optimizeTeamResources(
    teamIds: string[],
    optimizationType: "workload" | "skills" | "deadlines",
    context: AgentContext
  ): Promise<{
    optimizations: Array<{
      userId: string;
      userName: string;
      currentWorkload: number;
      recommendedWorkload: number;
      suggestedReassignments: Array<{
        taskId: string;
        taskTitle: string;
        fromUser: string;
        toUser: string;
        reasoning: string;
      }>;
    }>;
    teamMetrics: {
      totalCapacity: number;
      utilizedCapacity: number;
      balanceScore: number;
      bottlenecks: string[];
    };
  }> {
    try {
      // Get team workload data
      const teamData = await this.orchestrateTools(
        `Analyze team resource allocation for optimization type: ${optimizationType}`,
        context,
        ["tasks_search_tasks", "analytics_analyze_project_health"]
      );

      // Generate optimization recommendations
      const optimizationResult = await generateObject({
        model: aiConfig.structuredOutputModel,
        system: `You are a resource optimization expert. Analyze team workloads and suggest optimal resource allocation.`,
        prompt: `Optimize team resources based on this data:

Team data: ${JSON.stringify(teamData.results, null, 2)}
Optimization focus: ${optimizationType}
Team members: ${teamIds.join(", ")}

Provide specific resource optimization recommendations.`,
        schema: z.object({
          optimizations: z.array(
            z.object({
              userId: z.string(),
              userName: z.string(),
              currentWorkload: z.number().min(0).max(1),
              recommendedWorkload: z.number().min(0).max(1),
              suggestedReassignments: z.array(
                z.object({
                  taskId: z.string(),
                  taskTitle: z.string(),
                  fromUser: z.string(),
                  toUser: z.string(),
                  reasoning: z.string(),
                })
              ),
            })
          ),
          teamMetrics: z.object({
            totalCapacity: z.number(),
            utilizedCapacity: z.number(),
            balanceScore: z.number().min(0).max(1),
            bottlenecks: z.array(z.string()),
          }),
        }),
        temperature: 0.4,
      });

      return optimizationResult.object;
    } catch (error) {
      console.error("Resource optimization error:", error);
      throw error;
    }
  }
}

// Agent factory for creating specialized agents
export class AgentFactory {
  private static agents: Map<string, BaseAIAgent> = new Map();

  static async getAgent(
    agentType: "analyzer" | "recommender" | "tracker" | "optimizer"
  ): Promise<BaseAIAgent> {
    if (this.agents.has(agentType)) {
      return this.agents.get(agentType)!;
    }

    let agent: BaseAIAgent;

    switch (agentType) {
      case "analyzer":
        agent = new ProjectAnalyzerAgent();
        break;
      case "recommender":
        agent = new TaskRecommenderAgent();
        break;
      case "tracker":
        agent = new ProgressTrackerAgent();
        break;
      case "optimizer":
        agent = new ResourceOptimizerAgent();
        break;
      default:
        throw new Error(`Unknown agent type: ${agentType}`);
    }

    await agent.initialize();
    this.agents.set(agentType, agent);

    return agent;
  }

  static getAvailableAgents(): string[] {
    return ["analyzer", "recommender", "tracker", "optimizer"];
  }

  static async getAllAgents(): Promise<BaseAIAgent[]> {
    const agents = await Promise.all(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.getAvailableAgents().map((type) => this.getAgent(type as any))
    );
    return agents;
  }
}
