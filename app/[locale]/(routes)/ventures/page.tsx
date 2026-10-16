import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";

import { listVentures } from "@/actions/ventures/list-ventures";
import { ROFYT_SLUG } from "@/lib/ventures/catalog";
import Container from "../components/ui/Container";
import { getSession } from "@/lib/auth-server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { VenturesLockButton } from "@/components/ventures/VenturesLockButton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function ventureHref(slug: string, kind: string) {
  if (slug === ROFYT_SLUG || kind === "rofyt") return "/ventures/rofyt";
  return `/ventures/${slug}`;
}

export default async function VenturesPage() {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  const role = session.user.role;
  if (role !== "admin" && role !== "manager") redirect("/");

  let ventures: Awaited<ReturnType<typeof listVentures>> = [];
  try {
    ventures = await listVentures();
  } catch {
    redirect("/");
  }

  return (
    <Container
      title="Ventures"
      description="All connected products. Open a card, or add a new venture."
    >
      <div className="mb-6 flex flex-wrap items-center justify-end gap-2">
        <VenturesLockButton />
        {role === "admin" ? (
          <Button asChild>
            <Link href="/ventures/new">
              <Plus className="mr-1 h-4 w-4" />
              Add venture
            </Link>
          </Button>
        ) : null}
      </div>

      {ventures.length === 0 ? (
        <p className="text-sm text-muted-foreground">No ventures yet.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {ventures.map((venture) => (
            <Link
              key={venture.id}
              href={ventureHref(venture.slug, venture.kind)}
              className="group block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Card className="h-full transition-colors group-hover:border-primary/40">
                <CardHeader>
                  <CardTitle className="flex items-start justify-between gap-3 text-base">
                    <span>{venture.name}</span>
                    <Badge variant="secondary" className="shrink-0 capitalize">
                      {venture.lifecycleStatus.replace(/_/g, " ")}
                    </Badge>
                  </CardTitle>
                  <CardDescription className="space-y-1">
                    <span className="block">
                      {venture.description ?? venture.assignedSubdomain ?? venture.slug}
                    </span>
                    <span className="block truncate text-xs">
                      {venture.gitRepositoryUrl ?? "Git repository not set"}
                    </span>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <span className="text-sm font-medium text-primary">Open</span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </Container>
  );
}
