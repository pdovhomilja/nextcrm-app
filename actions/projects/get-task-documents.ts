import { prismadb } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const getTaskDocuments = async (taskId: string) => {
  const session = await getServerSession(authOptions);

  if (!session?.user?.organizationId) {
    throw new Error("Unauthorized: No organization context");
  }

  const data = await prismadb.documents.findMany({
    where: {
      organizationId: session.user.organizationId,
      tasksIDs: {
        has: taskId,
      },
    },
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
  /*   const data = await prismadb.tasks.findMany({
    where: {
      documents: {
        some: {
          id: taskId,
        },
      },
    },
  }); */
  return data;
};
