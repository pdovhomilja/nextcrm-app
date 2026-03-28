"use server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prismadb } from "@/lib/prisma";
import {
  generateEmbedding,
  toVectorLiteral,
} from "@/inngest/lib/embedding-utils";

export interface SearchResult {
  id: string;
  title: string;
  subtitle: string;
  url: string;
  score: number;
  matchType: "keyword" | "semantic" | "both";
}

export interface UnifiedSearchResults {
  accounts: SearchResult[];
  contacts: SearchResult[];
  leads: SearchResult[];
  opportunities: SearchResult[];
  projects: SearchResult[];
  tasks: SearchResult[];
  users: SearchResult[];
}

function mergeResults(
  keywordIds: Set<string>,
  semanticMap: Map<string, number>,
  allRecords: { id: string; title: string; subtitle: string; url: string }[]
): SearchResult[] {
  const results: SearchResult[] = allRecords.map((r) => {
    const inKeyword = keywordIds.has(r.id);
    const semanticScore = semanticMap.get(r.id) ?? 0;
    const score = 0.5 * (inKeyword ? 1.0 : 0) + 0.5 * semanticScore;
    const matchType: SearchResult["matchType"] =
      inKeyword && semanticScore > 0 ? "both" : inKeyword ? "keyword" : "semantic";
    return { ...r, score, matchType };
  });
  return results.sort((a, b) => b.score - a.score).slice(0, 10);
}

