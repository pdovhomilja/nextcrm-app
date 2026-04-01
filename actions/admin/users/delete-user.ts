"use server";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export const deleteUser = async (userId: string) => {
  const session = await getSession();
  if (!session) return { error: "Unauthorized" };

  if (!session.user.role === "admin") return { error: "Forbidden" };

  if (!userId) return { error: "userId is required" };

  try {
    const user = await prismadb.users.delete({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        account_name: true,
        avatar: true,
        is_admin: true,
        is_account_admin: true,
        userLanguage: true,
        userStatus: true,
        lastLoginAt: true,
      },
    });
    revalidatePath("/[locale]/(routes)/admin", "page");
    return { data: user };
  } catch (error) {
    console.log("[DELETE_USER]", error);
    return { error: "Failed to delete user" };
  }
};
