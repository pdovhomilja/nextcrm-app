"use server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export const deactivateUser = async (userId: string) => {
  const session = await getServerSession(authOptions);
  if (!session) return { error: "Unauthorized" };

  if (!userId) return { error: "userId is required" };

  try {
    const user = await prismadb.users.update({
      where: { id: userId },
      data: { userStatus: "INACTIVE" },
    });
    revalidatePath("/[locale]/(routes)/admin", "page");
    return { data: user };
  } catch (error) {
    console.log("[DEACTIVATE_USER]", error);
    return { error: "Failed to deactivate user" };
  }
};
