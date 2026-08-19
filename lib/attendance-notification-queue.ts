import { AttendanceStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendAttendanceSmsNotification } from "@/lib/attendance-sms-notifications";
import { sendParentAttendanceNotification } from "@/lib/parent-attendance-notifications";
import { sendStudentAttendanceNotification } from "@/lib/student-attendance-notifications";

export type AttendanceNotificationPayload = {
  instituteId: string;
  attendanceRecordId: string;
  attendanceSessionId: string;
  studentId: string;
  classGroupId: string;
  branchId?: string | null;
  className: string;
  status: AttendanceStatus;
  markedAt: string;
  payment?: {
    status: "clear" | "pending" | "overdue" | "partial";
    label: string;
    amountDue: number;
  };
};

type QueueChannel = "PARENT_PUSH" | "WEB_PUSH" | "SMS";

function redisUrl() {
  return process.env.REDIS_URL || process.env.BULLMQ_REDIS_URL || "";
}

function shouldProcessDatabaseQueueInline() {
  return process.env.NOTIFICATION_QUEUE_INLINE !== "false";
}

export async function enqueueAttendanceNotifications(payload: AttendanceNotificationPayload) {
  const jobs: Array<{ jobType: string; channel: QueueChannel }> = [
    { jobType: "PARENT_ATTENDANCE", channel: "PARENT_PUSH" },
    { jobType: "STUDENT_WEB_ATTENDANCE", channel: "WEB_PUSH" }
  ];

  if (process.env.ATTENDANCE_SMS_ENABLED === "true") {
    jobs.push({ jobType: "ATTENDANCE_SMS", channel: "SMS" });
  }

  if (redisUrl()) {
    try {
      const { Queue } = await import("bullmq");
      const queue = new Queue("attendance-notifications", { connection: { url: redisUrl() } });
      await queue.addBulk(
        jobs.map((job) => ({
          name: job.jobType,
          data: { ...payload, channel: job.channel },
          opts: {
            attempts: 5,
            backoff: { type: "exponential", delay: 5_000 },
            removeOnComplete: 1000,
            removeOnFail: 5000
          }
        }))
      );
      await queue.close();
      return { backend: "bullmq" as const, queued: jobs.length };
    } catch (error) {
      console.error("BullMQ enqueue failed; falling back to database queue.", error);
    }
  }

  const createdJobs = await prisma.$transaction(
    jobs.map((job) =>
      prisma.notificationQueue.create({
        data: {
          instituteId: payload.instituteId,
          attendanceRecordId: payload.attendanceRecordId,
          attendanceSessionId: payload.attendanceSessionId,
          studentId: payload.studentId,
          jobType: job.jobType,
          channel: job.channel,
          payloadJson: { ...payload, channel: job.channel } as Prisma.InputJsonObject
        }
      })
    )
  );

  if (shouldProcessDatabaseQueueInline()) {
    const result = await processDatabaseNotificationJobs(createdJobs);
    return { backend: "database" as const, queued: jobs.length, processed: result.processed };
  }

  return { backend: "database" as const, queued: jobs.length, processed: 0 };
}

export async function processAttendanceNotificationJob(jobType: string, payload: AttendanceNotificationPayload) {
  if (jobType === "PARENT_ATTENDANCE") {
    return sendParentAttendanceNotification({
      instituteId: payload.instituteId,
      attendanceRecordId: payload.attendanceRecordId,
      studentId: payload.studentId,
      classGroupId: payload.classGroupId,
      branchId: payload.branchId ?? null,
      markedAt: new Date(payload.markedAt)
    });
  }

  if (jobType === "STUDENT_WEB_ATTENDANCE") {
    return sendStudentAttendanceNotification({
      instituteId: payload.instituteId,
      studentId: payload.studentId,
      attendanceRecordId: payload.attendanceRecordId,
      attendanceSessionId: payload.attendanceSessionId,
      classGroupId: payload.classGroupId,
      className: payload.className,
      status: payload.status,
      markedAt: new Date(payload.markedAt),
      payment: payload.payment
    });
  }

  if (jobType === "ATTENDANCE_SMS") {
    return sendAttendanceSmsNotification({
      instituteId: payload.instituteId,
      attendanceRecordId: payload.attendanceRecordId,
      studentId: payload.studentId,
      classGroupId: payload.classGroupId,
      branchId: payload.branchId ?? null,
      status: payload.status,
      markedAt: new Date(payload.markedAt),
      payment: payload.payment
    });
  }

  throw new Error(`Unknown attendance notification job type: ${jobType}`);
}

export async function processDatabaseNotificationQueue(limit = 50) {
  const jobs = await prisma.notificationQueue.findMany({
    where: { status: "PENDING", availableAt: { lte: new Date() } },
    orderBy: { createdAt: "asc" },
    take: limit
  });

  return processDatabaseNotificationJobs(jobs);
}

async function processDatabaseNotificationJobs(jobs: Awaited<ReturnType<typeof prisma.notificationQueue.findMany>>) {
  for (const job of jobs) {
    const claimed = await prisma.notificationQueue.updateMany({
      where: { id: job.id, status: "PENDING" },
      data: { status: "PROCESSING", attempts: { increment: 1 } }
    });
    if (claimed.count !== 1) continue;

    try {
      await processAttendanceNotificationJob(job.jobType, job.payloadJson as AttendanceNotificationPayload);
      await prisma.notificationQueue.update({
        where: { id: job.id },
        data: { status: "SENT", processedAt: new Date(), lastError: null }
      });
    } catch (error) {
      const failed = job.attempts + 1 >= job.maxAttempts;
      await prisma.notificationQueue.update({
        where: { id: job.id },
        data: {
          status: failed ? "FAILED" : "PENDING",
          lastError: error instanceof Error ? error.message : "Notification job failed.",
          availableAt: new Date(Date.now() + Math.min(60_000, 5_000 * 2 ** job.attempts))
        }
      });
    }
  }

  return { processed: jobs.length };
}
