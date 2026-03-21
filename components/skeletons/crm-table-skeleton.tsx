import { Skeleton } from "@/components/ui/skeleton";
import TableSkeleton from "./table-skeleton";

const CrmTableSkeleton = () => (
  <div className="flex-1 space-y-4 p-8 pt-6">
    <div>
      <Skeleton className="h-9 w-48" />
      <Skeleton className="h-4 w-72 mt-2" />
    </div>
    <TableSkeleton />
  </div>
);

export default CrmTableSkeleton;
