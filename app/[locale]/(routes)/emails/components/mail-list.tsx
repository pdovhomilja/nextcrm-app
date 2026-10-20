"use client";

import { useRef } from "react";
import { formatDistanceToNow } from "date-fns";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";
import { primeEmailDetail } from "@/lib/email/client-email-cache";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { MAILBOX_PAGE_SIZE } from "@/lib/email/mailbox-constants";
import type { Mail } from "@/app/[locale]/(routes)/emails/data";
import { useMail } from "@/app/[locale]/(routes)/emails/use-mail";
import { setEmailStarred } from "@/actions/emails/mailbox-actions";

interface MailListProps {
  items: Mail[];
  page: number;
  totalPages: number;
  total: number;
  selectedIds: string[];
  onSelectedIdsChange: (ids: string[]) => void;
}

export function MailList({
  items,
  page,
  totalPages,
  total,
  selectedIds,
  onSelectedIdsChange,
}: MailListProps) {
  const [mail, setMail] = useMail();
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefetchedIds = useRef(new Set<string>());

  function prefetchMessage(id: string) {
    if (prefetchedIds.current.has(id)) return;
    prefetchedIds.current.add(id);
    primeEmailDetail(id);
  }

  const safeTotalPages = Math.max(totalPages, total > 0 ? 1 : 0);
  const rangeStart = total === 0 ? 0 : (page - 1) * MAILBOX_PAGE_SIZE + 1;
  const rangeEnd = total === 0 ? 0 : Math.min(page * MAILBOX_PAGE_SIZE, total);

  function navigate(toPage: number) {
    const p = new URLSearchParams(searchParams.toString());
    p.set("page", String(toPage));
    router.push(`?${p.toString()}`);
  }

  function toggleRow(id: string) {
    onSelectedIdsChange(
      selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]
    );
  }

  async function toggleStar(e: React.MouseEvent, item: Mail) {
    e.stopPropagation();
    const next = !item.isStarred;
    await setEmailStarred(item.id, next);
    router.refresh();
  }

  return (
    <div className="grid h-full min-h-0 grid-rows-[minmax(0,1fr)_auto] overflow-hidden">
      <div className="min-h-0 overflow-y-auto overscroll-contain">
        <div className="flex flex-col gap-0.5 p-2 pr-3">
          {items.length === 0 && (
            <p className="px-2 py-8 text-center text-sm text-muted-foreground">No messages</p>
          )}
          {items.map((item) => (
            <div
              key={item.id}
              role="button"
              tabIndex={0}
              className={cn(
                "flex gap-2 rounded-lg border border-transparent px-2.5 py-2.5 text-left text-sm transition-colors hover:bg-muted/50",
                mail.selected === item.id && "border-primary/20 bg-primary/[0.07] shadow-sm",
                !item.isRead && mail.selected !== item.id && "bg-background/80 font-medium"
              )}
              onClick={() => setMail({ ...mail, selected: item.id })}
              onMouseEnter={() => prefetchMessage(item.id)}
              onFocus={() => prefetchMessage(item.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter") setMail({ ...mail, selected: item.id });
              }}
            >
              <Checkbox
                checked={selectedIds.includes(item.id)}
                onCheckedChange={() => toggleRow(item.id)}
                onClick={(e) => e.stopPropagation()}
                className="mt-1 shrink-0"
                aria-label={`Select ${item.subject ?? "message"}`}
              />
              <button
                type="button"
                className="mt-0.5 shrink-0 text-muted-foreground hover:text-amber-500"
                onClick={(e) => toggleStar(e, item)}
                aria-label={item.isStarred ? "Unstar" : "Star"}
              >
                <Star
                  className={cn("h-4 w-4", item.isStarred && "fill-amber-400 text-amber-500")}
                />
              </button>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <div className="truncate font-semibold">
                    {item.fromName ?? item.fromEmail ?? "Unknown"}
                  </div>
                  {!item.isRead && <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />}
                  <div className="ml-auto shrink-0 text-xs text-muted-foreground">
                    {item.sentAt
                      ? formatDistanceToNow(new Date(item.sentAt), { addSuffix: true })
                      : ""}
                  </div>
                </div>
                <div
                  className={cn(
                    "line-clamp-2 text-xs leading-snug text-muted-foreground break-words",
                    !item.isRead && "font-medium text-foreground/90"
                  )}
                >
                  {item.subject ?? "(no subject)"}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex shrink-0 items-center justify-between gap-2 border-t border-border/40 bg-background px-3 py-2 shadow-[0_-1px_0_0_hsl(var(--border)/0.4)]">
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1 px-2 text-xs"
          disabled={page <= 1 || total === 0}
          onClick={() => navigate(page - 1)}
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Prev
        </Button>
        <div className="min-w-0 text-center text-[11px] leading-tight text-muted-foreground">
          <div className="font-medium text-foreground/90">
            {total === 0 ? "0 messages" : `${rangeStart}–${rangeEnd} of ${total}`}
          </div>
          {safeTotalPages > 1 && (
            <div>
              Page {page} / {safeTotalPages}
            </div>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1 px-2 text-xs"
          disabled={page >= safeTotalPages || total === 0}
          onClick={() => navigate(page + 1)}
        >
          Next
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
