"use client";

import {
  Bar,
  BarChart,
  Area,
  AreaChart,
  Pie,
  PieChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Cell,
  LabelList,
} from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ChartDataPoint } from "@/actions/reports/types";
import { useTranslations } from "next-intl";

type ReportChartProps = {
  data: ChartDataPoint[];
  titleKey: string;
  type?: "bar" | "area" | "pie";
  categories?: string[];
  layout?: "vertical" | "horizontal";
};

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

function buildChartConfig(categories: string[]): ChartConfig {
  const config: ChartConfig = {};
  categories.forEach((cat, i) => {
    config[cat] = {
      label: cat,
      color: CHART_COLORS[i % CHART_COLORS.length],
    };
  });
  return config;
}

export function ReportChart({
  data,
  titleKey,
  type = "bar",
  categories = ["Number"],
  layout = "vertical",
}: ReportChartProps) {
  const t = useTranslations("ReportsPage.charts");
  const chartConfig = buildChartConfig(categories);
  const showLegend = categories.length > 1;

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t(titleKey)}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-48 text-muted-foreground">
            {t("noData")}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t(titleKey)}</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-72 w-full">
          {type === "bar" ? (
            <BarChart
              data={data}
              layout={layout === "horizontal" ? "vertical" : "horizontal"}
              margin={{ left: 12, right: 12 }}
            >
              <CartesianGrid vertical={false} />
              {layout === "horizontal" ? (
                <>
                  <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} width={100} />
                  <XAxis type="number" tickLine={false} axisLine={false} />
                </>
              ) : (
                <>
                  <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} />
                  <YAxis tickLine={false} axisLine={false} width={48} />
                </>
              )}
              <ChartTooltip content={<ChartTooltipContent />} />
              {showLegend && <ChartLegend content={<ChartLegendContent />} />}
              {categories.map((cat, i) => (
                <Bar
                  key={cat}
                  dataKey={cat}
                  fill={CHART_COLORS[i % CHART_COLORS.length]}
                  radius={[4, 4, 0, 0]}
                />
              ))}
            </BarChart>
          ) : type === "area" ? (
            <AreaChart data={data} margin={{ left: 12, right: 12 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis tickLine={false} axisLine={false} width={48} />
              <ChartTooltip content={<ChartTooltipContent />} />
              {showLegend && <ChartLegend content={<ChartLegendContent />} />}
              {categories.map((cat, i) => (
                <Area
                  key={cat}
                  dataKey={cat}
                  type="monotone"
                  fill={CHART_COLORS[i % CHART_COLORS.length]}
                  fillOpacity={0.2}
                  stroke={CHART_COLORS[i % CHART_COLORS.length]}
                  strokeWidth={2}
                />
              ))}
            </AreaChart>
          ) : (
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent />} />
              <Pie
                data={data}
                dataKey="Number"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                strokeWidth={2}
              >
                {data.map((_, i) => (
                  <Cell
                    key={i}
                    fill={CHART_COLORS[i % CHART_COLORS.length]}
                  />
                ))}
                <LabelList
                  dataKey="name"
                  position="outside"
                  className="fill-foreground text-xs"
                />
              </Pie>
              <ChartLegend content={<ChartLegendContent nameKey="name" />} />
            </PieChart>
          )}
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
