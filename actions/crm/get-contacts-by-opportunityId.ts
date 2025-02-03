import { prismadb } from "@/lib/prisma";

export const getContactsByOpportunityId = async (opportunityId: string) => {
  const data = await prismadb.crm_Contacts.findMany({
    where: {
      opportunities: {
        some: {
          id: opportunityId,
        },
      },
    },
    include: {
      assigned_to_user: {
        select: {
          name: true,
        },
      },
      create_by_user: {
        select: {
          name: true,
        },
      },
      assigned_accounts: true,
    },
  });
  return data;
};
