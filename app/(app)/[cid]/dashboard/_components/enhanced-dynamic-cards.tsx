import { IconTrendingUp, IconTrendingDown } from "@tabler/icons-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import type { TaskMetricsData } from "@/actions/dashboard/get-task-metrics";
import type { UserMetricsData } from "@/actions/dashboard/get-user-metrics";
import Link from "next/link";

interface EnhancedDynamicCardsProps {
  taskMetrics?: TaskMetricsData;
  userMetrics?: UserMetricsData;
  isLoading?: boolean;
  cid: string;
}

export function EnhancedDynamicCards({
  taskMetrics,
  isLoading = false,
  cid,
}: EnhancedDynamicCardsProps) {
  // Helper function to format numbers
  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  if (isLoading) {
    return (
      <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <LoadingCard key={i} />
        ))}
      </div>
    );
  }

  // Prepare card data
  const cards = [
    // Overdue Tasks Card
    {
      title: "Overdue Tasks",
      value: formatNumber(taskMetrics?.overdueTasks || 0),
      trend: null, // Overdue doesn't have a meaningful trend
      description: `${taskMetrics?.overdueTasks || 0} tasks overdue`,
      isAlert: (taskMetrics?.overdueTasks || 0) > 0,
      link: `/${cid}/tasks-list?dueDate=overdue`,
    },

    // Team Productivity Card
    {
      title: "Completion Rate",
      value: `${taskMetrics?.completionRate.toFixed(1) || "0.0"}%`,
      trend: null, // We could add weekly trend here later
      description: `${taskMetrics?.tasksByStatus.COMPLETED || 0} completed this month`,
    },

    // AI Conversations Card - TODO: Add aiUsageStats to UserMetricsData
    {
      title: "AI Conversations",
      value: "0", // formatNumber(userMetrics?.aiUsageStats?.totalConversations || 0),
      trend: null,
      description: "0 active AI users", // `${userMetrics?.aiUsageStats?.activeAIUsers || 0} active AI users`,
    },

    // Documents Processed Card - TODO: Add documentStats to UserMetricsData
    {
      title: "Documents Processed",
      value: "0", // formatNumber(userMetrics?.documentStats?.totalDocuments || 0),
      trend: null,
      description: "0.0% success rate", // `${userMetrics?.documentStats?.averageProcessingSuccessRate?.toFixed(1) || '0.0'}% success rate`,
    },
  ];

  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      {cards.map((card) => (
        <EnhancedSectionCard key={card.title} {...card} />
      ))}
    </div>
  );
}

interface EnhancedSectionCardProps {
  title: string;
  value: string;
  trend?: { formatted: string; isPositive: boolean } | null;
  description: string;
  isAlert?: boolean;
  link?: string;
}

const EnhancedSectionCard = ({
  title,
  value,
  trend,
  description,
  isAlert = false,
  link,
}: EnhancedSectionCardProps) => {
  return (
    <Link href={link || "#"}>
      <Card className={`@container/card ${isAlert ? "border-red-200" : ""}`}>
        <CardHeader>
          <CardDescription className={isAlert ? "text-red-600" : ""}>
            {title}
          </CardDescription>
          <CardTitle
            className={`text-2xl font-semibold tabular-nums @[250px]/card:text-3xl ${
              isAlert ? "text-red-700" : ""
            }`}
          >
            {value}
          </CardTitle>
          <CardAction>
            {trend && (
              <Badge
                variant="outline"
                className={
                  trend.isPositive
                    ? "text-green-700 border-green-200 bg-green-50"
                    : "text-red-700 border-red-200 bg-red-50"
                }
              >
                {trend.isPositive ? <IconTrendingUp /> : <IconTrendingDown />}
                {trend.formatted}
              </Badge>
            )}
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          {trend && (
            <div className="line-clamp-1 flex gap-2 font-medium">
              {trend.formatted}
              {trend.isPositive ? (
                <IconTrendingUp className="size-4 text-green-600" />
              ) : (
                <IconTrendingDown className="size-4 text-red-600" />
              )}
            </div>
          )}
          <div
            className={`text-muted-foreground ${isAlert ? "text-red-500" : ""}`}
          >
            {description}
          </div>
        </CardFooter>
      </Card>
    </Link>
  );
};

const LoadingCard = () => {
  return (
    <Card className="@container/card animate-pulse">
      <CardHeader>
        <CardDescription>
          <div className="h-4 bg-gray-200 rounded w-20"></div>
        </CardDescription>
        <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
          <div className="h-8 bg-gray-200 rounded w-16"></div>
        </CardTitle>
      </CardHeader>
      <CardFooter className="flex-col items-start gap-1.5 text-sm">
        <div className="h-3 bg-gray-200 rounded w-24"></div>
      </CardFooter>
    </Card>
  );
};
