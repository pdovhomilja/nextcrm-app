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
          includeCompleted: true,
          includeCreated: true,
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
                {renderChart() || <div />}
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