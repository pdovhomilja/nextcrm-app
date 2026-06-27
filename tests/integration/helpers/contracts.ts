import { prismadb } from "@/lib/prisma";
import { createFixtureAccount, hardDeleteAccount, uniqueSuffix } from "../fixtures/builders";
import { type IntegrationSession, signInAsAdmin } from "../helpers/auth";

export interface ContractSuiteContext {
  session: IntegrationSession;
  ownerId: string;
  account: { id: string; name: string };
  product: { id: string; name: string };
  contract: { id: string; title: string };
}

export async function setupContractSuite(tag: string): Promise<ContractSuiteContext> {
  const session = await signInAsAdmin();
  const ownerId = session.userId;
  const suffix = uniqueSuffix(tag);

  const account = await createFixtureAccount({
    ownerId,
    suffix,
  });

  const product = await prismadb.crm_Products.create({
    data: {
      name: `Product Test ${suffix}`,
      type: "PRODUCT",
      status: "ACTIVE",
      unit_price: 100.0,
      currency: "USD",
      createdBy: ownerId,
    },
    select: { id: true, name: true },
  });

  const contract = await prismadb.crm_Contracts.create({
    data: {
      v: 0,
      title: `Contract Test ${suffix}`,
      value: 10000.0,
      startDate: new Date(),
      endDate: new Date(),
      renewalReminderDate: new Date(),
      customerSignedDate: new Date(),
      companySignedDate: new Date(),
      description: "Contract Test Description",
      account: account.id,
      assigned_to: ownerId,
      currency: "USD",
      createdBy: ownerId,
      updatedBy: ownerId,
      status: "NOTSTARTED",
    },
    select: { id: true, title: true },
  });

  return { session, ownerId, account, product, contract };
}

export async function teardownContractSuite(ctx: ContractSuiteContext): Promise<void> {
  if (ctx.contract?.id) {
    await prismadb.crm_ContractLineItems.deleteMany({ where: { contractId: ctx.contract.id } });
    await prismadb.crm_Contracts.deleteMany({ where: { id: ctx.contract.id } });
  }
  if (ctx.product?.id) {
    await prismadb.crm_Products.deleteMany({ where: { id: ctx.product.id } });
  }
  if (ctx.account?.id) {
    await hardDeleteAccount(ctx.account.id);
  }
}
