"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createBulkEmployees } from "@/actions/admin/users/bulk-create-users";
import { buildBulkWorkEmails } from "@/lib/admin/bulk-user-addresses";
import { ROLE_OPTIONS, type AssignableRole } from "./role-options";

export function BulkCreateDialog({ orgDomain }: { orgDomain: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [prefix, setPrefix] = useState("");
  const [middix, setMiddix] = useState("");
  const [suffix, setSuffix] = useState("");
  const [count, setCount] = useState("1");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<AssignableRole>("trainee");
  const [pending, startTransition] = useTransition();

  const preview = useMemo(
    () =>
      buildBulkWorkEmails({
        prefix,
        middix,
        suffix,
        count: Number(count),
        domain: orgDomain,
      }),
    [prefix, middix, suffix, count, orgDomain]
  );

  function reset() {
    setPrefix("");
    setMiddix("");
    setSuffix("");
    setCount("1");
    setPassword("");
    setConfirmPassword("");
    setRole("trainee");
  }

  function submit() {
    startTransition(async () => {
      const result = await createBulkEmployees({
        prefix,
        middix,
        suffix,
        count: Number(count),
        password,
        confirmPassword,
        role,
      });
      if (result.error && !result.data?.created.length) {
        toast.error(result.error);
        return;
      }
      const created = result.data?.created.length ?? 0;
      const failed = result.data?.failed.length ?? 0;
      if (failed > 0) {
        toast.warning(`Created ${created}. ${failed} failed. ${result.data?.failed[0]?.error ?? ""}`);
      } else {
        toast.success(`Created ${created} user${created === 1 ? "" : "s"}. They share the same password.`);
      }
      setOpen(false);
      reset();
      router.refresh();
    });
  }

  const sample = "emails" in preview ? preview.emails : [];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" className="gap-2">
          <Users className="h-4 w-4" />
          Bulk creation
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Bulk creation</DialogTitle>
          <DialogDescription>
            One user joins prefix, middle, and suffix. For more than one, prefix and middle stay the
            same and the suffix becomes 1, 2, 3… Every user gets the same password and role.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="bulk-prefix">Prefix</Label>
              <Input id="bulk-prefix" value={prefix} onChange={(e) => setPrefix(e.target.value)} placeholder="trn" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bulk-middix">Middle</Label>
              <Input id="bulk-middix" value={middix} onChange={(e) => setMiddix(e.target.value)} placeholder="1" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bulk-suffix">Suffix</Label>
              <Input id="bulk-suffix" value={suffix} onChange={(e) => setSuffix(e.target.value)} placeholder="plx" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Fill one, two, or all three. Example: trn, 1, and plx with 1 user is trn1plx@{orgDomain}.
            With 10 users the addresses are trn11@{orgDomain} through trn110@{orgDomain}.
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="bulk-count">Number of users</Label>
            <Input
              id="bulk-count"
              type="number"
              min={1}
              max={100}
              value={count}
              onChange={(e) => setCount(e.target.value)}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="bulk-password">Password</Label>
              <Input
                id="bulk-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bulk-confirm">Confirm password</Label>
              <Input
                id="bulk-confirm"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Role</Label>
            <Select value={role} onValueChange={(value) => setRole(value as AssignableRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="rounded-md border bg-muted/40 px-3 py-2 text-xs">
            {"error" in preview ? (
              <p className="text-muted-foreground">{preview.error}</p>
            ) : (
              <ul className="space-y-0.5">
                {sample.slice(0, 6).map((email) => (
                  <li key={email}>{email}</li>
                ))}
                {sample.length > 6 && <li>…and {sample.length - 6} more</li>}
              </ul>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={pending || "error" in preview} onClick={submit}>
            {pending ? "Creating…" : "Create users"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
