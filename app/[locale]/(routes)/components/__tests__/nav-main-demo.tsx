"use client"

/**
 * Demo/Test component for NavMain
 *
 * This is a simple test to verify the nav-main component renders correctly
 * with sample data. Can be used for visual testing during development.
 */

import { NavMain, type NavItem } from "../nav-main"
import { Home, Coins, FolderKanban, Mail } from "lucide-react"

export function NavMainDemo() {
  const sampleItems: NavItem[] = [
    {
      title: "Dashboard",
      url: "/",
      icon: Home,
    },
    {
      title: "CRM",
      url: "/crm",
      icon: Coins,
      items: [
        { title: "Dashboard", url: "/crm/dashboard" },
        { title: "My Dashboard", url: "/crm/dashboard/user" },
        { title: "Overview", url: "/crm" },
        { title: "Accounts", url: "/crm/accounts" },
        { title: "Contacts", url: "/crm/contacts" },
        { title: "Leads", url: "/crm/leads" },
        { title: "Opportunities", url: "/crm/opportunities" },
        { title: "Contracts", url: "/crm/contracts" },
      ],
    },
    {
      title: "Projects",
      url: "/projects",
      icon: FolderKanban,
      items: [
        { title: "Boards", url: "/projects/boards" },
        { title: "Tasks", url: "/projects/tasks" },
      ],
    },
    {
      title: "Emails",
      url: "/emails",
      icon: Mail,
    },
  ]

  return <NavMain items={sampleItems} />
}
