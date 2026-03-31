"use server";

import { prismadb } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import type { ExportFormat } from "./types";

async function getUserId(): Promise<string> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}

export async function createSchedule(input: { reportConfigId: string; cronExpression: string; recipients: string[]; format: ExportFormat }) {
  const userId = await getUserId();
  return prismadb.crm_Report_Schedule.create({ data: { reportConfigId: input.reportConfigId, cronExpression: input.cronExpression, recipients: input.recipients, format: input.format, createdBy: userId } });
}

export async function listSchedules() {
  const userId = await getUserId();
  return prismadb.crm_Report_Schedule.findMany({ where: { createdBy: userId }, include: { reportConfig: true }, orderBy: { createdAt: "desc" } });
}

export async function updateSchedule(scheduleId: string, data: { cronExpression?: string; recipients?: string[]; format?: ExportFormat; isActive?: boolean }) {
  const userId = await getUserId();
  return prismadb.crm_Report_Schedule.update({ where: { id: scheduleId, createdBy: userId }, data });
}

export async function deleteSchedule(scheduleId: string) {
  const userId = await getUserId();
  return prismadb.crm_Report_Schedule.delete({ where: { id: scheduleId, createdBy: userId } });
}
