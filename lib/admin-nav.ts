import type { LucideIcon } from "lucide-react";
import {
  ArrowLeftRight,
  CalendarClock,
  ClipboardList,
  Coins,
  FileText,
  Key,
  Linkedin,
  Mail,
  Puzzle,
  Settings,
  ShieldCheck,
  ShoppingCart,
  SlidersHorizontal,
  Tags,
  Users,
} from "lucide-react";

export type AdminNavItem = {
  title: string;
  url: string;
  icon: LucideIcon;
};

/** Single source for admin links (main sidebar + admin pages). */
export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { title: "LLM Keys", url: "/admin/llm-keys", icon: Key },
  { title: "Email mailboxes", url: "/admin/email-accounts", icon: Mail },
  { title: "Users", url: "/admin/users", icon: Users },
  { title: "Permissions", url: "/admin/permissions", icon: ShieldCheck },
  { title: "Services", url: "/admin/services", icon: Settings },
  { title: "CRM Settings", url: "/admin/crm-settings", icon: SlidersHorizontal },
  { title: "Funnel Settings", url: "/admin/funnel-settings", icon: SlidersHorizontal },
  { title: "Calendar Settings", url: "/admin/calendar-settings", icon: CalendarClock },
  { title: "LinkedIn", url: "/admin/linkedin", icon: Linkedin },
  { title: "Audit Log", url: "/admin/audit-log", icon: ClipboardList },
  { title: "Currencies", url: "/admin/currencies", icon: Coins },
  { title: "Pricing", url: "/admin/pricing", icon: Tags },
  { title: "Orders", url: "/admin/orders", icon: ShoppingCart },
  { title: "Invoices", url: "/admin/invoices", icon: FileText },
  { title: "Import & Export", url: "/admin/data-transfer", icon: ArrowLeftRight },
  { title: "Plugins", url: "/admin/plugins", icon: Puzzle },
];
