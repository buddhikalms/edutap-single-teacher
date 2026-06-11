import { Skeleton } from "@/components/ui/skeleton";

export default function AttendanceLoading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-36 w-full" />
      <div className="grid gap-4 xl:grid-cols-2">
        <Skeleton className="h-96" />
        <Skeleton className="h-96" />
      </div>
      <Skeleton className="h-[520px] w-full" />
    </div>
  );
}
