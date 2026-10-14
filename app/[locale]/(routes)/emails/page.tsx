import React, { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Mail, Settings } from "lucide-react";
import { MailComponent } from "./components/mail";
import { EmailComposeFromQuery } from "./components/EmailComposeFromQuery";
import Container from "../components/ui/Container";
import EmailsSkeleton from "@/components/skeletons/emails-skeleton";
import { getSession } from "@/lib/auth-server";
import { getTranslations } from "next-intl/server";
import { getEmailAccounts } from "@/actions/emails/accounts";
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

  const layout = (await cookies()).get("react-resizable-panels:layout");
  const collapsed = (await cookies()).get("react-resizable-panels:collapsed");

  // Parse layout with validation - ensure left panel is visible
  const FALLBACK_LAYOUT = [20, 35, 45];
  let validatedLayout: number[] | undefined;

  if (layout) {
    try {
      const parsed = JSON.parse(layout.value);
      if (
        Array.isArray(parsed) &&
        parsed.length === 3 &&
        parsed.every((n: number) => typeof n === "number" && n > 0) &&
        parsed[0] >= 18
      ) {
        validatedLayout = parsed;
      } else {
        validatedLayout = FALLBACK_LAYOUT;
      }
    } catch {
      validatedLayout = FALLBACK_LAYOUT;
    }
  }

  let defaultCollapsed: boolean | undefined = undefined;
  if (collapsed) {
    try {
      defaultCollapsed = JSON.parse(collapsed.value);
    } catch {
      defaultCollapsed = undefined;
    }
  }

  let connectedAccounts: any[] = [];
  try {
    connectedAccounts = await getEmailAccounts();
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
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2 px-0.5">
        <h1 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
          {t("emails")}
        </h1>
        <p className="text-xs text-muted-foreground sm:text-sm">
          Inbox · sent · search
        </p>
      </div>
      {activeAccountId && (
        <Suspense fallback={null}>
          <EmailComposeFromQuery
            accountId={activeAccountId}
            mailboxAddress={activeMailboxAddress}
          />
        </Suspense>
      )}
      <Suspense fallback={<EmailsSkeleton />}>
        <MailComponent
          accounts={connectedAccounts}
          mails={emailsResult.emails}
          activeAccountId={activeAccountId ?? null}
          mailboxView={mailboxView}
          mailboxCounts={mailboxCounts}
          page={emailsResult.page}
          totalPages={emailsResult.totalPages}
          defaultLayout={validatedLayout}
          defaultCollapsed={defaultCollapsed}
          navCollapsedSize={8}
        />
      </Suspense>
    </div>
  );
};

export default EmailRoute;
