import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, CreditCard, GraduationCap, MapPin, UserRound, UsersRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/session";
import { formatCurrency } from "@/lib/utils";

export default async function ClassProfilePage({ params }: { params: Promise<{ classGroupId: string }> }) {
  const { instituteId } = await getTenantContext();
  const { classGroupId } = await params;

  const classGroup = await prisma.classGroup.findFirst({
    where: { id: classGroupId, instituteId },
    include: {
      branch: true,
      course: true,
      teacher: true,
      enrollments: {
        include: {
          student: true
        },
        orderBy: { enrolledAt: "desc" }
      }
    }
  });

  if (!classGroup) {
    notFound();
  }

  const activeEnrollments = classGroup.enrollments.filter((enrollment) => enrollment.active);
  const usage = Math.min(100, Math.round((activeEnrollments.length / classGroup.capacity) * 100));

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="outline" size="sm">
          <Link href="/classes">
            <ArrowLeft className="h-4 w-4" />
            Classes
          </Link>
        </Button>
      </div>

      <section className="glass-panel rounded-2xl p-6 sm:p-8">
        <div className="flex flex-col justify-between gap-6 xl:flex-row xl:items-end">
          <div>
            <Badge variant="secondary">{classGroup.course.subject ?? classGroup.course.name}</Badge>
            <h2 className="mt-4 text-3xl font-semibold">{classGroup.name}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{classGroup.code} · {classGroup.course.grade ?? "Grade not set"}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Metric icon={UsersRound} label="Active students" value={String(activeEnrollments.length)} />
            <Metric icon={GraduationCap} label="Capacity" value={String(classGroup.capacity)} />
            <Metric icon={CreditCard} label="Fee" value={formatCurrency(classGroup.course.fee.toString())} />
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <Card className="glass-panel">
          <CardHeader>
            <CardTitle>Class details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Info icon={CalendarDays} label="Timetable" value={classGroup.schedule} />
            <Info icon={MapPin} label="Room" value={classGroup.room ?? "Not assigned"} />
            <Info icon={UserRound} label="Teacher" value={classGroup.teacher?.name ?? "Unassigned"} />
            <div className="rounded-xl border bg-white/70 p-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Utilization</span>
                <span className="font-semibold">{usage}%</span>
              </div>
              <div className="mt-3 h-2 rounded-full bg-muted">
                <div className="h-2 rounded-full bg-teal-600" style={{ width: `${usage}%` }} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-panel">
          <CardHeader>
            <CardTitle>Enrolled students</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {classGroup.enrollments.length ? (
              classGroup.enrollments.map((enrollment) => (
                <Link key={enrollment.id} href={`/students/${enrollment.student.id}`} className="block rounded-xl border bg-white/70 p-4 transition hover:bg-muted/40">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold">{enrollment.student.firstName} {enrollment.student.lastName}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{enrollment.student.admissionNo}</p>
                    </div>
                    <Badge variant={enrollment.active ? "success" : "outline"}>{enrollment.active ? "active" : "inactive"}</Badge>
                  </div>
                </Link>
              ))
            ) : (
              <div className="rounded-xl border border-dashed bg-white/60 p-8 text-center">
                <p className="font-semibold">No enrolled students</p>
                <p className="mt-1 text-sm text-muted-foreground">Use Enrollment to assign students to this class.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof UsersRound; label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-white/70 p-4">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <p className="mt-3 text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function Info({ icon: Icon, label, value }: { icon: typeof CalendarDays; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-white/70 p-4">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold">{value}</p>
      </div>
    </div>
  );
}
