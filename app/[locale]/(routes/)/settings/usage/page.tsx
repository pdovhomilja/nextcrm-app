"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, TrendingUp, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { getOrganizationUsage, getUsagePercentages } from "@/actions/usage/get-usage";
import { getPlanLimits, PLANS } from "@/lib/subscription-plans";
import { PlanLimitIndicator } from "@/components/plan-limit-indicator";
import { formatBytes, formatNumber } from "@/lib/format-utils";

interface UsageData {
  plan: string;
  metrics: {
    usersCount: number;
    contactsCount: number;
    storageBytes: number;
    projectsCount: number;
    documentsCount: number;
    accountsCount: number;
    leadsCount: number;
    opportunitiesCount: number;
    tasksCount: number;
  };
  limits: {
    users: number;
    contacts: number;
    storage: number;
    projects: number;
    documents: number;
  };
  lastCalculatedAt: Date | null;
}

export default function UsagePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [usageData, setUsageData] = useState<UsageData | null>(null);
  const [percentages, setPercentages] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    if (!session?.user?.organizationId) {
      return;
    }

    const fetchUsageData = async () => {
      try {
        const usage = await getOrganizationUsage(session.user.organizationId);
        const percentages = await getUsagePercentages(session.user.organizationId);

        if (usage) {
          setUsageData(usage);
          setPercentages(percentages);
        }
      } catch (error) {
        console.error("Error fetching usage data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsageData();
  }, [session, status, router]);

  if (status === "loading" || isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="mt-2 text-muted-foreground">Loading usage data...</p>
        </div>
      </div>
    );
  }

  if (!usageData || !percentages) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Unable to load usage data</p>
        </div>
      </div>
    );
  }

  const formatLimit = (limit: number, type: "storage" | "other" = "other"): string => {
    if (limit === -1) return "Unlimited";
    if (type === "storage") {
      return formatBytes(limit);
    }
    return formatNumber(limit);
  };

  const formatUsage = (used: number, type: "storage" | "other" = "other"): string => {
    if (type === "storage") {
      return formatBytes(used);
    }
    return formatNumber(used);
  };

  const isApproachingLimit = (percentage: number): boolean => percentage >= 80;
  const isAtLimit = (percentage: number): boolean => percentage >= 100;

  const metrics = [
    {
      label: "Users",
      icon: "👥",
      used: usageData.metrics.usersCount,
      limit: usageData.limits.users,
      type: "other" as const,
      percentage: percentages.users,
    },
    {
      label: "Contacts",
      icon: "📇",
      used: usageData.metrics.contactsCount,
      limit: usageData.limits.contacts,
      type: "other" as const,
      percentage: percentages.contacts,
    },
    {
      label: "Projects/Boards",
      icon: "📊",
      used: usageData.metrics.projectsCount,
      limit: usageData.limits.projects,
      type: "other" as const,
      percentage: percentages.projects,
    },
    {
      label: "Documents",
      icon: "📄",
      used: usageData.metrics.documentsCount,
      limit: usageData.limits.documents,
      type: "other" as const,
      percentage: percentages.documents,
    },
    {
      label: "Storage",
      icon: "💾",
      used: usageData.metrics.storageBytes,
      limit: usageData.limits.storage,
      type: "storage" as const,
      percentage: percentages.storage,
    },
  ];

  const planName = PLANS[usageData.plan as keyof typeof PLANS]?.name || usageData.plan;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Usage & Limits</h1>
        <p className="text-muted-foreground mt-1">
          Monitor your organization&apos;s resource usage and plan limits.
        </p>
      </div>

      {/* Plan Info Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Current Plan</CardTitle>
              <CardDescription>Your organization&apos;s subscription tier</CardDescription>
            </div>
            <Badge variant="outline" className="text-lg px-3 py-1">
              {planName}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            <p>Last updated: {usageData.lastCalculatedAt
              ? new Date(usageData.lastCalculatedAt).toLocaleString()
              : "Never"}</p>
          </div>
          <Button asChild className="mt-4">
            <Link href="/pricing">Compare Plans</Link>
          </Button>
        </CardContent>
      </Card>

      {/* Usage Metrics Grid */}
      <div className="grid gap-6">
        {metrics.map((metric) => {
          const approaching = isApproachingLimit(metric.percentage);
          const atLimit = isAtLimit(metric.percentage);

          return (
            <Card
              key={metric.label}
              className={
                atLimit ? "border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/20" : ""
              }
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{metric.icon}</span>
                    <div>
                      <CardTitle className="text-lg">{metric.label}</CardTitle>
                      <CardDescription>
                        {formatUsage(metric.used, metric.type)} /{" "}
                        {formatLimit(metric.limit, metric.type)}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="text-right">
                    {atLimit ? (
                      <Badge variant="destructive" className="gap-1">
                        <AlertCircle className="h-3 w-3" />
                        Limit Exceeded
                      </Badge>
                    ) : approaching ? (
                      <Badge variant="secondary" className="gap-1">
                        <TrendingUp className="h-3 w-3" />
                        {Math.round(metric.percentage)}%
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        {Math.round(metric.percentage)}%
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Progress
                    value={Math.min(metric.percentage, 100)}
                    className={
                      atLimit ? "[&>div]:bg-red-500" : approaching ? "[&>div]:bg-yellow-500" : ""
                    }
                  />
                  {approaching && (
                    <p className={`text-xs ${atLimit ? "text-red-600" : "text-yellow-600"}`}>
                      {atLimit
                        ? "You have reached your limit. Please upgrade your plan."
                        : "You are approaching your limit. Consider upgrading your plan."}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Additional Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Additional Metrics</CardTitle>
          <CardDescription>Other tracked resources in your organization</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Accounts</p>
              <p className="text-2xl font-bold">{formatNumber(usageData.metrics.accountsCount)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Leads</p>
              <p className="text-2xl font-bold">{formatNumber(usageData.metrics.leadsCount)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Opportunities</p>
              <p className="text-2xl font-bold">{formatNumber(usageData.metrics.opportunitiesCount)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Tasks</p>
              <p className="text-2xl font-bold">{formatNumber(usageData.metrics.tasksCount)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upgrade CTA */}
      {PLANS[usageData.plan as keyof typeof PLANS]?.name !== "Enterprise" && (
        <Card className="border-primary/50 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Need More Resources?
            </CardTitle>
            <CardDescription>
              Upgrade your plan to unlock higher limits and premium features.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild size="lg">
              <Link href="/pricing">View All Plans</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
