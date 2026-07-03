import { prisma } from "@/lib/prisma";

export const DEFAULT_GRADES = [
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
] as const;

export async function hasTeacherOwner() {
  return (await prisma.teacher.count({ where: { userId: { not: null } } })) > 0;
}

export async function getOwnerTeacher(instituteId: string) {
  return prisma.teacher.findFirst({
    where: { instituteId, userId: { not: null } },
    orderBy: { createdAt: "asc" }
  });
}

export async function requireOwnerTeacherId(instituteId: string) {
  const teacher = await getOwnerTeacher(instituteId);

  if (!teacher) {
    throw new Error("The teacher owner profile is missing. Complete setup before continuing.");
  }

  return teacher.id;
}
