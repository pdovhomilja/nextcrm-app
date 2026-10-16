import Link from "next/link";

import { VentureFutureSlot } from "@/components/ventures/VentureFutureSlot";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  name: string;
  slug: string;
  description: string | null;
  assignedSubdomain: string | null;
  gitRepositoryUrl: string | null;
  externalUrl: string | null;
  lifecycleStatus: string;
};

export function VentureDetailCard({
  name,
  slug,
  description,
  assignedSubdomain,
  gitRepositoryUrl,
  externalUrl,
  lifecycleStatus,
}: Props) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2">
            {name}
            <Badge variant="secondary">{slug}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-muted-foreground">{description ?? "—"}</p>
          <dl className="grid gap-2">
            <div>
              <dt className="font-medium text-foreground">Status</dt>
              <dd className="text-muted-foreground">{lifecycleStatus.replace(/_/g, " ")}</dd>
            </div>
            <div>
              <dt className="font-medium text-foreground">Assigned subdomain</dt>
              <dd className="text-muted-foreground">{assignedSubdomain ?? "—"}</dd>
            </div>
            <div>
              <dt className="font-medium text-foreground">Primary URL</dt>
              <dd>
                {externalUrl ? (
                  <Link href={externalUrl} className="text-primary underline-offset-4 hover:underline" target="_blank" rel="noreferrer">
                    {externalUrl}
                  </Link>
                ) : (
                  "—"
                )}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-foreground">Git repository</dt>
              <dd>
                {gitRepositoryUrl ? (
                  <Link
                    href={gitRepositoryUrl}
                    className="break-all text-primary underline-offset-4 hover:underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {gitRepositoryUrl}
                  </Link>
                ) : (
                  <span className="text-destructive">Required — set in venture settings</span>
                )}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>
      <VentureFutureSlot />
    </div>
  );
}
