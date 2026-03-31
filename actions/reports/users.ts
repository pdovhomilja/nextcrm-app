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
    select: { is_admin: true, is_account_admin: true },
  });
  let admins = 0, accountAdmins = 0, regularUsers = 0;
  for (const u of users) {
    if (u.is_admin) admins++;
    else if (u.is_account_admin) accountAdmins++;
    else regularUsers++;
  }
  const result: ChartDataPoint[] = [];
  if (admins > 0) result.push({ name: "Admin", Number: admins });
  if (accountAdmins > 0) result.push({ name: "Account Admin", Number: accountAdmins });
  if (regularUsers > 0) result.push({ name: "User", Number: regularUsers });
  return result;
}
