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
      className="relative h-9 w-9 rounded-full text-muted-foreground hover:text-foreground"
      asChild
    >
      <Link href="/emails" aria-label={label} title={label}>
        <Mail className="h-[1.15rem] w-[1.15rem]" />
        {showBadge && (
          <span
            className={cn(
              "absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full",
              "bg-primary px-1 text-[10px] font-semibold leading-none text-primary-foreground shadow-sm"
            )}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </Link>
    </Button>
  );
}
