import { AttendanceTerminal, type AttendanceClass, type AttendanceReport, type AttendanceSessionView } from "@/components/attendance/attendance-terminal";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/session";
import { formatCurrency } from "@/lib/utils";

function dayRange(date = new Date()) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

function paymentSummary(payments: Array<{ amount: unknown; balance: unknown; status: string; dueDate: Date }>) {
  const pending = payments.filter((payment) => payment.status !== "PAID" && payment.status !== "CANCELLED");
  const amount = pending.reduce((total, payment) => total + Number(payment.balance), 0);
  const overdue = pending.some((payment) => payment.status === "OVERDUE" || payment.dueDate < new Date());
  const partial = pending.some((payment) => payment.status === "PARTIAL");

  if (amount <= 0) {
    return { paymentLabel: "Payments clear", paymentStatus: "clear" as const };
  }

  return {
    paymentLabel: `${overdue ? "Overdue" : partial ? "Partial" : "Pending"} ${formatCurrency(amount)}`,
    paymentStatus: overdue ? ("overdue" as const) : partial ? ("partial" as const) : ("pending" as const)
  };
}

function sessionView(session: {
  id: string;
  classGroupId: string;
  sessionDate: Date;
  status: "ACTIVE" | "ENDED";
  startsAt: Date | null;
  endsAt: Date | null;
  classGroup: { name: string };
  records: Array<{ id: string; studentId: string; status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED"; source: "MANUAL" | "QR" | "NFC" | "BULK"; markedAt: Date }>;
}): AttendanceSessionView {
  const present = session.records.filter((record) => record.status === "PRESENT").length;
  const absent = session.records.filter((record) => record.status === "ABSENT").length;
  const late = session.records.filter((record) => record.status === "LATE").length;
  const excused = session.records.filter((record) => record.status === "EXCUSED").length;

  return {
    id: session.id,
    classGroupId: session.classGroupId,
    className: session.classGroup.name,
    sessionDate: session.sessionDate.toLocaleDateString(),
    status: session.status,
    startsAt: session.startsAt?.toISOString() ?? null,
    endsAt: session.endsAt?.toISOString() ?? null,
    present,
    absent,
    late,
    excused,
    total: session.records.length,
    records: session.records.map((record) => ({
      id: record.id,
      studentId: record.studentId,
      status: record.status,
      source: record.source,
      markedAt: record.markedAt.toISOString()
    }))
  };
}

export default async function AttendancePage() {
  const { instituteId } = await getTenantContext();
  const { start, end } = dayRange();

  const [classes, sessions, audits, allRecords] = await Promise.all([
    prisma.classGroup.findMany({
      where: { instituteId },
      include: {
        course: true,
        teacher: true,
        enrollments: {
          where: { active: true },
          include: {
            student: {
              include: {
                payments: true
              }
            }
          },
          orderBy: { student: { firstName: "asc" } }
        },
        attendanceSessions: {
          where: {
            status: "ACTIVE",
            sessionDate: { gte: start, lt: end }
          },
          include: {
            classGroup: { select: { name: true } },
            records: true
          },
          take: 1
        }
      },
      orderBy: { name: "asc" }
    }),
    prisma.attendanceSession.findMany({
      where: { classGroup: { instituteId } },
      include: {
        classGroup: { select: { name: true } },
        records: true
      },
      orderBy: { sessionDate: "desc" },
      take: 20
    }),
    prisma.attendanceAuditLog.findMany({
      where: { instituteId },
      include: {
        student: true,
        session: { include: { classGroup: true } }
      },
      orderBy: { createdAt: "desc" },
      take: 10
    }),
    prisma.attendanceRecord.findMany({
      where: { session: { classGroup: { instituteId } } },
      include: {
        student: true,
        session: { include: { classGroup: true } }
      },
      orderBy: { markedAt: "desc" },
      take: 500
    })
  ]);

  const classData: AttendanceClass[] = classes.map((classGroup) => ({
    id: classGroup.id,
    name: classGroup.name,
    course: classGroup.course.name,
    teacher: classGroup.teacher?.name ?? "Unassigned",
    activeSession: classGroup.attendanceSessions[0] ? sessionView(classGroup.attendanceSessions[0]) : null,
    students: classGroup.enrollments.map((enrollment) => {
      const payment = paymentSummary(enrollment.student.payments);
      return {
        id: enrollment.student.id,
        name: `${enrollment.student.firstName} ${enrollment.student.lastName}`,
        admissionNo: enrollment.student.admissionNo,
        nfcUid: enrollment.student.nfcUid,
        attendanceToken: enrollment.student.attendanceToken ?? "",
        ...payment
      };
    })
  }));

  const sessionData = sessions.map(sessionView);

  const classMap = new Map<string, { className: string; total: number; present: number; late: number; absent: number; excused: number }>();
  const studentMap = new Map<string, { studentId: string; studentName: string; admissionNo: string; total: number; present: number; late: number; absent: number; excused: number }>();

  for (const record of allRecords) {
    const classEntry =
      classMap.get(record.session.classGroupId) ??
      { className: record.session.classGroup.name, total: 0, present: 0, late: 0, absent: 0, excused: 0 };
    classEntry.total += 1;
    classEntry[record.status.toLowerCase() as "present" | "late" | "absent" | "excused"] += 1;
    classMap.set(record.session.classGroupId, classEntry);

    const studentEntry =
      studentMap.get(record.studentId) ??
      {
        studentId: record.studentId,
        studentName: `${record.student.firstName} ${record.student.lastName}`,
        admissionNo: record.student.admissionNo,
        total: 0,
        present: 0,
        late: 0,
        absent: 0,
        excused: 0
      };
    studentEntry.total += 1;
    studentEntry[record.status.toLowerCase() as "present" | "late" | "absent" | "excused"] += 1;
    studentMap.set(record.studentId, studentEntry);
  }

  const reports: AttendanceReport = {
    daily: sessionData.filter((session) => {
      const raw = sessions.find((item) => item.id === session.id);
      return raw ? raw.sessionDate >= start : false;
    }),
    classWise: Array.from(classMap.values()).map((item) => ({
      ...item,
      rate: item.total ? Math.round(((item.present + item.late) / item.total) * 100) : 0
    })),
    studentWise: Array.from(studentMap.values()).map((item) => ({
      ...item,
      rate: item.total ? Math.round(((item.present + item.late) / item.total) * 100) : 0
    }))
  };

  return (
    <AttendanceTerminal
      classes={classData}
      sessions={sessionData}
      audits={audits.map((audit) => ({
        id: audit.id,
        studentName: audit.student ? `${audit.student.firstName} ${audit.student.lastName}` : "Unknown credential",
        className: audit.session.classGroup.name,
        source: audit.source,
        status: audit.status,
        success: audit.success,
        message: audit.message,
        createdAt: audit.createdAt.toLocaleTimeString()
      }))}
      reports={reports}
    />
  );
}
