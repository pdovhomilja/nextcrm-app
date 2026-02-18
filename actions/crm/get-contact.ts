import { prismadb } from "@/lib/prisma";

export const getContact = async (contactId: string) => {
  const data = await prismadb.crm_Contacts.findFirst({
    where: {
      id: contactId,
    },
    include: {
      // Include opportunities through ContactsToOpportunities junction table
      opportunities: {
        include: {
          opportunity: {
            select: {
              id: true,
              name: true,
              sales_stage: true,
              close_date: true,
              budget: true,
            },
          },
        },
      },
      // Include documents through DocumentsToContacts junction table
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
      // Include assigned account
      assigned_accounts: true,
      // Include assigned user (uses "assigned_contacts" relation)
      assigned_to_user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      // Include creator user (uses "created_contacts" relation)
      crate_by_user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
  return data;
};
