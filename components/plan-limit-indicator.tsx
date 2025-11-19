"use client";

import React from "react";
import { OrganizationPlan } from "@prisma/client";
import { getPlanLimits } from "@/lib/subscription-plans";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import Link from "next/link";

interface PlanLimitIndicatorProps {
  plan: OrganizationPlan;
  usage: {
    users: number;
    contacts: number;
    storage: number;
    projects: number;
    documents: number;
  };
  compact?: boolean;
}

export function PlanLimitIndicator({ plan, usage, compact = false }: PlanLimitIndicatorProps) {
  const limits = getPlanLimits(plan);

  const calculatePercentage = (used: number, limit: number): number => {
    if (limit === -1) return 0;
    return Math.min((used / limit) * 100, 100);
  };

  const formatLimit = (limit: number): string => {
    if (limit === -1) return "Unlimited";
    if (limit >= 1024 * 1024 * 1024 * 1024) {
      return `${(limit / (1024 * 1024 * 1024 * 1024)).toFixed(0)}TB`;
    }
    if (limit >= 1024 * 1024 * 1024) {
      return `${(limit / (1024 * 1024 * 1024)).toFixed(0)}GB`;
    }
    return limit.toString();
  };

  const formatUsage = (used: number, type: "storage" | "other"): string => {
    if (type === "storage") {
      if (used >= 1024 * 1024 * 1024) {
        return `${(used / (1024 * 1024 * 1024)).toFixed(2)}GB`;
      }
      if (used >= 1024 * 1024) {
        return `${(used / (1024 * 1024)).toFixed(2)}MB`;
      }
      return `${(used / 1024).toFixed(2)}KB`;
    }
    return used.toString();
  };

  const isApproachingLimit = (used: number, limit: number): boolean => {
    if (limit === -1) return false;
    return (used / limit) >= 0.8;
  };

  const isAtLimit = (used: number, limit: number): boolean => {
    if (limit === -1) return false;
    return used >= limit;
  };

  const metrics = [
    { label: "Users", used: usage.users, limit: limits.users, type: "other" as const },
    { label: "Contacts", used: usage.contacts, limit: limits.contacts, type: "other" as const },
    { label: "Projects", used: usage.projects, limit: limits.projects, type: "other" as const },
    { label: "Documents", used: usage.documents, limit: limits.documents, type: "other" as const },
    { label: "Storage", used: usage.storage, limit: limits.storage, type: "storage" as const },
  ];

  const hasWarnings = metrics.some(m => isApproachingLimit(m.used, m.limit) || isAtLimit(m.used, m.limit));

  if (compact) {
    return (
      <div className="space-y-2">
        {metrics.filter(m => isApproachingLimit(m.used, m.limit) || isAtLimit(m.used, m.limit)).map((metric) => (
          <div key={metric.label} className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-yellow-500" />
            <span className="text-sm">
              {metric.label}: {formatUsage(metric.used, metric.type)} / {formatLimit(metric.limit)}
            </span>
          </div>
        ))}
        {hasWarnings && (
          <Button asChild size="sm" variant="outline" className="w-full">
            <Link href="/pricing">Upgrade Plan</Link>
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Plan Usage</CardTitle>
        <CardDescription>
          Current plan: <span className="font-semibold">{plan}</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {metrics.map((metric) => {
          const percentage = calculatePercentage(metric.used, metric.limit);
          const approaching = isApproachingLimit(metric.used, metric.limit);
          const atLimit = isAtLimit(metric.used, metric.limit);

          return (
            <div key={metric.label} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{metric.label}</span>
                <span className={atLimit ? "text-red-500" : approaching ? "text-yellow-500" : "text-muted-foreground"}>
                  {formatUsage(metric.used, metric.type)} / {formatLimit(metric.limit)}
                </span>
              </div>
              {metric.limit !== -1 && (
                <Progress
                  value={percentage}
                  className={atLimit ? "[&>div]:bg-red-500" : approaching ? "[&>div]:bg-yellow-500" : ""}
                />
              )}
            </div>
          );
        })}
        {hasWarnings && (
          <div className="pt-4">
            <Button asChild className="w-full">
              <Link href="/pricing">Upgrade Your Plan</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
