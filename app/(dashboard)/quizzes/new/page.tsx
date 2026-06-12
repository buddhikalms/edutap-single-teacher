import { createQuizAction } from "@/app/(dashboard)/quizzes/actions";
import { QuizForm } from "@/app/(dashboard)/quizzes/quiz-form";
import { Badge } from "@/components/ui/badge";
import { classScopeForRole } from "@/lib/learning";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/session";

export default async function NewQuizPage() {
  const { instituteId, userId, role, branchId } = await getTenantContext();
  const scope = classScopeForRole({ userId, role, branchId });
  const [classes, courses] = await Promise.all([
    prisma.classGroup.findMany({ where: { instituteId, ...scope }, include: { course: true }, orderBy: { name: "asc" } }),
    prisma.course.findMany({ where: { instituteId }, select: { id: true, name: true }, orderBy: { name: "asc" } })
  ]);

  return (
    <div className="space-y-6">
      <section className="glass-panel rounded-2xl p-6 sm:p-8">
        <Badge variant="secondary">Create quiz</Badge>
        <h2 className="mt-4 text-3xl font-semibold">New assessment</h2>
        <p className="mt-2 text-sm text-muted-foreground">Set timing, marks, attempts, and then build questions step by step.</p>
      </section>
      <QuizForm action={createQuizAction} classes={classes} courses={courses} />
    </div>
  );
}
