import { randomBytes, createHash } from "crypto";
import db from "@/lib/db";

const TOKEN_PREFIX = "thq_";

interface TokenValidationResult {
  valid: boolean;
  userId?: string;
  companyId?: string;
  tokenId?: string;
}

/**
 * Generate a new API token for external agent access.
 * Returns the raw token exactly once — it cannot be retrieved later.
 */
export async function generateApiToken(
  userId: string,
  companyId: string,
  name: string,
  expiresAt?: Date
): Promise<{ rawToken: string; tokenId: string; prefix: string }> {
  const rawBytes = randomBytes(32);
  const rawHex = rawBytes.toString("hex"); // 64 hex chars
  const rawToken = `${TOKEN_PREFIX}${rawHex}`;

  const tokenHash = createHash("sha256").update(rawToken).digest("hex");
  const tokenPrefix = `${TOKEN_PREFIX}${rawHex.slice(0, 8)}`;

  const apiToken = await db.apiToken.create({
    data: {
      name,
      tokenHash,
      tokenPrefix,
      userId,
      companyId,
      expiresAt: expiresAt ?? null,
    },
  });

  return { rawToken, tokenId: apiToken.id, prefix: tokenPrefix };
}

/**
 * Validate a bearer token from an incoming request.
 * Updates lastUsedAt in the background (fire-and-forget).
 */
export async function validateApiToken(
  rawToken: string
): Promise<TokenValidationResult> {
  if (!rawToken.startsWith(TOKEN_PREFIX)) {
    return { valid: false };
  }

  const tokenHash = createHash("sha256").update(rawToken).digest("hex");

  const apiToken = await db.apiToken.findUnique({
    where: { tokenHash },
    select: {
      id: true,
      userId: true,
      companyId: true,
      expiresAt: true,
      revokedAt: true,
    },
  });

  if (!apiToken) {
    return { valid: false };
  }

  if (apiToken.revokedAt) {
    return { valid: false };
  }

  if (apiToken.expiresAt && apiToken.expiresAt < new Date()) {
    return { valid: false };
  }

  // Fire-and-forget lastUsedAt update
  db.apiToken
    .update({
      where: { id: apiToken.id },
      data: { lastUsedAt: new Date() },
    })
    .catch(() => {
      // Swallow — non-critical
    });

  return {
    valid: true,
    userId: apiToken.userId,
    companyId: apiToken.companyId,
    tokenId: apiToken.id,
  };
}

/**
 * Soft-revoke a token by setting revokedAt.
 */
export async function revokeApiToken(
  tokenId: string,
  userId: string
): Promise<void> {
  await db.apiToken.update({
    where: { id: tokenId, userId },
    data: { revokedAt: new Date() },
  });
}

/**
 * List active (non-revoked) tokens for a user within a company.
 * Never returns the hash.
 */
export async function listUserTokens(userId: string, companyId: string) {
  return db.apiToken.findMany({
    where: {
      userId,
      companyId,
      revokedAt: null,
    },
    select: {
      id: true,
      name: true,
      tokenPrefix: true,
      scope: true,
      lastUsedAt: true,
      expiresAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
}
