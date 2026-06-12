import { NextResponse } from "next/server";
import { requireStudentMobileUser, StudentMobileAuthError } from "@/lib/student-mobile-auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { studentId } = await requireStudentMobileUser(request);
    const records = await prisma.attendanceRecord.findMany({
      where: { studentId },
      include: { session: { include: { classGroup: true } } },
      orderBy: { markedAt: "desc" },
      take: 200
    });

    const byClass = new Map<string, { className: string; total: number; present: number; late: number; absent: number; excused: number }>();
    for (const record of records) {
      const entry = byClass.get(record.session.classGroupId) ?? { className: record.session.classGroup.name, total: 0, present: 0, late: 0, absent: 0, excused: 0 };
      entry.total += 1;
      entry[record.status.toLowerCase() as "present" | "late" | "absent" | "excused"] += 1;
      byClass.set(record.session.classGroupId, entry);
    }

    const present = records.filter((item) => item.status === "PRESENT" || item.status === "LATE").length;
    return NextResponse.json({
      ok: true,
      percentage: records.length ? Math.round((present / records.length) * 100) : 0,
      classWise: Array.from(byClass.values()).map((item) => ({ ...item, percentage: item.total ? Math.round(((item.present + item.late) / item.total) * 100) : 0 })),
      history: records.map((record) => ({
        id: record.id,
        status: record.status,
        source: record.source,
        markedAt: record.markedAt.toISOString(),
        className: record.session.classGroup.name,
        sessionDate: record.session.sessionDate.toISOString()
      }))
    });
  } catch (error) {
    if (error instanceof StudentMobileAuthError) return NextResponse.json({ ok: false, message: error.message }, { status: error.statusCode });
    console.error(error);
    return NextResponse.json({ ok: false, message: "Could not load attendance." }, { status: 500 });
  }
}
