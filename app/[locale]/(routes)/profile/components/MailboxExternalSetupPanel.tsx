"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Copy, Eye, EyeOff, ExternalLink, Server } from "lucide-react";
import { EmailSendProvider } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  getMailboxExternalSetup,
  revealMailboxSmtpPassword,
} from "@/actions/emails/mailbox-external-setup";
import type { MailboxExternalSetupPublic } from "@/lib/email/mailbox-external-setup";
import { RESEND_SMTP } from "@/lib/email/mailbox-external-setup";

type Props = {
  accountId: string;
  sendProvider: EmailSendProvider;
  initialOpen?: boolean;
};

function CopyRow({ label, value }: { label: string; value: string }) {
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`Copied ${label}`);
    } catch {
      toast.error("Copy failed");
    }
  }

  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="truncate font-mono text-sm">{value}</p>
      </div>
      <Button type="button" variant="outline" size="sm" className="shrink-0 gap-1" onClick={copy}>
        <Copy className="h-3.5 w-3.5" />
        Copy
      </Button>
    </div>
  );
}

export function MailboxExternalSetupPanel({ accountId, sendProvider, initialOpen = false }: Props) {
  const [open, setOpen] = useState(initialOpen);
  const [setup, setSetup] = useState<MailboxExternalSetupPublic | null>(null);
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [revealing, setRevealing] = useState(false);

  async function loadSetup() {
    if (setup) {
      setOpen((v) => !v);
      return;
    }
    setLoading(true);
    const result = await getMailboxExternalSetup(accountId);
    setLoading(false);
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    setSetup(result);
    setOpen(true);
  }

  async function handleRevealPassword() {
    if (password) {
      setShowPassword((v) => !v);
      return;
    }
    setRevealing(true);
    const result = await revealMailboxSmtpPassword(accountId);
    setRevealing(false);
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    setPassword(result.password);
    setShowPassword(true);
  }

  const isResend = sendProvider === EmailSendProvider.RESEND;

  return (
    <div className="border-t pt-3">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 gap-2 px-0 text-primary hover:bg-transparent"
        onClick={loadSetup}
        disabled={loading}
      >
        <Server className="h-4 w-4" />
        {loading ? "Loading…" : open ? "Hide SMTP / setup for other apps" : "Use in Outlook, Gmail app, etc."}
      </Button>

      {open && setup && (
        <Card className="mt-3 border-dashed bg-muted/20 shadow-none">
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-base">Outgoing mail (SMTP)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pb-4 text-sm">
            {isResend && (
              <Alert>
                <AlertDescription className="text-xs leading-relaxed">
                  This mailbox sends through <strong>Resend</strong>. Use the SMTP relay below with your{" "}
                  <strong>From address</strong> as the sender. The SMTP password is your organization&apos;s Resend
                  API key (same key the CRM uses). Keep it private.
                </AlertDescription>
              </Alert>
            )}

            <CopyRow label="Email address (From)" value={setup.fromEmail} />
            {setup.fromName && <CopyRow label="Display name" value={setup.fromName} />}
            <CopyRow label="SMTP server" value={setup.outbound.host} />
            <CopyRow
              label="SMTP port (SSL/TLS)"
              value={String(setup.outbound.port)}
            />
            {isResend && (
              <CopyRow
                label="Alternate port (STARTTLS)"
                value={String(RESEND_SMTP.portStartTls)}
              />
            )}
            <CopyRow label="SMTP username" value={setup.outbound.username} />
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground">SMTP password</p>
                <p className="font-mono text-sm">
                  {showPassword && password ? password : "••••••••••••••••"}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0 gap-1"
                onClick={handleRevealPassword}
                disabled={revealing}
              >
                {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                {revealing ? "Loading…" : showPassword ? "Hide" : "Show password"}
              </Button>
            </div>

            <div className="space-y-2 rounded-lg border bg-background/80 p-3 text-xs text-muted-foreground">
              <p className="font-medium text-foreground">Quick setup</p>
              <ol className="list-decimal space-y-1 pl-4">
                <li>Open your mail app → Add account → Manual / Advanced setup.</li>
                <li>Choose <strong>IMAP</strong> only if inbound settings are listed below; otherwise SMTP-only is fine for sending.</li>
                <li>Outgoing (SMTP): use the server, port, username, and password above.</li>
                <li>
                  Set the outgoing <strong>From</strong> address to{" "}
                  <span className="font-mono text-foreground">{setup.fromEmail}</span>.
                </li>
                {isResend && (
                  <li>
                    If SSL on port 465 fails, try port {RESEND_SMTP.portStartTls} with STARTTLS.
                  </li>
                )}
              </ol>
              {isResend && (
                <a
                  href="https://resend.com/docs/send-with-smtp"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline"
                >
                  Resend SMTP documentation
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-foreground">Receiving mail</p>
              <p className="text-xs text-muted-foreground">{setup.inbound.note}</p>
              {setup.inbound.supported && setup.inbound.imapHost && (
                <div className="space-y-2 rounded-lg border p-3">
                  <CopyRow label="IMAP server" value={setup.inbound.imapHost} />
                  <CopyRow label="IMAP port" value={String(setup.inbound.imapPort ?? 993)} />
                  <CopyRow
                    label="IMAP security"
                    value={setup.inbound.imapSsl ? "SSL/TLS" : "None / STARTTLS"}
                  />
                  <CopyRow label="IMAP username" value={setup.fromEmail} />
                  <p className="text-xs text-muted-foreground">
                    IMAP password is the same as your SMTP password (Show password above).
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
