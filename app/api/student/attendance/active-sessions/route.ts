import { NextResponse } from "next/server";
import { activeFaceSessionsForStudent } from "@/lib/face-attendance";
import { requireFaceStudent, studentFaceAuthResponse } from "@/lib/student-face-auth";

export async function GET(request: Request) {
  try {
    const { studentId } = await requireFaceStudent(request);
    const sessions = await activeFaceSessionsForStudent(studentId);
    return NextResponse.json({
      ok: true,
      sessions: sessions.map((session) => ({
        id: session.id,
        classGroupId: session.classGroupId,
        className: session.classGroup.name,
        subject: session.classGroup.subject.name,
        teacherName: session.classGroup.teacher?.name ?? "Teacher",
        sessionDate: session.sessionDate.toISOString(),
        startsAt: session.startsAt?.toISOString() ?? null,
        endsAt: session.endsAt?.toISOString() ?? null,
        status: session.status,
        alreadyMarked: session.records.length > 0,
        existingRecord: session.records[0]
          ? {
              id: session.records[0].id,
              status: session.records[0].status,
              markedAt: session.records[0].markedAt.toISOString(),
              source: session.records[0].source
            }
          : null
      }))
    });
  } catch (error) {
    const auth = studentFaceAuthResponse(error);
    if (auth) return auth;
    console.error(error);
    return NextResponse.json({ ok: false, message: "Could not load active sessions." }, { status: 500 });
  }
}
