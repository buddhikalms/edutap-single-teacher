import { AttendanceSource, AttendanceStatus, Prisma } from "@prisma/client";
import { markAttendanceByCredential, type AttendanceMarkResult } from "@/lib/attendance";
import { prisma } from "@/lib/prisma";
import { clientIp } from "@/lib/rate-limit";

export class FingerprintAttendanceError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

export function requireFingerprintDeviceKey(request: Request) {
  const configured = process.env.FINGERPRINT_ATTENDANCE_API_KEY;
  if (!configured) return false;
  const provided = request.headers.get("x-fingerprint-api-key") || request.headers.get("x-attendance-device-key");
  if (provided !== configured) {
    throw new FingerprintAttendanceError("Fingerprint device API key is invalid.", 401);
  }
  return true;
}

export async function markAttendanceByFingerprint(input: {
  request: Request;
  classGroupId: string;
  deviceId: string;
  eventId?: string;
  fingerprintId?: string;
  studentId?: string;
  admissionNo?: string;
  status: AttendanceStatus;
  occurredAt?: string;
}): Promise<AttendanceMarkResult> {
  const classGroup = await prisma.classGroup.findUnique({
    where: { id: input.classGroupId },
    select: { id: true, instituteId: true }
  });
  if (!classGroup) throw new FingerprintAttendanceError("Class was not found.", 404);

  const eventId =
    input.eventId ||
    `${input.deviceId}:${input.fingerprintId ?? input.studentId ?? input.admissionNo}:${input.occurredAt ?? new Date().toISOString()}`;

  const previous = await prisma.fingerprintAttendanceEvent.findUnique({ where: { eventId } });
  if (previous?.responseJson) {
    return { ...(previous.responseJson as unknown as AttendanceMarkResult), idempotent: true };
  }
  if (previous) {
    return { ok: false, statusCode: 202, message: "This fingerprint event is already being processed.", idempotent: true };
  }

  const credential = input.fingerprintId
    ? await prisma.studentFingerprintCredential.findFirst({
        where: {
          instituteId: classGroup.instituteId,
          externalFingerprintId: input.fingerprintId,
          status: "ACTIVE"
        },
        select: { studentId: true }
      })
    : null;
  const student = input.studentId
    ? await prisma.student.findFirst({ where: { id: input.studentId, instituteId: classGroup.instituteId }, select: { id: true } })
    : input.admissionNo
      ? await prisma.student.findFirst({ where: { admissionNo: input.admissionNo, instituteId: classGroup.instituteId }, select: { id: true } })
      : credential
        ? { id: credential.studentId }
        : null;

  if (!student) {
    const result: AttendanceMarkResult = {
      ok: false,
      statusCode: 404,
      message: "Fingerprint user was not recognized."
    };
    await prisma.fingerprintAttendanceEvent.create({
      data: {
        eventId,
        instituteId: classGroup.instituteId,
        classGroupId: input.classGroupId,
        externalFingerprintId: input.fingerprintId,
        deviceId: input.deviceId,
        statusCode: result.statusCode,
        result: "FINGERPRINT_NOT_FOUND",
        responseJson: result as unknown as Prisma.InputJsonObject,
        ipAddress: clientIp(input.request),
        occurredAt: input.occurredAt ? new Date(input.occurredAt) : null
      }
    });
    return result;
  }

  await prisma.fingerprintAttendanceEvent.create({
    data: {
      eventId,
      instituteId: classGroup.instituteId,
      classGroupId: input.classGroupId,
      studentId: student.id,
      externalFingerprintId: input.fingerprintId,
      deviceId: input.deviceId,
      statusCode: 202,
      result: "PROCESSING",
      ipAddress: clientIp(input.request),
      occurredAt: input.occurredAt ? new Date(input.occurredAt) : null
    }
  });

  const result = await markAttendanceByCredential({
    classGroupId: input.classGroupId,
    studentId: student.id,
    status: input.status,
    source: AttendanceSource.FINGERPRINT,
    searchMethod: "FINGERPRINT",
    deviceId: input.deviceId,
    scannedValue: input.fingerprintId ?? input.studentId ?? input.admissionNo ?? "",
    timestamp: input.occurredAt,
    ipAddress: clientIp(input.request)
  });

  await Promise.all([
    prisma.fingerprintAttendanceEvent.update({
      where: { eventId },
      data: {
        statusCode: result.statusCode,
        result: result.ok ? (result.duplicate ? "DUPLICATE_ATTENDANCE" : "SUCCESS") : result.message,
        responseJson: result as unknown as Prisma.InputJsonObject,
        processedAt: new Date()
      }
    }),
    input.fingerprintId
      ? prisma.studentFingerprintCredential.updateMany({
          where: { instituteId: classGroup.instituteId, externalFingerprintId: input.fingerprintId, studentId: student.id },
          data: { lastVerifiedAt: new Date() }
        })
      : Promise.resolve()
  ]);

  return result;
}
