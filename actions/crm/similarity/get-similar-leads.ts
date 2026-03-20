"use server";
import { prismadb } from "@/lib/prisma";
import type { SimilarityResult } from "./get-similar-accounts";

export async function getSimilarLeads(
  recordId: string,
  limit = 5
): Promise<SimilarityResult> {
  try {
    const rows = await prismadb.$queryRaw<{ embedding: string }[]>`
      SELECT embedding::text FROM "crm_Embeddings_Leads"
      WHERE lead_id = ${recordId}::uuid
    `;
    if (rows.length === 0) return { status: "no_embedding" };
    const sourceEmbedding = rows[0].embedding;

    const similar = await prismadb.$queryRaw<
      { id: string; firstName: string | null; lastName: string; status: string | null; similarity: number }[]
    >`
      SELECT l.id, l."firstName", l."lastName", l.status,
             1 - (e.embedding <=> ${sourceEmbedding}::vector) AS similarity
      FROM   "crm_Leads" l
      JOIN   "crm_Embeddings_Leads" e ON e.lead_id = l.id
      WHERE  l.id != ${recordId}::uuid
      ORDER  BY e.embedding <=> ${sourceEmbedding}::vector
      LIMIT  ${limit}
    `;

    return {
      status: "ok",
      records: similar.map((r) => ({
        id: r.id,
        name: `${r.firstName ?? ""} ${r.lastName}`.trim(),
        subtitle: r.status ?? "",
        similarity: Number(r.similarity),
        href: `/crm/leads/${r.id}`,
      })),
    };
  } catch (error) {
    console.error("[GET_SIMILAR_LEADS]", error);
    return { status: "error", message: "Failed to fetch similar leads" };
  }
}
