import { AttendanceSource, AttendanceStatus, FaceVerificationResult, PaymentStatus, Prisma, StudentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { enqueueAttendanceNotifications, type AttendanceNotificationPayload } from "@/lib/attendance-notification-queue";
import { clientIp } from "@/lib/rate-limit";
import { faceErrorMessage } from "@/lib/face-error-messages";
import { hashSafe } from "@/lib/biometric-encryption";
import { hashVerificationToken, parseVerificationToken } from "@/lib/verification-token";
import { formatCurrency } from "@/lib/utils";
import type { AttendanceMarkResult } from "@/lib/attendance";

export class FaceAttendanceError extends Error {
  statusCode: number;
  code: string;

  constructor(code: string, statusCode = 400, message = faceErrorMessage(code)) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
  }
}

export function statusFromTiming(now: Date, lateAfter?: Date | null): AttendanceStatus {
  return lateAfter && now > lateAfter ? AttendanceStatus.LATE : AttendanceStatus.PRESENT;
}

async function getPaymentStatus(studentId: string, classGroupId: string, instituteId: string) {
  const [payments, settings] = await Promise.all([
    prisma.payment.findMany({
      where: {
        studentId,
        OR: [{ classGroupId }, { classGroupId: null }],
        status: { in: [PaymentStatus.PENDING, PaymentStatus.PARTIAL, PaymentStatus.OVERDUE] }
      }
    }),
    prisma.instituteSettings.findUnique({ where: { instituteId }, select: { currency: true } })
  ]);
  const currency = settings?.currency ?? "USD";
  const amountDue = payments.reduce((total, payment) => total + Number(payment.balance), 0);
  const hasOverdue = payments.some((payment) => payment.status === PaymentStatus.OVERDUE || payment.dueDate < new Date());
  const hasPartial = payments.some((payment) => payment.status === PaymentStatus.PARTIAL);

  if (amountDue <= 0) {
    return { status: "clear" as const, label: "Payments clear", amountDue: 0 };
  }

  return {
    status: hasOverdue ? ("overdue" as const) : hasPartial ? ("partial" as const) : ("pending" as const),
    label: `${hasOverdue ? "Overdue" : hasPartial ? "Partial" : "Pending"} ${formatCurrency(amountDue, currency)}`,
    amountDue
  };
}

export async function auditFace(input: {
  tx?: Prisma.TransactionClient;
  instituteId: string;
  sessionId: string;
  studentId?: string;
  recordId?: string;
  success: boolean;
  message: string;
  status?: AttendanceStatus;
  metadata?: Record<string, unknown>;
}) {
  const client = input.tx ?? prisma;
  await client.attendanceAuditLog.create({
    data: {
      instituteId: input.instituteId,
      sessionId: input.sessionId,
      studentId: input.studentId,
      recordId: input.recordId,
      source: AttendanceSource.FACE,
      status: input.status,
      success: input.success,
      message: input.message,
      metadata: input.metadata as Prisma.InputJsonObject | undefined
    }
  });
}

export async function activeFaceSessionsForStudent(studentId: string) {
  const now = new Date();
  return prisma.attendanceSession.findMany({
    where: {
      status: "ACTIVE",
      OR: [{ startsAt: null }, { startsAt: { lte: now } }],
      AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
      classGroup: {
        enrollments: { some: { studentId, active: true, status: "ACTIVE" } }
      }
    },
    include: {
      classGroup: {
        include: {
          subject: true,
          teacher: true
        }
      },
      records: {
        where: { studentId },
        select: { id: true, status: true, markedAt: true, source: true }
      }
    },
    orderBy: { sessionDate: "desc" },
    take: 20
  });
}

