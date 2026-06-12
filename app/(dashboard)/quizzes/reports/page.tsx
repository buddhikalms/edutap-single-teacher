import { BarChart3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { classScopeForRole } from "@/lib/learning";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/session";

export default async function QuizReportsPage() {
  const { instituteId, userId, role, branchId } = await getTenantContext();
  const scope = classScopeForRole({ userId, role, branchId });
  const quizzes = await prisma.quiz.findMany({
    where: { instituteId, classGroup: scope },
    include: {
      classGroup: true,
      attempts: { include: { student: true } }
    },
    orderBy: { startsAt: "desc" }
  });

  const classRows = quizzes.map((quiz) => {
    const submitted = quiz.attempts.filter((attempt) => attempt.submittedAt).length;
    const avg = quiz.attempts.length ? Math.round(quiz.attempts.reduce((sum, attempt) => sum + Number(attempt.score), 0) / quiz.attempts.length) : 0;
    const pass = quiz.attempts.filter((attempt) => attempt.passed).length;
    return { quiz, submitted, avg, pass };
  });

  return (
    <div className="space-y-6">
      <section className="glass-panel rounded-2xl p-6 sm:p-8">
        <Badge variant="secondary">Quiz reports</Badge>
        <h2 className="mt-4 text-3xl font-semibold">Assessment performance</h2>
        <p className="mt-2 text-sm text-muted-foreground">Class-wise quiz reporting and student-wise result summaries.</p>
      </section>
      <section className="grid gap-4 md:grid-cols-3">
        <Metric label="Quizzes" value={String(quizzes.length)} />
        <Metric label="Attempts" value={String(quizzes.reduce((sum, quiz) => sum + quiz.attempts.length, 0))} />
        <Metric label="Passed attempts" value={String(quizzes.reduce((sum, quiz) => sum + quiz.attempts.filter((attempt) => attempt.passed).length, 0))} />
      </section>
      <Card className="glass-panel">
        <CardHeader><CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5" />Class-wise quiz report</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-xl border bg-white/75">
            <table className="w-full min-w-[840px] text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr><th className="px-4 py-3">Quiz</th><th className="px-4 py-3">Class</th><th className="px-4 py-3 text-right">Submitted</th><th className="px-4 py-3 text-right">Passed</th><th className="px-4 py-3 text-right">Average</th></tr>
              </thead>
              <tbody className="divide-y">
                {classRows.map((row) => (
                  <tr key={row.quiz.id}><td className="px-4 py-3 font-semibold">{row.quiz.title}</td><td className="px-4 py-3">{row.quiz.classGroup.name}</td><td className="px-4 py-3 text-right">{row.submitted}</td><td className="px-4 py-3 text-right">{row.pass}</td><td className="px-4 py-3 text-right">{row.avg}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <Card className="glass-panel"><CardContent className="p-5"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 text-3xl font-semibold">{value}</p></CardContent></Card>;
}
