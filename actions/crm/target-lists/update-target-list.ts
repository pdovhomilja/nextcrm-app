"use server";
import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import {
  requireAuthenticated,
  assertCanWriteTargetList,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/authz";

export const updateTargetList = async (data: {
  id: string;
  name?: string;
  description?: string;
  status?: boolean;
}) => {
  const { id, name, description, status } = data;
  if (!id) return { error: "id is required" };

  let user;
  try {
    user = await requireAuthenticated();
  } catch (e) {
    if (e instanceof AuthenticationError) return { error: "Unauthorized" };
    throw e;
  }
  try {
    await assertCanWriteTargetList(user, id);
  } catch (e) {
    if (e instanceof AuthorizationError) return { error: "Forbidden" };
    throw e;
  }

  try {
    const existing = await prismadb.crm_TargetLists.findFirst({ where: { id, deletedAt: null } });
    if (!existing) return { error: "Target list not found" };
    const list = await prismadb.crm_TargetLists.update({
      where: { id },
      data: { name, description, status },
    });
    revalidatePath("/[locale]/(routes)/crm/target-lists", "page");
    return { data: list };
  } catch (error) {
    return { error: "Failed to update target list" };
  }
};
