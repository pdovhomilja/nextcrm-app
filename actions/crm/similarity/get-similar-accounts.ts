"use server";
import { prismadb } from "@/lib/prisma";

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
  try {
    const rows = await prismadb.$queryRaw<{ embedding: string }[]>`
      SELECT embedding::text FROM "crm_Embeddings_Accounts"
      WHERE account_id = ${recordId}::uuid
    `;
    if (rows.length === 0) return { status: "no_embedding" };
    const sourceEmbedding = rows[0].embedding;

    const similar = await prismadb.$queryRaw<
      { id: string; name: string; email: string | null; similarity: number }[]
    >`
      SELECT a.id, a.name, a.email,
             1 - (e.embedding <=> ${sourceEmbedding}::vector) AS similarity
      FROM   "crm_Accounts" a
      JOIN   "crm_Embeddings_Accounts" e ON e.account_id = a.id
      WHERE  a.id != ${recordId}::uuid
      ORDER  BY e.embedding <=> ${sourceEmbedding}::vector
      LIMIT  ${limit}
    `;

    return {
      status: "ok",
      records: similar.map((r) => ({
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
