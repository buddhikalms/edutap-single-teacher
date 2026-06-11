import type { LucideIcon } from "lucide-react";
import { ArrowUpRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({
  title,
  value,
  helper,
  icon: Icon,
  tone = "navy"
}: {
  title: string;
  value: string;
  helper: string;
  icon: LucideIcon;
  tone?: "navy" | "teal" | "gold" | "rose";
}) {
  const tones = {
    navy: "bg-primary text-white",
    teal: "bg-teal-600 text-white",
    gold: "bg-accent text-accent-foreground",
    rose: "bg-rose-600 text-white"
  };

  return (
    <Card className="glass-panel overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="mt-3 text-3xl font-semibold tracking-normal">{value}</p>
          </div>
          <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl", tones[tone])}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
        <div className="mt-5 flex items-center gap-2 text-sm text-muted-foreground">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <ArrowUpRight className="h-3.5 w-3.5" />
          </span>
          {helper}
        </div>
      </CardContent>
    </Card>
  );
}
