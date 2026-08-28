import { prisma } from "@/lib/prisma";
import { ClassesManager, type ClassRow } from "@/components/classes/classes-manager";
import { getTenantContext } from "@/lib/session";

export default async function ClassesPage() {
  const { instituteId, role, userId } = await getTenantContext();
  const teacher = role === "TEACHER"
    ? await prisma.teacher.findFirst({ where: { instituteId, userId }, select: { id: true } })
    : null;
  const classScope = teacher ? { teacherId: teacher.id } : {};

  const [classes, branches, grades, subjects, settings, teachers] = await Promise.all([
    prisma.classGroup.findMany({
      where: { instituteId, ...classScope },
      include: {
        branch: true,
        gradeLevel: true,
        subject: true,
        teacher: { select: { id: true, name: true } },
        _count: { select: { enrollments: true } }
      },
      orderBy: { createdAt: "desc" }
    }),
    prisma.branch.findMany({ where: { instituteId, isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.grade.findMany({ where: { instituteId, isActive: true }, select: { id: true, name: true }, orderBy: [{ order: "asc" }, { name: "asc" }] }),
    prisma.subject.findMany({ where: { instituteId, isActive: true }, select: { id: true, name: true, color: true }, orderBy: { name: "asc" } }),
    prisma.instituteSettings.findUnique({ where: { instituteId }, select: { currency: true, classTypeOptions: true } }),
    prisma.teacher.findMany({
      where: { instituteId, status: "ACTIVE", ...(teacher ? { id: teacher.id } : {}) },
      select: { id: true, name: true, classTypeOptions: true },
      orderBy: { name: "asc" }
    })
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
    teacherId: item.teacherId,
    teacher: item.teacher?.name ?? "Unassigned",
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

  const classTypeOptions = Array.isArray(settings?.classTypeOptions)
    ? settings.classTypeOptions.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : ["Individual", "Group", "Spoken"];

  return (
    <ClassesManager
      classes={rows}
      branches={branches}
      grades={grades}
      subjects={subjects}
      teachers={teachers.map((item) => ({
        id: item.id,
        name: item.name,
        classTypeOptions: Array.isArray(item.classTypeOptions)
          ? item.classTypeOptions.filter((option): option is string => typeof option === "string" && option.trim().length > 0)
          : classTypeOptions
      }))}
      canAssignTeacher={role !== "TEACHER"}
      currency={settings?.currency ?? "LKR"}
      classTypeOptions={classTypeOptions}
    />
  );
}
