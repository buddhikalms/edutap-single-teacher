import { getFamilyContext } from "@/lib/family";
import { prisma } from "@/lib/prisma";

export default async function FamilyQuizzesPage() {
  const { selectedStudent: student } = await getFamilyContext();
  const items = await prisma.quiz.findMany({ where: { status: "PUBLISHED", classGroup: { enrollments: { some: { studentId: student.id, active: true } } } }, include: { classGroup: true }, orderBy: { startsAt: "desc" } });
  return <div><h2 className="text-2xl font-semibold">Quizzes · {student.firstName}</h2><div className="mt-5 grid gap-3">{items.map((item) => <div key={item.id} className="rounded-2xl border bg-white p-5"><p className="font-semibold">{item.title}</p><p className="text-sm text-muted-foreground">{item.classGroup.name} · {item.timeLimitMins} minutes</p></div>)}</div></div>;
}
