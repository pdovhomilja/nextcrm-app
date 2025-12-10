import { FileText } from "lucide-react"
import { NavItem } from "../nav-main"

/**
 * Documents Module Menu Item - Task 2.6.5
 *
 * Converted from Link pattern to NavItem structure for sidebar integration.
 * Used in app-sidebar.tsx with module filtering (name === "documents").
 *
 * References:
 * - Previous: Simple Link component with FileText icon
 * - ModuleMenu.tsx: lines 101-108
 * - Route: /documents
 */

interface GetDocumentsMenuItemProps {
  title: string
}

/**
 * Returns navigation item configuration for Documents module
 * @param title - Localized title for the menu item
 * @returns NavItem object compatible with NavMain component
 */
export default function getDocumentsMenuItem({
  title,
}: GetDocumentsMenuItemProps): NavItem {
  return {
    title,
    url: "/documents",
    icon: FileText,
  }
}
