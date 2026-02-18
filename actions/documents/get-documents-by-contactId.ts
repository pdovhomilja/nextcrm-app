import { prismadb } from "@/lib/prisma";

export const getDocumentsByContactId = async (contactId: string) => {
  // Query through DocumentsToContacts junction table
  const data = await prismadb.documents.findMany({
    where: {
      contacts: {
        some: {
          contact_id: contactId,
        },
      },
    },
    include: {
      created_by: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      assigned_to_user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      date_created: "desc",
    },
  });
  return data;
};
