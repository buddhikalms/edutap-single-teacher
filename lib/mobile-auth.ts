import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";

const TOKEN_PREFIX = "ccp_mobile";
const TOKEN_TTL_DAYS = 30;

export class MobileAuthError extends Error {
  statusCode = 401;

  constructor(message = "Mobile authentication is required.", statusCode = 401) {
    super(message);
    this.statusCode = statusCode;
  }
}

export const operationalMobileRoles = ["SUPER_ADMIN", "INSTITUTE_ADMIN", "BRANCH_ADMIN", "TEACHER", "STAFF"] as const;

export function isOperationalRole(role: string | null | undefined) {
  return operationalMobileRoles.includes(role as (typeof operationalMobileRoles)[number]);
}

export function hashMobileToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function createMobileToken(userId: string) {
  const rawToken = `${TOKEN_PREFIX}_${crypto.randomBytes(32).toString("base64url")}`;
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + TOKEN_TTL_DAYS);

  await prisma.mobileAuthToken.create({
    data: {
      tokenHash: hashMobileToken(rawToken),
      userId,
      expiresAt
    }
  });

  return { token: rawToken, expiresAt };
}

export async function requireMobileUser(request: Request) {
  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ") ? authorization.slice(7).trim() : null;

  if (!token) {
    throw new MobileAuthError();
  }

  const savedToken = await prisma.mobileAuthToken.findUnique({
    where: { tokenHash: hashMobileToken(token) },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          image: true,
          instituteId: true,
          branchId: true
        }
      }
    }
  });

  if (!savedToken || savedToken.expiresAt < new Date()) {
    throw new MobileAuthError("Your mobile session has expired. Please sign in again.");
  }

  if (!savedToken.user.instituteId) {
    throw new MobileAuthError("This account is not linked to an institute.");
  }

  await prisma.mobileAuthToken.update({
    where: { id: savedToken.id },
    data: { lastUsedAt: new Date() }
  });

  return {
    ...savedToken.user,
    instituteId: savedToken.user.instituteId
  };
}

export async function requireOperationalMobileUser(request: Request) {
  const user = await requireMobileUser(request);

  if (!isOperationalRole(user.role)) {
    throw new MobileAuthError("Students and parents cannot access the admin scanner app.", 403);
  }

  return user;
}

export function branchScopedWhere(user: { role: string; branchId: string | null }) {
  if (user.role === "BRANCH_ADMIN" || user.role === "STAFF" || user.role === "TEACHER") {
    return user.branchId ? { branchId: user.branchId } : {};
  }

  return {};
}
