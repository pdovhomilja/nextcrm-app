# Phase 2A: Task Timeline Charts Implementation

## Phase Overview

**Objective**: Replace the mock visitor chart with interactive task completion timeline visualization and implement chart data processing infrastructure.

**Duration**: 4-5 days

**Prerequisites**: Phase 1A and 1B completed (task and board metrics infrastructure)

**Success Criteria**:

- Interactive task completion timeline chart replaces visitor data
- Chart data processing actions implemented
- Date range filtering and company scoping functional
- Responsive chart design with proper loading states

## Technical Implementation

### Step 1: Create Chart Data Processing Actions

#### 1.1 Create Chart Data Actions Directory

```bash
mkdir -p actions/dashboard/charts
```

#### 1.2 Create Task Timeline Data Action

Create `actions/dashboard/charts/get-task-timeline-data.ts`:

```typescript
"use server";

import { auth } from "@/auth";
import db from "@/lib/db";
import { z } from "zod";

const TaskTimelineSchema = z.object({
  dateRange: z.enum(["7d", "30d", "90d", "1y"]).optional().default("30d"),
  boardId: z.string().optional(),
  granularity: z.enum(["day", "week", "month"]).optional().default("day"),
  includeCompleted: z.boolean().optional().default(true),
  includeCreated: z.boolean().optional().default(true),
});

export type TaskTimelineDataPoint = {
  date: string;
  created: number;
  completed: number;
  inProgress: number;
  cumulative: number;
};

export type TaskTimelineData = {
  data: TaskTimelineDataPoint[];
  summary: {
    totalCreated: number;
    totalCompleted: number;
    completionRate: number;
    averageDaily: {
      created: number;
      completed: number;
    };
    trends: {
      createdTrend: number;
      completedTrend: number;
      completionRateTrend: number;
    };
  };
  chartConfig: {
    created: {
      label: string;
      color: string;
    };
    completed: {
      label: string;
      color: string;
    };
    inProgress: {
      label: string;
      color: string;
    };
  };
};

export async function getTaskTimelineData(
  input?: z.infer<typeof TaskTimelineSchema>,
): Promise<{ data?: TaskTimelineData; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { error: "Authentication required" };
    }

    const companyId = session.user.cid;
    if (!companyId) {
      return { error: "Company context required" };
    }

    const validatedInput = TaskTimelineSchema.parse(input || {});
    const {
      dateRange,
      boardId,
      granularity,
      includeCompleted,
      includeCreated,
    } = validatedInput;

    // Calculate date range and intervals
    const now = new Date();
    let startDate: Date;
    let intervalCount: number;
    let intervalUnit: "day" | "week" | "month";

    switch (dateRange) {
      case "7d":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        intervalCount = 7;
        intervalUnit = "day";
        break;
      case "30d":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        intervalCount =
          granularity === "day" ? 30 : granularity === "week" ? 5 : 1;
        intervalUnit = granularity;
        break;
      case "90d":
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        intervalCount =
          granularity === "day" ? 90 : granularity === "week" ? 13 : 3;
        intervalUnit = granularity;
        break;
      case "1y":
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        intervalCount =
          granularity === "month" ? 12 : granularity === "week" ? 52 : 365;
        intervalUnit =
          granularity === "day"
            ? "day"
            : granularity === "week"
              ? "week"
              : "month";
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        intervalCount = 30;
        intervalUnit = "day";
    }

    // Base filter for tasks
    const baseFilter = {
      companyId,
      ...(boardId && { boardId }),
    };

    // Generate date intervals
    const intervals: { start: Date; end: Date; label: string }[] = [];

    for (let i = 0; i < intervalCount; i++) {
      let intervalStart: Date;
      let intervalEnd: Date;
      let label: string;

      switch (intervalUnit) {
        case "day":
          intervalStart = new Date(
            startDate.getTime() + i * 24 * 60 * 60 * 1000,
          );
          intervalEnd = new Date(intervalStart.getTime() + 24 * 60 * 60 * 1000);
          label = intervalStart.toISOString().split("T")[0]; // YYYY-MM-DD
          break;
        case "week":
          intervalStart = new Date(
            startDate.getTime() + i * 7 * 24 * 60 * 60 * 1000,
          );
          intervalEnd = new Date(
            intervalStart.getTime() + 7 * 24 * 60 * 60 * 1000,
          );
          label = `Week of ${intervalStart.toISOString().split("T")[0]}`;
          break;
        case "month":
          intervalStart = new Date(
            startDate.getFullYear(),
            startDate.getMonth() + i,
            1,
          );
          intervalEnd = new Date(
            startDate.getFullYear(),
            startDate.getMonth() + i + 1,
            1,
          );
          label = intervalStart.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
          });
          break;
        default:
          intervalStart = startDate;
          intervalEnd = now;
          label = "Total";
      }

      intervals.push({ start: intervalStart, end: intervalEnd, label });
    }

    // Fetch data for each interval
    const timelineData: TaskTimelineDataPoint[] = [];
    let cumulativeCreated = 0;
    let totalCreated = 0;
    let totalCompleted = 0;

    for (const interval of intervals) {
      const [createdCount, completedCount, inProgressCount] = await Promise.all(
        [
          // Tasks created in this interval
          includeCreated
            ? db.task.count({
                where: {
                  ...baseFilter,
                  createdAt: {
                    gte: interval.start,
                    lt: interval.end,
                  },
                },
              })
            : 0,

          // Tasks completed in this interval
          includeCompleted
            ? db.task.count({
                where: {
                  ...baseFilter,
                  status: "COMPLETED",
                  completedAt: {
                    gte: interval.start,
                    lt: interval.end,
                  },
                },
              })
            : 0,

          // Tasks moved to in-progress in this interval
          db.task.count({
            where: {
              ...baseFilter,
              status: "IN_PROGRESS",
              updatedAt: {
                gte: interval.start,
                lt: interval.end,
              },
            },
          }),
        ],
      );

      cumulativeCreated += createdCount;
      totalCreated += createdCount;
      totalCompleted += completedCount;

      timelineData.push({
        date: interval.label,
        created: createdCount,
        completed: completedCount,
        inProgress: inProgressCount,
        cumulative: cumulativeCreated,
      });
    }

    // Calculate summary metrics
    const completionRate =
      totalCreated > 0 ? (totalCompleted / totalCreated) * 100 : 0;
    const averageDailyCreated = totalCreated / intervalCount;
    const averageDailyCompleted = totalCompleted / intervalCount;

    // Calculate trends (comparing first half vs second half)
    const midPoint = Math.floor(timelineData.length / 2);
    const firstHalf = timelineData.slice(0, midPoint);
    const secondHalf = timelineData.slice(midPoint);

    const firstHalfCreated = firstHalf.reduce(
      (sum, point) => sum + point.created,
      0,
    );
    const secondHalfCreated = secondHalf.reduce(
      (sum, point) => sum + point.created,
      0,
    );
    const firstHalfCompleted = firstHalf.reduce(
      (sum, point) => sum + point.completed,
      0,
    );
    const secondHalfCompleted = secondHalf.reduce(
      (sum, point) => sum + point.completed,
      0,
    );

    const createdTrend =
      firstHalfCreated > 0
        ? ((secondHalfCreated - firstHalfCreated) / firstHalfCreated) * 100
        : 0;
    const completedTrend =
      firstHalfCompleted > 0
        ? ((secondHalfCompleted - firstHalfCompleted) / firstHalfCompleted) *
          100
        : 0;

    const firstHalfCompletionRate =
      firstHalfCreated > 0 ? (firstHalfCompleted / firstHalfCreated) * 100 : 0;
    const secondHalfCompletionRate =
      secondHalfCreated > 0
        ? (secondHalfCompleted / secondHalfCreated) * 100
        : 0;
    const completionRateTrend =
      firstHalfCompletionRate > 0
        ? ((secondHalfCompletionRate - firstHalfCompletionRate) /
            firstHalfCompletionRate) *
          100
        : 0;

    const result: TaskTimelineData = {
      data: timelineData,
      summary: {
        totalCreated,
        totalCompleted,
        completionRate: Math.round(completionRate * 100) / 100,
        averageDaily: {
          created: Math.round(averageDailyCreated * 100) / 100,
          completed: Math.round(averageDailyCompleted * 100) / 100,
        },
        trends: {
          createdTrend: Math.round(createdTrend * 100) / 100,
          completedTrend: Math.round(completedTrend * 100) / 100,
          completionRateTrend: Math.round(completionRateTrend * 100) / 100,
        },
      },
      chartConfig: {
        created: {
          label: "Tasks Created",
          color: "hsl(var(--chart-1))",
        },
        completed: {
          label: "Tasks Completed",
          color: "hsl(var(--chart-2))",
        },
        inProgress: {
          label: "In Progress",
          color: "hsl(var(--chart-3))",
        },
      },
    };

    return { data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: "Invalid input parameters" };
    }
    console.error("Task timeline data error:", error);
    return { error: "Failed to retrieve task timeline data" };
  }
}
```

