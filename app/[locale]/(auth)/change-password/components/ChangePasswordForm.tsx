"use client";

import { useState } from "react";
import { toast } from "sonner";

import { completeForcedPasswordChange } from "@/actions/auth/complete-forced-password-change";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { localeFromPathname } from "@/lib/auth-post-login";

export function ChangePasswordForm() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit() {
    setIsLoading(true);
    try {
      const result = await completeForcedPasswordChange({ newPassword, confirmPassword });
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success("Password updated. Welcome!");
      const locale = localeFromPathname(window.location.pathname);
      window.location.assign(`/${locale}`);
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="my-5 w-full max-w-[400px] border-slate-800 bg-[#111827] text-white shadow-2xl">
      <CardHeader className="space-y-1 pb-4">
        <CardTitle className="text-2xl">Set your password</CardTitle>
        <CardDescription className="text-slate-400">
          Your account used a temporary password or a one-time code. Choose a new password to
          continue.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 pb-7">
        <div className="grid gap-1.5">
          <Label htmlFor="new-password">New password</Label>
          <Input
            id="new-password"
            type="password"
            autoComplete="new-password"
            className="border-slate-700 bg-[#080e1c] text-white"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            disabled={isLoading}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="confirm-password">Confirm password</Label>
          <Input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            className="border-slate-700 bg-[#080e1c] text-white"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={isLoading}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          />
        </div>
        <Button
          className="bg-[#1784a5] text-slate-950 hover:bg-[#249bbd]"
          onClick={handleSubmit}
          disabled={isLoading || !newPassword || !confirmPassword}
        >
          Save and continue
        </Button>
      </CardContent>
    </Card>
  );
}
