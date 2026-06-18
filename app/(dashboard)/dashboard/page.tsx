import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { CalendarCheck2, CreditCard, DollarSign, UsersRound } from "lucide-react";
import { AttendanceStatus, PaymentStatus } from "@prisma/client";
import { AttendanceChart } from "@/components/dashboard/attendance-chart";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { StatCard } from "@/components/dashboard/stat-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (session?.user?.role === "SUPER_ADMIN") {
    redirect("/admin");
  }

  if (!session?.user?.instituteId) {
    redirect("/login");
  }

  const instituteId = session.user.instituteId;
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(startOfToday);
  endOfToday.setDate(endOfToday.getDate() + 1);
  const startOfMonth = new Date(startOfToday.getFullYear(), startOfToday.getMonth(), 1);

  const [totalStudents, todayRecords, presentToday, pendingPayments, monthlyIncome, recentPayments, recentAttendance, classGroups, settings] =
    await Promise.all([
      prisma.student.count({ where: { instituteId } }),
      prisma.attendanceRecord.count({
        where: {
          session: {
            sessionDate: {
              gte: startOfToday,
              lt: endOfToday
            },
            classGroup: { instituteId }
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
            classGroup: { instituteId }
          }
        }
      }),
      prisma.payment.aggregate({
        where: { instituteId, status: { in: [PaymentStatus.PENDING, PaymentStatus.OVERDUE, PaymentStatus.PARTIAL] } },
        _count: { _all: true },
        _sum: { amount: true }
      }),
      prisma.payment.aggregate({
        where: { instituteId, status: PaymentStatus.PAID, paidAt: { gte: startOfMonth } },
        _sum: { amount: true }
      }),
      prisma.payment.findMany({
        where: { instituteId },
        include: { student: true },
        orderBy: { createdAt: "desc" },
        take: 3
      }),
      prisma.attendanceRecord.findMany({
        where: {
          session: {
            classGroup: { instituteId }
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
        where: { instituteId },
        include: {
          course: true,
          teacher: true,
          _count: {
            select: { enrollments: true }
          }
        },
        take: 4
      }),
      prisma.instituteSettings.findUnique({ where: { instituteId }, select: { currency: true } })
    ]);
  const currency = settings?.currency ?? "USD";

  const attendanceRate = todayRecords === 0 ? "0%" : `${Math.round((presentToday / todayRecords) * 100)}%`;
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
            <Badge variant="secondary">Today’s executive overview</Badge>
            <h2 className="mt-4 text-3xl font-semibold tracking-normal sm:text-4xl">Good morning, {session.user.name?.split(" ")[0] ?? "Admin"}.</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              Monitor enrollment, attendance quality, fee collection, and class utilization from a single calm command center.
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
        <StatCard title="Total students" value={String(totalStudents)} helper="Synced across active branches" icon={UsersRound} />
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

      <section className="grid gap-4 xl:grid-cols-[1.35fr_0.85fr]">
        <RevenueChart />
        <AttendanceChart />
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <RecentActivity activities={activities} />
        <Card className="glass-panel" id="classes">
          <CardContent className="p-6">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h3 className="font-semibold">Class utilization</h3>
                <p className="mt-1 text-sm text-muted-foreground">Enrollment load against room capacity.</p>
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
                          {group.course.name} · {group.teacher?.name ?? "Unassigned"}
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
    </div>
  );
}
