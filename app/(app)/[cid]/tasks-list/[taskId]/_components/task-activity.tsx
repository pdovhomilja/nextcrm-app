import { Card, CardContent } from "@/components/ui/card";

interface TaskActivityProps {
  history: Array<{
    id: string;
    description: string | null;
    createdAt: string | Date;
  }>;
}

export default function TaskActivity({ history }: TaskActivityProps) {
  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        {history.length === 0 ? (
          <div className="text-sm text-muted-foreground">No activity yet.</div>
        ) : (
          <ul className="space-y-3">
            {history.map((h) => (
              <li key={h.id} className="flex items-start gap-3">
                <div className="mt-1 h-2 w-2 rounded-full bg-primary" />
                <div className="flex-1">
                  <div className="text-sm">{h.description ?? "Update"}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(h.createdAt).toLocaleString()}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