### Step 2: Create Task Timeline Chart Component

#### 2.1 Create Charts Components Directory

```bash
mkdir -p components/dashboard/charts
```

#### 2.2 Create Task Timeline Chart Component

Create `components/dashboard/charts/task-timeline-chart.tsx`:

```typescript
"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { TrendingUp, TrendingDown, Minus, BarChart3 } from "lucide-react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts"
import { getTaskTimelineData, type TaskTimelineData } from "@/actions/dashboard/charts/get-task-timeline-data"

interface TaskTimelineChartProps {
  boardId?: string
  className?: string
}

type ChartType = 'area' | 'line' | 'bar'
type DateRange = '7d' | '30d' | '90d' | '1y'

export function TaskTimelineChart({ boardId, className }: TaskTimelineChartProps) {
  const [data, setData] = useState<TaskTimelineData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [chartType, setChartType] = useState<ChartType>('area')
  const [dateRange, setDateRange] = useState<DateRange>('30d')

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true)
      setError(null)

      try {
        const granularity = dateRange === '7d' ? 'day' :
                          dateRange === '30d' ? 'day' :
                          dateRange === '90d' ? 'week' : 'month'

        const result = await getTaskTimelineData({
          dateRange,
          boardId,
          granularity,
        })

        if (result.error) {
          setError(result.error)
        } else if (result.data) {
          setData(result.data)
        }
      } catch (err) {
        console.error('Failed to fetch task timeline data:', err)
        setError('Failed to load chart data')
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [dateRange, boardId])

  const getTrendIcon = (trend: number) => {
    if (trend > 0) return <TrendingUp className="h-4 w-4 text-green-600" />
    if (trend < 0) return <TrendingDown className="h-4 w-4 text-red-600" />
    return <Minus className="h-4 w-4 text-gray-400" />
  }

  const getTrendColor = (trend: number) => {
    if (trend > 0) return "text-green-600"
    if (trend < 0) return "text-red-600"
    return "text-gray-400"
  }

  const formatDate = (dateStr: string) => {
    if (dateStr.includes('Week of')) {
      return dateStr.replace('Week of ', '')
    }
    if (dateRange === '1y') {
      return dateStr
    }
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      ...(dateRange === '1y' && { year: 'numeric' })
    })
  }

  const renderChart = () => {
    if (!data) return null

    const chartData = data.data.map(point => ({
      ...point,
      dateFormatted: formatDate(point.date),
    }))

    const commonProps = {
      data: chartData,
      margin: { top: 10, right: 10, bottom: 0, left: 0 },
    }

    switch (chartType) {
      case 'area':
        return (
          <AreaChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="dateFormatted"
              className="text-xs fill-muted-foreground"
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              className="text-xs fill-muted-foreground"
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="rounded-lg border bg-background p-2 shadow-sm">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex flex-col">
                          <span className="text-[0.70rem] uppercase text-muted-foreground">
                            {label}
                          </span>
                          {payload.map((entry, index) => (
                            <span key={index} className="font-bold" style={{ color: entry.color }}>
                              {entry.name}: {entry.value}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )
                }
                return null
              }}
            />
            <Area
              type="monotone"
              dataKey="created"
              stackId="1"
              stroke={data.chartConfig.created.color}
              fill={data.chartConfig.created.color}
              fillOpacity={0.6}
            />
            <Area
              type="monotone"
              dataKey="completed"
              stackId="1"
              stroke={data.chartConfig.completed.color}
              fill={data.chartConfig.completed.color}
              fillOpacity={0.8}
            />
          </AreaChart>
        )

      case 'line':
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="dateFormatted"
              className="text-xs fill-muted-foreground"
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              className="text-xs fill-muted-foreground"
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="rounded-lg border bg-background p-2 shadow-sm">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex flex-col">
                          <span className="text-[0.70rem] uppercase text-muted-foreground">
                            {label}
                          </span>
                          {payload.map((entry, index) => (
                            <span key={index} className="font-bold" style={{ color: entry.color }}>
                              {entry.name}: {entry.value}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )
                }
                return null
              }}
            />
            <Line
              type="monotone"
              dataKey="created"
              stroke={data.chartConfig.created.color}
              strokeWidth={2}
              dot={{ r: 3 }}
            />
            <Line
              type="monotone"
              dataKey="completed"
              stroke={data.chartConfig.completed.color}
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          </LineChart>
        )

      case 'bar':
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="dateFormatted"
              className="text-xs fill-muted-foreground"
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              className="text-xs fill-muted-foreground"
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="rounded-lg border bg-background p-2 shadow-sm">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex flex-col">
                          <span className="text-[0.70rem] uppercase text-muted-foreground">
                            {label}
                          </span>
                          {payload.map((entry, index) => (
                            <span key={index} className="font-bold" style={{ color: entry.color }}>
                              {entry.name}: {entry.value}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )
                }
                return null
              }}
            />
            <Bar dataKey="created" fill={data.chartConfig.created.color} />
            <Bar dataKey="completed" fill={data.chartConfig.completed.color} />
          </BarChart>
        )

      default:
        return null
    }
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Task Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-red-600">{error}</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader className="flex flex-col space-y-0 pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-5 w-5" />
            Task Timeline
          </CardTitle>
          <div className="flex items-center gap-2">
            {/* Chart type toggle */}
            <ToggleGroup
              type="single"
              value={chartType}
              onValueChange={(value) => value && setChartType(value as ChartType)}
              size="sm"
            >
              <ToggleGroupItem value="area" aria-label="Area chart">
                Area
              </ToggleGroupItem>
              <ToggleGroupItem value="line" aria-label="Line chart">
                Line
              </ToggleGroupItem>
              <ToggleGroupItem value="bar" aria-label="Bar chart">
                Bar
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <CardDescription>
            Tasks created vs completed over time
          </CardDescription>
          {/* Date range toggle */}
          <ToggleGroup
            type="single"
            value={dateRange}
            onValueChange={(value) => value && setDateRange(value as DateRange)}
            size="sm"
          >
            <ToggleGroupItem value="7d">7d</ToggleGroupItem>
            <ToggleGroupItem value="30d">30d</ToggleGroupItem>
            <ToggleGroupItem value="90d">90d</ToggleGroupItem>
            <ToggleGroupItem value="1y">1y</ToggleGroupItem>
          </ToggleGroup>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
            </div>
            <Skeleton className="h-[300px] w-full" />
          </div>
        ) : data ? (
          <div className="space-y-4">
            {/* Summary metrics */}
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  Created: {data.summary.totalCreated}
                </Badge>
                <div className={`flex items-center gap-1 ${getTrendColor(data.summary.trends.createdTrend)}`}>
                  {getTrendIcon(data.summary.trends.createdTrend)}
                  <span className="text-xs">{Math.abs(data.summary.trends.createdTrend).toFixed(1)}%</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  Completed: {data.summary.totalCompleted}
                </Badge>
                <div className={`flex items-center gap-1 ${getTrendColor(data.summary.trends.completedTrend)}`}>
                  {getTrendIcon(data.summary.trends.completedTrend)}
                  <span className="text-xs">{Math.abs(data.summary.trends.completedTrend).toFixed(1)}%</span>
                </div>
              </div>

              <Badge variant="outline">
                Rate: {data.summary.completionRate}%
              </Badge>
            </div>

            {/* Chart */}
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                {renderChart()}
              </ResponsiveContainer>
            </div>

            {/* Legend */}
            <div className="flex justify-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div
                  className="h-3 w-3 rounded"
                  style={{ backgroundColor: data.chartConfig.created.color }}
                />
                <span>{data.chartConfig.created.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className="h-3 w-3 rounded"
                  style={{ backgroundColor: data.chartConfig.completed.color }}
                />
                <span>{data.chartConfig.completed.label}</span>
              </div>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
```

