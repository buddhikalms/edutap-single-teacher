import Link from "next/link";
import { ScanFace } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { getStudentWebContext } from "@/lib/student-web";

export default async function StudentAttendance() {
  const { studentId, instituteId } = await getStudentWebContext();
  const [rows, settings] = await Promise.all([
    prisma.attendanceRecord.findMany({
      where: { studentId },
      include: { session: { include: { classGroup: { include: { subject: true } } } } },
      orderBy: { markedAt: "desc" }
    }),
    prisma.instituteSettings.findUnique({ where: { instituteId }, select: { faceAttendanceEnabled: true } })
  ]);
  const grouped = Map.groupBy(rows, (record) => record.session.classGroup.name);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-3xl font-semibold">Attendance</h2>
        {settings?.faceAttendanceEnabled ? (
          <Button asChild>
            <Link href="/student/attendance/face">
              <ScanFace className="h-4 w-4" />
              Face Scan
            </Link>
          </Button>
        ) : null}
      </div>

      {Array.from(grouped).map(([name, items]) => {
        const pct = items.length ? Math.round((items.filter((item) => item.status === "PRESENT" || item.status === "LATE").length / items.length) * 100) : 0;
        return (
          <Card key={name}>
            <CardContent className="p-5">
              <div className="flex justify-between">
                <h3 className="font-semibold">{name}</h3>
                <Badge>{pct}%</Badge>
              </div>
              <div className="mt-4 space-y-2">
                {items.map((item) => (
                  <div key={item.id} className="flex justify-between rounded-lg bg-muted/50 p-3 text-sm">
                    <span>{item.session.sessionDate.toLocaleDateString()}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{item.source.toLowerCase()}</Badge>
                      <Badge variant={item.status === "PRESENT" ? "success" : item.status === "LATE" ? "warning" : "outline"}>{item.status.toLowerCase()}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
