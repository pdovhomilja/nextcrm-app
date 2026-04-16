import { Receipt } from "lucide-react"
import { NavItem } from "../nav-main"

interface GetInvoicesMenuItemProps {
  title: string
}

export default function getInvoicesMenuItem({
  title,
}: GetInvoicesMenuItemProps): NavItem {
  return {
    title,
    url: "/invoices",
    icon: Receipt,
  }
}