### Step 3: Replace Chart in Dashboard Page

Update `app/(app)/[cid]/dashboard/_components/chart-area-interactive.tsx`:

```typescript
import { TaskTimelineChart } from "@/components/dashboard/charts/task-timeline-chart"

export function ChartAreaInteractive() {
  return (
    <div className="space-y-4">
      <TaskTimelineChart className="w-full" />
    </div>
  )
}
```

### Step 4: Add Chart Configuration to CSS Variables

Update your global CSS to include chart colors. Add to `app/globals.css`:

```css
@layer base {
  :root {
    /* Existing variables... */

    /* Chart colors */
    --chart-1: 220 70% 50%;
    --chart-2: 160 60% 45%;
    --chart-3: 30 80% 55%;
    --chart-4: 280 65% 60%;
    --chart-5: 340 75% 55%;
  }

  .dark {
    /* Existing dark mode variables... */

    /* Chart colors for dark mode */
    --chart-1: 220 70% 50%;
    --chart-2: 160 60% 45%;
    --chart-3: 30 80% 55%;
    --chart-4: 280 65% 60%;
    --chart-5: 340 75% 55%;
  }
}
```

### Step 5: Create Chart Utilities

Create `lib/dashboard/chart-utils.ts`:

```typescript
/**
 * Utility functions for dashboard charts
 */

export type ChartColorConfig = {
  [key: string]: {
    label: string;
    color: string;
  };
};

export const defaultChartColors: ChartColorConfig = {
  primary: {
    label: "Primary",
    color: "hsl(var(--chart-1))",
  },
  secondary: {
    label: "Secondary",
    color: "hsl(var(--chart-2))",
  },
  tertiary: {
    label: "Tertiary",
    color: "hsl(var(--chart-3))",
  },
  quaternary: {
    label: "Quaternary",
    color: "hsl(var(--chart-4))",
  },
  quinary: {
    label: "Quinary",
    color: "hsl(var(--chart-5))",
  },
};

export const taskStatusColors: ChartColorConfig = {
  NEW: {
    label: "New",
    color: "hsl(var(--chart-1))",
  },
  IN_PROGRESS: {
    label: "In Progress",
    color: "hsl(var(--chart-2))",
  },
  ON_HOLD: {
    label: "On Hold",
    color: "hsl(var(--chart-3))",
  },
  COMPLETED: {
    label: "Completed",
    color: "hsl(var(--chart-4))",
  },
  CANCELLED: {
    label: "Cancelled",
    color: "hsl(var(--chart-5))",
  },
};

export const taskPriorityColors: ChartColorConfig = {
  LOW: {
    label: "Low",
    color: "hsl(142 76% 36%)", // Green
  },
  MEDIUM: {
    label: "Medium",
    color: "hsl(45 93% 47%)", // Yellow
  },
  HIGH: {
    label: "High",
    color: "hsl(21 90% 48%)", // Orange
  },
  CRITICAL: {
    label: "Critical",
    color: "hsl(0 84% 60%)", // Red
  },
};

/**
 * Format date for chart display based on granularity
 */
export function formatChartDate(
  date: Date,
  granularity: "day" | "week" | "month",
): string {
  switch (granularity) {
    case "day":
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    case "week":
      return `Week of ${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
    case "month":
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
      });
    default:
      return date.toLocaleDateString();
  }
}

