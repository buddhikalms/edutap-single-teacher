import { createHash } from "node:crypto";
import webPush, { type PushSubscription } from "web-push";
import { NotificationChannel, NotificationStatus, NotificationType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export function hashEndpoint(endpoint: string) {
  return createHash("sha256").update(endpoint).digest("hex");
}

export function getWebPushConfig() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:support@edutap.com";

  if (!publicKey || !privateKey) {
    return { ok: false as const, reason: "VAPID public/private keys are not configured." };
  }

  if (!subject.startsWith("mailto:") && !subject.startsWith("https://")) {
    return { ok: false as const, reason: "VAPID_SUBJECT must be a mailto: or https:// URL." };
  }

  return { ok: true as const, publicKey, privateKey, subject };
}

function configureWebPush() {
  const config = getWebPushConfig();
  if (!config.ok) {
    console.error(`[web-push] ${config.reason}`);
    return false;
  }

  const { publicKey, privateKey, subject } = config;
  webPush.setVapidDetails(subject, publicKey, privateKey);
  return true;
}

export async function sendWebPushMessages(input: {
  instituteId: string;
  userId?: string | null;
  parentId?: string | null;
  studentId?: string | null;
  notificationId?: string | null;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}) {
  if (!input.parentId && !input.studentId && !input.userId) {
    return { sent: 0, failed: 0, skipped: true };
  }

  if (!configureWebPush()) {
    return { sent: 0, failed: 0, skipped: true };
  }

  let recipientWhere: Prisma.WebPushSubscriptionWhereInput;
  if (input.parentId) {
    recipientWhere = { parentId: input.parentId, ...(input.userId ? { userId: input.userId } : {}) };
  } else if (input.studentId) {
    recipientWhere = { studentId: input.studentId, ...(input.userId ? { userId: input.userId } : {}) };
  } else if (input.userId) {
    recipientWhere = { userId: input.userId };
  } else {
    return { sent: 0, failed: 0, skipped: true };
  }

  const subscriptions = await prisma.webPushSubscription.findMany({
    where: {
      instituteId: input.instituteId,
      isActive: true,
      ...recipientWhere
    }
  });

  let sent = 0;
  let failed = 0;

  for (const subscription of subscriptions) {
    const payload = JSON.stringify({
      title: input.title,
      body: input.body,
      data: {
        ...input.data,
        notificationId: input.notificationId,
        actionUrl:
          (input.data?.actionUrl as string | undefined) ??
          (input.studentId && !input.parentId ? "/student/notifications" : "/portal/notifications")
      }
    });
    const recipientType = input.studentId && !input.parentId ? "STUDENT" : input.parentId ? "PARENT" : "USER";
    const recipientId = input.studentId && !input.parentId ? input.studentId : input.parentId ?? subscription.parentId ?? input.userId ?? subscription.userId;

    try {
      const response = await webPush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh,
            auth: subscription.auth
          }
        } satisfies PushSubscription,
        payload
      );

      await prisma.notificationLog.create({
        data: {
          instituteId: input.instituteId,
          userId: input.userId ?? subscription.userId,
          parentId: input.parentId ?? subscription.parentId,
          studentId: input.studentId ?? null,
          notificationId: input.notificationId ?? null,
          type: input.type,
          channel: NotificationChannel.WEB_PUSH,
          status: NotificationStatus.SENT,
          title: input.title,
          body: input.body,
          message: input.body,
          target: subscription.endpoint,
          provider: "web-push",
          providerRef: String(response.statusCode),
          recipientType,
          recipientId,
          payloadJson: input.data as Prisma.InputJsonObject | undefined,
          metadata: { subscriptionId: subscription.id, ...input.data } as Prisma.InputJsonObject,
          sentAt: new Date()
        }
      });
      sent += 1;
    } catch (error) {
      failed += 1;
      const statusCode = typeof error === "object" && error && "statusCode" in error ? Number((error as { statusCode?: number }).statusCode) : null;
      console.error("[web-push] Delivery failed", {
        endpointHash: subscription.endpointHash,
        statusCode,
        error: error instanceof Error ? error.message : error
      });

      if (statusCode === 404 || statusCode === 410) {
        await prisma.webPushSubscription.update({
          where: { id: subscription.id },
          data: { isActive: false }
        });
      }

      await prisma.notificationLog.create({
        data: {
          instituteId: input.instituteId,
          userId: input.userId ?? subscription.userId,
          parentId: input.parentId ?? subscription.parentId,
          studentId: input.studentId ?? null,
          notificationId: input.notificationId ?? null,
          type: input.type,
          channel: NotificationChannel.WEB_PUSH,
          status: NotificationStatus.FAILED,
          title: input.title,
          body: input.body,
          message: input.body,
          target: subscription.endpoint,
          provider: "web-push",
          recipientType,
          recipientId,
          payloadJson: input.data as Prisma.InputJsonObject | undefined,
          metadata: { subscriptionId: subscription.id, ...input.data } as Prisma.InputJsonObject,
          errorMessage: error instanceof Error ? error.message : "Web push failed.",
          error: error instanceof Error ? error.message : "Web push failed."
        }
      });
    }
  }

  return { sent, failed, skipped: false };
}

