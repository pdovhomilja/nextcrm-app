import { Skeleton } from "@/components/ui/skeleton";

const EmailsSkeleton = () => (
  <div className="flex h-full">
    <div className="w-64 border-r flex flex-col flex-shrink-0">
      <div className="p-3 border-b">
        <Skeleton className="h-8 w-full" />
      </div>
      <div className="flex-1 p-2 space-y-1">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="p-2 space-y-1">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-12" />
            </div>
            <Skeleton className="h-3 w-40" />
            <Skeleton className="h-3 w-full" />
          </div>
        ))}
      </div>
    </div>
    <div className="flex-1 p-6 space-y-4">
      <div className="space-y-2">
        <Skeleton className="h-7 w-96" />
        <div className="flex gap-2 items-center">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-4 w-4/6" />
    </div>
  </div>
);

export default EmailsSkeleton;
