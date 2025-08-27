"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Lightbulb,
  RefreshCw,
  ChevronRight,
  Clock,
  User,
  Target,
  Zap,
  CheckCircle,
  MessageCircle,
  MessageSquare,
  Heart,
  Laptop,
  GraduationCap,
  TrendingUp,
} from "lucide-react";

interface SmartSuggestionsProps {
  boardId?: string;
  taskId?: string;
  suggestionType?: "general" | "optimization" | "progress" | "analysis";
  autoRefresh?: boolean;
  className?: string;
}

interface Suggestion {
  id: string;
  type:
    | "task"
    | "assignment"
    | "priority"
    | "deadline"
    | "optimization"
    | "communication"
    | "feedback"
    | "wellness"
    | "technology"
    | "skill"
    | "continuous_improvement";
  title: string;
  description: string;
  reasoningText: string;
  confidence: number;
  impact: "low" | "medium" | "high";
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
  communication: MessageCircle,
  feedback: MessageSquare,
  wellness: Heart,
  technology: Laptop,
  skill: GraduationCap,
  continuous_improvement: TrendingUp,
};

const impactColors = {
  low: "bg-gray-100 text-gray-700",
  medium: "bg-yellow-100 text-yellow-800",
  high: "bg-red-100 text-red-800",
};

export function SmartSuggestions({
  boardId,
  taskId,
  suggestionType = "general",
  autoRefresh = false,
  className,
}: SmartSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>();
  const [implementedSuggestions, setImplementedSuggestions] = useState<
    Set<string>
  >(new Set());

  const fetchSuggestions = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/ai/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
      console.error("Failed to fetch suggestions:", error);
    } finally {
      setIsLoading(false);
    }
  }, [boardId, taskId, suggestionType]);

  useEffect(() => {
    fetchSuggestions();
  }, [fetchSuggestions]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(fetchSuggestions, 300000); // 5 minutes
    return () => clearInterval(interval);
  }, [autoRefresh, fetchSuggestions]);

  const markAsImplemented = (suggestionId: string) => {
    setImplementedSuggestions((prev) => new Set([...prev, suggestionId]));
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return "text-green-600";
    if (confidence >= 0.6) return "text-yellow-600";
    return "text-red-600";
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
              <RefreshCw
                className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
              />
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
                isImplemented
                  ? "opacity-50 bg-green-50 border-green-200"
                  : "hover:shadow-sm"
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
                  <div className="mb-1">
                    <h4 className="font-medium text-sm">{suggestion.title}</h4>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge
                      variant="secondary"
                      className={`text-xs ${impactColors[suggestion.impact]}`}
                    >
                      {suggestion.impact} impact
                    </Badge>
                    <span
                      className={`text-xs font-medium ${getConfidenceColor(suggestion.confidence)}`}
                    >
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
                    <p className="mt-1 ml-4">{suggestion.reasoningText}</p>
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
