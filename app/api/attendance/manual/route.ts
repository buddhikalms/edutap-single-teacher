import { AttendanceSource, AttendanceStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { AttendanceAccessError, requireAttendanceScannerAccess } from "@/lib/attendance-access";
import { markAttendanceByCredential } from "@/lib/attendance";
import { manualIdAttendanceSchema } from "@/lib/validations";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = manualIdAttendanceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, message: "Invalid manual attendance payload.", errors: parsed.error.flatten().fieldErrors },
        { status: 422 }
      );
    }

    await requireAttendanceScannerAccess(request, parsed.data.classGroupId);

    const result = await markAttendanceByCredential({
      classGroupId: parsed.data.classGroupId,
      studentId: parsed.data.studentId,
      status: parsed.data.status as AttendanceStatus,
      source: AttendanceSource.MANUAL,
      searchMethod: parsed.data.method,
      notes: parsed.data.notes
    });

    return NextResponse.json(result, { status: result.statusCode });
  } catch (error) {
    if (error instanceof AttendanceAccessError) {
      return NextResponse.json({ ok: false, message: error.message }, { status: error.statusCode });
    }

    console.error(error);
    return NextResponse.json({ ok: false, message: "Could not process manual attendance." }, { status: 500 });
  }
}
