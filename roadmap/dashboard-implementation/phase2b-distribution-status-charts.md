# Phase 2B: Distribution & Status Charts Implementation

## Phase Overview

**Objective**: Implement priority distribution pie charts, status flow visualizations, and board workload distribution charts.

**Duration**: 3-4 days

**Prerequisites**: Phase 2A completed (chart infrastructure established)

**Success Criteria**:

- Priority distribution pie/donut charts implemented
- Task status flow visualization created
- Board workload distribution chart functional
- Multiple chart types integrated into dashboard layout

## Technical Implementation

### Step 1: Create Distribution Data Actions

Create `actions/dashboard/charts/get-distribution-data.ts`:

```typescript
"use server";

import { auth } from "@/auth";
import db from "@/lib/db";
import { z } from "zod";
import {
  taskPriorityColors,
  taskStatusColors,
} from "@/lib/dashboard/chart-utils";

const DistributionDataSchema = z.object({
  type: z.enum(["priority", "status", "board", "user"]),
  dateRange: z.enum(["7d", "30d", "90d", "all"]).optional().default("30d"),
  boardId: z.string().optional(),
  includeCompleted: z.boolean().optional().default(true),
});

export type DistributionDataPoint = {
  name: string;
  value: number;
  percentage: number;
  color: string;
  label: string;
};

export type DistributionData = {
  data: DistributionDataPoint[];
  total: number;
  chartConfig: {
    [key: string]: {
      label: string;
      color: string;
    };
  };
  summary: {
    mostCommon: {
      name: string;
      percentage: number;
    };
    leastCommon: {
      name: string;
      percentage: number;
    };
    distribution: string;
  };
};

export async function getDistributionData(
  input: z.infer<typeof DistributionDataSchema>
): Promise<{ data?: DistributionData; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { error: "Authentication required" };
    }

    const companyId = session.user.cid;
    if (!companyId) {
      return { error: "Company context required" };
    }

    const validatedInput = DistributionDataSchema.parse(input);
    const { type, dateRange, boardId, includeCompleted } = validatedInput;

    // Calculate date filter
    const now = new Date();
    let dateFilter: Date | undefined;

    switch (dateRange) {
      case "7d":
        dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "30d":
        dateFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "90d":
        dateFilter = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        dateFilter = undefined;
    }

    // Base filter
    const baseFilter = {
      companyId,
      ...(boardId && { boardId }),
      ...(dateFilter && { createdAt: { gte: dateFilter } }),
      ...(!includeCompleted && { status: { not: "COMPLETED" } }),
    };

    let chartConfig: { [key: string]: { label: string; color: string } } = {};
    let groupedData: { [key: string]: number } = {};

    switch (type) {
      case "priority":
        chartConfig = taskPriorityColors;
        const priorityGroups = await db.task.groupBy({
          by: ["priority"],
          where: baseFilter,
          _count: { id: true },
        });

        priorityGroups.forEach((group) => {
          groupedData[group.priority] = group._count.id;
        });
        break;

      case "status":
        chartConfig = taskStatusColors;
        const statusGroups = await db.task.groupBy({
          by: ["status"],
          where: baseFilter,
          _count: { id: true },
        });

        statusGroups.forEach((group) => {
          groupedData[group.status] = group._count.id;
        });
        break;

      case "board":
        const boardGroups = await db.task.groupBy({
          by: ["boardId"],
          where: baseFilter,
          _count: { id: true },
        });

        // Get board titles
        const boardIds = boardGroups.map((g) => g.boardId);
        const boards = await db.board.findMany({
          where: { id: { in: boardIds }, companyId },
          select: { id: true, title: true },
        });

        const boardMap = new Map(boards.map((b) => [b.id, b.title]));

        boardGroups.forEach((group, index) => {
          const boardTitle = boardMap.get(group.boardId) || "Unknown Board";
          groupedData[boardTitle] = group._count.id;
          chartConfig[boardTitle] = {
            label: boardTitle,
            color: `hsl(var(--chart-${(index % 5) + 1}))`,
          };
        });
        break;

      case "user":
        const userGroups = await db.task.groupBy({
          by: ["assignedToId"],
          where: {
            ...baseFilter,
            assignedToId: { not: null },
          },
          _count: { id: true },
        });

        // Get user names
        const userIds = userGroups
          .map((g) => g.assignedToId)
          .filter(Boolean) as string[];
        const users = await db.user.findMany({
          where: { id: { in: userIds }, cid: companyId },
          select: { id: true, name: true, email: true },
        });

        const userMap = new Map(users.map((u) => [u.id, u.name || u.email]));

        userGroups.forEach((group, index) => {
          if (group.assignedToId) {
            const userName = userMap.get(group.assignedToId) || "Unknown User";
            groupedData[userName] = group._count.id;
            chartConfig[userName] = {
              label: userName,
              color: `hsl(var(--chart-${(index % 5) + 1}))`,
            };
          }
        });
        break;
    }

    // Calculate total and percentages
    const total = Object.values(groupedData).reduce(
      (sum, count) => sum + count,
      0
    );

    const distributionData: DistributionDataPoint[] = Object.entries(
      groupedData
    )
      .map(([name, value]) => ({
        name,
        value,
        percentage:
          total > 0 ? Math.round((value / total) * 100 * 100) / 100 : 0,
        color: chartConfig[name]?.color || "hsl(var(--muted))",
        label: chartConfig[name]?.label || name,
      }))
      .sort((a, b) => b.value - a.value);

    // Summary statistics
    const mostCommon = distributionData[0] || { name: "None", percentage: 0 };
    const leastCommon = distributionData[distributionData.length - 1] || {
      name: "None",
      percentage: 0,
    };

    const distribution =
      distributionData.length <= 2
        ? "concentrated"
        : distributionData.length >= 6
          ? "diverse"
          : "balanced";

    const result: DistributionData = {
      data: distributionData,
      total,
      chartConfig,
      summary: {
        mostCommon: {
          name: mostCommon.name,
          percentage: mostCommon.percentage,
        },
        leastCommon: {
          name: leastCommon.name,
          percentage: leastCommon.percentage,
        },
        distribution,
      },
    };

    return { data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: "Invalid input parameters" };
    }
    console.error("Distribution data error:", error);
    return { error: "Failed to retrieve distribution data" };
  }
}
```

