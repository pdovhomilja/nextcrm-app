"use client";

import { useEffect, useState, useTransition } from "react";

import { updatePersonalEmail } from "@/actions/admin/users/update-personal-email";
import { Button } from "@/components/ui/button";
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
import { toast } from "sonner";

type Props = {
  userId: string;
  userName: string;
  personalEmail: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated?: () => void;
};

export function AdminEditPersonalEmailDialog({
  userId,
  userName,
  personalEmail,
  open,
  onOpenChange,
  onUpdated,
}: Props) {
  const [email, setEmail] = useState(personalEmail);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (open) setEmail(personalEmail);
  }, [open, personalEmail]);

  function handleSave() {
    startTransition(async () => {
      const result = await updatePersonalEmail({ userId, personalEmail: email });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Personal email updated");
      onOpenChange(false);
      onUpdated?.();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit personal email</DialogTitle>
          <DialogDescription>
            {userName} signs in with their personal address (password or email code). Work email
            stays unchanged.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label htmlFor="personal-email">Personal email</Label>
          <Input
            id="personal-email"
            type="email"
            autoComplete="off"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@gmail.com"
          />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={isPending || !email.trim()} onClick={handleSave}>
            {isPending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
