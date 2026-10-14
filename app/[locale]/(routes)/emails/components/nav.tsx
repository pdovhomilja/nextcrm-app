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
              "relative flex h-9 w-full items-center justify-center rounded-lg transition-colors",
              active
                ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            )}
          >
            <link.icon className="h-4 w-4 shrink-0" />
            {link.label && (
              <span
                className={cn(
                  "absolute -right-0.5 -top-0.5 min-w-[1rem] rounded-full px-1 text-[9px] font-bold leading-4 tabular-nums",
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
