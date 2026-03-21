import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

const ReportsSkeleton = () => (
  <div className="flex-1 space-y-4 p-8 pt-6">
    <div>
      <Skeleton className="h-9 w-48" />
      <Skeleton className="h-4 w-72 mt-2" />
    </div>
    {Array.from({ length: 6 }).map((_, i) => (
      <Card key={i}>
        <CardHeader>
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-72 w-full" />
        </CardContent>
      </Card>
    ))}
  </div>
);

export default ReportsSkeleton;
