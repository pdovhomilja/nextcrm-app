import { prismadb } from "@/lib/prisma";
import {
  requireAuthenticated,
  documentReadScopeWhere,
  AuthenticationError,
} from "@/lib/authz";
import { crmTaskReadScopeWhere } from "@/lib/authz/scopes/crm";

export const getCrMTask = async (taskId: string) => {
  let user;
  try {
    user = await requireAuthenticated({ partner: true });
  } catch (e) {
    if (e instanceof AuthenticationError) return null;
    throw e;
  }
  const data = await prismadb.crm_Accounts_Tasks.findFirst({
    where: {
      id: taskId,
      ...crmTaskReadScopeWhere(user),
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
        where: { document: documentReadScopeWhere(user) },
        include: {
          document: {
            select: {
              id: true,
              document_name: true,
              document_file_url: true,
              document_file_mimeType: true,
              assigned_to_user: {
                select: {
                  name: true,
                },
              },
              created_by: {
                select: {
                  name: true,
                },
              },
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
