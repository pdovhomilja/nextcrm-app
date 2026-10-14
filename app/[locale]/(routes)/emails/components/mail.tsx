"use client";
import * as React from "react";
import { Archive, Inbox, Send, ShieldAlert, Star, Trash2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

import { AccountSwitcher } from "@/app/[locale]/(routes)/emails/components/account-switcher";
import { ComposeModal } from "@/app/[locale]/(routes)/emails/components/ComposeModal";
import { MailDisplay } from "@/app/[locale]/(routes)/emails/components/mail-display";
import { MailList } from "@/app/[locale]/(routes)/emails/components/mail-list";
import { MailSearchBar } from "@/app/[locale]/(routes)/emails/components/MailSearchBar";
import { Nav } from "@/app/[locale]/(routes)/emails/components/nav";
import type { ConnectedAccount, Mail } from "@/app/[locale]/(routes)/emails/data";
import { useMail } from "@/app/[locale]/(routes)/emails/use-mail";
import type { MailboxCounts } from "@/actions/emails/mailbox-actions";
import {
  MAILBOX_VIEW_LABELS,
  type MailboxView,
} from "@/lib/email/mailbox-views";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Button } from "@/components/ui/button";
import { bulkSetRead, bulkTrash } from "@/actions/emails/mailbox-actions";

interface MailProps {
  accounts: ConnectedAccount[];
  mails: Mail[];
  activeAccountId: string | null;
  mailboxView: MailboxView;
  mailboxCounts: MailboxCounts;
  page: number;
  totalPages: number;
  defaultLayout: number[] | undefined;
  defaultCollapsed?: boolean;
  navCollapsedSize: number;
}

