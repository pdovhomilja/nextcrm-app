"use server";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import {
  generateEmbedding,
  toVectorLiteral,
} from "@/inngest/lib/embedding-utils";

export interface DocumentSearchResult {
  id: string;
  name: string;
  summary: string | null;
  systemType: string | null;
  accountName: string | null;
}

export async function searchDocuments(
  query: string
): Promise<DocumentSearchResult[]> {
  const session = await getSession();
  if (!session) return [];
  if (!query || query.trim().length < 2) return [];

  // Keyword search
  const kwResults = await prismadb.documents.findMany({
    where: {
      parent_document_id: null,
      OR: [
        { document_name: { contains: query, mode: "insensitive" } },
        { summary: { contains: query, mode: "insensitive" } },
      ],
    },
    take: 5,
    select: {
      id: true,
      document_name: true,
      summary: true,
      document_system_type: true,
      accounts: { select: { account: { select: { name: true } } }, take: 1 },
    },
  });

  // Semantic search
  let semResults: { id: string; similarity: number }[] = [];
  try {
    const embedding = await generateEmbedding(query.trim());
    const vec = toVectorLiteral(embedding);

    semResults = await prismadb.$queryRaw<{ id: string; similarity: number }[]>`
      SELECT d.id, 1 - (e.embedding <=> ${vec}::vector) AS similarity
      FROM "Documents" d
      LEFT JOIN "crm_Embeddings_Documents" e ON e.document_id = d.id
      WHERE e.embedding IS NOT NULL AND d."parent_document_id" IS NULL
        AND 1 - (e.embedding <=> ${vec}::vector) > 0.7
      ORDER BY e.embedding <=> ${vec}::vector
      LIMIT 5`;
  } catch {
    // Fall back to keyword-only
  }

  // Merge: keyword results first, then semantic-only results
  const kwIds = new Set(kwResults.map((r) => r.id));
  const semOnlyIds = semResults.filter((r) => !kwIds.has(r.id)).map((r) => r.id);

  let extraDocs: typeof kwResults = [];
  if (semOnlyIds.length > 0) {
    extraDocs = await prismadb.documents.findMany({
      where: { id: { in: semOnlyIds }, parent_document_id: null },
      select: {
        id: true,
        document_name: true,
        summary: true,
        document_system_type: true,
        accounts: { select: { account: { select: { name: true } } }, take: 1 },
      },
    });
  }

  return [...kwResults, ...extraDocs].map((r) => ({
    id: r.id,
    name: r.document_name,
    summary: r.summary,
    systemType: r.document_system_type,
    accountName: r.accounts?.[0]?.account?.name ?? null,
  }));
}
