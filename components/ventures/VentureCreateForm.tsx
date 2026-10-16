"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { createVenture } from "@/actions/ventures/create-venture";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  adminHostForKey,
  defaultErpUrl,
  erpHostForKey,
  normalizeVentureKey,
} from "@/lib/ventures/subdomain";

export function VentureCreateForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const key = normalizeVentureKey(slug || name);
  const subdomainPreview = useMemo(() => {
    if (!key || key.length < 2) return null;
    return {
      erp: erpHostForKey(key),
      admin: adminHostForKey(key),
      erpUrl: defaultErpUrl(key),
    };
  }, [key]);

  return (
    <form
      className="mx-auto flex max-w-2xl flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        const fd = new FormData(e.currentTarget);
        startTransition(async () => {
          const result = await createVenture({
            name: String(fd.get("name") ?? ""),
            slug: String(fd.get("slug") ?? ""),
            description: String(fd.get("description") ?? ""),
            gitRepositoryUrl: String(fd.get("gitRepositoryUrl") ?? ""),
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
      <p className="rounded-lg border border-border/60 bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
        All fields are required before a venture can be registered. You can link tasks, CI, and
        releases later — placeholders are stored automatically.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Venture name *</Label>
          <Input
            id="name"
            name="name"
            required
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (!slug) setSlug(normalizeVentureKey(e.target.value));
            }}
            placeholder="ROFABS"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="slug">Venture key *</Label>
          <Input
            id="slug"
            name="slug"
            required
            value={slug}
            onChange={(e) => setSlug(normalizeVentureKey(e.target.value))}
            placeholder="rofabs"
            pattern="[a-z0-9-]+"
          />
        </div>
      </div>

      {subdomainPreview ? (
        <div className="rounded-md border border-dashed border-border/70 px-3 py-2 text-xs text-muted-foreground">
          Default domains: <strong>{subdomainPreview.erp}</strong> · Admin:{" "}
          <strong>{subdomainPreview.admin}</strong>
        </div>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="description">Description *</Label>
        <Textarea
          id="description"
          name="description"
          required
          minLength={10}
          rows={3}
          placeholder="What this product does under VenSai Labs…"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="gitRepositoryUrl">Git repository URL *</Label>
        <Input
          id="gitRepositoryUrl"
          name="gitRepositoryUrl"
          required
          type="url"
          placeholder="https://github.com/jayandra06/rofyt-vensailabs"
        />
        <p className="text-xs text-muted-foreground">
          HTTPS or git@ URL (GitHub, GitLab, Bitbucket). Code push automation will use this in a
          later phase.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="adminEmail">Default administrator email *</Label>
          <Input id="adminEmail" name="adminEmail" type="email" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="adminPassword">Default administrator password *</Label>
          <Input id="adminPassword" name="adminPassword" type="password" required minLength={8} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="externalUrl">Primary app URL (HTTPS) *</Label>
        <Input
          id="externalUrl"
          name="externalUrl"
          type="url"
          required
          placeholder={subdomainPreview?.erpUrl ?? "https://rofyt.vensailabs.in"}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="envContent">Environment file (.env) *</Label>
        <Textarea
          id="envContent"
          name="envContent"
          required
          rows={8}
          className="font-mono text-xs"
          placeholder={"DATABASE_URL=\nVENTURE_PROVISIONING_SECRET="}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Project notes *</Label>
        <Textarea
          id="notes"
          name="notes"
          required
          rows={3}
          placeholder="Deployment notes, owners, Vercel project name…"
        />
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Registering venture…" : "Register venture"}
      </Button>
    </form>
  );
}
