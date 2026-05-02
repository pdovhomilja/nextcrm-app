"use server";
import { prismadb } from "@/lib/prisma";
import {
  requireAuthenticated,
  assertCanReadAccount,
  filterAuthorizedAccountIds,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/authz";

export type SimilarRecord = {
  id: string;
  name: string;
  subtitle: string;
  similarity: number;
  href: string;
};

export type SimilarityResult =
  | { status: "ok"; records: SimilarRecord[] }
  | { status: "no_embedding" }
  | { status: "error"; message: string };

export async function getSimilarAccounts(
  recordId: string,
  limit = 5
): Promise<SimilarityResult> {
  let user;
  try {
    user = await requireAuthenticated();
  } catch (e) {
    if (e instanceof AuthenticationError)
      return { status: "ok", records: [] };
    throw e;
  }
  try {
    await assertCanReadAccount(user, recordId);
  } catch (e) {
    if (e instanceof AuthorizationError)
      return { status: "ok", records: [] };
    throw e;
  }

  try {
    const rows = await prismadb.$queryRaw<{ embedding: string }[]>`
      SELECT embedding::text FROM "crm_Embeddings_Accounts"
      WHERE account_id = ${recordId}::uuid
    `;
    if (rows.length === 0) return { status: "no_embedding" };
    const sourceEmbedding = rows[0].embedding;

    const overFetch = limit * 3;
    const similar = await prismadb.$queryRaw<
      { id: string; name: string; email: string | null; similarity: number }[]
    >`
      SELECT a.id, a.name, a.email,
             1 - (e.embedding <=> ${sourceEmbedding}::vector) AS similarity
      FROM   "crm_Accounts" a
      JOIN   "crm_Embeddings_Accounts" e ON e.account_id = a.id
      WHERE  a.id != ${recordId}::uuid
      ORDER  BY e.embedding <=> ${sourceEmbedding}::vector
      LIMIT  ${overFetch}
    `;

    const allowed = new Set(
      await filterAuthorizedAccountIds(user, similar.map((r) => r.id)),
    );

    return {
      status: "ok",
      records: similar
        .filter((r) => allowed.has(r.id))
        .slice(0, limit)
        .map((r) => ({
          id: r.id,
          name: r.name,
          subtitle: r.email ?? "",
          similarity: Number(r.similarity),
          href: `/crm/accounts/${r.id}`,
        })),
    };
  } catch (error) {
    console.error("[GET_SIMILAR_ACCOUNTS]", error);
    return { status: "error", message: "Failed to fetch similar accounts" };
  }
}
