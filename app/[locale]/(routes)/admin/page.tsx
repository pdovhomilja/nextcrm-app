import Link from "next/link";
import { getSession } from "@/lib/auth-server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Coins,
  KeyRound,
  Mail,
  Settings,
  Users,
  FileText,
} from "lucide-react";

const ENV_HINTS = [
  { key: "DATABASE_URL", hint: "Postgres connection (Vercel / Neon)" },
  { key: "RESEND_API_KEY", hint: "Outbound + inbound email (Resend)" },
  { key: "AUTH_SECRET", hint: "Session encryption (NextAuth)" },
  { key: "MINIO_* / S3", hint: "File storage for documents & chat attachments" },
];

export default async function AdminPage() {
  const session = await getSession();
  if (session?.user?.role !== "admin") redirect("/");

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Administration</h1>
        <p className="text-sm text-muted-foreground">
          Org-wide settings, mailboxes, currencies, and integrations. Personal profile settings stay under your
          profile icon in the top bar.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Environment variables</CardTitle>
          <CardDescription>
            Set these in Vercel → Project → Settings → Environment Variables (not in the UI). Redeploy after
            changes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            {ENV_HINTS.map((row) => (
              <li key={row.key} className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
                <code className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-xs font-medium">{row.key}</code>
                <span className="text-muted-foreground">{row.hint}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <AdminLink href="/admin/email-accounts" icon={Mail} title="Email mailboxes" desc="Team inboxes, SMTP / Resend relay" />
        <AdminLink href="/admin/currencies" icon={Coins} title="Currencies & FX" desc="INR, USD, EUR rates & auto conversion" />
        <AdminLink href="/admin/users" icon={Users} title="Users & roles" desc="Who can access admin features" />
        <AdminLink href="/admin/llm-keys" icon={KeyRound} title="AI & API keys" desc="LLM and integration secrets" />
        <AdminLink href="/admin/crm-settings" icon={Settings} title="CRM settings" desc="Pipeline, defaults, modules" />
        <AdminLink href="/admin/invoices/settings" icon={FileText} title="Invoices & letterhead" desc="PDF branding (proposals / quotes next)" />
      </div>
    </div>
  );
}

function AdminLink({
  href,
  icon: Icon,
  title,
  desc,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
}) {
  return (
    <Link href={href}>
      <Card className="stat-card-hover h-full transition-colors hover:border-primary/30">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon className="h-4 w-4" />
            </span>
            <CardTitle className="text-base">{title}</CardTitle>
          </div>
          <CardDescription>{desc}</CardDescription>
        </CardHeader>
        <CardContent />
      </Card>
    </Link>
  );
}
