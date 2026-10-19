import Link from "next/link";
import { redirect } from "next/navigation";
import Container from "../components/ui/Container";
import { getSession } from "@/lib/auth-server";
import { getUserAccessProfile } from "@/lib/vensai/user-access";
import { adminPortalVentureUrl, listVentureOptions } from "@/lib/vensai/venture-catalog";

export default async function VenturesPage() {
  const session = await getSession();
  if (!session?.user?.id) redirect("/sign-in");

  const profile = await getUserAccessProfile(session.user.id);
  const catalog = new Map(listVentureOptions().map((v) => [v.slug, v.label]));
  const slugs = profile?.ventureGrants.map((g) => g.ventureSlug) ?? [];

  return (
    <Container title="VenSai ventures" description="Admin Portal workspaces assigned to your account.">
      {!slugs.length ? (
        <p className="text-sm text-muted-foreground">
          No ventures assigned yet. Ask a CRM admin to grant access under Admin → Users.
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {slugs.map((slug) => (
            <li key={slug} className="rounded-lg border border-border bg-card p-4 shadow-sm">
              <p className="font-medium">{catalog.get(slug) ?? slug}</p>
              <p className="mt-1 font-mono text-xs text-muted-foreground">{slug}</p>
              <Link
                href={adminPortalVentureUrl(slug)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-block text-sm font-medium text-primary hover:underline"
              >
                Open in Admin Portal →
              </Link>
            </li>
          ))}
        </ul>
      )}
      {profile && !profile.crmEnabled ? (
        <p className="mt-6 text-sm text-amber-700">
          CRM modules are disabled for your account. You can still use assigned ventures above.
        </p>
      ) : null}
    </Container>
  );
}
