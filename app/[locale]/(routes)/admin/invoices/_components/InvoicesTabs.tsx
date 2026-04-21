"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { label: "Settings", href: "/admin/invoices/settings" },
  { label: "Series", href: "/admin/invoices/series" },
  { label: "Tax Rates", href: "/admin/invoices/tax-rates" },
];

export function InvoicesTabs() {
  const pathname = usePathname();

  return (
    <div className="border-b">
      <nav className="flex gap-1 -mb-px" aria-label="Invoice sections">
        {tabs.map(({ label, href }) => {
          const isActive = pathname.endsWith(href) || pathname.includes(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                isActive
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted"
              )}
            >
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
