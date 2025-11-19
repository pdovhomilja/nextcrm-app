"use client";

import React, { useEffect, useState } from "react";
import { AlertCircle, TrendingUp } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { getOrganizationUsage } from "@/actions/usage/get-usage";
import { getResourcesAtRisk } from "@/actions/usage/check-quota";

interface UsageWarningProps {
  organizationId: string;
  compact?: boolean;
}

interface ResourceAtRisk {
  approaching: string[];
  exceeded: string[];
}

export function UsageWarning({ organizationId, compact = false }: UsageWarningProps) {
  const [atRisk, setAtRisk] = useState<ResourceAtRisk | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchResourceStatus = async () => {
      try {
        const resources = await getResourcesAtRisk(organizationId);
        setAtRisk(resources);
      } catch (error) {
        console.error("Error fetching resource status:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchResourceStatus();
  }, [organizationId]);

  if (isLoading || !atRisk) {
    return null;
  }

  if (atRisk.exceeded.length === 0 && atRisk.approaching.length === 0) {
    return null;
  }

  const hasExceeded = atRisk.exceeded.length > 0;
  const resourceList = atRisk.exceeded.length > 0 ? atRisk.exceeded : atRisk.approaching;
  const resourceText = resourceList.join(", ");

  if (compact) {
    return (
      <div className="flex items-start gap-2 p-3 rounded-lg border border-yellow-200 bg-yellow-50 dark:bg-yellow-950 dark:border-yellow-800">
        <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
            {hasExceeded
              ? `You've reached your limit for: ${resourceText}`
              : `Approaching limit: ${resourceText}`}
          </p>
          <Button asChild size="sm" variant="ghost" className="mt-2 h-auto p-0 text-yellow-700 dark:text-yellow-400">
            <Link href="/settings/usage">View Usage</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Alert
      variant={hasExceeded ? "destructive" : "default"}
      className={hasExceeded ? "border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800" : "border-yellow-200 bg-yellow-50 dark:bg-yellow-950 dark:border-yellow-800"}
    >
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>
        {hasExceeded ? "Usage Limit Reached" : "Approaching Usage Limit"}
      </AlertTitle>
      <AlertDescription>
        <p className="mb-3">
          {hasExceeded
            ? `You have exceeded your limit for: ${resourceText}`
            : `You are approaching your limit for: ${resourceText}`}
        </p>
        <p className="text-sm mb-4">
          Upgrade your plan to increase your limits and unlock more features.
        </p>
        <div className="flex gap-2">
          <Button asChild size="sm" variant={hasExceeded ? "default" : "outline"}>
            <Link href="/pricing">Upgrade Plan</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/settings/usage">View Detailed Usage</Link>
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
