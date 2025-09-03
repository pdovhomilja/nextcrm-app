import { TaskTimelineChart } from "@/components/dashboard/charts/task-timeline-chart";

interface ChartAreaInteractiveProps {
  companyId: string;
}

export function ChartAreaInteractive({ companyId }: ChartAreaInteractiveProps) {
  return (
    <div className="space-y-4">
      <TaskTimelineChart className="w-full" companyId={companyId} />
    </div>
  );
}
