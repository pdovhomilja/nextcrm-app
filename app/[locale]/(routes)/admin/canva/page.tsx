import Link from "next/link";
import { getSession } from "@/lib/auth-server";
import { getCanvaConnectionState, recentCanvaDesigns } from "@/actions/canva/designs";
import { hasCanvaOAuth, canvaRedirectUri } from "@/lib/canva/config";
import { Button } from "@/components/ui/button";
import { DisconnectCanvaButton } from "./DisconnectCanvaButton";

export default async function CanvaAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; canva?: string; reason?: string }>;
}) {
  const session = await getSession();
  const params = await searchParams;
  const origin = (process.env.NEXT_PUBLIC_APP_URL || process.env.BETTER_AUTH_URL || "http://localhost:3000").replace(
    /\/$/,
    ""
  );
  const configured = hasCanvaOAuth();
  const connection = session?.user?.id ? await getCanvaConnectionState() : { connected: false, displayName: null };
  let designs: Awaited<ReturnType<typeof recentCanvaDesigns>> = [];
  let listError: string | null = null;
  if (connection.connected) {
    try {
      designs = await recentCanvaDesigns();
    } catch (e) {
      listError = e instanceof Error ? e.message : "Could not list designs";
    }
  }

  const justConnected = params.canva === "connected" || params.connected === "1";
  const failed = params.canva === "error" || params.connected === "error";

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Canva</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Connect a Canva account so campaign templates can be designed in Canva and imported back as HTML or an image.
        </p>
      </div>

      {justConnected && (
        <p className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm">Canva is connected.</p>
      )}
      {failed && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          Canva connection failed{params.reason ? ` (${params.reason})` : ""}.
        </p>
      )}

      <section className="space-y-3 rounded-xl border p-4">
        <h2 className="text-sm font-semibold">Developer portal</h2>
        <p className="text-sm text-muted-foreground">
          In your Canva app, set the redirect URL to{" "}
          <code className="rounded bg-muted px-1 text-xs">{canvaRedirectUri(origin)}</code> and enable scopes{" "}
          <code className="text-xs">profile:read</code>, <code className="text-xs">design:meta:read</code>,{" "}
          <code className="text-xs">design:content:read</code>, <code className="text-xs">design:content:write</code>,{" "}
          <code className="text-xs">brandtemplate:meta:read</code>, <code className="text-xs">brandtemplate:content:read</code>.
        </p>
        <p className="text-sm text-muted-foreground">
          Env: <code className="text-xs">CANVA_CLIENT_ID</code> and <code className="text-xs">CANVA_CLIENT_SECRET</code>
          {configured ? " are set." : " are missing."}
        </p>
      </section>

      <section className="flex flex-wrap items-center gap-3 rounded-xl border p-4">
        {connection.connected ? (
          <>
            <p className="text-sm">
              Connected{connection.displayName ? ` as ${connection.displayName}` : ""}.
            </p>
            <DisconnectCanvaButton />
          </>
        ) : (
          <Button asChild disabled={!configured}>
            <Link href="/api/canva/oauth?return=/admin/canva">Connect Canva</Link>
          </Button>
        )}
        <Button variant="outline" asChild>
          <Link href="/campaigns/templates/new">Design a campaign template</Link>
        </Button>
      </section>

      {listError && <p className="text-sm text-destructive">{listError}</p>}
      {designs.length > 0 && (
        <ul className="space-y-2">
          {designs.map((design) => (
            <li key={design.id} className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm">
              <span className="min-w-0 truncate">{design.title}</span>
              {design.editUrl && (
                <a className="shrink-0 text-primary underline" href={design.editUrl} target="_blank" rel="noreferrer">
                  Edit
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
