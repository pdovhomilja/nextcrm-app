"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prismadb } from "@/lib/prisma";

export const getOpportunity = async (opportunityId: string) => {
  const session = await getServerSession(authOptions);

  if (!session?.user?.organizationId) {
    throw new Error("Unauthorized: No organization context");
  }

  const data = await prismadb.crm_Opportunities.findFirst({
    where: {
      id: opportunityId,
      organizationId: session.user.organizationId,
    },
    include: {
      assigned_account: {
        select: {
          name: true,
        },
      },
      assigned_sales_stage: {
        select: {
          name: true,
        },
      },
      assigned_type: {
        select: {
          name: true,
        },
      },
      contacts: {
        select: {
          id: true,
          first_name: true,
          last_name: true,
          office_phone: true,
          mobile_phone: true,
          email: true,
        },
      },
      assigned_to_user: {
        select: {
          name: true,
          email: true,
        },
      },
      documents: {
        select: {
          id: true,
          document_name: true,
        },
      },
    },
  });
  return data;
};
