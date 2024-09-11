"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Flex, ProgressBar, Text } from "@tremor/react";
import { Database, Server } from "lucide-react";

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
        <div>
          <Flex className="mt-4">
            <Text className="truncate">
              {percent}% ({actual}MB)
            </Text>
            <Text>2000MB</Text>
          </Flex>
        </div>
        <div>
          <ProgressBar value={percent} color={"orange"} className="mt-2" />
        </div>
      </CardContent>
    </Card>
  );
}
