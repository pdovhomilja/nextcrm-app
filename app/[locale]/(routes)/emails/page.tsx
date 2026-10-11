import React, { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Mail, Settings } from "lucide-react";
import { MailComponent } from "./components/mail";
import Container from "../components/ui/Container";
import EmailsSkeleton from "@/components/skeletons/emails-skeleton";
import { getSession } from "@/lib/auth-server";
import { getTranslations } from "next-intl/server";
import { getEmailAccounts } from "@/actions/emails/accounts";
import { getEmails } from "@/actions/emails/messages";
import { EmailFolder } from "@prisma/client";

type EmailsListResult = Awaited<ReturnType<typeof getEmails>>;

const emptyEmailsResult: EmailsListResult = {
  emails: [],
  total: 0,
  page: 1,
  totalPages: 0,
};

const EmailRoute = async ({
  searchParams,
}: {
  searchParams: Promise<{ accountId?: string; folder?: string; search?: string; page?: string }>;
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
              <p className="font-medium">Connect a mailbox</p>
              <p className="text-sm text-muted-foreground">
                Mail runs on Resend only. An admin adds mailboxes under Email mailboxes; you can also
                add one in profile once assigned.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <Button asChild variant="default" className="gap-2">
                <Link href="/profile">
                  <Settings className="h-4 w-4" />
                  Profile settings
                </Link>
              </Button>
              {session.user.role === "admin" && (
                <Button asChild variant="secondary">
                  <Link href="/admin/email-accounts">Admin mailboxes</Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </Container>
    );
  }

  const activeAccountId = params.accountId ?? connectedAccounts[0]?.id;
  const activeFolder = params.folder === "SENT" ? EmailFolder.SENT : EmailFolder.INBOX;

  const activePage = Math.max(1, parseInt(params.page ?? "1", 10) || 1);

  let emailsResult: EmailsListResult = emptyEmailsResult;
  if (activeAccountId) {
    try {
      emailsResult = await getEmails(
        activeAccountId,
        activeFolder,
        activePage,
        params.search
      );
    } catch (error) {
      console.error("[EmailRoute] Failed to load emails:", error);
    }
  }

  return (
    <Container
      title={t("emails")}
      description="Your connected mailboxes"
    >
      <Suspense fallback={<EmailsSkeleton />}>
        <MailComponent
          accounts={connectedAccounts}
          mails={emailsResult.emails}
          activeAccountId={activeAccountId ?? null}
          activeFolder={activeFolder}
          page={emailsResult.page}
          totalPages={emailsResult.totalPages}
          defaultLayout={validatedLayout}
          defaultCollapsed={defaultCollapsed}
          navCollapsedSize={8}
        />
      </Suspense>
    </Container>
  );
};

export default EmailRoute;
