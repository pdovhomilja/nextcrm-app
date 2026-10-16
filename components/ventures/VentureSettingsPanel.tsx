"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { seedVentureAdmin } from "@/actions/ventures/seed-venture-admin";
import { testVentureDatabaseConnection } from "@/actions/ventures/test-venture-database";
import { updateVenture } from "@/actions/ventures/update-venture";
import { VentureConnectionIndicator } from "@/components/ventures/VentureConnectionIndicator";
import { VentureEnvFields } from "@/components/ventures/VentureEnvFields";
import { envContentFromEntries, normalizeEnvEntriesForEditor } from "@/lib/ventures/parse-env";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  ventureId: string;
  description: string | null;
  assignedSubdomain: string | null;
  gitRepositoryUrl: string | null;
  adminEmail: string | null;
  envPreview: string;
  externalUrl: string | null;
  databaseUrl: string | null;
  databaseConnectionStatus: "unknown" | "connected" | "failed";
  notes: string | null;
  adminPortalUrl: string | null;
  adminProvisioningStatus?: string | null;
};

export function VentureSettingsPanel({
  ventureId,
  description,
  assignedSubdomain,
  gitRepositoryUrl,
  adminEmail,
  envPreview,
  externalUrl,
  databaseUrl,
  databaseConnectionStatus,
  notes,
  adminPortalUrl,
  adminProvisioningStatus,
}: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [dbUrl, setDbUrl] = useState(databaseUrl ?? "");
  const [dbStatus, setDbStatus] = useState(databaseConnectionStatus);
  const [pending, startTransition] = useTransition();
  const [dbPending, startDbTransition] = useTransition();
  const [seedPending, startSeedTransition] = useTransition();
  const [envSerialized, setEnvSerialized] = useState(() =>
    envContentFromEntries(envPreview, normalizeEnvEntriesForEditor(envPreview)),
  );

  const loginUrl = adminPortalUrl ? `${adminPortalUrl.replace(/\/+$/, "")}/login` : null;

  function currentEnvContent() {
    return envSerialized.trim()
      ? envSerialized
      : envContentFromEntries(
          envPreview,
          normalizeEnvEntriesForEditor(envPreview, dbUrl ? { MONGODB_URI: dbUrl } : undefined),
        );
  }

  return (
    <div className="space-y-4 rounded-xl border border-border/60 bg-card p-6">
      <div>
        <h3 className="text-base font-semibold">Venture setup</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Set domain and database, test the connection, then seed the shared admin portal (
          admin.vensailabs.in).
        </p>
        <VentureConnectionIndicator
          className="mt-3"
          databaseStatus={dbStatus}
          adminProvisioningStatus={adminProvisioningStatus}
        />
        {loginUrl ? (
          <p className="mt-2 text-sm">
            Admin login:{" "}
            <Link
              href={loginUrl}
              className="text-primary underline-offset-4 hover:underline"
              target="_blank"
              rel="noreferrer"
            >
              {loginUrl}
            </Link>
          </p>
        ) : null}
      </div>

      <div className="rounded-lg border border-dashed border-border/70 p-4">
        <h4 className="text-sm font-medium">Domain &amp; database</h4>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="assignedSubdomain">Business domain (hostname)</Label>
            <Input
              id="assignedSubdomain"
              name="assignedSubdomain"
              form="venture-save-form"
              defaultValue={assignedSubdomain ?? ""}
              placeholder="rofyt.vensailabs.in"
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="databaseUrl">Database URL (MongoDB)</Label>
            <Input
              id="databaseUrl"
              name="databaseUrl"
              value={dbUrl}
              onChange={(e) => setDbUrl(e.target.value)}
              placeholder="mongodb+srv://..."
              className="font-mono text-xs"
            />
          </div>
        </div>
        <Button
          type="button"
          variant="secondary"
          className="mt-3"
          disabled={dbPending || !dbUrl.trim()}
          onClick={() => {
            setError(null);
            setInfo(null);
            startDbTransition(async () => {
              const result = await testVentureDatabaseConnection({
                ventureId,
                databaseUrl: dbUrl.trim(),
              });
              if ("error" in result && result.error) {
                setError(String(result.error));
                setDbStatus("failed");
                return;
              }
              if ("connected" in result && result.connected) {
                setDbStatus("connected");
                setInfo(result.message ?? "Connected to database.");
              }
              router.refresh();
            });
          }}
        >
          {dbPending ? "Testing…" : "Connect to DB"}
        </Button>
      </div>

      <div className="rounded-lg border border-dashed border-border/70 p-4">
        <h4 className="text-sm font-medium">Admin portal account</h4>
        <p className="mt-1 text-xs text-muted-foreground">
          Saves CRM credentials and seeds admin.vensailabs.in (does not change DB until you click
          Connect).
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="seedAdminEmail">Admin email</Label>
            <Input id="seedAdminEmail" type="email" defaultValue={adminEmail ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="seedAdminPassword">Admin password</Label>
            <Input id="seedAdminPassword" type="password" minLength={8} />
          </div>
        </div>
        <Button
          type="button"
          className="mt-3"
          disabled={seedPending}
          onClick={() => {
            setError(null);
            setInfo(null);
            const email = (document.getElementById("seedAdminEmail") as HTMLInputElement).value;
            const password = (document.getElementById("seedAdminPassword") as HTMLInputElement).value;
            startSeedTransition(async () => {
              const envContent = currentEnvContent();
              if (!envContent.trim()) {
                setError("Add VENTURE_PROVISIONING_SECRET in the environment fields below.");
                return;
              }
              const result = await seedVentureAdmin({
                ventureId,
                adminEmail: email,
                adminPassword: password,
                envContent,
              });
              if ("error" in result && result.error) {
                setError(String(result.error));
                return;
              }
              if ("message" in result && result.message) {
                setInfo(String(result.message));
              }
              router.refresh();
            });
          }}
        >
          {seedPending ? "Seeding…" : "Seed admin account"}
        </Button>
      </div>

      <form
        id="venture-save-form"
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
              assignedSubdomain: String(fd.get("assignedSubdomain") ?? ""),
              databaseUrl: dbUrl.trim(),
              adminEmail: String(fd.get("adminEmail") ?? ""),
              adminPassword: "",
              envContent: currentEnvContent() || String(fd.get("envContent") ?? ""),
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
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="adminEmail">Admin email (CRM record) *</Label>
          <Input
            id="adminEmail"
            name="adminEmail"
            type="email"
            required
            defaultValue={adminEmail ?? ""}
          />
        </div>
        <VentureEnvFields
          initialContent={envPreview}
          databaseUrl={dbUrl}
          onSerializedChange={setEnvSerialized}
        />
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
        <Button type="submit" variant="outline" disabled={pending}>
          {pending ? "Saving…" : "Save venture profile"}
        </Button>
      </form>
    </div>
  );
}