export async function validateFaceVerificationStart(input: {
  studentId: string;
  attendanceSessionId: string;
  deviceId?: string | null;
  request: Request;
}) {
  const now = new Date();
  const session = await prisma.attendanceSession.findUnique({
    where: { id: input.attendanceSessionId },
    include: {
      classGroup: {
        include: {
          enrollments: { where: { studentId: input.studentId }, select: { id: true, active: true, status: true } }
        }
      },
      records: { where: { studentId: input.studentId }, select: { id: true } }
    }
  });
  if (!session) throw new FaceAttendanceError("SESSION_NOT_FOUND", 404);
  if (session.status !== "ACTIVE") throw new FaceAttendanceError("SESSION_NOT_ACTIVE", 409);
  if (session.startsAt && session.startsAt > now) throw new FaceAttendanceError("SESSION_NOT_ACTIVE", 409);
  if (session.endsAt && session.endsAt < now) throw new FaceAttendanceError("SESSION_EXPIRED", 409);
  if (!session.classGroup.enrollments[0]?.active || session.classGroup.enrollments[0]?.status !== "ACTIVE") throw new FaceAttendanceError("NOT_ENROLLED", 403);
  if (session.records.length) throw new FaceAttendanceError("ALREADY_MARKED", 409);

  const [student, settings, profile, consent] = await Promise.all([
    prisma.student.findUnique({ where: { id: input.studentId }, select: { status: true, instituteId: true } }),
    prisma.instituteSettings.findUnique({ where: { instituteId: session.classGroup.instituteId } }),
    prisma.studentFaceProfile.findUnique({ where: { studentId: input.studentId } }),
    prisma.biometricConsent.findFirst({
      where: { studentId: input.studentId, consentType: "FACE_ATTENDANCE" },
      orderBy: { createdAt: "desc" }
    })
  ]);

  if (!student || student.status !== StudentStatus.ACTIVE) throw new FaceAttendanceError("FACE_PROFILE_INACTIVE", 403, "Student account is not active.");
  if (!settings?.faceAttendanceEnabled) throw new FaceAttendanceError("SESSION_NOT_ACTIVE", 409, "Face attendance is disabled for this institute.");
  if (!profile || profile.status !== "ACTIVE" || !profile.encryptedEmbedding || !profile.embeddingIv || !profile.embeddingAuthTag) {
    throw new FaceAttendanceError("FACE_PROFILE_NOT_FOUND", 404);
  }
  if (!consent?.consented || consent.revokedAt) throw new FaceAttendanceError(consent?.revokedAt ? "CONSENT_REVOKED" : "CONSENT_REQUIRED", 403);

  const recentAttempts = await prisma.faceVerificationAttempt.count({
    where: {
      studentId: input.studentId,
      attendanceSessionId: input.attendanceSessionId,
      createdAt: { gte: session.startsAt ?? session.sessionDate },
      result: { not: FaceVerificationResult.VERIFIED }
    }
  });
  if (recentAttempts >= settings.faceMaximumAttempts) throw new FaceAttendanceError("MAX_ATTEMPTS_REACHED", 429);

  const attempt = await prisma.faceVerificationAttempt.create({
    data: {
      studentId: input.studentId,
      attendanceSessionId: input.attendanceSessionId,
      deviceId: input.deviceId,
      result: FaceVerificationResult.ERROR,
      ipHash: hashSafe(clientIp(input.request)),
      userAgent: input.request.headers.get("user-agent")
    }
  });

  await auditFace({
    instituteId: session.classGroup.instituteId,
    sessionId: session.id,
    studentId: input.studentId,
    success: true,
    message: "Face verification started.",
    metadata: { attemptId: attempt.id, deviceId: input.deviceId }
  });

  return { session, settings, profile, attempt };
}

