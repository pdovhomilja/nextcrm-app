"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prismadb } from "@/lib/prisma";

export const getLead = async (leadId: string) => {
  const session = await getServerSession(authOptions);

  if (!session?.user?.organizationId) {
    throw new Error("Unauthorized: No organization context");
  }

  const data = await prismadb.crm_Leads.findFirst({
    where: {
      id: leadId,
      organizationId: session.user.organizationId,
    },
    include: {
      assigned_to_user: {
        select: {
          id: true,
          name: true,
        },
      },
      assigned_accounts: true,
      assigned_documents: true,
    },
  });
  return data;
};
