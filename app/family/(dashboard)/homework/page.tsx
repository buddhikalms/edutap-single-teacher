import Link from "next/link";
import { getFamilyContext } from "@/lib/family";
import { prisma } from "@/lib/prisma";

export default async function FamilyHomeworkPage() {
  const { selectedStudent: student } = await getFamilyContext();
  const items = await prisma.homework.findMany({ where: { status: "PUBLISHED", classGroup: { enrollments: { some: { studentId: student.id, active: true } } } }, include: { classGroup: true }, orderBy: { deadline: "asc" } });
  return <div><div className="flex flex-wrap gap-2"><Link className="font-semibold text-primary" href="/family/homework">Homework</Link><Link href="/family/quizzes">Quizzes</Link><Link href="/family/courses">Courses</Link><Link href="/family/resources">Resources</Link></div><h2 className="mt-4 text-2xl font-semibold">Homework · {student.firstName}</h2><div className="mt-5 grid gap-3">{items.map((item) => <div key={item.id} className="rounded-2xl border bg-white p-5"><p className="font-semibold">{item.title}</p><p className="text-sm text-muted-foreground">{item.classGroup.name} · due {item.deadline.toLocaleString()}</p></div>)}</div></div>;
}
