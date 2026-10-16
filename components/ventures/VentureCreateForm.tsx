"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { createVenture } from "@/actions/ventures/create-venture";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function VentureCreateForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="mx-auto flex max-w-xl flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        const fd = new FormData(e.currentTarget);
        startTransition(async () => {
          const result = await createVenture({
            name: String(fd.get("name") ?? ""),
            slug: String(fd.get("slug") ?? ""),
            adminEmail: String(fd.get("adminEmail") ?? ""),
            adminPassword: String(fd.get("adminPassword") ?? ""),
            envContent: String(fd.get("envContent") ?? ""),
            externalUrl: String(fd.get("externalUrl") ?? ""),
            notes: String(fd.get("notes") ?? ""),
          });
          if ("error" in result && result.error) {
            setError(result.error);
            return;
          }
          router.push("/ventures");
          router.refresh();
        });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Venture name</Label>
          <Input id="name" name="name" required placeholder="My product" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="slug">Slug</Label>
          <Input id="slug" name="slug" required placeholder="my-product" pattern="[a-z0-9-]+" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="adminEmail">Admin email</Label>
          <Input id="adminEmail" name="adminEmail" type="email" placeholder="admin@example.com" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="adminPassword">Admin login password</Label>
          <Input id="adminPassword" name="adminPassword" type="password" minLength={8} />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="envContent">Environment file (.env contents)</Label>
        <Textarea
          id="envContent"
          name="envContent"
          rows={8}
          className="font-mono text-xs"
          placeholder={"DATABASE_URL=\nAPI_KEY="}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="externalUrl">External app URL (optional)</Label>
        <Input id="externalUrl" name="externalUrl" type="url" placeholder="https://app.example.com" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" rows={3} />
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Creating…" : "Create venture"}
      </Button>
    </form>
  );
}
