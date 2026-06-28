import { prismadb } from "@/lib/prisma";

export const FIXTURE_ACCOUNT_ID = "00000000-0000-0000-0000-000000000000";

export function uniqueSuffix(tag: string): string {
  return `${tag}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function createFixtureAccount(opts: { ownerId: string; suffix: string }) {
  return prismadb.crm_Accounts.create({
    data: {
      v: 0,
      name: `Cuenta Test ${opts.suffix}`,
      createdBy: opts.ownerId,
      updatedBy: opts.ownerId,
      status: "Active",
    },
    select: { id: true, name: true },
  });
}

export async function createFixtureContact(opts: { ownerId: string; accountId: string; suffix: string }) {
  return prismadb.crm_Contacts.create({
    data: {
      v: 0,
      first_name: "Juan",
      last_name: `Test-${opts.suffix}`,
      accountsIDs: opts.accountId,
      createdBy: opts.ownerId,
      updatedBy: opts.ownerId,
      status: true,
    },
    select: { id: true, first_name: true, last_name: true, accountsIDs: true },
  });
}

export async function createFixtureLead(opts: { ownerId: string; suffix: string }) {
  return prismadb.crm_Leads.create({
    data: {
      v: 0,
      firstName: "Carlos",
      lastName: `Test-${opts.suffix}`,
      createdBy: opts.ownerId,
      updatedBy: opts.ownerId,
      assigned_to: opts.ownerId,
    },
    select: { id: true, firstName: true, lastName: true },
  });
}

export async function hardDeleteAccount(accountId: string): Promise<void> {
  if (!accountId) return;
  await prismadb.crm_AccountProducts.deleteMany({ where: { accountId } });
  await prismadb.crm_ActivityLinks.deleteMany({
    where: { entityType: "account", entityId: accountId },
  });
  await prismadb.accountWatchers.deleteMany({ where: { account_id: accountId } });
  await prismadb.crm_Accounts.delete({ where: { id: accountId } });
}
