import { prisma } from "@/lib/prisma";
import { ClassesManager, type ClassRow } from "@/components/classes/classes-manager";
import { getTenantContext } from "@/lib/session";

export default async function ClassesPage() {
  const { instituteId } = await getTenantContext();
  const [classes, branches, grades, subjects, settings] = await Promise.all([
    prisma.classGroup.findMany({
      where: { instituteId },
      include: {
        branch: true,
        gradeLevel: true,
        subject: true,
        _count: { select: { enrollments: true } }
      },
      orderBy: { createdAt: "desc" }
    }),
    prisma.branch.findMany({ where: { instituteId, isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.grade.findMany({ where: { instituteId, isActive: true }, select: { id: true, name: true }, orderBy: [{ order: "asc" }, { name: "asc" }] }),
    prisma.subject.findMany({ where: { instituteId, isActive: true }, select: { id: true, name: true, color: true }, orderBy: { name: "asc" } }),
    prisma.instituteSettings.findUnique({ where: { instituteId }, select: { currency: true } })
  ]);

  const rows: ClassRow[] = classes.map((item) => ({
    id: item.id,
    name: item.name,
    code: item.code,
    gradeId: item.gradeId ?? "",
    grade: item.gradeLevel?.name ?? "All grades",
    subjectId: item.subjectId,
    subject: item.subject.name,
    subjectColor: item.subject.color,
    branchId: item.branchId,
    branch: item.branch.name,
    schedule: item.schedule,
    room: item.room,
    capacity: item.capacity,
    classType: item.classType,
    monthlyFee: Number(item.monthlyFee ?? 0),
    admissionFee: item.admissionFee === null ? null : Number(item.admissionFee),
    paymentStartDate: item.paymentStartDate?.toISOString().slice(0, 10) ?? null,
    freePeriodType: item.defaultFreePeriodType,
    freeDays: item.defaultFreeDays,
    dueDay: item.defaultPaymentDueDay,
    status: item.status,
    enrolled: item._count.enrollments
  }));

  return <ClassesManager classes={rows} branches={branches} grades={grades} subjects={subjects} currency={settings?.currency ?? "LKR"} />;
}
