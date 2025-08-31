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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { PieChart } from "lucide-react";
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import {
  getDistributionData,
  type DistributionData,
} from "@/actions/dashboard/charts/get-distribution-data";

interface DistributionChartProps {
  type: "priority" | "status" | "board" | "user";
  title: string;
  boardId?: string;
  className?: string;
}

type ChartType = "pie" | "donut" | "bar";
type DateRange = "7d" | "30d" | "90d" | "all";

export function DistributionChart({
  type,
  title,
  boardId,
  className,
}: DistributionChartProps) {
  const [data, setData] = useState<DistributionData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [chartType, setChartType] = useState<ChartType>("donut");
  const [dateRange, setDateRange] = useState<DateRange>("30d");

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      setError(null);

      try {
        const result = await getDistributionData({
          type,
          dateRange,
          boardId,
          includeCompleted: true,
        });

        if (result.error) {
          setError(result.error);
        } else if (result.data) {
          setData(result.data);
        }
      } catch (err) {
        console.error("Failed to fetch distribution data:", err);
        setError("Failed to load chart data");
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [type, dateRange, boardId]);

  const renderPieChart = (innerRadius = 0) => {
    if (!data) return null;

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
              const data = payload[0].payload;
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
              );
            }
            return null;
          }}
        />
      </RechartsPieChart>
    );
  };

  const renderBarChart = () => {
    if (!data) return null;

    return (
      <BarChart
        data={data.data}
        margin={{ top: 10, right: 10, bottom: 0, left: 0 }}
      >
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
              const data = payload[0].payload;
              return (
                <div className="rounded-lg border bg-background p-2 shadow-sm">
                  <div className="font-medium">{label}</div>
                  <div className="text-sm text-muted-foreground">
                    {data.value} tasks ({data.percentage}%)
                  </div>
                </div>
              );
            }
            return null;
          }}
        />
        <Bar dataKey="value">
          {data.data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    );
  };

  const renderChart = () => {
    switch (chartType) {
      case "pie":
        return renderPieChart(0);
      case "donut":
        return renderPieChart(40);
      case "bar":
        return renderBarChart();
      default:
        return null;
    }
  };

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
    );
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
              onValueChange={(value) =>
                value && setChartType(value as ChartType)
              }
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
          <CardDescription>Distribution breakdown</CardDescription>
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
              <Badge variant="secondary">Total: {data.total}</Badge>
              <Badge variant="outline">
                Most: {data.summary.mostCommon.name} (
                {data.summary.mostCommon.percentage}%)
              </Badge>
              <Badge variant="outline" className="capitalize">
                {data.summary.distribution}
              </Badge>
            </div>

            {/* Chart */}
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                {renderChart() || <div />}
              </ResponsiveContainer>
            </div>

            {/* Legend for pie/donut charts */}
            {(chartType === "pie" || chartType === "donut") && (
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
  );
}