export async function unifiedSearch(
  query: string,
  locale: string = "en"
): Promise<UnifiedSearchResults | { error: string }> {
  const session = await getServerSession(authOptions);
  if (!session) return { error: "Unauthorized" };
  if (!query || query.trim().length < 2)
    return { error: "Query must be at least 2 characters" };

  // Generate embedding — fall back to keyword-only on failure (silent)
  let queryVec: string | null = null;
  try {
    const embedding = await generateEmbedding(query.trim());
    queryVec = toVectorLiteral(embedding);
  } catch (e) {
    console.warn("[UNIFIED_SEARCH] embedding failed, falling back to keyword-only", e);
  }

  const noSemantic = Promise.resolve([] as { id: string; similarity: number }[]);

  try {
    const [
      kwAccounts,
      kwContacts,
      kwLeads,
      kwOpportunities,
      kwProjects,
      kwTasks,
      kwUsers,
      semAccounts,
      semContacts,
      semLeads,
      semOpportunities,
    ] = await Promise.all([
      prismadb.crm_Accounts.findMany({
        where: {
          deletedAt: null,
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { description: { contains: query, mode: "insensitive" } },
            { email: { contains: query, mode: "insensitive" } },
          ],
        },
        take: 10,
        select: { id: true, name: true, email: true },
      }),
      prismadb.crm_Contacts.findMany({
        where: {
          deletedAt: null,
          OR: [
            { first_name: { contains: query, mode: "insensitive" } },
            { last_name: { contains: query, mode: "insensitive" } },
            { email: { contains: query, mode: "insensitive" } },
          ],
        },
        take: 10,
        select: { id: true, first_name: true, last_name: true, email: true },
      }),
      prismadb.crm_Leads.findMany({
        where: {
          deletedAt: null,
          OR: [
            { firstName: { contains: query, mode: "insensitive" } },
            { lastName: { contains: query, mode: "insensitive" } },
            { company: { contains: query, mode: "insensitive" } },
            { email: { contains: query, mode: "insensitive" } },
          ],
        },
        take: 10,
        select: { id: true, firstName: true, lastName: true, company: true, email: true },
      }),
      prismadb.crm_Opportunities.findMany({
        where: {
          deletedAt: null,
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { description: { contains: query, mode: "insensitive" } },
          ],
        },
        take: 10,
        select: { id: true, name: true, status: true },
      }),
      prismadb.boards.findMany({
        where: {
          OR: [
            { title: { contains: query, mode: "insensitive" } },
            { description: { contains: query, mode: "insensitive" } },
          ],
        },
        take: 10,
        select: { id: true, title: true, description: true },
      }),
      prismadb.tasks.findMany({
        where: {
          OR: [
            { title: { contains: query, mode: "insensitive" } },
            { content: { contains: query, mode: "insensitive" } },
          ],
        },
        take: 10,
        select: { id: true, title: true, taskStatus: true },
      }),
      prismadb.users.findMany({
        where: {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { email: { contains: query, mode: "insensitive" } },
            { username: { contains: query, mode: "insensitive" } },
          ],
        },
        take: 10,
        select: { id: true, name: true, email: true },
      }),
      queryVec
        ? prismadb.$queryRaw<{ id: string; similarity: number }[]>`
            SELECT a.id, 1 - (e.embedding <=> ${queryVec}::vector) AS similarity
            FROM "crm_Accounts" a
            LEFT JOIN "crm_Embeddings_Accounts" e ON e.account_id = a.id
            WHERE e.embedding IS NOT NULL
            ORDER BY e.embedding <=> ${queryVec}::vector
            LIMIT 10`
        : noSemantic,
      queryVec
        ? prismadb.$queryRaw<{ id: string; similarity: number }[]>`
            SELECT c.id, 1 - (e.embedding <=> ${queryVec}::vector) AS similarity
            FROM "crm_Contacts" c
            LEFT JOIN "crm_Embeddings_Contacts" e ON e.contact_id = c.id
            WHERE e.embedding IS NOT NULL
            ORDER BY e.embedding <=> ${queryVec}::vector
            LIMIT 10`
        : noSemantic,
      queryVec
        ? prismadb.$queryRaw<{ id: string; similarity: number }[]>`
            SELECT l.id, 1 - (e.embedding <=> ${queryVec}::vector) AS similarity
            FROM "crm_Leads" l
            LEFT JOIN "crm_Embeddings_Leads" e ON e.lead_id = l.id
            WHERE e.embedding IS NOT NULL
            ORDER BY e.embedding <=> ${queryVec}::vector
            LIMIT 10`
        : noSemantic,
      queryVec
        ? prismadb.$queryRaw<{ id: string; similarity: number }[]>`
            SELECT o.id, 1 - (e.embedding <=> ${queryVec}::vector) AS similarity
            FROM "crm_Opportunities" o
            LEFT JOIN "crm_Embeddings_Opportunities" e ON e.opportunity_id = o.id
            WHERE e.embedding IS NOT NULL
            ORDER BY e.embedding <=> ${queryVec}::vector
            LIMIT 10`
        : noSemantic,
    ]);

    const semMap = (rows: { id: string; similarity: number }[]) =>
      new Map(rows.map((r) => [r.id, Number(r.similarity)]));

    const kwAccountIds = new Set(kwAccounts.map((r) => r.id));
    const kwContactIds = new Set(kwContacts.map((r) => r.id));
    const kwLeadIds = new Set(kwLeads.map((r) => r.id));
    const kwOpportunityIds = new Set(kwOpportunities.map((r) => r.id));

    const [extraAccounts, extraContacts, extraLeads, extraOpportunities] =
      await Promise.all([
        prismadb.crm_Accounts.findMany({
          where: { deletedAt: null, id: { in: semAccounts.map((r) => r.id).filter((id) => !kwAccountIds.has(id)) } },
          select: { id: true, name: true, email: true },
        }),
        prismadb.crm_Contacts.findMany({
          where: { deletedAt: null, id: { in: semContacts.map((r) => r.id).filter((id) => !kwContactIds.has(id)) } },
          select: { id: true, first_name: true, last_name: true, email: true },
        }),
        prismadb.crm_Leads.findMany({
          where: { deletedAt: null, id: { in: semLeads.map((r) => r.id).filter((id) => !kwLeadIds.has(id)) } },
          select: { id: true, firstName: true, lastName: true, company: true, email: true },
        }),
        prismadb.crm_Opportunities.findMany({
          where: { deletedAt: null, id: { in: semOpportunities.map((r) => r.id).filter((id) => !kwOpportunityIds.has(id)) } },
          select: { id: true, name: true, status: true },
        }),
      ]);

    const accounts = mergeResults(
      kwAccountIds,
      semMap(semAccounts),
      [...kwAccounts, ...extraAccounts].map((r) => ({
        id: r.id,
        title: r.name,
        subtitle: r.email ?? "",
        url: `/${locale}/crm/accounts/${r.id}`,
      }))
    );

    const contacts = mergeResults(
      kwContactIds,
      semMap(semContacts),
      [...kwContacts, ...extraContacts].map((r) => ({
        id: r.id,
        title: `${r.first_name ?? ""} ${r.last_name ?? ""}`.trim(),
        subtitle: r.email ?? "",
        url: `/${locale}/crm/contacts/${r.id}`,
      }))
    );

    const leads = mergeResults(
      kwLeadIds,
      semMap(semLeads),
      [...kwLeads, ...extraLeads].map((r) => ({
        id: r.id,
        title:
          r.firstName || r.lastName
            ? `${r.firstName ?? ""} ${r.lastName ?? ""}`.trim()
            : (r.company ?? "Unknown Lead"),
        subtitle: r.email ?? r.company ?? "",
        url: `/${locale}/crm/leads/${r.id}`,
      }))
    );

    const opportunities = mergeResults(
      kwOpportunityIds,
      semMap(semOpportunities),
      [...kwOpportunities, ...extraOpportunities].map((r) => ({
        id: r.id,
        title: r.name ?? "",
        subtitle: r.status ?? "",
        url: `/${locale}/crm/opportunities/${r.id}`,
      }))
    );

    const projects: SearchResult[] = kwProjects.map((r) => ({
      id: r.id,
      title: r.title ?? "",
      subtitle: r.description ? r.description.slice(0, 80) : "",
      url: `/${locale}/projects/${r.id}`,
      score: 0.5,
      matchType: "keyword",
    }));

    const tasks: SearchResult[] = kwTasks.map((r) => ({
      id: r.id,
      title: r.title,
      subtitle: r.taskStatus ?? "",
      url: `/${locale}/tasks/${r.id}`,
      score: 0.5,
      matchType: "keyword",
    }));

    const users: SearchResult[] = kwUsers.map((r) => ({
      id: r.id,
      title: r.name ?? r.email ?? "Unknown User",
      subtitle: r.email ?? "",
      url: `/${locale}/settings/users/${r.id}`,
      score: 0.5,
      matchType: "keyword",
    }));

    return { accounts, contacts, leads, opportunities, projects, tasks, users };
  } catch (error) {
    console.error("[UNIFIED_SEARCH]", error);
    return { error: "Search failed" };
  }
}
