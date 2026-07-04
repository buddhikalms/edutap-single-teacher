import { NotificationChannel, NotificationStatus, NotificationType, NoticeAudience, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendStudentWebPush, sendWebPushMessages } from "@/lib/web-push";

type NotificationRecipient = {
  userId?: string | null;
  studentId?: string | null;
  parentId?: string | null;
  target?: string | null;
};

function isExpoPushToken(token: string | null | undefined) {
  return Boolean(token && /^(Expo|Exponent)PushToken\[[^\]]+\]$/.test(token));
}

async function sendExpoPushMessages(messages: Array<{ to: string; title: string; body: string; data: Record<string, unknown> }>) {
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

export async function sendParentNotification(input: {
  instituteId: string;
  parentId: string;
  studentId?: string | null;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  actionUrl?: string;
}) {
  const [settings, parent, devices] = await Promise.all([
    prisma.instituteSettings.findUnique({ where: { instituteId: input.instituteId } }),
    prisma.parent.findFirst({
      where: { id: input.parentId, instituteId: input.instituteId },
      include: { user: { select: { id: true } } }
    }),
    prisma.studentDevice.findMany({
      where: {
        instituteId: input.instituteId,
        parentId: input.parentId,
        isActive: true,
        OR: [{ expoPushToken: { not: null } }, { pushToken: { not: null } }]
      }
    })
  ]);

  if (!parent) {
    return { ok: false, inApp: false, mobilePush: 0, webPush: 0, reason: "Parent was not found." };
  }

  const data = {
    ...input.data,
    actionUrl: input.actionUrl ?? "/portal/notifications"
  };
  const notification =
    settings?.notificationInAppEnabled === false
      ? null
      : await prisma.notification.create({
          data: {
            instituteId: input.instituteId,
            userId: parent.userId,
            parentId: parent.id,
            studentId: input.studentId ?? null,
            title: input.title,
            body: input.body,
            message: input.body,
            type: input.type,
            actionUrl: input.actionUrl ?? "/portal/notifications",
            dataJson: data as Prisma.InputJsonObject,
            metadata: data as Prisma.InputJsonObject
          }
        });

  if (notification) {
    await prisma.notificationLog.create({
      data: {
        instituteId: input.instituteId,
        userId: parent.userId,
        parentId: parent.id,
        studentId: input.studentId ?? null,
        notificationId: notification.id,
        type: input.type,
        channel: NotificationChannel.IN_APP,
        status: NotificationStatus.SENT,
        title: input.title,
        body: input.body,
        message: input.body,
        recipientType: "PARENT",
        recipientId: parent.id,
        payloadJson: data as Prisma.InputJsonObject,
        metadata: data as Prisma.InputJsonObject,
        sentAt: new Date()
      }
    });
  }

  const expoTokens = devices
    .map((device) => device.expoPushToken ?? device.pushToken)
    .filter((token, index, all): token is string => isExpoPushToken(token) && all.indexOf(token) === index);
  const mobilePushResults =
    settings?.notificationMobilePushEnabled === false
      ? []
      : await sendExpoPushMessages(
          expoTokens.map((token) => ({
            to: token,
            title: input.title,
            body: input.body,
            data
          }))
        );

  if (mobilePushResults.length > 0) {
    await prisma.notificationLog.createMany({
      data: mobilePushResults.map((result) => ({
        instituteId: input.instituteId,
        userId: parent.userId,
        parentId: parent.id,
        studentId: input.studentId ?? null,
        notificationId: notification?.id ?? null,
        type: input.type,
        channel: NotificationChannel.MOBILE_PUSH,
        status: result.ok ? NotificationStatus.SENT : NotificationStatus.FAILED,
        title: input.title,
        body: input.body,
        message: input.body,
        target: result.token,
        provider: "expo",
        providerRef: result.providerRef ?? null,
        recipientType: "PARENT",
        recipientId: parent.id,
        payloadJson: data as Prisma.InputJsonObject,
        metadata: data as Prisma.InputJsonObject,
        errorMessage: result.error ?? null,
        error: result.error ?? null,
        sentAt: result.ok ? new Date() : null
      }))
    });
  }

  const webPushResult =
    settings?.notificationWebPushEnabled === false
      ? { sent: 0, failed: 0, skipped: true }
      : await sendWebPushMessages({
          instituteId: input.instituteId,
          userId: parent.userId,
          parentId: parent.id,
          studentId: input.studentId ?? null,
          notificationId: notification?.id ?? null,
          type: input.type,
          title: input.title,
          body: input.body,
          data
        });

  return {
    ok: true,
    notificationId: notification?.id ?? null,
    inApp: Boolean(notification),
    mobilePush: mobilePushResults.filter((result) => result.ok).length,
    webPush: webPushResult.sent
  };
}

export async function createNotificationLogs(input: {
  instituteId: string;
  noticeId?: string;
  receiptId?: string;
  type: NotificationType;
  channel?: NotificationChannel;
  title: string;
  message: string;
  recipients: NotificationRecipient[];
  metadata?: Record<string, unknown>;
}) {
  if (input.recipients.length === 0) {
    return { count: 0 };
  }

  await prisma.notificationLog.createMany({
    data: input.recipients.map((recipient) => ({
      instituteId: input.instituteId,
      noticeId: input.noticeId,
      receiptId: input.receiptId,
      userId: recipient.userId ?? null,
      studentId: recipient.studentId ?? null,
      parentId: recipient.parentId ?? null,
      type: input.type,
      channel: input.channel ?? NotificationChannel.IN_APP,
      status: input.channel && input.channel !== NotificationChannel.IN_APP ? NotificationStatus.QUEUED : NotificationStatus.SENT,
      title: input.title,
      message: input.message,
      target: recipient.target ?? null,
      sentAt: input.channel && input.channel !== NotificationChannel.IN_APP ? null : new Date(),
      metadata: input.metadata as Prisma.InputJsonObject | undefined
    }))
  });

  return { count: input.recipients.length };
}

export async function createNoticeWithNotifications(input: {
  instituteId: string;
  createdById: string;
  title: string;
  body: string;
  audience: NoticeAudience;
  type: NotificationType;
  channel: NotificationChannel;
  classGroupId?: string;
  studentIds?: string[];
}) {
  const studentWhere =
    input.audience === NoticeAudience.INSTITUTE
      ? { instituteId: input.instituteId }
      : input.audience === NoticeAudience.CLASS && input.classGroupId
        ? { instituteId: input.instituteId, enrollments: { some: { classGroupId: input.classGroupId, active: true } } }
        : { instituteId: input.instituteId, id: { in: input.studentIds ?? [] } };

  const students = await prisma.student.findMany({
    where: studentWhere,
    include: {
      user: { select: { id: true, email: true } },
      parents: { include: { user: { select: { id: true, email: true } } } }
    }
  });

  const notice = await prisma.notice.create({
    data: {
      title: input.title,
      body: input.body,
      audience: input.audience,
      type: input.type,
      instituteId: input.instituteId,
      classGroupId: input.classGroupId ?? null,
      createdById: input.createdById,
      recipients: {
        create: students.map((student) => ({
          studentId: student.id,
          parentId: student.parents[0]?.id ?? null
        }))
      }
    }
  });

  const recipients = students.flatMap((student) => [
    ...(student.user
      ? [{ userId: student.user.id, studentId: student.id, target: student.user.email }]
      : []),
    ...student.parents
      .filter((parent) => parent.user)
      .map((parent) => ({
        userId: parent.user?.id,
        studentId: student.id,
        parentId: parent.id,
        target: input.channel === "SMS" || input.channel === "WHATSAPP" ? parent.phone : parent.user?.email ?? parent.email
      }))
  ]);

  await createNotificationLogs({
    instituteId: input.instituteId,
    noticeId: notice.id,
    type: input.type,
    channel: input.channel,
    title: input.title,
    message: input.body,
    recipients,
    metadata: { audience: input.audience, classGroupId: input.classGroupId }
  });

  if (input.channel === "WEB_PUSH") {
    for (const student of students.filter((item) => item.user)) {
      const data = {
        noticeId: notice.id,
        actionUrl: "/student/notifications",
        audience: input.audience,
        classGroupId: input.classGroupId
      };
      const notification = await prisma.notification.create({
        data: {
          instituteId: input.instituteId,
          userId: student.user?.id,
          studentId: student.id,
          title: input.title,
          body: input.body,
          message: input.body,
          type: input.type,
          actionUrl: "/student/notifications",
          dataJson: data as Prisma.InputJsonObject,
          metadata: data as Prisma.InputJsonObject
        }
      });

      await sendStudentWebPush({
        instituteId: input.instituteId,
        studentId: student.id,
        notificationId: notification.id,
        type: input.type,
        title: input.title,
        body: input.body,
        data
      });
    }
  }

  return notice;
}

export async function createReceiptNotification(input: {
  instituteId: string;
  receiptId: string;
  studentId: string;
  amount: number;
  receiptNo: string;
}) {
  const [settings, student, receipt] = await Promise.all([
    prisma.instituteSettings.findUnique({ where: { instituteId: input.instituteId } }),
    prisma.student.findFirst({
      where: { id: input.studentId, instituteId: input.instituteId },
      include: {
        user: { select: { id: true, email: true } },
        parents: { include: { user: { select: { id: true, email: true } } } }
      }
    }),
    prisma.receipt.findFirst({
      where: { id: input.receiptId, instituteId: input.instituteId },
      include: { payment: { include: { classGroup: true, course: true } } }
    })
  ]);

  if (!student || !receipt) {
    return { count: 0, webPush: 0 };
  }

  const currency = settings?.currency ?? "LKR";
  const studentName = `${student.firstName} ${student.lastName}`.trim();
  const contextName = receipt.payment.classGroup?.name ?? receipt.payment.course?.name ?? receipt.payment.type.replaceAll("_", " ").toLowerCase();
  const title = "Payment received";
  const message = `Receipt ${input.receiptNo} was generated for ${studentName}. Amount paid: ${input.amount.toLocaleString("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0
  })}.`;
  const studentActionUrl = `/student/payments/receipts/${input.receiptId}`;
  const parentActionUrl = `/portal/receipts/${input.receiptId}`;
  const data = {
    receiptId: input.receiptId,
    receiptNo: input.receiptNo,
    paymentId: receipt.paymentId,
    studentId: student.id,
    studentName,
    contextName,
    amount: input.amount
  };

  let inAppCount = 0;
  let webPush = 0;

  if (settings?.notificationInAppEnabled !== false && student.user) {
    const notification = await prisma.notification.create({
      data: {
        instituteId: input.instituteId,
        userId: student.user.id,
        studentId: student.id,
        title,
        body: message,
        message,
        type: NotificationType.RECEIPT,
        actionUrl: studentActionUrl,
        dataJson: { ...data, actionUrl: studentActionUrl } as Prisma.InputJsonObject,
        metadata: { ...data, actionUrl: studentActionUrl } as Prisma.InputJsonObject
      }
    });

    await prisma.notificationLog.create({
      data: {
        instituteId: input.instituteId,
        receiptId: input.receiptId,
        userId: student.user.id,
        studentId: student.id,
        notificationId: notification.id,
        type: NotificationType.RECEIPT,
        channel: NotificationChannel.IN_APP,
        status: NotificationStatus.SENT,
        title,
        body: message,
        message,
        recipientType: "STUDENT",
        recipientId: student.id,
        payloadJson: { ...data, actionUrl: studentActionUrl } as Prisma.InputJsonObject,
        sentAt: new Date()
      }
    });
    inAppCount += 1;
  }

  if (settings?.notificationWebPushEnabled !== false && student.user) {
    const result = await sendStudentWebPush({
      instituteId: input.instituteId,
      studentId: student.id,
      type: NotificationType.RECEIPT,
      title,
      body: message,
      data: { ...data, actionUrl: studentActionUrl }
    });
    webPush += result.sent;
  }

  for (const parent of student.parents.filter((item) => item.user)) {
    const parentData = { ...data, actionUrl: parentActionUrl };
    const notification =
      settings?.notificationInAppEnabled === false
        ? null
        : await prisma.notification.create({
            data: {
              instituteId: input.instituteId,
              userId: parent.user?.id,
              parentId: parent.id,
              studentId: student.id,
              title,
              body: message,
              message,
              type: NotificationType.RECEIPT,
              actionUrl: parentActionUrl,
              dataJson: parentData as Prisma.InputJsonObject,
              metadata: parentData as Prisma.InputJsonObject
            }
          });

    if (notification) {
      await prisma.notificationLog.create({
        data: {
          instituteId: input.instituteId,
          receiptId: input.receiptId,
          userId: parent.user?.id,
          parentId: parent.id,
          studentId: student.id,
          notificationId: notification.id,
          type: NotificationType.RECEIPT,
          channel: NotificationChannel.IN_APP,
          status: NotificationStatus.SENT,
          title,
          body: message,
          message,
          recipientType: "PARENT",
          recipientId: parent.id,
          payloadJson: parentData as Prisma.InputJsonObject,
          sentAt: new Date()
        }
      });
      inAppCount += 1;
    }

    if (settings?.notificationWebPushEnabled !== false) {
      const result = await sendWebPushMessages({
        instituteId: input.instituteId,
        userId: parent.user?.id,
        parentId: parent.id,
        studentId: student.id,
        notificationId: notification?.id ?? null,
        type: NotificationType.RECEIPT,
        title,
        body: message,
        data: parentData
      });
      webPush += result.sent;
    }
  }

  return { count: inAppCount, webPush };
}
