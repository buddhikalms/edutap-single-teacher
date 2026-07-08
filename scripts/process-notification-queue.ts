import { Worker } from "bullmq";
import { processAttendanceNotificationJob, processDatabaseNotificationQueue } from "../lib/attendance-notification-queue";

const redisUrl = process.env.REDIS_URL || process.env.BULLMQ_REDIS_URL || "";

async function runDatabaseWorker() {
  const intervalMs = Number.parseInt(process.env.NOTIFICATION_QUEUE_POLL_MS ?? "5000", 10);
  console.log(`Database notification queue worker started. Polling every ${intervalMs}ms.`);

  while (true) {
    const result = await processDatabaseNotificationQueue();
    if (result.processed > 0) {
      console.log(`Processed ${result.processed} database notification jobs.`);
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}

if (redisUrl) {
  const worker = new Worker(
    "attendance-notifications",
    async (job) => {
      await processAttendanceNotificationJob(job.name, job.data);
    },
    { connection: { url: redisUrl }, concurrency: Number.parseInt(process.env.NOTIFICATION_QUEUE_CONCURRENCY ?? "10", 10) }
  );

  worker.on("completed", (job) => console.log(`Completed notification job ${job.id}`));
  worker.on("failed", (job, error) => console.error(`Notification job ${job?.id ?? "unknown"} failed`, error));
  console.log("BullMQ attendance notification worker started.");
} else {
  void runDatabaseWorker();
}
