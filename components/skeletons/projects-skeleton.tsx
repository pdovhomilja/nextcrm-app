import { Skeleton } from "@/components/ui/skeleton";
import TableSkeleton from "./table-skeleton";

const ProjectsSkeleton = () => (
  <div className="flex-1 space-y-4 p-8 pt-6">
    <div>
      <Skeleton className="h-9 w-48" />
      <Skeleton className="h-4 w-72 mt-2" />
    </div>
    <div className="flex gap-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-9 w-28" />
      ))}
    </div>
    <Skeleton className="h-7 w-24" />
    <TableSkeleton />
  </div>
);

export default ProjectsSkeleton;
