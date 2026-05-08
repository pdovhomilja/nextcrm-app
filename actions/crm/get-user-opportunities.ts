import { prismadb } from "@/lib/prisma";
import {
  requireAuthenticated,
  AuthenticationError,
} from "@/lib/authz";

export const getUserOpportunities = async (userId: string) => {
  let user;
  try {
    user = await requireAuthenticated();
  } catch (e) {
    if (e instanceof AuthenticationError) return [];
    throw e;
  }

  // A plain "user" can only fetch their own opportunity list. Manager/admin
  // can list opportunities for any user.
  if (user.role === "user" && userId !== user.id) {
    return [];
  }

  const data = await prismadb.crm_Opportunities.findMany({
    where: {
      assigned_to: userId,
      deletedAt: null,
    },
    include: {
      assigned_sales_stage: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
  return data;
};
