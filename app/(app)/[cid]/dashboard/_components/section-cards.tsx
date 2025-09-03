import { TaskMetricsCard } from "@/components/dashboard/metrics/task-metrics-card";
import { BoardMetricsCard } from "@/components/dashboard/metrics/board-metrics-card";
import { UserActivityCard } from "@/components/dashboard/metrics/user-activity-card";

interface SectionCardsProps {
  companyId: string;
}

export function SectionCards({ companyId }: SectionCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <TaskMetricsCard className="w-full" companyId={companyId} />
      <BoardMetricsCard className="w-full" companyId={companyId} />
      <UserActivityCard className="w-full" companyId={companyId} />
    </div>
  );
}
