"use server";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

const ENTITY_SLUGS: Record<string, string> = {
  account: "accounts",
  contact: "contacts",
  lead: "leads",
  opportunity: "opportunities",
  contract: "contracts",
};

export const deleteActivity = async (activityId: string) => {
  try {
    const session = await getSession();
    if (!session) return { error: "Unauthorized" };

    // Fetch links BEFORE deleting so we can revalidate after cascade
    const links = await (prismadb as any).crm_ActivityLinks.findMany({
      where: { activityId },
    });

    await (prismadb as any).crm_Activities.delete({
      where: { id: activityId },
    });

    // Links are cascade-deleted by DB; now revalidate captured pages
    for (const link of links) {
      revalidatePath(
        `/[locale]/(routes)/crm/${ENTITY_SLUGS[link.entityType] ?? `${link.entityType}s`}/${link.entityId}`,
        "page"
      );
    }

    return { success: true };
  } catch (error) {
    console.error("deleteActivity error:", error);
    return { error: "Failed to delete activity" };
  }
};
