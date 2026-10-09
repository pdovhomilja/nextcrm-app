"use server";
import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { revokeAllApiTokens } from "@/lib/api-tokens";
import {
  requireRole,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/authz";

export const deactivateUser = async (userId: string) => {
  let actor;
  try {
    actor = await requireRole(["admin"]);
  } catch (e) {
    if (e instanceof AuthenticationError) return { error: "Unauthorized" };
    if (e instanceof AuthorizationError) return { error: "Forbidden" };
    throw e;
  }

  if (!userId) return { error: "userId is required" };
  if (userId === actor.id) return { error: "Cannot deactivate yourself" };

  try {
    const user = await prismadb.users.update({
      where: { id: userId },
      data: { userStatus: "INACTIVE" },
    });
    // End every way back in: browser sessions and API tokens.
    await prismadb.session.deleteMany({ where: { userId } });
    await revokeAllApiTokens(userId);
    revalidatePath("/[locale]/(routes)/admin", "page");
    return { data: user };
  } catch (error) {
    console.log("[DEACTIVATE_USER]", error);
    return { error: "Failed to deactivate user" };
  }
};
