import { inngest } from "@/inngest/client";
import { prismadb } from "@/lib/prisma";
import { fetchAndPersistEmailBody } from "@/lib/email/fetch-email-body";

export const emailLinkCrm = inngest.createFunction(
  {
    id: "email-link-crm",
    name: "Email: Link to CRM",
    concurrency: { limit: 8 },
    triggers: [{ event: "email/link-crm" }],
  },
  async ({ event, step }) => {
    const { emailId } = event.data as { emailId: string };

    const email = await prismadb.email.findUnique({
      where: { id: emailId },
      select: {
        fromEmail: true,
        toRecipients: true,
        ccRecipients: true,
        imapUid: true,
        rfcMessageId: true,
        bodyText: true,
        bodyHtml: true,
        folder: true,
        emailAccountId: true,
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

    const linked = await step.run("match-and-link", async () => {
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

      if (contactLinks.length > 0) {
        await prismadb.emailsToContacts.createMany({ data: contactLinks, skipDuplicates: true });
      }
      if (accountLinks.length > 0) {
        await prismadb.emailsToAccounts.createMany({ data: accountLinks, skipDuplicates: true });
      }

      return contactLinks.length + accountLinks.length;
    });

    if (linked > 0) {
      const hasBody = Boolean(email.bodyText || email.bodyHtml);
      if (!hasBody) {
        await step.run("fetch-and-save-body", async () => {
          try {
            await fetchAndPersistEmailBody(emailId);
          } catch (e) {
            console.warn(`[link-crm] Body fetch failed for email ${emailId}:`, e);
          }
        });
      }

      await step.sendEvent("trigger-embed", {
        name: "email/embed-email",
        data: { emailId },
      });
    }

    return { linked };
  }
);
