"use server";
import { prismadb } from "@/lib/prisma";
import { requireAuthenticated, AuthenticationError } from "@/lib/authz";

export type AiPromptKind = "EMAIL" | "HOMEPAGE";
export type AiPromptScope = "ORG" | "USER";

export const listPrompts = async ({ kind }: { kind: AiPromptKind }) => {
  let user;
  try {
    user = await requireAuthenticated();
  } catch (e) {
    if (e instanceof AuthenticationError) return [];
    throw e;
  }
  return prismadb.crm_Ai_Prompt.findMany({
    where: {
      deletedAt: null,
      kind,
      OR: [{ scope: "ORG" }, { scope: "USER", user_id: user.id }],
    },
    orderBy: { name: "asc" },
  });
};
