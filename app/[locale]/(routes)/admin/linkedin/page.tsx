import { Linkedin, ShieldCheck, Sparkles, Users, Building2, FileText } from "lucide-react";
import { getSession } from "@/lib/auth-server";
import { connectLinkedIn, getLinkedInSnapshot } from "./actions";
import LinkedInConnectButton from "./LinkedInConnectButton";

export default async function LinkedInPage({ searchParams }: { searchParams: Promise<{ connected?: string; organizationId?: string }> }) {
  const session = await getSession();
  const params = await searchParams;
  const connected = params.connected === "1";
  let snapshot: Awaited<ReturnType<typeof getLinkedInSnapshot>> | null = null;
  if (connected && params.organizationId && session?.user?.id) {
    try { snapshot = await getLinkedInSnapshot(params.organizationId); } catch { snapshot = null; }
  }

  return (
    <div className="min-h-full bg-background px-5 py-8 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="relative overflow-hidden rounded-[2rem] border border-border/70 bg-card p-7 shadow-sm sm:p-10">
          <div className="absolute -right-20 -top-24 size-72 rounded-full bg-primary/15 blur-3xl" />
          <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl space-y-5">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-[#0a66c2] text-white shadow-lg shadow-[#0a66c2]/20"><Linkedin /></div>
              <div><p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary">Social intelligence</p><h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">LinkedIn, inside your CRM.</h1></div>
              <p className="text-base leading-7 text-muted-foreground">Connect your own LinkedIn account to manage approved company pages, read organization posts, and bring social context into your sales workflow.</p>
            </div>
            <LinkedInConnectButton action={connectLinkedIn} />
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          {[{ icon: Building2, title: "Company pages", text: "See organizations you administer." }, { icon: FileText, title: "Posts & signals", text: "Review recent company content." }, { icon: Users, title: "CRM context", text: "Turn social signals into follow-ups." }].map(({ icon: Icon, title, text }) => <div key={title} className="rounded-3xl border border-border/70 bg-card/70 p-6"><Icon className="mb-8 text-primary" /><h2 className="font-semibold">{title}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p></div>)}
        </section>

        <section className="rounded-3xl border border-border/70 bg-card p-7 sm:p-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-xl font-semibold">Organization workspace</h2><p className="mt-1 text-sm text-muted-foreground">Enter the numeric LinkedIn organization ID to load approved data.</p></div><div className="flex items-center gap-2 text-xs text-emerald-600"><ShieldCheck className="size-4" /> Per-user OAuth</div></div>
          <form action="/en/admin/linkedin" method="get" className="mt-6 flex flex-col gap-3 sm:flex-row"><input name="organizationId" required inputMode="numeric" placeholder="Organization ID, e.g. 12345678" className="h-11 flex-1 rounded-xl border border-border bg-background px-4 text-sm outline-none ring-offset-background focus:ring-2 focus:ring-primary" /><button className="h-11 rounded-xl bg-primary px-5 text-sm font-medium text-primary-foreground transition hover:opacity-90">Load organization</button></form>
          <div className="mt-8 grid gap-4 sm:grid-cols-3"><Metric icon={Building2} label="Organizations" value={snapshot ? String((snapshot.organizations.elements ?? []).length) : "—"} /><Metric icon={FileText} label="Recent posts" value={snapshot ? String((snapshot.posts.elements ?? []).length) : "—"} /><Metric icon={Sparkles} label="Profile" value={snapshot?.profile ? "Connected" : "Awaiting sync"} /></div>
        </section>
      </div>
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof Building2; label: string; value: string }) { return <div className="rounded-2xl bg-muted/50 p-4"><Icon className="size-4 text-primary" /><p className="mt-5 text-2xl font-semibold">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div>; }
