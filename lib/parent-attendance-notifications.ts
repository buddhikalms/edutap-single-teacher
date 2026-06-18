import {
  AttendanceStatus,
  NotificationChannel,
  NotificationStatus,
  NotificationType,
  PaymentStatus,
  Prisma
} from "@prisma/client";
import { prisma } from "@/lib/prisma";

type AttendanceNotificationInput = {
  instituteId: string;
  attendanceRecordId: string;
  studentId: string;
  classGroupId: string;
  branchId?: string | null;
  markedAt: Date | string;
};

type ClassEndedNotificationInput = {
  instituteId: string;
  attendanceSessionId: string;
  sentById: string;
};

type PaymentSummary = {
  pendingTotal: number;
  overdueTotal: number;
  nearestDueDate: string | null;
  pendingItems: Array<{
    id: string;
    invoiceNo: string;
    month: string | null;
    className: string | null;
    dueDate: string;
    amount: number;
    paidAmount: number;
    balance: number;
    status: PaymentStatus;
  }>;
  paymentStatus: "PAID" | "PENDING" | "PARTIAL" | "OVERDUE";
};

const DEFAULT_TEMPLATE =
  "{{studentName}} has arrived for {{className}} at {{branchName}} today at {{attendanceTime}}. {{paymentSummary}}";
const CLASS_ENDED_TEMPLATE =
  "{{className}} at {{branchName}} has ended at {{endTime}}. {{studentName}} attended the class today. {{paymentSummary}}";

function formatTime(value: Date) {
  return value.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit"
  });
}

function formatDate(value: Date | null | undefined) {
  if (!value) return null;
  return value.toISOString().slice(0, 10);
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

function isExpoPushToken(token: string | null | undefined) {
  return Boolean(token && /^(Expo|Exponent)PushToken\[[^\]]+\]$/.test(token));
}

function renderTemplate(template: string, values: Record<string, string>) {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => values[key] ?? "");
}

async function sendExpoPushMessages(messages: Array<{ to: string; title: string; body: string; data: Record<string, unknown> }>) {
  if (messages.length === 0) {
    return [];
  }

  const results: Array<{ token: string; ok: boolean; providerRef?: string; error?: string }> = [];

  for (let index = 0; index < messages.length; index += 100) {
    const chunk = messages.slice(index, index + 100);

    try {
      const response = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify(chunk)
      });
      const payload = (await response.json().catch(() => null)) as
        | { data?: Array<{ status?: string; id?: string; message?: string; details?: { error?: string } }> }
        | null;
      const data = Array.isArray(payload?.data) ? payload.data : [];

      chunk.forEach((message, offset) => {
        const receipt = data[offset];
        results.push({
          token: message.to,
          ok: response.ok && receipt?.status !== "error",
          providerRef: receipt?.id,
          error: response.ok ? receipt?.message ?? receipt?.details?.error : response.statusText
        });
      });
    } catch (error) {
      chunk.forEach((message) => {
        results.push({
          token: message.to,
          ok: false,
          error: error instanceof Error ? error.message : "Expo push request failed."
        });
      });
    }
  }

  return results;
}

