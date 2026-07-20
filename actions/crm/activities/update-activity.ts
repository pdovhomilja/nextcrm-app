"use server";
import {
  requireAuthenticated,
  assertCanWriteActivity,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/authz";
import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { emitCalendarOutbound } from "@/lib/crm/calendar/outbound-emit";

const ENTITY_SLUGS: Record<string, string> = {
  account: "accounts",
  contact: "contacts",
  lead: "leads",
  opportunity: "opportunities",
  contract: "contracts",
};

export const updateActivity = async (data: {
  id: string;
  title?: string;
  description?: string;
  date?: Date;
  duration?: number;
  outcome?: string;
  status?: "scheduled" | "completed" | "cancelled";
  metadata?: Record<string, unknown>;
  links?: Array<{ entityType: string; entityId: string }>;
}) => {
  // Authorization runs OUTSIDE the try/catch below so a denial is never
  // swallowed into the generic "Failed to update activity" branch.
  let user;
  try {
    user = await requireAuthenticated();
  } catch (e) {
    if (e instanceof AuthenticationError) return { error: "Unauthorized" };
    throw e;
  }
  try {
    // A meeting update is pushed to the owner's Google Calendar with
    // sendUpdates:"all" — an unauthorized edit mails a real customer.
    await assertCanWriteActivity(user, data.id);
  } catch (e) {
    if (e instanceof AuthorizationError) return { error: "Forbidden" };
    throw e;
  }

  try {
    // Fetch current links before update for revalidation
    const existingLinks = await (prismadb as any).crm_ActivityLinks.findMany({
      where: { activityId: data.id },
    });

    const activity = await prismadb.$transaction(async (tx) => {
      const updated = await (tx as any).crm_Activities.update({
        where: { id: data.id },
        data: {
          ...(data.title !== undefined && { title: data.title }),
          ...(data.description !== undefined && {
            description: data.description,
          }),
          ...(data.date !== undefined && { date: data.date }),
          ...(data.duration !== undefined && { duration: data.duration }),
          ...(data.outcome !== undefined && { outcome: data.outcome }),
          ...(data.status !== undefined && { status: data.status }),
          ...(data.metadata !== undefined && { metadata: data.metadata }),
          updatedBy: user.id,
        },
      });

      if (data.links !== undefined) {
        await (tx as any).crm_ActivityLinks.deleteMany({
          where: { activityId: data.id },
        });
        if (data.links.length > 0) {
          await (tx as any).crm_ActivityLinks.createMany({
            data: data.links.map((link) => ({
              activityId: data.id,
              entityType: link.entityType,
              entityId: link.entityId,
            })),
          });
        }
      }

      return updated;
    });

    if (activity.type === "meeting") {
      await emitCalendarOutbound(
        data.id,
        data.status === "cancelled" ? "cancel" : "upsert"
      );
    }

    // Revalidate all affected entity pages (old + new links)
    const allLinks = [
      ...existingLinks,
      ...(data.links ?? []).map((l) => ({
        entityType: l.entityType,
        entityId: l.entityId,
      })),
    ];
    const seen = new Set<string>();
    for (const link of allLinks) {
      const key = `${link.entityType}:${link.entityId}`;
      if (!seen.has(key)) {
        seen.add(key);
        revalidatePath(
          `/[locale]/(routes)/crm/${ENTITY_SLUGS[link.entityType] ?? `${link.entityType}s`}/${link.entityId}`,
          "page"
        );
      }
    }

    const fullActivity = await (prismadb as any).crm_Activities.findUnique({
      where: { id: activity.id },
      include: {
        created_by_user: { select: { id: true, name: true, avatar: true } },
        links: { select: { id: true, entityType: true, entityId: true } },
      },
    });

    return { data: fullActivity };
  } catch (error) {
    console.error("updateActivity error:", error);
    return { error: "Failed to update activity" };
  }
};
