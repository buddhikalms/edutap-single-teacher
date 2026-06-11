import { Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getPortalContext } from "@/lib/portal";
import { prisma } from "@/lib/prisma";

export default async function PortalNoticesPage() {
  const context = await getPortalContext();
  const notices = await prisma.notice.findMany({
    where: { instituteId: context.instituteId, recipients: { some: { studentId: { in: context.studentIds } } } },
    orderBy: { createdAt: "desc" },
    include: { classGroup: true, recipients: { include: { student: true } } }
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-normal">Notices</h2>
        <p className="mt-2 text-sm text-muted-foreground">Institute announcements, class notices, and teacher updates.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Inbox</CardTitle>
          <CardDescription>{notices.length} notices</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {notices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Bell className="mb-3 h-8 w-8 text-muted-foreground" />
              <p className="font-semibold">No notices yet</p>
            </div>
          ) : null}
          {notices.map((notice) => (
            <article key={notice.id} className="rounded-2xl border bg-white p-5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{notice.type}</Badge>
                <Badge variant="outline">{notice.classGroup?.name ?? notice.audience}</Badge>
                <span className="text-xs text-muted-foreground">{notice.createdAt.toLocaleString()}</span>
              </div>
              <h3 className="mt-4 text-lg font-semibold">{notice.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{notice.body}</p>
              <p className="mt-4 text-xs text-muted-foreground">
                For {notice.recipients.map((recipient) => `${recipient.student.firstName} ${recipient.student.lastName}`).join(", ")}
              </p>
            </article>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
