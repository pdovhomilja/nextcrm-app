import { prismadb } from "@/lib/prisma";

export const getOpportunitiesFullByContactId = async (contactId: string) => {
  const data = await prismadb.crm_Opportunities.findMany({
    where: {
      contacts_relation: {
        some: {
          contactId: contactId,
        },
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
      assigned_to_user_relation: {
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
