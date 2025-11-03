"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prismadb } from "@/lib/prisma";

export const getInvoice = async (invoiceId: string) => {
  const session = await getServerSession(authOptions);

  if (!session?.user?.organizationId) {
    throw new Error("Unauthorized: No organization context");
  }

  const data = await prismadb.invoices.findUniqueOrThrow({
    where: {
      id: invoiceId,
    },
    include: {
      users: {
        select: {
          name: true,
        },
      },
    },
  });

  // Verify ownership
  if (data.organizationId !== session.user.organizationId) {
    throw new Error("Unauthorized: Access denied to this resource");
  }

  return data;
};
