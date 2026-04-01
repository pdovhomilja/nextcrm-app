"use server";
import { getSession } from "@/lib/auth-server";

import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function updateProfilePhoto(avatar: string) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  if (!avatar) throw new Error("No avatar provided");

  await prismadb.users.update({
    where: { id: session.user.id },
    data: { avatar },
  });

  revalidatePath("/[locale]/profile");
}
