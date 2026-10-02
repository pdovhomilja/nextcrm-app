"use server";
import { prismadb } from "@/lib/prisma";
import { requireAuthenticated, AuthenticationError } from "@/lib/authz";

import type { AiPromptKind } from "./kinds";

// NOTE: this is a "use server" module — it may export ONLY async server
// functions. Types live in ./kinds (a plain module) and are imported from there
// by server and client code alike. Re-exporting a type here breaks the RSC
// action-module build ("Export AiPromptKind doesn't exist in target module").

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
