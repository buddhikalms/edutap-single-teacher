import Link from "next/link";
import { notFound } from "next/navigation";
import { QuizStatus } from "@prisma/client";
import { setQuizStatus } from "@/app/(dashboard)/quizzes/actions";
import { QuestionBuilder } from "@/app/(dashboard)/quizzes/question-builder";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/session";

type PageProps = { params: Promise<{ quizId: string }> };

export default async function QuizQuestionsPage({ params }: PageProps) {
  const { quizId } = await params;
  const { instituteId } = await getTenantContext();
  const quiz = await prisma.quiz.findFirst({
    where: { id: quizId, instituteId },
    include: {
      classGroup: true,
      questions: { include: { options: { orderBy: { order: "asc" } } }, orderBy: { order: "asc" } }
    }
  });

  if (!quiz) notFound();

  async function publish() {
    "use server";
    await setQuizStatus(quizId, QuizStatus.PUBLISHED);
  }

  async function unpublish() {
    "use server";
    await setQuizStatus(quizId, QuizStatus.DRAFT);
  }

  return (
    <div className="space-y-6">
      <section className="glass-panel rounded-2xl p-6 sm:p-8">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <Badge variant={quiz.status === "PUBLISHED" ? "success" : "outline"}>{quiz.status.toLowerCase()}</Badge>
            <h2 className="mt-4 text-3xl font-semibold">{quiz.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{quiz.classGroup.name} · {quiz.questions.length} questions · {quiz.totalMarks.toString()} marks</p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline"><Link href={`/quizzes/${quiz.id}/edit`}>Settings</Link></Button>
            <Button asChild variant="outline"><Link href={`/quizzes/${quiz.id}/attempts`}>Attempts</Link></Button>
            <form action={quiz.status === "PUBLISHED" ? unpublish : publish}>
              <Button type="submit">{quiz.status === "PUBLISHED" ? "Unpublish" : "Publish"}</Button>
            </form>
          </div>
        </div>
      </section>
      <QuestionBuilder quizId={quiz.id} questions={quiz.questions} />
    </div>
  );
}
