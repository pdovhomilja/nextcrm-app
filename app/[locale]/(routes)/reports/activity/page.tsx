import { getTranslations } from "next-intl/server";
import { Card, CardContent } from "@/components/ui/card";
import { ReportPageLayout } from "@/components/reports/ReportPageLayout";
import { ReportChart } from "@/components/reports/ReportChart";
import { parseSearchParamsToFilters } from "@/actions/reports/types";
import {
  getTasksCreatedCompleted,
  getOverdueTasks,
  getTasksByAssignee,
  getActivitiesByType,
} from "@/actions/reports/activity";

type Props = { searchParams: Promise<Record<string, string | undefined>> };

export default async function ActivityReportPage({ searchParams }: Props) {
  const resolvedParams = await searchParams;
  const params = new URLSearchParams(
    Object.entries(resolvedParams).filter(
      (entry): entry is [string, string] => entry[1] !== undefined
    )
  );
  const filters = parseSearchParamsToFilters(params);
  const t = await getTranslations("ReportsPage");

  const [tasksData, overdue, tasksByAssignee, activitiesByType] = await Promise.all([
    getTasksCreatedCompleted(filters),
    getOverdueTasks(filters),
    getTasksByAssignee(filters),
    getActivitiesByType(filters),
  ]);

  const taskChartData = tasksData.map((d) => ({
    name: d.name,
    Created: d.created,
    Completed: d.completed,
  }));

  return (
    <ReportPageLayout
      title={t("activity.title")}
      description={t("activity.description")}
      category="activity"
      currentFilters={params.toString()}
    >
      <Card><CardContent className="p-4">
        <p className="text-sm text-muted-foreground">{t("activity.overdueTasks")}</p>
        <p className="text-2xl font-bold mt-1 text-red-500">{overdue}</p>
      </CardContent></Card>
      <ReportChart
        data={taskChartData as never}
        titleKey="tasksCreatedCompleted"
        type="bar"
        categories={["Created", "Completed"]}
      />
      <ReportChart data={tasksByAssignee} titleKey="tasksByAssignee" type="bar" />
      <ReportChart data={activitiesByType} titleKey="activitiesByType" type="bar" />
    </ReportPageLayout>
  );
}
