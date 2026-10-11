"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Bell, CheckCircle2, Mail, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { HeaderNotificationItem } from "@/actions/notifications/header-notifications";

type Props = {
  totalCount: number;
  items: HeaderNotificationItem[];
};

export function HeaderNotifications({ totalCount, items }: Props) {
  const showBadge = totalCount > 0;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="header-icon-btn relative"
          aria-label={showBadge ? `${totalCount} notifications` : "Notifications"}
        >
          <Bell className="h-[1.15rem] w-[1.15rem]" />
          {showBadge && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none text-destructive-foreground">
              {totalCount > 99 ? "99+" : totalCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(100vw-2rem,380px)] p-0">
        <div className="flex items-center justify-between px-4 py-3">
          <p className="text-sm font-semibold">Notifications</p>
          {showBadge && (
            <span className="text-xs text-muted-foreground">{totalCount} new</span>
          )}
        </div>
        <Separator />
        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
            <CheckCircle2 className="h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm font-medium">You&apos;re all caught up</p>
            <p className="text-xs text-muted-foreground">Unread mail and approvals show up here.</p>
          </div>
        ) : (
          <ScrollArea className="max-h-[min(60vh,420px)]">
            <ul className="flex flex-col p-2">
              {items.map((item) => (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-muted/70"
                    )}
                  >
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      {item.kind === "approval" ? (
                        <ShoppingCart className="h-4 w-4" />
                      ) : (
                        <Mail className="h-4 w-4" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-1 font-medium">{item.title}</span>
                      {item.description && (
                        <span className="line-clamp-1 text-xs text-muted-foreground">
                          {item.description}
                        </span>
                      )}
                      {item.sentAt && (
                        <span className="text-[11px] text-muted-foreground/80">
                          {formatDistanceToNow(new Date(item.sentAt), { addSuffix: true })}
                        </span>
                      )}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </ScrollArea>
        )}
        <Separator />
        <div className="grid grid-cols-2 gap-1 p-2">
          <Button variant="ghost" size="sm" className="justify-start text-xs" asChild>
            <Link href="/emails">Open inbox</Link>
          </Button>
          <Button variant="ghost" size="sm" className="justify-start text-xs" asChild>
            <Link href="/crm/approvals">Approvals</Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
