import { prismadb } from "@/lib/prisma";
import { createFixtureAccount, createFixtureContact, hardDeleteAccount, uniqueSuffix } from "../fixtures/builders";
import { type IntegrationSession, signInAsAdmin } from "../helpers/auth";

export interface ContactSuiteContext {
  session: IntegrationSession;
  ownerId: string;
  account: { id: string; name: string };
  contact: { id: string; first_name: string | null; last_name: string };
}

export async function setupContactSuite(tag: string): Promise<ContactSuiteContext> {
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
  return { session, ownerId, account, contact };
}

export async function teardownContactSuite(ctx: ContactSuiteContext): Promise<void> {
  if (ctx.contact?.id) {
    await prismadb.crm_Contacts.deleteMany({ where: { id: ctx.contact.id } });
  }
  if (ctx.account?.id) {
    await hardDeleteAccount(ctx.account.id);
  }
}
