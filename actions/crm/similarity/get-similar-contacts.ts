"use server";
import { prismadb } from "@/lib/prisma";
import {
  requireAuthenticated,
  assertCanReadContact,
  filterAuthorizedContactIds,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/authz";
import type { SimilarityResult } from "./get-similar-accounts";

export async function getSimilarContacts(
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
    await assertCanReadContact(user, recordId);
  } catch (e) {
    if (e instanceof AuthorizationError)
      return { status: "ok", records: [] };
    throw e;
  }

  try {
    const rows = await prismadb.$queryRaw<{ embedding: string }[]>`
      SELECT embedding::text FROM "crm_Embeddings_Contacts"
      WHERE contact_id = ${recordId}::uuid
    `;
    if (rows.length === 0) return { status: "no_embedding" };
    const sourceEmbedding = rows[0].embedding;

    const overFetch = limit * 3;
    const similar = await prismadb.$queryRaw<
      { id: string; first_name: string | null; last_name: string; position: string | null; similarity: number }[]
    >`
      SELECT c.id, c.first_name, c.last_name, c.position,
             1 - (e.embedding <=> ${sourceEmbedding}::vector) AS similarity
      FROM   "crm_Contacts" c
      JOIN   "crm_Embeddings_Contacts" e ON e.contact_id = c.id
      WHERE  c.id != ${recordId}::uuid
      ORDER  BY e.embedding <=> ${sourceEmbedding}::vector
      LIMIT  ${overFetch}
    `;

    const allowed = new Set(
      await filterAuthorizedContactIds(user, similar.map((r) => r.id)),
    );

    return {
      status: "ok",
      records: similar
        .filter((r) => allowed.has(r.id))
        .slice(0, limit)
        .map((r) => ({
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
