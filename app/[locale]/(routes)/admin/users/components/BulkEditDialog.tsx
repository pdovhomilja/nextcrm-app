"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil } from "lucide-react";

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
import { bulkUpdateEmployees } from "@/actions/admin/users/bulk-update-users";
import { ROLE_OPTIONS, type AssignableRole } from "./role-options";

type SelectedUser = { id: string; workEmail?: string | null; email: string; name?: string | null };

export function BulkEditDialog({ selected }: { selected: SelectedUser[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<AssignableRole | "unchanged">("unchanged");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    if (password !== confirmPassword) {
      toast.error("Password and confirm password do not match.");
      return;
    }
    startTransition(async () => {
      const result = await bulkUpdateEmployees({
        userIds: selected.map((user) => user.id),
        ...(role !== "unchanged" ? { role } : {}),
        ...(password ? { password } : {}),
      });
      if (result.error && !result.data?.updated.length) {
        toast.error(result.error);
        return;
      }
      const updated = result.data?.updated.length ?? 0;
      const failed = result.data?.failed.length ?? 0;
      toast.success(
        failed > 0 ? `Updated ${updated}. ${failed} could not be changed.` : `Updated ${updated} users.`
      );
      setOpen(false);
      setPassword("");
      setConfirmPassword("");
      setRole("unchanged");
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" className="gap-2" disabled={selected.length === 0}>
          <Pencil className="h-4 w-4" />
          Bulk edit{selected.length > 0 ? ` (${selected.length})` : ""}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Bulk edit</DialogTitle>
          <DialogDescription>
            Applies to the {selected.length} selected user{selected.length === 1 ? "" : "s"}. Leave
            password empty to keep current passwords. They all receive the same new password when you
            set one.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="space-y-1.5">
            <Label>Role</Label>
            <Select value={role} onValueChange={(value) => setRole(value as AssignableRole | "unchanged")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unchanged">Don&apos;t change role</SelectItem>
                {ROLE_OPTIONS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bulk-edit-password">New password</Label>
            <Input
              id="bulk-edit-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Leave blank to keep"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bulk-edit-confirm">Confirm password</Label>
            <Input
              id="bulk-edit-confirm"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={pending || selected.length === 0} onClick={submit}>
            {pending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
