import { NextResponse } from "next/server";
import { z } from "zod";
import { StaffFaceError, staffDeleteFaceProfile, staffEnrollFaceProfile } from "@/lib/staff-face-attendance";

const enrolSchema = z.object({
  frames: z.array(z.string().startsWith("data:image/")).min(5).max(10),
  policyVersion: z.string().min(3).max(80).default("2026-08-staff-face-attendance-v1"),
  deviceInfo: z.string().max(1000).optional()
});

export async function POST(request: Request, context: { params: Promise<{ studentId: string }> }) {
  try {
    const { studentId } = await context.params;
    const body = enrolSchema.parse(await request.json());
    const result = await staffEnrollFaceProfile({
      request,
      studentId,
      frames: body.frames,
      policyVersion: body.policyVersion,
      deviceInfo: body.deviceInfo
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof StaffFaceError) return NextResponse.json({ ok: false, code: error.code, message: error.message }, { status: error.statusCode });
    if (error instanceof z.ZodError) return NextResponse.json({ ok: false, message: "Invalid face enrollment payload." }, { status: 422 });
    console.error(error);
    return NextResponse.json({ ok: false, message: "Could not enroll face profile." }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ studentId: string }> }) {
  try {
    const { studentId } = await context.params;
    const result = await staffDeleteFaceProfile({ request, studentId });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof StaffFaceError) return NextResponse.json({ ok: false, code: error.code, message: error.message }, { status: error.statusCode });
    console.error(error);
    return NextResponse.json({ ok: false, message: "Could not delete face profile." }, { status: 500 });
  }
}
