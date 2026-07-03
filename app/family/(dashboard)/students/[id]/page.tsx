import { notFound } from "next/navigation";
import { getFamilyContext } from "@/lib/family";
import { prisma } from "@/lib/prisma";

export default async function FamilyStudentPage({ params }: { params: Promise<{ id: string }> }) {
  const context = await getFamilyContext();
  const { id } = await params;
  if (!context.studentIds.includes(id)) notFound();
  const student = await prisma.student.findFirst({ where: { id, instituteId: context.instituteId }, include: { enrollments: { include: { classGroup: true } } } });
  if (!student) notFound();
  return <div className="rounded-2xl border bg-white p-6"><h2 className="text-2xl font-semibold">{student.firstName} {student.lastName}</h2><p className="mt-2 text-muted-foreground">Student ID: {student.admissionNo}</p><h3 className="mt-6 font-semibold">Classes</h3><div className="mt-3 space-y-2">{student.enrollments.map((item) => <div className="rounded-xl bg-slate-50 p-4" key={item.id}>{item.classGroup.name} · {item.classGroup.schedule}</div>)}</div></div>;
}
