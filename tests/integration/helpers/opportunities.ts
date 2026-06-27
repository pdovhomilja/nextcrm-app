import { prismadb } from "@/lib/prisma";
import { createFixtureAccount, hardDeleteAccount, uniqueSuffix } from "../fixtures/builders";
import { type IntegrationSession, signInAsAdmin } from "../helpers/auth";

export interface OpportunitySuiteContext {
  session: IntegrationSession;
  ownerId: string;
  account: { id: string; name: string };
  stageId: string;
  opportunity: { id: string; name: string | null };
}

export async function setupOpportunitySuite(tag: string): Promise<OpportunitySuiteContext> {
  const session = await signInAsAdmin();
  const ownerId = session.userId;
  const suffix = uniqueSuffix(tag);
  const account = await createFixtureAccount({
    ownerId,
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
      name: `Oportunidad Test ${suffix}`,
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

  return { session, ownerId, account, stageId: stage.id, opportunity };
}

export async function teardownOpportunitySuite(ctx: OpportunitySuiteContext): Promise<void> {
  if (ctx.opportunity?.id) {
    await prismadb.crm_Opportunities.deleteMany({ where: { id: ctx.opportunity.id } });
  }
  if (ctx.account?.id) {
    await hardDeleteAccount(ctx.account.id);
  }
}
