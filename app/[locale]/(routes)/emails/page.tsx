import React, { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { MailComponent } from "./components/mail";
import Container from "../components/ui/Container";
import EmailsSkeleton from "@/components/skeletons/emails-skeleton";
import { getSession } from "@/lib/auth-server";
import { getTranslations } from "next-intl/server";
import { getEmailAccounts } from "@/actions/emails/accounts";
import { getEmails } from "@/actions/emails/messages";
import { EmailFolder } from "@prisma/client";

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

  const defaultCollapsed = collapsed ? JSON.parse(collapsed.value) : undefined;

  const connectedAccounts = await getEmailAccounts();

  if (connectedAccounts.length === 0) {
    return (
      <Container title={t("emails")} description="Your connected mailboxes">
        <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
          <p className="text-muted-foreground text-sm">
            You don&apos;t have any mailbox registered yet.
          </p>
          <Link
            href="/profile"
            className="text-sm font-medium underline underline-offset-4"
          >
            Go to your profile to set up your first mailbox
          </Link>
        </div>
      </Container>
    );
  }

  const activeAccountId = params.accountId ?? connectedAccounts[0]?.id;
  const activeFolder = params.folder === "SENT" ? EmailFolder.SENT : EmailFolder.INBOX;

  const activePage = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const emailsResult = activeAccountId
    ? await getEmails(activeAccountId, activeFolder, activePage, params.search)
    : { emails: [], total: 0, page: 1, totalPages: 0 };

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