### Step 2: Create Distribution Chart Component

Create `components/dashboard/charts/distribution-chart.tsx`:

```typescript
"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { PieChart, BarChart3, TrendingUp } from "lucide-react"
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts"
import { getDistributionData, type DistributionData } from "@/actions/dashboard/charts/get-distribution-data"

interface DistributionChartProps {
  type: 'priority' | 'status' | 'board' | 'user'
  title: string
  boardId?: string
  className?: string
}

type ChartType = 'pie' | 'donut' | 'bar'
type DateRange = '7d' | '30d' | '90d' | 'all'

export function DistributionChart({ type, title, boardId, className }: DistributionChartProps) {
  const [data, setData] = useState<DistributionData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [chartType, setChartType] = useState<ChartType>('donut')
  const [dateRange, setDateRange] = useState<DateRange>('30d')

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true)
      setError(null)

      try {
        const result = await getDistributionData({
          type,
          dateRange,
          boardId,
        })

        if (result.error) {
          setError(result.error)
        } else if (result.data) {
          setData(result.data)
        }
      } catch (err) {
        console.error('Failed to fetch distribution data:', err)
        setError('Failed to load chart data')
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [type, dateRange, boardId])

  const renderPieChart = (innerRadius = 0) => {
    if (!data) return null

    return (
      <RechartsPieChart>
        <Pie
          data={data.data}
          cx="50%"
          cy="50%"
          innerRadius={innerRadius}
          outerRadius={80}
          paddingAngle={2}
          dataKey="value"
        >
          {data.data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              const data = payload[0].payload
              return (
                <div className="rounded-lg border bg-background p-2 shadow-sm">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded"
                      style={{ backgroundColor: data.color }}
                    />
                    <span className="font-medium">{data.name}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {data.value} tasks ({data.percentage}%)
                  </div>
                </div>
              )
            }
            return null
          }}
        />
      </RechartsPieChart>
    )
  }

  const renderBarChart = () => {
    if (!data) return null

    return (
      <BarChart data={data.data} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis
          dataKey="name"
          className="text-xs fill-muted-foreground"
          tickLine={false}
          axisLine={false}
          angle={-45}
          textAnchor="end"
          height={60}
        />
        <YAxis
          className="text-xs fill-muted-foreground"
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          content={({ active, payload, label }) => {
            if (active && payload && payload.length) {
              const data = payload[0].payload
              return (
                <div className="rounded-lg border bg-background p-2 shadow-sm">
                  <div className="font-medium">{label}</div>
                  <div className="text-sm text-muted-foreground">
                    {data.value} tasks ({data.percentage}%)
                  </div>
                </div>
              )
            }
            return null
          }}
        />
        <Bar dataKey="value">
          {data.data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    )
  }

  const renderChart = () => {
    switch (chartType) {
      case 'pie':
        return renderPieChart(0)
      case 'donut':
        return renderPieChart(40)
      case 'bar':
        return renderBarChart()
      default:
        return null
    }
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="h-5 w-5" />
            {title}
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
            <PieChart className="h-5 w-5" />
            {title}
          </CardTitle>
          <div className="flex items-center gap-2">
            {/* Chart type toggle */}
            <ToggleGroup
              type="single"
              value={chartType}
              onValueChange={(value) => value && setChartType(value as ChartType)}
              size="sm"
            >
              <ToggleGroupItem value="donut" aria-label="Donut chart">
                Donut
              </ToggleGroupItem>
              <ToggleGroupItem value="pie" aria-label="Pie chart">
                Pie
              </ToggleGroupItem>
              <ToggleGroupItem value="bar" aria-label="Bar chart">
                Bar
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <CardDescription>
            Distribution breakdown
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
            <ToggleGroupItem value="all">All</ToggleGroupItem>
          </ToggleGroup>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-[200px] w-full" />
            <div className="flex gap-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
        ) : data ? (
          <div className="space-y-4">
            {/* Summary metrics */}
            <div className="flex flex-wrap gap-2 text-sm">
              <Badge variant="secondary">
                Total: {data.total}
              </Badge>
              <Badge variant="outline">
                Most: {data.summary.mostCommon.name} ({data.summary.mostCommon.percentage}%)
              </Badge>
              <Badge variant="outline" className="capitalize">
                {data.summary.distribution}
              </Badge>
            </div>

            {/* Chart */}
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                {renderChart()}
              </ResponsiveContainer>
            </div>

            {/* Legend for pie/donut charts */}
            {(chartType === 'pie' || chartType === 'donut') && (
              <div className="grid grid-cols-2 gap-2 text-sm">
                {data.data.slice(0, 6).map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-sm flex-shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="truncate">{item.name}</span>
                    <span className="text-muted-foreground ml-auto">
                      {item.percentage}%
                    </span>
                  </div>
                ))}
                {data.data.length > 6 && (
                  <div className="col-span-2 text-center text-muted-foreground text-xs">
                    +{data.data.length - 6} more
                  </div>
                )}
              </div>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
```

