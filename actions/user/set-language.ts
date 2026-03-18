"use server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { Language } from "@prisma/client";

export const setLanguage = async (data: {
  userId: string;
  language: string;
}) => {
  const session = await getServerSession(authOptions);
  if (!session) return { error: "Unauthorized" };

  const { userId, language } = data;

  if (!userId) return { error: "userId is required" };
  if (!language) return { error: "language is required" };

  // Ensure user can only update their own language unless admin
  if (session.user.id !== userId && !session.user.isAdmin) {
    return { error: "Forbidden" };
  }

  try {
    await prismadb.users.update({
      data: { userLanguage: language as Language },
      where: { id: userId },
    });
    revalidatePath("/[locale]/(routes)/profile", "page");
    return { language };
  } catch (error) {
    console.log("[SET_LANGUAGE]", error);
    return { error: "Failed to set language" };
  }
};
