import { NotificationChannel, NotificationStatus, NotificationType, NoticeAudience, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type NotificationRecipient = {
  userId?: string | null;
  studentId?: string | null;
  parentId?: string | null;
  target?: string | null;
};

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

  return notice;
}

export async function createReceiptNotification(input: {
  instituteId: string;
  receiptId: string;
  studentId: string;
  amount: number;
  receiptNo: string;
}) {
  const student = await prisma.student.findFirst({
    where: { id: input.studentId, instituteId: input.instituteId },
    include: {
      user: { select: { id: true, email: true } },
      parents: { include: { user: { select: { id: true, email: true } } } }
    }
  });

  if (!student) {
    return { count: 0 };
  }

  return createNotificationLogs({
    instituteId: input.instituteId,
    receiptId: input.receiptId,
    type: NotificationType.RECEIPT,
    title: "Receipt generated",
    message: `Receipt ${input.receiptNo} was generated for ${student.firstName} ${student.lastName}. Amount paid: $${input.amount.toFixed(0)}.`,
    recipients: [
      ...(student.user ? [{ userId: student.user.id, studentId: student.id, target: student.user.email }] : []),
      ...student.parents
        .filter((parent) => parent.user)
        .map((parent) => ({ userId: parent.user?.id, parentId: parent.id, studentId: student.id, target: parent.user?.email ?? parent.email }))
    ],
    metadata: { pushReady: true, smsReady: true, whatsappReady: true }
  });
}
