import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col flex-1 h-full w-full p-6">
      <Skeleton className="h-8 w-48 mb-2" />
      <Skeleton className="h-4 w-72 mb-6" />
      <Skeleton className="h-10 w-full max-w-lg mb-6" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-md" />
        ))}
      </div>
    </div>
  );
}
