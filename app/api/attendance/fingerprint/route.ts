import { AttendanceStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { AttendanceAccessError, requireAttendanceScannerAccess } from "@/lib/attendance-access";
import { FingerprintAttendanceError, markAttendanceByFingerprint, requireFingerprintDeviceKey } from "@/lib/fingerprint-attendance";
import { checkRateLimit, rateLimitKey, rateLimitResponse } from "@/lib/rate-limit";
import { fingerprintAttendanceSchema } from "@/lib/validations";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = fingerprintAttendanceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, message: "Invalid fingerprint attendance payload.", errors: parsed.error.flatten().fieldErrors },
        { status: 422 }
      );
    }

    const deviceAuthenticated = requireFingerprintDeviceKey(request);
    if (!deviceAuthenticated) {
      await requireAttendanceScannerAccess(request, parsed.data.classGroupId);
    }

    const rateLimit = checkRateLimit({
      key: rateLimitKey(request, "attendance:fingerprint", parsed.data.deviceId),
      limit: Number.parseInt(process.env.FINGERPRINT_ATTENDANCE_RATE_LIMIT_PER_MINUTE || "120", 10),
      windowMs: 60_000
    });
    if (!rateLimit.ok) return rateLimitResponse(rateLimit.resetAt);

    const result = await markAttendanceByFingerprint({
      request,
      classGroupId: parsed.data.classGroupId,
      deviceId: parsed.data.deviceId,
      eventId: parsed.data.eventId ?? parsed.data.scanId,
      fingerprintId: parsed.data.fingerprintId ?? parsed.data.scannedValue,
      studentId: parsed.data.studentId,
      admissionNo: parsed.data.admissionNo,
      status: parsed.data.status as AttendanceStatus,
      occurredAt: parsed.data.occurredAt ?? parsed.data.timestamp
    });

    return NextResponse.json(result, { status: result.statusCode });
  } catch (error) {
    if (error instanceof FingerprintAttendanceError || error instanceof AttendanceAccessError) {
      return NextResponse.json({ ok: false, message: error.message }, { status: error.statusCode });
    }

    console.error(error);
    return NextResponse.json({ ok: false, message: "Could not process fingerprint attendance." }, { status: 500 });
  }
}
