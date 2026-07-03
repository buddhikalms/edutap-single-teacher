import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { updateLiveClassAction } from "@/app/(dashboard)/live-classes/actions";
import { LiveClassForm } from "@/app/(dashboard)/live-classes/live-class-form";
import { classScopeForRole } from "@/lib/learning";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/session";

type PageProps = { params: Promise<{ liveClassId: string }> };

export default async function EditLiveClassPage({ params }: PageProps) {
  const { liveClassId } = await params;
  const { instituteId, userId, role, branchId } = await getTenantContext();
  const scope = classScopeForRole({ userId, role, branchId });
  const [liveClass, classes, courses, students] = await Promise.all([
    prisma.liveClass.findFirst({ where: { id: liveClassId, instituteId, classGroup: scope } }),
    prisma.classGroup.findMany({ where: { instituteId, ...scope }, include: { subject: true }, orderBy: { name: "asc" } }),
    prisma.course.findMany({ where: { instituteId }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.student.findMany({ where: { instituteId, status: "ACTIVE" }, select: { id: true, admissionNo: true, firstName: true, lastName: true }, orderBy: { firstName: "asc" } })
  ]);

  if (!liveClass) notFound();

  async function action(formData: FormData) {
    "use server";
    await updateLiveClassAction(liveClassId, formData);
  }

  return (
    <div className="space-y-6">
      <section className="glass-panel rounded-2xl p-6 sm:p-8">
        <Badge variant="secondary">Edit live class</Badge>
        <h2 className="mt-4 text-3xl font-semibold tracking-normal sm:text-4xl">{liveClass.title}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Update timing, access, audience, provider, and publication state.</p>
      </section>
      <LiveClassForm action={action} classes={classes} students={students} liveClass={liveClass} />
    </div>
  );
}
