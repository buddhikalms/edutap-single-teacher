import { AttendanceSource, AttendanceStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { AttendanceAccessError, requireAttendanceScannerAccess } from "@/lib/attendance-access";
import { markAttendanceByCredential } from "@/lib/attendance";
import { prisma } from "@/lib/prisma";
import { checkAttendanceScanRateLimit, clientIp, rateLimitResponse } from "@/lib/rate-limit";
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
    if (parsed.data.scanId) {
      const replay = await prisma.scanRequestLog.findUnique({ where: { scanId: parsed.data.scanId } });
      if (replay?.responseJson) {
        const response = replay.responseJson as Record<string, unknown>;
        return NextResponse.json({ ...response, idempotent: true }, { status: Number(response.statusCode ?? replay.statusCode) });
      }
    }
    const deviceId = parsed.data.deviceId ?? request.headers.get("x-reader-device-id") ?? "dashboard";
    const scannedValue = parsed.data.scannedValue ?? parsed.data.nfcUid;
    const rateLimit = checkAttendanceScanRateLimit({ request, deviceId, scannedValue, scanType: "nfc" });

    if (!rateLimit.ok) {
      return rateLimitResponse(rateLimit.resetAt);
    }

    const result = await markAttendanceByCredential({
      classGroupId: parsed.data.classGroupId,
      nfcUid: parsed.data.nfcUid,
      status: parsed.data.status as AttendanceStatus,
      source: AttendanceSource.NFC,
      searchMethod: "NFC",
      scanId: parsed.data.scanId,
      deviceId,
      scanType: "NFC",
      scannedValue,
      timestamp: parsed.data.timestamp,
      ipAddress: clientIp(request)
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
