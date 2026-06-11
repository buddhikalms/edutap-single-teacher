import { AttendanceStatus, PaymentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export function todayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

export function sessionDate(value?: string) {
  const source = value ? new Date(`${value}T00:00:00.000`) : new Date();
  source.setHours(0, 0, 0, 0);
  return source;
}

export type StudentPaymentSummary = {
  status: "paid" | "pending" | "partial" | "overdue";
  amountDue: number;
  label: string;
};

export async function getStudentPaymentSummary(studentId: string, classGroupId?: string | null) {
  const payments = await prisma.payment.findMany({
    where: {
      studentId,
      OR: classGroupId ? [{ classGroupId }, { classGroupId: null }] : undefined,
      status: { in: [PaymentStatus.PENDING, PaymentStatus.PARTIAL, PaymentStatus.OVERDUE] }
    },
    select: { balance: true, status: true, dueDate: true }
  });

  const amountDue = payments.reduce((total, payment) => total + Number(payment.balance), 0);
  const hasOverdue = payments.some((payment) => payment.status === PaymentStatus.OVERDUE || payment.dueDate < new Date());
  const hasPartial = payments.some((payment) => payment.status === PaymentStatus.PARTIAL);

  if (amountDue <= 0) {
    return { status: "paid" as const, amountDue: 0, label: "Paid" };
  }

  const status = hasOverdue ? ("overdue" as const) : hasPartial ? ("partial" as const) : ("pending" as const);
  return { status, amountDue, label: status[0].toUpperCase() + status.slice(1) };
}

export function summarizeAttendance(records: Array<{ status: AttendanceStatus }>) {
  return {
    present: records.filter((record) => record.status === "PRESENT").length,
    absent: records.filter((record) => record.status === "ABSENT").length,
    late: records.filter((record) => record.status === "LATE").length,
    excused: records.filter((record) => record.status === "EXCUSED").length,
    total: records.length
  };
}
