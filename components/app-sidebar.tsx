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

export function AppSidebar({
  user,
  ...props
}: React.ComponentProps<typeof Sidebar> & { user: User | null }) {
  const { cid } = useParams();
  const data = {
    navMain: [
      {
        title: "Dashboard",
        url: `/${cid}/dashboard`,
        icon: IconDashboard,
      },
      {
        title: "Tasks",
        url: `/${cid}/tasks`,
        icon: IconFolder,
      },
      {
        title: "Tasks List",
        url: `/${cid}/tasks-list`,
        icon: IconList,
      },
      {
        title: "AI Assistant",
        url: `/${cid}/ai-assistant`,
        icon: IconRobot,
      },
      {
        title: "AI Assistant V2",
        url: `/${cid}/ai-assistant-v2`,
        icon: IconRobot,
      },
    ],

    navSecondary: [
      {
        title: "Settings",
        url: `/${cid}/settings`,
        icon: IconSettings,
      },
      {
        title: "Get Help",
        url: `/${cid}/docs`,
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
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user as User} />
      </SidebarFooter>
    </Sidebar>
  );
}
