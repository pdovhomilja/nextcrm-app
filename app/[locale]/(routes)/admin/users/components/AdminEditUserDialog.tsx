"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { updateEmployee } from "@/actions/admin/users/update-user";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ROLE_OPTIONS, type AssignableRole } from "./role-options";

type Props = {
  userId: string;
  name: string;
  phone: string;
  personalEmail: string;
  workEmail: string;
  role: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated?: () => void;
};

export function AdminEditUserDialog({
  userId,
  name,
  phone,
  personalEmail,
  workEmail,
  role,
  open,
  onOpenChange,
  onUpdated,
}: Props) {
  const [draftName, setDraftName] = useState(name);
  const [draftPhone, setDraftPhone] = useState(phone);
  const [draftPersonal, setDraftPersonal] = useState(personalEmail);
  const [draftWork, setDraftWork] = useState(workEmail);
  const [draftRole, setDraftRole] = useState<AssignableRole>(
    ROLE_OPTIONS.some((item) => item.value === role) ? (role as AssignableRole) : "user"
  );
  const [changePassword, setChangePassword] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    setDraftName(name);
    setDraftPhone(phone);
    setDraftPersonal(personalEmail);
    setDraftWork(workEmail);
    setDraftRole(ROLE_OPTIONS.some((item) => item.value === role) ? (role as AssignableRole) : "user");
    setChangePassword(false);
    setPassword("");
    setConfirmPassword("");
  }, [open, name, phone, personalEmail, workEmail, role]);

  function save() {
    if (changePassword) {
      if (password.length < 8) {
        toast.error("Password must be at least 8 characters.");
        return;
      }
      if (password !== confirmPassword) {
        toast.error("Password and confirm password do not match.");
        return;
      }
    }

    startTransition(async () => {
      const result = await updateEmployee({
        userId,
        name: draftName,
        phone: draftPhone,
        personalEmail: draftPersonal,
        workEmail: draftWork,
        role: draftRole,
        ...(changePassword ? { password } : {}),
      });
      if ("error" in result && result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("User updated");
      onOpenChange(false);
      onUpdated?.();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit user</DialogTitle>
          <DialogDescription>
            Change the name, phone, emails, password, or role. Work email is the login when no
            personal email is set.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="edit-name">Name</Label>
            <Input id="edit-name" value={draftName} onChange={(e) => setDraftName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-phone">Phone number</Label>
            <Input id="edit-phone" value={draftPhone} onChange={(e) => setDraftPhone(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-work">Work email</Label>
            <Input
              id="edit-work"
              type="email"
              value={draftWork}
              onChange={(e) => setDraftWork(e.target.value.toLowerCase())}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-personal">Personal email</Label>
            <Input
              id="edit-personal"
              type="email"
              value={draftPersonal}
              onChange={(e) => setDraftPersonal(e.target.value.toLowerCase())}
              placeholder="Optional"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Role</Label>
            <Select value={draftRole} onValueChange={(value) => setDraftRole(value as AssignableRole)}>
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
          <label className="flex items-center gap-2 text-sm font-medium">
            <Checkbox
              checked={changePassword}
              onCheckedChange={(checked) => setChangePassword(checked === true)}
            />
            Change password
          </label>
          {changePassword && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="edit-password">Password</Label>
                <Input
                  id="edit-password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-confirm">Confirm password</Label>
                <Input
                  id="edit-confirm"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={pending} onClick={save}>
            {pending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
