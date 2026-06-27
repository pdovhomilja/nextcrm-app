import { prismadb } from "@/lib/prisma";
import { createFixtureAccount, createFixtureContact, hardDeleteAccount, uniqueSuffix } from "../fixtures/builders";
import { type IntegrationSession, signInAsAdmin } from "../helpers/auth";

export interface ActivitySuiteContext {
  session: IntegrationSession;
  ownerId: string;
  account: { id: string; name: string };
  contact: { id: string; first_name: string | null; last_name: string };
  opportunity: { id: string; name: string | null };
}

export async function setupActivitySuite(tag: string): Promise<ActivitySuiteContext> {
  const session = await signInAsAdmin();
  const ownerId = session.userId;
  const suffix = uniqueSuffix(tag);

  const account = await createFixtureAccount({
    ownerId,
    suffix,
  });

  const contact = await createFixtureContact({
    ownerId,
    accountId: account.id,
    suffix,
  });

  let stage = await prismadb.crm_Opportunities_Sales_Stages.findFirst({ select: { id: true } });
  if (!stage) {
    stage = await prismadb.crm_Opportunities_Sales_Stages.create({
      data: { name: "Qualification", probability: 10 },
      select: { id: true },
    });
  }

  const opportunity = await prismadb.crm_Opportunities.create({
    data: {
      name: `Opportunity Test ${suffix}`,
      account: account.id,
      sales_stage: stage.id,
      budget: 10000.0,
      expected_revenue: 1000.0,
      createdBy: ownerId,
      updatedBy: ownerId,
      status: "ACTIVE",
    },
    select: { id: true, name: true },
  });

  return { session, ownerId, account, contact, opportunity };
}

export async function teardownActivitySuite(ctx: ActivitySuiteContext): Promise<void> {
  const links = await prismadb.crm_ActivityLinks.findMany({
    where: {
      OR: [
        { entityType: "account", entityId: ctx.account.id },
        { entityType: "contact", entityId: ctx.contact.id },
        { entityType: "opportunity", entityId: ctx.opportunity.id },
      ],
    },
    select: { activityId: true },
  });

  const activityIds = links.map((l: any) => l.activityId);

  await prismadb.crm_ActivityLinks.deleteMany({
    where: {
      OR: [
        { entityType: "account", entityId: ctx.account.id },
        { entityType: "contact", entityId: ctx.contact.id },
        { entityType: "opportunity", entityId: ctx.opportunity.id },
      ],
    },
  });

  if (activityIds.length > 0) {
    await prismadb.crm_Activities.deleteMany({
      where: { id: { in: activityIds } },
    });
  }

  if (ctx.opportunity?.id) {
    await prismadb.crm_Opportunities.deleteMany({ where: { id: ctx.opportunity.id } });
  }

  if (ctx.contact?.id) {
    await prismadb.crm_Contacts.deleteMany({ where: { id: ctx.contact.id } });
  }

  if (ctx.account?.id) {
    await hardDeleteAccount(ctx.account.id);
  }
}
