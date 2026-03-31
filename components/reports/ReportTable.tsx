"use client";

import { useState } from "react";
import { Card, Title } from "@tremor/react";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ChartDataPoint } from "@/actions/reports/types";
import { useTranslations } from "next-intl";

type ReportTableProps = {
  data: ChartDataPoint[];
  titleKey: string;
  nameColumnKey?: string;
  valueColumnKey?: string;
};

export function ReportTable({ data, titleKey, nameColumnKey = "name", valueColumnKey = "value" }: ReportTableProps) {
  const t = useTranslations("ReportsPage.charts");
  const [sortAsc, setSortAsc] = useState(false);

  const sorted = [...data].sort((a, b) => sortAsc ? a.Number - b.Number : b.Number - a.Number);

  return (
    <Card className="rounded-md">
      <Title>{t(titleKey)}</Title>
      <table className="w-full mt-4">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2 text-sm text-muted-foreground">{t(nameColumnKey)}</th>
            <th className="text-right py-2">
              <Button variant="ghost" size="sm" onClick={() => setSortAsc(!sortAsc)}>
                {t(valueColumnKey)}
                <ArrowUpDown className="ml-1 h-3 w-3" />
              </Button>
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <tr key={row.name} className="border-b last:border-0">
              <td className="py-2 text-sm">{row.name}</td>
              <td className="py-2 text-sm text-right">{new Intl.NumberFormat("en-US").format(row.Number)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
