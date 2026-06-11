import { ClassesManager, type ClassRow, type CourseRow } from "@/components/classes/classes-manager";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/session";

export default async function ClassesPage() {
  const { instituteId } = await getTenantContext();

  const [courses, classes, branches, teachers] = await Promise.all([
    prisma.course.findMany({
      where: { instituteId },
      include: { _count: { select: { classGroups: true } } },
      orderBy: { createdAt: "desc" }
    }),
    prisma.classGroup.findMany({
      where: { instituteId },
      include: {
        branch: true,
        course: true,
        teacher: true,
        _count: { select: { enrollments: true } }
      },
      orderBy: { createdAt: "desc" }
    }),
    prisma.branch.findMany({ where: { instituteId }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.teacher.findMany({ where: { instituteId }, select: { id: true, name: true }, orderBy: { name: "asc" } })
  ]);

  const courseRows: CourseRow[] = courses.map((course) => ({
    id: course.id,
    name: course.name,
    code: course.code,
    subject: course.subject,
    grade: course.grade,
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
    courseId: classGroup.courseId,
    course: classGroup.course.name,
    subject: classGroup.course.subject,
    grade: classGroup.course.grade,
    teacherId: classGroup.teacherId,
    teacher: classGroup.teacher?.name ?? "Unassigned",
    enrolled: classGroup._count.enrollments
  }));

  return <ClassesManager courses={courseRows} classes={classRows} branches={branches} teachers={teachers} />;
}
