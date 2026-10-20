"use server";

import { getMailboxCounts, getMailboxEmails } from "@/actions/emails/mailbox-actions";
import type { MailboxCounts } from "@/lib/email/mailbox-types";
import type { MailboxEmailsResult } from "@/lib/email/mailbox-types";

/** One round-trip for the emails route: list + folder counts. */
export async function getMailboxPageData(
  accountId: string,
  viewRaw: string | undefined,
  page: number,
  search?: string,
  unreadOnly?: boolean
): Promise<{ emails: MailboxEmailsResult; counts: MailboxCounts }> {
  const [emails, counts] = await Promise.all([
    getMailboxEmails(accountId, viewRaw, page, search, unreadOnly),
    getMailboxCounts(accountId),
  ]);
  return { emails, counts };
}
