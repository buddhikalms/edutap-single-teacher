import { BookOpen, Clock, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getPortalContext } from "@/lib/portal";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";

export default async function PortalClassesPage() {
  const context = await getPortalContext();
  const enrollments = await prisma.enrollment.findMany({
    where: { studentId: { in: context.studentIds } },
    include: {
      student: true,
      classGroup: {
        include: {
          course: true,
          teacher: true,
          branch: true,
          _count: { select: { enrollments: true } }
        }
      }
    },
    orderBy: { enrolledAt: "desc" }
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-normal">Classes</h2>
        <p className="mt-2 text-sm text-muted-foreground">Courses, teachers, schedules, and enrollment status.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {enrollments.map((enrollment) => (
          <Card key={enrollment.id} className="overflow-hidden">
            <CardHeader className="border-b bg-white/70">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle>{enrollment.classGroup.name}</CardTitle>
                  <CardDescription>
                    {enrollment.student.firstName} {enrollment.student.lastName} · {enrollment.classGroup.course.name}
                  </CardDescription>
                </div>
                <Badge variant={enrollment.active ? "success" : "warning"}>{enrollment.active ? "Active" : "Inactive"}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-muted/45 p-4">
                  <Clock className="mb-2 h-4 w-4 text-primary" />
                  <p className="text-sm font-semibold">{enrollment.classGroup.schedule}</p>
                  <p className="text-xs text-muted-foreground">Timetable</p>
                </div>
                <div className="rounded-2xl bg-muted/45 p-4">
                  <UserRound className="mb-2 h-4 w-4 text-primary" />
                  <p className="text-sm font-semibold">{enrollment.classGroup.teacher?.name ?? "Teacher pending"}</p>
                  <p className="text-xs text-muted-foreground">Teacher</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{enrollment.classGroup.branch.name}</Badge>
                <Badge variant="outline">{enrollment.classGroup.course.grade ?? "All grades"}</Badge>
                <Badge variant="outline">{formatCurrency(Number(enrollment.classGroup.course.fee))}/month</Badge>
                <Badge variant="outline">{enrollment.classGroup._count.enrollments} enrolled</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {enrollments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <BookOpen className="mb-3 h-8 w-8 text-muted-foreground" />
            <p className="font-semibold">No classes linked yet</p>
            <p className="mt-1 text-sm text-muted-foreground">Class enrollments will appear here once the institute assigns them.</p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