export async function getStudentPaymentSummary(input: {
  instituteId: string;
  studentId: string;
  classGroupId?: string | null;
}): Promise<PaymentSummary> {
  const now = new Date();
  const payments = await prisma.payment.findMany({
    where: {
      instituteId: input.instituteId,
      studentId: input.studentId,
      OR: input.classGroupId ? [{ classGroupId: input.classGroupId }, { classGroupId: null }] : undefined,
      status: { in: [PaymentStatus.PENDING, PaymentStatus.PARTIAL, PaymentStatus.OVERDUE] }
    },
    include: {
      classGroup: { select: { name: true } }
    },
    orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }]
  });

  const pendingItems = payments
    .map((payment) => {
      const balance = Number(payment.balance);
      return {
        id: payment.id,
        invoiceNo: payment.invoiceNo,
        month: payment.month,
        className: payment.classGroup?.name ?? null,
        dueDate: payment.dueDate.toISOString(),
        amount: Number(payment.amount),
        paidAmount: Number(payment.paidAmount),
        balance,
        status: payment.status
      };
    })
    .filter((payment) => payment.balance > 0);

  const pendingTotal = pendingItems.reduce((total, payment) => total + payment.balance, 0);
  const overdueTotal = pendingItems
    .filter((payment) => payment.status === PaymentStatus.OVERDUE || new Date(payment.dueDate) < now)
    .reduce((total, payment) => total + payment.balance, 0);
  const nearestDueDate = pendingItems[0]?.dueDate ? formatDate(new Date(pendingItems[0].dueDate)) : null;
  const hasPartial = pendingItems.some((payment) => payment.status === PaymentStatus.PARTIAL);

  return {
    pendingTotal,
    overdueTotal,
    nearestDueDate,
    pendingItems,
    paymentStatus: pendingTotal <= 0 ? "PAID" : overdueTotal > 0 ? "OVERDUE" : hasPartial ? "PARTIAL" : "PENDING"
  };
}

