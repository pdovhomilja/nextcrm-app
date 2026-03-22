import { inngest } from "@/inngest/client";
import { prismadb } from "@/lib/prisma";

export const emailLinkCrm = inngest.createFunction(
  {
    id: "email-link-crm",
    name: "Email: Link to CRM",
    triggers: [{ event: "email/link-crm" }],
  },
  async ({ event }: { event: { data: { emailId: string } } }) => {
    const { emailId } = event.data;

    const email = await prismadb.email.findUnique({
      where: { id: emailId },
      select: {
        fromEmail: true,
        toRecipients: true,
        ccRecipients: true,
      },
    });
    if (!email) return { skipped: "not found" };

    // Collect all addresses (exclude BCC — privacy)
    const addresses = [
      email.fromEmail,
      ...(email.toRecipients as { email?: string }[]).map((r) => r.email),
      ...(email.ccRecipients as { email?: string }[]).map((r) => r.email),
    ]
      .filter((e): e is string => typeof e === "string" && e.length > 0)
      .map((e) => e.toLowerCase());

    if (addresses.length === 0) return { linked: 0 };

    const [contacts, accounts] = await Promise.all([
      prismadb.crm_Contacts.findMany({
        where: { email: { in: addresses } },
        select: { id: true },
      }),
      prismadb.crm_Accounts.findMany({
        where: { email: { in: addresses } },
        select: { id: true },
      }),
    ]);

    const contactLinks = contacts.map((c) => ({ emailId, contactId: c.id }));
    const accountLinks = accounts.map((a) => ({ emailId, accountId: a.id }));

    await Promise.all([
      contactLinks.length > 0 &&
        prismadb.emailsToContacts.createMany({ data: contactLinks, skipDuplicates: true }),
      accountLinks.length > 0 &&
        prismadb.emailsToAccounts.createMany({ data: accountLinks, skipDuplicates: true }),
    ]);

    return { linked: contactLinks.length + accountLinks.length };
  }
);
