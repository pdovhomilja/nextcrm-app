"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getTaskMetrics,
  type TaskMetricsData,
} from "@/actions/dashboard/get-task-metrics";
import { ClipboardList, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface TaskMetricsCardProps {
  companyId: string;
  boardId?: string;
  dateRange?: "7d" | "30d" | "90d" | "all";
  className?: string;
}

export function TaskMetricsCard({
  companyId,
  boardId,
  dateRange = "30d",
  className,
}: TaskMetricsCardProps) {
  const [data, setData] = useState<TaskMetricsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchMetrics() {
      setIsLoading(true);
      setError(null);

      try {
        const result = await getTaskMetrics({ dateRange, boardId, companyId });

        if (result.error) {
          setError(result.error);
        } else if (result.data) {
          setData(result.data);
        }
      } catch (err) {
        console.error("Failed to fetch task metrics:", err);
        setError("Failed to load task metrics");
      } finally {
        setIsLoading(false);
      }
    }

    fetchMetrics();
  }, [dateRange, boardId, companyId]);

  const getTrendIcon = (trend: number) => {
    if (trend > 0) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (trend < 0) return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-gray-400" />;
  };

  const getTrendColor = (trend: number) => {
    if (trend > 0) return "text-green-600";
    if (trend < 0) return "text-red-600";
    return "text-gray-400";
  };

  if (error) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            Task Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-red-600">{error}</div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading || !data) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            Task Metrics
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-4 w-24" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-12" />
            <Skeleton className="h-6 w-12" />
            <Skeleton className="h-6 w-12" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <ClipboardList className="h-4 w-4" />
          Total Tasks
        </CardTitle>
        <CardDescription>
          {dateRange === "all" ? "All time" : `Last ${dateRange}`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Main metric */}
          <div className="flex items-baseline gap-2">
            <div className="text-2xl font-bold">
              {data.totalTasks.toLocaleString()}
            </div>
            <div
              className={`flex items-center gap-1 text-sm ${getTrendColor(data.trends.monthOverMonth)}`}
            >
              {getTrendIcon(data.trends.monthOverMonth)}
              <span>{Math.abs(data.trends.monthOverMonth).toFixed(1)}%</span>
            </div>
          </div>

          {/* Status breakdown */}
          <div className="flex flex-wrap gap-1">
            <Badge variant="secondary" className="text-xs">
              Active:{" "}
              {data.tasksByStatus.NEW +
                data.tasksByStatus.IN_PROGRESS +
                data.tasksByStatus.ON_HOLD}
            </Badge>
            <Badge variant="outline" className="text-xs">
              Done: {data.tasksByStatus.COMPLETED}
            </Badge>
            {data.overdueTasks > 0 && (
              <Badge variant="destructive" className="text-xs">
                Overdue: {data.overdueTasks}
              </Badge>
            )}
          </div>

          {/* Additional metrics */}
          <div className="text-xs text-muted-foreground space-y-1">
            <div>Completion rate: {data.completionRate}%</div>
            {data.averageCompletionTime && (
              <div>Avg. completion: {data.averageCompletionTime} days</div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
