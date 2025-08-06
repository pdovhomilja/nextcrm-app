# Phase 5: API & Interface Layer

## Overview
This phase creates the user-facing API endpoints and React components that provide seamless access to the AI-powered project management capabilities. It integrates MCP servers, RAG processing, and AI agents with modern UI patterns using Vercel AI SDK React hooks.

## Prerequisites
- Completed Phase 1-4: Full AI infrastructure operational
- MCP servers running and healthy
- AI agents initialized and functional
- RAG processing pipeline operational

## Implementation Batches

### Batch 5.1: AI API Endpoints

**Estimated Time**: 3-4 hours
**API Token Usage**: Medium

#### Tasks:
- [ ] Create streaming chat API with MCP integration
- [ ] Implement suggestions API with agent orchestration
- [ ] Add real-time analysis API with streaming
- [ ] Create agent management endpoints

#### Streaming Chat API:
Create `/app/api/ai/chat/route.ts`:

```typescript
import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";
import { auth } from "@/auth";
import { agentOrchestrator } from "@/lib/ai/agent-orchestrator";
import { ragProcessor } from "@/lib/ai/rag-processor";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { 
      messages, 
      boardId, 
      taskId, 
      agentType, 
      useRAG = true,
      multiAgent = false 
    } = await request.json();

    const lastMessage = messages[messages.length - 1];
    const userQuery = lastMessage.content;

    const context = {
      userId: session.user.id,
      companyId: session.user.cid!,
      boardId,
      taskId,
      conversationId: `conv-${session.user.id}-${Date.now()}`,
    };

    // Choose processing approach based on request
    let systemPrompt: string;
    let contextInfo = "";

    if (agentType || multiAgent) {
      // Use AI agent orchestration
      const orchestrationRequest = {
        query: userQuery,
        context,
        preferredAgent: agentType,
        multiAgentMode: multiAgent,
      };

      const agentResponse = await agentOrchestrator.orchestrate(orchestrationRequest);
      
      systemPrompt = `You are an intelligent project management assistant powered by specialized AI agents.

Agent Analysis: ${agentResponse.agentResponses.map(r => 
  `${r.agentRole}: ${r.response} (confidence: ${r.confidence})`
).join('\n')}

