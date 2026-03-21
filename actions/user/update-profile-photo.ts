"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function updateProfilePhoto(avatar: string) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Unauthorized");

  if (!avatar) throw new Error("No avatar provided");

  await prismadb.users.update({
    where: { id: session.user.id },
    data: { avatar },
  });

  revalidatePath("/[locale]/profile");
}
