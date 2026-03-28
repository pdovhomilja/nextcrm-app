"use server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

const ENTITY_SLUGS: Record<string, string> = {
  account: "accounts",
  contact: "contacts",
  lead: "leads",
  opportunity: "opportunities",
  contract: "contracts",
};

export const createActivity = async (data: {
  type: "call" | "meeting" | "note" | "email";
  title: string;
  description?: string;
  date: Date;
  duration?: number;
  outcome?: string;
  status: "scheduled" | "completed" | "cancelled";
  metadata?: Record<string, unknown>;
  links: Array<{ entityType: string; entityId: string }>;
}) => {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return { error: "Unauthorized" };

    const activity = await prismadb.$transaction(async (tx) => {
      const created = await (tx as any).crm_Activities.create({
        data: {
          type: data.type,
          title: data.title,
          description: data.description,
          date: data.date,
          duration: data.duration,
          outcome: data.outcome,
          status: data.status,
          metadata: data.metadata,
          createdBy: session.user.id,
        },
      });

      if (data.links.length > 0) {
        await (tx as any).crm_ActivityLinks.createMany({
          data: data.links.map((link) => ({
            activityId: created.id,
            entityType: link.entityType,
            entityId: link.entityId,
          })),
        });
      }

      return created;
    });

    const fullActivity = await (prismadb as any).crm_Activities.findUnique({
      where: { id: activity.id },
      include: {
        created_by_user: { select: { id: true, name: true, avatar: true } },
        links: { select: { id: true, entityType: true, entityId: true } },
      },
    });

    for (const link of data.links) {
      revalidatePath(
        `/[locale]/(routes)/crm/${ENTITY_SLUGS[link.entityType] ?? `${link.entityType}s`}/${link.entityId}`,
        "page"
      );
    }

    return { data: fullActivity };
  } catch (error) {
    console.error("createActivity error:", error);
    return { error: "Failed to create activity" };
  }
};
