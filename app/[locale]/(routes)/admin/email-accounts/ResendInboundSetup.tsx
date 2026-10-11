"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Copy, Inbox, Link2, Webhook } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const STEPS = [
  {
    icon: Inbox,
    title: "Enable receiving",
    detail: "In Resend → Domains, turn on Receiving and add the MX records they provide.",
  },
  {
    icon: Webhook,
    title: "Add webhook",
    detail: 'Create a webhook for event email.received pointing to the URL below.',
  },
  {
    icon: Link2,
    title: "Save signing secret",
    detail: "Set RESEND_INBOUND_WEBHOOK_SECRET in Vercel (whsec_… from Resend).",
  },
] as const;

export function ResendInboundSetup({ webhookUrl }: { webhookUrl: string }) {
  const [copied, setCopied] = useState(false);

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(webhookUrl);
      setCopied(true);
      toast.success("Webhook URL copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy — select the URL manually");
    }
  }

  return (
    <Card className="overflow-hidden border-violet-500/20 bg-gradient-to-br from-violet-500/[0.07] via-card to-card shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-lg font-semibold tracking-tight">Inbound email (Resend)</CardTitle>
            <CardDescription className="mt-1.5 max-w-xl">
              Replies and new mail hit your CRM inbox automatically once DNS and the webhook are configured.
            </CardDescription>
          </div>
          <div className="hidden sm:flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-violet-600 dark:text-violet-400">
            <Inbox className="h-5 w-5" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <ol className="grid gap-3 sm:grid-cols-3">
          {STEPS.map(({ icon: Icon, title, detail }, i) => (
            <li
              key={title}
              className="relative rounded-lg border bg-background/80 p-3 shadow-sm"
            >
              <span className="mb-2 flex h-7 w-7 items-center justify-center rounded-md bg-muted text-xs font-bold text-muted-foreground">
                {i + 1}
              </span>
              <div className="flex items-center gap-2 font-medium text-sm">
                <Icon className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
                {title}
              </div>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{detail}</p>
            </li>
          ))}
        </ol>

        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Webhook URL</p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <code
              className={cn(
                "flex-1 break-all rounded-lg border bg-muted/50 px-3 py-2.5 text-xs font-mono leading-relaxed"
              )}
            >
              {webhookUrl}
            </code>
            <Button type="button" variant="secondary" size="sm" className="shrink-0 gap-2" onClick={copyUrl}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied" : "Copy URL"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Inbound mail is routed by <strong className="font-medium text-foreground">To</strong> address:
            messages to <strong className="font-medium text-foreground">dhoni@…</strong> go to Dhoni&apos;s
            inbox, <strong className="font-medium text-foreground">jay@…</strong> to Jay&apos;s — one Resend
            mailbox per work email.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
