import { prismadb } from "@/lib/prisma";
import type { EntityLink } from "./types";

// Spec matching order: contact (+account +single open opp) -> target -> lead.
export async function matchCounterparty(emails: string[]): Promise<EntityLink[]> {
  const normalized = emails.map((e) => e.trim().toLowerCase()).filter(Boolean);
  if (normalized.length === 0) return [];

  const contact = await prismadb.crm_Contacts.findFirst({
    where: {
      deletedAt: null,
      OR: [
        { email: { in: normalized, mode: "insensitive" } },
        { personal_email: { in: normalized, mode: "insensitive" } },
      ],
    },
    select: { id: true, accountsIDs: true },
  });
  if (contact) {
    const links: EntityLink[] = [{ entityType: "contact", entityId: contact.id }];
    if (contact.accountsIDs) {
      links.push({ entityType: "account", entityId: contact.accountsIDs });
      const open = await prismadb.crm_Opportunities.findMany({
        where: { account: contact.accountsIDs, status: "ACTIVE", deletedAt: null },
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
    where: {
      deletedAt: null,
      OR: [
        { email: { in: normalized, mode: "insensitive" } },
        { personal_email: { in: normalized, mode: "insensitive" } },
        { company_email: { in: normalized, mode: "insensitive" } },
      ],
    },
    select: { id: true },
  });
  if (target) return [{ entityType: "target", entityId: target.id }];

  const lead = await prismadb.crm_Leads.findFirst({
    where: { deletedAt: null, email: { in: normalized, mode: "insensitive" } },
    select: { id: true },
  });
  if (lead) return [{ entityType: "lead", entityId: lead.id }];

  return [];
}