export async function validateFaceVerificationCompletion(input: {
  studentId: string;
  attendanceSessionId: string;
  attemptId: string;
}) {
  const now = new Date();
  const session = await prisma.attendanceSession.findUnique({
    where: { id: input.attendanceSessionId },
    include: {
      classGroup: true,
      records: { where: { studentId: input.studentId }, select: { id: true } }
    }
  });
  if (!session) throw new FaceAttendanceError("SESSION_NOT_FOUND", 404);
  if (session.status !== "ACTIVE") throw new FaceAttendanceError("SESSION_NOT_ACTIVE", 409);
  if (session.startsAt && session.startsAt > now) throw new FaceAttendanceError("SESSION_NOT_ACTIVE", 409);
  if (session.endsAt && session.endsAt < now) throw new FaceAttendanceError("SESSION_EXPIRED", 409);
  if (session.records.length) throw new FaceAttendanceError("ALREADY_MARKED", 409);

  const [settings, profile, attempt] = await Promise.all([
    prisma.instituteSettings.findUnique({ where: { instituteId: session.classGroup.instituteId } }),
    prisma.studentFaceProfile.findUnique({ where: { studentId: input.studentId } }),
    prisma.faceVerificationAttempt.findFirst({ where: { id: input.attemptId, studentId: input.studentId, attendanceSessionId: input.attendanceSessionId } })
  ]);
  if (!settings?.faceAttendanceEnabled) throw new FaceAttendanceError("SESSION_NOT_ACTIVE", 409, "Face attendance is disabled for this institute.");
  if (!profile || profile.status !== "ACTIVE" || !profile.encryptedEmbedding || !profile.embeddingIv || !profile.embeddingAuthTag) {
    throw new FaceAttendanceError("FACE_PROFILE_NOT_FOUND", 404);
  }
  if (!attempt) throw new FaceAttendanceError("VERIFICATION_TOKEN_EXPIRED", 404, "Verification attempt was not found.");
  if (attempt.completedAt) throw new FaceAttendanceError("VERIFICATION_TOKEN_REUSED", 409, "Verification attempt was already completed.");

  return { session, settings, profile, attempt };
}

