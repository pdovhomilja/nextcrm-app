"use server";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export const updateProfile = async (data: {
  userId: string;
  name: string;
  username: string;
  account_name: string;
}) => {
  const session = await getSession();
  if (!session) return { error: "Unauthorized" };

  const { userId, name, username, account_name } = data;

  if (!userId) return { error: "userId is required" };

  // Ensure user can only update their own profile unless admin
  if (session.user.id !== userId && !session.user.role === "admin") {
    return { error: "Forbidden" };
  }

  try {
    const user = await prismadb.users.update({
      data: { name, username, account_name },
      where: { id: userId },
    });
    revalidatePath("/[locale]/(routes)/profile", "page");
    return { data: user };
  } catch (error) {
    console.log("[UPDATE_PROFILE]", error);
    return { error: "Failed to update profile" };
  }
};
