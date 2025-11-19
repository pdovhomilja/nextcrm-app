import { prismadb } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const getCrMTask = async (taskId: string) => {
  const session = await getServerSession(authOptions);

  if (!session?.user?.organizationId) {
    throw new Error("Unauthorized: No organization context");
  }

  const data = await prismadb.crm_Accounts_Tasks.findFirst({
    where: {
      id: taskId,
      organizationId: session.user.organizationId,
    },
    include: {
      assigned_user: {
        select: {
          id: true,
          name: true,
        },
      },
      documents: {
        select: {
          id: true,
          document_name: true,
          document_file_url: true,
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
