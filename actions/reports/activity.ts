import { prismadb } from "@/lib/prisma";
import type { ReportFilters, ChartDataPoint } from "./types";
import { groupedToChartData } from "./types";

export async function getTasksCreatedCompleted(
  filters: ReportFilters
): Promise<{ name: string; created: number; completed: number }[]> {
  const tasks = await prismadb.tasks.findMany({
    where: { createdAt: { gte: filters.dateFrom, lte: filters.dateTo } },
    select: { createdAt: true, taskStatus: true },
  });
  const grouped: Record<string, { created: number; completed: number }> = {};
  for (const task of tasks) {
    if (!task.createdAt) continue;
    const d = new Date(task.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!grouped[key]) grouped[key] = { created: 0, completed: 0 };
    grouped[key].created++;
    if (task.taskStatus === "COMPLETE") grouped[key].completed++;
  }
  const result: { name: string; created: number; completed: number }[] = [];
  for (const key of Object.keys(grouped).sort()) {
    result.push({ name: key, ...grouped[key] });
  }
  return result;
}

export async function getOverdueTasks(filters: ReportFilters): Promise<number> {
  return prismadb.tasks.count({
    where: { dueDateAt: { lt: new Date(), gte: filters.dateFrom }, taskStatus: "ACTIVE" },
  });
}

export async function getTasksByAssignee(filters: ReportFilters): Promise<ChartDataPoint[]> {
  const tasks = await prismadb.tasks.findMany({
    where: { createdAt: { gte: filters.dateFrom, lte: filters.dateTo } },
    select: { assigned_user: { select: { name: true } } },
  });
  const grouped: Record<string, number> = {};
  for (const t of tasks) {
    const name = t.assigned_user?.name ?? "Unassigned";
    grouped[name] = (grouped[name] || 0) + 1;
  }
  return groupedToChartData(grouped);
}

export async function getActivitiesByType(filters: ReportFilters): Promise<ChartDataPoint[]> {
  const activities = await prismadb.crm_Activities.findMany({
    where: { createdAt: { gte: filters.dateFrom, lte: filters.dateTo } },
    select: { type: true },
  });
  const grouped: Record<string, number> = {};
  for (const a of activities) {
    grouped[a.type] = (grouped[a.type] || 0) + 1;
  }
  return groupedToChartData(grouped);
}
