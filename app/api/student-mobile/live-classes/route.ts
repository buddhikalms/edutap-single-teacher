import { NextResponse } from "next/server";
import { meetingProviderLabel } from "@/lib/live-meeting-providers";
import { isAssignedToStudent, isLiveClassLocked, liveClassRuntimeStatus, providerLabel } from "@/lib/live-classes";
import { prisma } from "@/lib/prisma";
import { requireStudentMobileUser, StudentMobileAuthError } from "@/lib/student-mobile-auth";

function serializeLiveClass(liveClass: Awaited<ReturnType<typeof getLiveClasses>>[number], studentId: string) {
  const runtime = liveClassRuntimeStatus(liveClass);
  const locked = isLiveClassLocked(liveClass);
  return {
    id: liveClass.id,
    title: liveClass.title,
    description: liveClass.description,
    provider: liveClass.provider,
    meetingProvider: liveClass.meetingProvider,
    providerLabel: meetingProviderLabel(liveClass.meetingProvider) || providerLabel(liveClass.provider),
    startTime: liveClass.startTime.toISOString(),
    endTime: liveClass.endTime.toISOString(),
    durationMinutes: liveClass.durationMinutes,
    className: liveClass.classGroup.name,
    courseName: liveClass.course?.name ?? liveClass.classGroup.subject.name,
    teacherName: liveClass.teacher?.name ?? liveClass.classGroup.teacher?.name ?? "Teacher",
    accessType: liveClass.accessType,
    price: Number(liveClass.price),
    locked,
    runtime,
    joined: liveClass.attendances.some((attendance) => attendance.studentId === studentId),
    attendance: liveClass.attendances[0]
      ? {
          joinedAt: liveClass.attendances[0].joinedAt.toISOString(),
          leftAt: liveClass.attendances[0].leftAt?.toISOString() ?? null,
          durationWatched: liveClass.attendances[0].durationWatched,
          status: liveClass.attendances[0].status
        }
      : null,
    recordings: liveClass.recordings.map((recording) => ({
      id: recording.id,
      title: recording.title,
      description: recording.description,
      recordingUrl: recording.accessType === "PAID" && Number(recording.price) > 0 ? null : recording.recordingUrl,
      accessType: recording.accessType,
      price: Number(recording.price),
      locked: recording.accessType === "PAID" && Number(recording.price) > 0
    }))
  };
}

function getLiveClasses(instituteId: string, studentId: string) {
  return prisma.liveClass.findMany({
    where: {
      instituteId,
      status: { in: ["PUBLISHED", "COMPLETED"] },
      classGroup: {
        enrollments: { some: { studentId, active: true } }
      }
    },
    include: {
      classGroup: { include: { subject: true, teacher: true } },
      course: true,
      teacher: true,
      attendances: { where: { studentId } },
      recordings: { orderBy: { createdAt: "desc" } }
    },
    orderBy: { startTime: "asc" }
  });
}

export async function GET(request: Request) {
  try {
    const { studentId, instituteId } = await requireStudentMobileUser(request);
    const liveClasses = (await getLiveClasses(instituteId, studentId)).filter((liveClass) => isAssignedToStudent(liveClass, studentId));
    const serialized = liveClasses.map((liveClass) => serializeLiveClass(liveClass, studentId));

    return NextResponse.json({
      ok: true,
      liveNow: serialized.filter((item) => item.runtime === "live"),
      upcoming: serialized.filter((item) => item.runtime === "upcoming"),
      completed: serialized.filter((item) => item.runtime === "completed"),
      joinHistory: serialized.filter((item) => item.joined)
    });
  } catch (error) {
    if (error instanceof StudentMobileAuthError) return NextResponse.json({ ok: false, message: error.message }, { status: error.statusCode });
    console.error(error);
    return NextResponse.json({ ok: false, message: "Could not load live classes." }, { status: 500 });
  }
}
