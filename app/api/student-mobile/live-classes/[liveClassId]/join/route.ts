import { NextResponse } from "next/server";
import { isAssignedToStudent, isLiveClassLocked, liveClassRuntimeStatus } from "@/lib/live-classes";
import { prisma } from "@/lib/prisma";
import { requireStudentMobileUser, StudentMobileAuthError } from "@/lib/student-mobile-auth";

type RouteContext = { params: Promise<{ liveClassId: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const { liveClassId } = await context.params;
    const { studentId, instituteId } = await requireStudentMobileUser(request);
    const liveClass = await prisma.liveClass.findFirst({
      where: {
        id: liveClassId,
        instituteId,
        status: "PUBLISHED",
        classGroup: {
          enrollments: { some: { studentId, active: true } }
        }
      }
    });

    if (!liveClass || !isAssignedToStudent(liveClass, studentId)) {
      return NextResponse.json({ ok: false, message: "Live class was not found." }, { status: 404 });
    }

    if (isLiveClassLocked(liveClass)) {
      return NextResponse.json({ ok: false, locked: true, message: "This live class is locked. Please unlock paid access before joining." }, { status: 402 });
    }

    const runtime = liveClassRuntimeStatus(liveClass);
    if (runtime === "cancelled" || runtime === "completed" || runtime === "draft") {
      return NextResponse.json({ ok: false, message: "This live class is not open for joining." }, { status: 409 });
    }

    const attendance = await prisma.liveClassAttendance.upsert({
      where: { liveClassId_studentId: { liveClassId, studentId } },
      create: {
        instituteId,
        liveClassId,
        studentId,
        joinedAt: new Date(),
        status: "JOINED"
      },
      update: {
        leftAt: null,
        status: "JOINED"
      }
    });

    return NextResponse.json({
      ok: true,
      meetingUrl: liveClass.joinUrl ?? liveClass.meetingUrl,
      attendance: {
        id: attendance.id,
        joinedAt: attendance.joinedAt.toISOString(),
        status: attendance.status,
        leftAt: attendance.leftAt?.toISOString() ?? null,
        durationWatched: attendance.durationWatched
      }
    });
  } catch (error) {
    if (error instanceof StudentMobileAuthError) return NextResponse.json({ ok: false, message: error.message }, { status: error.statusCode });
    console.error(error);
    return NextResponse.json({ ok: false, message: "Could not join live class." }, { status: 500 });
  }
}
