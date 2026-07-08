module.exports = {
  apps: [
    {
      name: "edutap-web",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000",
      exec_mode: "cluster",
      instances: process.env.WEB_CONCURRENCY || "max",
      env: {
        NODE_ENV: "production"
      },
      max_memory_restart: "768M",
      kill_timeout: 10000
    },
    {
      name: "edutap-notification-worker",
      script: "node_modules/tsx/dist/cli.mjs",
      args: "scripts/process-notification-queue.ts",
      instances: process.env.NOTIFICATION_WORKER_CONCURRENCY || 1,
      env: {
        NODE_ENV: "production"
      },
      max_memory_restart: "512M",
      kill_timeout: 10000
    }
  ]
};
