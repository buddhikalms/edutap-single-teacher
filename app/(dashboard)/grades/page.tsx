import { GradesManager, type GradeRow } from "@/components/grades/grades-manager";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/session";

const defaultGrades = [
  "Pre School",
  "Grade 1",
  "Grade 2",
  "Grade 3",
  "Grade 4",
  "Grade 5",
  "Grade 6",
  "Grade 7",
  "Grade 8",
  "Grade 9",
  "Grade 10",
  "Grade 11"
];

export default async function GradesPage() {
  const { instituteId } = await getTenantContext();

  const existing = await prisma.grade.findMany({
    where: { instituteId },
    include: { _count: { select: { courses: true, classGroups: true } } },
    orderBy: [{ order: "asc" }, { name: "asc" }]
  });

  if (!existing.length) {
    await prisma.grade.createMany({
      data: defaultGrades.map((name, index) => ({ instituteId, name, order: index })),
      skipDuplicates: true
    });
  }

  const grades = existing.length
    ? existing
    : await prisma.grade.findMany({
        where: { instituteId },
        include: { _count: { select: { courses: true, classGroups: true } } },
        orderBy: [{ order: "asc" }, { name: "asc" }]
      });

  const rows: GradeRow[] = grades.map((grade) => ({
    id: grade.id,
    name: grade.name,
    order: grade.order,
    isActive: grade.isActive,
    courses: grade._count.courses,
    classes: grade._count.classGroups
  }));

  return <GradesManager grades={rows} />;
}
