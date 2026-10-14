"use client";

import Link from "next/link";
import { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface NavProps {
  links: {
    title: string;
    label?: string;
    icon: LucideIcon;
    variant: "default" | "ghost";
    href: string;
  }[];
}

/** Icon-only mailbox nav for the fixed narrow sidebar. */
export function Nav({ links }: NavProps) {
  return (
    <nav className="flex flex-col gap-0.5 px-1.5 py-1.5">
      {links.map((link) => {
        const active = link.variant === "default";
        const inner = (
          <Link
            href={link.href}
            className={cn(
              "relative flex h-9 w-full items-center gap-2 rounded-lg px-2 transition-colors",
              "justify-center sm:justify-start",
              active
                ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            )}
          >
            <link.icon className="h-4 w-4 shrink-0" />
            <span className="hidden min-w-0 flex-1 truncate text-xs font-medium sm:inline">
              {link.title}
            </span>
            {link.label && (
              <span
                className={cn(
                  "min-w-[1.125rem] rounded-full px-1 text-[9px] font-bold leading-4 tabular-nums sm:ml-auto",
                  "absolute -right-0.5 -top-0.5 sm:static",
                  active ? "bg-primary-foreground text-primary" : "bg-muted text-muted-foreground"
                )}
              >
                {link.label}
              </span>
            )}
          </Link>
        );

        return (
          <Tooltip key={link.title} delayDuration={0}>
            <TooltipTrigger asChild>{inner}</TooltipTrigger>
            <TooltipContent side="right" className="flex items-center gap-2 text-xs">
              {link.title}
              {link.label && (
                <span className="text-muted-foreground">{link.label}</span>
              )}
            </TooltipContent>
          </Tooltip>
        );
      })}
    </nav>
  );
}
