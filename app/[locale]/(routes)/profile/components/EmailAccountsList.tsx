"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  Info,
  Mail,
  MoreHorizontal,
  Plus,
  Trash2,
  User,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  createEmailAccount,
  deleteEmailAccount,
  setEmailAccountActive,
  testResendMailbox,
} from "@/actions/emails/accounts";
import { EmailSendProvider } from "@prisma/client";
import type { getEmailAccounts } from "@/actions/emails/accounts";
import {
  adminCreateEmailAccount,
  adminDeleteEmailAccount,
  adminSetEmailAccountActive,
} from "@/actions/admin/email-accounts";
import type { getAdminEmailAccounts } from "@/actions/admin/email-accounts";
import { MailboxExternalSetupPanel } from "./MailboxExternalSetupPanel";

type ProfileAccount = Awaited<ReturnType<typeof getEmailAccounts>>[number];
type AdminAccount = Awaited<ReturnType<typeof getAdminEmailAccounts>>[number];

type AssignableUser = { id: string; email: string; name: string | null };

type EmailAccountsListProps =
  | { accounts: ProfileAccount[]; admin?: false }
  | {
      accounts: AdminAccount[];
      admin: true;
      assignableUsers: AssignableUser[];
    };

function mailboxInitials(label: string) {
  const parts = label.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (label.slice(0, 2) || "MB").toUpperCase();
}

