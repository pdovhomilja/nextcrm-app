import {
  getUpstashRedis,
  recordRedisCacheFailure,
  recordRedisCacheSuccess,
} from "@/lib/cache/upstash-redis";

const PREFIX = "mailbox:v1";
const LIST_TTL_SECONDS = 120;
const COUNTS_TTL_SECONDS = 90;

function getRedis() {
  return getUpstashRedis();
}

function genKey(userId: string, accountId: string) {
  return `${PREFIX}:gen:${userId}:${accountId}`;
}

function countsKey(userId: string, accountId: string) {
  return `${PREFIX}:counts:${userId}:${accountId}`;
}

export async function getMailboxCacheGeneration(
  userId: string,
  accountId: string
): Promise<number> {
  const client = getRedis();
  if (!client) return 0;
  try {
    const v = await client.get<number>(genKey(userId, accountId));
    recordRedisCacheSuccess();
    return typeof v === "number" ? v : 0;
  } catch (error) {
    recordRedisCacheFailure(error);
    return 0;
  }
}

function listKey(
  userId: string,
  accountId: string,
  gen: number,
  parts: Record<string, string | number | boolean | undefined>
) {
  const flat = Object.entries(parts)
    .filter(([, v]) => v !== undefined && v !== "")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("&");
  return `${PREFIX}:list:${userId}:${accountId}:g${gen}:${flat}`;
}

export async function getCachedMailboxList<T>(
  userId: string,
  accountId: string,
  gen: number,
  keyParts: Record<string, string | number | boolean | undefined>
) {
  const client = getRedis();
  if (!client) return null;
  try {
    const value = (await client.get<T>(listKey(userId, accountId, gen, keyParts))) ?? null;
    recordRedisCacheSuccess();
    return value;
  } catch (error) {
    recordRedisCacheFailure(error);
    console.error("[mailbox-cache] get list", error);
    return null;
  }
}

export async function setCachedMailboxList(
  userId: string,
  accountId: string,
  gen: number,
  keyParts: Record<string, string | number | boolean | undefined>,
  value: unknown
) {
  const client = getRedis();
  if (!client) return;
  try {
    await client.set(listKey(userId, accountId, gen, keyParts), value, { ex: LIST_TTL_SECONDS });
    recordRedisCacheSuccess();
  } catch (error) {
    recordRedisCacheFailure(error);
    console.error("[mailbox-cache] set list", error);
  }
}

export async function getCachedMailboxCounts<T>(userId: string, accountId: string) {
  const client = getRedis();
  if (!client) return null;
  try {
    const value = (await client.get<T>(countsKey(userId, accountId))) ?? null;
    recordRedisCacheSuccess();
    return value;
  } catch (error) {
    recordRedisCacheFailure(error);
    console.error("[mailbox-cache] get counts", error);
    return null;
  }
}

export async function setCachedMailboxCounts(userId: string, accountId: string, value: unknown) {
  const client = getRedis();
  if (!client) return;
  try {
    await client.set(countsKey(userId, accountId), value, { ex: COUNTS_TTL_SECONDS });
    recordRedisCacheSuccess();
  } catch (error) {
    recordRedisCacheFailure(error);
    console.error("[mailbox-cache] set counts", error);
  }
}

/** Bump cache generation after mailbox mutations (lists invalidate; counts key deleted). */
export async function invalidateMailboxCache(userId: string, accountId: string) {
  const client = getRedis();
  if (!client) return;
  try {
    await client.incr(genKey(userId, accountId));
    await client.del(countsKey(userId, accountId));
    recordRedisCacheSuccess();
  } catch (error) {
    recordRedisCacheFailure(error);
    console.error("[mailbox-cache] invalidate", error);
  }
}

async function ownedAccountIdForEmail(emailId: string) {
  const { prismadb } = await import("@/lib/prisma");
  const row = await prismadb.email.findFirst({
    where: { id: emailId },
    select: { emailAccountId: true },
  });
  return row?.emailAccountId;
}

export async function invalidateMailboxCacheForEmail(emailId: string, userId: string) {
  const accountId = await ownedAccountIdForEmail(emailId);
  if (accountId) await invalidateMailboxCache(userId, accountId);
}

export async function invalidateMailboxCacheForEmails(ids: string[], userId: string) {
  if (!ids.length) return;
  const { prismadb } = await import("@/lib/prisma");
  const rows = await prismadb.email.findMany({
    where: { id: { in: ids } },
    select: { emailAccountId: true },
  });
  const accounts = new Set(rows.map((r) => r.emailAccountId));
  await Promise.all(
    Array.from(accounts).map((accountId) => invalidateMailboxCache(userId, accountId))
  );
}
