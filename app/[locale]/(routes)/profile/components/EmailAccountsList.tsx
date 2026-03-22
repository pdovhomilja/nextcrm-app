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
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import {
  createEmailAccount,
  deleteEmailAccount,
  setEmailAccountActive,
  testEmailConnection,
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

  const refresh = () => router.refresh();

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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            Add Email Account
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Connect IMAP Account</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {(
              [
                { key: "label", label: "Label (e.g. Work Gmail)", type: "text" },
                { key: "imapHost", label: "IMAP Host", type: "text" },
                { key: "imapPort", label: "IMAP Port", type: "number" },
                { key: "smtpHost", label: "SMTP Host", type: "text" },
                { key: "smtpPort", label: "SMTP Port", type: "number" },
                { key: "username", label: "Username / Email", type: "email" },
                { key: "password", label: "Password", type: "password" },
                { key: "sentFolderName", label: 'Sent Folder Name (e.g. "Sent", "[Gmail]/Sent Mail")', type: "text" },
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
