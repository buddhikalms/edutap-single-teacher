import { createHash } from "node:crypto";
import webPush, { type PushSubscription } from "web-push";
import { NotificationChannel, NotificationStatus, NotificationType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export function hashEndpoint(endpoint: string) {
  return createHash("sha256").update(endpoint).digest("hex");
}

function configureWebPush() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:support@edutap.com";

  if (!publicKey || !privateKey) {
    return false;
  }

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
  if (!configureWebPush()) {
    return { sent: 0, failed: 0, skipped: true };
  }

  const subscriptions = await prisma.webPushSubscription.findMany({
    where: {
      instituteId: input.instituteId,
      isActive: true,
      ...(input.parentId ? { parentId: input.parentId } : input.userId ? { userId: input.userId } : {})
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
        actionUrl: (input.data?.actionUrl as string | undefined) ?? "/portal/notifications"
      }
    });

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
          recipientType: "PARENT",
          recipientId: input.parentId ?? subscription.parentId,
          payloadJson: input.data as Prisma.InputJsonObject | undefined,
          metadata: { subscriptionId: subscription.id, ...input.data } as Prisma.InputJsonObject,
          sentAt: new Date()
        }
      });
      sent += 1;
    } catch (error) {
      failed += 1;
      const statusCode = typeof error === "object" && error && "statusCode" in error ? Number((error as { statusCode?: number }).statusCode) : null;

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
          recipientType: "PARENT",
          recipientId: input.parentId ?? subscription.parentId,
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
