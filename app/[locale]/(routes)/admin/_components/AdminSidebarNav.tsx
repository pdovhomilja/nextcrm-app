"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Key, Users, Settings } from "lucide-react";

const navItems = [
  { label: "LLM Keys", href: "/admin/llm-keys", icon: Key },
  { label: "Users", href: "/admin/users", icon: Users },
  { label: "Services", href: "/admin/services", icon: Settings },
];

export function AdminSidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      <p className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        Admin
      </p>
      {navItems.map(({ label, href, icon: Icon }) => {
        const isActive = pathname.includes(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
