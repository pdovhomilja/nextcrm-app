"use client";

import { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { setUserPassword } from "@/actions/admin/users/set-user-password";
import { toast } from "sonner";

type Props = {
  userId: string;
  userName: string;
  personalEmail: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function AdminResetPasswordDialog({
  userId,
  userName,
  personalEmail,
  open,
  onOpenChange,
}: Props) {
  const [password, setPassword] = useState("");
  const [emailUser, setEmailUser] = useState(true);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(generateRandom: boolean) {
    startTransition(async () => {
      const result = await setUserPassword({
        userId,
        password: generateRandom ? undefined : password,
        emailUser,
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(
        emailUser ? "Password updated and emailed to personal address" : "Password updated"
      );
      setPassword("");
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reset password</DialogTitle>
          <DialogDescription>
            {userName} signs in with <strong>{personalEmail}</strong>. Set a new password or
            generate a random one.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="new-password">Custom password (optional)</Label>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 8 characters"
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border px-3 py-2">
            <Label htmlFor="email-password" className="text-sm font-normal">
              Email new password to personal address
            </Label>
            <Switch id="email-password" checked={emailUser} onCheckedChange={setEmailUser} />
          </div>
        </div>
        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
          <Button
            type="button"
            variant="secondary"
            disabled={isPending}
            onClick={() => handleSubmit(true)}
          >
            Generate random &amp; save
          </Button>
          <Button
            type="button"
            disabled={isPending || password.length > 0 && password.length < 8}
            onClick={() => handleSubmit(false)}
          >
            {isPending ? "Saving…" : password ? "Save custom password" : "Save (random if empty)"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
