"use client";

import Link from "next/link";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  unreadCount?: number;
};

export function HeaderMailButton({ unreadCount = 0 }: Props) {
  const showBadge = unreadCount > 0;
  const label = showBadge ? `${unreadCount} unread emails` : "Open inbox";

  return (
    <Button
      variant="ghost"
      size="icon"
      className="header-icon-btn relative"
      asChild
    >
      <Link href="/emails" aria-label={label} title={label}>
        <Mail className="h-[1.15rem] w-[1.15rem]" />
        {showBadge && (
          <>
            <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-destructive ring-2 ring-background sm:hidden" />
            <span
              className={cn(
                "absolute -right-0.5 -top-0.5 hidden h-4 min-w-4 items-center justify-center rounded-full sm:flex",
                "bg-destructive px-1 text-[10px] font-semibold leading-none text-destructive-foreground shadow-sm"
              )}
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          </>
        )}
      </Link>
    </Button>
  );
}
