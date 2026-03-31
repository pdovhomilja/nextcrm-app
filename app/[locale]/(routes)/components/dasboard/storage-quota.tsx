"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Database } from "lucide-react";

// Single KPI card in the demo dashboard with sample inputs
export default function StorageQuota({
  actual,
  title,
}: {
  actual: number;
  title: string;
}) {
  const percent = parseFloat((100 * (actual / 2000)).toFixed(2));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Database className="w-4 h-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-medium">{actual}/MB</div>
        <div className="flex justify-between mt-4">
          <p className="truncate text-sm text-muted-foreground">
            {percent}% ({actual}MB)
          </p>
          <p className="text-sm text-muted-foreground">2000MB</p>
        </div>
        <div className="mt-2 h-2 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-orange-500"
            style={{ width: `${Math.min(percent, 100)}%` }}
          />
        </div>
      </CardContent>
    </Card>
  );
}
