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
}

/**
 * Returns navigation item configuration for Reports module
 * @param title - Localized title for the menu item
 * @returns NavItem object compatible with NavMain component
 */
export default function getReportsMenuItem({
  title,
}: GetReportsMenuItemProps): NavItem {
  return {
    title,
    url: "/reports",
    icon: FileBarChart,
  }
}
