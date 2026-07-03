import { SubjectsManager } from "@/components/subjects/subjects-manager";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/session";

export default async function SubjectsPage() {
  const { instituteId } = await getTenantContext();
  const subjects = await prisma.subject.findMany({
    where: { instituteId },
    include: { _count: { select: { classGroups: true, courses: true, homework: true, quizzes: true } } },
    orderBy: { name: "asc" }
  });
  return <SubjectsManager subjects={subjects.map(s=>({id:s.id,name:s.name,description:s.description,color:s.color,icon:s.icon,isActive:s.isActive,classes:s._count.classGroups,courses:s._count.courses,homework:s._count.homework,quizzes:s._count.quizzes}))}/>;
}
