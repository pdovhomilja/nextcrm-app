import { prismadb } from "@/lib/prisma";
import {
  requireAuthenticated,
  AuthenticationError,
  isUnhandledRole,
} from "@/lib/authz";

// Same rule as getUserOpportunities: a user lists only his own leads,
// managers/admins anyone's, a partner (and any other role) nothing.
export const getUserLeads = async (userId: string) => {
  let user;
  try {
    user = await requireAuthenticated();
  } catch (e) {
    if (e instanceof AuthenticationError) return [];
    throw e;
  }
  if (user.role === "user" && userId !== user.id) return [];
  if (isUnhandledRole(user)) return [];

  const data = await prismadb.crm_Leads.findMany({
    where: {
      assigned_to: userId,
      deletedAt: null,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
  return data;
};
