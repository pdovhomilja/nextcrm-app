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
  getBoardMetrics,
  type BoardMetricsData,
} from "@/actions/dashboard/get-board-metrics";
import { Folder, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface BoardMetricsCardProps {
  companyId: string;
  dateRange?: "7d" | "30d" | "90d" | "all";
  className?: string;
}

export function BoardMetricsCard({
  companyId,
  dateRange = "30d",
  className,
}: BoardMetricsCardProps) {
  const [data, setData] = useState<BoardMetricsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchMetrics() {
      setIsLoading(true);
      setError(null);

      try {
        const result = await getBoardMetrics({
          dateRange,
          includeSections: true,
          companyId,
        });

        if (result.error) {
          setError(result.error);
        } else if (result.data) {
          setData(result.data);
        }
      } catch (err) {
        console.error("Failed to fetch board metrics:", err);
        setError("Failed to load board metrics");
      } finally {
        setIsLoading(false);
      }
    }

    fetchMetrics();
  }, [dateRange, companyId]);

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
            <Folder className="h-4 w-4" />
            Board Metrics
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
            <Folder className="h-4 w-4" />
            Active Projects
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-6 w-20" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Folder className="h-4 w-4" />
          Active Projects
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
              {data.totalBoards.toLocaleString()}
            </div>
            <div
              className={`flex items-center gap-1 text-sm ${getTrendColor(data.trends.monthOverMonth)}`}
            >
              {getTrendIcon(data.trends.monthOverMonth)}
              <span>{Math.abs(data.trends.monthOverMonth).toFixed(1)}%</span>
            </div>
          </div>

          {/* Activity breakdown */}
          <div className="flex flex-wrap gap-1">
            <Badge variant="secondary" className="text-xs">
              Active: {data.activeBoardsCount}
            </Badge>
            <Badge variant="outline" className="text-xs">
              With Tasks: {data.boardsWithTasks}
            </Badge>
            {data.sectionDistribution.totalSections > 0 && (
              <Badge variant="outline" className="text-xs">
                {data.sectionDistribution.totalSections} sections
              </Badge>
            )}
          </div>

          {/* Additional metrics */}
          <div className="text-xs text-muted-foreground space-y-1">
            <div>Avg. tasks/board: {data.averageTasksPerBoard}</div>
            {data.sectionDistribution.averageSectionsPerBoard > 0 && (
              <div>
                Avg. sections/board:{" "}
                {data.sectionDistribution.averageSectionsPerBoard}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
