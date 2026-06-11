import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function ReportMetricCard({
  title,
  value,
  helper,
  icon: Icon
}: {
  title: string;
  value: string;
  helper: string;
  icon: LucideIcon;
}) {
  return (
    <Card className="glass-panel overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="mt-2 text-3xl font-semibold">{value}</p>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-white">
            <Icon className="h-5 w-5" />
          </div>
        </div>
        <p className="mt-4 text-xs leading-5 text-muted-foreground">{helper}</p>
      </CardContent>
    </Card>
  );
}
