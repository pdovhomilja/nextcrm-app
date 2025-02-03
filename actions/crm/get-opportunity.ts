import { prismadb } from "@/lib/prisma";

export const getOpportunity = async (opportunityId: string) => {
  const data = await prismadb.crm_Opportunities.findFirst({
    where: {
      id: opportunityId,
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
      contacts_relation: {
        select: {
          contact: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              office_phone: true,
              mobile_phone: true,
              email: true,
            },
          },
        },
      },
      assigned_to_user_relation: {
        select: {
          name: true,
          email: true,
        },
      },
      documents_relation: {
        select: {
          id: true,
          document: {
            select: {
              document_name: true,
            },
          },
        },
      },
    },
  });
  return data;
};
