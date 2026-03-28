"use client";
import { useState, useTransition } from "react";
import { AuditEntry } from "./Entry";
import { getAuditLogByEntity } from "@/actions/crm/audit-log/get-audit-log-by-entity";
import { Button } from "@/components/ui/button";

type AuditLogEntry = Awaited<ReturnType<typeof getAuditLogByEntity>>["data"][number];

interface TimelineProps {
  entityType: string;
  entityId: string;
  initialData: Awaited<ReturnType<typeof getAuditLogByEntity>>;
  isAdmin?: boolean;
  onRestore?: (entryId: string) => void;
}

export function AuditTimeline({ entityType, entityId, initialData, isAdmin, onRestore }: TimelineProps) {
  const [entries, setEntries] = useState<AuditLogEntry[]>(initialData.data);
  const [cursor, setCursor] = useState<string | null>(initialData.nextCursor);
  const [isPending, startTransition] = useTransition();

  const loadMore = () => {
    startTransition(async () => {
      const result = await getAuditLogByEntity(entityType, entityId, cursor ?? undefined);
      setEntries((prev) => [...prev, ...result.data]);
      setCursor(result.nextCursor);
    });
  };

  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground py-4">No history yet.</p>;
  }

  return (
    <div>
      <div className="divide-y">
        {entries.map((entry) => (
          <AuditEntry
            key={entry.id}
            entry={entry as any}
            showRestore={isAdmin}
            onRestore={onRestore ? () => onRestore(entry.id) : undefined}
          />
        ))}
      </div>
      {cursor && (
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 w-full"
          onClick={loadMore}
          disabled={isPending}
        >
          {isPending ? "Loading..." : "Load more"}
        </Button>
      )}
    </div>
  );
}
