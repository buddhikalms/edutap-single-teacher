import { AttendanceSource, AttendanceStatus, PaymentStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { nfcUidCandidates, normalizeNfcUid } from "@/lib/nfc";
import { formatCurrency } from "@/lib/utils";

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

async function getPaymentStatus(studentId: string, classGroupId: string) {
  const payments = await prisma.payment.findMany({
    where: {
      studentId,
      OR: [{ classGroupId }, { classGroupId: null }],
      status: { in: [PaymentStatus.PENDING, PaymentStatus.PARTIAL, PaymentStatus.OVERDUE] }
    }
  });

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
    label: `${hasOverdue ? "Overdue" : hasPartial ? "Partial" : "Pending"} ${formatCurrency(amountDue)}`,
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
    select: { id: true, instituteId: true, name: true }
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

  const student = input.studentId
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
    : input.token
    ? await prisma.student.findFirst({
        where: { attendanceToken: input.token, instituteId: classGroup.instituteId },
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

  const payment = await getPaymentStatus(student.id, input.classGroupId);
  const studentPayload = {
    id: student.id,
    name: `${student.firstName} ${student.lastName}`,
    admissionNo: student.admissionNo
  };

  if (duplicate) {
    await audit({
      instituteId: classGroup.instituteId,
      sessionId: session.id,
      studentId: student.id,
      recordId: duplicate.id,
      source: input.source,
      status: duplicate.status,
      success: false,
      message: "Attendance already marked for this session."
    });

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

  await audit({
    instituteId: classGroup.instituteId,
    sessionId: session.id,
    studentId: student.id,
    recordId: record.id,
    source: input.source,
    status,
    success: true,
    message: "Attendance marked successfully."
  });

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
