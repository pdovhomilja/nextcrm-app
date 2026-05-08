"use server";
import { prismadb } from "@/lib/prisma";
import { requireAuthenticated, isManagerOrAdmin, AuthorizationError } from "@/lib/authz";
import type { ExportFormat } from "./types";

export async function createSchedule(input: { reportConfigId: string; cronExpression: string; recipients: string[]; format: ExportFormat }) {
  const user = await requireAuthenticated();
  // Verify the user can read the referenced config (own OR shared OR manager/admin)
  const cfg = await prismadb.crm_Report_Config.findUnique({ where: { id: input.reportConfigId } });
  if (!cfg) throw new Error("Not found");
  if (!isManagerOrAdmin(user) && cfg.createdBy !== user.id && !cfg.isShared) {
    throw new AuthorizationError();
  }
  return prismadb.crm_Report_Schedule.create({
    data: {
      reportConfigId: input.reportConfigId,
      cronExpression: input.cronExpression,
      recipients: input.recipients,
      format: input.format,
      createdBy: user.id,
    },
  });
}

export async function listSchedules() {
  const user = await requireAuthenticated();
  const where = isManagerOrAdmin(user) ? {} : { createdBy: user.id };
  return prismadb.crm_Report_Schedule.findMany({
    where,
    include: { reportConfig: true },
    orderBy: { createdAt: "desc" },
  });
}

async function loadAndAuthorizeSchedule(scheduleId: string, user: { id: string; role: string }) {
  const sched = await prismadb.crm_Report_Schedule.findUnique({ where: { id: scheduleId } });
  if (!sched) throw new Error("Not found");
  if (user.role !== "admin" && user.role !== "manager" && sched.createdBy !== user.id) {
    throw new AuthorizationError();
  }
  return sched;
}

export async function updateSchedule(scheduleId: string, data: { cronExpression?: string; recipients?: string[]; format?: ExportFormat; isActive?: boolean }) {
  const user = await requireAuthenticated();
  await loadAndAuthorizeSchedule(scheduleId, user);
  return prismadb.crm_Report_Schedule.update({ where: { id: scheduleId }, data });
}

export async function deleteSchedule(scheduleId: string) {
  const user = await requireAuthenticated();
  await loadAndAuthorizeSchedule(scheduleId, user);
  return prismadb.crm_Report_Schedule.delete({ where: { id: scheduleId } });
}
