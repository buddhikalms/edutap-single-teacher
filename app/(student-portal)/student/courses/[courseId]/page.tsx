import { notFound } from "next/navigation";
import { Lock, PlayCircle } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { updateCourseProgress } from "@/app/(student-portal)/student/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { getStudentWebContext } from "@/lib/student-web";

export default async function CoursePlayer({ params, searchParams }: { params: Promise<{ courseId: string }>; searchParams: Promise<{ resource?: string }> }) {
  const { courseId } = await params;
  const { resource: resourceId } = await searchParams;
  const { student, studentId, instituteId } = await getStudentWebContext();
  const now = new Date();
  const publishedResourceWhere: Prisma.CourseResourceWhereInput = {
    OR: [
      { visibility: { in: ["FREE_PREVIEW", "ENROLLED"] } },
      { visibility: "SCHEDULED", publishAt: { lte: now } }
    ]
  };
  const course = await prisma.course.findFirst({
    where: { id: courseId, instituteId, status: "PUBLISHED" },
    include: {
      modules: {
        include: {
          resources: { where: publishedResourceWhere, orderBy: { sortOrder: "asc" } },
          quizzes: true
        },
        orderBy: { sortOrder: "asc" }
      },
      resources: { where: { moduleId: null, ...publishedResourceWhere }, orderBy: { sortOrder: "asc" } },
      enrollments: { where: { studentId, status: { in: ["ACTIVE", "COMPLETED"] } }, take: 1 }
    }
  });

  if (!course) notFound();

  const allResources = [...course.resources, ...course.modules.flatMap((module) => module.resources)];
  const active = allResources.find((item) => item.id === resourceId) ?? allResources[0];
  const unlocked = course.accessType === "FREE" || Boolean(course.enrollments[0]);
  const accessible = Boolean(active && (active.visibility === "FREE_PREVIEW" || active.accessType === "FREE" || unlocked));

  return (
    <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
      <aside className="rounded-2xl border bg-white p-4">
        <h2 className="text-xl font-semibold">{course.name}</h2>
        {course.modules.map((module) => (
          <div key={module.id}>
            <p className="mt-4 text-xs font-semibold uppercase text-muted-foreground">{module.title}</p>
            {module.resources.map((item) => (
              <a href={`?resource=${item.id}`} key={item.id} className="mt-1 flex justify-between rounded-lg p-2 text-sm hover:bg-muted">
                <span>{item.title}</span>
                {item.visibility !== "FREE_PREVIEW" && !unlocked ? <Lock className="h-4 w-4" /> : null}
              </a>
            ))}
            {unlocked
              ? module.quizzes.map((quiz) => (
                  <a href="/student/quizzes" key={quiz.id} className="mt-1 block rounded-lg bg-primary/10 p-2 text-sm text-primary">
                    Quiz - {quiz.title}
                  </a>
                ))
              : null}
          </div>
        ))}
      </aside>
      <main>
        <Card className="relative overflow-hidden">
          <CardContent className="min-h-[520px] p-6">
            {active ? (
              accessible ? (
                <div>
                  <Badge>{active.resourceType.replaceAll("_", " ")}</Badge>
                  {active.visibility === "FREE_PREVIEW" ? <Badge variant="success" className="ml-2">Free preview</Badge> : null}
                  <h1 className="mt-3 text-2xl font-semibold">{active.title}</h1>
                  <p className="mt-2 text-sm text-muted-foreground">{active.description}</p>
                  {["VIDEO", "RECORDING", "YOUTUBE", "SECURE_VIDEO"].includes(active.resourceType) ? (
                    <div className="mt-6 flex aspect-video items-center justify-center rounded-xl bg-slate-950 text-white">
                      <PlayCircle className="h-16 w-16" />
                    </div>
                  ) : null}
                  {active.externalUrl ? <a href={active.externalUrl} target="_blank" className="mt-5 inline-block rounded-lg bg-primary px-4 py-2 text-white">Open lesson</a> : null}
                  {active.fileUrl ? <a href={`/api/student-web/resources/${active.id}`} target="_blank" className="mt-5 inline-block rounded-lg bg-primary px-4 py-2 text-white">Open resource</a> : null}
                  <div className="pointer-events-none absolute inset-x-0 top-1/2 rotate-[-20deg] text-center text-2xl font-bold text-primary/10">
                    {student.firstName} {student.lastName} - {student.admissionNo}
                  </div>
                </div>
              ) : (
                <div className="flex min-h-[450px] flex-col items-center justify-center text-center">
                  <Lock className="h-12 w-12" />
                  <h3 className="mt-4 text-xl font-semibold">Enrollment required</h3>
                  <p className="max-w-sm text-sm text-muted-foreground">This lesson is part of the full course. Enroll or ask your teacher to unlock access to continue.</p>
                </div>
              )
            ) : (
              <p>No resources published yet.</p>
            )}
          </CardContent>
        </Card>
        {course.enrollments[0] ? (
          <form action={updateCourseProgress.bind(null, course.id, Math.min(100, Number(course.enrollments[0].progress) + 10))}>
            <Button className="mt-4">Mark progress +10%</Button>
          </form>
        ) : null}
      </main>
    </div>
  );
}
