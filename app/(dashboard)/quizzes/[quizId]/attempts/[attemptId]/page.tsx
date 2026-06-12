import { notFound } from "next/navigation";
import { markQuizAnswer } from "@/app/(dashboard)/quizzes/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/session";

type PageProps = { params: Promise<{ quizId: string; attemptId: string }> };

export default async function MarkQuizAttemptPage({ params }: PageProps) {
  const { quizId, attemptId } = await params;
  const { instituteId } = await getTenantContext();
  const attempt = await prisma.quizAttempt.findFirst({
    where: { id: attemptId, quizId, instituteId },
    include: {
      student: true,
      quiz: true,
      answers: {
        include: {
          question: { include: { options: { orderBy: { order: "asc" } } } },
          selectedOption: true
        },
        orderBy: { question: { order: "asc" } }
      }
    }
  });

  if (!attempt) notFound();

  return (
    <div className="space-y-6">
      <section className="glass-panel rounded-2xl p-6 sm:p-8">
        <Badge variant={attempt.passed ? "success" : "warning"}>{attempt.passed ? "passed" : "not passed"}</Badge>
        <h2 className="mt-4 text-3xl font-semibold">{attempt.student.firstName} {attempt.student.lastName}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{attempt.quiz.title} · Score {attempt.score.toString()} / {attempt.quiz.totalMarks.toString()}</p>
      </section>
      <div className="space-y-4">
        {attempt.answers.map((answer, index) => {
          async function action(formData: FormData) {
            "use server";
            await markQuizAnswer(quizId, attemptId, formData);
          }

          return (
            <Card key={answer.id} className="glass-panel">
              <CardHeader>
                <CardTitle>Question {index + 1}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-5 xl:grid-cols-[1fr_360px]">
                <div className="space-y-4">
                  <p className="font-semibold">{answer.question.prompt}</p>
                  {answer.question.options.length ? (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {answer.question.options.map((option) => (
                        <div key={option.id} className="rounded-lg border bg-white/70 p-3 text-sm">
                          <span className="font-semibold">{option.label}.</span> {option.text}
                          {answer.selectedOptionId === option.id ? <Badge className="ml-2" variant="outline">selected</Badge> : null}
                          {option.isCorrect ? <Badge className="ml-2" variant="success">correct</Badge> : null}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl border bg-white/70 p-4">
                      <p className="text-xs text-muted-foreground">Student answer</p>
                      <p className="mt-2 whitespace-pre-wrap text-sm">{answer.answerText ?? "No answer"}</p>
                    </div>
                  )}
                </div>
                <form action={action} className="space-y-3 rounded-xl border bg-white/75 p-4">
                  <input type="hidden" name="answerId" value={answer.id} />
                  <div className="space-y-2">
                    <Label htmlFor={`marks-${answer.id}`}>Marks</Label>
                    <Input id={`marks-${answer.id}`} name="marksAwarded" type="number" min={0} max={Number(answer.question.marks)} step="0.5" defaultValue={answer.marksAwarded.toString()} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`feedback-${answer.id}`}>Feedback</Label>
                    <Textarea id={`feedback-${answer.id}`} name="feedback" defaultValue={answer.feedback ?? ""} />
                  </div>
                  <Button type="submit" className="w-full">Save marks</Button>
                </form>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
