"use server";
import { prismadb } from "@/lib/prisma";
import type { SimilarityResult } from "./get-similar-accounts";

export async function getSimilarOpportunities(
  recordId: string,
  limit = 5
): Promise<SimilarityResult> {
  try {
    const rows = await prismadb.$queryRaw<{ embedding: string }[]>`
      SELECT embedding::text FROM "crm_Embeddings_Opportunities"
      WHERE opportunity_id = ${recordId}::uuid
    `;
    if (rows.length === 0) return { status: "no_embedding" };
    const sourceEmbedding = rows[0].embedding;

    const similar = await prismadb.$queryRaw<
      { id: string; name: string; stage_name: string | null; similarity: number }[]
    >`
      SELECT o.id, o.name, s.name AS stage_name,
             1 - (e.embedding <=> ${sourceEmbedding}::vector) AS similarity
      FROM   "crm_Opportunities" o
      JOIN   "crm_Embeddings_Opportunities" e ON e.opportunity_id = o.id
      LEFT JOIN "crm_Opportunities_Sales_Stages" s ON s.id = o.sales_stage
      WHERE  o.id != ${recordId}::uuid
      ORDER  BY e.embedding <=> ${sourceEmbedding}::vector
      LIMIT  ${limit}
    `;

    return {
      status: "ok",
      records: similar.map((r) => ({
        id: r.id,
        name: r.name ?? "",
        subtitle: r.stage_name ?? "",
        similarity: Number(r.similarity),
        href: `/crm/opportunities/${r.id}`,
      })),
    };
  } catch (error) {
    console.error("[GET_SIMILAR_OPPORTUNITIES]", error);
    return { status: "error", message: "Failed to fetch similar opportunities" };
  }
}
