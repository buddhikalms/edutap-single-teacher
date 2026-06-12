import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/session";

type PageProps = { params: Promise<{ quizId: string }> };

export default async function QuizAttemptsPage({ params }: PageProps) {
  const { quizId } = await params;
  const { instituteId } = await getTenantContext();
  const quiz = await prisma.quiz.findFirst({
    where: { id: quizId, instituteId },
    include: {
      attempts: { include: { student: true, answers: true }, orderBy: { startedAt: "desc" } }
    }
  });

  if (!quiz) notFound();

  return (
    <div className="space-y-6">
      <section className="glass-panel rounded-2xl p-6 sm:p-8">
        <Badge variant="secondary">Quiz attempts</Badge>
        <h2 className="mt-4 text-3xl font-semibold">{quiz.title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">Review attempts, auto-marked scores, and written answers awaiting teacher feedback.</p>
      </section>
      <Card className="glass-panel">
        <CardHeader><CardTitle>Attempts</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-xl border bg-white/75">
            <table className="w-full min-w-[840px] text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Started</th>
                  <th className="px-4 py-3 text-right">Score</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {quiz.attempts.map((attempt) => (
                  <tr key={attempt.id}>
                    <td className="px-4 py-3"><p className="font-semibold">{attempt.student.firstName} {attempt.student.lastName}</p><p className="text-xs text-muted-foreground">{attempt.student.admissionNo}</p></td>
                    <td className="px-4 py-3"><Badge variant={attempt.status === "IN_PROGRESS" ? "warning" : "success"}>{attempt.status.toLowerCase()}</Badge></td>
                    <td className="px-4 py-3">{attempt.startedAt.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">{attempt.score.toString()} / {quiz.totalMarks.toString()}</td>
                    <td className="px-4 py-3 text-right"><Button asChild variant="outline" size="sm"><Link href={`/quizzes/${quiz.id}/attempts/${attempt.id}`}>Mark answers</Link></Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
