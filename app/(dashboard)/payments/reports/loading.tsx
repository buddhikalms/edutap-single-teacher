import { Skeleton } from "@/components/ui/skeleton";

export default function PaymentReportsLoading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-36 w-full" />
      <Skeleton className="h-80 w-full" />
      <div className="grid gap-4 md:grid-cols-3">
        <Skeleton className="h-96" />
        <Skeleton className="h-96" />
        <Skeleton className="h-96" />
      </div>
    </div>
  );
}
