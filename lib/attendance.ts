import { AttendanceSource, AttendanceStatus, CardScanResult, CardScanType, PaymentStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { normalizeNfcUid } from "@/lib/nfc";
import { formatCurrency } from "@/lib/utils";
import { scanResultForCardStatus } from "@/lib/student-cards";
import { enqueueAttendanceNotifications, type AttendanceNotificationPayload } from "@/lib/attendance-notification-queue";

export type AttendanceMarkResult = {
  ok: boolean;
  statusCode: number;
  message: string;
  student?: {
    id: string;
    name: string;
    admissionNo: string;
  };
  status?: AttendanceStatus;
  source?: AttendanceSource;
  markedAt?: string;
  payment?: {
    status: "clear" | "pending" | "overdue" | "partial";
    label: string;
    amountDue: number;
  };
  credential?: {
    nfcUid?: string;
    normalizedNfcUid?: string;
  };
  duplicate?: boolean;
  idempotent?: boolean;
};

type MarkInput = {
  classGroupId: string;
  source: AttendanceSource;
  status?: AttendanceStatus;
  token?: string;
  nfcUid?: string;
  studentId?: string;
  searchMethod?: "NFC" | "QR" | "FACE" | "FINGERPRINT" | "MANUAL_ID" | "MANUAL_SEARCH";
  scanId?: string;
  deviceId?: string;
  scanType?: CardScanType;
  scannedValue?: string;
  timestamp?: string;
  ipAddress?: string;
  notes?: string;
};

function todayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
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
    return {
      status: "clear" as const,
      label: "Payments clear",
      amountDue: 0
    };
  }

  return {
    status: hasOverdue ? ("overdue" as const) : hasPartial ? ("partial" as const) : ("pending" as const),
    label: `${hasOverdue ? "Overdue" : hasPartial ? "Partial" : "Pending"} ${formatCurrency(amountDue, currency)}`,
    amountDue
  };
}

async function audit(input: {
  tx?: Prisma.TransactionClient;
  instituteId: string;
  sessionId: string;
  studentId?: string;
  recordId?: string;
  source: AttendanceSource;
  status?: AttendanceStatus;
  success: boolean;
  message: string;
  metadata?: Record<string, unknown>;
}) {
  const client = input.tx ?? prisma;
  await client.attendanceAuditLog.create({
    data: {
      instituteId: input.instituteId,
      sessionId: input.sessionId,
      studentId: input.studentId,
      recordId: input.recordId,
      source: input.source,
      status: input.status,
      success: input.success,
      message: input.message,
      metadata: input.metadata as Prisma.InputJsonObject | undefined
    }
  });
}

