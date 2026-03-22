import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import TableSkeleton from "./table-skeleton";

const CrmAccountsSkeleton = () => (
  <div className="flex-1 p-8 pt-6">
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-8 w-8" />
      </CardHeader>
      <Separator />
      <CardContent className="pt-4">
        <TableSkeleton />
      </CardContent>
    </Card>
  </div>
);

export default CrmAccountsSkeleton;
