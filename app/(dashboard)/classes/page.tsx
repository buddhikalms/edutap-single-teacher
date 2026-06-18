import { ClassesManager, type ClassRow, type CourseRow } from "@/components/classes/classes-manager";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/session";

export default async function ClassesPage() {
  const { instituteId, role, userId } = await getTenantContext();
  const teacherProfile = role === "TEACHER"
    ? await prisma.teacher.findFirst({ where: { instituteId, userId }, select: { id: true } })
    : null;
  const teacherId = teacherProfile?.id;
  const courseWhere = teacherId ? { instituteId, OR: [{ teacherId }, { classGroups: { some: { teacherId } } }] } : { instituteId };
  const classWhere = teacherId ? { instituteId, teacherId } : { instituteId };

  const [courses, classes, branches, grades, teachers, settings] = await Promise.all([
    prisma.course.findMany({
      where: courseWhere,
      include: { gradeLevel: true, _count: { select: { classGroups: true } } },
      orderBy: { createdAt: "desc" }
    }),
    prisma.classGroup.findMany({
      where: classWhere,
      include: {
        branch: true,
        course: true,
        gradeLevel: true,
        teacher: true,
        _count: { select: { enrollments: true } }
      },
      orderBy: { createdAt: "desc" }
    }),
    prisma.branch.findMany({ where: { instituteId, isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.grade.findMany({ where: { instituteId, isActive: true }, select: { id: true, name: true }, orderBy: [{ order: "asc" }, { name: "asc" }] }),
    prisma.teacher.findMany({ where: { instituteId }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.instituteSettings.findUnique({ where: { instituteId }, select: { currency: true } })
  ]);

  const courseRows: CourseRow[] = courses.map((course) => ({
    id: course.id,
    name: course.name,
    code: course.code,
    subject: course.subject,
    grade: course.gradeLevel?.name ?? course.grade,
    gradeId: course.gradeId,
    description: course.description,
    fee: Number(course.fee),
    classes: course._count.classGroups
  }));

  const classRows: ClassRow[] = classes.map((classGroup) => ({
    id: classGroup.id,
    name: classGroup.name,
    code: classGroup.code,
    schedule: classGroup.schedule,
    room: classGroup.room,
    capacity: classGroup.capacity,
    branchId: classGroup.branchId,
    branch: classGroup.branch.name,
    gradeId: classGroup.gradeId,
    grade: classGroup.gradeLevel?.name ?? classGroup.course.grade,
    courseId: classGroup.courseId,
    course: classGroup.course.name,
    subject: classGroup.course.subject,
    teacherId: classGroup.teacherId,
    teacher: classGroup.teacher?.name ?? "Unassigned",
    classType: classGroup.classType,
    fee: Number(classGroup.monthlyFee ?? classGroup.course.fee),
    defaultFreePeriodType: classGroup.defaultFreePeriodType,
    defaultFreeDays: classGroup.defaultFreeDays,
    defaultPaymentDueDay: classGroup.defaultPaymentDueDay,
    enrolled: classGroup._count.enrollments
  }));

  return (
    <ClassesManager
      courses={courseRows}
      classes={classRows}
      branches={branches}
      grades={grades}
      teachers={teachers}
      isTeacher={role === "TEACHER"}
      currency={settings?.currency ?? "USD"}
    />
  );
}
