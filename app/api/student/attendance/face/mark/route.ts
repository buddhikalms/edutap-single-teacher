import { NextResponse } from "next/server";
import { z } from "zod";
import { FaceAttendanceError, markFaceAttendanceWithToken } from "@/lib/face-attendance";
import { requireFaceStudent, studentFaceAuthResponse } from "@/lib/student-face-auth";

const schema = z.object({
  verificationToken: z.string().min(40),
  deviceId: z.string().max(120).optional()
});

export async function POST(request: Request) {
  try {
    const { studentId } = await requireFaceStudent(request);
    const body = schema.parse(await request.json());
    const result = await markFaceAttendanceWithToken({
      studentId,
      token: body.verificationToken,
      deviceId: body.deviceId
    });

    return NextResponse.json(result, { status: result.statusCode });
  } catch (error) {
    const auth = studentFaceAuthResponse(error);
    if (auth) return auth;
    if (error instanceof z.ZodError) return NextResponse.json({ ok: false, message: "Invalid attendance request." }, { status: 400 });
    if (error instanceof FaceAttendanceError) return NextResponse.json({ ok: false, code: error.code, message: error.message }, { status: error.statusCode });
    console.error(error);
    return NextResponse.json({ ok: false, message: "Could not mark face attendance." }, { status: 500 });
  }
}
