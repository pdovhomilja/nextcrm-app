import { prismadb } from "@/lib/prisma";
import { createFixtureAccount, createFixtureLead, hardDeleteAccount, uniqueSuffix } from "../fixtures/builders";
import { type IntegrationSession, signInAsAdmin } from "../helpers/auth";

export interface LeadSuiteContext {
  session: IntegrationSession;
  ownerId: string;
  account: { id: string; name: string };
  lead: { id: string; firstName: string | null; lastName: string };
}

export async function setupLeadSuite(tag: string): Promise<LeadSuiteContext> {
  const session = await signInAsAdmin();
  const ownerId = session.userId;
  const suffix = uniqueSuffix(tag);
  const account = await createFixtureAccount({
    ownerId,
    suffix,
  });
  const lead = await createFixtureLead({
    ownerId,
    suffix,
  });
  return { session, ownerId, account, lead };
}

export async function teardownLeadSuite(ctx: LeadSuiteContext): Promise<void> {
  if (ctx.lead?.id) {
    await prismadb.crm_Leads.deleteMany({ where: { id: ctx.lead.id } });
  }
  if (ctx.account?.id) {
    await hardDeleteAccount(ctx.account.id);
  }
}
