import { NextResponse } from "next/server";

type Bucket = {
  count: number;
  resetAt: number;
};

type RateLimitOptions = {
  key: string;
  limit: number;
  windowMs: number;
};

export type AttendanceRateLimitConfig = {
  perDeviceLimit: number;
  perDeviceWindowMs: number;
  perIpLimit: number;
  perIpWindowMs: number;
  perCardDuplicateLimit: number;
  perCardDuplicateWindowMs: number;
};

const buckets = new Map<string, Bucket>();

export function clientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwardedFor || request.headers.get("x-real-ip") || "unknown";
}

export function rateLimitKey(request: Request, scope: string, identifier?: string | null) {
  return `${scope}:${identifier?.trim().toLowerCase() || clientIp(request)}`;
}

export function checkRateLimit({ key, limit, windowMs }: RateLimitOptions) {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: Math.max(0, limit - 1), resetAt: now + windowMs };
  }

  if (bucket.count >= limit) {
    return { ok: false, remaining: 0, resetAt: bucket.resetAt };
  }

  bucket.count += 1;
  return { ok: true, remaining: Math.max(0, limit - bucket.count), resetAt: bucket.resetAt };
}

export function rateLimitResponse(resetAt: number) {
  const retryAfter = Math.max(1, Math.ceil((resetAt - Date.now()) / 1000));
  return NextResponse.json(
    { ok: false, message: "Too many requests. Please try again shortly." },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfter)
      }
    }
  );
}

function intEnv(name: string, fallback: number) {
  const value = Number.parseInt(process.env[name] ?? "", 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export function attendanceRateLimitConfig(): AttendanceRateLimitConfig {
  return {
    perDeviceLimit: intEnv("ATTENDANCE_RATE_LIMIT_DEVICE_PER_SECOND", 10),
    perDeviceWindowMs: intEnv("ATTENDANCE_RATE_LIMIT_DEVICE_WINDOW_MS", 1000),
    perIpLimit: intEnv("ATTENDANCE_RATE_LIMIT_IP_PER_SECOND", 30),
    perIpWindowMs: intEnv("ATTENDANCE_RATE_LIMIT_IP_WINDOW_MS", 1000),
    perCardDuplicateLimit: intEnv("ATTENDANCE_RATE_LIMIT_CARD_DUPLICATE_LIMIT", 3),
    perCardDuplicateWindowMs: intEnv("ATTENDANCE_RATE_LIMIT_CARD_DUPLICATE_WINDOW_MS", 10_000)
  };
}

export function checkAttendanceScanRateLimit(input: {
  request: Request;
  deviceId?: string | null;
  scannedValue: string;
  scanType: string;
}) {
  const config = attendanceRateLimitConfig();
  const ipKey = rateLimitKey(input.request, "attendance:ip");
  const ip = checkRateLimit({ key: ipKey, limit: config.perIpLimit, windowMs: config.perIpWindowMs });
  if (!ip.ok) return ip;

  if (input.deviceId) {
    const device = checkRateLimit({
      key: rateLimitKey(input.request, "attendance:device", input.deviceId),
      limit: config.perDeviceLimit,
      windowMs: config.perDeviceWindowMs
    });
    if (!device.ok) return device;
  }

  return checkRateLimit({
    key: rateLimitKey(input.request, `attendance:${input.scanType}:card`, input.scannedValue),
    limit: config.perCardDuplicateLimit,
    windowMs: config.perCardDuplicateWindowMs
  });
}
