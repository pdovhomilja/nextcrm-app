"use client";

import * as React from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { NavMain } from "./nav-main";
import { NavUser } from "./nav-user";
import getDashboardMenuItem from "./menu-items/Dashboard";
import getCrmMenuItem from "./menu-items/Crm";
import getProjectsMenuItem from "./menu-items/Projects";
import getEmailsMenuItem from "./menu-items/Emails";
import getEmployeesMenuItem from "./menu-items/Employees";
import getInvoicesMenuItem from "./menu-items/Invoices";
import getReportsMenuItem from "./menu-items/Reports";
import getDocumentsMenuItem from "./menu-items/Documents";
import getDataboxMenuItem from "./menu-items/Databoxes";
import getAdministrationMenuItem from "./menu-items/Administration";

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
 * - Task 2.6: Added remaining module navigation items (Employees, Invoices, Reports, Documents, Databox)
 * - Task 2.7: Added Administration menu with role-based visibility (is_admin check)
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

interface Module {
  id: string;
  name: string;
  enabled: boolean;
  position?: number;
}

interface User {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  isAdmin?: boolean;
  userStatus?: string;
  userLanguage?: string;
  lastLoginAt?: Date;
}

interface Session {
  user: User;
}

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  modules: Module[];
  dict: any;
  build: number;
  session: Session;
}

export function AppSidebar({
  modules,
  dict,
  build,
  session,
  ...props
}: AppSidebarProps) {
  const { state } = useSidebar();
  const [open, setOpen] = React.useState(true);
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  React.useEffect(() => {
    // Sync internal open state with sidebar state
    setOpen(state === "expanded");
  }, [state]);

  if (!isMounted) {
    return null;
  }

  // Build navigation items array
  const navItems = [];

  // Dashboard menu item (always visible)
  const dashboardItem = getDashboardMenuItem({
    title: dict?.dashboard || "Dashboard",
  });
  navItems.push(dashboardItem);

  // Task 2.3: CRM module navigation (with module filtering)
  // Only show if CRM module is enabled
  const crmModule = modules.find(
    (menuItem: any) => menuItem.name === "crm" && menuItem.enabled
  );
  if (crmModule && dict?.crm) {
    const crmItem = getCrmMenuItem({
      localizations: dict.crm,
    });
    navItems.push(crmItem);
  }

  // Task 2.4: Projects module navigation (with module filtering)
  // Only show if Projects module is enabled
  const projectsModule = modules.find(
    (menuItem: any) => menuItem.name === "projects" && menuItem.enabled
  );
  if (projectsModule && dict?.projects) {
    const projectsItem = getProjectsMenuItem({
      title: dict.projects,
    });
    navItems.push(projectsItem);
  }

  // Task 2.5: Emails module navigation (with module filtering)
  // Only show if Emails module is enabled
  const emailsModule = modules.find(
    (menuItem: any) => menuItem.name === "emails" && menuItem.enabled
  );
  if (emailsModule && dict?.emails) {
    const emailsItem = getEmailsMenuItem({
      title: dict.emails,
    });
    navItems.push(emailsItem);
  }

  // Task 2.6.2: Employees module navigation (with module filtering)
  // Only show if Employees module is enabled
  const employeesModule = modules.find(
    (menuItem: any) => menuItem.name === "employee" && menuItem.enabled
  );
  if (employeesModule) {
    const employeesItem = getEmployeesMenuItem({
      title: "Employees", // No translation in dict.ModuleMenu, using default
    });
    navItems.push(employeesItem);
  }

  // Task 2.6.3: Invoices module navigation (with module filtering)
  // Only show if Invoices module is enabled
  const invoicesModule = modules.find(
    (menuItem: any) => menuItem.name === "invoice" && menuItem.enabled
  );
  if (invoicesModule && dict?.invoices) {
    const invoicesItem = getInvoicesMenuItem({
      title: dict.invoices,
    });
    navItems.push(invoicesItem);
  }

  // Task 2.6.4: Reports module navigation (with module filtering)
  // Only show if Reports module is enabled
  const reportsModule = modules.find(
    (menuItem: any) => menuItem.name === "reports" && menuItem.enabled
  );
  if (reportsModule && dict?.reports) {
    const reportsItem = getReportsMenuItem({
      title: dict.reports,
    });
    navItems.push(reportsItem);
  }

  // Task 2.6.5: Documents module navigation (with module filtering)
  // Only show if Documents module is enabled
  const documentsModule = modules.find(
    (menuItem: any) => menuItem.name === "documents" && menuItem.enabled
  );
  if (documentsModule && dict?.documents) {
    const documentsItem = getDocumentsMenuItem({
      title: dict.documents,
    });
    navItems.push(documentsItem);
  }

  // Task 2.6.6: Databox module navigation (with module filtering)
  // Only show if Databox module is enabled
  const databoxModule = modules.find(
    (menuItem: any) => menuItem.name === "databox" && menuItem.enabled
  );
  if (databoxModule) {
    const databoxItem = getDataboxMenuItem({
      title: "Databoxes", // No translation in dict.ModuleMenu, using default
    });
    navItems.push(databoxItem);
  }

  // Task 2.7: Administration menu navigation (with role-based visibility)
  // Only show if user is an admin (session.user.isAdmin === true)
  if (session?.user?.isAdmin && dict?.settings) {
    const administrationItem = getAdministrationMenuItem({
      title: dict.settings,
    });
    navItems.push(administrationItem);
  }

  // Prepare user data for NavUser component
  const userData = {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    avatar: session.user.image,
  };

  return (
    <Sidebar collapsible="icon" {...props}>
      {/* Header with Logo and Branding */}
      <SidebarHeader>
        <div className="flex gap-x-4 items-center px-2">
          {/* "N" Branding Symbol with rotation animation */}
          {/* Task 5.3: Kept duration-500 for intentional brand emphasis effect */}
          <div
            className={cn(
              "cursor-pointer border rounded-full px-4 py-2 transition-transform duration-500",
              open && "rotate-[360deg]"
            )}
            onClick={() => setOpen(!open)}
          >
            N
          </div>

          {/* App Name - visible when expanded */}
          {/* Task 5.3: Removed duration-200, now uses Tailwind default (150ms) */}
          <h1
            className={cn(
              "origin-left font-medium text-xl transition-transform",
              !open && "scale-0"
            )}
          >
            {process.env.NEXT_PUBLIC_APP_NAME || "NextCRM"}
          </h1>
        </div>
      </SidebarHeader>

      {/* Main Content - Navigation */}
      <SidebarContent>
        {/* NavMain component with all enabled module navigation items */}
        <NavMain items={navItems} dict={dict} />
      </SidebarContent>

      {/* Footer with NavUser and Build Version */}
      <SidebarFooter>
        {/* Task 3.1: NavUser component with user profile and actions */}
        <NavUser user={userData} />

        {/* Build version display (when sidebar expanded) */}
        {/* Task 5.4: Changed text-gray-500 to text-muted-foreground for theme support */}
        <div
          className={cn("flex justify-center items-center w-full", {
            hidden: !open,
          })}
        >
          <span className="text-xs text-muted-foreground pb-2">
            build: 0.0.3-beta-{build}
          </span>
        </div>
      </SidebarFooter>

      {/* Rail for toggling sidebar on desktop */}
      <SidebarRail />
    </Sidebar>
  );
}
