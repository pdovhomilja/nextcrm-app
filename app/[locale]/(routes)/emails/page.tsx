import React, { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Mail, Settings } from "lucide-react";
import { MailLazy } from "./components/MailLazy";
import { EmailComposeFromQuery } from "./components/EmailComposeFromQuery";
import Container from "../components/ui/Container";
import EmailsSkeleton from "@/components/skeletons/emails-skeleton";
import { getSession } from "@/lib/auth-server";
import { getTranslations } from "next-intl/server";
import { getAccessibleEmailAccounts } from "@/actions/emails/accessible-accounts";
import {
  getMailboxCounts,
  getMailboxEmails,
} from "@/actions/emails/mailbox-actions";
import { parseMailboxView } from "@/lib/email/mailbox-views";

type EmailsListResult = Awaited<ReturnType<typeof getMailboxEmails>>;

const emptyEmailsResult: EmailsListResult = {
  emails: [],
  total: 0,
  page: 1,
  totalPages: 0,
  view: "inbox",
};

const EmailRoute = async ({
  searchParams,
}: {
  searchParams: Promise<{
    accountId?: string;
    box?: string;
    folder?: string;
    search?: string;
    page?: string;
    filter?: string;
  }>;
}) => {
  const session = await getSession();

  if (!session) {
    redirect("/");
  }

  const t = await getTranslations("ModuleMenu");
  const params = await searchParams;

  const layoutMail = (await cookies()).get("react-resizable-panels:layout:mail");
  const layoutLegacy = (await cookies()).get("react-resizable-panels:layout");

  const FALLBACK_LAYOUT = [38, 62];
  let validatedLayout: number[] | undefined;

  const rawLayout = layoutMail?.value ?? layoutLegacy?.value;
  if (rawLayout) {
    try {
      const parsed = JSON.parse(rawLayout);
      if (
        Array.isArray(parsed) &&
        parsed.length === 2 &&
        parsed.every((n: number) => typeof n === "number" && n > 0)
      ) {
        validatedLayout = parsed;
      } else if (
        Array.isArray(parsed) &&
        parsed.length === 3 &&
        parsed.every((n: number) => typeof n === "number" && n > 0)
      ) {
        validatedLayout = [parsed[1], parsed[2]];
      } else {
        validatedLayout = FALLBACK_LAYOUT;
      }
      if (validatedLayout) {
        const sum = validatedLayout[0] + validatedLayout[1];
        if (!Number.isFinite(sum) || sum <= 0) {
          validatedLayout = FALLBACK_LAYOUT;
        } else if (Math.abs(sum - 100) > 2) {
          validatedLayout = [
            Math.round((validatedLayout[0] / sum) * 1000) / 10,
            Math.round((validatedLayout[1] / sum) * 1000) / 10,
          ];
        }
      }
    } catch {
      validatedLayout = FALLBACK_LAYOUT;
    }
  }

  let connectedAccounts: any[] = [];
  try {
    connectedAccounts = await getAccessibleEmailAccounts();
  } catch (error) {
    console.error("[EmailRoute] Failed to load email accounts:", error);
    connectedAccounts = [];
  }

  if (!connectedAccounts || connectedAccounts.length === 0) {
    return (
      <Container title={t("emails")} description="Your connected mailboxes">
        <Card className="mx-auto mt-8 max-w-md border-dashed shadow-sm">
          <CardContent className="flex flex-col items-center gap-5 py-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Mail className="h-7 w-7" />
            </div>
            <div className="space-y-2">
              <p className="font-medium">Set up a mailbox first</p>
              <ol className="text-left text-sm text-muted-foreground space-y-1.5 list-decimal list-inside">
                <li>
                  <strong className="text-foreground">Admin:</strong> Admin → Email mailboxes — create
                  a mailbox and assign it to a user (or invite an employee; a mailbox is created
                  automatically).
                </li>
                <li>
                  <strong className="text-foreground">You:</strong> Profile → Email accounts — confirm
                  your work address mailbox is active.
                </li>
                <li>Come back here — Inbox, Sent, and Compose appear in the left column.</li>
              </ol>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <Button asChild variant="default" className="gap-2">
                <Link href="/profile">
                  <Settings className="h-4 w-4" />
                  Profile → Email accounts
                </Link>
              </Button>
              {session.user.role === "admin" && (
                <Button asChild variant="secondary">
                  <Link href="/admin/email-accounts">Admin → Email mailboxes</Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </Container>
    );
  }

  const activeAccountId = params.accountId ?? connectedAccounts[0]?.id;
  const activeMailboxAddress =
    connectedAccounts.find((a) => a.id === activeAccountId)?.username ?? "";
  const mailboxView = parseMailboxView(
    params.box ?? (params.folder === "SENT" ? "sent" : params.folder?.toLowerCase())
  );
  const unreadOnly = params.filter === "unread";
  const activePage = Math.max(1, parseInt(params.page ?? "1", 10) || 1);

  let emailsResult: EmailsListResult = emptyEmailsResult;
  let mailboxCounts = {
    inboxUnread: 0,
    inboxTotal: 0,
    starred: 0,
    spam: 0,
    archive: 0,
    trash: 0,
  };
  if (activeAccountId) {
    try {
      [emailsResult, mailboxCounts] = await Promise.all([
        getMailboxEmails(
          activeAccountId,
          mailboxView,
          activePage,
          params.search,
          unreadOnly
        ),
        getMailboxCounts(activeAccountId),
      ]);
    } catch (error) {
      console.error("[EmailRoute] Failed to load emails:", error);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      {activeAccountId && (
        <Suspense fallback={null}>
          <EmailComposeFromQuery
            accountId={activeAccountId}
            mailboxAddress={activeMailboxAddress}
            accounts={connectedAccounts}
          />
        </Suspense>
      )}
      <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <Suspense fallback={<EmailsSkeleton />}>
        <MailLazy
          accounts={connectedAccounts}
          mails={emailsResult.emails}
          activeAccountId={activeAccountId ?? null}
          mailboxView={mailboxView}
          mailboxCounts={mailboxCounts}
          page={emailsResult.page}
          totalPages={emailsResult.totalPages}
          total={emailsResult.total}
          defaultLayout={validatedLayout}
        />
      </Suspense>
      </div>
    </div>
  );
};

export default EmailRoute;
