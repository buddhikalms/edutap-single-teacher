import Link from "next/link";
import { Bell, BookOpen, CalendarCheck, CreditCard, GraduationCap, Radio } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { getStudentWebContext } from "@/lib/student-web";
import { formatCurrency } from "@/lib/utils";

export default async function StudentDashboard() {
  const { studentId, instituteId, currency } = await getStudentWebContext();
  const now = new Date();
  const [
    classes,
    courses,
    homework,
    quizzes,
    payments,
    attendance,
    notifications,
    unreadNotifications,
    live,
    resources
  ] = await Promise.all([
    prisma.enrollment.findMany({
      where: { studentId, active: true },
      include: { classGroup: { include: { subject: true, branch: true } } },
      take: 4
    }),
    prisma.courseEnrollment.findMany({
      where: { studentId, status: { in: ["ACTIVE", "COMPLETED"] } },
      include: { course: { include: { subjectRecord: true } } },
      take: 4
    }),
    prisma.homeworkSubmission.findMany({
      where: { studentId, status: { in: ["PENDING", "LATE"] } },
      include: { homework: true },
      take: 4
    }),
    prisma.quiz.findMany({
      where: {
        status: "PUBLISHED",
        endsAt: { gte: now },
        OR: [
          { classGroup: { enrollments: { some: { studentId, active: true } } } },
          { course: { enrollments: { some: { studentId, status: { in: ["ACTIVE", "COMPLETED"] } } } } }
        ]
      },
      orderBy: { startsAt: "asc" },
      take: 4
    }),
    prisma.payment.findMany({
      where: { studentId, status: { in: ["PENDING", "PARTIAL", "OVERDUE"] } },
      orderBy: { dueDate: "asc" },
      take: 5
    }),
    prisma.attendanceRecord.findMany({ where: { studentId }, select: { status: true } }),
    prisma.notification.findMany({ where: { studentId, instituteId }, orderBy: { createdAt: "desc" }, take: 4 }),
    prisma.notification.count({ where: { studentId, instituteId, status: "UNREAD" } }),
    prisma.liveClass.findMany({
      where: { status: "PUBLISHED", endTime: { gte: now }, classGroup: { enrollments: { some: { studentId, active: true } } } },
      orderBy: { startTime: "asc" },
      take: 2
    }),
    prisma.courseResource.findMany({
      where: {
        instituteId,
        course: {
          status: "PUBLISHED",
          OR: [{ accessType: "FREE" }, { enrollments: { some: { studentId, status: { in: ["ACTIVE", "COMPLETED"] } } } }]
        }
      },
      include: { course: true },
      orderBy: { createdAt: "desc" },
      take: 4
    })
  ]);
  const pct = attendance.length ? Math.round((attendance.filter((item) => item.status === "PRESENT" || item.status === "LATE").length / attendance.length) * 100) : 0;
  const due = payments.reduce((total, payment) => total + Number(payment.balance), 0);

  return (
    <div className="space-y-5">
      <div>
        <Badge variant="secondary">My learning</Badge>
        <h2 className="mt-3 text-3xl font-semibold">Dashboard</h2>
      </div>
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric icon={CalendarCheck} label="Classes" value={classes.length} />
        <Metric icon={GraduationCap} label="Courses" value={courses.length} />
        <Metric icon={BookOpen} label="Homework" value={homework.length} />
        <Metric icon={CreditCard} label="Pending" value={formatCurrency(due, currency)} />
      </section>
      {live.map((item) => (
        <Card key={item.id} className="border-primary bg-primary text-white">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-white/70">Upcoming live class</p>
              <h3 className="mt-1 font-semibold">{item.title}</h3>
              <p className="text-xs text-white/60">{item.startTime.toLocaleString()}</p>
            </div>
            <Button asChild className="bg-white text-primary">
              <a href={item.joinUrl ?? item.meetingUrl} target="_blank">
                <Radio />
                Join
              </a>
            </Button>
          </CardContent>
        </Card>
      ))}
      <section className="grid gap-4 lg:grid-cols-2">
        <List
          title="Today's schedule"
          href="/student/classes"
          rows={classes
            .filter((item) => item.classGroup.schedule.toLowerCase().includes(now.toLocaleDateString("en-US", { weekday: "short" }).toLowerCase()))
            .map((item) => ({ title: item.classGroup.name, detail: item.classGroup.schedule }))}
        />
        <List title="My classes" href="/student/classes" rows={classes.map((item) => ({ title: item.classGroup.name, detail: `${item.classGroup.subject.name} - ${item.classGroup.schedule}` }))} />
        <List title="My courses" href="/student/courses" rows={courses.map((item) => ({ title: item.course.name, detail: `${Number(item.progress)}% complete` }))} />
        <List title="Pending homework" href="/student/homework" rows={homework.map((item) => ({ title: item.homework.title, detail: `Due ${item.homework.deadline.toLocaleDateString()}` }))} />
        <List title="Upcoming quizzes" href="/student/quizzes" rows={quizzes.map((item) => ({ title: item.title, detail: item.endsAt.toLocaleString() }))} />
        <List title={`Attendance - ${pct}%`} href="/student/attendance" rows={classes.map((item) => ({ title: item.classGroup.name, detail: "View attendance history" }))} />
        <List title="Recent resources" href="/student/resources" rows={resources.map((item) => ({ title: item.title, detail: item.course.name }))} />
        <List
          title={`Latest notifications${unreadNotifications > 0 ? ` (${unreadNotifications} unread)` : ""}`}
          href="/student/notifications"
          rows={notifications.map((item) => ({ title: item.title, detail: item.message }))}
        />
      </section>
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof Bell; label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="p-4">
        <Icon className="h-5 w-5 text-primary" />
        <p className="mt-3 text-xs text-muted-foreground">{label}</p>
        <p className="text-xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}

function List({ title, href, rows }: { title: string; href: string; rows: { title: string; detail: string }[] }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex justify-between">
          <h3 className="font-semibold">{title}</h3>
          <Link href={href} className="text-xs text-primary">
            View all
          </Link>
        </div>
        <div className="mt-4 space-y-3">
          {rows.length ? (
            rows.map((row, index) => (
              <div key={index} className="rounded-xl bg-muted/50 p-3">
                <p className="text-sm font-semibold">{row.title}</p>
                <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{row.detail}</p>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">Nothing here yet.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
