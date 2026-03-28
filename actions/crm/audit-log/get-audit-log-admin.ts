"use server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prismadb } from "@/lib/prisma";

interface AuditLogAdminFilters {
  entityType?: string;
  action?: string;
  userId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
}

export const getAuditLogAdmin = async (filters: AuditLogAdminFilters = {}) => {
  const session = await getServerSession(authOptions);
  if (!session) return { error: "Unauthorized" };
  if (!session.user.isAdmin) return { error: "Forbidden" };

  const { entityType, action, userId, dateFrom, dateTo, page = 1 } = filters;
  const take = 50;
  const skip = (page - 1) * take;

  const where: Record<string, unknown> = {};
  if (entityType) where.entityType = entityType;
  if (action) where.action = action;
  if (userId) where.userId = userId;
  if (dateFrom || dateTo) {
    where.createdAt = {
      ...(dateFrom ? { gte: dateFrom } : {}),
      ...(dateTo ? { lte: dateTo } : {}),
    };
  }

  const [entries, total] = await Promise.all([
    (prismadb as any).crm_AuditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take,
      skip,
      include: {
        user: { select: { id: true, name: true, avatar: true } },
      },
    }),
    (prismadb as any).crm_AuditLog.count({ where }),
  ]);

  return { data: entries, total, page, totalPages: Math.ceil(total / take) };
};
