import { Skeleton } from "@/components/ui/skeleton";
import TableSkeleton from "./table-skeleton";

const DocumentsSkeleton = () => (
  <div className="flex-1 space-y-4 p-8 pt-6">
    <div>
      <Skeleton className="h-9 w-48" />
      <Skeleton className="h-4 w-72 mt-2" />
    </div>
    <div className="flex gap-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-9 w-32" />
      ))}
    </div>
    <TableSkeleton />
  </div>
);

export default DocumentsSkeleton;
