"use client";

import Link from "next/link";
import { Card } from "@tremor/react";
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
      <Card className="rounded-md cursor-pointer hover:shadow-md transition-shadow p-4">
        <p className="text-sm text-muted-foreground">{t(kpi.label)}</p>
        <div className="flex items-end justify-between mt-2">
          <p className="text-2xl font-bold">{formatValue(kpi.value, kpi.label)}</p>
          <div className={`flex items-center text-sm ${isPositive ? "text-green-600" : isZero ? "text-gray-500" : "text-red-600"}`}>
            {isPositive ? <ArrowUpRight className="h-4 w-4" /> : isZero ? <Minus className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
            <span>{Math.abs(kpi.changePercent)}%</span>
          </div>
        </div>
      </Card>
    </Link>
  );
}
