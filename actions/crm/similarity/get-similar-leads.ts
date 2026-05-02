"use server";
import { prismadb } from "@/lib/prisma";
import {
  requireAuthenticated,
  assertCanReadLead,
  filterAuthorizedLeadIds,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/authz";
import type { SimilarityResult } from "./get-similar-accounts";

export async function getSimilarLeads(
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
    await assertCanReadLead(user, recordId);
  } catch (e) {
    if (e instanceof AuthorizationError)
      return { status: "ok", records: [] };
    throw e;
  }

  try {
    const rows = await prismadb.$queryRaw<{ embedding: string }[]>`
      SELECT embedding::text FROM "crm_Embeddings_Leads"
      WHERE lead_id = ${recordId}::uuid
    `;
    if (rows.length === 0) return { status: "no_embedding" };
    const sourceEmbedding = rows[0].embedding;

    const overFetch = limit * 3;
    const similar = await prismadb.$queryRaw<
      { id: string; firstName: string | null; lastName: string; status: string | null; similarity: number }[]
    >`
      SELECT l.id, l."firstName", l."lastName", l.status,
             1 - (e.embedding <=> ${sourceEmbedding}::vector) AS similarity
      FROM   "crm_Leads" l
      JOIN   "crm_Embeddings_Leads" e ON e.lead_id = l.id
      WHERE  l.id != ${recordId}::uuid
      ORDER  BY e.embedding <=> ${sourceEmbedding}::vector
      LIMIT  ${overFetch}
    `;

    const allowed = new Set(
      await filterAuthorizedLeadIds(user, similar.map((r) => r.id)),
    );

    return {
      status: "ok",
      records: similar
        .filter((r) => allowed.has(r.id))
        .slice(0, limit)
        .map((r) => ({
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
