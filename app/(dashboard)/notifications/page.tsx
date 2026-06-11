import { redirect } from "next/navigation";
import { NotificationCenter } from "@/components/notifications/notification-center";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { canAccess } from "@/lib/rbac";
import { getTenantContext } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export default async function NotificationsPage() {
  const context = await getTenantContext();

  if (!canAccess(context.role, "notifications")) {
    redirect("/dashboard");
  }

  const [classes, students, notices, logs] = await Promise.all([
    prisma.classGroup.findMany({
      where: { instituteId: context.instituteId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, code: true }
    }),
    prisma.student.findMany({
      where: { instituteId: context.instituteId },
      orderBy: { firstName: "asc" },
      include: { enrollments: { select: { classGroupId: true, active: true } } }
    }),
    prisma.notice.findMany({
      where: { instituteId: context.instituteId },
      orderBy: { createdAt: "desc" },
      take: 12,
      include: { _count: { select: { recipients: true } } }
    }),
    prisma.notificationLog.findMany({
      where: { instituteId: context.instituteId },
      orderBy: { createdAt: "desc" },
      take: 12,
      select: { id: true, title: true, channel: true, status: true, target: true, createdAt: true }
    })
  ]);

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-primary/10 bg-primary text-white">
        <CardHeader>
          <CardTitle className="text-2xl">Notification Center</CardTitle>
          <CardDescription className="text-white/70">
            Create notices, queue parent communications, and keep a delivery history for every family-facing message.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-2xl font-bold">{notices.length}</p>
              <p className="text-sm text-white/65">Recent notices</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-2xl font-bold">{logs.length}</p>
              <p className="text-sm text-white/65">Delivery logs</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-2xl font-bold">{students.length}</p>
              <p className="text-sm text-white/65">Reachable students</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <NotificationCenter
        classes={classes}
        students={students.map((student) => ({
          id: student.id,
          name: `${student.firstName} ${student.lastName}`,
          admissionNo: student.admissionNo,
          classGroupIds: student.enrollments.filter((enrollment) => enrollment.active).map((enrollment) => enrollment.classGroupId)
        }))}
        notices={notices.map((notice) => ({
          id: notice.id,
          title: notice.title,
          audience: notice.audience,
          type: notice.type,
          createdAt: notice.createdAt.toISOString(),
          count: notice._count.recipients
        }))}
        logs={logs.map((log) => ({
          id: log.id,
          title: log.title,
          channel: log.channel,
          status: log.status,
          target: log.target,
          createdAt: log.createdAt.toISOString()
        }))}
      />
    </div>
  );
}
