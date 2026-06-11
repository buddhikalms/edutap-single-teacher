import { Skeleton } from "@/components/ui/skeleton";

export default function BillingLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-44 rounded-2xl" />
      <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <Skeleton className="h-96 rounded-xl" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    </div>
  );
}
