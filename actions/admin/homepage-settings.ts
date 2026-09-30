"use server";

import { prismadb } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit-log";
import {
  requireRole,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/authz";
import {
  clampMaxTokens,
  getHomepageSettings,
  resolveModel,
  type HomepageSettings,
} from "@/lib/homepage/settings";

const KEY_MODEL = "homepage.model";
const KEY_MAX_TOKENS = "homepage.max_tokens";
const KEY_BASE_PROMPT_ID = "homepage.base_prompt_id";

type AdminUser = Awaited<ReturnType<typeof requireRole>>;

async function requireAdmin(): Promise<
  { user: AdminUser } | { error: string }
> {
  try {
    return { user: await requireRole(["admin"]) };
  } catch (e) {
    if (e instanceof AuthorizationError) return { error: "Forbidden" };
    if (e instanceof AuthenticationError) return { error: "Unauthorized" };
    throw e;
  }
}

export async function getHomepageSettingsForAdmin(): Promise<
  | { data: HomepageSettings & { basePrompts: { id: string; name: string }[] } }
  | { error: string }
> {
  const auth = await requireAdmin();
  if ("error" in auth) return auth;

  const settings = await getHomepageSettings();
  const basePrompts = await prismadb.crm_Ai_Prompt.findMany({
    where: { kind: "HOMEPAGE_BASE", deletedAt: null },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  return { data: { ...settings, basePrompts } };
}

export async function saveHomepageSettings(input: {
  model: string;
  maxTokens: number;
  basePromptId: string | null;
}): Promise<{ data: HomepageSettings } | { error: string }> {
  const auth = await requireAdmin();
  if ("error" in auth) return auth;

  // Never trust the raw client values: resolve against the allow-set and clamp.
  const model = resolveModel(input.model);
  const maxTokens = clampMaxTokens(model, input.maxTokens);

  if (input.basePromptId) {
    const prompt = await prismadb.crm_Ai_Prompt.findFirst({
      where: { id: input.basePromptId, kind: "HOMEPAGE_BASE", deletedAt: null },
      select: { id: true },
    });
    if (!prompt) return { error: "Selected base prompt not found" };
  }
  const basePromptId = input.basePromptId || null;

  const rows: [string, string][] = [
    [KEY_MODEL, model],
    [KEY_MAX_TOKENS, String(maxTokens)],
    [KEY_BASE_PROMPT_ID, basePromptId ?? ""],
  ];
  for (const [key, value] of rows) {
    await prismadb.crm_SystemSettings.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });
  }

  await writeAuditLog({
    entityType: "setting",
    entityId: "homepage-generation",
    action: "updated",
    changes: [
      {
        field: "homepage_settings",
        old: null,
        new: `model=${model} max_tokens=${maxTokens} base_prompt_id=${basePromptId ?? ""}`,
      },
    ],
    userId: auth.user.id,
  });

  return { data: { model, maxTokens, basePromptId } };
}
