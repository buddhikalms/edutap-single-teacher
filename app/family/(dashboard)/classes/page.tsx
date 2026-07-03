import { getFamilyContext } from "@/lib/family";
import { prisma } from "@/lib/prisma";

export default async function FamilyClassesPage() {
  const { selectedStudent: student } = await getFamilyContext();
  const items = await prisma.enrollment.findMany({ where: { studentId: student.id, active: true }, include: { classGroup: { include: { subject: true } } } });
  return <List title={`Classes · ${student.firstName}`} items={items.map((item) => ({ id: item.id, title: item.classGroup.name, detail: `${item.classGroup.subject.name} · ${item.classGroup.schedule}` }))} />;
}

function List({ title, items }: { title: string; items: Array<{ id: string; title: string; detail: string }> }) {
  return <div><h2 className="text-2xl font-semibold">{title}</h2><div className="mt-5 grid gap-3">{items.map((item) => <div key={item.id} className="rounded-2xl border bg-white p-5"><p className="font-semibold">{item.title}</p><p className="mt-1 text-sm text-muted-foreground">{item.detail}</p></div>)}</div></div>;
}
