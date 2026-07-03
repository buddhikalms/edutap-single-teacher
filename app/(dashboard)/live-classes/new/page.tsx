import { Badge } from "@/components/ui/badge";
import { createLiveClassAction } from "@/app/(dashboard)/live-classes/actions";
import { LiveClassForm } from "@/app/(dashboard)/live-classes/live-class-form";
import { classScopeForRole } from "@/lib/learning";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/session";

export default async function NewLiveClassPage() {
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
        <Badge variant="secondary">Create live class</Badge>
        <h2 className="mt-4 text-3xl font-semibold tracking-normal sm:text-4xl">Schedule a premium live session</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Choose the class, provider, audience, access policy, and publication state.</p>
      </section>
      <LiveClassForm action={createLiveClassAction} classes={classes} students={students} />
    </div>
  );
}
