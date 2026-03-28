"use client";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const ACTION_LABELS: Record<string, string> = {
  created: "created",
  updated: "updated",
  deleted: "deleted",
  restored: "restored",
  relation_added: "linked",
  relation_removed: "unlinked",
};

const ACTION_VARIANTS: Record<string, "default" | "destructive" | "secondary" | "outline"> = {
  created: "default",
  updated: "secondary",
  deleted: "destructive",
  restored: "default",
  relation_added: "outline",
  relation_removed: "outline",
};

interface AuditChange {
  field: string;
  old: unknown;
  new: unknown;
}

interface EntryProps {
  entry: {
    id: string;
    action: string;
    changes: AuditChange[] | null;
    createdAt: Date;
    user: { name: string | null; avatar: string | null } | null;
  };
  showRestore?: boolean;
  onRestore?: () => void;
}

export function AuditEntry({ entry, showRestore, onRestore }: EntryProps) {
  const userName = entry.user?.name ?? "System";
  const initials = userName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div className="flex gap-3 py-3 border-b last:border-0">
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarImage src={entry.user?.avatar ?? undefined} />
        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm">{userName}</span>
          <Badge variant={ACTION_VARIANTS[entry.action] ?? "secondary"}>
            {ACTION_LABELS[entry.action] ?? entry.action}
          </Badge>
          <span className="text-xs text-muted-foreground ml-auto">
            {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}
          </span>
        </div>
        {entry.changes && entry.changes.length > 0 && (
          <div className="mt-1 space-y-0.5">
            {entry.changes.map((c: AuditChange, i: number) => (
              <div key={i} className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{c.field}:</span>{" "}
                <span className="line-through opacity-60">{String(c.old ?? "—")}</span>
                {" → "}
                <span>{String(c.new ?? "—")}</span>
              </div>
            ))}
          </div>
        )}
        {showRestore && entry.action === "deleted" && onRestore && (
          <Button size="sm" variant="outline" className="mt-2 h-7 text-xs" onClick={onRestore}>
            Restore
          </Button>
        )}
      </div>
    </div>
  );
}
