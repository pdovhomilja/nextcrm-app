import crypto from "crypto";
import { prismadb } from "@/lib/prisma";

const TOKEN_PREFIX = "nxtc__";
const TOKEN_BYTES = 24; // 48 hex chars
const MAX_TOKENS_PER_USER = 10;

function hashToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

export async function generateApiToken(
  userId: string,
  name: string,
  expiresAt?: Date
): Promise<{ rawToken: string; tokenId: string }> {
  const activeCount = await prismadb.apiToken.count({
    where: {
      userId,
      revokedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
  });

  if (activeCount >= MAX_TOKENS_PER_USER) {
    throw new Error("Maximum 10 active tokens allowed per user");
  }

  const rawSuffix = crypto.randomBytes(TOKEN_BYTES).toString("hex");
  const rawToken = TOKEN_PREFIX + rawSuffix;
  const tokenHash = hashToken(rawToken);
  const tokenPrefix = rawSuffix.slice(0, 8);

  const created = await prismadb.apiToken.create({
    data: {
      name,
      tokenHash,
      tokenPrefix,
      userId,
      expiresAt: expiresAt ?? null,
    },
  });

  return { rawToken, tokenId: created.id };
}

export async function validateApiToken(rawToken: string): Promise<string> {
  const tokenHash = hashToken(rawToken);

  const token = await prismadb.apiToken.findUnique({
    where: { tokenHash },
  });

  if (!token) throw new Error("Invalid token");
  if (token.revokedAt) throw new Error("Invalid token");
  if (token.expiresAt && token.expiresAt < new Date()) throw new Error("Invalid token");

  // Fire-and-forget lastUsedAt update — failures are intentionally silenced
  void Promise.resolve(
    prismadb.apiToken.update({ where: { id: token.id }, data: { lastUsedAt: new Date() } })
  ).catch(() => {});

  return token.userId;
}

export async function revokeApiToken(
  tokenId: string,
  userId: string
): Promise<void> {
  const token = await prismadb.apiToken.findUnique({ where: { id: tokenId } });
  if (!token || token.userId !== userId) throw new Error("Not found");

  await prismadb.apiToken.update({
    where: { id: tokenId },
    data: { revokedAt: new Date() },
  });
}

export async function listApiTokens(userId: string) {
  return prismadb.apiToken.findMany({
    where: { userId },
    select: {
      id: true,
      name: true,
      tokenPrefix: true,
      expiresAt: true,
      revokedAt: true,
      createdAt: true,
      lastUsedAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
}
