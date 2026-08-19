import { NextResponse } from "next/server";
import { faceServiceHealth } from "@/lib/face-recognition-client";
import { requireStaffFaceAccess, StaffFaceError } from "@/lib/staff-face-attendance";

export async function GET() {
  try {
    await requireStaffFaceAccess("attendance");
    const health = await faceServiceHealth();
    return NextResponse.json(health);
  } catch (error) {
    if (error instanceof StaffFaceError) return NextResponse.json({ ok: false, code: error.code, message: error.message }, { status: error.statusCode });
    return NextResponse.json({ ok: false, message: "Face service health check failed." }, { status: 500 });
  }
}
