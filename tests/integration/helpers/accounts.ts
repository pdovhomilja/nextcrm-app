import { prismadb } from "@/lib/prisma";
import { createFixtureAccount, FIXTURE_ACCOUNT_ID, hardDeleteAccount, uniqueSuffix } from "../fixtures/builders";
import { type IntegrationSession, signInAsAdmin } from "../helpers/auth";

export interface AccountSuiteContext {
  session: IntegrationSession;
  ownerId: string;
  account: { id: string; name: string };
}

export async function setupAccountSuite(tag: string): Promise<AccountSuiteContext> {
  const session = await signInAsAdmin();
  const ownerId = session.userId;
  const account = await createFixtureAccount({
    ownerId,
    suffix: uniqueSuffix(tag),
  });
  return { session, ownerId, account };
}

export async function teardownAccountSuite(ctx: AccountSuiteContext): Promise<void> {
  if (ctx.account?.id) {
    await hardDeleteAccount(ctx.account.id);
  }
}

export { FIXTURE_ACCOUNT_ID, hardDeleteAccount, prismadb, uniqueSuffix };