/**
 * Calculate percentage change between two values
 */
export function calculatePercentageChange(
  current: number,
  previous: number,
): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

/**
 * Calculate trend direction and magnitude
 */
export function calculateTrend(data: number[]): {
  direction: "up" | "down" | "flat";
  magnitude: number;
} {
  if (data.length < 2) return { direction: "flat", magnitude: 0 };

  const firstHalf = data.slice(0, Math.floor(data.length / 2));
  const secondHalf = data.slice(Math.floor(data.length / 2));

  const firstAvg =
    firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
  const secondAvg =
    secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;

  const change = calculatePercentageChange(secondAvg, firstAvg);

  return {
    direction: change > 5 ? "up" : change < -5 ? "down" : "flat",
    magnitude: Math.abs(change),
  };
}

/**
 * Generate date intervals for chart data
 */
export function generateDateIntervals(
  startDate: Date,
  endDate: Date,
  granularity: "day" | "week" | "month",
): { start: Date; end: Date; label: string }[] {
  const intervals: { start: Date; end: Date; label: string }[] = [];
  const current = new Date(startDate);

  while (current < endDate) {
    const intervalStart = new Date(current);
    let intervalEnd: Date;

    switch (granularity) {
      case "day":
        intervalEnd = new Date(current);
        intervalEnd.setDate(intervalEnd.getDate() + 1);
        break;
      case "week":
        intervalEnd = new Date(current);
        intervalEnd.setDate(intervalEnd.getDate() + 7);
        break;
      case "month":
        intervalEnd = new Date(current);
        intervalEnd.setMonth(intervalEnd.getMonth() + 1);
        break;
    }

    intervals.push({
      start: intervalStart,
      end: intervalEnd,
      label: formatChartDate(intervalStart, granularity),
    });

    current.setTime(intervalEnd.getTime());
  }

  return intervals;
}
```

## Testing and Verification

### Unit Tests

Create `__tests__/dashboard/charts/get-task-timeline-data.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { getTaskTimelineData } from "@/actions/dashboard/charts/get-task-timeline-data";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  default: {
    task: {
      count: vi.fn(),
    },
  },
}));

