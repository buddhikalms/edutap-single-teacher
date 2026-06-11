import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function RecentActivity({
  activities
}: {
  activities: Array<{ title: string; detail: string; tone: "success" | "warning" | "outline" }>;
}) {
  return (
    <Card className="glass-panel">
      <CardHeader>
        <CardTitle>Recent activity</CardTitle>
        <CardDescription>Operational updates from attendance and billing.</CardDescription>
      </CardHeader>
      <CardContent>
        {activities.length ? (
          <div className="space-y-3">
            {activities.map((activity) => (
              <div key={`${activity.title}-${activity.detail}`} className="flex items-start justify-between gap-4 rounded-xl border bg-white/70 p-4">
                <div>
                  <p className="text-sm font-semibold">{activity.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{activity.detail}</p>
                </div>
                <Badge variant={activity.tone}>{activity.tone}</Badge>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed bg-white/60 p-8 text-center">
            <p className="font-semibold">No activity yet</p>
            <p className="mt-2 text-sm text-muted-foreground">Attendance, enrollments, and payments will appear here.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
