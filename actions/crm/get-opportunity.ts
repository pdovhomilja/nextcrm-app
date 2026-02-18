import { prismadb } from "@/lib/prisma";

export const getOpportunity = async (opportunityId: string) => {
  const data = await prismadb.crm_Opportunities.findFirst({
    where: {
      id: opportunityId,
    },
    include: {
      // Include assigned account
      assigned_account: {
        select: {
          name: true,
        },
      },
      // Include sales stage
      assigned_sales_stage: {
        select: {
          name: true,
        },
      },
      // Include opportunity type
      assigned_type: {
        select: {
          name: true,
        },
      },
      // Include contacts through ContactsToOpportunities junction table
      contacts: {
        include: {
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
      // Include assigned user (uses "assigned_to_user_relation")
      assigned_to_user: {
        select: {
          name: true,
          email: true,
        },
      },
      // Include created by user (uses "created_by_user_relation")
      created_by_user: {
        select: {
          name: true,
          email: true,
        },
      },
      // Include documents through DocumentsToOpportunities junction table
      documents: {
        include: {
          document: {
            select: {
              id: true,
              document_name: true,
              document_type: true,
              document_file_url: true,
              document_file_mimeType: true,
              createdAt: true,
              created_by: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      },
    },
  });
  return data;
};
