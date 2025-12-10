import { FileEdit } from "lucide-react"
import { NavItem } from "../nav-main"

/**
 * Databox Module Menu Item - Task 2.6.6
 *
 * Converted from Link pattern to NavItem structure for sidebar integration.
 * Used in app-sidebar.tsx with module filtering (name === "databox").
 *
 * References:
 * - Previous: Simple Link component with FileEdit icon
 * - ModuleMenu.tsx: lines 109-113
 * - Route: /databox
 */

interface GetDataboxMenuItemProps {
  title?: string
}

/**
 * Returns navigation item configuration for Databox module
 * @param title - Localized title for the menu item (defaults to "Databox")
 * @returns NavItem object compatible with NavMain component
 */
export default function getDataboxMenuItem({
  title = "Databox",
}: GetDataboxMenuItemProps): NavItem {
  return {
    title,
    url: "/databox",
    icon: FileEdit,
  }
}
