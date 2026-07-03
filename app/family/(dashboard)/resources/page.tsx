import { getFamilyContext } from "@/lib/family";
import { prisma } from "@/lib/prisma";

export default async function FamilyResourcesPage() {
  const { selectedStudent: student } = await getFamilyContext();
  const materials = await prisma.courseMaterial.findMany({ where: { OR: [{ classGroup: { enrollments: { some: { studentId: student.id, active: true } } } }, { course: { enrollments: { some: { studentId: student.id, status: { in: ["ACTIVE", "COMPLETED"] } } } } }] }, orderBy: { createdAt: "desc" } });
  return <div><h2 className="text-2xl font-semibold">Resources · {student.firstName}</h2><div className="mt-5 grid gap-3">{materials.map((item) => <div key={item.id} className="rounded-2xl border bg-white p-5"><p className="font-semibold">{item.title}</p><p className="text-sm text-muted-foreground">{item.type}</p>{item.url ? <a className="mt-2 inline-block text-sm font-semibold text-primary" href={item.url}>Open resource</a> : null}</div>)}</div></div>;
}
