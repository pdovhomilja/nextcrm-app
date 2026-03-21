import { Skeleton } from "@/components/ui/skeleton";

const SearchSkeleton = () => (
  <div className="flex-1 space-y-4 p-8 pt-6">
    <Skeleton className="h-10 w-full max-w-xl" />
    <div className="space-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="space-y-1 p-4 border rounded-lg">
          <Skeleton className="h-5 w-64" />
          <Skeleton className="h-4 w-full" />
        </div>
      ))}
    </div>
  </div>
);

export default SearchSkeleton;
