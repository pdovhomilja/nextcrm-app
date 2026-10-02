import { prismadb } from "@/lib/prisma";

// Fork-owned DB loaders for the homepage prompt-layer libraries. All reads are
// ORG-scoped and filter soft-deleted rows; empty libraries degrade to []/null so
// the generate flow can fall back gracefully.

// id is a @db.Uuid column: a non-UUID string would make Prisma throw rather than miss.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Active ORG HOMEPAGE_STYLE rows (id + body). */
export async function loadActiveStyles(): Promise<{ id: string; body: string }[]> {
  const rows = await prismadb.crm_Ai_Prompt.findMany({
    where: { kind: "HOMEPAGE_STYLE", scope: "ORG", deletedAt: null },
    select: { id: true, body: true },
    orderBy: { id: "asc" },
  });
  return rows.map((r) => ({ id: r.id, body: r.body }));
}

/** Active ORG HOMEPAGE_AVOID bodies, newline-joined; null when there are none. */
export async function loadAvoidText(): Promise<string | null> {
  const rows = await prismadb.crm_Ai_Prompt.findMany({
    where: { kind: "HOMEPAGE_AVOID", scope: "ORG", deletedAt: null },
    select: { body: true },
    orderBy: { created_on: "asc" },
  });
  return rows.length > 0 ? rows.map((r) => r.body).join("\n") : null;
}

/**
 * Industry layer body for a target. Uses the target's selected prompt when it is a
 * live ORG HOMEPAGE_INDUSTRY row; otherwise falls back to the is_default (Generic)
 * industry; null when neither exists.
 */
export async function loadIndustryBody(promptId: string | null): Promise<string | null> {
  const base = { kind: "HOMEPAGE_INDUSTRY", scope: "ORG", deletedAt: null } as const;
  if (promptId && UUID_RE.test(promptId)) {
    const selected = await prismadb.crm_Ai_Prompt.findFirst({
      where: { ...base, id: promptId },
      select: { body: true },
    });
    if (selected) return selected.body;
  }
  const generic = await prismadb.crm_Ai_Prompt.findFirst({
    where: { ...base, is_default: true },
    select: { body: true },
  });
  return generic?.body ?? null;
}
