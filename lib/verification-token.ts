import crypto from "node:crypto";
import { FaceVerificationResult } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type TokenPayload = {
  studentId: string;
  attendanceSessionId: string;
  attemptId: string;
  deviceId?: string | null;
  nonce: string;
  result: FaceVerificationResult;
  iat: number;
  exp: number;
};

function secret() {
  const value = process.env.FACE_VERIFICATION_TOKEN_SECRET;
  if (!value || value.length < 32) throw new Error("FACE_VERIFICATION_TOKEN_SECRET must be at least 32 characters.");
  return value;
}

function sign(encodedPayload: string) {
  return crypto.createHmac("sha256", secret()).update(encodedPayload).digest("base64url");
}

export function hashVerificationToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function createVerificationToken(input: {
  studentId: string;
  attendanceSessionId: string;
  attemptId: string;
  deviceId?: string | null;
  result: FaceVerificationResult;
  ttlSeconds: number;
}) {
  const now = Math.floor(Date.now() / 1000);
  const payload: TokenPayload = {
    studentId: input.studentId,
    attendanceSessionId: input.attendanceSessionId,
    attemptId: input.attemptId,
    deviceId: input.deviceId,
    nonce: crypto.randomBytes(18).toString("base64url"),
    result: input.result,
    iat: now,
    exp: now + input.ttlSeconds
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const token = `${encodedPayload}.${sign(encodedPayload)}`;

  await prisma.faceVerificationToken.create({
    data: {
      tokenHash: hashVerificationToken(token),
      studentId: input.studentId,
      attendanceSessionId: input.attendanceSessionId,
      attemptId: input.attemptId,
      deviceId: input.deviceId,
      nonce: payload.nonce,
      result: input.result,
      expiresAt: new Date(payload.exp * 1000)
    }
  });

  return token;
}

export function parseVerificationToken(token: string): TokenPayload | null {
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature || sign(encodedPayload) !== signature) return null;

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as TokenPayload;
    if (!payload.studentId || !payload.attendanceSessionId || !payload.attemptId || !payload.nonce || !payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}
