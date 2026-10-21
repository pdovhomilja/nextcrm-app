"use client";
import * as React from "react";
import { Archive, Inbox, PenLine, Send, ShieldAlert, Star, Trash2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

import { AccountSwitcher } from "@/app/[locale]/(routes)/emails/components/account-switcher";
import { ComposeModal } from "@/app/[locale]/(routes)/emails/components/ComposeModal";
import { MailDisplay } from "@/app/[locale]/(routes)/emails/components/mail-display";
import { MailList } from "@/app/[locale]/(routes)/emails/components/mail-list";
import { MailSearchBar } from "@/app/[locale]/(routes)/emails/components/MailSearchBar";
import { Nav } from "@/app/[locale]/(routes)/emails/components/nav";
import type { ConnectedAccount, Mail } from "@/app/[locale]/(routes)/emails/data";
import { useMail } from "@/app/[locale]/(routes)/emails/use-mail";
import type { MailboxCounts } from "@/lib/email/mailbox-types";
import {
  MAILBOX_VIEW_LABELS,
  type MailboxView,
} from "@/lib/email/mailbox-views";
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
  total: number;
  defaultLayout: number[] | undefined;
}

export function MailComponent({
  accounts,
  mails,
  activeAccountId,
  mailboxView,
  mailboxCounts,
  page,
  totalPages,
  total,
  defaultLayout = [38, 62],
}: MailProps) {
  const LIST_PANEL_ID = "mail-list";
  const READ_PANEL_ID = "mail-read";

  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [bulkBusy, setBulkBusy] = React.useState(false);
  const [mail, setMail] = useMail();
  const [mobileReadOpen, setMobileReadOpen] = React.useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();

  const isLargeScreen = React.useSyncExternalStore(
    (subscribe) => {
      const mq = window.matchMedia("(min-width: 1024px)");
      mq.addEventListener("change", subscribe);
      return () => mq.removeEventListener("change", subscribe);
    },
    () => window.matchMedia("(min-width: 1024px)").matches,
    () => true
  );

  const groupDefaultLayout = React.useMemo(
    () => ({
      [LIST_PANEL_ID]: defaultLayout[0],
      [READ_PANEL_ID]: defaultLayout[1],
    }),
    [defaultLayout]
  );
  const activeMailboxAddress =
    accounts.find((a) => a.id === activeAccountId)?.username ?? "";

  const listFilter = searchParams.get("filter") === "unread" ? "unread" : "all";
  const [localMails, setLocalMails] = React.useState(mails);
  React.useEffect(() => {
    setLocalMails(mails);
  }, [mails]);

  const patchMail = React.useCallback((id: string, patch: Partial<Mail>) => {
    setLocalMails((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  }, []);

  const removeMail = React.useCallback(
    (id: string) => {
      setLocalMails((prev) => {
        const next = prev.filter((m) => m.id !== id);
        if (mail.selected === id) {
          setMail({ ...mail, selected: next[0]?.id ?? null });
        }
        return next;
      });
    },
    [mail, setMail]
  );

  const filteredMails = React.useMemo(() => {
    if (mailboxView === "inbox" && listFilter === "unread") {
      return localMails.filter((m) => !m.isRead);
    }
    return localMails;
  }, [localMails, mailboxView, listFilter]);

  React.useEffect(() => {
    if (!mail.selected && filteredMails[0]?.id) {
      setMail({ ...mail, selected: filteredMails[0].id });
    }
  }, [mail.selected, filteredMails, setMail]);

  React.useEffect(() => {
    setSelectedIds((prev) => prev.filter((id) => localMails.some((m) => m.id === id)));
  }, [localMails]);

  React.useEffect(() => {
    if (isLargeScreen) setMobileReadOpen(false);
  }, [isLargeScreen]);

  React.useEffect(() => {
    if (!isLargeScreen && mail.selected) setMobileReadOpen(true);
  }, [mail.selected, isLargeScreen]);

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

  async function runBulk(fn: () => Promise<void>, optimistic?: () => void) {
    setBulkBusy(true);
    try {
      optimistic?.();
      await fn();
      setSelectedIds([]);
    } catch (e) {
      console.error(e);
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

  const selectedMail = filteredMails.find((item) => item.id === mail.selected) || null;

  const mailListHandlers = {
    mailboxView,
    onPatchMail: patchMail,
    onRemoveMail: removeMail,
  };

  const listPane = (
    <div className="grid h-full min-h-0 grid-rows-[auto_auto_auto_minmax(0,1fr)] overflow-hidden">
      <div className="flex shrink-0 items-center gap-2 border-b border-border/30 px-3 py-2.5 sm:px-4">
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
        <div className="flex flex-wrap items-center gap-2 border-b border-border/40 px-3 py-2 sm:px-4">
          <span className="text-xs text-muted-foreground">{selectedIds.length} selected</span>
          <Button
            size="sm"
            variant="secondary"
            className="h-7 text-xs"
            disabled={bulkBusy}
            onClick={() =>
              runBulk(
                () => bulkSetRead(selectedIds, true),
                () => selectedIds.forEach((id) => patchMail(id, { isRead: true }))
              )
            }
          >
            Mark read
          </Button>
          <Button
            size="sm"
            variant="secondary"
            className="h-7 text-xs"
            disabled={bulkBusy}
            onClick={() =>
              runBulk(
                () => bulkSetRead(selectedIds, false),
                () => selectedIds.forEach((id) => patchMail(id, { isRead: false }))
              )
            }
          >
            Mark unread
          </Button>
          <Button
            size="sm"
            variant="destructive"
            className="h-7 text-xs"
            disabled={bulkBusy}
            onClick={() =>
              runBulk(
                () => bulkTrash(selectedIds),
                () => selectedIds.forEach((id) => removeMail(id))
              )
            }
          >
            Trash
          </Button>
        </div>
      )}
      <Separator className="opacity-50" />
      <div className="min-h-0 overflow-hidden">
        <MailList
          items={filteredMails}
          page={page}
          totalPages={totalPages}
          total={total}
          selectedIds={selectedIds}
          onSelectedIdsChange={setSelectedIds}
          {...mailListHandlers}
        />
      </div>
    </div>
  );

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex h-full min-h-0 w-full max-w-full min-w-0 flex-1 overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
        <aside className="flex w-[4.5rem] shrink-0 flex-col overflow-y-auto overscroll-contain border-r border-border/40 bg-muted/30 sm:w-44">
          <div className="space-y-1 p-2">
            <p className="hidden px-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground sm:block">
              View as
            </p>
            <AccountSwitcher accounts={accounts} activeAccountId={activeAccountId} />
          </div>
          <Separator className="opacity-50" />
          {activeAccountId && (
            <div className="p-2">
              <ComposeModal
                accountId={activeAccountId}
                accounts={accounts}
                mailboxAddress={activeMailboxAddress}
                trigger={
                  <Button
                    size="sm"
                    className="h-9 w-full gap-2 rounded-lg shadow-sm sm:px-3"
                    aria-label="Compose"
                  >
                    <PenLine className="h-4 w-4 shrink-0" />
                    <span className="hidden truncate text-xs sm:inline">Compose</span>
                  </Button>
                }
              />
            </div>
          )}
          <Nav links={navLinks} />
        </aside>

        <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden lg:hidden">
          {mobileReadOpen && selectedMail ? (
            <MailDisplay
              mail={selectedMail}
              activeAccountId={activeAccountId}
              accounts={accounts}
              mailboxAddress={activeMailboxAddress}
              mailboxView={mailboxView}
              onBack={() => setMobileReadOpen(false)}
              onPatchMail={patchMail}
              onRemoveMail={removeMail}
            />
          ) : (
            listPane
          )}
        </div>

        <ResizablePanelGroup
          id="mail-layout-group"
          orientation="horizontal"
          defaultLayout={groupDefaultLayout}
          onLayoutChanged={(layout) => {
            const list = layout[LIST_PANEL_ID];
            const read = layout[READ_PANEL_ID];
            if (typeof list === "number" && typeof read === "number") {
              document.cookie = `react-resizable-panels:layout:mail=${JSON.stringify([list, read])}`;
            }
          }}
          className="hidden h-full min-h-0 min-w-0 w-0 flex-1 overflow-hidden lg:flex"
        >
        <ResizablePanel
          id={LIST_PANEL_ID}
          defaultSize={`${defaultLayout[0]}%`}
          minSize="22%"
          maxSize="52%"
          className="min-h-0 min-w-0 overflow-hidden border-r border-border/40 bg-background"
        >
          <div className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden">{listPane}</div>
        </ResizablePanel>
        <ResizableHandle withHandle className="bg-border/30" />
        <ResizablePanel
          id={READ_PANEL_ID}
          defaultSize={`${defaultLayout[1]}%`}
          minSize="35%"
          className="min-h-0 min-w-0 overflow-hidden bg-background"
        >
          <div className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden">
            <MailDisplay
              mail={selectedMail}
              activeAccountId={activeAccountId}
              accounts={accounts}
              mailboxAddress={activeMailboxAddress}
              mailboxView={mailboxView}
              onPatchMail={patchMail}
              onRemoveMail={removeMail}
            />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
      </div>
      </div>
    </TooltipProvider>
  );
}
