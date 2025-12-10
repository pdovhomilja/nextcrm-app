import { prismadb } from "@/lib/prisma";

export const getLead = async (leadId: string) => {
  const data = await prismadb.crm_Leads.findFirst({
    where: {
      id: leadId,
    },
    include: {
      // Include assigned user (uses "LeadAssignedTo" relation)
      assigned_to_user: {
        select: {
          id: true,
          name: true,
        },
      },
      // Include assigned accounts
      assigned_accounts: true,
      // Include documents through DocumentsToLeads junction table
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
