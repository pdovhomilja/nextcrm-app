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

/**
 * Header Component - Task Group 3.2
 *
 * Reorganized header for new layout with shadcn dashboard-01 pattern.
 *
 * Layout Structure:
 * - Left side: SidebarTrigger (mobile menu), FulltextSearch
 * - Right side: CommandComponent, SetLanguage, Feedback, ThemeToggle, SupportComponent
 *
 * Changes from previous version:
 * - Removed AvatarDropdown (functionality moved to nav-user section in sidebar)
 * - Removed unused props: name, email, avatar (now only used by nav-user)
 * - Optimized spacing and alignment for new layout
 * - SidebarTrigger added in Task 2.8.0 for mobile menu control
 *
 * Note: User profile functionality (avatar, name, email, user actions) is now
 * handled by the NavUser component in the sidebar footer (Task 3.1).
 */
const Header = ({
  id,
  lang,
  unreadEmailCount = 0,
  notificationCount = 0,
  notifications = [],
}: Props) => {
  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border/60 bg-background/85 px-4 backdrop-blur-md supports-[backdrop-filter]:bg-background/70">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <SidebarTrigger className="-ml-1 shrink-0" />
        <Separator orientation="vertical" className="mr-1 hidden h-4 sm:block" />
        <div className="min-w-0 flex-1 max-w-xl">
          <FulltextSearch />
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
        <HeaderMailButton unreadCount={unreadEmailCount} />
        <HeaderChatPanel />
        <HeaderNotifications totalCount={notificationCount} items={notifications} />
        <Separator orientation="vertical" className="mx-1 hidden h-4 sm:block" />
        <CommandComponent />
        <SetLanguage userId={id} />
        <div className="hidden items-center gap-0.5 md:flex">
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
