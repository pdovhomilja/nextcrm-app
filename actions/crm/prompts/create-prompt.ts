"use server";
import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { writeAuditLog } from "@/lib/audit-log";
import {
  requireAuthenticated,
  requireRole,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/authz";
import type { AiPromptKind, AiPromptScope } from "./kinds";
import { isAdminOnlyKind } from "./kinds";

export const createPrompt = async (data: {
  name: string;
  body: string;
  kind: AiPromptKind;
  scope: AiPromptScope;
}) => {
  const name = data.name?.trim();
  const body = data.body?.trim();
  if (!name) return { error: "Name is required" };
  if (!body) return { error: "Prompt body is required" };

  let user;
  try {
    user = await requireAuthenticated();
    if (data.scope === "ORG" || isAdminOnlyKind(data.kind)) await requireRole(["admin"]);
  } catch (e) {
    if (e instanceof AuthenticationError) return { error: "Unauthorized" };
    if (e instanceof AuthorizationError) return { error: "Forbidden" };
    throw e;
  }

  // Admin-only layer kinds are org-level configuration and every generation-time
  // reader filters scope: "ORG", so a USER-scoped row would be silently ignored.
  const scope: AiPromptScope = isAdminOnlyKind(data.kind) ? "ORG" : data.scope;

  const created = await prismadb.crm_Ai_Prompt.create({
    data: {
      name,
      body,
      kind: data.kind,
      scope,
      user_id: scope === "USER" ? user.id : null,
      created_by: user.id,
    },
  });
  await writeAuditLog({
    entityType: "prompt",
    entityId: created.id,
    action: "created",
    changes: null,
    userId: user.id,
  });
  revalidatePath("/[locale]/(routes)/campaigns/prompts", "page");
  return { data: created };
};