export function MailComponent({
  accounts,
  mails,
  activeAccountId,
  mailboxView,
  mailboxCounts,
  page,
  totalPages,
  defaultLayout = [18, 34, 48],
  defaultCollapsed = false,
  navCollapsedSize,
}: MailProps) {
  const [isCollapsed, setIsCollapsed] = React.useState(defaultCollapsed);
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [bulkBusy, setBulkBusy] = React.useState(false);
  const [mail, setMail] = useMail();
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeMailboxAddress =
    accounts.find((a) => a.id === activeAccountId)?.username ?? "";

  const listFilter = searchParams.get("filter") === "unread" ? "unread" : "all";
  const filteredMails =
    mailboxView === "inbox" && listFilter === "unread"
      ? mails.filter((m) => !m.isRead)
      : mails;

  React.useEffect(() => {
    if (!mail.selected && mails[0]?.id) {
      setMail({ ...mail, selected: mails[0].id });
    }
  }, [mail.selected, mails, setMail]);

  React.useEffect(() => {
    setSelectedIds((prev) => prev.filter((id) => mails.some((m) => m.id === id)));
  }, [mails]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const idx = mails.findIndex((m) => m.id === mail.selected);
      if (e.key === "j" && idx < mails.length - 1) {
        setMail({ ...mail, selected: mails[idx + 1].id });
      }
      if (e.key === "k" && idx > 0) {
        setMail({ ...mail, selected: mails[idx - 1].id });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mail, mails, setMail]);

  async function runBulk(fn: () => Promise<void>) {
    setBulkBusy(true);
    try {
      await fn();
      setSelectedIds([]);
      router.refresh();
    } finally {
      setBulkBusy(false);
    }
  }

  function viewHref(view: MailboxView) {
    const p = new URLSearchParams(searchParams.toString());
    p.set("box", view);
    p.delete("page");
    if (view !== "inbox") p.delete("filter");
    return `?${p.toString()}`;
  }

  function setListFilter(next: "all" | "unread") {
    const p = new URLSearchParams(searchParams.toString());
    if (next === "unread") p.set("filter", "unread");
    else p.delete("filter");
    p.delete("page");
    router.push(`?${p.toString()}`);
  }

  const navLinks = [
    {
      title: "Inbox",
      icon: Inbox,
      variant: (mailboxView === "inbox" ? "default" : "ghost") as "default" | "ghost",
      href: viewHref("inbox"),
      label: mailboxCounts.inboxUnread > 0 ? String(mailboxCounts.inboxUnread) : undefined,
    },
    {
      title: "Sent",
      icon: Send,
      variant: (mailboxView === "sent" ? "default" : "ghost") as "default" | "ghost",
      href: viewHref("sent"),
    },
    {
      title: "Starred",
      icon: Star,
      variant: (mailboxView === "starred" ? "default" : "ghost") as "default" | "ghost",
      href: viewHref("starred"),
      label: mailboxCounts.starred > 0 ? String(mailboxCounts.starred) : undefined,
    },
    {
      title: "Spam",
      icon: ShieldAlert,
      variant: (mailboxView === "spam" ? "default" : "ghost") as "default" | "ghost",
      href: viewHref("spam"),
      label: mailboxCounts.spam > 0 ? String(mailboxCounts.spam) : undefined,
    },
    {
      title: "Archive",
      icon: Archive,
      variant: (mailboxView === "archive" ? "default" : "ghost") as "default" | "ghost",
      href: viewHref("archive"),
      label: mailboxCounts.archive > 0 ? String(mailboxCounts.archive) : undefined,
    },
    {
      title: "Trash",
      icon: Trash2,
      variant: (mailboxView === "trash" ? "default" : "ghost") as "default" | "ghost",
      href: viewHref("trash"),
      label: mailboxCounts.trash > 0 ? String(mailboxCounts.trash) : undefined,
    },
  ];

  return (
    <TooltipProvider delayDuration={0}>
      <ResizablePanelGroup
        orientation="horizontal"
        onLayoutChange={(layout) => {
          const layoutArray = Object.values(layout);
          document.cookie = `react-resizable-panels:layout=${JSON.stringify(layoutArray)}`;
        }}
        className="flex h-[min(78dvh,calc(100dvh-11rem))] min-h-[520px] flex-row overflow-hidden rounded-2xl border border-border/50 bg-card shadow-sm"
      >
        <ResizablePanel
          defaultSize={`${defaultLayout[0]}%`}
          collapsedSize={`${navCollapsedSize}%`}
          collapsible
          minSize="12%"
          maxSize="26%"
          onResize={(panelSize) => {
            const collapsed = panelSize.asPercentage <= navCollapsedSize;
            if (collapsed !== isCollapsed) {
              setIsCollapsed(collapsed);
              document.cookie = `react-resizable-panels:collapsed=${JSON.stringify(collapsed)}`;
            }
          }}
          className={cn(
            "border-r border-border/40 bg-muted/20",
            isCollapsed && "transition-all duration-300 ease-in-out"
          )}
        >
          <div className="p-2.5">
            <AccountSwitcher
              isCollapsed={isCollapsed}
              accounts={accounts}
              activeAccountId={activeAccountId}
            />
          </div>
          <Separator className="opacity-50" />
          {activeAccountId && !isCollapsed && (
            <div className="p-2.5">
              <ComposeModal
                accountId={activeAccountId}
                mailboxAddress={activeMailboxAddress}
              />
            </div>
          )}
          <Nav isCollapsed={isCollapsed} links={navLinks} />
        </ResizablePanel>
        <ResizableHandle withHandle className="bg-border/30" />
        <ResizablePanel
          defaultSize={`${defaultLayout[1]}%`}
          minSize="22%"
          className="flex min-h-0 flex-col border-r border-border/40 bg-background/95"
        >
          <div className="flex shrink-0 items-center gap-2 border-b border-border/30 px-4 py-2.5">
            <h2 className="text-sm font-semibold tracking-tight">
              {MAILBOX_VIEW_LABELS[mailboxView]}
            </h2>
            {mailboxView === "inbox" && (
              <Tabs
                value={listFilter}
                onValueChange={(v) => setListFilter(v as "all" | "unread")}
                className="ml-auto"
              >
                <TabsList className="h-8 rounded-full bg-muted/50 p-0.5">
                  <TabsTrigger value="all" className="rounded-full px-3 text-xs">
                    All
                  </TabsTrigger>
                  <TabsTrigger value="unread" className="rounded-full px-3 text-xs">
                    Unread
                    {mailboxCounts.inboxUnread > 0 && (
                      <span className="ml-1 text-primary">{mailboxCounts.inboxUnread}</span>
                    )}
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            )}
          </div>
          <div className="shrink-0 px-3 pb-2 pt-2">
            <MailSearchBar />
          </div>
          {selectedIds.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 border-b border-border/40 px-4 py-2">
              <span className="text-xs text-muted-foreground">{selectedIds.length} selected</span>
              <Button
                size="sm"
                variant="secondary"
                className="h-7 text-xs"
                disabled={bulkBusy}
                onClick={() => runBulk(() => bulkSetRead(selectedIds, true))}
              >
                Mark read
              </Button>
              <Button
                size="sm"
                variant="secondary"
                className="h-7 text-xs"
                disabled={bulkBusy}
                onClick={() => runBulk(() => bulkSetRead(selectedIds, false))}
              >
                Mark unread
              </Button>
              <Button
                size="sm"
                variant="destructive"
                className="h-7 text-xs"
                disabled={bulkBusy}
                onClick={() => runBulk(() => bulkTrash(selectedIds))}
              >
                Trash
              </Button>
            </div>
          )}
          <Separator className="opacity-50" />
          <div className="min-h-0 flex-1">
            <MailList
              items={filteredMails}
              page={page}
              totalPages={totalPages}
              selectedIds={selectedIds}
              onSelectedIdsChange={setSelectedIds}
            />
          </div>
        </ResizablePanel>
        <ResizableHandle withHandle className="bg-border/30" />
        <ResizablePanel
          defaultSize={`${defaultLayout[2]}%`}
          minSize="28%"
          className="min-h-0 bg-background"
        >
          <MailDisplay
            mail={mails.find((item) => item.id === mail.selected) || null}
            activeAccountId={activeAccountId}
            mailboxAddress={activeMailboxAddress}
            mailboxView={mailboxView}
          />
        </ResizablePanel>
      </ResizablePanelGroup>
    </TooltipProvider>
  );
}
