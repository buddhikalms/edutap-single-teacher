import { notFound } from "next/navigation";
import { submitWebQuiz } from "@/app/(student-portal)/student/actions";
import { QuizTimer } from "@/components/student/quiz-timer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { prisma } from "@/lib/prisma";
import { getStudentWebContext } from "@/lib/student-web";

export default async function QuizAttempt({ params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = await params;
  const { studentId } = await getStudentWebContext();
  const attempt = await prisma.quizAttempt.findFirst({
    where: { id: attemptId, studentId, status: "IN_PROGRESS" },
    include: {
      quiz: {
        include: {
          questions: {
            include: { options: { orderBy: { order: "asc" } } },
            orderBy: { order: "asc" }
          }
        }
      }
    }
  });
  if (!attempt) notFound();
  const endsAt = new Date(Math.min(attempt.quiz.endsAt.getTime(), attempt.startedAt.getTime() + attempt.quiz.timeLimitMins * 60_000));
  return <form action={submitWebQuiz.bind(null, attempt.id)} className="mx-auto max-w-3xl space-y-4">
    <div className="sticky top-2 z-20 flex justify-between rounded-xl bg-primary p-4 text-white"><h2 className="font-semibold">{attempt.quiz.title}</h2><QuizTimer endsAt={endsAt.toISOString()} formId="quiz-countdown" /></div>
    {attempt.quiz.questions.map((question, index) => <Card key={question.id}><CardContent className="p-5"><p className="font-semibold">{index + 1}. {question.prompt}</p><p className="mt-1 text-xs text-muted-foreground">{Number(question.marks)} marks</p><div className="mt-4 space-y-2">
      {question.type === "MULTIPLE_CHOICE" || question.type === "TRUE_FALSE"
        ? question.options.map(option => <label key={option.id} className="flex gap-3 rounded-lg border p-3"><Input className="h-4 w-4" type="radio" name={`q_${question.id}`} value={option.id} /><span>{option.text}</span></label>)
        : question.type === "ESSAY" ? <Textarea name={`q_${question.id}`} rows={8} /> : <Input name={`q_${question.id}`} />}
    </div></CardContent></Card>)}
    <Button size="lg" className="w-full">Submit quiz</Button>
  </form>;
}
