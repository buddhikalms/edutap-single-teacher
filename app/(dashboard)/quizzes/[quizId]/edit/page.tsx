import { notFound } from "next/navigation";
import { updateQuizAction } from "@/app/(dashboard)/quizzes/actions";
import { QuizForm } from "@/app/(dashboard)/quizzes/quiz-form";
import { Badge } from "@/components/ui/badge";
import { classScopeForRole } from "@/lib/learning";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/session";

type PageProps = { params: Promise<{ quizId: string }> };

export default async function EditQuizPage({ params }: PageProps) {
  const { quizId } = await params;
  const { instituteId, userId, role, branchId } = await getTenantContext();
  const scope = classScopeForRole({ userId, role, branchId });
  const [quiz, classes, courses] = await Promise.all([
    prisma.quiz.findFirst({ where: { id: quizId, instituteId } }),
    prisma.classGroup.findMany({ where: { instituteId, ...scope }, include: { course: true }, orderBy: { name: "asc" } }),
    prisma.course.findMany({ where: { instituteId }, select: { id: true, name: true }, orderBy: { name: "asc" } })
  ]);

  if (!quiz) notFound();

  async function action(formData: FormData) {
    "use server";
    await updateQuizAction(quizId, formData);
  }

  return (
    <div className="space-y-6">
      <section className="glass-panel rounded-2xl p-6 sm:p-8">
        <Badge variant="secondary">Edit quiz</Badge>
        <h2 className="mt-4 text-3xl font-semibold">{quiz.title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">Update quiz settings and continue to the question builder.</p>
      </section>
      <QuizForm action={action} classes={classes} courses={courses} quiz={quiz} />
    </div>
  );
}
