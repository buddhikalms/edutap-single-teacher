# EduTap Production Attendance Deployment

## PM2

Build and run the web app in cluster mode plus the notification worker:

```bash
npm ci
npm run build
npx prisma migrate deploy
npx prisma generate
pm2 start ecosystem.config.cjs
pm2 save
```

## Nginx Proxy

```nginx
upstream edutap_web {
  server 127.0.0.1:3000;
  keepalive 64;
}

server {
  listen 80;
  server_name edutap.example.com;

  client_max_body_size 25m;
  proxy_connect_timeout 10s;
  proxy_send_timeout 60s;
  proxy_read_timeout 60s;
  keepalive_timeout 65s;

  location / {
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_pass http://edutap_web;
  }
}
```

## Database Pool

Set a connection limit in `DATABASE_URL` that matches your MySQL capacity and PM2 worker count:

```env
DATABASE_URL="mysql://user:password@host:3306/edutap?connection_limit=20&pool_timeout=20"
```

## Optional Redis Queue

Without Redis, EduTap uses the database-backed `NotificationQueue`. To switch to BullMQ:

```env
REDIS_URL="redis://localhost:6379"
NOTIFICATION_QUEUE_CONCURRENCY=10
```

## Attendance Rate Limits

```env
ATTENDANCE_RATE_LIMIT_DEVICE_PER_SECOND=10
ATTENDANCE_RATE_LIMIT_DEVICE_WINDOW_MS=1000
ATTENDANCE_RATE_LIMIT_IP_PER_SECOND=30
ATTENDANCE_RATE_LIMIT_IP_WINDOW_MS=1000
ATTENDANCE_RATE_LIMIT_CARD_DUPLICATE_LIMIT=3
ATTENDANCE_RATE_LIMIT_CARD_DUPLICATE_WINDOW_MS=10000
```
