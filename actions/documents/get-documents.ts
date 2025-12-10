import { prismadb } from "@/lib/prisma";

export const getDocuments = async () => {
  const data = await prismadb.documents.findMany({
    include: {
      // Use correct relation field names
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
