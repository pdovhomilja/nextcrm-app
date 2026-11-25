import { prismadb } from "@/lib/prisma";
import {
  accountReadScopeWhere,
  contactReadScopeWhere,
  leadReadScopeWhere,
  opportunityReadScopeWhere,
  targetReadScopeWhere,
} from "@/lib/authz/scopes/crm";
import type { AuthzUser } from "@/lib/authz/session";
import type { EntityLink } from "./types";

// Spec matching order: contact (+account +single open opp) -> target -> lead.
// With a scope user (Google sync: the connection owner) only records that user
// can read are matched; without one (Calendly) matching is org-wide.
export async function matchCounterparty(emails: string[], scopeUser?: AuthzUser): Promise<EntityLink[]> {
  const normalized = emails.map((e) => e.trim().toLowerCase()).filter(Boolean);
  if (normalized.length === 0) return [];

  const within = <T extends object>(where: T, scope: (u: AuthzUser) => object) =>
    scopeUser ? { AND: [where, scope(scopeUser)] } : where;

  const contact = await prismadb.crm_Contacts.findFirst({
    where: within(
      {
        deletedAt: null,
        OR: [
          { email: { in: normalized, mode: "insensitive" as const } },
          { personal_email: { in: normalized, mode: "insensitive" as const } },
        ],
      },
      contactReadScopeWhere,
    ),
    select: { id: true, accountsIDs: true },
  });
  if (contact) {
    const links: EntityLink[] = [{ entityType: "contact", entityId: contact.id }];
    const accountReadable =
      contact.accountsIDs &&
      (!scopeUser ||
        (await prismadb.crm_Accounts.findFirst({
          where: { id: contact.accountsIDs, ...accountReadScopeWhere(scopeUser) },
          select: { id: true },
        })));
    if (contact.accountsIDs && accountReadable) {
      links.push({ entityType: "account", entityId: contact.accountsIDs });
      const open = await prismadb.crm_Opportunities.findMany({
        where: within({ account: contact.accountsIDs, status: "ACTIVE" as const, deletedAt: null }, opportunityReadScopeWhere),
        select: { id: true },
        take: 2,
      });
      if (open.length === 1) {
        links.push({ entityType: "opportunity", entityId: open[0].id });
      }
    }
    return links;
  }

  const target = await prismadb.crm_Targets.findFirst({
    where: within(
      {
        deletedAt: null,
        OR: [
          { email: { in: normalized, mode: "insensitive" as const } },
          { personal_email: { in: normalized, mode: "insensitive" as const } },
          { company_email: { in: normalized, mode: "insensitive" as const } },
        ],
      },
      targetReadScopeWhere,
    ),
    select: { id: true },
  });
  if (target) return [{ entityType: "target", entityId: target.id }];

  const lead = await prismadb.crm_Leads.findFirst({
    where: within({ deletedAt: null, email: { in: normalized, mode: "insensitive" as const } }, leadReadScopeWhere),
    select: { id: true },
  });
  if (lead) return [{ entityType: "lead", entityId: lead.id }];

  return [];
}
