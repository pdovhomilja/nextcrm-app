import { prismadb } from "@/lib/prisma";
import type { ReportFilters, ChartDataPoint } from "./types";
import { groupedToChartData } from "./types";

export async function getActiveUsersByYear(): Promise<ChartDataPoint[]> {
  const users = await prismadb.users.findMany({
    where: { userStatus: "ACTIVE" },
    select: { created_on: true },
  });
  const grouped: Record<string, number> = {};
  for (const u of users) {
    const year = String(new Date(u.created_on).getFullYear());
    grouped[year] = (grouped[year] || 0) + 1;
  }
  return groupedToChartData(grouped, true);
}

export async function getActiveUsersLifetime(): Promise<number> {
  return prismadb.users.count({ where: { userStatus: "ACTIVE" } });
}

export async function getUserGrowth(filters: ReportFilters): Promise<ChartDataPoint[]> {
  const users = await prismadb.users.findMany({
    where: { created_on: { gte: filters.dateFrom, lte: filters.dateTo } },
    select: { created_on: true },
  });
  const grouped: Record<string, number> = {};
  for (const u of users) {
    const d = new Date(u.created_on);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    grouped[key] = (grouped[key] || 0) + 1;
  }
  return groupedToChartData(grouped, true);
}

export async function getUsersByRole(filters: ReportFilters): Promise<ChartDataPoint[]> {
  const users = await prismadb.users.findMany({
    where: { created_on: { gte: filters.dateFrom, lte: filters.dateTo } },
    select: { role: true },
  });
  const roleCounts: Record<string, number> = {};
  for (const u of users) {
    const role = u.role ?? "member";
    roleCounts[role] = (roleCounts[role] || 0) + 1;
  }
  return Object.entries(roleCounts).map(([name, Number]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    Number,
  }));
}
