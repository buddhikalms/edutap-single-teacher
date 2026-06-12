import { notFound } from "next/navigation";
import { updateHomeworkAction } from "@/app/(dashboard)/homework/actions";
import { HomeworkForm } from "@/app/(dashboard)/homework/homework-form";
import { Badge } from "@/components/ui/badge";
import { classScopeForRole } from "@/lib/learning";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/session";

type PageProps = {
  params: Promise<{ homeworkId: string }>;
};

export default async function EditHomeworkPage({ params }: PageProps) {
  const { homeworkId } = await params;
  const { instituteId, userId, role, branchId } = await getTenantContext();
  const scope = classScopeForRole({ userId, role, branchId });
  const [homework, classes, courses, students] = await Promise.all([
    prisma.homework.findFirst({
      where: { id: homeworkId, instituteId },
      include: { attachments: true, submissions: { select: { studentId: true } } }
    }),
    prisma.classGroup.findMany({ where: { instituteId, ...scope }, include: { course: true }, orderBy: { name: "asc" } }),
    prisma.course.findMany({ where: { instituteId }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.student.findMany({ where: { instituteId, status: "ACTIVE" }, select: { id: true, admissionNo: true, firstName: true, lastName: true }, orderBy: { firstName: "asc" } })
  ]);

  if (!homework) {
    notFound();
  }

  async function action(formData: FormData) {
    "use server";
    await updateHomeworkAction(homeworkId, formData);
  }

  return (
    <div className="space-y-6">
      <section className="glass-panel rounded-2xl p-6 sm:p-8">
        <Badge variant="secondary">Edit homework</Badge>
        <h2 className="mt-4 text-3xl font-semibold">{homework.title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">Adjust deadline, resources, student assignment, or publication status.</p>
      </section>
      <HomeworkForm action={action} classes={classes} courses={courses} students={students} homework={homework} />
    </div>
  );
}
