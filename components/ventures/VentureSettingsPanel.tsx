"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { updateVenture } from "@/actions/ventures/update-venture";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  ventureId: string;
  description: string | null;
  gitRepositoryUrl: string | null;
  adminEmail: string | null;
  envPreview: string;
  externalUrl: string | null;
  notes: string | null;
  adminPortalUrl: string | null;
  adminProvisioningStatus?: string | null;
};

export function VentureSettingsPanel({
  ventureId,
  description,
  gitRepositoryUrl,
  adminEmail,
  envPreview,
  externalUrl,
  notes,
  adminPortalUrl,
  adminProvisioningStatus,
}: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const loginUrl = adminPortalUrl ? `${adminPortalUrl.replace(/\/+$/, "")}/login` : null;

  return (
    <div className="space-y-4 rounded-xl border border-border/60 bg-card p-6">
      <div>
        <h3 className="text-base font-semibold">Venture profile &amp; credentials</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Saving with a new administrator password automatically seeds that account on the venture&apos;s{" "}
          <strong>admin portal</strong> (same pattern for every venture). Use the portal to sign in and
          run the business — you do not need to remember raw <code className="text-xs">.env</code> values
          day to day.
        </p>
        {loginUrl ? (
          <p className="mt-2 text-sm">
            Admin login:{" "}
            <Link href={loginUrl} className="text-primary underline-offset-4 hover:underline" target="_blank" rel="noreferrer">
              {loginUrl}
            </Link>
            {adminProvisioningStatus ? (
              <span className="ml-2 text-xs text-muted-foreground">({adminProvisioningStatus.replace(/_/g, " ")})</span>
            ) : null}
          </p>
        ) : null}
      </div>
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          setInfo(null);
          const fd = new FormData(e.currentTarget);
          startTransition(async () => {
            const result = await updateVenture({
              id: ventureId,
              description: String(fd.get("description") ?? ""),
              gitRepositoryUrl: String(fd.get("gitRepositoryUrl") ?? ""),
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
            if ("seedMessage" in result && result.seedMessage) {
              setInfo(String(result.seedMessage));
            }
            router.refresh();
          });
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="description">Description *</Label>
          <Textarea
            id="description"
            name="description"
            required
            minLength={10}
            rows={3}
            defaultValue={description ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="gitRepositoryUrl">Git repository URL *</Label>
          <Input
            id="gitRepositoryUrl"
            name="gitRepositoryUrl"
            type="url"
            required
            defaultValue={gitRepositoryUrl ?? ""}
            placeholder="https://github.com/your-org/your-repo"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="adminEmail">Admin email *</Label>
          <Input
            id="adminEmail"
            name="adminEmail"
            type="email"
            required
            defaultValue={adminEmail ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="adminPassword">Administrator password *</Label>
          <Input
            id="adminPassword"
            name="adminPassword"
            type="password"
            minLength={8}
            placeholder="Enter to save CRM copy and seed the admin portal"
          />
          <p className="text-xs text-muted-foreground">
            Required when seeding. Leave blank only to update other fields without changing the portal
            password.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="envContent">.env (stored encrypted) *</Label>
          <Textarea
            id="envContent"
            name="envContent"
            required
            rows={10}
            className="font-mono text-xs"
            defaultValue={envPreview}
            placeholder={"VENTURE_PROVISIONING_SECRET=\nDATABASE_URL="}
          />
          <p className="text-xs text-muted-foreground">
            Must include <code>VENTURE_PROVISIONING_SECRET</code> (same value as on the admin portal
            deployment).
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="externalUrl">Primary app URL *</Label>
          <Input
            id="externalUrl"
            name="externalUrl"
            type="url"
            required
            defaultValue={externalUrl ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="notes">Project notes *</Label>
          <Textarea id="notes" name="notes" rows={3} required defaultValue={notes ?? ""} />
        </div>
        {info ? <p className="text-sm text-emerald-600 dark:text-emerald-400">{info}</p> : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button type="submit" disabled={pending}>
          {pending ? "Saving and seeding…" : "Save and seed admin portal"}
        </Button>
      </form>
    </div>
  );
}