### Step 3: Create Status Flow Chart Component

Create `components/dashboard/charts/status-flow-chart.tsx`:

```typescript
"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Workflow } from "lucide-react";
import { getTaskStatusFlow } from "@/actions/dashboard/charts/get-status-flow-data";

// Create the status flow data action first
```

### Step 4: Update Dashboard Layout

Update `app/(app)/[cid]/dashboard/page.tsx` to include new charts:

```typescript
import { Suspense } from "react"
import { SectionCards } from "./_components/section-cards"
import { ChartAreaInteractive } from "./_components/chart-area-interactive"
import { DistributionChart } from "@/components/dashboard/charts/distribution-chart"

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your team's productivity and project status.
        </p>
      </div>

      {/* Metrics Cards */}
      <Suspense fallback={<div>Loading metrics...</div>}>
        <SectionCards />
      </Suspense>

      {/* Main Chart */}
      <Suspense fallback={<div>Loading timeline...</div>}>
        <ChartAreaInteractive />
      </Suspense>

      {/* Distribution Charts */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Suspense fallback={<div>Loading priority chart...</div>}>
          <DistributionChart
            type="priority"
            title="Priority Distribution"
            className="w-full"
          />
        </Suspense>

        <Suspense fallback={<div>Loading status chart...</div>}>
          <DistributionChart
            type="status"
            title="Status Distribution"
            className="w-full"
          />
        </Suspense>

        <Suspense fallback={<div>Loading board chart...</div>}>
          <DistributionChart
            type="board"
            title="Board Workload"
            className="w-full"
          />
        </Suspense>
      </div>
    </div>
  )
}
```

## Testing and Verification

### Manual Testing Checklist

- [ ] Priority distribution chart displays correctly
- [ ] Status distribution chart shows proper breakdown
- [ ] Board workload chart renders without errors
- [ ] Chart type toggles (pie/donut/bar) work properly
- [ ] Date range filtering functions correctly
- [ ] Charts are responsive on mobile devices
- [ ] Loading states display smoothly
- [ ] Error handling works for failed requests

### Performance Verification

- [ ] Multiple charts load efficiently
- [ ] No excessive re-renders on toggle changes
- [ ] Database queries are optimized
- [ ] Memory usage stays reasonable

## Completion Checklist

### Build & Quality

- [ ] `pnpm build` passes
- [ ] `pnpm lint` passes
- [ ] TypeScript compilation successful
- [ ] All chart types render correctly

### Security & Data

- [ ] All actions validate session and company ID
- [ ] Input validation with Zod schemas
- [ ] Error handling follows patterns
- [ ] No data leakage between companies

### UI/UX Standards

- [ ] Charts follow design system colors
- [ ] Responsive design works on all devices
- [ ] Accessibility maintained in charts
- [ ] Loading states match design

## Files Created/Modified

### New Files

- `actions/dashboard/charts/get-distribution-data.ts`
- `components/dashboard/charts/distribution-chart.tsx`

### Modified Files

- `app/(app)/[cid]/dashboard/page.tsx`

## Next Phase Preparation

Phase 2C will add:

- Team performance comparison charts
- User productivity visualizations
- Collaboration pattern analysis
- Advanced chart interactions

This completes Phase 2B with comprehensive distribution and status visualization capabilities.