export async function markAttendanceByCredential(input: MarkInput): Promise<AttendanceMarkResult> {
  const status = input.status ?? AttendanceStatus.PRESENT;
  const { start, end } = todayRange();
  const scanType = input.source === AttendanceSource.NFC ? CardScanType.NFC : input.source === AttendanceSource.QR ? CardScanType.QR : null;
  const scannedValue = input.scannedValue ?? input.nfcUid ?? input.token ?? "";
  const normalizedScannedValue = scanType === CardScanType.NFC ? normalizeNfcUid(scannedValue) : scannedValue.trim();

  if (input.scanId) {
    const replay = await prisma.scanRequestLog.findUnique({ where: { scanId: input.scanId } });
    if (replay?.responseJson) {
      return { ...(replay.responseJson as unknown as AttendanceMarkResult), idempotent: true };
    }

    if (replay) {
      return { ok: false, statusCode: 202, message: "This scan is already being processed.", idempotent: true };
    }
  }

  const queuePayloads: AttendanceNotificationPayload[] = [];

  const txResult = await prisma.$transaction(
    async (tx) => {
      const finish = async (
        result: AttendanceMarkResult,
        context?: {
          instituteId?: string | null;
          sessionId?: string | null;
          recordId?: string | null;
          studentId?: string | null;
          scanResult?: string;
        }
      ) => {
        if (input.scanId && scanType) {
          await tx.scanRequestLog.upsert({
            where: { scanId: input.scanId },
            create: {
              scanId: input.scanId,
              instituteId: context?.instituteId ?? null,
              deviceId: input.deviceId ?? "unknown",
              scanType,
              scannedValue: normalizedScannedValue,
              result: context?.scanResult ?? result.message,
              responseJson: result as unknown as Prisma.InputJsonObject,
              statusCode: result.statusCode,
              attendanceSessionId: context?.sessionId ?? null,
              attendanceRecordId: context?.recordId ?? null,
              studentId: context?.studentId ?? null,
              ipAddress: input.ipAddress ?? null,
              processedAt: new Date()
            },
            update: {
              instituteId: context?.instituteId ?? undefined,
              result: context?.scanResult ?? result.message,
              responseJson: result as unknown as Prisma.InputJsonObject,
              statusCode: result.statusCode,
              attendanceSessionId: context?.sessionId ?? undefined,
              attendanceRecordId: context?.recordId ?? undefined,
              studentId: context?.studentId ?? undefined,
              processedAt: new Date()
            }
          });
        }
        return result;
      };

      const classGroup = await tx.classGroup.findUnique({
        where: { id: input.classGroupId },
        select: { id: true, instituteId: true, name: true, branchId: true }
      });

      if (!classGroup) {
        return finish({ ok: false, statusCode: 404, message: "Class was not found." }, { scanResult: "CLASS_NOT_FOUND" });
      }

      if (scanType && input.deviceId) {
        const settings = await tx.instituteSettings.findUnique({
          where: { instituteId: classGroup.instituteId },
          select: { attendanceReaderValidationEnabled: true }
        });
        const reader = await tx.readerDevice.findUnique({ where: { deviceCode: input.deviceId } });
        const readerMatchesType = reader?.type === "BOTH" || reader?.type === scanType;

        if (settings?.attendanceReaderValidationEnabled && (!reader || reader.instituteId !== classGroup.instituteId || !reader.isActive || !readerMatchesType)) {
          return finish(
            { ok: false, statusCode: 403, message: "This reader is not active for attendance scans." },
            { instituteId: classGroup.instituteId, scanResult: "READER_INACTIVE" }
          );
        }

        if (reader && reader.instituteId === classGroup.instituteId) {
          await tx.readerDevice.update({ where: { id: reader.id }, data: { lastSeenAt: new Date() } });
        }
      }

      const session = await tx.attendanceSession.findFirst({
        where: {
          classGroupId: input.classGroupId,
          status: "ACTIVE",
          sessionDate: {
            gte: start,
            lt: end
          }
        },
        select: { id: true }
      });

      if (!session) {
        return finish(
          { ok: false, statusCode: 409, message: "No active attendance session for this class today." },
          { instituteId: classGroup.instituteId, scanResult: "NO_ACTIVE_SESSION" }
        );
      }

      const scannedCard = scanType
        ? await tx.studentCard.findFirst({
            where:
              scanType === CardScanType.NFC
                ? { instituteId: classGroup.instituteId, nfcUid: normalizedScannedValue }
                : { instituteId: classGroup.instituteId, OR: [{ qrToken: normalizedScannedValue }, { qrCode: normalizedScannedValue }] },
            include: {
              student: {
                select: { id: true, firstName: true, lastName: true, admissionNo: true, status: true }
              }
            }
          })
        : null;

      if (scanType && !scannedCard) {
        const normalizedNfcUid = input.nfcUid ? normalizeNfcUid(input.nfcUid) : undefined;
        const message = input.token ? "QR card was not recognized." : "NFC card was not recognized.";
        await audit({
          tx,
          instituteId: classGroup.instituteId,
          sessionId: session.id,
          source: input.source,
          status,
          success: false,
          message,
          metadata: { token: input.token, nfcUid: input.nfcUid, normalizedNfcUid, scanId: input.scanId, deviceId: input.deviceId }
        });
        await tx.cardScanLog.create({
          data: {
            instituteId: classGroup.instituteId,
            scanType,
            scannedValue: normalizedScannedValue,
            result: CardScanResult.CARD_NOT_FOUND,
            classGroupId: classGroup.id,
            attendanceSessionId: session.id,
            deviceInfo: input.deviceId ?? null,
            notes: message
          }
        });

        return finish(
          {
            ok: false,
            statusCode: 404,
            message: input.token ? "QR card was not recognized." : `NFC card was not recognized${normalizedNfcUid ? `: ${normalizedNfcUid}` : "."}`,
            credential: input.nfcUid ? { nfcUid: input.nfcUid, normalizedNfcUid } : undefined
          },
          { instituteId: classGroup.instituteId, sessionId: session.id, scanResult: CardScanResult.CARD_NOT_FOUND }
        );
      }

      if (scanType && scannedCard && scannedCard.status !== "ACTIVE") {
        const result = scanResultForCardStatus(scannedCard.status);
        const message = `This card is no longer active. Status: ${scannedCard.status}.`;
        await audit({
          tx,
          instituteId: classGroup.instituteId,
          sessionId: session.id,
          studentId: scannedCard.studentId,
          source: input.source,
          status,
          success: false,
          message,
          metadata: { cardId: scannedCard.id, cardStatus: scannedCard.status, scanId: input.scanId, deviceId: input.deviceId }
        });
        await tx.cardScanLog.create({
          data: {
            instituteId: classGroup.instituteId,
            cardId: scannedCard.id,
            studentId: scannedCard.studentId,
            scanType,
            scannedValue: normalizedScannedValue,
            result,
            classGroupId: classGroup.id,
            attendanceSessionId: session.id,
            deviceInfo: input.deviceId ?? null,
            notes: message
          }
        });

        return finish(
          {
            ok: false,
            statusCode: 403,
            message,
            student: {
              id: scannedCard.student.id,
              name: `${scannedCard.student.firstName} ${scannedCard.student.lastName}`,
              admissionNo: scannedCard.student.admissionNo
            }
          },
          { instituteId: classGroup.instituteId, sessionId: session.id, studentId: scannedCard.studentId, scanResult: result }
        );
      }

      const student = scannedCard
        ? scannedCard.student
        : input.studentId
        ? await tx.student.findFirst({
            where: { id: input.studentId, instituteId: classGroup.instituteId },
            select: {
              id: true,
              firstName: true,
              lastName: true,
              admissionNo: true,
              status: true
            }
          })
        : null;

      if (!student) {
        const normalizedNfcUid = input.nfcUid ? normalizeNfcUid(input.nfcUid) : undefined;
        await audit({
          tx,
          instituteId: classGroup.instituteId,
          sessionId: session.id,
          source: input.source,
          status,
          success: false,
          message: input.studentId ? "Student was not recognized." : input.token ? "QR token was not recognized." : "NFC UID was not recognized.",
          metadata: { token: input.token, nfcUid: input.nfcUid, normalizedNfcUid, scanId: input.scanId, deviceId: input.deviceId }
        });

        return finish(
          {
            ok: false,
            statusCode: 404,
            message: input.studentId
              ? "Student was not recognized."
              : input.token
              ? "QR token was not recognized."
              : `NFC UID was not recognized${normalizedNfcUid ? `: ${normalizedNfcUid}` : "."}`,
            credential: input.nfcUid ? { nfcUid: input.nfcUid, normalizedNfcUid } : undefined
          },
          { instituteId: classGroup.instituteId, sessionId: session.id, scanResult: "STUDENT_NOT_FOUND" }
        );
      }

      const studentPayload = {
        id: student.id,
        name: `${student.firstName} ${student.lastName}`,
        admissionNo: student.admissionNo
      };

      if (student.status !== "ACTIVE") {
        await audit({
          tx,
          instituteId: classGroup.instituteId,
          sessionId: session.id,
          studentId: student.id,
          source: input.source,
          status,
          success: false,
          message: "Student is not active.",
          metadata: { scanId: input.scanId, deviceId: input.deviceId }
        });

        return finish(
          { ok: false, statusCode: 403, message: "Student is not active.", student: studentPayload },
          { instituteId: classGroup.instituteId, sessionId: session.id, studentId: student.id, scanResult: "STUDENT_INACTIVE" }
        );
      }

      const enrollment = await tx.enrollment.findUnique({
        where: {
          studentId_classGroupId: {
            studentId: student.id,
            classGroupId: input.classGroupId
          }
        },
        select: { id: true, active: true, status: true }
      });

      if (!enrollment?.active || enrollment.status !== "ACTIVE") {
        await audit({
          tx,
          instituteId: classGroup.instituteId,
          sessionId: session.id,
          studentId: student.id,
          source: input.source,
          status,
          success: false,
          message: "Student is not actively enrolled in this class.",
          metadata: { scanId: input.scanId, deviceId: input.deviceId }
        });

        return finish(
          { ok: false, statusCode: 403, message: "Student is not actively enrolled in this class.", student: studentPayload },
          { instituteId: classGroup.instituteId, sessionId: session.id, studentId: student.id, scanResult: "NOT_ENROLLED" }
        );
      }

      let record: { id: string; markedAt: Date; status: AttendanceStatus };
      let duplicate = false;

      try {
        record = await tx.attendanceRecord.create({
          data: {
            sessionId: session.id,
            studentId: student.id,
            status,
            source: input.source,
            searchMethod: input.searchMethod ?? (input.source === AttendanceSource.NFC ? "NFC" : input.source === AttendanceSource.QR ? "QR" : "MANUAL_SEARCH"),
            notes: input.notes ?? null
          },
          select: { id: true, markedAt: true, status: true }
        });
      } catch (error) {
        if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
          throw error;
        }
        const existing = await tx.attendanceRecord.findUniqueOrThrow({
          where: { sessionId_studentId: { sessionId: session.id, studentId: student.id } },
          select: { id: true, markedAt: true, status: true }
        });
        record = existing;
        duplicate = true;
      }

      const auditMessage = duplicate ? "Attendance already marked." : "Attendance marked successfully.";
      await audit({
        tx,
        instituteId: classGroup.instituteId,
        sessionId: session.id,
        studentId: student.id,
        recordId: record.id,
        source: input.source,
        status: record.status,
        success: !duplicate,
        message: auditMessage,
        metadata: { scanId: input.scanId, deviceId: input.deviceId, duplicate, correctionReason: input.notes ?? null }
      });

      if (scanType) {
        await tx.cardScanLog.create({
          data: {
            instituteId: classGroup.instituteId,
            cardId: scannedCard?.id,
            studentId: student.id,
            scanType,
            scannedValue: normalizedScannedValue,
            result: duplicate ? CardScanResult.DUPLICATE_ATTENDANCE : CardScanResult.SUCCESS,
            classGroupId: classGroup.id,
            attendanceSessionId: session.id,
            deviceInfo: input.deviceId ?? null,
            notes: auditMessage
          }
        });
      }

      const result: AttendanceMarkResult = {
        ok: true,
        statusCode: 200,
        message: auditMessage,
        student: studentPayload,
        status: record.status,
        source: input.source,
        markedAt: record.markedAt.toISOString(),
        credential: input.nfcUid ? { nfcUid: input.nfcUid, normalizedNfcUid: normalizeNfcUid(input.nfcUid) } : undefined,
        duplicate
      };

      if (!duplicate) {
        queuePayloads.push({
          instituteId: classGroup.instituteId,
          attendanceRecordId: record.id,
          attendanceSessionId: session.id,
          studentId: student.id,
          classGroupId: classGroup.id,
          branchId: classGroup.branchId,
          className: classGroup.name,
          status: record.status,
          markedAt: record.markedAt.toISOString()
        });
      }

      return finish(result, {
        instituteId: classGroup.instituteId,
        sessionId: session.id,
        recordId: record.id,
        studentId: student.id,
        scanResult: duplicate ? CardScanResult.DUPLICATE_ATTENDANCE : CardScanResult.SUCCESS
      });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted }
  );

  if (txResult.student) {
    const queuePayload = queuePayloads[0];
    const instituteId =
      queuePayload?.instituteId ??
      (
        await prisma.classGroup.findUnique({
          where: { id: input.classGroupId },
          select: { instituteId: true }
        })
      )?.instituteId;
    const payment = instituteId ? await getPaymentStatus(txResult.student.id, input.classGroupId, instituteId) : undefined;
    txResult.payment = payment;
    if (queuePayload) {
      queuePayload.payment = payment;
      try {
        await enqueueAttendanceNotifications(queuePayload);
      } catch (error) {
        console.error("Attendance notification enqueue failed", error);
      }
    }

    if (input.scanId) {
      await prisma.scanRequestLog.updateMany({
        where: { scanId: input.scanId },
        data: { responseJson: txResult as unknown as Prisma.InputJsonObject }
      });
    }
  }

  return txResult;
}

