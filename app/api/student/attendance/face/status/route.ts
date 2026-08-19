import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireFaceStudent, studentFaceAuthResponse } from "@/lib/student-face-auth";

const querySchema = z.object({
  attendanceSessionId: z.string().min(1).optional()
});

export async function GET(request: Request) {
  try {
    const { studentId } = await requireFaceStudent(request);
    const params = querySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    const [profile, latestAttempt, record] = await Promise.all([
      prisma.studentFaceProfile.findUnique({ where: { studentId }, select: { status: true, enrolledAt: true, lastVerifiedAt: true } }),
      prisma.faceVerificationAttempt.findFirst({
        where: { studentId, attendanceSessionId: params.attendanceSessionId },
        orderBy: { createdAt: "desc" }
      }),
      params.attendanceSessionId
        ? prisma.attendanceRecord.findUnique({
            where: { sessionId_studentId: { sessionId: params.attendanceSessionId, studentId } },
            select: { id: true, status: true, markedAt: true, source: true }
          })
        : null
    ]);

    return NextResponse.json({
      ok: true,
      profile,
      latestAttempt,
      attendance: record
    });
  } catch (error) {
    const auth = studentFaceAuthResponse(error);
    if (auth) return auth;
    if (error instanceof z.ZodError) return NextResponse.json({ ok: false, message: "Invalid status request." }, { status: 400 });
    console.error(error);
    return NextResponse.json({ ok: false, message: "Could not load face attendance status." }, { status: 500 });
  }
}
