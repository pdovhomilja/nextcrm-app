"use server";
import { prismadb } from "@/lib/prisma";

export const getAuditLogByEntity = async (
  entityType: string,
  entityId: string,
  cursor?: string
) => {
  const take = 25;

  const entries = await (prismadb as any).crm_AuditLog.findMany({
    where: { entityType, entityId },
    orderBy: { createdAt: "desc" },
    take: take + 1,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    include: {
      user: { select: { id: true, name: true, avatar: true } },
    },
  });

  const hasMore = entries.length > take;
  const data = hasMore ? entries.slice(0, take) : entries;
  const nextCursor = hasMore ? data[data.length - 1].id : null;

  return { data, nextCursor };
};
