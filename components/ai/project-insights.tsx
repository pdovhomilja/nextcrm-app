"use client";

// import { experimental_useObject as useObject } from '@ai-sdk/react';
import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
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
} from "lucide-react";
import { z } from 'zod/v3';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const analysisSchema = z.object({
  overview: z.object({
    summary: z.string(),
    healthScore: z.number().min(0).max(100),
    status: z.enum(["excellent", "good", "fair", "poor", "critical"]),
    lastAnalyzed: z.string(),
  }),
  insights: z.array(
    z.object({
      category: z.enum([
        "performance",
        "workload",
        "timeline",
        "quality",
        "resources",
      ]),
      title: z.string(),
      finding: z.string(),
      severity: z.enum(["info", "low", "medium", "high", "critical"]),
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
      direction: z.enum(["improving", "stable", "declining"]),
      change: z.number(),
      timeframe: z.string(),
    })
  ),
  recommendations: z.array(
    z.object({
      priority: z.enum(["low", "medium", "high", "critical"]),
      action: z.string(),
      reasoningText: z.string(),
      expectedImpact: z.string(),
    })
  ),
});

interface ProjectInsightsProps {
  boardId: string;
  analysisType?: "comprehensive" | "performance" | "team" | "timeline";
  autoRefresh?: boolean;
  className?: string;
}

const statusColors = {
  excellent: "text-green-600 bg-green-100",
  good: "text-blue-600 bg-blue-100",
  fair: "text-yellow-600 bg-yellow-100",
  poor: "text-orange-600 bg-orange-100",
  critical: "text-red-600 bg-red-100",
};

const severityIcons = {
  info: CheckCircle,
  low: Clock,
  medium: AlertTriangle,
  high: AlertTriangle,
  critical: AlertTriangle,
};

const severityColors = {
  info: "text-blue-500 bg-blue-50 border-blue-200",
  low: "text-gray-500 bg-gray-50 border-gray-200",
  medium: "text-yellow-500 bg-yellow-50 border-yellow-200",
  high: "text-orange-500 bg-orange-50 border-orange-200",
  critical: "text-red-500 bg-red-50 border-red-200",
};

const trendIcons = {
  improving: TrendingUp,
  stable: Activity,
  declining: TrendingDown,
};

