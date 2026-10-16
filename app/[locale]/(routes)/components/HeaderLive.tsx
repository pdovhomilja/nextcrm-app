"use client";

import dynamic from "next/dynamic";
import Feedback from "./Feedback";
import { HeaderMailButton } from "./HeaderMailButton";
import { HeaderNotifications } from "./HeaderNotifications";
import { HeaderChatPanel } from "./HeaderChatPanel";
import { HeaderProfileMenu } from "./HeaderProfileMenu";

const CrmAssistantSheet = dynamic(
  () =>
    import("@/components/assistant/CrmAssistantSheet").then((m) => m.CrmAssistantSheet),
  { ssr: false, loading: () => null }
);

const FulltextSearch = dynamic(() => import("./FulltextSearch"), {
  ssr: false,
  loading: () => <div className="h-9 w-full max-w-md animate-pulse rounded-xl bg-muted/60" />,
});

const CommandComponent = dynamic(
  () => import("@/components/CommandComponent").then((m) => m.CommandComponent),
  { ssr: false, loading: () => null }
);
import type { HeaderNotificationItem } from "@/actions/notifications/header-notifications";
import type { LiveSummary } from "@/hooks/use-live-summary";
import { useLiveSummary } from "@/hooks/use-live-summary";

import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { SetLanguage } from "@/components/SetLanguage";
import { ThemeToggle } from "@/components/ThemeToggle";
type HeaderUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role?: string | null;
};

type Props = {
  user: HeaderUser;
  initialLive: LiveSummary & { items: HeaderNotificationItem[] };
};

export function HeaderLive({ user, initialLive }: Props) {
  const { data } = useLiveSummary(initialLive);
  const live = data ?? initialLive;

  return (
    <header className="sticky top-0 z-30 flex h-[3.25rem] shrink-0 items-center gap-3 border-b border-border/50 bg-background/75 px-3 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 sm:px-5">
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
        <SidebarTrigger className="-ml-0.5 h-9 w-9 shrink-0 rounded-xl" />
        <Separator orientation="vertical" className="hidden h-5 sm:block" />
        <div className="min-w-0 flex-1">
          <FulltextSearch />
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-0.5 rounded-2xl border border-border/50 bg-muted/25 p-0.5 sm:gap-1 sm:p-1">
        <CrmAssistantSheet />
        <HeaderMailButton unreadCount={live.emailUnreadCount} />
        <HeaderChatPanel unreadCount={live.chatUnreadCount} />
        <HeaderNotifications totalCount={live.notificationCount} items={live.items} />
        <Separator orientation="vertical" className="mx-0.5 hidden h-5 sm:block" />
        <CommandComponent />
        <SetLanguage userId={user.id} />
        <div className="hidden md:flex">
          <Feedback />
        </div>
        <ThemeToggle />
        <HeaderProfileMenu user={user} />
      </div>
    </header>
  );
}