export async function sendParentAttendanceNotification(input: AttendanceNotificationInput) {
  const markedAt = new Date(input.markedAt);
  const [settings, attendanceRecord, student, classGroup] = await Promise.all([
    prisma.instituteSettings.findUnique({ where: { instituteId: input.instituteId } }),
    prisma.attendanceRecord.findFirst({
      where: { id: input.attendanceRecordId, studentId: input.studentId, session: { classGroup: { instituteId: input.instituteId } } },
      select: { id: true, sessionId: true, status: true, markedAt: true }
    }),
    prisma.student.findFirst({
      where: { id: input.studentId, instituteId: input.instituteId },
      include: {
        parents: { include: { user: { select: { id: true, email: true } } } }
      }
    }),
    prisma.classGroup.findFirst({
      where: { id: input.classGroupId, instituteId: input.instituteId },
      include: {
        branch: { select: { id: true, name: true, location: true } },
        teacher: { select: { id: true, name: true } },
        course: { select: { name: true } }
      }
    })
  ]);

  if (!attendanceRecord || !student || !classGroup) {
    return { ok: false, sent: 0, skipped: true, reason: "Attendance context was not found." };
  }

  if (settings?.attendanceParentArrivalNotificationEnabled === false) {
    return { ok: true, sent: 0, skipped: true, reason: "Parent arrival notifications are disabled." };
  }

  if (attendanceRecord.status === AttendanceStatus.PRESENT && settings?.attendanceParentSendOnPresent === false) {
    return { ok: true, sent: 0, skipped: true, reason: "Present notifications are disabled." };
  }

  if (attendanceRecord.status === AttendanceStatus.LATE && settings?.attendanceParentSendOnLate === false) {
    return { ok: true, sent: 0, skipped: true, reason: "Late notifications are disabled." };
  }

  if (attendanceRecord.status !== AttendanceStatus.PRESENT && attendanceRecord.status !== AttendanceStatus.LATE) {
    return { ok: true, sent: 0, skipped: true, reason: "Attendance status does not trigger parent notifications." };
  }

  const explicitLinks = await prisma.parentStudent.findMany({
    where: { studentId: student.id, parent: { instituteId: input.instituteId } },
    include: { parent: { include: { user: { select: { id: true, email: true } } } } }
  });
  const parents = [...student.parents, ...explicitLinks.map((link) => link.parent)].filter(
    (parent, index, all) => all.findIndex((item) => item.id === parent.id) === index
  );

  if (parents.length === 0) {
    return { ok: true, sent: 0, skipped: true, reason: "No linked parent accounts were found." };
  }

  const parentIds = parents.map((parent) => parent.id);
  const [devices, paymentSummary] = await Promise.all([
    prisma.studentDevice.findMany({
      where: {
        instituteId: input.instituteId,
        parentId: { in: parentIds },
        isActive: true,
        OR: [{ expoPushToken: { not: null } }, { pushToken: { not: null } }]
      }
    }),
    settings?.attendanceParentIncludePaymentSummary === false
      ? Promise.resolve<PaymentSummary>({ pendingTotal: 0, overdueTotal: 0, nearestDueDate: null, pendingItems: [], paymentStatus: "PAID" })
      : getStudentPaymentSummary({ instituteId: input.instituteId, studentId: student.id, classGroupId: classGroup.id })
  ]);

  const studentName = `${student.firstName} ${student.lastName}`.trim();
  const branchName = classGroup.branch.location ? `${classGroup.branch.name} (${classGroup.branch.location})` : classGroup.branch.name;
  const attendanceTime = formatTime(markedAt);
  const currency = settings?.currency ?? "LKR";
  const pendingTotalLabel = formatMoney(paymentSummary.pendingTotal, currency);
  const nearestDueDateLabel = paymentSummary.nearestDueDate ?? "not scheduled";
  const paymentSummarySentence =
    settings?.attendanceParentIncludePaymentSummary === false
      ? ""
      : paymentSummary.pendingTotal > 0
        ? `Pending payment: ${pendingTotalLabel}. Next due date: ${nearestDueDateLabel}.`
        : "Payments are up to date.";
  const title = "Student arrived at class";
  const body = renderTemplate(settings?.attendanceParentMessageTemplate || DEFAULT_TEMPLATE, {
    studentName,
    className: classGroup.name,
    branchName,
    teacherName: classGroup.teacher?.name ?? "Teacher",
    attendanceTime,
    pendingTotal: pendingTotalLabel,
    nearestDueDate: nearestDueDateLabel,
    paymentSummary: paymentSummarySentence
  }).replace(/\s+/g, " ").trim();

  let sent = 0;

  for (const parent of parents) {
    const existing = await prisma.attendanceNotificationLog.findUnique({
      where: { attendanceRecordId_parentId: { attendanceRecordId: attendanceRecord.id, parentId: parent.id } },
      select: { id: true }
    });

    if (existing) {
      continue;
    }

    const parentDevices = devices.filter((device) => device.parentId === parent.id);
    const expoTokens = parentDevices
      .map((device) => device.expoPushToken ?? device.pushToken)
      .filter((token, index, all): token is string => isExpoPushToken(token) && all.indexOf(token) === index);
    const payload = {
      type: "STUDENT_ARRIVED",
      attendanceRecordId: attendanceRecord.id,
      attendanceSessionId: attendanceRecord.sessionId,
      studentId: student.id,
      parentId: parent.id,
      classGroupId: classGroup.id,
      branchId: input.branchId ?? classGroup.branch.id,
      studentName,
      className: classGroup.name,
      branchName,
      teacherName: classGroup.teacher?.name ?? null,
      attendanceTime: markedAt.toISOString(),
      payment: {
        pendingTotal: paymentSummary.pendingTotal,
        overdueTotal: settings?.attendanceParentIncludeOverdueAmount === false ? 0 : paymentSummary.overdueTotal,
        nearestDueDate: paymentSummary.nearestDueDate,
        pendingItems: paymentSummary.pendingItems,
        paymentStatus: paymentSummary.paymentStatus
      }
    };

    try {
      const notification = await prisma.$transaction(async (tx) => {
        const created = await tx.notification.create({
          data: {
            instituteId: input.instituteId,
            userId: parent.userId,
            parentId: parent.id,
            studentId: student.id,
            title,
            body,
            message: body,
            type: NotificationType.STUDENT_ARRIVED,
            actionUrl: "/portal/attendance",
            dataJson: payload as Prisma.InputJsonObject,
            metadata: payload as Prisma.InputJsonObject
          }
        });

        await tx.attendanceNotificationLog.create({
          data: {
            instituteId: input.instituteId,
            attendanceSessionId: attendanceRecord.sessionId,
            attendanceRecordId: attendanceRecord.id,
            studentId: student.id,
            parentId: parent.id,
            notificationId: created.id
          }
        });

        await tx.notificationLog.create({
          data: {
            instituteId: input.instituteId,
            userId: parent.userId,
            studentId: student.id,
            parentId: parent.id,
            notificationId: created.id,
            type: NotificationType.STUDENT_ARRIVED,
            channel: NotificationChannel.IN_APP,
            status: NotificationStatus.SENT,
            title,
            body,
            message: body,
            recipientType: "PARENT",
            recipientId: parent.id,
            payloadJson: payload as Prisma.InputJsonObject,
            metadata: payload as Prisma.InputJsonObject,
            sentAt: new Date()
          }
        });

        return created;
      });

      const pushResults = await sendExpoPushMessages(
        expoTokens.map((token) => ({
          to: token,
          title,
          body,
          data: payload
        }))
      );

      if (pushResults.length > 0) {
        await prisma.notificationLog.createMany({
          data: pushResults.map((result) => ({
            instituteId: input.instituteId,
            userId: parent.userId,
            studentId: student.id,
            parentId: parent.id,
            notificationId: notification.id,
            type: NotificationType.STUDENT_ARRIVED,
            channel: NotificationChannel.PUSH,
            status: result.ok ? NotificationStatus.SENT : NotificationStatus.FAILED,
            title,
            body,
            message: body,
            target: result.token,
            provider: "expo",
            providerRef: result.providerRef ?? null,
            recipientType: "PARENT",
            recipientId: parent.id,
            payloadJson: payload as Prisma.InputJsonObject,
            metadata: { ...payload, notificationId: notification.id } as Prisma.InputJsonObject,
            errorMessage: result.error ?? null,
            error: result.error ?? null,
            sentAt: result.ok ? new Date() : null
          }))
        });
      }

      sent += 1;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        continue;
      }

      await prisma.notificationLog.create({
        data: {
          instituteId: input.instituteId,
          userId: parent.userId,
          studentId: student.id,
            parentId: parent.id,
            type: NotificationType.STUDENT_ARRIVED,
          channel: NotificationChannel.PUSH,
          status: NotificationStatus.FAILED,
          title,
          body,
          message: body,
          recipientType: "PARENT",
          recipientId: parent.id,
          payloadJson: payload as Prisma.InputJsonObject,
          metadata: payload as Prisma.InputJsonObject,
          errorMessage: error instanceof Error ? error.message : "Parent attendance notification failed.",
          error: error instanceof Error ? error.message : "Parent attendance notification failed."
        }
      });
    }
  }

  return { ok: true, sent, skipped: false };
}