export function EmailAccountsList(props: EmailAccountsListProps) {
  const { accounts } = props;
  const isAdmin = props.admin === true;
  const assignableUsers = isAdmin ? props.assignableUsers : [];
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [testing, setTesting] = useState(false);
  const [form, setForm] = useState({ label: "", fromName: "", username: "" });
  const [assignUserId, setAssignUserId] = useState("");

  const refresh = () => router.refresh();
  const resendAccounts = accounts.filter((a) => a.sendProvider === EmailSendProvider.RESEND);
  const legacyAccounts = accounts.filter((a) => a.sendProvider !== EmailSendProvider.RESEND);

  async function handleTest() {
    setTesting(true);
    const result = await testResendMailbox({
      username: form.username,
      fromName: form.fromName,
      label: form.label,
    });
    setTesting(false);
    if (result.ok) toast.success("Resend API key and sender look good");
    else toast.error(result.error ?? "Resend check failed");
  }

  async function handleCreate() {
    if (!form.label.trim() || !form.username.trim()) {
      toast.error("Display name and email are required");
      return;
    }
    const payload = {
      sendProvider: EmailSendProvider.RESEND,
      label: form.label.trim(),
      fromName: form.fromName.trim() || undefined,
      username: form.username.trim(),
    };
    if (isAdmin) {
      if (!assignUserId) {
        toast.error("Choose a CRM user for this mailbox");
        return;
      }
      await adminCreateEmailAccount(assignUserId, payload);
    } else {
      await createEmailAccount(payload);
    }
    toast.success("Resend mailbox added");
    setOpen(false);
    setForm({ label: "", fromName: "", username: "" });
    refresh();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this mailbox and its messages in the CRM?")) return;
    if (isAdmin) await adminDeleteEmailAccount(id);
    else await deleteEmailAccount(id);
    toast.success("Mailbox removed");
    refresh();
  }

  async function handleToggle(id: string, current: boolean) {
    if (isAdmin) await adminSetEmailAccountActive(id, !current);
    else await setEmailAccountActive(id, !current);
    refresh();
  }

  function renderMailboxCard(acc: ProfileAccount | AdminAccount, legacy = false) {
    return (
      <li key={acc.id}>
        <Card
          className={cn(
            "overflow-hidden transition-shadow hover:shadow-md",
            legacy ? "border-l-4 border-l-amber-500" : "border-l-4 border-l-violet-500"
          )}
        >
          <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 gap-4">
              <div
                className={cn(
                  "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-sm font-semibold",
                  legacy
                    ? "bg-amber-500/15 text-amber-800 dark:text-amber-300"
                    : "bg-violet-500/15 text-violet-700 dark:text-violet-300"
                )}
              >
                {mailboxInitials(acc.label)}
              </div>
              <div className="min-w-0 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate font-medium">{acc.label}</p>
                  {legacy ? (
                    <Badge variant="outline" className="border-amber-500/50 text-amber-700 dark:text-amber-300">
                      Replace with Resend
                    </Badge>
                  ) : (
                    <Badge
                      variant="secondary"
                      className="gap-1 bg-violet-500/10 text-violet-700 dark:text-violet-300"
                    >
                      <Zap className="h-3 w-3" />
                      Resend
                    </Badge>
                  )}
                  <Badge variant={acc.isActive ? "default" : "outline"}>
                    {acc.isActive ? "Active" : "Paused"}
                  </Badge>
                </div>
                <p className="flex items-center gap-1.5 truncate text-sm text-muted-foreground">
                  <Mail className="h-3.5 w-3.5 shrink-0" />
                  {acc.fromName ? `${acc.fromName} · ` : ""}
                  {acc.username}
                </p>
                {!legacy && (
                  <p className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <ArrowUpRight className="h-3 w-3" /> Send via Resend API
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <ArrowDownLeft className="h-3 w-3" /> Receive via inbound webhook
                    </span>
                  </p>
                )}
                {legacy && (
                  <p className="text-xs text-amber-800 dark:text-amber-200/90">
                    This CRM only supports Resend now. Delete and add a new Resend mailbox.
                  </p>
                )}
                {"user" in acc && acc.user && (
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <User className="h-3.5 w-3.5 shrink-0" />
                    {acc.user.name ?? acc.user.email}
                  </p>
                )}
                {acc.lastSyncedAt && (
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5 shrink-0" />
                    Last activity {new Date(acc.lastSyncedAt).toLocaleString()}
                  </p>
                )}
                {!isAdmin && !legacy && acc.isActive && (
                  <MailboxExternalSetupPanel accountId={acc.id} sendProvider={acc.sendProvider} />
                )}
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="shrink-0 self-start sm:self-center">
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">Mailbox actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => handleToggle(acc.id, acc.isActive)}>
                  {acc.isActive ? "Pause mailbox" : "Activate mailbox"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => handleDelete(acc.id)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </CardContent>
        </Card>
      </li>
    );
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            {isAdmin ? "Team mailboxes (Resend)" : "Your mailboxes (Resend)"}
          </h2>
          <p className="text-sm text-muted-foreground">
            All send and receive traffic uses Resend — no separate mail server required.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!isAdmin && resendAccounts.some((a) => a.isActive) && (
            <Button asChild variant="secondary" className="gap-2">
              <Link href="/emails">
                <ArrowDownLeft className="h-4 w-4" />
                Open inbox
              </Link>
            </Button>
          )}
          <Button className="gap-2 shadow-sm" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" />
            Add Resend mailbox
          </Button>
        </div>
      </div>

      {resendAccounts.length === 0 && legacyAccounts.length === 0 ? (
        <Card className="border-dashed bg-muted/20 shadow-none">
          <CardContent className="flex flex-col items-center justify-center gap-4 py-14 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-600 dark:text-violet-400">
              <Mail className="h-7 w-7" />
            </div>
            <div className="max-w-sm space-y-1">
              <p className="font-medium">No Resend mailboxes yet</p>
              <p className="text-sm text-muted-foreground">
                Add an address on your verified domain. Outbound uses the API; inbound uses the
                webhook configured above.
              </p>
            </div>
            <Button variant="secondary" className="gap-2" onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" />
              Add mailbox
            </Button>
          </CardContent>
        </Card>
      ) : (
        <ul className="grid gap-3">
          {resendAccounts.map((acc) => renderMailboxCard(acc, false))}
          {legacyAccounts.map((acc) => renderMailboxCard(acc, true))}
        </ul>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-[480px]">
          <DialogHeader className="space-y-1 border-b px-6 py-5 text-left">
            <DialogTitle>Add Resend mailbox</DialogTitle>
            <DialogDescription>
              Send with the Resend API and receive with the inbound webhook. Domain must be verified
              in Resend.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 px-6 py-5">
            <Alert className="border-violet-500/30 bg-violet-500/5">
              <Info className="h-4 w-4 text-violet-600 dark:text-violet-400" />
              <AlertDescription className="text-xs leading-relaxed">
                The email address must be one people can write to (same as From). Requires{" "}
                <code className="text-[10px]">RESEND_API_KEY</code> and inbound webhook secret in
                production.
              </AlertDescription>
            </Alert>

            {isAdmin && (
              <div className="space-y-2">
                <Label>Assign to user</Label>
                <Select value={assignUserId || undefined} onValueChange={setAssignUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select team member…" />
                  </SelectTrigger>
                  <SelectContent>
                    {assignableUsers.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name ? `${u.name} (${u.email})` : u.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="label">Display name</Label>
              <Input
                id="label"
                value={form.label}
                onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                placeholder="Sales"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fromName">Sender name (optional)</Label>
              <Input
                id="fromName"
                value={form.fromName}
                onChange={(e) => setForm((f) => ({ ...f, fromName: e.target.value }))}
                placeholder="Vensai Labs"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">Email address</Label>
              <Input
                id="username"
                type="email"
                value={form.username}
                onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                placeholder="hello@yourcompany.com"
              />
            </div>
          </div>

          <DialogFooter className="border-t bg-muted/30 px-6 py-4 sm:justify-between">
            <Button variant="ghost" type="button" onClick={handleTest} disabled={testing}>
              {testing ? "Checking…" : "Verify Resend"}
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" type="button" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={handleCreate}>
                Save mailbox
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
