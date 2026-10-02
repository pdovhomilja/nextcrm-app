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
  resolveImageModel,
  resolveImageProvider,
  clampImageCount,
  type HomepageSettings,
} from "@/lib/homepage/settings";

const KEY_MODEL = "homepage.model";
const KEY_MAX_TOKENS = "homepage.max_tokens";
const KEY_BASE_PROMPT_ID = "homepage.base_prompt_id";
const KEY_IMAGE_MODEL = "homepage.image_model";
const KEY_IMAGE_COUNT = "homepage.image_count";
const KEY_IMAGE_PROVIDER = "homepage.image_provider";
const KEY_VARY_DESIGN = "homepage.vary_design";
// crm_AuditLog.entityId is a UUID column; settings have no row id, so use a fixed sentinel.
const HOMEPAGE_SETTINGS_ENTITY_ID = "00000000-0000-4000-8000-0000000000c0";

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
  | {
      data: HomepageSettings & {
        basePrompts: { id: string; name: string }[];
        // Presence flags only — key values never leave the server.
        imageProviders: { higgsfield: boolean; openai: boolean };
      };
    }
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
  const imageProviders = {
    higgsfield: !!process.env.HIGGSFIELD_API_KEY,
    openai: !!process.env.OPENAI_API_KEY,
  };
  return { data: { ...settings, basePrompts, imageProviders } };
}

export async function saveHomepageSettings(input: {
  model: string;
  maxTokens: number;
  basePromptId: string | null;
  imageModel: string;
  imageCount: number;
  imageProvider: string;
  varyDesign: boolean;
}): Promise<{ data: HomepageSettings } | { error: string }> {
  const auth = await requireAdmin();
  if ("error" in auth) return auth;

  // Never trust the raw client values: resolve against the allow-set and clamp.
  const model = resolveModel(input.model);
  const maxTokens = clampMaxTokens(model, input.maxTokens);
  const imageModel = resolveImageModel(input.imageModel);
  const imageCount = clampImageCount(input.imageCount);
  const imageProvider = resolveImageProvider(input.imageProvider);
  // Strict boolean: only a literal `true` enables (a stray string never does).
  const varyDesign = input.varyDesign === true;

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
    [KEY_IMAGE_MODEL, imageModel],
    [KEY_IMAGE_COUNT, String(imageCount)],
    [KEY_IMAGE_PROVIDER, imageProvider],
    [KEY_VARY_DESIGN, String(varyDesign)],
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
    entityId: HOMEPAGE_SETTINGS_ENTITY_ID,
    action: "updated",
    changes: [
      {
        field: "homepage_settings",
        old: null,
        new: `model=${model} max_tokens=${maxTokens} base_prompt_id=${basePromptId ?? ""} image_model=${imageModel} image_count=${imageCount} image_provider=${imageProvider} vary_design=${varyDesign}`,
      },
    ],
    userId: auth.user.id,
  });

  return {
    data: {
      model,
      maxTokens,
      basePromptId,
      imageModel,
      imageCount,
      imageProvider,
      varyDesign,
    },
  };
}
