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
  isCollapsed: boolean;
  links: {
    title: string;
    label?: string;
    icon: LucideIcon;
    variant: "default" | "ghost";
    href: string;
  }[];
}

export function Nav({ links, isCollapsed }: NavProps) {
  return (
    <nav className="flex flex-col gap-0.5 px-2 py-2">
      {links.map((link) => {
        const active = link.variant === "default";
        const inner = (
          <Link
            href={link.href}
            className={cn(
              "group flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-medium transition-all",
              active
                ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
              isCollapsed && "justify-center px-2"
            )}
          >
            <link.icon className={cn("h-4 w-4 shrink-0", active && "opacity-95")} />
            {!isCollapsed && <span className="truncate">{link.title}</span>}
            {!isCollapsed && link.label && (
              <span
                className={cn(
                  "ml-auto rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
                  active ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"
                )}
              >
                {link.label}
              </span>
            )}
          </Link>
        );

        if (isCollapsed) {
          return (
            <Tooltip key={link.title} delayDuration={0}>
              <TooltipTrigger asChild>{inner}</TooltipTrigger>
              <TooltipContent side="right" className="flex items-center gap-2">
                {link.title}
                {link.label && (
                  <span className="text-muted-foreground">{link.label}</span>
                )}
              </TooltipContent>
            </Tooltip>
          );
        }

        return <div key={link.title}>{inner}</div>;
      })}
    </nav>
  );
}
