"use client";

import * as React from "react";
import {
  IconDashboard,
  IconFolder,
  IconHelp,
  IconInnerShadowTop,
  IconSettings,
  IconRobot,
  IconList,
} from "@tabler/icons-react";

import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { User } from "@/lib/generated/prisma";
import { useParams } from "next/navigation";
import { NavSecondary } from "./nav-secondary";
import {
  CompanySwitcher,
  CompanySwitcherCompact,
} from "@/components/company-switcher";
import { useActiveCompany } from "@/components/company-provider";
import packageJson from "../package.json";

export function AppSidebar({
  user,
  ...props
}: React.ComponentProps<typeof Sidebar> & { user: User | null }) {
  const { cid } = useParams();
  const { activeCompanyId } = useActiveCompany();

  // Use activeCompanyId from context if available, fallback to URL params
  const companyId = activeCompanyId || cid;

  const data = {
    navMain: [
      {
        title: "Dashboard",
        url: `/${companyId}/dashboard`,
        icon: IconDashboard,
      },
      {
        title: "Boards",
        url: `/${companyId}/tasks`,
        icon: IconFolder,
      },
      {
        title: "Tasks List",
        url: `/${companyId}/tasks-list`,
        icon: IconList,
      },
      {
        title: "AI Assistant",
        url: `/${companyId}/ai-assistant`,
        icon: IconRobot,
      },
      {
        title: "AI Assistant V2",
        url: `/${companyId}/ai-assistant-v2`,
        icon: IconRobot,
      },
      {
        title: "Suggestions",
        url: `/${companyId}/suggestions`,
        icon: IconList,
      },
    ],

    navSecondary: [
      {
        title: "Settings",
        url: `/${companyId}/settings`,
        icon: IconSettings,
      },
      {
        title: "Get Help",
        url: `/${companyId}/docs`,
        icon: IconHelp,
      },
    ],
  };

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <a href="#">
                <IconInnerShadowTop className="!size-5" />
                <span className="text-base font-semibold">TaskHQ</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <CompanySwitcher />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user as User} />
        <span className="text-xs text-muted-foreground ml-auto">
          {/* get version from package.json */}
          <span className="text-xs text-muted-foreground ml-auto">
            v{packageJson.version}
          </span>
        </span>
      </SidebarFooter>
    </Sidebar>
  );
}
