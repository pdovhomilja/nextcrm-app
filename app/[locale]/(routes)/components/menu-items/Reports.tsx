import { FileBarChart } from "lucide-react"
import { NavItem } from "../nav-main"

/**
 * Reports Module Menu Item - Task 2.6.4
 *
 * Converted from Link pattern to NavItem structure for sidebar integration.
 * Used in app-sidebar.tsx with module filtering (name === "reports").
 *
 * References:
 * - Previous: Simple Link component with FileBarChart icon
 * - ModuleMenu.tsx: lines 96-100
 * - Route: /reports
 */

interface GetReportsMenuItemProps {
  title: string
  localizations: {
    dashboard: string
    sales: string
    leads: string
    accounts: string
    activity: string
    campaigns: string
    users: string
  }
}

/**
 * Returns navigation item configuration for Reports module
 * @param title - Localized title for the menu item
 * @param localizations - Localized titles for the sub-items
 * @returns NavItem object compatible with NavMain component
 */
export default function getReportsMenuItem({
  title,
  localizations,
}: GetReportsMenuItemProps): NavItem {
  return {
    title,
    icon: FileBarChart,
    items: [
      { title: localizations.dashboard, url: "/reports", exact: true },
      { title: localizations.sales, url: "/reports/sales" },
      { title: localizations.leads, url: "/reports/leads" },
      { title: localizations.accounts, url: "/reports/accounts" },
      { title: localizations.activity, url: "/reports/activity" },
      { title: localizations.campaigns, url: "/reports/campaigns" },
      { title: localizations.users, url: "/reports/users" },
    ],
  }
}
