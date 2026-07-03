import { getFamilyContext } from "@/lib/family";
import { prisma } from "@/lib/prisma";

export default async function FamilyNotificationsPage() {
  const context = await getFamilyContext();
  const items = await prisma.notification.findMany({ where: { instituteId: context.instituteId, parentId: context.parent!.id, OR: [{ studentId: null }, { studentId: { in: context.studentIds } }] }, orderBy: { createdAt: "desc" }, take: 100 });
  return <div><h2 className="text-2xl font-semibold">EduTap notifications</h2><div className="mt-5 space-y-3">{items.map((item) => <div key={item.id} className="rounded-2xl border bg-white p-5"><p className="font-semibold">{item.title}</p><p className="mt-1 text-sm text-muted-foreground">{item.body ?? item.message}</p><p className="mt-2 text-xs text-muted-foreground">{item.createdAt.toLocaleString()}</p></div>)}</div></div>;
}