function canSendClassEndedNotification(input: {
  user: { id: string; role: string; branchId: string | null };
  session: { branchId: string | null; classGroup: { teacher: { userId: string | null } | null } };
}) {
  if (input.user.role === "SUPER_ADMIN" || input.user.role === "INSTITUTE_ADMIN") {
    return true;
  }

  if (input.user.role === "BRANCH_ADMIN" || input.user.role === "STAFF") {
    return !input.user.branchId || input.user.branchId === input.session.branchId;
  }

  if (input.user.role === "TEACHER") {
    return input.session.classGroup.teacher?.userId === input.user.id;
  }

  return false;
}

export async function sendClassEndedNotification(input: ClassEndedNotificationInput) {
  const user = await prisma.user.findFirst({
    where: { id: input.sentById, instituteId: input.instituteId },
    select: { id: true, role: true, branchId: true }
  });

  const session = await prisma.attendanceSession.findFirst({
    where: { id: input.attendanceSessionId, classGroup: { instituteId: input.instituteId } },
    include: {
      classGroup: {
        include: {
          branch: { select: { id: true, name: true, location: true } },
          teacher: { select: { id: true, name: true, userId: true } },
          course: { select: { name: true } }
        }
      },
      records: {
        include: {
          student: {
            include: {
              parents: { include: { user: { select: { id: true, email: true } } } }
            }
          }
        }
      }
    }
  });

  if (!user || !session) {
    throw new Error("Attendance session was not found.");
  }

  if (!canSendClassEndedNotification({ user, session })) {
    throw new Error("You do not have permission to notify parents for this session.");
  }

  if (session.status !== "ENDED") {
    throw new Error("End the class before sending class over notifications.");
  }

  const settings = await prisma.instituteSettings.findUnique({ where: { instituteId: input.instituteId } });

  if (settings?.classEndedNotificationEnabled === false) {
    return { sentCount: 0, skippedDuplicates: 0, failedCount: 0, message: "Class over notifications are disabled." };
  }

  const allowedStatuses = new Set<AttendanceStatus>();
  if (settings?.classEndedSendToPresent !== false) allowedStatuses.add(AttendanceStatus.PRESENT);
  if (settings?.classEndedSendToLate !== false) allowedStatuses.add(AttendanceStatus.LATE);
  if (settings?.classEndedSendToAbsent === true) allowedStatuses.add(AttendanceStatus.ABSENT);

  const records = session.records.filter((record) => allowedStatuses.has(record.status));

  if (records.length === 0) {
    return { sentCount: 0, skippedDuplicates: 0, failedCount: 0, message: "No matching attendance records were found." };
  }

  const explicitLinks = await prisma.parentStudent.findMany({
    where: { studentId: { in: records.map((record) => record.studentId) }, parent: { instituteId: input.instituteId } },
    include: { parent: { include: { user: { select: { id: true, email: true } } } } }
  });
  const parentIds = Array.from(
    new Set([
      ...records.flatMap((record) => record.student.parents.map((parent) => parent.id)),
      ...explicitLinks.map((link) => link.parentId)
    ])
  );
  const devices = await prisma.studentDevice.findMany({
    where: {
      instituteId: input.instituteId,
      parentId: { in: parentIds },
      isActive: true,
      OR: [{ expoPushToken: { not: null } }, { pushToken: { not: null } }]
    }
  });

  const branchName = session.classGroup.branch.location
    ? `${session.classGroup.branch.name} (${session.classGroup.branch.location})`
    : session.classGroup.branch.name;
  const endedAt = session.endsAt ?? new Date();
  const endTime = formatTime(endedAt);
  const currency = settings?.currency ?? "LKR";
  let sentCount = 0;
  let skippedDuplicates = 0;
  let failedCount = 0;

  for (const record of records) {
    const parents = [
      ...record.student.parents,
      ...explicitLinks.filter((link) => link.studentId === record.studentId).map((link) => link.parent)
    ].filter((parent, index, all) => all.findIndex((item) => item.id === parent.id) === index);
    const studentName = `${record.student.firstName} ${record.student.lastName}`.trim();
    const paymentSummary =
      settings?.classEndedIncludePaymentSummary === false
        ? await Promise.resolve<PaymentSummary>({ pendingTotal: 0, overdueTotal: 0, nearestDueDate: null, pendingItems: [], paymentStatus: "PAID" })
        : await getStudentPaymentSummary({
            instituteId: input.instituteId,
            studentId: record.studentId,
            classGroupId: session.classGroupId
          });
    const pendingTotalLabel = formatMoney(paymentSummary.pendingTotal, currency);
    const nearestDueDateLabel = paymentSummary.nearestDueDate ?? "not scheduled";
    const paymentSummarySentence =
      settings?.classEndedIncludePaymentSummary === false
        ? ""
        : paymentSummary.pendingTotal > 0
          ? `Pending payment: ${pendingTotalLabel}. Nearest due date: ${nearestDueDateLabel}.`
          : "Payments are up to date.";
    const title = "Class has ended";
    const body = renderTemplate(settings?.classEndedMessageTemplate || CLASS_ENDED_TEMPLATE, {
      studentName,
      className: session.classGroup.name,
      branchName,
      teacherName: session.classGroup.teacher?.name ?? "Teacher",
      endTime,
      attendanceStatus: record.status.toLowerCase(),
      pendingTotal: pendingTotalLabel,
      nearestDueDate: nearestDueDateLabel,
      paymentSummary: paymentSummarySentence
    }).replace(/\s+/g, " ").trim();

    for (const parent of parents) {
      const existing = await prisma.classEndNotificationLog.findUnique({
        where: {
          attendanceSessionId_studentId_parentId: {
            attendanceSessionId: session.id,
            studentId: record.studentId,
            parentId: parent.id
          }
        },
        select: { id: true }
      });

      if (existing) {
        skippedDuplicates += 1;
        continue;
      }

      const parentDevices = devices.filter((device) => device.parentId === parent.id);
      const expoTokens = parentDevices
        .map((device) => device.expoPushToken ?? device.pushToken)
        .filter((token, index, all): token is string => isExpoPushToken(token) && all.indexOf(token) === index);
      const payload = {
        type: "CLASS_ENDED",
        attendanceSessionId: session.id,
        classGroupId: session.classGroupId,
        studentId: record.studentId,
        parentId: parent.id,
        studentName,
        className: session.classGroup.name,
        branchName,
        teacherName: session.classGroup.teacher?.name ?? null,
        endTime: endedAt.toISOString(),
        attendanceStatus: record.status,
        payment: paymentSummary
      };

      try {
        const notification = await prisma.$transaction(async (tx) => {
          const created = await tx.notification.create({
            data: {
              instituteId: input.instituteId,
              userId: parent.userId,
              parentId: parent.id,
              studentId: record.studentId,
              title,
              body,
              message: body,
              type: NotificationType.CLASS_ENDED,
              actionUrl: "/portal/attendance",
              dataJson: payload as Prisma.InputJsonObject,
              metadata: payload as Prisma.InputJsonObject
            }
          });

          await tx.classEndNotificationLog.create({
            data: {
              instituteId: input.instituteId,
              attendanceSessionId: session.id,
              classGroupId: session.classGroupId,
              studentId: record.studentId,
              parentId: parent.id,
              notificationId: created.id
            }
          });

          await tx.notificationLog.create({
            data: {
              instituteId: input.instituteId,
              userId: parent.userId,
              studentId: record.studentId,
              parentId: parent.id,
              notificationId: created.id,
              type: NotificationType.CLASS_ENDED,
              channel: NotificationChannel.IN_APP,
              status: NotificationStatus.SENT,
              title,
              body,
              message: body,
              recipientType: "PARENT",
              recipientId: parent.id,
              payloadJson: payload as Prisma.InputJsonObject,
              metadata: payload as Prisma.InputJsonObject,
              sentAt: new Date()
            }
          });

          return created;
        });

        const pushResults = await sendExpoPushMessages(
          expoTokens.map((token) => ({
            to: token,
            title,
            body,
            data: payload
          }))
        );

        if (pushResults.length > 0) {
          await prisma.notificationLog.createMany({
            data: pushResults.map((result) => ({
              instituteId: input.instituteId,
              userId: parent.userId,
              studentId: record.studentId,
              parentId: parent.id,
              notificationId: notification.id,
              type: NotificationType.CLASS_ENDED,
              channel: NotificationChannel.PUSH,
              status: result.ok ? NotificationStatus.SENT : NotificationStatus.FAILED,
              title,
              body,
              message: body,
              target: result.token,
              provider: "expo",
              providerRef: result.providerRef ?? null,
              recipientType: "PARENT",
              recipientId: parent.id,
              payloadJson: payload as Prisma.InputJsonObject,
              metadata: { ...payload, notificationId: notification.id } as Prisma.InputJsonObject,
              errorMessage: result.error ?? null,
              error: result.error ?? null,
              sentAt: result.ok ? new Date() : null
            }))
          });
        }

        sentCount += 1;
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
          skippedDuplicates += 1;
          continue;
        }

        failedCount += 1;
        await prisma.notificationLog.create({
          data: {
            instituteId: input.instituteId,
            userId: parent.userId,
            studentId: record.studentId,
            parentId: parent.id,
            type: NotificationType.CLASS_ENDED,
            channel: NotificationChannel.PUSH,
            status: NotificationStatus.FAILED,
            title,
            body,
            message: body,
            recipientType: "PARENT",
            recipientId: parent.id,
            payloadJson: payload as Prisma.InputJsonObject,
            metadata: payload as Prisma.InputJsonObject,
            errorMessage: error instanceof Error ? error.message : "Class over notification failed.",
            error: error instanceof Error ? error.message : "Class over notification failed."
          }
        });
      }
    }
  }

  return {
    sentCount,
    skippedDuplicates,
    failedCount,
    message: sentCount > 0 ? "Class over notifications sent." : "Class over notification already sent."
  };
}
