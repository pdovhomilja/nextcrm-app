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
import { connectLinkedIn, getLinkedInSnapshot } from "./actions";
import LinkedInConnectButton from "./LinkedInConnectButton";

type LinkedInPageProps = {
  searchParams: Promise<{ connected?: string; organizationId?: string }>;
};

export default async function LinkedInPage({ searchParams }: LinkedInPageProps) {
  const session = await getSession();
  const params = await searchParams;
  const connected = params.connected === "1";
  const connectFailed = params.connected === "error";
  let snapshot: Awaited<ReturnType<typeof getLinkedInSnapshot>> | null = null;

  if (connected && params.organizationId && session?.user?.id) {
    try {
      snapshot = await getLinkedInSnapshot(params.organizationId);
    } catch {
      snapshot = null;
    }
  }

  const organizations = snapshot?.organizations?.elements ?? [];
  const posts = snapshot?.posts?.elements ?? [];
  const profile = snapshot?.profile as { name?: string; email?: string } | null;

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
                  Move from social signal to qualified opportunity without leaving VenSai CRM. Manage company content, discover context, and turn every interaction into a follow-up.
                </p>
              </div>
            </div>
            <LinkedInConnectButton action={connectLinkedIn} />
          </div>
          {connectFailed ? (
            <p className="relative mt-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              LinkedIn authorization failed during the token exchange. In your LinkedIn app, add redirect URL{" "}
              <code className="font-mono text-xs">https://connect.vercel.com/callback</code>, then in Vercel Connect
              set the client ID and secret to match LinkedIn. For a confidential web app use token auth{" "}
              <strong>client_secret_post</strong> and turn PKCE off; if LinkedIn registered the app as public only, use{" "}
              <strong>none</strong> with PKCE enabled.
            </p>
          ) : null}
        </header>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric icon={Building2} label="Organizations" value={snapshot ? String(organizations.length) : "—"} detail="Administered pages" />
          <Metric icon={FileText} label="Content signals" value={snapshot ? String(posts.length) : "—"} detail="Recent company posts" />
          <Metric icon={Users} label="CRM-ready leads" value="—" detail="Enrich from approved data" />
          <Metric icon={Target} label="Active playbooks" value="4" detail="Prospect, nurture, close, retain" />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
          <div className="rounded-3xl border border-border/70 bg-card p-6 sm:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Workspace</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight">Your LinkedIn command center</h2>
                <p className="mt-2 text-sm text-muted-foreground">Load a company page to see its social activity and bring the context into your CRM.</p>
              </div>
              <div className="flex items-center gap-2 text-xs font-medium text-emerald-600"><ShieldCheck className="size-4" /> Per-user OAuth</div>
            </div>
            <form action="/en/admin/linkedin" method="get" className="mt-6 flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input name="organizationId" required inputMode="numeric" defaultValue={params.organizationId} placeholder="LinkedIn organization ID" className="h-12 w-full rounded-xl border border-border bg-background pl-11 pr-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20" />
              </div>
              <button className="h-12 rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground transition hover:opacity-90">Load workspace</button>
            </form>
            {connected && !snapshot ? <p className="mt-4 text-sm text-destructive">We could not load that organization. Confirm the ID and that your LinkedIn app has organization permissions.</p> : null}
            {snapshot ? <div className="mt-8 grid gap-3 sm:grid-cols-3"><StatusItem label="Identity" value={profile?.name ?? "Connected"} /><StatusItem label="Organizations" value={`${organizations.length} available`} /><StatusItem label="Content sync" value={`${posts.length} posts loaded`} /></div> : <div className="mt-8 rounded-2xl border border-dashed border-border bg-muted/20 p-8 text-center"><Sparkles className="mx-auto size-6 text-primary" /><p className="mt-3 font-medium">Connect LinkedIn to activate your workspace</p><p className="mt-1 text-sm text-muted-foreground">Your CRM keeps access scoped to the signed-in user.</p></div>}
          </div>

          <aside className="rounded-3xl border border-border/70 bg-sidebar p-6 text-sidebar-foreground sm:p-7">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sidebar-primary">Revenue playbooks</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight">Turn signals into next steps.</h2>
            <div className="mt-6 flex flex-col gap-3">
              <Playbook icon={Users} title="Qualify a lead" href="/en/crm/contacts" />
              <Playbook icon={MessageSquare} title="Plan outreach" href="/en/campaigns/targets" />
              <Playbook icon={Plus} title="Create a project" href="/en/crm/projects" />
            </div>
          </aside>
        </section>

        {snapshot ? <section className="rounded-3xl border border-border/70 bg-card p-6 sm:p-8"><div className="flex items-center justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Live intelligence</p><h2 className="mt-2 text-2xl font-semibold">Recent organization activity</h2></div><Link href="/en/campaigns/targets" className="hidden items-center gap-2 text-sm font-medium text-primary sm:flex">Open campaigns <ArrowUpRight className="size-4" /></Link></div><div className="mt-6 grid gap-3">{posts.slice(0, 5).map((post, index) => <div key={index} className="flex items-start gap-4 rounded-2xl border border-border/60 bg-muted/20 p-4"><div className="mt-1 flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><FileText className="size-4" /></div><div className="min-w-0"><p className="font-medium">Organization post {index + 1}</p><p className="mt-1 truncate text-sm text-muted-foreground">Review this signal and connect it to a lead, campaign, or project.</p></div><CheckCircle2 className="ml-auto mt-1 size-4 shrink-0 text-emerald-500" /></div>)}</div></section> : null}
      </div>
    </main>
  );
}

function Metric({ icon: Icon, label, value, detail }: { icon: typeof Building2; label: string; value: string; detail: string }) {
  return <div className="rounded-2xl border border-border/60 bg-card p-5"><div className="flex items-center justify-between"><Icon className="size-4 text-primary" /><span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Live</span></div><p className="mt-6 text-3xl font-semibold tracking-tight">{value}</p><p className="mt-1 text-sm font-medium">{label}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></div>;
}

function StatusItem({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl bg-muted/50 p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-2 truncate text-sm font-semibold">{value}</p></div>; }

function Playbook({ icon: Icon, title, href }: { icon: typeof Users; title: string; href: string }) { return <Link href={href} className="group flex items-center gap-3 rounded-2xl border border-sidebar-border bg-sidebar-accent/60 p-3 transition hover:bg-sidebar-accent"><span className="flex size-9 items-center justify-center rounded-xl bg-sidebar-primary/15 text-sidebar-primary"><Icon className="size-4" /></span><span className="flex-1 text-sm font-medium">{title}</span><ArrowUpRight className="size-4 opacity-50 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" /></Link>; }


