import { prismadb } from "@/lib/prisma";
import { resolveLastClientActivity } from "./funnel-timers";

// "Client activity" per the 2026-07-18 decision: an inbound synced email
// linked to the deal's contact or account, OR a logged crm_Activities
// entry linked to the opportunity. Stage entry is the clock's floor.
export async function getLastClientActivity(opp: {
  id: string;
  contact: string | null;
  account: string | null;
  stage_entered_at: Date | null;
}): Promise<Date | null> {
  const orScopes = [
    ...(opp.contact ? [{ contacts: { some: { contactId: opp.contact } } }] : []),
    ...(opp.account ? [{ accounts: { some: { accountId: opp.account } } }] : []),
  ];

  const lastInbound = orScopes.length
    ? await prismadb.email.findFirst({
        where: { folder: "INBOX", isDeleted: false, sentAt: { not: null }, OR: orScopes },
        orderBy: { sentAt: "desc" },
        select: { sentAt: true },
      })
    : null;

  const lastActivity = await prismadb.crm_Activities.findFirst({
    where: {
      deletedAt: null,
      links: { some: { entityType: "opportunity", entityId: opp.id } },
    },
    orderBy: { date: "desc" },
    select: { date: true },
  });

  return resolveLastClientActivity({
    stageEnteredAt: opp.stage_entered_at,
    lastInboundEmailAt: lastInbound?.sentAt ?? null,
    lastLoggedActivityAt: lastActivity?.date ?? null,
  });
}
