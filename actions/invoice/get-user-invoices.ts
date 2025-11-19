"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prismadb } from "@/lib/prisma";

export const getUserInvoices = async (userId: string) => {
  const session = await getServerSession(authOptions);

  if (!session?.user?.organizationId) {
    throw new Error("Unauthorized: No organization context");
  }

  const data = await prismadb.invoices.findMany({
    where: {
      assigned_user_id: userId,
      organizationId: session.user.organizationId,
    },

    orderBy: {
      date_created: "desc",
    },
  });

  return data;
};