export async function sendStudentWebPush(input: {
  instituteId: string;
  studentId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  notificationId?: string | null;
}) {
  const student = await prisma.student.findFirst({
    where: { id: input.studentId, instituteId: input.instituteId, userId: { not: null } },
    select: { id: true, userId: true }
  });

  if (!student?.userId) {
    return { sent: 0, failed: 0, skipped: true };
  }

  return sendWebPushMessages({
    instituteId: input.instituteId,
    userId: student.userId,
    studentId: student.id,
    notificationId: input.notificationId ?? null,
    type: input.type,
    title: input.title,
    body: input.body,
    data: {
      ...input.data,
      actionUrl: (input.data?.actionUrl as string | undefined) ?? "/student/notifications"
    }
  });
}

export async function sendParentWebPush(input: {
  studentId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}) {
  const student = await prisma.student.findUnique({
    where: { id: input.studentId },
    select: { instituteId: true }
  });
  if (!student) return { sent: 0, failed: 0, skipped: true, parents: 0 };

  const links = await prisma.parentStudent.findMany({
    where: {
      studentId: input.studentId,
      parent: { instituteId: student.instituteId, userId: { not: null } }
    },
    select: { parent: { select: { id: true, userId: true } } }
  });
  const parents = links
    .map((link) => link.parent)
    .filter((parent, index, all) => parent.userId && all.findIndex((item) => item.id === parent.id) === index);

  let sent = 0;
  let failed = 0;
  for (const parent of parents) {
    const notification = await prisma.notification.create({
      data: {
        instituteId: student.instituteId,
        userId: parent.userId,
        parentId: parent.id,
        studentId: input.studentId,
        type: input.type,
        title: input.title,
        body: input.body,
        message: input.body,
        actionUrl: (input.data?.actionUrl as string | undefined) ?? "/portal/notifications",
        dataJson: input.data as Prisma.InputJsonObject | undefined,
        metadata: input.data as Prisma.InputJsonObject | undefined
      }
    });
    await prisma.notificationLog.create({
      data: {
        instituteId: student.instituteId,
        userId: parent.userId,
        parentId: parent.id,
        studentId: input.studentId,
        notificationId: notification.id,
        type: input.type,
        channel: NotificationChannel.IN_APP,
        status: NotificationStatus.SENT,
        title: input.title,
        body: input.body,
        message: input.body,
        recipientType: "PARENT",
        recipientId: parent.id,
        payloadJson: input.data as Prisma.InputJsonObject | undefined,
        sentAt: new Date()
      }
    });
    const result = await sendWebPushMessages({
      instituteId: student.instituteId,
      userId: parent.userId,
      parentId: parent.id,
      studentId: input.studentId,
      notificationId: notification.id,
      type: input.type,
      title: input.title,
      body: input.body,
      data: input.data
    });
    sent += result.sent;
    failed += result.failed;
  }

  return { sent, failed, skipped: false, parents: parents.length };
}
