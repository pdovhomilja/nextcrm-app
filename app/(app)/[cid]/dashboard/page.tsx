import { ChartAreaInteractive } from "./_components/chart-area-interactive";
import { DynamicSectionCards } from "./_components/dynamic-section-cards";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset } from "@/components/ui/sidebar";

import { getTaskMetrics } from "@/actions/dashboard/get-task-metrics";
import { getBoardMetrics } from "@/actions/dashboard/get-board-metrics";
import { getUserMetrics } from "@/actions/dashboard/get-user-metrics";

interface DashboardPageProps {
  params: Promise<{
    cid: string;
  }>;
}

export default async function DashboardPage({ params }: DashboardPageProps) {
  const { cid } = await params;

  // Fetch all metrics in parallel for better performance
  const [taskMetricsResult, boardMetricsResult, userMetricsResult] = await Promise.all([
    getTaskMetrics(cid),
    getBoardMetrics(cid),
    getUserMetrics(cid),
  ]);

  // Extract data from results, handling errors gracefully
  const taskMetrics = taskMetricsResult.success ? taskMetricsResult.data : undefined;
  const boardMetrics = boardMetricsResult.success ? boardMetricsResult.data : undefined;
  const userMetrics = userMetricsResult.success ? userMetricsResult.data : undefined;

  // Log any errors for debugging (in development)
  if (!taskMetricsResult.success) {
    console.error("Task metrics error:", taskMetricsResult.error);
  }
  if (!boardMetricsResult.success) {
    console.error("Board metrics error:", boardMetricsResult.error);
  }
  if (!userMetricsResult.success) {
    console.error("User metrics error:", userMetricsResult.error);
  }

  return (
    <SidebarInset>
      <SiteHeader title="Dashboard">
        <div></div>
      </SiteHeader>
      <div className="flex flex-1 flex-col border-black">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            <DynamicSectionCards
              taskMetrics={taskMetrics}
              boardMetrics={boardMetrics}
              userMetrics={userMetrics}
            />
            <div className="px-4 lg:px-6">
              <ChartAreaInteractive />
            </div>
            {/* <DataTable data={data} /> */}
          </div>
        </div>
      </div>
    </SidebarInset>
  );
}
