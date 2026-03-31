"use client";

import { Card, Title, BarChart, AreaChart } from "@tremor/react";
import type { ChartDataPoint } from "@/actions/reports/types";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";

const dataFormatter = (number: number) => number.toFixed(0);

type ReportChartProps = {
  data: ChartDataPoint[];
  titleKey: string;
  type?: "bar" | "area";
  categories?: string[];
};

export function ReportChart({ data, titleKey, type = "bar", categories = ["Number"] }: ReportChartProps) {
  const t = useTranslations("ReportsPage.charts");
  const { resolvedTheme } = useTheme();
  const chartColors: string[] = resolvedTheme === "dark" ? ["amber"] : ["orange"];

  if (!data || data.length === 0) {
    return (
      <Card className="rounded-md">
        <Title>{t(titleKey)}</Title>
        <div className="flex items-center justify-center h-48 text-muted-foreground">{t("noData")}</div>
      </Card>
    );
  }

  return (
    <Card className="rounded-md">
      <Title>{t(titleKey)}</Title>
      {type === "bar" ? (
        <BarChart className="mt-6" data={data} index="name" categories={categories} colors={chartColors} valueFormatter={dataFormatter} yAxisWidth={48} />
      ) : (
        <AreaChart className="h-72 mt-4" data={data} index="name" categories={categories} colors={chartColors} valueFormatter={dataFormatter} />
      )}
    </Card>
  );
}
