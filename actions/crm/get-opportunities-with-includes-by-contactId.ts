import { prismadb } from "@/lib/prisma";

export const getOpportunitiesFullByContactId = async (contactId: string) => {
  const data = await prismadb.crm_Opportunities.findMany({
    where: {
      connected_contacts: {
        has: contactId,
      },
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
      assigned_to_user: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      created_on: "desc",
    },
  });

  return data;
};
