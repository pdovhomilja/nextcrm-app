import { ChartAreaInteractive } from "./_components/chart-area-interactive";
import { SectionCards } from "./_components/section-cards";
import { SimpleSectionCards } from "./_components/simple-section-cards";
import { DynamicSectionCards } from "./_components/dynamic-section-cards";
import { EnhancedDynamicCards } from "./_components/enhanced-dynamic-cards";
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
  const [taskMetricsResult, boardMetricsResult, userMetricsResult] =
    await Promise.all([getTaskMetrics(), getBoardMetrics(), getUserMetrics()]);

  // Extract data from results, handling errors gracefully
  const taskMetrics = taskMetricsResult.data;
  const boardMetrics = boardMetricsResult.data;
  const userMetrics = userMetricsResult.data;

  // Log any errors for debugging (in development)
  if (taskMetricsResult.error) {
    console.error("Task metrics error:", taskMetricsResult.error);
  }
  if (boardMetricsResult.error) {
    console.error("Board metrics error:", boardMetricsResult.error);
  }
  if (userMetricsResult.error) {
    console.error("User metrics error:", userMetricsResult.error);
  }

  return (
    <SidebarInset>
      <SiteHeader title="Dashboard - All Card Systems">
        <div></div>
      </SiteHeader>
      <div className="flex flex-1 flex-col border-black">
        <div className="@container/main flex flex-1 flex-col gap-8 py-4 md:py-6">
          {/* Original Modular Cards (Main Branch) */}
          <div className="space-y-4">
            <SectionCards />
          </div>
          {/* Enhanced Dynamic Cards (Best of Both) */}
          <div className="space-y-4">
            <EnhancedDynamicCards
              taskMetrics={taskMetrics}
              boardMetrics={boardMetrics}
              userMetrics={userMetrics}
            />
          </div>
          {/* Chart Section */}
          <div className="px-4 lg:px-6">
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                📈 Charts & Analytics
              </h2>
              <ChartAreaInteractive />
            </div>
          </div>
        </div>
      </div>
    </SidebarInset>
  );
}
