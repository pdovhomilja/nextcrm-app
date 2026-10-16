import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/** Placeholder for upcoming venture modules (tasks, CI, releases). */
export function VentureFutureSlot() {
  return (
    <Card className="border-dashed bg-muted/20">
      <CardHeader>
        <CardTitle className="text-base">Tasks &amp; automation</CardTitle>
        <CardDescription>Reserved for a later release — not configured yet.</CardDescription>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        <ul className="list-inside list-disc space-y-1">
          <li>Venture-scoped tasks and milestones</li>
          <li>Git push / deploy hooks tied to this repository</li>
          <li>Release and provisioning run history</li>
        </ul>
      </CardContent>
    </Card>
  );
}
