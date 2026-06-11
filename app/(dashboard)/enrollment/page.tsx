import { EnrollmentManager, type EnrollmentRow } from "@/components/enrollment/enrollment-manager";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/session";

export default async function EnrollmentPage() {
  const { instituteId } = await getTenantContext();

  const [enrollments, students, classes] = await Promise.all([
    prisma.enrollment.findMany({
      where: { classGroup: { instituteId } },
      include: {
        student: true,
        classGroup: {
          include: {
            course: true,
            teacher: true
          }
        }
      },
      orderBy: { enrolledAt: "desc" }
    }),
    prisma.student.findMany({
      where: { instituteId },
      select: { id: true, firstName: true, lastName: true, admissionNo: true },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }]
    }),
    prisma.classGroup.findMany({
      where: { instituteId },
      include: { course: true, teacher: true },
      orderBy: { name: "asc" }
    })
  ]);

  const rows: EnrollmentRow[] = enrollments.map((enrollment) => ({
    id: enrollment.id,
    studentId: enrollment.studentId,
    student: `${enrollment.student.firstName} ${enrollment.student.lastName}`,
    admissionNo: enrollment.student.admissionNo,
    classGroupId: enrollment.classGroupId,
    classGroup: enrollment.classGroup.name,
    course: enrollment.classGroup.course.name,
    teacher: enrollment.classGroup.teacher?.name ?? "Unassigned",
    active: enrollment.active,
    enrolledAt: enrollment.enrolledAt.toLocaleDateString()
  }));

  return (
    <EnrollmentManager
      enrollments={rows}
      students={students.map((student) => ({
        id: student.id,
        name: `${student.firstName} ${student.lastName}`,
        meta: student.admissionNo
      }))}
      classes={classes.map((classGroup) => ({
        id: classGroup.id,
        name: classGroup.name,
        meta: `${classGroup.course.name} · ${classGroup.teacher?.name ?? "Unassigned"}`
      }))}
    />
  );
}
