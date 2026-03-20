"use server";
import { prismadb } from "@/lib/prisma";
import type { SimilarRecord, SimilarityResult } from "./get-similar-accounts";

export async function getSimilarContacts(
  recordId: string,
  limit = 5
): Promise<SimilarityResult> {
  try {
    const rows = await prismadb.$queryRaw<{ embedding: string }[]>`
      SELECT embedding::text FROM "crm_Embeddings_Contacts"
      WHERE contact_id = ${recordId}::uuid
    `;
    if (rows.length === 0) return { status: "no_embedding" };
    const sourceEmbedding = rows[0].embedding;

    const similar = await prismadb.$queryRaw<
      { id: string; first_name: string | null; last_name: string; position: string | null; similarity: number }[]
    >`
      SELECT c.id, c.first_name, c.last_name, c.position,
             1 - (e.embedding <=> ${sourceEmbedding}::vector) AS similarity
      FROM   "crm_Contacts" c
      JOIN   "crm_Embeddings_Contacts" e ON e.contact_id = c.id
      WHERE  c.id != ${recordId}::uuid
      ORDER  BY e.embedding <=> ${sourceEmbedding}::vector
      LIMIT  ${limit}
    `;

    return {
      status: "ok",
      records: similar.map((r) => ({
        id: r.id,
        name: `${r.first_name ?? ""} ${r.last_name}`.trim(),
        subtitle: r.position ?? "",
        similarity: Number(r.similarity),
        href: `/crm/contacts/${r.id}`,
      })),
    };
  } catch (error) {
    console.error("[GET_SIMILAR_CONTACTS]", error);
    return { status: "error", message: "Failed to fetch similar contacts" };
  }
}
