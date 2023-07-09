import { prismadb } from "@/lib/prisma";

export const getDocuments = async () => {
  const data = await prismadb.documents.findMany({
    include: {
      created_by: {
        select: {
          name: true,
        },
      },
      assigned_to_user: {
        select: {
          name: true,
        },
      },
    },
  });
  return data;
};
