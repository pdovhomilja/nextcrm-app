"use server";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

const VALID_ROLES = ["admin", "member", "viewer"] as const;
type Role = (typeof VALID_ROLES)[number];

export const setUserRole = async (userId: string, role: Role) => {
  const session = await getSession();
  if (!session) return { error: "Unauthorized" };
  if (session.user.role !== "admin") return { error: "Forbidden" };

  if (!userId) return { error: "userId is required" };
  if (!VALID_ROLES.includes(role)) return { error: "Invalid role" };

  if (userId === session.user.id && role !== "admin") {
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
