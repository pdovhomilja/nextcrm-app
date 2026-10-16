"use client";

import dynamic from "next/dynamic";
import EmailsSkeleton from "@/components/skeletons/emails-skeleton";
import type { ConnectedAccount, Mail } from "@/app/[locale]/(routes)/emails/data";
import type { MailboxCounts } from "@/lib/email/mailbox-types";
import type { MailboxView } from "@/lib/email/mailbox-views";

const Mail = dynamic(
  () => import("./mail").then((m) => m.MailComponent),
  { loading: () => <EmailsSkeleton /> }
);

type Props = {
  accounts: ConnectedAccount[];
  mails: Mail[];
  activeAccountId: string | null;
  mailboxView: MailboxView;
  mailboxCounts: MailboxCounts;
  page: number;
  totalPages: number;
  total: number;
  defaultLayout: number[] | undefined;
};

export function MailLazy(props: Props) {
  return <Mail {...props} />;
}
