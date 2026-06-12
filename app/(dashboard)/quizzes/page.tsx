import Link from "next/link";
import { BarChart3, Clock, Plus, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { classScopeForRole, quizAvailability } from "@/lib/learning";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/session";

function badge(status: string) {
  if (status === "live" || status === "PUBLISHED") return "success" as const;
  if (status === "completed" || status === "CLOSED") return "warning" as const;
  return "outline" as const;
}

export default async function QuizzesPage() {
  const { instituteId, userId, role, branchId } = await getTenantContext();
  const scope = classScopeForRole({ userId, role, branchId });
  const quizzes = await prisma.quiz.findMany({
    where: { instituteId, classGroup: scope },
    include: { classGroup: true, course: true, questions: true, attempts: true },
    orderBy: { startsAt: "desc" }
  });

  return (
    <div className="space-y-6">
      <section className="glass-panel rounded-2xl p-6 sm:p-8">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <Badge variant="secondary">Learning assessment</Badge>
            <h2 className="mt-4 text-3xl font-semibold tracking-normal sm:text-4xl">Quiz management</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Build quizzes, publish timed attempts, auto-mark objective answers, and review written responses.</p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline"><Link href="/quizzes/reports"><BarChart3 className="h-4 w-4" />Reports</Link></Button>
            <Button asChild size="lg"><Link href="/quizzes/new"><Plus className="h-4 w-4" />Create quiz</Link></Button>
          </div>
        </div>
      </section>

      {quizzes.length ? (
        <section className="grid gap-4 xl:grid-cols-2">
          {quizzes.map((quiz) => {
            const availability = quizAvailability(quiz);
            return (
              <Card key={quiz.id} className="glass-panel">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <Badge variant={badge(availability)}>{availability}</Badge>
                      <h3 className="mt-3 text-xl font-semibold">{quiz.title}</h3>
                      <p className="mt-2 text-sm text-muted-foreground">{quiz.classGroup.name} · {quiz.course?.name ?? "Class course"}</p>
                    </div>
                    <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-white"><Trophy className="h-5 w-5" /></div>
                  </div>
                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <Mini label="Questions" value={String(quiz.questions.length)} />
                    <Mini label="Attempts" value={String(quiz.attempts.length)} />
                    <Mini label="Time" value={`${quiz.timeLimitMins} min`} />
                  </div>
                  <div className="mt-5 flex flex-wrap gap-2">
                    <Button asChild variant="outline" size="sm"><Link href={`/quizzes/${quiz.id}/edit`}>Edit</Link></Button>
                    <Button asChild variant="outline" size="sm"><Link href={`/quizzes/${quiz.id}/questions`}>Questions</Link></Button>
                    <Button asChild variant="outline" size="sm"><Link href={`/quizzes/${quiz.id}/attempts`}>Attempts</Link></Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </section>
      ) : (
        <Card className="glass-panel">
          <CardContent className="p-10 text-center">
            <Clock className="mx-auto h-10 w-10 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No quizzes yet</h3>
            <p className="mt-2 text-sm text-muted-foreground">Create a quiz and start adding questions for your first assessment.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border bg-white/70 p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 font-semibold">{value}</p></div>;
}
