"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, Clock, TrendingUp } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface RateLimitStatus {
  limit: number;
  remaining: number;
  resetIn: string;
  percentUsed: number;
}

interface RateLimitIndicatorProps {
  organizationId?: string;
  showInline?: boolean; // Show as inline badge vs alert
  className?: string;
}

/**
 * Rate Limit Indicator Component
 * Displays current rate limit status to users
 */
export function RateLimitIndicator({
  organizationId,
  showInline = false,
  className = "",
}: RateLimitIndicatorProps) {
  const [status, setStatus] = useState<RateLimitStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRateLimitStatus() {
      try {
        const response = await fetch("/api/rate-limit");
        if (!response.ok) {
          throw new Error("Failed to fetch rate limit status");
        }
        const data = await response.json();
        setStatus(data);
        setError(null);
      } catch (err) {
        console.error("Error fetching rate limit:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    if (organizationId) {
      fetchRateLimitStatus();
      // Refresh every 60 seconds
      const interval = setInterval(fetchRateLimitStatus, 60000);
      return () => clearInterval(interval);
    } else {
      setLoading(false);
    }
  }, [organizationId]);

  if (loading) {
    return null; // Don't show anything while loading
  }

  if (error || !status) {
    return null; // Silently fail - rate limit indicator is not critical
  }

  // Determine severity level
  const getSeverity = (percentUsed: number) => {
    if (percentUsed >= 90) return "critical";
    if (percentUsed >= 75) return "warning";
    return "normal";
  };

  const severity = getSeverity(status.percentUsed);

  // Inline badge view (compact)
  if (showInline) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant={severity === "critical" ? "destructive" : severity === "warning" ? "default" : "secondary"}
              className={`cursor-help ${className}`}
            >
              <TrendingUp className="w-3 h-3 mr-1" />
              {status.remaining} / {status.limit}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <div className="space-y-2">
              <p className="font-semibold">API Rate Limit</p>
              <div className="text-sm space-y-1">
                <p>Remaining: {status.remaining}</p>
                <p>Limit: {status.limit}</p>
                <p>Resets in: {status.resetIn}</p>
                <p>Used: {status.percentUsed}%</p>
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Don't show alert if usage is normal
  if (severity === "normal") {
    return null;
  }

  // Alert view (prominent)
  return (
    <Alert
      variant={severity === "critical" ? "destructive" : "default"}
      className={className}
    >
      <AlertCircle className="h-4 w-4" />
      <AlertTitle className="flex items-center justify-between">
        <span>
          {severity === "critical"
            ? "Rate Limit Almost Reached"
            : "Approaching Rate Limit"}
        </span>
        <Badge variant="outline" className="ml-2">
          {status.remaining} / {status.limit}
        </Badge>
      </AlertTitle>
      <AlertDescription className="mt-2 space-y-3">
        <p className="text-sm">
          {severity === "critical"
            ? `You have only ${status.remaining} requests remaining in your current plan. `
            : `You have used ${status.percentUsed}% of your rate limit. `}
          {status.remaining === 0
            ? "Your rate limit will reset soon."
            : "Consider upgrading your plan for higher limits."}
        </p>

        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Usage</span>
            <span>{status.percentUsed}%</span>
          </div>
          <Progress value={status.percentUsed} className="h-2" />
        </div>

        <div className="flex items-center text-xs text-muted-foreground">
          <Clock className="w-3 h-3 mr-1" />
          <span>Resets in {status.resetIn}</span>
        </div>

        {severity === "critical" && (
          <div className="pt-2">
            <Link
              href="/settings/billing"
              className="text-sm font-medium underline underline-offset-4"
            >
              Upgrade your plan →
            </Link>
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
}

/**
 * Rate Limit Badge - Compact version for header/navbar
 */
export function RateLimitBadge({
  organizationId,
  className = "",
}: {
  organizationId?: string;
  className?: string;
}) {
  return (
    <RateLimitIndicator
      organizationId={organizationId}
      showInline
      className={className}
    />
  );
}
