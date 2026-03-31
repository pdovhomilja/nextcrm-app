"use client";

import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import type { KPIData } from "@/actions/reports/types";
import { useTranslations } from "next-intl";

function formatValue(value: number, label: string): string {
  if (label === "totalRevenue" || label === "pipelineValue") {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
  }
  if (label === "conversionRate") return `${value}%`;
  return new Intl.NumberFormat("en-US").format(value);
}

export function KPICard({ kpi, dateParams }: { kpi: KPIData; dateParams: string }) {
  const t = useTranslations("ReportsPage.kpi");
  const isPositive = kpi.changePercent > 0;
  const isZero = kpi.changePercent === 0;

  return (
    <Link href={`${kpi.href}?${dateParams}`}>
      <Card className="cursor-pointer hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{t(kpi.label)}</CardTitle>
          <div className={`flex items-center text-sm ${isPositive ? "text-green-600 dark:text-green-400" : isZero ? "text-gray-500 dark:text-gray-400" : "text-red-600 dark:text-red-400"}`}>
            {isPositive ? <ArrowUpRight className="h-4 w-4" /> : isZero ? <Minus className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
            <span>{Math.abs(kpi.changePercent)}%</span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-medium">{formatValue(kpi.value, kpi.label)}</div>
        </CardContent>
      </Card>
    </Link>
  );
}
