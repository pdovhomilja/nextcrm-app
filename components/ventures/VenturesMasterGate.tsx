"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { loginVenturesMaster } from "@/actions/ventures/ventures-master-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function VenturesMasterGate() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-16">
      <form
        className="flex w-full max-w-sm flex-col gap-4 rounded-xl border border-border/60 bg-card p-6 shadow-sm"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          startTransition(async () => {
            const result = await loginVenturesMaster(password);
            if ("error" in result && result.error) {
              setError(result.error);
              return;
            }
            router.refresh();
          });
        }}
      >
        <div>
          <h2 className="text-lg font-semibold">Ventures</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter the shared master password to open Ventures (Rofyt and connected apps).
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="ventures-master-password">Master password</Label>
          <Input
            id="ventures-master-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button type="submit" disabled={pending}>
          {pending ? "Unlocking…" : "Continue"}
        </Button>
      </form>
    </div>
  );
}
