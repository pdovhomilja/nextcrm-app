import Link from "next/link";
import { redirect } from "next/navigation";

import { listVentures } from "@/actions/ventures/list-ventures";
import { BUILTIN_VENTURE_APPS } from "@/lib/ventures/catalog";
import Container from "../components/ui/Container";
import { getSession } from "@/lib/auth-server";
import { Button } from "@/components/ui/button";
import { VenturesLockButton } from "@/components/ventures/VenturesLockButton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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
      description="Connected products under VenSai Labs — Rofyt first, more apps over time."
    >
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Each venture can store its own admin login and encrypted <code className="text-xs">.env</code>.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <VenturesLockButton />
          {role === "admin" ? (
            <Button asChild>
              <Link href="/ventures/new">New venture</Link>
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {BUILTIN_VENTURE_APPS.map((app) => (
          <Card key={app.slug}>
            <CardHeader>
              <CardTitle>{app.name}</CardTitle>
              <CardDescription>{app.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="secondary" size="sm">
                <Link href={app.href}>Open {app.name}</Link>
              </Button>
            </CardContent>
          </Card>
        ))}

        {ventures
          .filter((v) => v.kind === "custom")
          .map((v) => (
            <Card key={v.id}>
              <CardHeader>
                <CardTitle>{v.name}</CardTitle>
                <CardDescription>{v.adminEmail ?? "No admin email yet"}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline" size="sm">
                  <Link href={`/ventures/${v.slug}`}>Manage</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
      </div>
    </Container>
  );
}
