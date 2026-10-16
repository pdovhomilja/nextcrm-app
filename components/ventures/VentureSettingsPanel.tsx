"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { updateVenture } from "@/actions/ventures/update-venture";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  ventureId: string;
  adminEmail: string | null;
  envPreview: string;
  externalUrl: string | null;
  notes: string | null;
};

export function VentureSettingsPanel({
  ventureId,
  adminEmail,
  envPreview,
  externalUrl,
  notes,
}: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-4 rounded-xl border border-border/60 bg-card p-6">
      <h3 className="text-base font-semibold">Venture credentials &amp; env</h3>
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          const fd = new FormData(e.currentTarget);
          startTransition(async () => {
            const result = await updateVenture({
              id: ventureId,
              adminEmail: String(fd.get("adminEmail") ?? ""),
              adminPassword: String(fd.get("adminPassword") ?? ""),
              envContent: String(fd.get("envContent") ?? ""),
              externalUrl: String(fd.get("externalUrl") ?? ""),
              notes: String(fd.get("notes") ?? ""),
            });
            if ("error" in result && result.error) {
              setError(String(result.error));
              return;
            }
            router.refresh();
          });
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="adminEmail">Admin email</Label>
          <Input id="adminEmail" name="adminEmail" type="email" defaultValue={adminEmail ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="adminPassword">New admin password (leave blank to keep)</Label>
          <Input id="adminPassword" name="adminPassword" type="password" minLength={8} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="envContent">.env (stored encrypted)</Label>
          <Textarea
            id="envContent"
            name="envContent"
            rows={10}
            className="font-mono text-xs"
            defaultValue={envPreview}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="externalUrl">External URL</Label>
          <Input id="externalUrl" name="externalUrl" type="url" defaultValue={externalUrl ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea id="notes" name="notes" rows={3} defaultValue={notes ?? ""} />
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save venture settings"}
        </Button>
      </form>
    </div>
  );
}
