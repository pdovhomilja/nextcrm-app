import { prismadb } from "@/lib/prisma";

export const getDocuments = async () => {
  const data = await prismadb.documents.findMany({
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
