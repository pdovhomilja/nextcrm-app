import { prismadb } from "@/lib/prisma";
import { decrypt } from "@/lib/email-crypto";
import type { ApiKeyProvider } from "@prisma/client";

export type { ApiKeyProvider };

const PROVIDER_ENV_MAP: Record<ApiKeyProvider, string> = {
  OPENAI: "OPENAI_API_KEY",
  FIRECRAWL: "FIRECRAWL_API_KEY",
  ANTHROPIC: "ANTHROPIC_API_KEY",
  GROQ: "GROQ_API_KEY",
};

/**
 * Resolve an API key using the 3-tier priority chain:
 * 1. ENV variable (OPENAI_API_KEY etc.)
 * 2. System-wide key stored in DB (scope=SYSTEM)
 * 3. User's personal key stored in DB (scope=USER) — only if userId provided
 * 4. Returns null if no key found
 */
export async function getApiKey(
  provider: ApiKeyProvider,
  userId?: string
): Promise<string | null> {
  // Tier 1: ENV
  const envKey = process.env[PROVIDER_ENV_MAP[provider]];
  if (envKey) return envKey;

  // Tier 2: system-wide DB key
  const systemRow = await prismadb.apiKeys.findFirst({
    where: { scope: "SYSTEM", provider },
    select: { encryptedKey: true },
  });
  if (systemRow) return decrypt(systemRow.encryptedKey);

  // Tier 3: user-specific DB key
  if (userId) {
    const userRow = await prismadb.apiKeys.findFirst({
      where: { scope: "USER", userId, provider },
      select: { encryptedKey: true },
    });
    if (userRow) return decrypt(userRow.encryptedKey);
  }

  return null;
}
