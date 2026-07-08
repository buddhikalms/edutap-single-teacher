import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export function requestIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}

export async function writeSecurityAudit(input: {
  instituteId?: string | null;
  actorUserId?: string | null;
  actorRole?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  success: boolean;
  message: string;
  request?: Request;
  metadata?: Record<string, unknown>;
}) {
  try {
    await prisma.securityAuditLog.create({
      data: {
        instituteId: input.instituteId ?? null,
        actorUserId: input.actorUserId ?? null,
        actorRole: input.actorRole ?? null,
        action: input.action,
        resourceType: input.resourceType,
        resourceId: input.resourceId ?? null,
        success: input.success,
        message: input.message,
        ipAddress: input.request ? requestIp(input.request) : null,
        userAgent: input.request?.headers.get("user-agent") ?? null,
        metadata: input.metadata as Prisma.InputJsonObject | undefined
      }
    });
  } catch (error) {
    console.error("Security audit log failed", error);
  }
}
