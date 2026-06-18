import { AttendanceSource, AttendanceStatus, CardScanType, PaymentStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { nfcUidCandidates, normalizeNfcUid } from "@/lib/nfc";
import { sendParentAttendanceNotification } from "@/lib/parent-attendance-notifications";
import { formatCurrency } from "@/lib/utils";
import { findActiveCardByCredential, logCardScan, scanResultForCardStatus } from "@/lib/student-cards";

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
};

type MarkInput = {
  classGroupId: string;
  source: AttendanceSource;
  status?: AttendanceStatus;
  token?: string;
  nfcUid?: string;
  studentId?: string;
  searchMethod?: "NFC" | "QR" | "MANUAL_ID" | "MANUAL_SEARCH";
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
  await prisma.attendanceAuditLog.create({
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

  const classGroup = await prisma.classGroup.findUnique({
    where: { id: input.classGroupId },
    select: { id: true, instituteId: true, name: true, branchId: true }
  });

  if (!classGroup) {
    return { ok: false, statusCode: 404, message: "Class was not found." };
  }

  const session = await prisma.attendanceSession.findFirst({
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
    return { ok: false, statusCode: 409, message: "No active attendance session for this class today." };
  }

  const scannedValue = input.nfcUid ?? input.token ?? "";
  const scanType = input.source === AttendanceSource.NFC ? CardScanType.NFC : input.source === AttendanceSource.QR ? CardScanType.QR : null;
  const scannedCard = scanType
    ? await findActiveCardByCredential({
        instituteId: classGroup.instituteId,
        scanType,
        value: scannedValue
      })
    : null;

  if (scanType && !scannedCard) {
    const normalizedNfcUid = input.nfcUid ? normalizeNfcUid(input.nfcUid) : undefined;
    await Promise.all([
      audit({
        instituteId: classGroup.instituteId,
        sessionId: session.id,
        source: input.source,
        status,
        success: false,
        message: input.token ? "QR card was not recognized." : "NFC card was not recognized.",
        metadata: { token: input.token, nfcUid: input.nfcUid, normalizedNfcUid }
      }),
      logCardScan({
        instituteId: classGroup.instituteId,
        scanType,
        scannedValue,
        result: "CARD_NOT_FOUND",
        classGroupId: classGroup.id,
        attendanceSessionId: session.id,
        notes: input.token ? "QR card was not recognized." : "NFC card was not recognized."
      })
    ]);

    return {
      ok: false,
      statusCode: 404,
      message: input.token ? "QR card was not recognized." : `NFC card was not recognized${normalizedNfcUid ? `: ${normalizedNfcUid}` : "."}`,
      credential: input.nfcUid ? { nfcUid: input.nfcUid, normalizedNfcUid } : undefined
    };
  }

  if (scanType && scannedCard && scannedCard.status !== "ACTIVE") {
    const result = scanResultForCardStatus(scannedCard.status);
    const message = `This card is no longer active. Status: ${scannedCard.status}.`;

    await Promise.all([
      audit({
        instituteId: classGroup.instituteId,
        sessionId: session.id,
        studentId: scannedCard.studentId,
        source: input.source,
        status,
        success: false,
        message,
        metadata: { cardId: scannedCard.id, cardStatus: scannedCard.status }
      }),
      logCardScan({
        instituteId: classGroup.instituteId,
        cardId: scannedCard.id,
        studentId: scannedCard.studentId,
        scanType,
        scannedValue,
        result,
        classGroupId: classGroup.id,
        attendanceSessionId: session.id,
        notes: message
      })
    ]);

    return {
      ok: false,
      statusCode: 403,
      message,
      student: {
        id: scannedCard.student.id,
        name: `${scannedCard.student.firstName} ${scannedCard.student.lastName}`,
        admissionNo: scannedCard.student.admissionNo
      }
    };
  }

  const student = scannedCard
    ? scannedCard.student
    : input.studentId
    ? await prisma.student.findFirst({
        where: { id: input.studentId, instituteId: classGroup.instituteId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          admissionNo: true,
          status: true
        }
      })
    : await findStudentByNfcUid(classGroup.instituteId, input.nfcUid);

  if (!student) {
    const normalizedNfcUid = input.nfcUid ? normalizeNfcUid(input.nfcUid) : undefined;
    await audit({
      instituteId: classGroup.instituteId,
      sessionId: session.id,
      source: input.source,
      status,
      success: false,
      message: input.studentId ? "Student was not recognized." : input.token ? "QR token was not recognized." : "NFC UID was not recognized.",
      metadata: { token: input.token, nfcUid: input.nfcUid, normalizedNfcUid }
    });

    return {
      ok: false,
      statusCode: 404,
      message: input.studentId
        ? "Student was not recognized."
        : input.token
        ? "QR token was not recognized."
        : `NFC UID was not recognized${normalizedNfcUid ? `: ${normalizedNfcUid}` : "."}`,
      credential: input.nfcUid ? { nfcUid: input.nfcUid, normalizedNfcUid } : undefined
    };
  }

  if (student.status !== "ACTIVE") {
    await audit({
      instituteId: classGroup.instituteId,
      sessionId: session.id,
      studentId: student.id,
      source: input.source,
      status,
      success: false,
      message: "Student is not active."
    });

    return {
      ok: false,
      statusCode: 403,
      message: "Student is not active.",
      student: { id: student.id, name: `${student.firstName} ${student.lastName}`, admissionNo: student.admissionNo }
    };
  }

  const enrollment = await prisma.enrollment.findUnique({
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
      instituteId: classGroup.instituteId,
      sessionId: session.id,
      studentId: student.id,
      source: input.source,
      status,
      success: false,
      message: "Student is not actively enrolled in this class."
    });

    return {
      ok: false,
      statusCode: 403,
      message: "Student is not actively enrolled in this class.",
      student: { id: student.id, name: `${student.firstName} ${student.lastName}`, admissionNo: student.admissionNo }
    };
  }

  const duplicate = await prisma.attendanceRecord.findUnique({
    where: {
      sessionId_studentId: {
        sessionId: session.id,
        studentId: student.id
      }
    },
    select: { id: true, markedAt: true, status: true }
  });

  const payment = await getPaymentStatus(student.id, input.classGroupId, classGroup.instituteId);
  const studentPayload = {
    id: student.id,
    name: `${student.firstName} ${student.lastName}`,
    admissionNo: student.admissionNo
  };

  if (duplicate) {
    await Promise.all([
      audit({
        instituteId: classGroup.instituteId,
        sessionId: session.id,
        studentId: student.id,
        recordId: duplicate.id,
        source: input.source,
        status: duplicate.status,
        success: false,
        message: "Attendance already marked for this session."
      }),
      scanType
        ? logCardScan({
            instituteId: classGroup.instituteId,
            cardId: scannedCard?.id,
            studentId: student.id,
            scanType,
            scannedValue,
            result: "DUPLICATE_ATTENDANCE",
            classGroupId: classGroup.id,
            attendanceSessionId: session.id,
            notes: "Attendance already marked for this session."
          })
        : Promise.resolve()
    ]);

    return {
      ok: false,
      statusCode: 409,
      message: "Attendance already marked for this session.",
      student: studentPayload,
      status: duplicate.status,
      source: input.source,
      markedAt: duplicate.markedAt.toISOString(),
      payment,
      credential: input.nfcUid ? { nfcUid: input.nfcUid, normalizedNfcUid: normalizeNfcUid(input.nfcUid) } : undefined
    };
  }

  const record = await prisma.attendanceRecord.create({
    data: {
      sessionId: session.id,
      studentId: student.id,
      status,
      source: input.source,
      searchMethod: input.searchMethod ?? (input.source === AttendanceSource.NFC ? "NFC" : input.source === AttendanceSource.QR ? "QR" : "MANUAL_SEARCH")
    }
  });

  await Promise.all([
    audit({
      instituteId: classGroup.instituteId,
      sessionId: session.id,
      studentId: student.id,
      recordId: record.id,
      source: input.source,
      status,
      success: true,
      message: "Attendance marked successfully."
    }),
    scanType
      ? logCardScan({
          instituteId: classGroup.instituteId,
          cardId: scannedCard?.id,
          studentId: student.id,
          scanType,
          scannedValue,
          result: "SUCCESS",
          classGroupId: classGroup.id,
          attendanceSessionId: session.id,
          notes: "Attendance marked successfully."
        })
      : Promise.resolve()
  ]);

  try {
    await sendParentAttendanceNotification({
      instituteId: classGroup.instituteId,
      attendanceRecordId: record.id,
      studentId: student.id,
      classGroupId: classGroup.id,
      branchId: classGroup.branchId,
      markedAt: record.markedAt
    });
  } catch (error) {
    console.error("Parent attendance notification failed", error);
  }

  return {
    ok: true,
    statusCode: 200,
    message: "Attendance marked successfully.",
    student: studentPayload,
    status,
    source: input.source,
    markedAt: record.markedAt.toISOString(),
    payment,
    credential: input.nfcUid ? { nfcUid: input.nfcUid, normalizedNfcUid: normalizeNfcUid(input.nfcUid) } : undefined
  };
}

async function findStudentByNfcUid(instituteId: string, nfcUid: string | undefined) {
  const candidates = nfcUidCandidates(nfcUid);

  if (candidates.length === 0) {
    return null;
  }

  const exact = await prisma.student.findFirst({
    where: { instituteId, nfcUid: { in: candidates } },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      admissionNo: true,
      status: true
    }
  });

  if (exact) {
    return exact;
  }

  const normalizedCandidates = new Set(candidates.map((candidate) => normalizeNfcUid(candidate)));
  const students = await prisma.student.findMany({
    where: { instituteId, nfcUid: { not: null } },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      admissionNo: true,
      status: true,
      nfcUid: true
    }
  });

  const matched = students.find((student) => normalizedCandidates.has(normalizeNfcUid(student.nfcUid)));

  if (!matched) {
    return null;
  }

  return {
    id: matched.id,
    firstName: matched.firstName,
    lastName: matched.lastName,
    admissionNo: matched.admissionNo,
    status: matched.status
  };
}
