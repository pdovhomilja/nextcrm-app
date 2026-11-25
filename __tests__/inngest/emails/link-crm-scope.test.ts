jest.mock("@/inngest/client", () => ({
  inngest: { createFunction: jest.fn((_config: unknown, handler: unknown) => handler) },
}));
jest.mock("@/lib/email-crypto", () => ({ decrypt: jest.fn() }));
jest.mock("@/inngest/lib/imap-utils", () => ({ fetchBodyByUid: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    email: { findUnique: jest.fn(), update: jest.fn() },
    emailAccount: { findUnique: jest.fn() },
    crm_Contacts: { findMany: jest.fn() },
    crm_Accounts: { findMany: jest.fn() },
    emailsToContacts: { createMany: jest.fn() },
    emailsToAccounts: { createMany: jest.fn() },
  },
}));

import { prismadb } from "@/lib/prisma";
import { emailLinkCrm } from "@/inngest/functions/emails/link-crm";

type Handler = (ctx: { event: { data: Record<string, unknown> }; step: unknown }) => Promise<unknown>;
const db = prismadb as unknown as Record<string, Record<string, jest.Mock>>;
const step = { run: async (_id: string, fn: () => unknown) => fn(), sendEvent: jest.fn() };
const runJob = () => (emailLinkCrm as unknown as Handler)({ event: { data: { emailId: "m1" } }, step });

beforeEach(() => {
  jest.clearAllMocks();
  db.email.findUnique.mockResolvedValue({
    fromEmail: "Jana@Client.example", toRecipients: [], ccRecipients: [], imapUid: null, folder: "INBOX", emailAccountId: "ea1",
  });
  db.emailAccount.findUnique.mockResolvedValue({ user: { id: "u1", role: "user" } });
  db.crm_Contacts.findMany.mockResolvedValue([]);
  db.crm_Accounts.findMany.mockResolvedValue([]);
});

describe("email-link-crm links only records the mailbox owner can read", () => {
  // A plain user's read scope: live records assigned to them (among others).
  const ownerScoped = expect.objectContaining({
    where: expect.objectContaining({
      AND: expect.arrayContaining([
        { email: { in: ["jana@client.example"] } },
        expect.objectContaining({ deletedAt: null, OR: expect.arrayContaining([expect.objectContaining({ assigned_to: "u1" })]) }),
      ]),
    }),
  });

  it("scopes the contact and account lookups to the owner", async () => {
    await runJob();
    expect(db.emailAccount.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "ea1" } }));
    expect(db.crm_Contacts.findMany).toHaveBeenCalledWith(ownerScoped);
    expect(db.crm_Accounts.findMany).toHaveBeenCalledWith(ownerScoped);
  });

  it("links nothing when the mailbox has no owner", async () => {
    db.emailAccount.findUnique.mockResolvedValue(null);
    expect(await runJob()).toEqual({ linked: 0 });
    expect(db.crm_Contacts.findMany).not.toHaveBeenCalled();
    expect(db.emailsToContacts.createMany).not.toHaveBeenCalled();
  });
});
