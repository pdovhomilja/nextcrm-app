"use server";

import { requireAuth } from "@/lib/security/company-access-validator";
import {
  generateApiToken,
  revokeApiToken,
  listUserTokens,
} from "@/lib/security/api-token-service";

export async function createApiTokenAction(
  name: string,
  expiresInDays?: number
) {
  const { userId, activeCompanyId } = await requireAuth();

  const expiresAt = expiresInDays
    ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
    : undefined;

  const { rawToken, tokenId, prefix } = await generateApiToken(
    userId,
    activeCompanyId,
    name,
    expiresAt
  );

  return { rawToken, tokenId, prefix };
}

export async function revokeApiTokenAction(tokenId: string) {
  const { userId } = await requireAuth();
  await revokeApiToken(tokenId, userId);
  return { success: true };
}

export async function listApiTokensAction() {
  const { userId, activeCompanyId } = await requireAuth();
  return listUserTokens(userId, activeCompanyId);
}
