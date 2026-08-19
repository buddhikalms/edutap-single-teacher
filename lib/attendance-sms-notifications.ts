import { AttendanceStatus, NotificationChannel, NotificationStatus, NotificationType, PaymentStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSmsLenzConfig, normalizeSmsRecipient, sendSmsLenzSms } from "@/lib/smslenz-sms";

type AttendanceSmsInput = {
  instituteId: string;
  attendanceRecordId: string;
  studentId: string;
  classGroupId: string;
  branchId?: string | null;
  status: AttendanceStatus;
  markedAt: Date | string;
  payment?: {
    status: "clear" | "pending" | "overdue" | "partial" | "unpaid";
    label: string;
    amountDue: number;
  };
};

const DEFAULT_TEMPLATE =
  "{{studentName}} has arrived for {{className}} at {{branchName}} today at {{attendanceTime}}. {{paymentSummary}}";

function formatTime(value: Date) {
  return value.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit"
  });
}

function renderTemplate(template: string, values: Record<string, string>) {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => values[key] ?? "");
}

function formatDate(value: Date | null | undefined) {
  if (!value) return null;
  return value.toISOString().slice(0, 10);
}

function billingMonth(value: Date) {
  return value.toISOString().slice(0, 7);
}

function paymentDueDate(month: string, dueDay: number) {
  const [year, monthIndex] = month.split("-").map(Number);
  return new Date(year, monthIndex - 1, Math.min(28, Math.max(1, dueDay)));
}

function formatMoney(value: number, currency = "LKR") {
  if (currency.toUpperCase() === "LKR") {
    return `Rs. ${Math.round(value).toLocaleString("en-US")}`;
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    maximumFractionDigits: 0
  }).format(value);
}

function serializeProviderResponse(response: unknown): Prisma.InputJsonValue | undefined {
  if (response === undefined) return undefined;
  return JSON.parse(JSON.stringify(response)) as Prisma.InputJsonValue;
}

async function getPaymentSummary(input: {
  instituteId: string;
  studentId: string;
  classGroupId: string;
  currency: string;
  includeDueDate: boolean;
  markedAt: Date;
}) {
  const now = new Date();
  const month = billingMonth(input.markedAt);
  const [payments, currentClassPayment, enrollment] = await Promise.all([
    prisma.payment.findMany({
      where: {
        instituteId: input.instituteId,
        studentId: input.studentId,
        OR: [{ classGroupId: input.classGroupId }, { classGroupId: null }],
        status: { in: [PaymentStatus.PENDING, PaymentStatus.PARTIAL, PaymentStatus.OVERDUE] }
      },
      orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
      select: { balance: true, status: true, dueDate: true }
    }),
    prisma.payment.findFirst({
      where: {
        instituteId: input.instituteId,
        studentId: input.studentId,
        classGroupId: input.classGroupId,
        month,
        status: { not: PaymentStatus.CANCELLED }
      },
      orderBy: { createdAt: "desc" },
      select: { balance: true, status: true, dueDate: true }
    }),
    prisma.enrollment.findUnique({
      where: { studentId_classGroupId: { studentId: input.studentId, classGroupId: input.classGroupId } },
      select: {
        active: true,
        status: true,
        monthlyFeeOverride: true,
        discount: true,
        classGroup: { select: { monthlyFee: true, defaultPaymentDueDay: true } }
      }
    })
  ]);

  const pendingPayments = payments
    .map((payment) => ({
      amountDue: Number(payment.balance),
      status: payment.status,
      dueDate: payment.dueDate
    }))
    .filter((payment) => payment.amountDue > 0);
  const amountDue = pendingPayments.reduce((total, payment) => total + payment.amountDue, 0);
  const hasOverdue = pendingPayments.some((payment) => payment.status === PaymentStatus.OVERDUE || payment.dueDate < now);
  const hasPartial = pendingPayments.some((payment) => payment.status === PaymentStatus.PARTIAL);
  const nearestDueDate = formatDate(pendingPayments[0]?.dueDate);

  if (amountDue <= 0) {
    if (currentClassPayment && Number(currentClassPayment.balance) <= 0 && currentClassPayment.status === PaymentStatus.PAID) {
      return {
        status: "clear" as const,
        amountDue: 0,
        label: "Payments are up to date.",
        nearestDueDate
      };
    }

    const monthlyFee = Number(enrollment?.monthlyFeeOverride ?? enrollment?.classGroup.monthlyFee ?? 0);
    const discount = Number(enrollment?.discount ?? 0);
    const expectedAmount = Math.max(0, monthlyFee - discount);

    if (enrollment?.active && enrollment.status !== "DELETED" && expectedAmount > 0 && !currentClassPayment) {
      const dueDate = paymentDueDate(month, enrollment.classGroup.defaultPaymentDueDay);
      const dueDateText = input.includeDueDate ? ` Next due date: ${formatDate(dueDate)}.` : "";

      return {
        status: "unpaid" as const,
        amountDue: expectedAmount,
        label: `Not paid: ${formatMoney(expectedAmount, input.currency)} for this class.${dueDateText}`,
        nearestDueDate: formatDate(dueDate)
      };
    }

    return {
      status: "clear" as const,
      amountDue: 0,
      label: "Payments are up to date.",
      nearestDueDate
    };
  }

  const status = hasOverdue ? ("overdue" as const) : hasPartial ? ("partial" as const) : ("pending" as const);
  const statusLabel = status === "overdue" ? "Overdue payment" : status === "partial" ? "Partial payment" : "Pending payment";
  const dueDateText = input.includeDueDate && nearestDueDate ? ` Next due date: ${nearestDueDate}.` : "";

  return {
    status,
    amountDue,
    label: `${statusLabel}: ${formatMoney(amountDue, input.currency)}.${dueDateText}`,
    nearestDueDate
  };
}

