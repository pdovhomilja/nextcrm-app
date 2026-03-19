"use server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prismadb } from "@/lib/prisma";
import { hash } from "bcryptjs";
import { revalidatePath } from "next/cache";

export const setNewPassword = async (data: {
  userId: string;
  password: string;
  cpassword: string;
}) => {
  const session = await getServerSession(authOptions);
  if (!session) return { error: "Unauthorized" };

  const { userId, password, cpassword } = data;

  if (!userId) return { error: "userId is required" };
  if (!password || !cpassword) return { error: "No password provided" };
  if (password !== cpassword) return { error: "Passwords do not match" };

  // Ensure user can only update their own password unless admin
  if (session.user.id !== userId && !session.user.isAdmin) {
    return { error: "Forbidden" };
  }

  if (session.user?.email === "demo@nextcrm.io") {
    return {
      error: "Hey, don't be a fool! There are so many works done! Thanks!",
    };
  }

  try {
    const user = await prismadb.users.update({
      data: { password: await hash(password, 10) },
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
    revalidatePath("/[locale]/(routes)/profile", "page");
    return { data: user };
  } catch (error) {
    console.log("[SET_NEW_PASSWORD]", error);
    return { error: "Failed to update password" };
  }
};
