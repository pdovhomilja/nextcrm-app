"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prismadb } from "@/lib/prisma";

export const getAccount = async (accountId: string) => {
  const session = await getServerSession(authOptions);

  if (!session?.user?.organizationId) {
    throw new Error("Unauthorized: No organization context");
  }

  const data = await prismadb.crm_Accounts.findFirst({
    where: {
      id: accountId,
      organizationId: session.user.organizationId,
    },
    include: {
      contacts: true,
      opportunities: true,
      assigned_documents: true,
      invoices: true,
      assigned_to_user: {
        select: {
          name: true,
        },
      },
    },
  });
  return data;
};
