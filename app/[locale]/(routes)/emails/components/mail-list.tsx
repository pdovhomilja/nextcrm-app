"use client";

import { formatDistanceToNow } from "date-fns";
import { useRouter, useSearchParams } from "next/navigation";
import { Star } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Mail } from "@/app/[locale]/(routes)/emails/data";
import { useMail } from "@/app/[locale]/(routes)/emails/use-mail";
import { setEmailStarred } from "@/actions/emails/mailbox-actions";

interface MailListProps {
  items: Mail[];
  page: number;
  totalPages: number;
  selectedIds: string[];
  onSelectedIdsChange: (ids: string[]) => void;
}

export function MailList({
  items,
  page,
  totalPages,
  selectedIds,
  onSelectedIdsChange,
}: MailListProps) {
  const [mail, setMail] = useMail();
  const router = useRouter();
  const searchParams = useSearchParams();

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
    <ScrollArea className="h-full min-h-0">
      <div className="flex flex-col gap-0.5 p-2 pb-3">
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
                  "truncate text-xs text-muted-foreground",
                  !item.isRead && "font-medium text-foreground/90"
                )}
              >
                {item.subject ?? "(no subject)"}
              </div>
            </div>
          </div>
        ))}
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t px-4 py-2">
          <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => navigate(page - 1)}>
            Previous
          </Button>
          <span className="text-xs text-muted-foreground">
            {page} / {totalPages}
          </span>
          <Button
            variant="ghost"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => navigate(page + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </ScrollArea>
  );
}
