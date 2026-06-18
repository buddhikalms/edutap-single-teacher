import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";

const TOKEN_PREFIX = "ccp_student";
const TOKEN_TTL_DAYS = 30;

export class StudentMobileAuthError extends Error {
  statusCode: number;

  constructor(message = "Student authentication is required.", statusCode = 401) {
    super(message);
    this.statusCode = statusCode;
  }
}

export function hashStudentToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function createStudentDevice(input: {
  studentId: string;
  instituteId: string;
  deviceName?: string | null;
  platform?: string | null;
  pushToken?: string | null;
}) {
  const rawToken = `${TOKEN_PREFIX}_${crypto.randomBytes(32).toString("base64url")}`;
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + TOKEN_TTL_DAYS);

  await prisma.studentDevice.create({
    data: {
      tokenHash: hashStudentToken(rawToken),
      studentId: input.studentId,
      instituteId: input.instituteId,
      deviceName: input.deviceName,
      platform: input.platform,
      pushToken: input.pushToken,
      expiresAt
    }
  });

  return { token: rawToken, expiresAt };
}

export async function requireStudentMobileUser(request: Request) {
  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ") ? authorization.slice(7).trim() : null;

  if (!token) {
    throw new StudentMobileAuthError();
  }

  const savedToken = await prisma.studentDevice.findUnique({
    where: { tokenHash: hashStudentToken(token) },
    include: {
      student: {
        include: {
          parents: true,
          institute: { select: { id: true, name: true, logoUrl: true } },
          branch: { select: { id: true, name: true } }
        }
      }
    }
  });

  if (!savedToken || !savedToken.studentId || !savedToken.student || !savedToken.expiresAt || savedToken.expiresAt < new Date()) {
    throw new StudentMobileAuthError("Your student session has expired. Please sign in again.");
  }

  await prisma.studentDevice.update({
    where: { id: savedToken.id },
    data: { lastUsedAt: new Date() }
  });

  return {
    student: savedToken.student,
    studentId: savedToken.studentId,
    instituteId: savedToken.instituteId
  };
}

export function studentErrorResponse(error: unknown) {
  if (error instanceof StudentMobileAuthError) {
    return Response.json({ ok: false, message: error.message }, { status: error.statusCode });
  }

  console.error(error);
  return Response.json({ ok: false, message: "Student app request failed." }, { status: 500 });
}
