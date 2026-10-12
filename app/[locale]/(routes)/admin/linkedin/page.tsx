import {
  ArrowUpRight,
  Building2,
  CheckCircle2,
  FileText,
  Linkedin,
  MessageSquare,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
} from "lucide-react";
import Link from "next/link";
import { getSession } from "@/lib/auth-server";
import {
  connectLinkedIn,
  getLinkedInConnectionState,
  getLinkedInProfile,
  getLinkedInSnapshot,
} from "./actions";
import LinkedInConnectButton from "./LinkedInConnectButton";

type LinkedInPageProps = {
  searchParams: Promise<{ connected?: string; organizationId?: string; reason?: string }>;
};

export default async function LinkedInPage({ searchParams }: LinkedInPageProps) {
  const session = await getSession();
  const params = await searchParams;
  const justConnected = params.connected === "1";
  const connectFailed = params.connected === "error";
  const connection = session?.user?.id ? await getLinkedInConnectionState() : { connected: false, orgFeatures: false };
  const profile = connection.connected ? await getLinkedInProfile() : null;

  let snapshot: Awaited<ReturnType<typeof getLinkedInSnapshot>> | null = null;
  let orgLoadFailed = false;

  if (params.organizationId && session?.user?.id && connection.connected) {
    try {
      snapshot = await getLinkedInSnapshot(params.organizationId);
    } catch {
      orgLoadFailed = true;
    }
  }

  const organizations = snapshot?.organizations?.elements ?? [];
  const posts = snapshot?.posts?.elements ?? [];
  const snapshotProfile = snapshot?.profile ?? profile;
  const orgFeaturesDisabled = snapshot?.orgFeaturesDisabled === true;
  const leadWebhookUrl = process.env.NEXT_PUBLIC_APP_URL
    ? `${process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}/api/linkedin/leads/webhook`
    : null;

  return (
    <main className="min-h-full bg-background px-4 py-6 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="relative overflow-hidden rounded-[2rem] border border-border/70 bg-card p-6 shadow-sm sm:p-9">
          <div className="absolute -right-24 -top-32 size-96 rounded-full bg-primary/15 blur-3xl" />
          <div className="absolute bottom-0 right-1/3 size-48 rounded-full bg-chart-2/10 blur-3xl" />
          <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl space-y-5">
              <div className="flex items-center gap-3">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-[#0a66c2] text-white shadow-lg shadow-[#0a66c2]/25">
                  <Linkedin />
                </div>
                <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                  Social command center
                </span>
              </div>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight sm:text-5xl">LinkedIn, connected to revenue.</h1>
                <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">
                  Connect your LinkedIn identity, sync Lead Gen forms into CRM leads, and (with LinkedIn approval) load
                  company page activity.
                </p>
              </div>
            </div>
            {connection.connected ? (
              <span className="inline-flex h-12 items-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-6 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                LinkedIn connected
              </span>
            ) : (
              <LinkedInConnectButton action={connectLinkedIn} />
            )}
          </div>
          {justConnected && connection.connected ? (
            <p className="relative mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-300">
              LinkedIn is connected for your user. Lead Sync can push to CRM; org workspace needs Community Management
              API on LinkedIn plus <code className="font-mono text-xs">LINKEDIN_ORG_SCOPES=true</code> on Vercel.
            </p>
          ) : null}
          {connectFailed ? (
            <p className="relative mt-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              LinkedIn connection failed
              {params.reason ? ` (${params.reason})` : ""}. Check{" "}
              <code className="font-mono text-xs">LINKEDIN_CLIENT_ID</code>,{" "}
              <code className="font-mono text-xs">LINKEDIN_CLIENT_SECRET</code>, and{" "}
              <code className="font-mono text-xs">EMAIL_ENCRYPTION_KEY</code> on Vercel, plus redirect{" "}
              <code className="font-mono text-xs">{process.env.NEXT_PUBLIC_APP_URL}/api/linkedin/callback</code>.
            </p>
          ) : null}
        </header>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric
            icon={Users}
            label="LinkedIn identity"
            value={profile?.name ?? (connection.connected ? "Connected" : "—")}
            detail={profile?.email ?? "Sign In (OIDC)"}
          />
          <Metric icon={Building2} label="Organizations" value={snapshot ? String(organizations.length) : "—"} detail="Needs org scopes" />
          <Metric icon={FileText} label="Content signals" value={snapshot && !orgFeaturesDisabled ? String(posts.length) : "—"} detail="Company posts" />
          <Metric icon={Target} label="Lead Sync" value={leadWebhookUrl ? "Ready" : "—"} detail="Webhook → CRM leads" />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
          <div className="rounded-3xl border border-border/70 bg-card p-6 sm:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Workspace</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight">Your LinkedIn command center</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {connection.orgFeatures
                    ? "Load a company page by numeric organization ID."
                    : "Org APIs are off until LinkedIn approves Community Management and you set LINKEDIN_ORG_SCOPES=true."}
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs font-medium text-emerald-600">
                <ShieldCheck className="size-4" /> Per-user OAuth
              </div>
            </div>

            {connection.connected && profile ? (
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <StatusItem label="Signed in as" value={snapshotProfile?.name ?? "LinkedIn member"} />
                <StatusItem label="Email" value={snapshotProfile?.email ?? "—"} />
              </div>
            ) : null}

            <form action="/en/admin/linkedin" method="get" className="mt-6 flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  name="organizationId"
                  required={connection.orgFeatures}
                  inputMode="numeric"
                  defaultValue={params.organizationId}
                  placeholder="LinkedIn organization ID (optional until org scopes)"
                  className="h-12 w-full rounded-xl border border-border bg-background pl-11 pr-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <button
                type="submit"
                disabled={!connection.connected}
                className="h-12 rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Load workspace
              </button>
            </form>

            {!connection.connected ? (
              <div className="mt-8 rounded-2xl border border-dashed border-border bg-muted/20 p-8 text-center">
                <Sparkles className="mx-auto size-6 text-primary" />
                <p className="mt-3 font-medium">Connect LinkedIn to activate your workspace</p>
                <p className="mt-1 text-sm text-muted-foreground">Your CRM keeps access scoped to the signed-in user.</p>
              </div>
            ) : null}

            {orgLoadFailed ? (
              <p className="mt-4 text-sm text-destructive">
                Could not load that organization. Check the numeric ID and your LinkedIn org permissions.
              </p>
            ) : null}

            {params.organizationId && orgFeaturesDisabled ? (
              <p className="mt-4 text-sm text-amber-700 dark:text-amber-400">
                Organization APIs are disabled. Request <strong>Community Management API</strong> on your LinkedIn app,
                set <code className="font-mono text-xs">LINKEDIN_ORG_SCOPES=true</code>, redeploy, and reconnect LinkedIn.
              </p>
            ) : null}

            {snapshot && !orgFeaturesDisabled ? (
              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                <StatusItem label="Identity" value={snapshotProfile?.name ?? "Connected"} />
                <StatusItem label="Organizations" value={`${organizations.length} available`} />
                <StatusItem label="Content sync" value={`${posts.length} posts loaded`} />
              </div>
            ) : null}
          </div>

          <aside className="rounded-3xl border border-border/70 bg-sidebar p-6 text-sidebar-foreground sm:p-7">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sidebar-primary">Lead Sync</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight">LinkedIn → CRM leads</h2>
            <p className="mt-3 text-sm text-sidebar-foreground/80">
              Point LinkedIn Lead Sync at your webhook. Set{" "}
              <code className="rounded bg-black/20 px-1 font-mono text-xs">LINKEDIN_LEADS_WEBHOOK_SECRET</code> on
              Vercel and use Bearer auth.
            </p>
            {leadWebhookUrl ? (
              <p className="mt-3 break-all rounded-lg bg-black/20 p-2 font-mono text-xs">{leadWebhookUrl}</p>
            ) : null}
            <div className="mt-6 flex flex-col gap-3">
              <Playbook icon={Users} title="View CRM leads" href="/en/crm/leads" />
              <Playbook icon={MessageSquare} title="Plan outreach" href="/en/campaigns/targets" />
              <Playbook icon={Plus} title="Create a project" href="/en/crm/projects" />
            </div>
          </aside>
        </section>

        {snapshot && !orgFeaturesDisabled && posts.length > 0 ? (
          <section className="rounded-3xl border border-border/70 bg-card p-6 sm:p-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Live intelligence</p>
                <h2 className="mt-2 text-2xl font-semibold">Recent organization activity</h2>
              </div>
              <Link href="/en/campaigns/targets" className="hidden items-center gap-2 text-sm font-medium text-primary sm:flex">
                Open campaigns <ArrowUpRight className="size-4" />
              </Link>
            </div>
            <div className="mt-6 grid gap-3">
              {posts.slice(0, 5).map((_, index) => (
                <div key={index} className="flex items-start gap-4 rounded-2xl border border-border/60 bg-muted/20 p-4">
                  <div className="mt-1 flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <FileText className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium">Organization post {index + 1}</p>
                    <p className="mt-1 truncate text-sm text-muted-foreground">
                      Review this signal and connect it to a lead, campaign, or project.
                    </p>
                  </div>
                  <CheckCircle2 className="ml-auto mt-1 size-4 shrink-0 text-emerald-500" />
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}

function Metric({ icon: Icon, label, value, detail }: { icon: typeof Building2; label: string; value: string; detail: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5">
      <div className="flex items-center justify-between">
        <Icon className="size-4 text-primary" />
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Live</span>
      </div>
      <p className="mt-6 text-3xl font-semibold tracking-tight">{value}</p>
      <p className="mt-1 text-sm font-medium">{label}</p>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}

function StatusItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-muted/50 p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-2 truncate text-sm font-semibold">{value}</p>
    </div>
  );
}

function Playbook({ icon: Icon, title, href }: { icon: typeof Users; title: string; href: string }) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-2xl border border-sidebar-border bg-sidebar-accent/60 p-3 transition hover:bg-sidebar-accent"
    >
      <span className="flex size-9 items-center justify-center rounded-xl bg-sidebar-primary/15 text-sidebar-primary">
        <Icon className="size-4" />
      </span>
      <span className="flex-1 text-sm font-medium">{title}</span>
      <ArrowUpRight className="size-4 opacity-50 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
    </Link>
  );
}
