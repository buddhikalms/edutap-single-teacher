import Link from "next/link";
import { BookOpen, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { getStudentWebContext } from "@/lib/student-web";

export default async function StudentCourses() {
  const { studentId, instituteId } = await getStudentWebContext();
  const now = new Date();
  const courses = await prisma.course.findMany({
    where: {
      instituteId,
      status: "PUBLISHED",
      OR: [
        { accessType: "FREE" },
        { enrollments: { some: { studentId, status: { in: ["ACTIVE", "COMPLETED"] } } } },
        { resources: { some: { OR: [{ visibility: "FREE_PREVIEW" }, { visibility: "SCHEDULED", publishAt: { lte: now }, accessType: "FREE" }] } } }
      ]
    },
    include: {
      subjectRecord: true,
      enrollments: { where: { studentId, status: { in: ["ACTIVE", "COMPLETED"] } }, take: 1 },
      _count: { select: { modules: true, resources: true } },
      resources: { where: { visibility: "FREE_PREVIEW" }, select: { id: true } }
    },
    orderBy: { createdAt: "desc" }
  });

  return (
    <div className="space-y-5">
      <h2 className="text-3xl font-semibold">My courses</h2>
      <p className="text-sm text-muted-foreground">Free previews are available before enrollment. Full lessons unlock after enrollment.</p>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {courses.map((course) => {
          const progress = Number(course.enrollments[0]?.progress ?? 0);
          const locked = course.accessType !== "FREE" && !course.enrollments[0];
          return (
            <Link href={`/student/courses/${course.id}`} key={course.id}>
              <Card className="h-full overflow-hidden transition hover:-translate-y-1">
                {course.thumbnailUrl ? (
                  <img src={course.thumbnailUrl} alt="" className="aspect-video w-full object-cover" />
                ) : (
                  <div className="flex aspect-video items-center justify-center bg-primary/10">
                    {locked ? <Lock className="h-12 w-12 text-primary" /> : <BookOpen className="h-12 w-12 text-primary" />}
                  </div>
                )}
                <CardContent className="p-5">
                  <div className="flex flex-wrap gap-2">
                    <Badge>{course.subjectRecord?.name}</Badge>
                    {locked && course.resources.length ? <Badge variant="success">Free preview</Badge> : null}
                  </div>
                  <h3 className="mt-3 text-xl font-semibold">{course.name}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{course._count.modules} modules, {course._count.resources} resources</p>
                  <div className="mt-4 h-2 rounded-full bg-muted"><div className="h-2 rounded-full bg-primary" style={{ width: `${progress}%` }} /></div>
                  <p className="mt-2 text-xs">{locked ? "Preview available. Enroll to unlock full content." : `${progress}% complete - ${course.accessType.toLowerCase()}`}</p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
