"use server";
import { prismadb } from "@/lib/prisma";

const PAGE_SIZE = 25;

export type ActivityWithLinks = {
  id: string;
  type: "call" | "meeting" | "note" | "email";
  title: string;
  description: string | null;
  date: Date;
  duration: number | null;
  outcome: string | null;
  status: "scheduled" | "completed" | "cancelled";
  metadata: unknown;
  createdAt: Date;
  createdBy: string | null;
  created_by_user: { id: string; name: string | null; avatar: string | null } | null;
  links: Array<{ id: string; entityType: string; entityId: string }>;
};

export type ActivityCursor = { date: string; id: string };

export const getActivitiesByEntity = async (
  entityType: string,
  entityId: string,
  cursor?: ActivityCursor
): Promise<{ data: ActivityWithLinks[]; nextCursor: ActivityCursor | null }> => {
  try {
    // Use `as any` for both models — same pattern as crm_AuditLog throughout the codebase
    // (Prisma client cache may not include new models until IDE restarts)
    const links = await (prismadb as any).crm_ActivityLinks.findMany({
      where: { entityType, entityId },
      select: { activityId: true },
    });

    const activityIds = (links as Array<{ activityId: string }>).map((l) => l.activityId);

    if (activityIds.length === 0) {
      return { data: [], nextCursor: null };
    }

    const andClauses: Record<string, unknown>[] = [{ id: { in: activityIds } }];

    if (cursor) {
      andClauses.push({
        OR: [
          { date: { lt: new Date(cursor.date) } },
          { date: new Date(cursor.date), id: { lt: cursor.id } },
        ],
      });
    }

    const activities = await (prismadb as any).crm_Activities.findMany({
      where: { AND: andClauses },
      orderBy: [{ date: "desc" }, { id: "desc" }],
      take: PAGE_SIZE,
      include: {
        created_by_user: { select: { id: true, name: true, avatar: true } },
        links: { select: { id: true, entityType: true, entityId: true } },
      },
    });

    const nextCursor =
      activities.length < PAGE_SIZE
        ? null
        : {
            date: activities[activities.length - 1].date.toISOString(),
            id: activities[activities.length - 1].id,
          };

    return { data: activities as ActivityWithLinks[], nextCursor };
  } catch (error) {
    console.error("getActivitiesByEntity error:", error);
    return { data: [], nextCursor: null };
  }
};
