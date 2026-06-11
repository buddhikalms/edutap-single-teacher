import { Skeleton } from "@/components/ui/skeleton";

export default function TeachersLoading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-[520px] w-full" />
    </div>
  );
}
