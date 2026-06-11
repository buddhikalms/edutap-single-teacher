import { Skeleton } from "@/components/ui/skeleton";

export default function NotificationsLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-56 rounded-2xl" />
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <Skeleton className="h-[620px] rounded-2xl" />
        <Skeleton className="h-[620px] rounded-2xl" />
      </div>
    </div>
  );
}
