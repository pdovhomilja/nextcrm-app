import { TaskMetricsCard } from "@/components/dashboard/metrics/task-metrics-card"
import { BoardMetricsCard } from "@/components/dashboard/metrics/board-metrics-card"
import { UserActivityCard } from "@/components/dashboard/metrics/user-activity-card"

export function SectionCards() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <TaskMetricsCard className="w-full" />
      <BoardMetricsCard className="w-full" />
      <UserActivityCard className="w-full" />
    </div>
  )
}
