"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import {
  createEmailAccount,
  deleteEmailAccount,
  setEmailAccountActive,
  testEmailConnection,
  listImapFolders,
} from "@/actions/emails/accounts";
import type { getEmailAccounts } from "@/actions/emails/accounts";
import { triggerSync } from "@/actions/emails/sync";

type Account = Awaited<ReturnType<typeof getEmailAccounts>>[number];

export function EmailAccountsList({ accounts }: { accounts: Account[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [testing, setTesting] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [form, setForm] = useState({
    label: "",
    imapHost: "",
    imapPort: "993",
    imapSsl: true,
    smtpHost: "",
    smtpPort: "465",
    smtpSsl: true,
    username: "",
    password: "",
    sentFolderName: "Sent",
  });

  const [provider, setProvider] = useState<"gmail" | "generic">("generic");
  const [discovering, setDiscovering] = useState(false);
  const [folders, setFolders] = useState<string[]>([]);
  const [discoverError, setDiscoverError] = useState<string | null>(null);

  const refresh = () => router.refresh();

  function applyGmailPreset() {
    setProvider("gmail");
    setForm((f) => ({
      ...f,
      label: f.label || "Gmail",
      imapHost: "imap.gmail.com",
      imapPort: "993",
      imapSsl: true,
      smtpHost: "smtp.gmail.com",
      smtpPort: "465",
      smtpSsl: true,
      sentFolderName: "[Gmail]/Sent Mail",
    }));
  }

  async function handleDiscover() {
    setDiscovering(true);
    setDiscoverError(null);
    setFolders([]);
    const result = await listImapFolders({
      imapHost: form.imapHost,
      imapPort: Number(form.imapPort),
      imapSsl: form.imapSsl,
      username: form.username,
      password: form.password,
    });
    setDiscovering(false);
    if (!result.ok) {
      setDiscoverError(result.error ?? "Failed to list folders");
      return;
    }
    setFolders(result.folders);
  }

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    const result = await testEmailConnection({
      imapHost: form.imapHost,
      imapPort: Number(form.imapPort),
      imapSsl: form.imapSsl,
      username: form.username,
      password: form.password,
    });
    setTesting(false);
    setTestResult(result.ok ? "✓ Connection successful" : `✗ ${result.error}`);
  }

  async function handleCreate() {
    await createEmailAccount({
      ...form,
      imapPort: Number(form.imapPort),
      smtpPort: Number(form.smtpPort),
    });
    setOpen(false);
    refresh();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this email account and all synced emails?")) return;
    await deleteEmailAccount(id);
    refresh();
  }

  async function handleToggle(id: string, current: boolean) {
    await setEmailAccountActive(id, !current);
    refresh();
  }

  async function handleSync(id: string) {
    setSyncingId(id);
    try {
      await triggerSync(id);
      refresh();
    } finally {
      setSyncingId(null);
    }
  }

  return (
    <div className="space-y-3">
      {accounts.length === 0 && (
        <p className="text-sm text-muted-foreground">No email accounts connected.</p>
      )}
      {accounts.map((acc) => (
        <div
          key={acc.id}
          className="flex items-center justify-between rounded-md border border-border px-4 py-3"
        >
          <div className="space-y-0.5">
            <p className="text-sm font-medium">{acc.label}</p>
            <p className="text-xs text-muted-foreground">
              {acc.username} @ {acc.imapHost}
            </p>
            {acc.lastSyncedAt && (
              <p className="text-xs text-muted-foreground">
                Last synced: {new Date(acc.lastSyncedAt).toLocaleString()}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant={acc.isActive ? "default" : "secondary"}
              className="cursor-pointer"
              onClick={() => handleToggle(acc.id, acc.isActive)}
            >
              {acc.isActive ? "Active" : "Inactive"}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              disabled={syncingId === acc.id}
              onClick={() => handleSync(acc.id)}
            >
              <RefreshCw className="mr-1 h-3 w-3" />
              {syncingId === acc.id ? "Syncing…" : "Sync"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => handleDelete(acc.id)}
            >
              Delete
            </Button>
          </div>
        </div>
      ))}

      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) {
            setProvider("generic");
            setFolders([]);
            setDiscoverError(null);
          }
        }}
      >
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            Add Email Account
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {provider === "gmail" ? "Connect Gmail Account" : "Connect IMAP Account"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {/* Provider quick-select */}
            <div className="flex gap-2 pb-1">
              <Button
                type="button"
                variant={provider === "gmail" ? "default" : "outline"}
                size="sm"
                className="gap-1.5"
                onClick={applyGmailPreset}
              >
                <svg width="14" height="14" viewBox="0 0 48 48" aria-hidden="true">
                  <path fill="#EA4335" d="M24 9.5c3.2 0 5.9 1.1 8.1 2.9l6-6C34.5 3.1 29.6 1 24 1 14.8 1 7 6.7 3.7 14.7l7 5.4C12.4 14 17.7 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.4c-.5 2.8-2.1 5.2-4.5 6.8l7 5.4C42.9 37.1 46.1 31.3 46.1 24.5z"/>
                  <path fill="#FBBC05" d="M10.7 28.5A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.1.7-4.5l-7-5.4A23.5 23.5 0 0 0 .5 24c0 3.8.9 7.3 2.7 10.4l7-5.9z"/>
                  <path fill="#34A853" d="M24 46.5c5.6 0 10.3-1.8 13.7-5l-7-5.4c-1.9 1.2-4.2 2-6.7 2-6.3 0-11.6-4.5-13.3-10.5l-7 5.4C7 41.8 14.8 46.5 24 46.5z"/>
                </svg>
                Connect Gmail
              </Button>
              <Button
                type="button"
                variant={provider === "generic" ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setProvider("generic");
                  setFolders([]);
                  setDiscoverError(null);
                  setForm((f) => ({
                    ...f,
                    label: f.label === "Gmail" ? "" : f.label,
                    imapHost: f.imapHost === "imap.gmail.com" ? "" : f.imapHost,
                    smtpHost: f.smtpHost === "smtp.gmail.com" ? "" : f.smtpHost,
                    sentFolderName: f.sentFolderName === "[Gmail]/Sent Mail" ? "Sent" : f.sentFolderName,
                  }));
                }}
              >
                Other IMAP
              </Button>
            </div>

            {/* All fields except sentFolderName and password */}
            {(
              [
                { key: "label", label: "Label (e.g. Work Gmail)", type: "text" },
                { key: "imapHost", label: "IMAP Host", type: "text" },
                { key: "imapPort", label: "IMAP Port", type: "number" },
                { key: "smtpHost", label: "SMTP Host", type: "text" },
                { key: "smtpPort", label: "SMTP Port", type: "number" },
                { key: "username", label: "Username / Email", type: "email" },
              ] as const
            ).map(({ key, label, type }) => (
              <div key={key} className="space-y-1">
                <Label htmlFor={key}>{label}</Label>
                <Input
                  id={key}
                  type={type}
                  value={form[key] as string}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                />
              </div>
            ))}

            {/* App Password hint for Gmail */}
            {provider === "gmail" && (
              <Alert className="border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-100">
                <Info className="h-4 w-4 shrink-0" />
                <AlertDescription className="text-xs leading-relaxed">
                  Gmail requires a <strong>16-character App Password</strong> — your regular Gmail password won&apos;t work.{" "}
                  <a
                    href="https://myaccount.google.com/apppasswords"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium underline underline-offset-2"
                  >
                    Create one here
                  </a>{" "}
                  (Google Account → Security → App Passwords). Enter it below.
                </AlertDescription>
              </Alert>
            )}

            {/* Password field */}
            <div className="space-y-1">
              <Label htmlFor="password">
                {provider === "gmail" ? "App Password (16 characters)" : "Password"}
              </Label>
              <Input
                id="password"
                type="password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                placeholder={provider === "gmail" ? "xxxx xxxx xxxx xxxx" : ""}
              />
            </div>

            {/* Sent Folder Name with Discover */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label htmlFor="sentFolderName">Sent Folder Name</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  disabled={discovering || !form.imapHost || !form.username || !form.password}
                  onClick={handleDiscover}
                >
                  {discovering ? "Discovering…" : "Discover folders"}
                </Button>
              </div>
              {folders.length > 0 ? (
                <select
                  id="sentFolderName"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={form.sentFolderName}
                  onChange={(e) => setForm((f) => ({ ...f, sentFolderName: e.target.value }))}
                >
                  {folders.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              ) : (
                <Input
                  id="sentFolderName"
                  type="text"
                  value={form.sentFolderName}
                  onChange={(e) => setForm((f) => ({ ...f, sentFolderName: e.target.value }))}
                  placeholder='e.g. Sent or [Gmail]/Sent Mail'
                />
              )}
              {discoverError && (
                <p className="text-xs text-destructive">{discoverError}</p>
              )}
            </div>

            {/* SSL toggles */}
            <div className="flex items-center gap-2">
              <Switch
                id="imapSsl"
                checked={form.imapSsl}
                onCheckedChange={(v) => setForm((f) => ({ ...f, imapSsl: v }))}
              />
              <Label htmlFor="imapSsl">IMAP SSL</Label>
              <Switch
                id="smtpSsl"
                checked={form.smtpSsl}
                onCheckedChange={(v) => setForm((f) => ({ ...f, smtpSsl: v }))}
                className="ml-4"
              />
              <Label htmlFor="smtpSsl">SMTP SSL</Label>
            </div>

            {testResult && (
              <p
                className={`text-sm ${testResult.startsWith("✓") ? "text-green-600" : "text-destructive"}`}
              >
                {testResult}
              </p>
            )}
            <div className="flex gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={handleTest} disabled={testing}>
                {testing ? "Testing…" : "Test Connection"}
              </Button>
              <Button size="sm" onClick={handleCreate}>
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
