"use server";
import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { APP_ROLES, AppRole, requireRole, AuthorizationError } from "@/lib/authz";

export const setUserRole = async (userId: string, role: AppRole) => {
  let actor;
  try {
    actor = await requireRole(["admin"]);
  } catch (e) {
    if (e instanceof AuthorizationError) return { error: "Forbidden" };
    return { error: "Unauthorized" };
  }

  if (!userId) return { error: "userId is required" };
  if (!APP_ROLES.includes(role)) return { error: "Invalid role" };

  if (userId === actor.id && role !== "admin") {
    return { error: "Cannot remove your own admin role" };
  }

  try {
    const user = await prismadb.users.update({
      where: { id: userId },
      data: { role },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        role: true,
        userLanguage: true,
        userStatus: true,
        lastLoginAt: true,
      },
    });
    revalidatePath("/[locale]/(routes)/admin", "page");
    return { data: user };
  } catch (error) {
    console.log("[SET_USER_ROLE]", error);
    return { error: "Failed to update user role" };
  }
};