export async function markFaceAttendanceWithToken(input: {
  studentId: string;
  token: string;
  deviceId?: string | null;
}): Promise<AttendanceMarkResult & { className?: string }> {
  const payload = parseVerificationToken(input.token);
  if (!payload || payload.studentId !== input.studentId) throw new FaceAttendanceError("VERIFICATION_TOKEN_EXPIRED", 401);
  if (payload.exp * 1000 < Date.now()) throw new FaceAttendanceError("VERIFICATION_TOKEN_EXPIRED", 401);
  if (payload.result !== FaceVerificationResult.VERIFIED) throw new FaceAttendanceError("FACE_MATCH_UNCERTAIN", 409);

  const tokenHash = hashVerificationToken(input.token);
  const queuePayloads: AttendanceNotificationPayload[] = [];

  const txResult = await prisma.$transaction(
    async (tx) => {
      const tokenRow = await tx.faceVerificationToken.findUnique({ where: { tokenHash }, include: { attempt: true } });
      if (!tokenRow) throw new FaceAttendanceError("VERIFICATION_TOKEN_EXPIRED", 401);
      if (tokenRow.consumedAt || tokenRow.attempt.tokenConsumedAt) throw new FaceAttendanceError("VERIFICATION_TOKEN_REUSED", 409);
      if (tokenRow.expiresAt < new Date()) throw new FaceAttendanceError("VERIFICATION_TOKEN_EXPIRED", 401);

      const session = await tx.attendanceSession.findUnique({
        where: { id: payload.attendanceSessionId },
        include: {
          classGroup: true,
          records: {
            where: { studentId: input.studentId },
            select: { id: true, status: true, markedAt: true, source: true }
          }
        }
      });
      if (!session) throw new FaceAttendanceError("SESSION_NOT_FOUND", 404);
      if (session.status !== "ACTIVE") throw new FaceAttendanceError("SESSION_NOT_ACTIVE", 409);
      if (session.endsAt && session.endsAt < new Date()) throw new FaceAttendanceError("SESSION_EXPIRED", 409);

      const [enrollment, student] = await Promise.all([
        tx.enrollment.findUnique({
          where: { studentId_classGroupId: { studentId: input.studentId, classGroupId: session.classGroupId } },
          select: { active: true, status: true }
        }),
        tx.student.findUnique({
          where: { id: input.studentId },
          select: { id: true, firstName: true, lastName: true, admissionNo: true }
        })
      ]);
      if (!student) throw new FaceAttendanceError("FACE_PROFILE_INACTIVE", 403, "Student was not found.");
      if (!enrollment?.active || enrollment.status !== "ACTIVE") throw new FaceAttendanceError("NOT_ENROLLED", 403);

      const studentPayload = {
        id: student.id,
        name: `${student.firstName} ${student.lastName}`,
        admissionNo: student.admissionNo
      };

      if (session.records[0]) {
        const existing = session.records[0];
        return {
          ok: true,
          statusCode: 200,
          message: "Attendance already marked.",
          student: studentPayload,
          status: existing.status,
          source: existing.source,
          markedAt: existing.markedAt.toISOString(),
          duplicate: true,
          className: session.classGroup.name,
          classGroupId: session.classGroupId,
          instituteId: session.classGroup.instituteId
        };
      }

      await tx.faceVerificationToken.update({ where: { id: tokenRow.id }, data: { consumedAt: new Date() } });
      await tx.faceVerificationAttempt.update({
        where: { id: tokenRow.attemptId },
        data: { tokenConsumedAt: new Date() }
      });

      const settings = await tx.instituteSettings.findUnique({ where: { instituteId: session.classGroup.instituteId } });
      const lateAfter = new Date((session.startsAt ?? session.sessionDate).getTime() + (settings?.attendanceLateAfterMins ?? 15) * 60_000);
      const status = statusFromTiming(new Date(), lateAfter);
      let record: { id: string; status: AttendanceStatus; markedAt: Date };
      let duplicate = false;
      try {
        record = await tx.attendanceRecord.create({
          data: {
            sessionId: session.id,
            studentId: input.studentId,
            status,
            source: AttendanceSource.FACE,
            searchMethod: "FACE",
            faceAttemptId: tokenRow.attemptId,
            confidenceScore: tokenRow.attempt.faceSimilarity,
            deviceId: input.deviceId ?? tokenRow.deviceId
          },
          select: { id: true, status: true, markedAt: true }
        });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
          const existing = await tx.attendanceRecord.findUniqueOrThrow({
            where: { sessionId_studentId: { sessionId: session.id, studentId: input.studentId } },
            select: { id: true, status: true, markedAt: true }
          });
          record = existing;
          duplicate = true;
        } else {
          throw error;
        }
      }

      await tx.studentFaceProfile.updateMany({
        where: { studentId: input.studentId, status: "ACTIVE" },
        data: { lastVerifiedAt: record.markedAt }
      });

      await auditFace({
        tx,
        instituteId: session.classGroup.instituteId,
        sessionId: session.id,
        studentId: input.studentId,
        recordId: record.id,
        success: !duplicate,
        status: record.status,
        message: duplicate ? "Attendance already marked." : "Attendance marked using face verification.",
        metadata: { attemptId: tokenRow.attemptId, deviceId: input.deviceId ?? tokenRow.deviceId, duplicate }
      });

      if (!duplicate) {
        queuePayloads.push({
          instituteId: session.classGroup.instituteId,
          attendanceRecordId: record.id,
          attendanceSessionId: session.id,
          studentId: input.studentId,
          classGroupId: session.classGroupId,
          branchId: session.classGroup.branchId,
          className: session.classGroup.name,
          status: record.status,
          markedAt: record.markedAt.toISOString()
        });
      }

      return {
        ok: true,
        statusCode: 200,
        message: duplicate ? "Attendance already marked." : "Attendance marked successfully.",
        student: studentPayload,
        status: record.status,
        source: AttendanceSource.FACE,
        markedAt: record.markedAt.toISOString(),
        duplicate,
        className: session.classGroup.name,
        classGroupId: session.classGroupId,
        instituteId: session.classGroup.instituteId
      };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted }
  );

  if (queuePayloads[0]) await enqueueAttendanceNotifications(queuePayloads[0]);
  const payment =
    txResult.student && "classGroupId" in txResult && "instituteId" in txResult
      ? await getPaymentStatus(txResult.student.id, String(txResult.classGroupId), String(txResult.instituteId))
      : undefined;

  return {
    ok: txResult.ok,
    statusCode: txResult.statusCode,
    message: txResult.message,
    student: txResult.student,
    status: txResult.status,
    source: txResult.source,
    markedAt: txResult.markedAt,
    duplicate: txResult.duplicate,
    payment,
    className: txResult.className
  };
}
