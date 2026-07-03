import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { CardScanType, PasswordStatus, StudentCardStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { normalizeNfcUid } from "@/lib/nfc";

const ACTIVATION_TOKEN_TTL_MINUTES = 15;

export function hashActivationToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function deviceInfoFromRequest(request: Request) {
  const userAgent = request.headers.get("user-agent") ?? "Unknown device";
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwardedFor ? `${userAgent} | IP ${forwardedFor}` : userAgent;
}

function normalizeCredential(method: CardScanType, value: string) {
  return method === "NFC" ? normalizeNfcUid(value) : value.trim();
}

export async function startStudentActivation(input: { method: CardScanType; value: string; request: Request }) {
  const credential = normalizeCredential(input.method, input.value);
  if (!credential) {
    return { ok: false as const, status: 400, message: "Scan a valid student card." };
  }

  const card = await prisma.studentCard.findFirst({
    where: input.method === "NFC" ? { nfcUid: credential } : { OR: [{ qrToken: credential }, { qrCode: credential }] },
    include: {
      student: {
        include: {
          user: true,
          institute: { select: { name: true } },
          branch: { select: { name: true } }
        }
      }
    }
  });

  if (!card) {
    return { ok: false as const, status: 404, message: "Student card was not found." };
  }

  if (card.status !== StudentCardStatus.ACTIVE) {
    return { ok: false as const, status: 403, message: `This card cannot activate an account. Status: ${card.status}.` };
  }

  if (!card.student.user) {
    return { ok: false as const, status: 409, message: "This student does not have a login account yet." };
  }

  if (card.student.status !== "ACTIVE" || card.student.user.accountStatus !== "ACTIVE") {
    return { ok: false as const, status: 403, message: "This student account is not active yet." };
  }

  if (card.student.user.passwordStatus !== PasswordStatus.NOT_SETUP) {
    return {
      ok: true as const,
      setupRequired: false,
      message: "Account is already activated. Sign in with password, Google, QR, or NFC.",
      student: {
        name: `${card.student.firstName} ${card.student.lastName}`,
        admissionNo: card.student.admissionNo,
        institute: card.student.institute.name,
        branch: card.student.branch.name
      }
    };
  }

  const rawToken = `edutap_activation_${crypto.randomBytes(32).toString("base64url")}`;
  const expiresAt = new Date(Date.now() + ACTIVATION_TOKEN_TTL_MINUTES * 60 * 1000);
  const deviceInfo = deviceInfoFromRequest(input.request);

  await prisma.studentActivationToken.create({
    data: {
      tokenHash: hashActivationToken(rawToken),
      instituteId: card.instituteId,
      studentId: card.studentId,
      userId: card.student.user.id,
      cardId: card.id,
      method: input.method,
      deviceInfo,
      expiresAt
    }
  });

  return {
    ok: true as const,
    setupRequired: true,
    activationToken: rawToken,
    expiresAt: expiresAt.toISOString(),
    message: "Card verified. Continue account setup.",
    student: {
      name: `${card.student.firstName} ${card.student.lastName}`,
      admissionNo: card.student.admissionNo,
      institute: card.student.institute.name,
      branch: card.student.branch.name
    }
  };
}

export async function completeStudentActivation(input: { activationToken: string; password: string; request: Request }) {
  const tokenHash = hashActivationToken(input.activationToken);
  const activation = await prisma.studentActivationToken.findUnique({
    where: { tokenHash },
    include: {
      student: true,
      user: true,
      card: true
    }
  });

  if (!activation || activation.usedAt || activation.expiresAt < new Date()) {
    return { ok: false as const, status: 400, message: "This setup link has expired. Scan your card again." };
  }

  if (activation.card.status !== StudentCardStatus.ACTIVE) {
    return { ok: false as const, status: 403, message: `This card cannot activate an account. Status: ${activation.card.status}.` };
  }

  if (activation.user.passwordStatus !== PasswordStatus.NOT_SETUP) {
    return { ok: false as const, status: 409, message: "This account is already activated." };
  }

  const passwordHash = await bcrypt.hash(input.password, 12);
  const now = new Date();
  const deviceInfo = deviceInfoFromRequest(input.request);

  await prisma.$transaction(async (tx) => {
    await tx.studentActivationToken.update({
      where: { id: activation.id },
      data: { usedAt: now, deviceInfo }
    });

    await tx.user.update({
      where: { id: activation.userId },
      data: {
        passwordHash,
        passwordStatus: PasswordStatus.ACTIVE,
        authProvider: activation.user.googleId ? "BOTH" : "PASSWORD",
        mustChangePassword: false,
        lastLoginAt: now,
        lastLoginDevice: deviceInfo
      }
    });

    await tx.student.update({
      where: { id: activation.studentId },
      data: {
        firstLoginCompleted: true,
        firstLoginAt: now,
        activeDeviceInfo: deviceInfo
      }
    });
  });

  return {
    ok: true as const,
    status: 200,
    message: "Your student account is ready.",
    identifier: activation.student.email ?? activation.student.admissionNo,
    student: {
      name: `${activation.student.firstName} ${activation.student.lastName}`,
      admissionNo: activation.student.admissionNo
    }
  };
}
