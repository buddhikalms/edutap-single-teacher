import Link from "next/link";
import { BookOpen, CalendarCheck, CreditCard, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getFamilyContext } from "@/lib/family";
import { prisma } from "@/lib/prisma";

export default async function FamilyDashboardPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const context = await getFamilyContext();
  const student = context.selectedStudent;
  const { view } = await searchParams;
  const studentView = view === "student";
  const [enrollments, attendance, payments, homework] = await Promise.all([
    prisma.enrollment.count({ where: { studentId: student.id, active: true } }),
    prisma.attendanceRecord.count({ where: { studentId: student.id } }),
    prisma.payment.count({ where: { studentId: student.id, status: { in: ["PENDING", "PARTIAL", "OVERDUE"] } } }),
    prisma.homework.count({ where: { classGroup: { enrollments: { some: { studentId: student.id, active: true } } } } })
  ]);
  const cards = [
    ["My classes", enrollments, "/family/students", GraduationCap],
    ["Attendance", attendance, "/family/attendance", CalendarCheck],
    ["Payments due", payments, "/family/payments", CreditCard],
    ["Homework", homework, "/family/homework", BookOpen]
  ] as const;
  return <div className="space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-sm font-semibold text-teal-700">{studentView ? "Student View" : "EduTap overview"}</p><h2 className="text-3xl font-semibold">{student.firstName} {student.lastName}</h2></div>
      <Button asChild variant="outline"><Link href={studentView ? "/family/dashboard" : "/family/dashboard?view=student"}>{studentView ? "Account View" : "Student View"}</Link></Button>
    </div>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{cards.map(([label, value, href, Icon]) => <Link href={href} key={label} className="rounded-2xl border bg-white p-5 shadow-sm"><Icon className="h-5 w-5 text-teal-700" /><p className="mt-4 text-2xl font-semibold">{value}</p><p className="text-sm text-muted-foreground">{label}</p></Link>)}</div>
    {studentView ? <div className="rounded-2xl border bg-white p-6"><h3 className="text-lg font-semibold">Learning workspace</h3><div className="mt-4 flex flex-wrap gap-2">
      {["classes", "courses", "homework", "quizzes", "attendance", "payments"].map((item) => <Button key={item} asChild variant="outline"><Link href={`/family/${item}`}>{item[0].toUpperCase() + item.slice(1)}</Link></Button>)}
    </div></div> : null}
  </div>;
}
