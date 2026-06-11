import { AttendanceSource, AttendanceStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { AttendanceAccessError, requireAttendanceScannerAccess } from "@/lib/attendance-access";
import { markAttendanceByCredential } from "@/lib/attendance";
import { nfcAttendanceSchema } from "@/lib/validations";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = nfcAttendanceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, message: "Invalid NFC attendance payload.", errors: parsed.error.flatten().fieldErrors },
        { status: 422 }
      );
    }

    await requireAttendanceScannerAccess(request, parsed.data.classGroupId);

    const result = await markAttendanceByCredential({
      classGroupId: parsed.data.classGroupId,
      nfcUid: parsed.data.nfcUid,
      status: parsed.data.status as AttendanceStatus,
      source: AttendanceSource.NFC
    });

    return NextResponse.json(result, { status: result.statusCode });
  } catch (error) {
    if (error instanceof AttendanceAccessError) {
      return NextResponse.json({ ok: false, message: error.message }, { status: error.statusCode });
    }

    console.error(error);
    return NextResponse.json({ ok: false, message: "Could not process NFC attendance." }, { status: 500 });
  }
}
