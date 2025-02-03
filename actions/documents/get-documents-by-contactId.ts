import { prismadb } from "@/lib/prisma";

export const getDocumentsByContactId = async (contactId: string) => {
  const data = await prismadb.documents.findMany({
    where: {
      contacts: {
        some: {
          contactId: contactId,
        },
      },
    },
    include: {
      created_by_user_relation: {
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
      date_created: "desc",
    },
  });
  return data;
};