export function ProjectInsights({
  boardId,
  analysisType = "comprehensive",
  autoRefresh = true,
  className,
}: ProjectInsightsProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastAnalysis, setLastAnalysis] = useState<Date>();
  const [activeTab, setActiveTab] = useState("insights");

  // Temporary static data until streaming is properly implemented
  const [object, setObject] = useState<z.infer<typeof analysisSchema> | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);

  const runAnalysis = useCallback(async () => {
    setIsAnalyzing(true);
    setIsLoading(true);
    try {
      const response = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          boardId,
          analysisType,
          timeRange: "month",
        }),
      });

      if (response.ok) {
        //TODO: For now, set mock data until the streaming API is working
        setObject({
          overview: {
            summary:
              "Your project is performing well with room for improvement in task completion rates.",
            healthScore: 75,
            status: "good" as const,
            lastAnalyzed: new Date().toISOString(),
          },
          insights: [
            {
              category: "performance" as const,
              title: "Task Completion Rate",
              finding:
                "Current completion rate is 68%, which is below the recommended 80%.",
              severity: "medium" as const,
              recommendation:
                "Focus on clearing overdue tasks and improving team velocity.",
              confidence: 0.85,
            },
          ],
          metrics: {
            completionRate: 0.68,
            averageTaskDuration: 4.2,
            teamEfficiency: 0.82,
            bottlenecks: ["Review Process", "Resource Allocation"],
            upcomingDeadlines: 3,
            overdueTasks: 5,
          },
          trends: [
            {
              metric: "Completion Rate",
              direction: "improving" as const,
              change: 12,
              timeframe: "last month",
            },
          ],
          recommendations: [
            {
              priority: "high" as const,
              action: "Address overdue tasks",
              reasoningText: "Five overdue tasks are blocking team progress.",
              expectedImpact: "Should improve completion rate by 15%",
            },
          ],
        });
      }
      setLastAnalysis(new Date());
    } catch (error) {
      console.error("Analysis failed:", error);
    } finally {
      setIsAnalyzing(false);
      setIsLoading(false);
    }
  }, [boardId, analysisType]);

  useEffect(() => {
    runAnalysis();
  }, [runAnalysis]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(runAnalysis, 600000); // 10 minutes
    return () => clearInterval(interval);
  }, [autoRefresh, runAnalysis]);

  const getHealthColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    if (score >= 40) return "text-orange-600";
    return "text-red-600";
  };

  const tabs = [
    { id: "insights", label: "Insights", icon: AlertTriangle },
    { id: "metrics", label: "Metrics", icon: BarChart3 },
    { id: "trends", label: "Trends", icon: TrendingUp },
    { id: "actions", label: "Actions", icon: Zap },
  ];

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
                <RefreshCw
                  className={`h-4 w-4 ${isLoading || isAnalyzing ? "animate-spin" : ""}`}
                />
              </Button>
            </div>
          </div>
        </CardHeader>

        {object?.overview && (
          <CardContent>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div
                  className={`text-3xl font-bold ${getHealthColor(object.overview.healthScore)}`}
                >
                  {object.overview.healthScore}
                </div>
                <div>
                  <Badge className={statusColors[object.overview.status]}>
                    {object.overview.status}
                  </Badge>
                  <p className="text-sm text-gray-600 mt-1">Health Score</p>
                </div>
              </div>
              <Progress value={object.overview.healthScore} className="w-32" />
            </div>
            <p className="text-sm text-gray-700">{object.overview.summary}</p>
          </CardContent>
        )}
      </Card>
      {/* Tabs */}
      <div className="border-b">
        <div className="flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>
      {/* Tab Content */}
      <div className="space-y-4">
        {/* Insights Tab */}
        {activeTab === "insights" && (
          <>
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
                      <div
                        className={`p-2 rounded-full ${severityColors[insight.severity]}`}
                      >
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
                        <p className="text-sm text-gray-700 mb-3">
                          {insight.finding}
                        </p>
                        <div className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded">
                          <p className="text-sm text-blue-800">
                            <strong>Recommendation:</strong>{" "}
                            {insight.recommendation}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </>
        )}

        {/* Metrics Tab */}
        {activeTab === "metrics" && object?.metrics && (
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
                  <span className="text-sm font-medium">
                    Upcoming Deadlines
                  </span>
                </div>
                <div className="text-2xl font-bold text-orange-600">
                  {object.metrics.upcomingDeadlines}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Trends Tab */}
        {activeTab === "trends" &&
          object?.trends?.map((trend, index) => {
            const TrendIcon = trendIcons[trend.direction];
            const trendColor =
              trend.direction === "improving"
                ? "text-green-600"
                : trend.direction === "declining"
                  ? "text-red-600"
                  : "text-gray-600";

            return (
              <Card key={index}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <TrendIcon className={`h-5 w-5 ${trendColor}`} />
                      <div>
                        <h4 className="font-medium">{trend.metric}</h4>
                        <p className="text-sm text-gray-600">
                          {trend.change > 0 ? "+" : ""}
                          {trend.change}% over {trend.timeframe}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        trend.direction === "improving"
                          ? "border-green-500 text-green-700"
                          : trend.direction === "declining"
                            ? "border-red-500 text-red-700"
                            : "border-gray-500"
                      }
                    >
                      {trend.direction}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}

        {/* Actions Tab */}
        {activeTab === "actions" &&
          object?.recommendations?.map((rec, index) => (
            <Card key={index}>
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <div
                    className={`p-2 rounded-full ${
                      rec.priority === "critical"
                        ? "bg-red-100 text-red-600"
                        : rec.priority === "high"
                          ? "bg-orange-100 text-orange-600"
                          : rec.priority === "medium"
                            ? "bg-yellow-100 text-yellow-600"
                            : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    <Zap className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium">{rec.action}</h4>
                      <Badge
                        variant="outline"
                        className={
                          rec.priority === "critical"
                            ? "border-red-500 text-red-700"
                            : rec.priority === "high"
                              ? "border-orange-500 text-orange-700"
                              : rec.priority === "medium"
                                ? "border-yellow-500 text-yellow-700"
                                : "border-gray-500 text-gray-700"
                        }
                      >
                        {rec.priority}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-700 mb-2">
                      {rec.reasoningText}
                    </p>
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

        {/* Bottlenecks */}
        {activeTab === "metrics" &&
          object?.metrics?.bottlenecks &&
          object.metrics.bottlenecks.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Identified Bottlenecks
                </CardTitle>
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
      </div>
    </div>
  );
}
