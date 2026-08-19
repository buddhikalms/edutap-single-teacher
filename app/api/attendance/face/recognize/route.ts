import { NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit, rateLimitKey, rateLimitResponse } from "@/lib/rate-limit";
import { recognizeFaceForSession, StaffFaceError } from "@/lib/staff-face-attendance";

const recognizeSchema = z.object({
  attendanceSessionId: z.string().min(1),
  frames: z.array(z.string().startsWith("data:image/")).min(3).max(12),
  challengeActions: z.array(z.string()).min(2).max(3),
  deviceId: z.string().max(160).optional(),
  deviceLabel: z.string().max(240).optional()
});

export async function POST(request: Request) {
  try {
    const body = recognizeSchema.parse(await request.json());
    const limit = checkRateLimit({
      key: rateLimitKey(request, "attendance:face:kiosk", body.deviceId),
      limit: Number.parseInt(process.env.FACE_KIOSK_RATE_LIMIT_PER_MINUTE ?? "60", 10),
      windowMs: 60_000
    });
    if (!limit.ok) return rateLimitResponse(limit.resetAt);

    const result = await recognizeFaceForSession({
      request,
      attendanceSessionId: body.attendanceSessionId,
      frames: body.frames,
      challengeActions: body.challengeActions,
      deviceId: body.deviceId,
      deviceLabel: body.deviceLabel
    });
    return NextResponse.json(result, { status: result.ok ? 200 : 422 });
  } catch (error) {
    if (error instanceof StaffFaceError) return NextResponse.json({ ok: false, code: error.code, message: error.message }, { status: error.statusCode });
    if (error instanceof z.ZodError) return NextResponse.json({ ok: false, message: "Invalid face recognition payload." }, { status: 422 });
    console.error(error);
    return NextResponse.json({ ok: false, message: "Could not process face recognition." }, { status: 500 });
  }
}
