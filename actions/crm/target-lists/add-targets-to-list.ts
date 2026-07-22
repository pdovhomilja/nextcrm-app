"use server";
import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import {
  requireAuthenticated,
  assertCanWriteTargetList,
  filterAuthorizedTargetIds,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/authz";

export const addTargetsToList = async (targetListId: string, targetIds: string[]) => {
  if (!Array.isArray(targetIds) || targetIds.length === 0) {
    return { error: "targetIds must be a non-empty array" };
  }

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

  // Only attach targets the caller can access.
  const authorizedIds = await filterAuthorizedTargetIds(user, targetIds);

  try {
    const result = await prismadb.targetsToTargetLists.createMany({
      data: authorizedIds.map((id: string) => ({
        target_id: id,
        target_list_id: targetListId,
      })),
      skipDuplicates: true,
    });
    revalidatePath("/[locale]/(routes)/crm/target-lists", "page");
    return { added: result.count };
  } catch (error) {
    return { error: "Failed to add targets to list" };
  }
};
