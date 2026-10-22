import { decrypt } from "@/lib/email-crypto";
import { fetchResendReceivedEmail } from "@/lib/email/resend-inbound";
import { resendReceivingIdFromRfc } from "@/lib/email/resend-message-id";
import { fetchBodyByUid } from "@/inngest/lib/imap-utils";
import { prismadb } from "@/lib/prisma";
import { EmailFolder } from "@prisma/client";

/** Load full body from Resend receiving API or IMAP and persist. Returns true if body exists. */
export async function fetchAndPersistEmailBody(emailId: string): Promise<boolean> {
  const email = await prismadb.email.findUnique({
    where: { id: emailId },
    select: {
      id: true,
      imapUid: true,
      rfcMessageId: true,
      folder: true,
      bodyText: true,
      bodyHtml: true,
      emailAccountId: true,
    },
  });
  if (!email) return false;
  if (email.bodyText || email.bodyHtml) return true;

  const resendId = resendReceivingIdFromRfc(email.rfcMessageId);
  if (resendId) {
    const payload = await fetchResendReceivedEmail(resendId);
    if (!payload.text && !payload.html) return false;
    await prismadb.email.update({
      where: { id: emailId },
      data: { bodyText: payload.text ?? null, bodyHtml: payload.html ?? null },
    });
    return true;
  }

  if (!email.imapUid) return false;

  const emailAccount = await prismadb.emailAccount.findUnique({
    where: { id: email.emailAccountId },
    select: {
      username: true,
      passwordEncrypted: true,
      imapHost: true,
      imapPort: true,
      imapSsl: true,
      allowSelfSignedTls: true,
      sentFolderName: true,
    },
  });
  if (!emailAccount?.passwordEncrypted) return false;

  const folderName =
    email.folder === EmailFolder.SENT
      ? emailAccount.sentFolderName || "Sent"
      : "INBOX";

  const body = await fetchBodyByUid(
    {
      username: emailAccount.username,
      password: decrypt(emailAccount.passwordEncrypted),
      imapHost: emailAccount.imapHost,
      imapPort: emailAccount.imapPort,
      imapSsl: emailAccount.imapSsl,
      allowSelfSignedTls: emailAccount.allowSelfSignedTls,
    },
    folderName,
    email.imapUid
  );

  if (!body.bodyText && !body.bodyHtml) return false;

  await prismadb.email.update({
    where: { id: emailId },
    data: { bodyText: body.bodyText ?? null, bodyHtml: body.bodyHtml ?? null },
  });
  return true;
}
