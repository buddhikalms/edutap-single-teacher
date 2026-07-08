import { AttendanceStatus, NotificationChannel, NotificationStatus, NotificationType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendStudentWebPush } from "@/lib/web-push";
import type { AttendanceMarkResult } from "@/lib/attendance";

export async function sendStudentAttendanceNotification(input: {
  instituteId: string;
  studentId: string;
  attendanceRecordId: string;
  attendanceSessionId: string;
  classGroupId: string;
  className: string;
  status: AttendanceStatus;
  markedAt: Date;
  payment: AttendanceMarkResult["payment"];
}) {
  const [settings, student] = await Promise.all([
    prisma.instituteSettings.findUnique({ where: { instituteId: input.instituteId } }),
    prisma.student.findFirst({
      where: { id: input.studentId, instituteId: input.instituteId },
      include: { user: { select: { id: true } } }
    })
  ]);

  if (!student) {
    return { inApp: false, webPush: 0, skipped: true };
  }

  const title = "Attendance marked";
  const paymentText = input.payment?.label ? ` Payment status: ${input.payment.label}.` : "";
  const body = `Your attendance for ${input.className} was marked as ${input.status.toLowerCase()}.${paymentText}`;
  const actionUrl = "/student/attendance";
  const data = {
    actionUrl,
    attendanceRecordId: input.attendanceRecordId,
    attendanceSessionId: input.attendanceSessionId,
    classGroupId: input.classGroupId,
    className: input.className,
    status: input.status,
    markedAt: input.markedAt.toISOString(),
    payment: input.payment
  };
  const notification =
    settings?.notificationInAppEnabled === false || !student.user
      ? null
      : await prisma.notification.create({
          data: {
            instituteId: input.instituteId,
            userId: student.user.id,
            studentId: student.id,
            title,
            body,
            message: body,
            type: NotificationType.STUDENT_ARRIVED,
            actionUrl,
            dataJson: data as Prisma.InputJsonObject,
            metadata: data as Prisma.InputJsonObject
          }
        });

  if (notification) {
    await prisma.notificationLog.create({
      data: {
        instituteId: input.instituteId,
        userId: student.user?.id,
        studentId: student.id,
        notificationId: notification.id,
        type: NotificationType.STUDENT_ARRIVED,
        channel: NotificationChannel.IN_APP,
        status: NotificationStatus.SENT,
        title,
        body,
        message: body,
        recipientType: "STUDENT",
        recipientId: student.id,
        payloadJson: data as Prisma.InputJsonObject,
        sentAt: new Date()
      }
    });
  }

  const webPushResult =
    settings?.notificationWebPushEnabled === false
      ? { sent: 0, failed: 0, skipped: true }
      : await sendStudentWebPush({
          instituteId: input.instituteId,
          studentId: student.id,
          notificationId: notification?.id ?? null,
          type: NotificationType.STUDENT_ARRIVED,
          title,
          body,
          data
        });

  return {
    inApp: Boolean(notification),
    webPush: webPushResult.sent,
    skipped: false
  };
}
