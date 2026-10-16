"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { loginRofytAdmin } from "@/actions/ventures/rofyt-login";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function RofytLoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="mx-auto flex w-full max-w-sm flex-col gap-4 rounded-xl border border-border/60 bg-card p-6 shadow-sm"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        startTransition(async () => {
          const result = await loginRofytAdmin(password);
          if ("error" in result && result.error) {
            setError(result.error);
            return;
          }
          router.refresh();
        });
      }}
    >
      <div>
        <h2 className="text-lg font-semibold">Rofyt admin</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Sign in with the venture admin password to view stats and configuration.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="rofyt-password">Admin password</Label>
        <Input
          id="rofyt-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Signing in…" : "Unlock Rofyt"}
      </Button>
    </form>
  );
}
