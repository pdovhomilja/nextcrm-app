import { Suspense } from "react";
import dynamic from "next/dynamic";
import { SectionCards } from "./_components/section-cards";
import { EnhancedDynamicCards } from "./_components/enhanced-dynamic-cards";

import { SiteHeader } from "@/components/site-header";
import { SidebarInset } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";

const ChartAreaInteractive = dynamic(
  () =>
    import("./_components/chart-area-interactive").then((m) => ({
      default: m.ChartAreaInteractive,
    })),
  { loading: () => <Skeleton className="h-[400px] w-full" /> },
);

const DistributionChart = dynamic(
  () =>
    import("@/components/dashboard/charts/distribution-chart").then((m) => ({
      default: m.DistributionChart,
    })),
  { loading: () => <Skeleton className="h-[400px] w-full" /> },
);

import { getTaskMetrics } from "@/actions/dashboard/get-task-metrics";
import { getBoardMetrics } from "@/actions/dashboard/get-board-metrics";

interface DashboardPageProps {
  params: Promise<{
    cid: string;
  }>;
}

export default async function DashboardPage({ params }: DashboardPageProps) {
  const { cid } = await params;

  // Fetch all metrics in parallel for better performance
  const [taskMetricsResult, boardMetricsResult] = await Promise.all([
    getTaskMetrics({ companyId: cid, dateRange: "30d" }),
    getBoardMetrics({ companyId: cid, dateRange: "30d", includeSections: true }),
  ]);

  // Extract data from results, handling errors gracefully
  const taskMetrics = taskMetricsResult.data;

  // Log any errors for debugging (in development)
  if (taskMetricsResult.error) {
    console.error("Task metrics error:", taskMetricsResult.error);
  }
  if (boardMetricsResult.error) {
    console.error("Board metrics error:", boardMetricsResult.error);
  }

  return (
    <SidebarInset>
      <SiteHeader title="Dashboard - Analytics Overview">
        <div></div>
      </SiteHeader>
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-8 py-4 md:py-6">
          {/* Metrics Cards */}
          <Suspense fallback={<Skeleton className="h-32 w-full" />}>
            <div className="space-y-4 px-4 lg:px-6">
              <SectionCards companyId={cid} />
            </div>
          </Suspense>

          {/* Enhanced Dynamic Cards */}
          <Suspense fallback={<Skeleton className="h-32 w-full" />}>
            <div className="space-y-4">
              <EnhancedDynamicCards taskMetrics={taskMetrics} cid={cid} />
            </div>
          </Suspense>

          {/* Timeline Chart */}
          <Suspense fallback={<Skeleton className="h-[400px] w-full" />}>
            <div className="px-4 lg:px-6">
              <div className="space-y-4">
                <ChartAreaInteractive companyId={cid} />
              </div>
            </div>
          </Suspense>

          {/* Distribution Charts */}
          <div className="px-4 lg:px-6">
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Suspense fallback={<Skeleton className="h-[400px] w-full" />}>
                  <DistributionChart
                    type="priority"
                    title="Priority Distribution"
                    className="w-full"
                    companyId={cid}
                  />
                </Suspense>

                <Suspense fallback={<Skeleton className="h-[400px] w-full" />}>
                  <DistributionChart
                    type="status"
                    title="Status Distribution"
                    className="w-full"
                    companyId={cid}
                  />
                </Suspense>

                <Suspense fallback={<Skeleton className="h-[400px] w-full" />}>
                  <DistributionChart
                    type="board"
                    title="Board Workload"
                    className="w-full"
                    companyId={cid}
                  />
                </Suspense>
              </div>
            </div>
          </div>

          {/* Task Data Table */}
        </div>
      </div>
    </SidebarInset>
  );
}
