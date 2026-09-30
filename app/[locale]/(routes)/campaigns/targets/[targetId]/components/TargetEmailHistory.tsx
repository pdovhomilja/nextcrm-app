import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { TargetEmailRow } from "@/actions/crm/targets/list-target-emails";

function statusVariant(
  status: string
): "default" | "secondary" | "destructive" | "outline" {
  if (status === "SENT") return "default";
  if (status === "FAILED") return "destructive";
  return "secondary"; // DRAFT / other
}

function fmt(d: Date | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Outreach-email history for a target (server-rendered, read-only). Shows every
 * send with its status + timestamp so it's clear whether/when the target was
 * emailed. Presentational — the caller supplies rows (newest first).
 */
export function TargetEmailHistory({ emails }: { emails: TargetEmailRow[] }) {
  const lastSent = emails.find((e) => e.status === "SENT")?.sent_at ?? null;

  return (
    <Card data-testid="target-email-history">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Outreach emails</CardTitle>
        <CardDescription>
          {emails.length === 0
            ? "No emails sent yet."
            : lastSent
              ? `Last emailed ${fmt(lastSent)} · ${emails.length} total`
              : `${emails.length} total`}
        </CardDescription>
      </CardHeader>
      {emails.length > 0 && (
        <CardContent>
          <ul className="divide-y">
            {emails.map((e) => (
              <li
                key={e.id}
                className="flex items-start justify-between gap-3 py-2 text-sm"
                data-testid="target-email-row"
              >
                <div className="min-w-0">
                  <div className="truncate font-medium">{e.subject}</div>
                  <div className="text-xs text-muted-foreground">
                    {fmt(e.sent_at ?? e.created_on)}
                    {e.included_homepage ? " · homepage included" : ""}
                    {e.status === "FAILED" && e.error_message
                      ? ` · ${e.error_message}`
                      : ""}
                  </div>
                </div>
                <Badge variant={statusVariant(e.status)}>{e.status}</Badge>
              </li>
            ))}
          </ul>
        </CardContent>
      )}
    </Card>
  );
}
