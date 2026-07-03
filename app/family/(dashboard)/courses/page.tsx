import { getFamilyContext } from "@/lib/family";
import { prisma } from "@/lib/prisma";

export default async function FamilyCoursesPage() {
  const { selectedStudent: student } = await getFamilyContext();
  const items = await prisma.courseEnrollment.findMany({ where: { studentId: student.id, status: { in: ["ACTIVE", "COMPLETED"] } }, include: { course: true }, orderBy: { createdAt: "desc" } });
  return <div><h2 className="text-2xl font-semibold">Courses · {student.firstName}</h2><div className="mt-5 grid gap-3">{items.map((item) => <div key={item.id} className="rounded-2xl border bg-white p-5"><p className="font-semibold">{item.course.name}</p><p className="text-sm text-muted-foreground">{item.status} · {Number(item.progress)}% complete</p></div>)}</div></div>;
}
