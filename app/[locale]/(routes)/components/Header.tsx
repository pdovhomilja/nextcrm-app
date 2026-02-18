import Feedback from "./Feedback";
import FulltextSearch from "./FulltextSearch";

import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { SetLanguage } from "@/components/SetLanguage";
import { ThemeToggle } from "@/components/ThemeToggle";
import { CommandComponent } from "@/components/CommandComponent";
import SupportComponent from "@/components/support";

type Props = {
  id: string;
  lang: string;
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
const Header = ({ id, lang }: Props) => {
  return (
    <>
      <div className="flex h-16 shrink-0 items-center justify-between gap-2 px-4 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <FulltextSearch />
        </div>
        <div className="flex items-center gap-2">
          <CommandComponent />
          <SetLanguage userId={id} />
          <Feedback />
          <ThemeToggle />
          <SupportComponent />
        </div>
      </div>
      <Separator />
    </>
  );
};

export default Header;
