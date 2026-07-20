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

export const deleteActivity = async (activityId: string) => {
  // Authorization runs OUTSIDE the try/catch below so a denial is never
  // swallowed into the generic "Failed to delete activity" branch.
  let user;
  try {
    user = await requireAuthenticated();
  } catch (e) {
    if (e instanceof AuthenticationError) return { error: "Unauthorized" };
    throw e;
  }
  try {
    // Deleting a meeting tears down the Google event with sendUpdates:"all" —
    // an unauthorized delete mails a real customer a cancellation.
    await assertCanWriteActivity(user, activityId);
  } catch (e) {
    if (e instanceof AuthorizationError) return { error: "Forbidden" };
    throw e;
  }

  try {
    // Fetch links BEFORE deleting so we can revalidate after cascade
    const links = await (prismadb as any).crm_ActivityLinks.findMany({
      where: { activityId },
    });

    const deleted = await (prismadb as any).crm_Activities.update({
      where: { id: activityId },
      data: { deletedAt: new Date(), deletedBy: user.id },
    });

    // Activity is soft-deleted; links remain for audit trail. Revalidate captured pages.
    for (const link of links) {
      revalidatePath(
        `/[locale]/(routes)/crm/${ENTITY_SLUGS[link.entityType] ?? `${link.entityType}s`}/${link.entityId}`,
        "page"
      );
    }

    if (deleted.type === "meeting") {
      await emitCalendarOutbound(activityId, "cancel");
    }

    return { success: true };
  } catch (error) {
    console.error("deleteActivity error:", error);
    return { error: "Failed to delete activity" };
  }
};