export async function sendAttendanceSmsNotification(input: AttendanceSmsInput) {
  const config = getSmsLenzConfig();
  if (!config.ok) {
    throw new Error(config.reason);
  }

  const markedAt = new Date(input.markedAt);
  const [settings, attendanceRecord, student, classGroup] = await Promise.all([
    prisma.instituteSettings.findUnique({ where: { instituteId: input.instituteId } }),
    prisma.attendanceRecord.findFirst({
      where: { id: input.attendanceRecordId, studentId: input.studentId, session: { classGroup: { instituteId: input.instituteId } } },
      select: { id: true, sessionId: true, status: true }
    }),
    prisma.student.findFirst({
      where: { id: input.studentId, instituteId: input.instituteId },
      select: { id: true, firstName: true, lastName: true }
    }),
    prisma.classGroup.findFirst({
      where: { id: input.classGroupId, instituteId: input.instituteId },
      include: {
        branch: { select: { id: true, name: true, location: true } },
        teacher: { select: { id: true, name: true } }
      }
    })
  ]);

  if (!attendanceRecord || !student || !classGroup) {
    return { ok: false, sent: 0, failed: 0, skipped: true, reason: "Attendance context was not found." };
  }

  if (settings?.attendanceParentArrivalNotificationEnabled === false) {
    return { ok: true, sent: 0, failed: 0, skipped: true, reason: "Parent arrival notifications are disabled." };
  }

  if (attendanceRecord.status === AttendanceStatus.PRESENT && settings?.attendanceParentSendOnPresent === false) {
    return { ok: true, sent: 0, failed: 0, skipped: true, reason: "Present notifications are disabled." };
  }

  if (attendanceRecord.status === AttendanceStatus.LATE && settings?.attendanceParentSendOnLate === false) {
    return { ok: true, sent: 0, failed: 0, skipped: true, reason: "Late notifications are disabled." };
  }

  if (attendanceRecord.status !== AttendanceStatus.PRESENT && attendanceRecord.status !== AttendanceStatus.LATE) {
    return { ok: true, sent: 0, failed: 0, skipped: true, reason: "Attendance status does not trigger SMS." };
  }

  const parentLinks = await prisma.parentStudent.findMany({
    where: { studentId: student.id, parent: { instituteId: input.instituteId } },
    include: { parent: { include: { user: { select: { id: true, email: true } } } } }
  });
  const parents = parentLinks.map((link) => link.parent).filter(
    (parent, index, all) => all.findIndex((item) => item.id === parent.id) === index
  );

  if (parents.length === 0) {
    return { ok: true, sent: 0, failed: 0, skipped: true, reason: "No linked parent accounts were found." };
  }

  const studentName = `${student.firstName} ${student.lastName}`.trim();
  const branchName = classGroup.branch.location ? `${classGroup.branch.name} (${classGroup.branch.location})` : classGroup.branch.name;
  const payment = await getPaymentSummary({
    instituteId: input.instituteId,
    studentId: student.id,
    classGroupId: classGroup.id,
    currency: settings?.currency ?? "LKR",
    includeDueDate: settings?.notificationIncludeDueDates !== false,
    markedAt
  });
  const paymentSummary =
    settings?.attendanceParentIncludePaymentSummary === false
      ? ""
      : payment.label;
  const title = "Student arrived at class";
  const body = renderTemplate(settings?.attendanceParentMessageTemplate || DEFAULT_TEMPLATE, {
    studentName,
    className: classGroup.name,
    branchName,
    teacherName: classGroup.teacher?.name ?? "Teacher",
    attendanceTime: formatTime(markedAt),
    pendingTotal: payment.amountDue > 0 ? formatMoney(payment.amountDue, settings?.currency ?? "LKR") : "",
    nearestDueDate: payment.nearestDueDate ?? "",
    paymentSummary
  }).replace(/\s+/g, " ").trim();

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const parent of parents) {
    const recipient = normalizeSmsRecipient(parent.phone);
    const payload = {
      type: "STUDENT_ARRIVED_SMS",
      attendanceRecordId: attendanceRecord.id,
      attendanceSessionId: attendanceRecord.sessionId,
      studentId: student.id,
      parentId: parent.id,
      classGroupId: classGroup.id,
      branchId: input.branchId ?? classGroup.branch.id,
      studentName,
      className: classGroup.name,
      branchName,
      attendanceTime: markedAt.toISOString(),
      payment: {
        status: payment.status,
        amountDue: payment.amountDue,
        label: payment.label,
        nearestDueDate: payment.nearestDueDate
      }
    };

    if (!recipient) {
      skipped += 1;
      await prisma.notificationLog.create({
        data: {
          instituteId: input.instituteId,
          userId: parent.userId,
          studentId: student.id,
          parentId: parent.id,
          type: NotificationType.STUDENT_ARRIVED,
          channel: NotificationChannel.SMS,
          status: NotificationStatus.FAILED,
          title,
          body,
          message: body,
          target: parent.phone,
          provider: "smslenz",
          recipientType: "PARENT",
          recipientId: parent.id,
          payloadJson: payload as Prisma.InputJsonObject,
          metadata: payload as Prisma.InputJsonObject,
          errorMessage: "Parent phone number is not a valid Sri Lankan mobile number.",
          error: "INVALID_RECIPIENT"
        }
      });
      continue;
    }

    const result = await sendSmsLenzSms({ recipient, message: body });
    if (result.ok) {
      sent += 1;
    } else {
      failed += 1;
    }

    await prisma.notificationLog.create({
      data: {
        instituteId: input.instituteId,
        userId: parent.userId,
        studentId: student.id,
        parentId: parent.id,
        type: NotificationType.STUDENT_ARRIVED,
        channel: NotificationChannel.SMS,
        status: result.ok ? NotificationStatus.SENT : NotificationStatus.FAILED,
        title,
        body,
        message: body,
        target: recipient,
        provider: result.provider,
        providerRef: result.providerRef ?? null,
        recipientType: "PARENT",
        recipientId: parent.id,
        payloadJson: payload as Prisma.InputJsonObject,
        metadata: { ...payload, providerResponse: serializeProviderResponse(result.response) } as Prisma.InputJsonObject,
        errorMessage: result.error ?? null,
        error: result.error ?? null,
        sentAt: result.ok ? new Date() : null
      }
    });
  }

  return { ok: failed === 0, sent, failed, skipped };
}
