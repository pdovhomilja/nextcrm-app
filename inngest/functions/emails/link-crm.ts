import { inngest } from "@/inngest/client";
import { prismadb } from "@/lib/prisma";
import { decrypt } from "@/lib/email-crypto";
import { fetchBodyByUid } from "@/inngest/lib/imap-utils";

export const emailLinkCrm = inngest.createFunction(
  {
    id: "email-link-crm",
    name: "Email: Link to CRM",
    triggers: [{ event: "email/link-crm" }],
  },
  async ({ event, step }: { event: { data: { emailId: string } }; step: any }) => {
    const { emailId } = event.data;

    const email = await prismadb.email.findUnique({
      where: { id: emailId },
      select: {
        fromEmail: true,
        toRecipients: true,
        ccRecipients: true,
        imapUid: true,
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

      await Promise.all([
        contactLinks.length > 0 &&
          prismadb.emailsToContacts.createMany({ data: contactLinks, skipDuplicates: true }),
        accountLinks.length > 0 &&
          prismadb.emailsToAccounts.createMany({ data: accountLinks, skipDuplicates: true }),
      ]);

      return contactLinks.length + accountLinks.length;
    });

    // Only fetch body + embed for emails that are CRM-relevant
    if (linked > 0 && email.imapUid) {
      const emailAccount = await prismadb.emailAccount.findUnique({
        where: { id: email.emailAccountId },
        select: {
          username: true,
          passwordEncrypted: true,
          imapHost: true,
          imapPort: true,
          imapSsl: true,
          sentFolderName: true,
        },
      });

      if (emailAccount) {
        const folderName =
          email.folder === "SENT"
            ? (emailAccount.sentFolderName || "Sent")
            : "INBOX";

        // Wrap body fetch in step.run for idempotent retry behaviour
        await step.run("fetch-and-save-body", async () => {
          try {
            const body = await fetchBodyByUid(
              {
                username: emailAccount.username,
                password: decrypt(emailAccount.passwordEncrypted),
                imapHost: emailAccount.imapHost,
                imapPort: emailAccount.imapPort,
                imapSsl: emailAccount.imapSsl,
              },
              folderName,
              email.imapUid!
            );

            await prismadb.email.update({
              where: { id: emailId },
              data: {
                bodyText: body.bodyText ?? null,
                bodyHtml: body.bodyHtml ?? null,
              },
            });
          } catch {
            // Body fetch failed — embed will run with subject-only text
          }
        });

        await step.sendEvent("trigger-embed", {
          name: "email/embed-email",
          data: { emailId },
        });
      }
    }

    return { linked };
  }
);
