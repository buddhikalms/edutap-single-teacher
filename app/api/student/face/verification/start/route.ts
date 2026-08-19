import { NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit, rateLimitKey, rateLimitResponse } from "@/lib/rate-limit";
import { validateFaceVerificationStart, FaceAttendanceError } from "@/lib/face-attendance";
import { requireFaceStudent, studentFaceAuthResponse } from "@/lib/student-face-auth";

const schema = z.object({
  attendanceSessionId: z.string().min(1),
  deviceId: z.string().max(120).optional()
});

const actions = ["blink", "turn_left", "turn_right", "look_up", "look_down", "move_closer"];

function challengeActions() {
  return [...actions].sort(() => Math.random() - 0.5).slice(0, 3);
}

export async function POST(request: Request) {
  try {
    const { studentId } = await requireFaceStudent(request);
    const body = schema.parse(await request.json());
    const limit = checkRateLimit({
      key: rateLimitKey(request, "face-verification", studentId),
      limit: Number.parseInt(process.env.FACE_MAX_ATTEMPTS || "3", 10),
      windowMs: Number.parseInt(process.env.FACE_ATTEMPT_COOLDOWN_SECONDS || "30", 10) * 1000
    });
    if (!limit.ok) return rateLimitResponse(limit.resetAt);

    const { attempt, settings } = await validateFaceVerificationStart({
      studentId,
      attendanceSessionId: body.attendanceSessionId,
      deviceId: body.deviceId,
      request
    });
    return NextResponse.json({
      ok: true,
      attemptId: attempt.id,
      challengeActions: challengeActions(),
      expiresInSeconds: settings.faceVerificationTokenTtlSeconds
    });
  } catch (error) {
    const auth = studentFaceAuthResponse(error);
    if (auth) return auth;
    if (error instanceof z.ZodError) return NextResponse.json({ ok: false, message: "Invalid verification request." }, { status: 400 });
    if (error instanceof FaceAttendanceError) return NextResponse.json({ ok: false, code: error.code, message: error.message }, { status: error.statusCode });
    console.error(error);
    return NextResponse.json({ ok: false, code: "NETWORK_ERROR", message: "Could not start verification." }, { status: 500 });
  }
}
