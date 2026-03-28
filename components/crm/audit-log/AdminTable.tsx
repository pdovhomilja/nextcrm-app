"use client";
import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";

interface AuditEntry {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  changes: unknown;
  createdAt: Date;
  user: { name: string | null } | null;
}

interface AdminTableProps {
  entries: AuditEntry[];
  total: number;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onRestore?: (entityType: string, entityId: string) => void;
  isAdmin?: boolean;
}

export function AuditAdminTable({
  entries,
  total,
  page,
  totalPages,
  onPageChange,
  onRestore,
  isAdmin,
}: AdminTableProps) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{total} total entries</p>
      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-2 text-left font-medium">Entity</th>
              <th className="px-4 py-2 text-left font-medium">Action</th>
              <th className="px-4 py-2 text-left font-medium">User</th>
              <th className="px-4 py-2 text-left font-medium">Date</th>
              {isAdmin && (
                <th className="px-4 py-2 text-left font-medium">Actions</th>
              )}
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <React.Fragment key={entry.id}>
                <tr
                  className="border-b cursor-pointer hover:bg-muted/30"
                  onClick={() =>
                    setExpanded(expanded === entry.id ? null : entry.id)
                  }
                >
                  <td className="px-4 py-2 capitalize">{entry.entityType}</td>
                  <td className="px-4 py-2">
                    <Badge
                      variant={
                        entry.action === "deleted" ? "destructive" : "secondary"
                      }
                    >
                      {entry.action}
                    </Badge>
                  </td>
                  <td className="px-4 py-2">{entry.user?.name ?? "System"}</td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {formatDistanceToNow(new Date(entry.createdAt), {
                      addSuffix: true,
                    })}
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-2">
                      {entry.action === "deleted" && onRestore && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRestore(entry.entityType, entry.entityId);
                          }}
                        >
                          Restore
                        </Button>
                      )}
                    </td>
                  )}
                </tr>
                {expanded === entry.id && entry.changes != null ? (
                  <tr className="bg-muted/20">
                    <td colSpan={isAdmin ? 5 : 4} className="px-4 py-2">
                      <pre className="text-xs overflow-auto">
                        {JSON.stringify(entry.changes, null, 2)}
                      </pre>
                    </td>
                  </tr>
                ) : null}
              </React.Fragment>
            ))}
            {entries.length === 0 && (
              <tr>
                <td
                  colSpan={isAdmin ? 5 : 4}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  No audit entries found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </Button>
        <span className="text-sm text-muted-foreground">
          Page {page} of {totalPages}
        </span>
        <Button
          size="sm"
          variant="outline"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
