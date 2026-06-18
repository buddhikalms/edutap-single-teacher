import Link from "next/link";
import { BookOpenCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getPortalContext } from "@/lib/portal";
import { prisma } from "@/lib/prisma";

export default async function ParentHomeworkPage() {
  const context = await getPortalContext();
  const submissions = await prisma.homeworkSubmission.findMany({
    where: { instituteId: context.instituteId, studentId: { in: context.studentIds } },
    include: {
      student: { select: { firstName: true, lastName: true } },
      homework: { include: { classGroup: true, course: true } }
    },
    orderBy: { homework: { deadline: "asc" } },
    take: 100
  });

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef3f8_100%)] px-4 py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <Badge variant="secondary">Parent portal</Badge>
            <h1 className="mt-3 text-3xl font-semibold tracking-normal">Homework</h1>
            <p className="mt-2 text-sm text-muted-foreground">Assignments and review status for linked students.</p>
          </div>
          <Button asChild variant="outline">
            <Link href="/portal">Back to portal</Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Assigned homework</CardTitle>
            <CardDescription>{submissions.length} homework items</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {submissions.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-white py-16 text-center">
                <BookOpenCheck className="mb-3 h-9 w-9 text-muted-foreground" />
                <p className="font-semibold">No homework yet</p>
                <p className="mt-2 text-sm text-muted-foreground">Homework assigned by teachers will appear here.</p>
              </div>
            ) : null}
            {submissions.map((submission) => (
              <article key={submission.id} className="rounded-lg border bg-white p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-semibold">{submission.homework.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {submission.student.firstName} {submission.student.lastName} - {submission.homework.classGroup.name}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">Due {submission.homework.deadline.toLocaleDateString()}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{submission.status}</Badge>
                    {submission.reviewStatus ? <Badge variant="secondary">{submission.reviewStatus}</Badge> : null}
                  </div>
                </div>
              </article>
            ))}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
