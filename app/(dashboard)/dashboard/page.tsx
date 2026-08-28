import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { BellRing, BookOpenCheck, CalendarCheck2, CreditCard, DollarSign, Radio, UsersRound } from "lucide-react";
import { AttendanceStatus, PaymentStatus, Prisma } from "@prisma/client";
import { AttendanceChart } from "@/components/dashboard/attendance-chart";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { StatCard } from "@/components/dashboard/stat-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";

function monthStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (session?.user?.role === "SUPER_ADMIN") {
    redirect("/admin");
  }

  if (!session?.user?.instituteId) {
    redirect("/login");
  }

  const instituteId = session.user.instituteId;
  const teacher = session.user.role === "TEACHER"
    ? await prisma.teacher.findFirst({ where: { userId: session.user.id, instituteId }, select: { id: true } })
    : null;

  if (session.user.role === "TEACHER" && !teacher) {
    redirect("/login");
  }

  const teacherId = teacher?.id ?? null;
  const classGroupScope: Prisma.ClassGroupWhereInput = teacherId ? { teacherId } : {};
  const attendanceSessionScope: Prisma.AttendanceSessionWhereInput = { classGroup: { instituteId, ...classGroupScope } };
  const teacherStudentWhere: Prisma.StudentWhereInput = teacherId
    ? {
        instituteId,
        OR: [
          { enrollments: { some: { classGroup: { teacherId } } } },
          { courseEnrollments: { some: { course: { teacherId } } } }
        ]
      }
    : { instituteId };
  const paymentScope: Prisma.PaymentWhereInput = teacherId
    ? { instituteId, OR: [{ classGroup: { teacherId } }, { course: { teacherId } }] }
    : { instituteId };
  const homeworkReviewScope: Prisma.HomeworkSubmissionWhereInput = teacherId
    ? { instituteId, homework: { OR: [{ classGroup: { teacherId } }, { course: { teacherId } }] } }
    : { instituteId };
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(startOfToday);
  endOfToday.setDate(endOfToday.getDate() + 1);
  const startOfMonth = new Date(startOfToday.getFullYear(), startOfToday.getMonth(), 1);
  const trendStart = monthStart(new Date(startOfToday.getFullYear(), startOfToday.getMonth() - 5, 1));
  const trendMonths = Array.from({ length: 6 }, (_, index) => monthStart(new Date(trendStart.getFullYear(), trendStart.getMonth() + index, 1)));

  const [
    totalStudents,
    todayRecords,
    presentToday,
    lateToday,
    absentToday,
    excusedToday,
    pendingPayments,
    monthlyIncome,
    incomeTrendPayments,
    recentPayments,
    recentAttendance,
    classGroups,
    settings,
    homeworkReview,
    upcomingLive,
    parentAlerts
  ] =
    await Promise.all([
      prisma.student.count({ where: teacherStudentWhere }),
      prisma.attendanceRecord.count({
        where: {
          session: {
            sessionDate: {
              gte: startOfToday,
              lt: endOfToday
            },
            ...attendanceSessionScope
          }
        }
      }),
      prisma.attendanceRecord.count({
        where: {
          status: AttendanceStatus.PRESENT,
          session: {
            sessionDate: {
              gte: startOfToday,
              lt: endOfToday
            },
            ...attendanceSessionScope
          }
        }
      }),
      prisma.attendanceRecord.count({
        where: {
          status: AttendanceStatus.LATE,
          session: {
            sessionDate: {
              gte: startOfToday,
              lt: endOfToday
            },
            ...attendanceSessionScope
          }
        }
      }),
      prisma.attendanceRecord.count({
        where: {
          status: AttendanceStatus.ABSENT,
          session: {
            sessionDate: {
              gte: startOfToday,
              lt: endOfToday
            },
            ...attendanceSessionScope
          }
        }
      }),
      prisma.attendanceRecord.count({
        where: {
          status: AttendanceStatus.EXCUSED,
          session: {
            sessionDate: {
              gte: startOfToday,
              lt: endOfToday
            },
            ...attendanceSessionScope
          }
        }
      }),
      prisma.payment.aggregate({
        where: { ...paymentScope, status: { in: [PaymentStatus.PENDING, PaymentStatus.OVERDUE, PaymentStatus.PARTIAL] } },
        _count: { _all: true },
        _sum: { amount: true }
      }),
      prisma.payment.aggregate({
        where: { ...paymentScope, status: PaymentStatus.PAID, paidAt: { gte: startOfMonth } },
        _sum: { amount: true }
      }),
      prisma.payment.findMany({
        where: {
          ...paymentScope,
          status: PaymentStatus.PAID,
          paidAt: {
            not: null,
            gte: trendStart
          }
        },
        select: { amount: true, paidAt: true }
      }),
      prisma.payment.findMany({
        where: paymentScope,
        include: { student: true },
        orderBy: { createdAt: "desc" },
        take: 3
      }),
      prisma.attendanceRecord.findMany({
        where: {
          session: {
            ...attendanceSessionScope
          }
        },
        include: {
          student: true,
          session: {
            include: {
              classGroup: true
            }
          }
        },
        orderBy: { markedAt: "desc" },
        take: 2
      }),
      prisma.classGroup.findMany({
        where: { instituteId, ...classGroupScope },
        include: {
          subject: true,
          teacher: true,
          _count: {
            select: { enrollments: true }
          }
        },
        take: 4
      }),
      prisma.instituteSettings.findUnique({ where: { instituteId }, select: { currency: true } }),
      prisma.homeworkSubmission.count({ where: { ...homeworkReviewScope, status: { in: ["SUBMITTED", "LATE"] } } }),
      prisma.liveClass.findMany({
        where: { instituteId, ...(teacherId ? { OR: [{ teacherId }, { classGroup: { teacherId } }] } : {}), status: "PUBLISHED", startTime: { gte: new Date() } },
        include: { classGroup: true },
        orderBy: { startTime: "asc" },
        take: 3
      }),
      prisma.notificationLog.findMany({
        where: { instituteId, parentId: { not: null }, ...(teacherId ? { student: teacherStudentWhere } : {}) },
        include: { parent: true, student: true },
        orderBy: { createdAt: "desc" },
        take: 4
      })
    ]);
  const currency = settings?.currency ?? "USD";

  const attendanceRate = todayRecords === 0 ? "0%" : `${Math.round((presentToday / todayRecords) * 100)}%`;
  const incomeByMonth = new Map(trendMonths.map((date) => [monthKey(date), 0]));
  for (const payment of incomeTrendPayments) {
    if (payment.paidAt) {
      const key = monthKey(payment.paidAt);
      incomeByMonth.set(key, (incomeByMonth.get(key) ?? 0) + Number(payment.amount));
    }
  }
  const incomeTrend = trendMonths.map((date) => ({
    month: date.toLocaleString("en-US", { month: "short" }),
    income: incomeByMonth.get(monthKey(date)) ?? 0
  }));
  const attendanceMix = [
    { name: "Present", value: presentToday, color: "#0f766e" },
    { name: "Late", value: lateToday, color: "#d97706" },
    { name: "Absent", value: absentToday, color: "#e11d48" },
    { name: "Excused", value: excusedToday, color: "#64748b" }
  ];
  const activities = [
    ...recentPayments.map((payment) => ({
      title: `${payment.student.firstName} ${payment.student.lastName} invoice ${payment.invoiceNo}`,
      detail: `${payment.status.toLowerCase()} payment of ${formatCurrency(payment.amount.toString(), currency)}`,
      tone: payment.status === PaymentStatus.PAID ? ("success" as const) : ("warning" as const)
    })),
    ...recentAttendance.map((record) => ({
      title: `${record.student.firstName} ${record.student.lastName} marked ${record.status.toLowerCase()}`,
      detail: record.session.classGroup.name,
      tone: "outline" as const
    }))
  ].slice(0, 5);

  return (
    <div className="space-y-6">
      <section className="glass-panel overflow-hidden rounded-2xl p-6 sm:p-8">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <Badge variant="secondary">Today&apos;s teaching overview</Badge>
            <h2 className="mt-4 text-3xl font-semibold tracking-normal sm:text-4xl">Good morning, {session.user.name?.split(" ")[0] ?? "Admin"}.</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              Your classes, arrivals, learning reviews, payments, and parent communication in one calm command center.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:min-w-[320px]">
            <div className="rounded-xl border bg-white/70 p-4">
              <p className="text-xs text-muted-foreground">Active classes</p>
              <p className="mt-2 text-2xl font-semibold">{classGroups.length}</p>
            </div>
            <div className="rounded-xl border bg-white/70 p-4">
              <p className="text-xs text-muted-foreground">Attendance rate</p>
              <p className="mt-2 text-2xl font-semibold">{attendanceRate}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Students" value={String(totalStudents)} helper="Active learner records" icon={UsersRound} />
        <StatCard title="Today attendance" value={attendanceRate} helper={`${presentToday} present from ${todayRecords} marks`} icon={CalendarCheck2} tone="teal" />
        <StatCard
          title="Pending payments"
          value={formatCurrency(pendingPayments._sum.amount?.toString() ?? 0, currency)}
          helper={`${pendingPayments._count._all} invoices need attention`}
          icon={CreditCard}
          tone="gold"
        />
        <StatCard title="Monthly income" value={formatCurrency(monthlyIncome._sum.amount?.toString() ?? 0, currency)} helper="Collected this month" icon={DollarSign} tone="rose" />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Link href="/attendance" className="rounded-2xl bg-primary p-6 text-white shadow-luxury transition hover:-translate-y-0.5">
          <CalendarCheck2 className="h-7 w-7" />
          <p className="mt-5 text-xl font-semibold">Open attendance terminal</p>
          <p className="mt-2 text-sm text-white/70">Scan NFC or QR, or search by student ID.</p>
        </Link>
        <Link href="/homework" className="glass-panel rounded-2xl p-6 transition hover:-translate-y-0.5">
          <BookOpenCheck className="h-7 w-7 text-primary" />
          <p className="mt-5 text-xl font-semibold">{homeworkReview} submissions to review</p>
          <p className="mt-2 text-sm text-muted-foreground">Mark work, leave feedback, or request resubmission.</p>
        </Link>
        <Link href="/live-classes" className="glass-panel rounded-2xl p-6 transition hover:-translate-y-0.5">
          <Radio className="h-7 w-7 text-primary" />
          <p className="mt-5 text-xl font-semibold">{upcomingLive.length} upcoming live classes</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {upcomingLive[0] ? `${upcomingLive[0].title} · ${upcomingLive[0].startTime.toLocaleString()}` : "Schedule Zoom, Google Meet, or an external link."}
          </p>
        </Link>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.35fr_0.85fr]">
        <RevenueChart data={incomeTrend} currency={currency} />
        <AttendanceChart data={attendanceMix} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <RecentActivity activities={activities} />
        <Card className="glass-panel" id="classes">
          <CardContent className="p-6">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h3 className="font-semibold">Class utilization</h3>
                <p className="mt-1 text-sm text-muted-foreground">Today&apos;s class list and enrollment load.</p>
              </div>
              <Badge variant="outline">Live model</Badge>
            </div>
            <div className="space-y-4">
              {classGroups.map((group) => {
                const usage = Math.min(100, Math.round((group._count.enrollments / group.capacity) * 100));
                return (
                  <div key={group.id} className="rounded-xl border bg-white/70 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold">{group.name}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {group.subject.name} · {group.schedule}
                        </p>
                      </div>
                      <p className="text-sm font-semibold">{usage}%</p>
                    </div>
                    <div className="mt-4 h-2 rounded-full bg-muted">
                      <div className="h-2 rounded-full bg-teal-600" style={{ width: `${usage}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </section>

      <Card className="glass-panel">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Recent parent alerts</h3>
              <p className="mt-1 text-sm text-muted-foreground">Arrival, class-ended, payment, homework, and quiz messages.</p>
            </div>
            <BellRing className="h-5 w-5 text-primary" />
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {parentAlerts.map((alert) => (
              <div key={alert.id} className="rounded-xl border bg-white/70 p-4">
                <p className="font-semibold">{alert.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {alert.parent?.name ?? "Parent"}{alert.student ? ` · ${alert.student.firstName} ${alert.student.lastName}` : ""}
                </p>
              </div>
            ))}
            {!parentAlerts.length ? <p className="text-sm text-muted-foreground">Parent alerts will appear here after messages are sent.</p> : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

