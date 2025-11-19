"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prismadb } from "@/lib/prisma";

export const getBoardSections = async (boadId: string) => {
  const session = await getServerSession(authOptions);

  if (!session?.user?.organizationId) {
    throw new Error("Unauthorized: No organization context");
  }

  const data = await prismadb.sections.findMany({
    where: {
      board: boadId,
      organizationId: session.user.organizationId,
    },
  });

  return data;
};
