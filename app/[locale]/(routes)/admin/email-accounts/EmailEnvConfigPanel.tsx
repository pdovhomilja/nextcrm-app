import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getEmailEnvironmentStatus } from "@/lib/email/env-config";
import { CheckCircle2, Circle } from "lucide-react";
import { CopyButton } from "./EnvCopyButton";

export function EmailEnvConfigPanel() {
  const status = getEmailEnvironmentStatus();

  return (
    <Card className="border-dashed">
      <CardHeader>
        <CardTitle className="text-lg">Configuration (environment only)</CardTitle>
        <CardDescription>
          Set all mail settings in <strong>Vercel → Environment Variables</strong> or{" "}
          <code className="text-xs">.env.local</code>. Nothing here stores API keys — Admin is only
          for creating employee mailboxes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-wrap gap-2">
          <Badge variant={status.readyForSend ? "default" : "secondary"}>
            {status.readyForSend ? "Send ready" : "Send not configured"}
          </Badge>
          <Badge variant={status.readyForReceive ? "default" : "secondary"}>
            {status.readyForReceive ? "Receive ready" : "Receive not configured"}
          </Badge>
          <Badge variant="outline">Domain: {status.orgDomain}</Badge>
        </div>

        <ul className="space-y-2">
          {status.checks.map((check) => (
            <li key={check.key} className="flex items-start gap-2 text-sm">
              {check.configured ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              ) : (
                <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              )}
              <span>
                <code className="text-xs">{check.key}</code>
                <span className="text-muted-foreground"> — {check.label}</span>
              </span>
            </li>
          ))}
        </ul>

        <div className="space-y-2 rounded-lg border bg-muted/40 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Resend webhook URL (paste in Resend dashboard)
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <code className="flex-1 break-all text-xs">{status.webhookUrl}</code>
            <CopyButton text={status.webhookUrl} />
          </div>
          <p className="text-xs text-muted-foreground">
            Event: <code className="text-[10px]">email.received</code>. Secret →{" "}
            <code className="text-[10px]">RESEND_INBOUND_WEBHOOK_SECRET</code> in Vercel.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
