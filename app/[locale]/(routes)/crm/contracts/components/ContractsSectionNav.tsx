"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export type ContractsSection = "contracts" | "purchases" | "quotations" | "invoices";

interface ContractsSectionNavProps {
  activeSection?: string;
}

export function ContractsSectionNav({ activeSection }: ContractsSectionNavProps) {
  const t = useTranslations("CrmPage.contracts");
  const pathname = usePathname();
  
  const validSections: ContractsSection[] = ["contracts", "purchases", "quotations", "invoices"];
  const current: ContractsSection =
    activeSection && validSections.includes(activeSection as ContractsSection)
      ? (activeSection as ContractsSection)
      : "contracts";

  const navItems: { key: ContractsSection; label: string; href: string }[] = [
    {
      key: "contracts",
      label: t("viewTitle") || "Contracts",
      href: `${pathname}?section=contracts`,
    },
    {
      key: "purchases",
      label: "Purchases",
      href: `${pathname}?section=purchases`,
    },
    {
      key: "quotations",
      label: "Quotations",
      href: `${pathname}?section=quotations`,
    },
    {
      key: "invoices",
      label: "Invoices",
      href: `${pathname}?section=invoices`,
    },
  ];

  return (
    <div className="flex items-center gap-2 mb-4 overflow-x-auto max-w-full pb-1" role="tablist" aria-label="Contracts section navigation">
      <div className="inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground">
        {navItems.map((item) => {
          const isActive = current === item.key;
          return (
            <Link
              key={item.key}
              href={item.href}
              scroll={false}
              role="tab"
              aria-selected={isActive}
              data-state={isActive ? "active" : "inactive"}
              className={cn(
                "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
                isActive
                  ? "bg-background text-foreground shadow-sm font-semibold"
                  : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
