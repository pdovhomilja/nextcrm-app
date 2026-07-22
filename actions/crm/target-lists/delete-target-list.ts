"use server";
import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import {
  requireAuthenticated,
  assertCanWriteTargetList,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/authz";

export const deleteTargetList = async (targetListId: string) => {
  if (!targetListId) return { error: "targetListId is required" };

  let user;
  try {
    user = await requireAuthenticated();
  } catch (e) {
    if (e instanceof AuthenticationError) return { error: "Unauthorized" };
    throw e;
  }
  try {
    await assertCanWriteTargetList(user, targetListId);
  } catch (e) {
    if (e instanceof AuthorizationError) return { error: "Forbidden" };
    throw e;
  }

  try {
    await prismadb.crm_TargetLists.update({
      where: { id: targetListId },
      data: { deletedAt: new Date(), deletedBy: user.id },
    });
    revalidatePath("/[locale]/(routes)/crm/target-lists", "page");
    return { success: true };
  } catch (error) {
    return { error: "Failed to delete target list" };
  }
};
