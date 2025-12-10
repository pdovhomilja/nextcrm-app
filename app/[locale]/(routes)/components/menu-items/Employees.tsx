import { Users } from "lucide-react"
import { NavItem } from "../nav-main"

/**
 * Employees Module Menu Item - Task 2.6.2
 *
 * Converted from Link pattern to NavItem structure for sidebar integration.
 * Used in app-sidebar.tsx with module filtering (name === "employee").
 *
 * References:
 * - Previous: Simple Link component with Users icon
 * - ModuleMenu.tsx: lines 86-90
 * - Route: /employees
 */

interface GetEmployeesMenuItemProps {
  title?: string
}

/**
 * Returns navigation item configuration for Employees module
 * @param title - Localized title for the menu item (defaults to "Employees")
 * @returns NavItem object compatible with NavMain component
 */
export default function getEmployeesMenuItem({
  title = "Employees",
}: GetEmployeesMenuItemProps): NavItem {
  return {
    title,
    url: "/employees",
    icon: Users,
  }
}
