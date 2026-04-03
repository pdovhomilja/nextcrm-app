"use server";
import { getSession } from "@/lib/auth-server";

import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { encrypt, decrypt } from "@/lib/email-crypto";
import { ApiKeyProvider } from "@prisma/client";

const PROVIDER_ENV_MAP: Record<ApiKeyProvider, string> = {
  OPENAI: "OPENAI_API_KEY",
  FIRECRAWL: "FIRECRAWL_API_KEY",
  ANTHROPIC: "ANTHROPIC_API_KEY",
  GROQ: "GROQ_API_KEY",
};

export type ProviderStatus = {
  provider: ApiKeyProvider;
  source: "ENV_ACTIVE" | "SYSTEM_SET" | "NOT_CONFIGURED";
  maskedKey?: string;
};

export async function getSystemApiKeys(): Promise<ProviderStatus[]> {
  const session = await getSession();
  if (!session || session.user.role !== "admin") throw new Error("Unauthorized");

  const providers = Object.values(ApiKeyProvider) as ApiKeyProvider[];

  return Promise.all(
    providers.map(async (provider): Promise<ProviderStatus> => {
      const envValue = process.env[PROVIDER_ENV_MAP[provider]];
      if (envValue) {
        return {
          provider,
          source: "ENV_ACTIVE",
          maskedKey: "••••" + envValue.slice(-4),
        };
      }

      const row = await prismadb.apiKeys.findFirst({
        where: { scope: "SYSTEM", provider },
        select: { encryptedKey: true },
      });

      if (row) {
        const plaintext = decrypt(row.encryptedKey);
        return {
          provider,
          source: "SYSTEM_SET",
          maskedKey: "••••" + plaintext.slice(-4),
        };
      }

      return { provider, source: "NOT_CONFIGURED" };
    })
  );
}

export async function upsertSystemApiKey(
  provider: ApiKeyProvider,
  key: string
): Promise<void> {
  const session = await getSession();
  if (!session || session.user.role !== "admin") throw new Error("Unauthorized");

  const encryptedKey = encrypt(key);

  await prismadb.$transaction([
    prismadb.apiKeys.deleteMany({
      where: { scope: "SYSTEM", provider },
    }),
    prismadb.apiKeys.create({
      data: {
        scope: "SYSTEM",
        provider,
        encryptedKey,
      },
    }),
  ]);

  revalidatePath("/(en)/admin/llm-keys");
}

export async function deleteSystemApiKey(provider: ApiKeyProvider): Promise<void> {
  const session = await getSession();
  if (!session || session.user.role !== "admin") throw new Error("Unauthorized");

  await prismadb.apiKeys.deleteMany({
    where: { scope: "SYSTEM", provider },
  });

  revalidatePath("/(en)/admin/llm-keys");
}
