import { getFamilyContext } from "@/lib/family";
import { prisma } from "@/lib/prisma";

export default async function FamilyAttendancePage() {
  const { selectedStudent: student } = await getFamilyContext();
  const records = await prisma.attendanceRecord.findMany({ where: { studentId: student.id }, include: { session: { include: { classGroup: true } } }, orderBy: { markedAt: "desc" }, take: 100 });
  return <div><h2 className="text-2xl font-semibold">Attendance · {student.firstName}</h2><div className="mt-5 space-y-3">{records.map((record) => <div key={record.id} className="flex justify-between rounded-2xl border bg-white p-4"><div><p className="font-semibold">{record.session.classGroup.name}</p><p className="text-sm text-muted-foreground">{record.markedAt.toLocaleString()}</p></div><span className="font-semibold text-teal-700">{record.status}</span></div>)}</div></div>;
}
