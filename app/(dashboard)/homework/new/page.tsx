import { HomeworkForm } from "@/app/(dashboard)/homework/homework-form";
import { createHomeworkAction } from "@/app/(dashboard)/homework/actions";
import { Badge } from "@/components/ui/badge";
import { classScopeForRole } from "@/lib/learning";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/session";

export default async function NewHomeworkPage() {
  const { instituteId, userId, role, branchId } = await getTenantContext();
  const scope = classScopeForRole({ userId, role, branchId });
  const [classes, courses, students] = await Promise.all([
    prisma.classGroup.findMany({ where: { instituteId, ...scope }, include: { subject: true }, orderBy: { name: "asc" } }),
    prisma.course.findMany({ where: { instituteId }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.student.findMany({ where: { instituteId, status: "ACTIVE" }, select: { id: true, admissionNo: true, firstName: true, lastName: true }, orderBy: { firstName: "asc" } })
  ]);

  return (
    <div className="space-y-6">
      <section className="glass-panel rounded-2xl p-6 sm:p-8">
        <Badge variant="secondary">Create homework</Badge>
        <h2 className="mt-4 text-3xl font-semibold">New assignment</h2>
        <p className="mt-2 text-sm text-muted-foreground">Publish to a class, attach resources, and optionally target specific students.</p>
      </section>
      <HomeworkForm action={createHomeworkAction} classes={classes} students={students} />
    </div>
  );
}
