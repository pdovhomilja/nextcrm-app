import { TaskTimelineChart } from "@/components/dashboard/charts/task-timeline-chart";

export function ChartAreaInteractive() {
  return (
    <div className="space-y-4">
      <TaskTimelineChart className="w-full" />
    </div>
  );
}
