import Feedback from "./Feedback";
import FulltextSearch from "./FulltextSearch";
import { HeaderMailButton } from "./HeaderMailButton";
import { HeaderNotifications } from "./HeaderNotifications";
import { HeaderChatPanel } from "./HeaderChatPanel";
import type { HeaderNotificationItem } from "@/actions/notifications/header-notifications";

import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { SetLanguage } from "@/components/SetLanguage";
import { ThemeToggle } from "@/components/ThemeToggle";
import { CommandComponent } from "@/components/CommandComponent";
import SupportComponent from "@/components/support";
import { CurrencySwitcher } from "@/components/CurrencySwitcher";

type Props = {
  id: string;
  lang: string;
  unreadEmailCount?: number;
  notificationCount?: number;
  notifications?: HeaderNotificationItem[];
};

const Header = ({
  id,
  unreadEmailCount = 0,
  notificationCount = 0,
  notifications = [],
}: Props) => {
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
        <HeaderMailButton unreadCount={unreadEmailCount} />
        <HeaderChatPanel />
        <HeaderNotifications totalCount={notificationCount} items={notifications} />
        <Separator orientation="vertical" className="mx-0.5 hidden h-5 sm:block" />
        <CommandComponent />
        <SetLanguage userId={id} />
        <div className="hidden items-center md:flex">
          <Feedback />
          <CurrencySwitcher />
        </div>
        <ThemeToggle />
        <SupportComponent />
      </div>
    </header>
  );
};

export default Header;