describe("getTaskTimelineData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should require authentication", async () => {
    const { auth } = await import("@/auth");
    vi.mocked(auth).mockResolvedValue(null);

    const result = await getTaskTimelineData();
    expect(result.error).toBe("Authentication required");
  });

  it("should generate correct date intervals", async () => {
    const { auth } = await import("@/auth");
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user1", cid: "company1" },
    } as any);

    const { default: db } = await import("@/lib/db");
    vi.mocked(db.task.count).mockResolvedValue(5);

    const result = await getTaskTimelineData({ dateRange: "7d" });
    expect(result.data?.data).toHaveLength(7);
  });

  // Add more tests for different date ranges, granularities, etc.
});
```

### Component Tests

Create `__tests__/components/dashboard/charts/task-timeline-chart.test.tsx`:

```typescript
import { render, screen, waitFor } from '@testing-library/react'
import { TaskTimelineChart } from '@/components/dashboard/charts/task-timeline-chart'

// Mock the chart action
vi.mock('@/actions/dashboard/charts/get-task-timeline-data', () => ({
  getTaskTimelineData: vi.fn(),
}))

describe('TaskTimelineChart', () => {
  it('should render loading state initially', () => {
    render(<TaskTimelineChart />)
    expect(screen.getByText('Task Timeline')).toBeInTheDocument()
    // Check for skeleton loading elements
  })

  it('should render chart with data', async () => {
    const mockData = {
      data: [
        { date: '2024-01-01', created: 5, completed: 3, inProgress: 2, cumulative: 5 },
        { date: '2024-01-02', created: 7, completed: 4, inProgress: 1, cumulative: 12 },
      ],
      summary: {
        totalCreated: 12,
        totalCompleted: 7,
        completionRate: 58.33,
        averageDaily: { created: 6, completed: 3.5 },
        trends: { createdTrend: 5.2, completedTrend: 3.1, completionRateTrend: 2.1 },
      },
      chartConfig: {
        created: { label: 'Created', color: 'hsl(220 70% 50%)' },
        completed: { label: 'Completed', color: 'hsl(160 60% 45%)' },
        inProgress: { label: 'In Progress', color: 'hsl(30 80% 55%)' },
      },
    }

    const { getTaskTimelineData } = await import('@/actions/dashboard/charts/get-task-timeline-data')
    vi.mocked(getTaskTimelineData).mockResolvedValue({ data: mockData })

    render(<TaskTimelineChart />)

    await waitFor(() => {
      expect(screen.getByText('Created: 12')).toBeInTheDocument()
      expect(screen.getByText('Completed: 7')).toBeInTheDocument()
    })
  })
})
```

## Completion Checklist

### Build & Quality Verification

- [ ] `pnpm build` passes without errors
- [ ] `pnpm lint` passes without warnings
- [ ] Chart renders correctly in all date ranges
- [ ] Chart type toggling works properly

### Security & Data Isolation

- [ ] Chart data actions validate session
- [ ] All database queries filter by company ID
- [ ] Input validation with Zod schemas
- [ ] Error handling implemented

### Performance & Database

- [ ] Chart data queries are optimized
- [ ] Date interval generation is efficient
- [ ] Component re-renders minimized
- [ ] Loading states work smoothly

### UI/UX Standards

- [ ] Chart is responsive on all screen sizes
- [ ] Loading skeletons match final layout
- [ ] Chart colors follow design system
- [ ] Tooltips and legends are accessible

### Testing

- [ ] Unit tests for data actions
- [ ] Component tests for chart rendering
- [ ] Integration tests for full flow
- [ ] Manual testing on different date ranges

## Files Created/Modified

### New Files

- `actions/dashboard/charts/get-task-timeline-data.ts`
- `components/dashboard/charts/task-timeline-chart.tsx`
- `lib/dashboard/chart-utils.ts`
- `__tests__/dashboard/charts/get-task-timeline-data.test.ts`
- `__tests__/components/dashboard/charts/task-timeline-chart.test.tsx`

### Modified Files

- `app/(app)/[cid]/dashboard/_components/chart-area-interactive.tsx`
- `app/globals.css` (added chart CSS variables)

## Next Phase Preparation

Phase 2B will build upon this foundation by:

- Adding priority and status distribution charts
- Implementing pie and donut chart components
- Creating board workload distribution visualizations
- Establishing patterns for multiple chart types

Ensure the following are ready for Phase 2B:

- Chart infrastructure and utilities are solid
- Color system is established
- Chart data processing patterns are proven
- Performance is optimized for multiple charts

## Troubleshooting Guide

### Chart Not Rendering

- **Issue**: Chart component shows loading forever
- **Solution**: Check data action for errors, verify database connection

### Performance Issues

- **Issue**: Slow chart loading or interactions
- **Solution**: Optimize database queries, add proper indexes, implement data caching

### Styling Issues

- **Issue**: Chart colors or layout broken
- **Solution**: Verify CSS variables are defined, check Recharts configuration

### Data Accuracy Issues

- **Issue**: Chart data doesn't match expected values
- **Solution**: Verify date range calculations, check company ID filtering

This completes Phase 2A implementation. The dashboard now has interactive task timeline visualization replacing the mock visitor chart.
