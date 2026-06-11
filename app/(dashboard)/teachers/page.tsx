import { TeachersTable, type TeacherRow } from "@/components/teachers/teachers-table";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/session";

export default async function TeachersPage() {
  const { instituteId } = await getTenantContext();

  const [teachers, branches, classes] = await Promise.all([
    prisma.teacher.findMany({
      where: { instituteId },
      include: {
        branch: true,
        classGroups: {
          include: {
            _count: { select: { enrollments: true } }
          }
        }
      },
      orderBy: { createdAt: "desc" }
    }),
    prisma.branch.findMany({
      where: { instituteId },
      select: { id: true, name: true },
      orderBy: { name: "asc" }
    }),
    prisma.classGroup.findMany({
      where: { instituteId },
      select: { id: true, name: true, teacherId: true },
      orderBy: { name: "asc" }
    })
  ]);

  const rows: TeacherRow[] = teachers.map((teacher) => ({
    id: teacher.id,
    name: teacher.name,
    email: teacher.email,
    phone: teacher.phone,
    specialty: teacher.specialty,
    branchId: teacher.branchId,
    branch: teacher.branch.name,
    classGroupIds: teacher.classGroups.map((classGroup) => classGroup.id),
    classes: teacher.classGroups.map((classGroup) => classGroup.name).join(", "),
    activeClasses: teacher.classGroups.length,
    students: teacher.classGroups.reduce((total, classGroup) => total + classGroup._count.enrollments, 0)
  }));

  return <TeachersTable data={rows} branches={branches} classes={classes} />;
}
