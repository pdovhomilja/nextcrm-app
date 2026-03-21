import { Skeleton } from "@/components/ui/skeleton";

const TableSkeleton = () => (
  <div className="space-y-3">
    <div className="flex items-center justify-between">
      <Skeleton className="h-9 w-64" />
      <Skeleton className="h-9 w-24" />
    </div>
    <div className="flex gap-4 py-3 border-b">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-4 flex-1" />
      ))}
    </div>
    {Array.from({ length: 8 }).map((_, i) => (
      <div key={i} className="flex gap-4 py-3 border-b last:border-0">
        {Array.from({ length: 5 }).map((_, j) => (
          <Skeleton key={j} className="h-4 flex-1" />
        ))}
      </div>
    ))}
    <div className="flex items-center justify-end gap-2 pt-2">
      <Skeleton className="h-8 w-8" />
      <Skeleton className="h-8 w-8" />
      <Skeleton className="h-8 w-16" />
      <Skeleton className="h-8 w-8" />
      <Skeleton className="h-8 w-8" />
    </div>
  </div>
);

export default TableSkeleton;