Based on the agent insights above, provide a comprehensive response to the user's query.`;

      contextInfo = agentResponse.coordinatedInsights || agentResponse.primaryResponse;

    } else if (useRAG) {
      // Use RAG processing
      const ragQuery = {
        query: userQuery,
        companyId: context.companyId,
        userId: context.userId,
        boardId: context.boardId,
        taskId: context.taskId,
      };

      const ragResponse = await ragProcessor.processQuery(ragQuery);

      systemPrompt = `You are an intelligent project management assistant with access to relevant project context.

Context Summary: ${ragResponse.contextSummary}

Relevant Information:
${ragResponse.sources.map(source => 
  `- ${source.title} (relevance: ${source.relevance}) from ${source.boardName}`
).join('\n')}

Based on the context above, provide helpful responses to project management queries.`;

      contextInfo = ragResponse.contextSummary;

    } else {
      // Direct chat without special context
      systemPrompt = `You are a helpful project management assistant. You help users with task management, project planning, and team coordination.

Provide clear, actionable advice based on project management best practices.`;
    }

    // Stream the response using Vercel AI SDK
    const result = await streamText({
      model: openai("gpt-4-turbo"),
      system: systemPrompt,
      messages: [
        ...messages.slice(0, -1), // Previous conversation
        {
          role: "user",
          content: contextInfo ? 
            `Context: ${contextInfo}\n\nQuery: ${userQuery}` : 
            userQuery,
        },
      ],
      temperature: 0.7,
      maxTokens: 1000,
    });

    return result.toAIStreamResponse();

  } catch (error) {
    console.error("Chat API error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
```

#### Suggestions API:
Create `/app/api/ai/suggest/route.ts`:

```typescript
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { auth } from "@/auth";
import { AgentFactory } from "@/lib/ai/specialized-agents";
import { z } from "zod";
import { NextRequest } from "next/server";

const suggestionSchema = z.object({
  suggestions: z.array(
    z.object({
      id: z.string(),
      type: z.enum(["task", "assignment", "priority", "deadline", "optimization"]),
      title: z.string(),
      description: z.string(),
      reasoning: z.string(),
      confidence: z.number().min(0).max(1),
      impact: z.enum(["low", "medium", "high"]),
      actionable: z.boolean(),
      metadata: z.object({
        boardId: z.string().optional(),
        taskId: z.string().optional(),
        userId: z.string().optional(),
        estimatedTime: z.string().optional(),
      }).optional(),
    })
  ).max(5),
  summary: z.string(),
  contextAnalysis: z.object({
    boardHealth: z.number().min(0).max(100).optional(),
    workloadBalance: z.number().min(0).max(1).optional(),
    urgentItems: z.number().optional(),
  }),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { 
      boardId, 
      taskId,
      suggestionType = "general",
      context: userContext 
    } = await request.json();

    const agentContext = {
      userId: session.user.id,
      companyId: session.user.cid!,
      boardId,
      taskId,
    };

    // Use appropriate agent based on suggestion type
    let agentType: "analyzer" | "recommender" | "tracker" | "optimizer";
    
    switch (suggestionType) {
      case "optimization":
        agentType = "optimizer";
        break;
      case "progress":
        agentType = "tracker";
        break;
      case "analysis":
        agentType = "analyzer";
        break;
      default:
        agentType = "recommender";
    }

    // Get agent-powered suggestions
    const agent = await AgentFactory.getAgent(agentType);
    
    let agentSuggestions = "";
    try {
      const agentResponse = await agent.processQuery(
        `Generate actionable suggestions for ${suggestionType} improvement`,
        agentContext
      );
      agentSuggestions = agentResponse.response;
    } catch (error) {
      console.error("Agent suggestion error:", error);
      agentSuggestions = "Unable to get agent recommendations";
    }

    // Generate structured suggestions
    const result = await generateObject({
      model: openai("gpt-4-turbo"),
      system: `You are a project management expert that provides actionable suggestions based on current project data and AI agent analysis.

Agent Analysis: ${agentSuggestions}

Generate specific, actionable suggestions that users can implement immediately.`,
      prompt: `Based on the agent analysis and project context, generate ${suggestionType} suggestions for:
${boardId ? `Board: ${boardId}` : ""}
${taskId ? `Task: ${taskId}` : ""}
${userContext ? `Additional context: ${userContext}` : ""}

Focus on practical, implementable suggestions with clear reasoning.`,
      schema: suggestionSchema,
      temperature: 0.6,
    });

    return Response.json({
      success: true,
      data: result.object,
      meta: {
        agentType,
        timestamp: new Date().toISOString(),
        boardId,
        taskId,
      },
    });

  } catch (error) {
    console.error("Suggestions API error:", error);
    return Response.json(
      { success: false, error: "Failed to generate suggestions" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const boardId = searchParams.get("boardId");

    // Get quick suggestions for the user's current context
    const quickSuggestions = await generateObject({
      model: openai("gpt-4-turbo"),
      system: "Generate quick project management suggestions for the user's current context.",
      prompt: `Generate 3 quick suggestions for project management improvement:
${boardId ? `Board context: ${boardId}` : "General context"}
User: ${session.user.name || session.user.email}`,
      schema: z.object({
        suggestions: z.array(
          z.object({
            title: z.string(),
            description: z.string(),
            type: z.enum(["task", "priority", "organization"]),
          })
        ).length(3),
      }),
      temperature: 0.7,
    });

    return Response.json({
      success: true,
      data: quickSuggestions.object,
    });

  } catch (error) {
    console.error("Quick suggestions error:", error);
    return Response.json(
      { success: false, error: "Failed to get suggestions" },
      { status: 500 }
    );
  }
}
```

#### Real-time Analysis API:
Create `/app/api/ai/analyze/route.ts`:

```typescript
import { streamObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { auth } from "@/auth";
import { AgentFactory } from "@/lib/ai/specialized-agents";
import { z } from "zod";
import { NextRequest } from "next/server";

const analysisSchema = z.object({
  overview: z.object({
    summary: z.string(),
    healthScore: z.number().min(0).max(100),
    status: z.enum(["excellent", "good", "fair", "poor", "critical"]),
    lastAnalyzed: z.string(),
  }),
  insights: z.array(
    z.object({
      category: z.enum(["performance", "workload", "timeline", "quality", "resources"]),
      title: z.string(),
      finding: z.string(),
      severity: z.enum(["info", "low", "medium", "high", "critical"]),
      recommendation: z.string(),
      confidence: z.number().min(0).max(1),
    })
  ).max(8),
  metrics: z.object({
    completionRate: z.number().min(0).max(1),
    averageTaskDuration: z.number(),
    teamEfficiency: z.number().min(0).max(1),
    bottlenecks: z.array(z.string()).max(5),
    upcomingDeadlines: z.number(),
    overdueTasks: z.number(),
  }),
  trends: z.array(
    z.object({
      metric: z.string(),
      direction: z.enum(["improving", "stable", "declining"]),
      change: z.number(),
      timeframe: z.string(),
    })
  ).max(5),
  recommendations: z.array(
    z.object({
      priority: z.enum(["low", "medium", "high", "critical"]),
      action: z.string(),
      reasoning: z.string(),
      expectedImpact: z.string(),
    })
  ).max(6),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { 
      boardId, 
      analysisType = "comprehensive",
      timeRange = "month" 
    } = await request.json();

    const agentContext = {
      userId: session.user.id,
      companyId: session.user.cid!,
      boardId,
    };

    // Get analysis from specialized agent
    const analyzer = await AgentFactory.getAgent("analyzer");
    
    // Stream the analysis as it's generated
    const result = await streamObject({
      model: openai("gpt-4-turbo"),
      system: `You are a project analytics expert providing real-time insights and analysis.

Generate comprehensive project analysis with actionable insights and recommendations.

Current timestamp: ${new Date().toISOString()}
Analysis scope: ${analysisType}
Time range: ${timeRange}`,
      prompt: `Perform ${analysisType} analysis for project:
${boardId ? `Board ID: ${boardId}` : "Company-wide analysis"}

Provide detailed insights covering:
1. Project health and performance
2. Team workload and efficiency  
3. Timeline and milestone progress
4. Resource utilization
5. Risk factors and bottlenecks
6. Actionable recommendations

Focus on data-driven insights with specific metrics where possible.`,
      schema: analysisSchema,
      temperature: 0.4, // Lower temperature for more consistent analysis
    });

    return result.toTextStreamResponse();

  } catch (error) {
    console.error("Analysis API error:", error);
    return new Response(
      JSON.stringify({ error: "Analysis failed" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const boardId = searchParams.get("boardId");

    // Get quick analysis summary
    const analyzer = await AgentFactory.getAgent("analyzer");
    
    const quickAnalysis = {
      healthScore: 75, // This would come from actual analysis
      status: "good" as const,
      keyMetrics: {
        completionRate: 0.68,
        overdueTasks: 3,
        teamEfficiency: 0.82,
      },
      topInsight: "Team velocity is improving but there are 3 overdue high-priority tasks requiring attention.",
      lastUpdated: new Date().toISOString(),
    };

    return Response.json({
      success: true,
      data: quickAnalysis,
    });

  } catch (error) {
    console.error("Quick analysis error:", error);
    return Response.json(
      { success: false, error: "Analysis unavailable" },
      { status: 500 }
    );
  }
}
```

### Batch 5.2: React UI Components with Vercel AI SDK

**Estimated Time**: 4-5 hours
**API Token Usage**: Low-Medium

#### Tasks:
- [ ] Create AI chat component with streaming
- [ ] Build smart suggestions widget
- [ ] Implement real-time project insights panel
- [ ] Add AI-powered task creation form

#### AI Chat Component:
Create `/components/ai/ai-assistant.tsx`:

```typescript
'use client';

import { useChat } from 'ai/react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  MessageCircle, 
  Send, 
  Loader2, 
  Bot, 
  User,
  Settings,
  Minimize2,
  Maximize2
} from 'lucide-react';

interface AIAssistantProps {
  boardId?: string;
  taskId?: string;
  initialMode?: 'chat' | 'suggestions' | 'analysis';
  className?: string;
}

export function AIAssistant({ 
  boardId, 
  taskId, 
  initialMode = 'chat',
  className 
}: AIAssistantProps) {
  const [mode, setMode] = useState<'single' | 'multi'>('single');
  const [agentType, setAgentType] = useState<'analyzer' | 'recommender' | 'tracker' | 'optimizer'>('recommender');
  const [useRAG, setUseRAG] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const { messages, input, handleInputChange, handleSubmit, isLoading, setMessages } = useChat({
    api: '/api/ai/chat',
    body: {
      boardId,
      taskId,
      agentType: mode === 'single' ? agentType : undefined,
      useRAG,
      multiAgent: mode === 'multi',
    },
    initialMessages: [
      {
        id: 'welcome',
        role: 'assistant',
        content: `Hello! I'm your AI project management assistant. I can help you with:

🔍 **Project Analysis** - Health checks, bottleneck identification
📋 **Task Recommendations** - Prioritization and assignment suggestions  
📊 **Progress Tracking** - Milestone monitoring and forecasts
⚡ **Resource Optimization** - Workload balancing and efficiency

${boardId ? `I can see you're working on a specific board. ` : ''}${taskId ? `I notice you have a task selected. ` : ''}How can I help you today?`,
      },
    ],
  });

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    handleSubmit(e);
  };

  const clearChat = () => {
    setMessages([]);
  };

  if (isMinimized) {
    return (
      <Card className={`fixed bottom-4 right-4 w-16 h-16 cursor-pointer ${className}`}>
        <CardContent className="flex items-center justify-center h-full p-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMinimized(false)}
            className="h-full w-full"
          >
            <MessageCircle className="h-6 w-6" />
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`fixed bottom-4 right-4 w-96 h-[600px] flex flex-col shadow-2xl ${className}`}>
      <CardHeader className="pb-3 border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bot className="h-5 w-5 text-blue-500" />
            AI Assistant
            {mode === 'multi' && <Badge variant="secondary">Multi-Agent</Badge>}
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
            >
              <Settings className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMinimized(true)}
            >
              <Minimize2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {showSettings && (
          <div className="mt-3 p-3 bg-gray-50 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Mode</label>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as 'single' | 'multi')}
                className="text-sm border rounded px-2 py-1"
              >
                <option value="single">Single Agent</option>
                <option value="multi">Multi-Agent</option>
              </select>
            </div>

            {mode === 'single' && (
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Agent</label>
                <select
                  value={agentType}
                  onChange={(e) => setAgentType(e.target.value as any)}
                  className="text-sm border rounded px-2 py-1"
                >
                  <option value="analyzer">Analyzer</option>
                  <option value="recommender">Recommender</option>
                  <option value="tracker">Tracker</option>
                  <option value="optimizer">Optimizer</option>
                </select>
              </div>
            )}

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Use Context</label>
              <input
                type="checkbox"
                checked={useRAG}
                onChange={(e) => setUseRAG(e.target.checked)}
                className="rounded"
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={clearChat}
                className="flex-1"
              >
                Clear Chat
              </Button>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0">
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`flex gap-2 max-w-[80%] ${
                    message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                  }`}
                >
                  <div
                    className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                      message.role === 'user'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {message.role === 'user' ? (
                      <User className="h-4 w-4" />
                    ) : (
                      <Bot className="h-4 w-4" />
                    )}
                  </div>
                  <div
                    className={`p-3 rounded-lg ${
                      message.role === 'user'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <div className="text-sm whitespace-pre-wrap">
                      {message.content}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex items-center gap-2 text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">AI is thinking...</span>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="border-t p-4">
          <form onSubmit={onSubmit} className="flex gap-2">
            <Input
              value={input}
              onChange={handleInputChange}
              placeholder="Ask about your project..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button
              type="submit"
              size="sm"
              disabled={!input.trim() || isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}
```

#### Smart Suggestions Component:
Create `/components/ai/smart-suggestions.tsx`:

```typescript
'use client';

import { useCompletion } from 'ai/react';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Lightbulb, 
  RefreshCw, 
  ChevronRight,
  Clock,
  User,
  Target,
  Zap,
  CheckCircle
} from 'lucide-react';

interface SmartSuggestionsProps {
  boardId?: string;
  taskId?: string;
  suggestionType?: 'general' | 'optimization' | 'progress' | 'analysis';
  autoRefresh?: boolean;
  className?: string;
}

interface Suggestion {
  id: string;
  type: 'task' | 'assignment' | 'priority' | 'deadline' | 'optimization';
  title: string;
  description: string;
  reasoning: string;
  confidence: number;
  impact: 'low' | 'medium' | 'high';
  actionable: boolean;
  metadata?: {
    boardId?: string;
    taskId?: string;
    userId?: string;
    estimatedTime?: string;
  };
}

const typeIcons = {
  task: Target,
  assignment: User,
  priority: Zap,
  deadline: Clock,
  optimization: RefreshCw,
};

const impactColors = {
  low: 'bg-gray-100 text-gray-700',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-red-100 text-red-800',
};

export function SmartSuggestions({
  boardId,
  taskId,
  suggestionType = 'general',
  autoRefresh = false,
  className,
}: SmartSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>();
  const [implementedSuggestions, setImplementedSuggestions] = useState<Set<string>>(new Set());

  const { complete, completion, isLoading: isGenerating } = useCompletion({
    api: '/api/ai/suggest',
  });

  const fetchSuggestions = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/ai/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          boardId,
          taskId,
          suggestionType,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.data.suggestions || []);
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error('Failed to fetch suggestions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSuggestions();
  }, [boardId, taskId, suggestionType]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(fetchSuggestions, 300000); // 5 minutes
    return () => clearInterval(interval);
  }, [autoRefresh, boardId, taskId]);

  const markAsImplemented = (suggestionId: string) => {
    setImplementedSuggestions(prev => new Set([...prev, suggestionId]));
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-yellow-500" />
            AI Suggestions
            <Badge variant="outline" className="ml-2">
              {suggestions.length}
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            {lastUpdated && (
              <span className="text-xs text-gray-500">
                {lastUpdated.toLocaleTimeString()}
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={fetchSuggestions}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {suggestions.length === 0 && !isLoading && (
          <div className="text-center py-8 text-gray-500">
            <Lightbulb className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No suggestions available</p>
            <p className="text-sm">Check back later for AI-powered insights</p>
          </div>
        )}

        {isLoading && (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        )}

        {suggestions.map((suggestion) => {
          const Icon = typeIcons[suggestion.type];
          const isImplemented = implementedSuggestions.has(suggestion.id);

          return (
            <div
              key={suggestion.id}
              className={`border rounded-lg p-4 transition-all ${
                isImplemented ? 'opacity-50 bg-green-50 border-green-200' : 'hover:shadow-sm'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  {isImplemented ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <Icon className="h-5 w-5 text-blue-500" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-medium text-sm">{suggestion.title}</h4>
                    <Badge
                      variant="secondary"
                      className={`text-xs ${impactColors[suggestion.impact]}`}
                    >
                      {suggestion.impact} impact
                    </Badge>
                    <span className={`text-xs font-medium ${getConfidenceColor(suggestion.confidence)}`}>
                      {Math.round(suggestion.confidence * 100)}%
                    </span>
                  </div>

                  <p className="text-sm text-gray-600 mb-2">
                    {suggestion.description}
                  </p>

                  <details className="text-xs text-gray-500">
                    <summary className="cursor-pointer hover:text-gray-700">
                      Why this suggestion?
                    </summary>
                    <p className="mt-1 ml-4">{suggestion.reasoning}</p>
                  </details>

                  {suggestion.metadata?.estimatedTime && (
                    <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                      <Clock className="h-3 w-3" />
                      <span>Est. {suggestion.metadata.estimatedTime}</span>
                    </div>
                  )}
                </div>

                {!isImplemented && suggestion.actionable && (
                  <div className="flex flex-col gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => markAsImplemented(suggestion.id)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {suggestions.length > 0 && (
          <div className="pt-2 border-t">
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchSuggestions}
              className="w-full text-xs"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Refresh suggestions
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

### Batch 5.3: Project Insights Dashboard

**Estimated Time**: 3-4 hours
**API Token Usage**: Medium

#### Tasks:
- [ ] Create real-time insights panel with streaming
- [ ] Implement interactive metrics dashboard
- [ ] Add trend visualization components
- [ ] Create actionable recommendations widget

#### Project Insights Component:
Create `/components/ai/project-insights.tsx`:

```typescript
'use client';

import { experimental_useObject as useObject } from 'ai/react';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Activity,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
  Target,
  BarChart3,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { z } from 'zod';

const analysisSchema = z.object({
  overview: z.object({
    summary: z.string(),
    healthScore: z.number().min(0).max(100),
    status: z.enum(['excellent', 'good', 'fair', 'poor', 'critical']),
    lastAnalyzed: z.string(),
  }),
  insights: z.array(
    z.object({
      category: z.enum(['performance', 'workload', 'timeline', 'quality', 'resources']),
      title: z.string(),
      finding: z.string(),
      severity: z.enum(['info', 'low', 'medium', 'high', 'critical']),
      recommendation: z.string(),
      confidence: z.number().min(0).max(1),
    })
  ),
  metrics: z.object({
    completionRate: z.number().min(0).max(1),
    averageTaskDuration: z.number(),
    teamEfficiency: z.number().min(0).max(1),
    bottlenecks: z.array(z.string()),
    upcomingDeadlines: z.number(),
    overdueTasks: z.number(),
  }),
  trends: z.array(
    z.object({
      metric: z.string(),
      direction: z.enum(['improving', 'stable', 'declining']),
      change: z.number(),
      timeframe: z.string(),
    })
  ),
  recommendations: z.array(
    z.object({
      priority: z.enum(['low', 'medium', 'high', 'critical']),
      action: z.string(),
      reasoning: z.string(),
      expectedImpact: z.string(),
    })
  ),
});

interface ProjectInsightsProps {
  boardId: string;
  analysisType?: 'comprehensive' | 'performance' | 'team' | 'timeline';
  autoRefresh?: boolean;
  className?: string;
}

const statusColors = {
  excellent: 'text-green-600 bg-green-100',
  good: 'text-blue-600 bg-blue-100',
  fair: 'text-yellow-600 bg-yellow-100',
  poor: 'text-orange-600 bg-orange-100',
  critical: 'text-red-600 bg-red-100',
};

const severityIcons = {
  info: CheckCircle,
  low: Clock,
  medium: AlertTriangle,
  high: AlertTriangle,
  critical: AlertTriangle,
};

const severityColors = {
  info: 'text-blue-500 bg-blue-50 border-blue-200',
  low: 'text-gray-500 bg-gray-50 border-gray-200',
  medium: 'text-yellow-500 bg-yellow-50 border-yellow-200',
  high: 'text-orange-500 bg-orange-50 border-orange-200',
  critical: 'text-red-500 bg-red-50 border-red-200',
};

const trendIcons = {
  improving: TrendingUp,
  stable: Activity,
  declining: TrendingDown,
};

export function ProjectInsights({
  boardId,
  analysisType = 'comprehensive',
  autoRefresh = true,
  className,
}: ProjectInsightsProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastAnalysis, setLastAnalysis] = useState<Date>();

  const { object, submit, isLoading } = useObject({
    api: '/api/ai/analyze',
    schema: analysisSchema,
  });

  const runAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      await submit({
        boardId,
        analysisType,
        timeRange: 'month',
      });
      setLastAnalysis(new Date());
    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    runAnalysis();
  }, [boardId, analysisType]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(runAnalysis, 600000); // 10 minutes
    return () => clearInterval(interval);
  }, [autoRefresh, boardId]);

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-500" />
              Project Analysis
            </CardTitle>
            <div className="flex items-center gap-2">
              {lastAnalysis && (
                <span className="text-xs text-gray-500">
                  Updated {lastAnalysis.toLocaleTimeString()}
                </span>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={runAnalysis}
                disabled={isLoading || isAnalyzing}
              >
                <RefreshCw className={`h-4 w-4 ${(isLoading || isAnalyzing) ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>

        {object?.overview && (
          <CardContent>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`text-3xl font-bold ${getHealthColor(object.overview.healthScore)}`}>
                  {object.overview.healthScore}
                </div>
                <div>
                  <Badge className={statusColors[object.overview.status]}>
                    {object.overview.status}
                  </Badge>
                  <p className="text-sm text-gray-600 mt-1">Health Score</p>
                </div>
              </div>
              <Progress
                value={object.overview.healthScore}
                className="w-32"
              />
            </div>
            <p className="text-sm text-gray-700">{object.overview.summary}</p>
          </CardContent>
        )}
      </Card>

      {/* Main Content Tabs */}
      <Tabs defaultValue="insights" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="insights">Insights</TabsTrigger>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="actions">Actions</TabsTrigger>
        </TabsList>

        {/* Insights Tab */}
        <TabsContent value="insights" className="space-y-4">
          {isLoading && (
            <Card>
              <CardContent className="pt-6">
                <div className="animate-pulse space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {object?.insights?.map((insight, index) => {
            const SeverityIcon = severityIcons[insight.severity];
            return (
              <Card key={index}>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-full ${severityColors[insight.severity]}`}>
                      <SeverityIcon className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium">{insight.title}</h4>
                        <Badge variant="outline" className="text-xs">
                          {insight.category}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {Math.round(insight.confidence * 100)}% confidence
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 mb-3">{insight.finding}</p>
                      <div className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded">
                        <p className="text-sm text-blue-800">
                          <strong>Recommendation:</strong> {insight.recommendation}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        {/* Metrics Tab */}
        <TabsContent value="metrics" className="space-y-4">
          {object?.metrics && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="h-4 w-4 text-green-500" />
                    <span className="text-sm font-medium">Completion Rate</span>
                  </div>
                  <div className="text-2xl font-bold">
                    {Math.round(object.metrics.completionRate * 100)}%
                  </div>
                  <Progress
                    value={object.metrics.completionRate * 100}
                    className="mt-2"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="h-4 w-4 text-blue-500" />
                    <span className="text-sm font-medium">Team Efficiency</span>
                  </div>
                  <div className="text-2xl font-bold">
                    {Math.round(object.metrics.teamEfficiency * 100)}%
                  </div>
                  <Progress
                    value={object.metrics.teamEfficiency * 100}
                    className="mt-2"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4 text-yellow-500" />
                    <span className="text-sm font-medium">Avg Task Duration</span>
                  </div>
                  <div className="text-2xl font-bold">
                    {object.metrics.averageTaskDuration.toFixed(1)} days
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    <span className="text-sm font-medium">Overdue Tasks</span>
                  </div>
                  <div className="text-2xl font-bold text-red-600">
                    {object.metrics.overdueTasks}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4 text-orange-500" />
                    <span className="text-sm font-medium">Upcoming Deadlines</span>
                  </div>
                  <div className="text-2xl font-bold text-orange-600">
                    {object.metrics.upcomingDeadlines}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {object?.metrics?.bottlenecks && object.metrics.bottlenecks.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Identified Bottlenecks</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {object.metrics.bottlenecks.map((bottleneck, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      <span className="text-sm">{bottleneck}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-4">
          {object?.trends?.map((trend, index) => {
            const TrendIcon = trendIcons[trend.direction];
            const trendColor = trend.direction === 'improving' ? 'text-green-600' :
                              trend.direction === 'declining' ? 'text-red-600' : 'text-gray-600';
            
            return (
              <Card key={index}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <TrendIcon className={`h-5 w-5 ${trendColor}`} />
                      <div>
                        <h4 className="font-medium">{trend.metric}</h4>
                        <p className="text-sm text-gray-600">
                          {trend.change > 0 ? '+' : ''}{trend.change}% over {trend.timeframe}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={trend.direction === 'improving' ? 'border-green-500 text-green-700' :
                                 trend.direction === 'declining' ? 'border-red-500 text-red-700' : 'border-gray-500'}
                    >
                      {trend.direction}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        {/* Actions Tab */}
        <TabsContent value="actions" className="space-y-4">
          {object?.recommendations?.map((rec, index) => (
            <Card key={index}>
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-full ${
                    rec.priority === 'critical' ? 'bg-red-100 text-red-600' :
                    rec.priority === 'high' ? 'bg-orange-100 text-orange-600' :
                    rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-600' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    <Zap className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium">{rec.action}</h4>
                      <Badge
                        variant="outline"
                        className={
                          rec.priority === 'critical' ? 'border-red-500 text-red-700' :
                          rec.priority === 'high' ? 'border-orange-500 text-orange-700' :
                          rec.priority === 'medium' ? 'border-yellow-500 text-yellow-700' :
                          'border-gray-500 text-gray-700'
                        }
                      >
                        {rec.priority}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-700 mb-2">{rec.reasoning}</p>
                    <div className="bg-green-50 border-l-4 border-green-400 p-3 rounded">
                      <p className="text-sm text-green-800">
                        <strong>Expected Impact:</strong> {rec.expectedImpact}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

## Testing & Integration

### Batch 5.4: Component Integration & Testing

**Estimated Time**: 2-3 hours
**API Token Usage**: Low

#### Tasks:
- [ ] Create component integration examples
- [ ] Add error boundary handling
- [ ] Implement loading states and fallbacks
- [ ] Create usage documentation

#### Integration Example:
Create `/app/(app)/[cid]/tasks/[boardId]/page.tsx` enhancement:

```typescript
// Add to existing board page
import { AIAssistant } from '@/components/ai/ai-assistant';
import { SmartSuggestions } from '@/components/ai/smart-suggestions';
import { ProjectInsights } from '@/components/ai/project-insights';

// Add to the existing page component
export default function BoardPage({ params }: { params: { cid: string; boardId: string } }) {
  // ... existing code ...

  return (
    <div className="container mx-auto p-6">
      {/* Existing board content */}
      
      {/* AI Enhancement Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        <div className="lg:col-span-2">
          <ProjectInsights 
            boardId={params.boardId}
            analysisType="comprehensive"
          />
        </div>
        <div>
          <SmartSuggestions 
            boardId={params.boardId}
            suggestionType="general"
            autoRefresh={true}
          />
        </div>
      </div>

      {/* Floating AI Assistant */}
      <AIAssistant 
        boardId={params.boardId}
        initialMode="chat"
      />
    </div>
  );
}
```

## Success Criteria

- [ ] Chat API streams responses smoothly with proper context
- [ ] Suggestions API returns relevant, actionable recommendations
- [ ] Analysis API provides real-time insights with streaming
- [ ] React components integrate seamlessly with existing UI
- [ ] Error handling provides graceful degradation
- [ ] Performance remains optimal with AI features enabled
- [ ] User experience is intuitive and responsive
- [ ] All components work across different screen sizes

## Next Steps

After completing Phase 5:
1. Proceed to Phase 6: Advanced Features & Production
2. Conduct user testing with AI-enhanced interface
3. Optimize API response times and component performance
4. Gather feedback for UX improvements

## Troubleshooting

### Common Issues:
- **Streaming interruption**: Check network stability and API timeout settings
- **Component state sync**: Ensure proper cleanup of AI hooks
- **Performance degradation**: Monitor component re-renders and API calls
- **UI layout issues**: Test responsive behavior with dynamic content

### Debug Commands:
```bash
# Test API endpoints directly
curl -X POST http://localhost:3000/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"test"}]}'

# Check component performance
# Use React DevTools Profiler

# Monitor API response times
# Check Network tab in browser DevTools
```