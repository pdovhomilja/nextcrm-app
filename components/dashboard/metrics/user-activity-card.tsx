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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  getUserMetrics,
  type UserMetricsData,
} from "@/actions/dashboard/get-user-metrics";
import { Users, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface UserActivityCardProps {
  companyId: string;
  dateRange?: "7d" | "30d" | "90d" | "all";
  className?: string;
}

export function UserActivityCard({
  companyId,
  dateRange = "30d",
  className,
}: UserActivityCardProps) {
  const [data, setData] = useState<UserMetricsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchMetrics() {
      setIsLoading(true);
      setError(null);

      try {
        const result = await getUserMetrics({
          dateRange,
          includeActivity: true,
          companyId,
        });

        if (result.error) {
          setError(result.error);
        } else if (result.data) {
          setData(result.data);
        }
      } catch (err) {
        console.error("Failed to fetch user metrics:", err);
        setError("Failed to load user metrics");
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
            <Users className="h-4 w-4" />
            Team Activity
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
            <Users className="h-4 w-4" />
            Team Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-4 w-24" />
          <div className="flex gap-2">
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
          <Users className="h-4 w-4" />
          Team Activity
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
              {data.activeUsersCount.toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground">
              / {data.totalUsers} total
            </div>
            <div
              className={`flex items-center gap-1 text-sm ${getTrendColor(data.trends.activeUsersGrowth)}`}
            >
              {getTrendIcon(data.trends.activeUsersGrowth)}
              <span>{Math.abs(data.trends.activeUsersGrowth).toFixed(1)}%</span>
            </div>
          </div>

          {/* Activity breakdown */}
          <div className="flex flex-wrap gap-1">
            <Badge variant="secondary" className="text-xs">
              Daily: {data.activityBreakdown.loginFrequency.daily}
            </Badge>
            <Badge variant="outline" className="text-xs">
              Weekly: {data.activityBreakdown.loginFrequency.weekly}
            </Badge>
            {data.newUsersThisMonth > 0 && (
              <Badge variant="outline" className="text-xs">
                New: {data.newUsersThisMonth}
              </Badge>
            )}
          </div>

          {/* Additional metrics */}
          <div className="text-xs text-muted-foreground space-y-1">
            <div>Avg. tasks/user: {data.userProductivity.avgTasksPerUser}</div>
            <div>
              Completion rate: {data.userProductivity.avgCompletionRate}%
            </div>
            {data.userProductivity.topPerformers.length > 0 && (
              <div className="flex items-center gap-1 mt-2">
                <span>Top performer:</span>
                <Avatar className="h-4 w-4">
                  <AvatarFallback className="text-xs">
                    {data.userProductivity.topPerformers[0]?.name?.charAt(0) ||
                      data.userProductivity.topPerformers[0]?.email?.charAt(
                        0,
                      ) ||
                      "?"}
                  </AvatarFallback>
                </Avatar>
                <span>
                  {data.userProductivity.topPerformers[0]?.completionRate}%
                </span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
