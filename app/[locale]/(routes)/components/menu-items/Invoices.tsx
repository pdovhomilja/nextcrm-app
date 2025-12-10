import { FileCheck } from "lucide-react"
import { NavItem } from "../nav-main"

/**
 * Invoices Module Menu Item - Task 2.6.3
 *
 * Converted from Link pattern to NavItem structure for sidebar integration.
 * Used in app-sidebar.tsx with module filtering (name === "invoice").
 *
 * References:
 * - Previous: Simple Link component with FileCheck icon
 * - ModuleMenu.tsx: lines 91-95
 * - Route: /invoice
 */

interface GetInvoicesMenuItemProps {
  title: string
}

/**
 * Returns navigation item configuration for Invoices module
 * @param title - Localized title for the menu item
 * @returns NavItem object compatible with NavMain component
 */
export default function getInvoicesMenuItem({
  title,
}: GetInvoicesMenuItemProps): NavItem {
  return {
    title,
    url: "/invoice",
    icon: FileCheck,
  }
}
