import { CalendarCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getPortalContext } from "@/lib/portal";
import { prisma } from "@/lib/prisma";

function statusVariant(status: string) {
  if (status === "PRESENT") return "success";
  if (status === "LATE" || status === "EXCUSED") return "warning";
  return "outline";
}

export default async function PortalAttendancePage() {
  const context = await getPortalContext();
  const records = await prisma.attendanceRecord.findMany({
    where: { studentId: { in: context.studentIds } },
    orderBy: { markedAt: "desc" },
    include: {
      student: true,
      session: { include: { classGroup: true } }
    }
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-normal">Attendance history</h2>
        <p className="mt-2 text-sm text-muted-foreground">Daily marks, source, class, and marked time.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Records</CardTitle>
          <CardDescription>{records.length} attendance entries</CardDescription>
        </CardHeader>
        <CardContent>
          {records.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <CalendarCheck className="mb-3 h-8 w-8 text-muted-foreground" />
              <p className="font-semibold">No attendance records yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {records.map((record) => (
                <div key={record.id} className="flex flex-col gap-3 rounded-2xl border bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold">
                      {record.student.firstName} {record.student.lastName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {record.session.classGroup.name} · {record.session.sessionDate.toLocaleDateString()} · {record.source}
                    </p>
                    {record.notes ? <p className="mt-1 text-xs text-muted-foreground">{record.notes}</p> : null}
                  </div>
                  <Badge variant={statusVariant(record.status)}>{record.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
