"use client";
import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ActivityEntry } from "./ActivityEntry";
import { ActivityForm } from "./ActivityForm";
import { getActivitiesByEntity } from "@/actions/crm/activities/get-activities-by-entity";
import type {
  ActivityWithLinks,
  ActivityCursor,
} from "@/actions/crm/activities/get-activities-by-entity";

interface Props {
  entityType: string;
  entityId: string;
  initialData: { data: ActivityWithLinks[]; nextCursor: ActivityCursor | null };
}

export function ActivitiesView({ entityType, entityId, initialData }: Props) {
  const [activities, setActivities] = useState<ActivityWithLinks[]>(initialData.data);
  const [cursor, setCursor] = useState<ActivityCursor | null>(initialData.nextCursor);
  const [createOpen, setCreateOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const loadMore = () => {
    if (!cursor) return;
    startTransition(async () => {
      const result = await getActivitiesByEntity(entityType, entityId, cursor);
      setActivities((prev) => [...prev, ...result.data]);
      setCursor(result.nextCursor);
    });
  };

  const handleCreated = (activity: ActivityWithLinks) => {
    setActivities((prev) => [activity, ...prev]);
  };

  const handleUpdated = (updated: ActivityWithLinks) => {
    setActivities((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
  };

  const handleDeleted = (id: string) => {
    setActivities((prev) => prev.filter((a) => a.id !== id));
  };

  return (
    <TooltipProvider>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between py-3">
          <CardTitle className="text-base">Activities</CardTitle>
          <Button size="sm" variant="outline" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Log activity
          </Button>
        </CardHeader>
        <CardContent className="pt-0">
          {activities.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No activities yet. Log a call, meeting, or note.
            </p>
          ) : (
            <>
              {activities.map((activity) => (
                <ActivityEntry
                  key={activity.id}
                  activity={activity}
                  entityType={entityType}
                  entityId={entityId}
                  onDeleted={handleDeleted}
                  onUpdated={handleUpdated}
                />
              ))}
              {cursor && (
                <div className="flex justify-center pt-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={loadMore}
                    disabled={isPending}
                  >
                    {isPending ? "Loading..." : "Load more"}
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>

        <ActivityForm
          open={createOpen}
          onOpenChange={setCreateOpen}
          entityType={entityType}
          entityId={entityId}
          onSaved={handleCreated}
        />
      </Card>
    </TooltipProvider>
  );
}
