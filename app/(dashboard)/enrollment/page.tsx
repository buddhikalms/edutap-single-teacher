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
    status: enrollment.status,
    paymentStartDate: enrollment.paymentStartDate?.toISOString().slice(0, 10) ?? "",
    freePeriodType: enrollment.freePeriodType,
    freeDays: enrollment.freeDays,
    monthlyFeeOverride: enrollment.monthlyFeeOverride ? Number(enrollment.monthlyFeeOverride) : null,
    discount: Number(enrollment.discount),
    enrolledAt: enrollment.enrolledAt.toLocaleDateString()
  }));

  const studentOptions = students.map((student) => ({
    id: student.id,
    name: `${student.firstName} ${student.lastName}`,
    meta: student.admissionNo
  }));

  const classOptions = classes.map((classGroup) => ({
    id: classGroup.id,
    name: classGroup.name,
    meta: `${classGroup.course.name} - ${classGroup.teacher?.name ?? "Unassigned"}`,
    monthlyFee: Number(classGroup.monthlyFee ?? classGroup.course.fee),
    defaultFreePeriodType: classGroup.defaultFreePeriodType,
    defaultFreeDays: classGroup.defaultFreeDays
  }));

  return <EnrollmentManager enrollments={rows} students={studentOptions} classes={classOptions} />;
}
