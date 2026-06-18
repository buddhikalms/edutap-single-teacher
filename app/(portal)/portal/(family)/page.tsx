import { Bell, CalendarCheck, CreditCard, GraduationCap } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getPortalContext } from "@/lib/portal";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";

export default async function ParentDashboardPage() {
  const context = await getPortalContext();

  const [attendance, pendingPayments, notices, enrollments] = await Promise.all([
    prisma.attendanceRecord.findMany({
      where: { studentId: { in: context.studentIds } },
      select: { status: true }
    }),
    prisma.payment.findMany({
      where: { studentId: { in: context.studentIds }, status: { in: ["PENDING", "PARTIAL", "OVERDUE"] } },
      select: { balance: true }
    }),
    prisma.notice.findMany({
      where: { instituteId: context.instituteId, recipients: { some: { studentId: { in: context.studentIds } } } },
      orderBy: { createdAt: "desc" },
      take: 4,
      include: { classGroup: { select: { name: true } } }
    }),
    prisma.enrollment.findMany({
      where: { studentId: { in: context.studentIds }, active: true },
      include: {
        student: { select: { firstName: true, lastName: true } },
        classGroup: { include: { course: true, teacher: true } }
      },
      take: 6
    })
  ]);

  const present = attendance.filter((record) => record.status === "PRESENT" || record.status === "LATE").length;
  const attendancePercentage = attendance.length > 0 ? Math.round((present / attendance.length) * 100) : 0;
  const pendingAmount = pendingPayments.reduce((total, payment) => total + Number(payment.balance), 0);

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-4">
        {[
          { label: "Attendance", value: `${attendancePercentage}%`, icon: CalendarCheck, tone: "bg-emerald-100 text-emerald-700" },
          { label: "Pending dues", value: formatCurrency(pendingAmount, context.currency), icon: CreditCard, tone: "bg-amber-100 text-amber-700" },
          { label: "Linked students", value: String(context.students.length), icon: GraduationCap, tone: "bg-sky-100 text-sky-700" },
          { label: "Recent notices", value: String(notices.length), icon: Bell, tone: "bg-violet-100 text-violet-700" }
        ].map((item) => (
          <Card key={item.label}>
            <CardContent className="flex items-center gap-4 p-5">
              <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${item.tone}`}>
                <item.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{item.value}</p>
                <p className="text-sm text-muted-foreground">{item.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <Card>
          <CardHeader>
            <CardTitle>Upcoming classes</CardTitle>
            <CardDescription>Active enrollments linked to your portal.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {enrollments.map((enrollment) => (
              <div key={enrollment.id} className="flex flex-col gap-3 rounded-2xl border bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold">{enrollment.classGroup.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {enrollment.student.firstName} {enrollment.student.lastName} · {enrollment.classGroup.schedule}
                  </p>
                  <p className="text-xs text-muted-foreground">{enrollment.classGroup.teacher?.name ?? "Teacher pending"}</p>
                </div>
                <Badge variant="outline">{formatCurrency(Number(enrollment.classGroup.course.fee), context.currency)}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent notices</CardTitle>
            <CardDescription>Latest family-facing updates.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {notices.length === 0 ? <p className="text-sm text-muted-foreground">No notices yet.</p> : null}
            {notices.map((notice) => (
              <div key={notice.id} className="rounded-2xl border bg-white p-4">
                <Badge variant="secondary">{notice.classGroup?.name ?? notice.audience}</Badge>
                <p className="mt-3 font-semibold">{notice.title}</p>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{notice.body}</p>
              </div>
            ))}
            <Button asChild variant="outline" className="w-full">
              <Link href="/portal/notices">View all notices</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
