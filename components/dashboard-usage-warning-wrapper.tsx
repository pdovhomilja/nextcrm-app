"use client";

import { UsageWarning } from "./usage-warning";

interface DashboardUsageWarningWrapperProps {
  organizationId: string;
}

export function DashboardUsageWarningWrapper({
  organizationId,
}: DashboardUsageWarningWrapperProps) {
  return <UsageWarning organizationId={organizationId} compact />;
}
