import { prismadb } from "@/lib/prisma";

export const getContacts = async () => {
  const data = await prismadb.crm_Contacts.findMany({
    include: {
      // Include assigned user (uses "assigned_contacts" relation)
      assigned_to_user: {
        select: {
          name: true,
        },
      },
      // Include creator user (uses "created_contacts" relation)
      crate_by_user: {
        select: {
          name: true,
        },
      },
      // Include assigned accounts
      assigned_accounts: true,
      // Include opportunities through ContactsToOpportunities junction table
      opportunities: {
        include: {
          opportunity: {
            select: {
              id: true,
              name: true,
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
            },
          },
        },
      },
    },
  });
  return data;
};
