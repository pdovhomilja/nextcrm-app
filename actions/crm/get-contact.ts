"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prismadb } from "@/lib/prisma";

export const getContact = async (contactId: string) => {
  const session = await getServerSession(authOptions);

  if (!session?.user?.organizationId) {
    throw new Error("Unauthorized: No organization context");
  }

  const data = await prismadb.crm_Contacts.findFirst({
    where: {
      id: contactId,
      organizationId: session.user.organizationId,
    },
    include: {
      assigned_opportunities: true,
      assigned_documents: true,
      assigned_accounts: true,
    },
  });
  return data;
};
