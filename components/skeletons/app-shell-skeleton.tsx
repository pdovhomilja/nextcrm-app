import { Skeleton } from "@/components/ui/skeleton";

const AppShellSkeleton = () => (
  <div className="flex h-screen w-full">
    <div className="w-64 border-r p-4 space-y-4 flex-shrink-0">
      <Skeleton className="h-8 w-32" />
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-full" />
        ))}
      </div>
    </div>
    <div className="flex-1 flex flex-col">
      <div className="border-b p-4">
        <Skeleton className="h-8 w-48" />
      </div>
      <div className="flex-1 p-8 space-y-4">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-4 w-96" />
        <Skeleton className="h-96 w-full" />
      </div>
    </div>
  </div>
);

export default AppShellSkeleton;
