import { prismadb } from "@/lib/prisma";
import { junctionTableHelpers } from "@/lib/junction-helpers";

export const getCrMTask = async (taskId: string) => {
  const data = await prismadb.crm_Accounts_Tasks.findFirst({
    where: {
      id: taskId,
    },
    include: {
      assigned_user: {
        select: {
          id: true,
          name: true,
        },
      },
      // Include documents through DocumentsToCrmAccountsTasks junction table
      documents: {
        include: {
          document: {
            select: {
              id: true,
              document_name: true,
              document_file_url: true,
            },
          },
        },
      },
      comments: {
        select: {
          id: true,
          comment: true,
          createdAt: true,
          assigned_user: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
        },
      },
    },
  });
  return data;
};
