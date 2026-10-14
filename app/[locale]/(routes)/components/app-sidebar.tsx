"use client";

import * as React from "react";

const HCTPL_LOGO_URL = "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/hctpl-logo-MGmowsi8I3RvpJLdjM4RplJB2PDgoV.png";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { Puzzle } from "lucide-react";
import { cn } from "@/lib/utils";
import { NavMain } from "./nav-main";
import getDashboardMenuItem from "./menu-items/Dashboard";
import getCrmMenuItem from "./menu-items/Crm";
import getProjectsMenuItem from "./menu-items/Projects";
import getEmailsMenuItem from "./menu-items/Emails";
import getChatMenuItem from "./menu-items/Chat";
import getScheduleMenuItem from "./menu-items/Schedule";
import getReportsMenuItem from "./menu-items/Reports";
import getDocumentsMenuItem from "./menu-items/Documents";
import getInvoicesMenuItem from "./menu-items/Invoices";
import getAdministrationMenuItem from "./menu-items/Administration";
import getCampaignsMenuItem from "./menu-items/Campaigns";
import type { NavItem } from "./nav-main";
import { featureForPath, type PermissionMatrix } from "@/lib/authz/permissions";

function canViewUrl(url: string | undefined, permissions?: PermissionMatrix) {
  if (!url || !permissions) return true;
  const feature = featureForPath(url);
  return !feature || permissions[feature].view;
}

function filterNavByPermissions(items: NavItem[], permissions?: PermissionMatrix): NavItem[] {
  return items.flatMap((item) => {
    if (!item.items) return canViewUrl(item.url, permissions) ? [item] : [];
    const visible = item.items.filter((sub) => canViewUrl(sub.url, permissions));
    return visible.length ? [{ ...item, items: visible }] : [];
  });
}

/**
 * AppSidebar Component - Task Groups 1.2, 2.2-2.7, 3.1, 5.3, 5.4
 *
 * Core sidebar component for NextCRM application layout.
 * Implements shadcn/ui sidebar pattern with:
 * - Logo and "N" branding symbol with rotation animation
 * - Build version display in footer (when expanded)
 * - Navigation with Dashboard and module items
 * - Nav-user section in footer for user profile and actions
 *
 * Phase 2 Updates:
 * - Task 2.2: Added Dashboard menu item integration
 * - Task 2.3: Added CRM module navigation (collapsible group with module filtering)
 * - Task 2.4: Added Projects module navigation (simple item with module filtering)
 * - Task 2.5: Added Emails module navigation (simple item with module filtering)
 * - Task 2.6: Added remaining module navigation items (Employees, Reports, Documents, Databox)
 * - Task 2.7: Added Administration menu with role-based visibility (role === "admin")
 * - NavMain component renders all enabled module navigation items
 * - Module filtering ensures only enabled modules appear in navigation
 * - Role-based visibility: Administration only shows for admin users
 *
 * Phase 3 Updates:
 * - Task 3.1: Added NavUser component in SidebarFooter
 * - NavUser displays user avatar, name, email
 * - NavUser provides dropdown with user actions (Profile, Settings, Logout)
 * - NavUser adapts to collapsed/expanded sidebar states
 * - Build version moved above NavUser in footer
 *
 * Phase 5 Updates (Design Consistency):
 * - Task 5.3: Removed duration-200 from app name animation (uses Tailwind default)
 * - Task 5.3: Kept duration-500 on "N" symbol for intentional brand emphasis
 * - Task 5.4: Changed build version text-gray-500 to text-muted-foreground for theme support
 *
 * @param modules - Array of enabled modules from system_Modules_Enabled table
 * @param dict - Localization dictionary for navigation labels
 * @param build - Build number for version display
 * @param session - User session data for role-based navigation and user profile
 */

interface User {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role?: string | null;
  userStatus?: string;
  userLanguage?: string;
  lastLoginAt?: Date;
}

interface Session {
  user: User;
}

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  dict: any;
  session: Session;
  pluginNav?: { title: string; url: string }[];
  appName: string;
  permissions?: PermissionMatrix;
}

export function AppSidebar({
  dict,
  session,
  pluginNav,
  appName,
  permissions,
  ...props
}: AppSidebarProps) {
  const { state } = useSidebar();
  const isExpanded = state === "expanded";

  const allNavItems = [
    getDashboardMenuItem({ title: dict?.dashboard || "Dashboard" }),
    getCrmMenuItem({ localizations: dict.crm, role: session?.user?.role ?? undefined }),
    getCampaignsMenuItem({
      localizations: {
        title: "Email marketing",
        campaigns: "All Campaigns",
        templates: "Templates",
        targets: "Targets",
        targetLists: "Target Lists",
      },
    }),
    getProjectsMenuItem({ title: dict?.projects || "Projects" }),
    getEmailsMenuItem({ title: dict?.emails || "Emails" }),
    getChatMenuItem({ title: dict?.chat || "Team chat" }),
    getScheduleMenuItem({ title: "Schedule" }),
    getReportsMenuItem({ title: dict?.reports || "Reports" }),
    getDocumentsMenuItem({ title: dict?.documents || "Documents" }),
    getInvoicesMenuItem({ title: dict?.invoices || "Invoices" }),
  ];
  const navItems = filterNavByPermissions(allNavItems, permissions);

  if (pluginNav?.length) {
    navItems.push({ title: dict?.plugins || "Plugins", icon: Puzzle, items: pluginNav });
  }

  // Administration: admin users only
  if (session?.user?.role === "admin") {
    navItems.push(
      getAdministrationMenuItem({ title: dict?.settings || "Administration" }),
    );
  }

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-sidebar-border/70 bg-sidebar/95 backdrop-blur-md"
      {...props}
    >
      {/* Header with Logo and Branding */}
      <SidebarHeader>
        <div
          className={cn(
            "flex items-center py-1",
            isExpanded ? "gap-x-4" : "justify-center",
          )}
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 ring-1 ring-primary/20 shadow-sm">
            {/* The logo is served from the supplied branded asset URL. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={HCTPL_LOGO_URL}
              alt="HCTPL"
              className="h-full w-full object-contain"
            />
          </div>

          <div
            className={cn(
              "origin-left overflow-hidden whitespace-nowrap transition-all",
              !isExpanded ? "w-0 opacity-0" : "w-auto opacity-100",
            )}
          >
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Workspace
            </p>
            <h1 className="text-base font-semibold tracking-tight text-foreground">{appName}</h1>
          </div>
        </div>
      </SidebarHeader>

      {/* Main Content - Navigation */}
      <SidebarContent>
        {/* NavMain component with all enabled module navigation items */}
        <NavMain items={navItems} dict={dict} />
      </SidebarContent>

      <SidebarFooter>
        <p className="px-2 pb-1 text-center text-[10px] text-muted-foreground">
          Profile & settings are in the top bar
        </p>
      </SidebarFooter>

      {/* Rail for toggling sidebar on desktop */}
      <SidebarRail />
    </Sidebar>
  );
}
