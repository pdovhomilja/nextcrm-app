"use server";
import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import {
  requireAuthenticated,
  assertCanWriteTarget,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/authz";

export const deleteTarget = async (targetId: string) => {
  if (!targetId) return { error: "targetId is required" };

  let user;
  try {
    user = await requireAuthenticated();
  } catch (e) {
    if (e instanceof AuthenticationError) return { error: "Unauthorized" };
    throw e;
  }
  try {
    await assertCanWriteTarget(user, targetId);
  } catch (e) {
    if (e instanceof AuthorizationError) return { error: "Forbidden" };
    throw e;
  }

  try {
    await prismadb.crm_Targets.update({
      where: { id: targetId },
      data: { deletedAt: new Date(), deletedBy: user.id },
    });
    revalidatePath("/[locale]/(routes)/crm/targets", "page");
    return { success: true };
  } catch (error) {
    return { error: "Failed to delete target" };
  }
};
