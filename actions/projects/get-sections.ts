import { prismadb } from "@/lib/prisma";
import {
  requireAuthenticated,
  boardReadScopeWhere,
  AuthenticationError,
} from "@/lib/authz";

export const getSections = async () => {
  let user;
  try {
    user = await requireAuthenticated();
  } catch (e) {
    if (e instanceof AuthenticationError) return [];
    throw e;
  }

  const data = await prismadb.sections.findMany({
    where: {
      board_relation: boardReadScopeWhere(user),
    },
  });

  return data;
};
