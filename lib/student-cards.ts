import { randomUUID } from "node:crypto";
import {
  CardScanResult,
  CardScanType,
  PaymentStatus,
  Prisma,
  StudentCardHistoryAction,
  StudentCardStatus
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { nextInvoiceNo } from "@/lib/payments";
import { normalizeNfcUid } from "@/lib/nfc";

type Tx = Prisma.TransactionClient;

export type CardAssignmentInput = {
  cardNumber?: string | null;
  nfcUid?: string | null;
  qrCode?: string | null;
  qrToken?: string | null;
  notes?: string | null;
};

export type CardReplacementReason = "LOST" | "MISSING" | "STOLEN" | "DAMAGED" | "WRONG_CARD" | "OTHER";

function clean(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function normalizeCardInput(input: CardAssignmentInput) {
  const qrCode = clean(input.qrCode);

  return {
    cardNumber: clean(input.cardNumber),
    nfcUid: normalizeNfcUid(input.nfcUid) || null,
    qrCode,
    qrToken: clean(input.qrToken) ?? qrCode,
    notes: clean(input.notes)
  };
}

export function hasCardCredential(input: CardAssignmentInput) {
  const normalized = normalizeCardInput(input);
  return Boolean(normalized.cardNumber || normalized.nfcUid || normalized.qrCode || normalized.qrToken);
}

async function settingsFor(tx: Tx, instituteId: string) {
  return tx.instituteSettings.findUnique({
    where: { instituteId },
    select: {
      cardRequireDuringRegistration: true,
      cardRequireBothNfcAndQr: true,
      cardAllowQrOnly: true,
      cardAllowNfcOnly: true,
      cardAutoGenerateQrToken: true,
      cardReplacementFee: true
    }
  });
}

async function validatePolicy(tx: Tx, instituteId: string, input: ReturnType<typeof normalizeCardInput>, required: boolean) {
  const settings = await settingsFor(tx, instituteId);
  const requireCard = required || settings?.cardRequireDuringRegistration;
  const hasNfc = Boolean(input.nfcUid);
  let hasQr = Boolean(input.qrCode || input.qrToken);
  const hasAnyCardDetail = hasNfc || hasQr || Boolean(input.cardNumber);

  if (!requireCard && !hasAnyCardDetail) {
    return;
  }

  if (settings?.cardAutoGenerateQrToken && !input.qrToken && !input.qrCode) {
    input.qrToken = randomUUID();
    hasQr = true;
  }

  if (requireCard && !hasNfc && !hasQr && !input.cardNumber) {
    throw new Error("Student card assignment is required before registration can be completed.");
  }

  if (settings?.cardRequireBothNfcAndQr && (!hasNfc || !hasQr)) {
    throw new Error("This institute requires both NFC and QR details for student cards.");
  }

  if (hasQr && !hasNfc && settings?.cardAllowQrOnly === false) {
    throw new Error("QR-only student cards are disabled for this institute.");
  }

  if (hasNfc && !hasQr && settings?.cardAllowNfcOnly === false) {
    throw new Error("NFC-only student cards are disabled for this institute.");
  }
}

async function assertUniqueCardValues(tx: Tx, instituteId: string, input: ReturnType<typeof normalizeCardInput>, excludeCardId?: string) {
  const conflicts = await tx.studentCard.findMany({
    where: {
      instituteId,
      ...(excludeCardId ? { id: { not: excludeCardId } } : {}),
      OR: [
        input.cardNumber ? { cardNumber: input.cardNumber } : undefined,
        input.nfcUid ? { nfcUid: input.nfcUid } : undefined,
        input.qrCode ? { qrCode: input.qrCode } : undefined,
        input.qrToken ? { qrToken: input.qrToken } : undefined
      ].filter(Boolean) as Prisma.StudentCardWhereInput[]
    },
    include: {
      student: {
        select: { firstName: true, lastName: true, admissionNo: true }
      }
    }
  });

  const conflict = conflicts[0];
  if (!conflict) {
    return;
  }

  const studentName = `${conflict.student.firstName} ${conflict.student.lastName}`.trim();
  throw new Error(`This card identifier is already linked to ${studentName} (${conflict.student.admissionNo}) with status ${conflict.status}.`);
}

export async function validateDuplicateCard(instituteId: string, input: CardAssignmentInput, excludeCardId?: string) {
  const normalized = normalizeCardInput(input);
  await assertUniqueCardValues(prisma, instituteId, normalized, excludeCardId);
}

async function logHistory(
  tx: Tx,
  input: {
    instituteId: string;
    studentId: string;
    cardId: string;
    action: StudentCardHistoryAction;
    previousStatus?: StudentCardStatus | null;
    newStatus?: StudentCardStatus | null;
    previousNfcUid?: string | null;
    newNfcUid?: string | null;
    previousQrCode?: string | null;
    newQrCode?: string | null;
    reason?: string | null;
    notes?: string | null;
    performedById?: string | null;
  }
) {
  await tx.studentCardHistory.create({
    data: {
      instituteId: input.instituteId,
      studentId: input.studentId,
      cardId: input.cardId,
      action: input.action,
      previousStatus: input.previousStatus ?? null,
      newStatus: input.newStatus ?? null,
      previousNfcUid: input.previousNfcUid ?? null,
      newNfcUid: input.newNfcUid ?? null,
      previousQrCode: input.previousQrCode ?? null,
      newQrCode: input.newQrCode ?? null,
      reason: input.reason ?? null,
      notes: input.notes ?? null,
      performedById: input.performedById ?? null
    }
  });
}

async function syncLegacyStudentCardFields(tx: Tx, studentId: string, nfcUid?: string | null, qrCode?: string | null, qrToken?: string | null) {
  await tx.student.update({
    where: { id: studentId },
    data: {
      nfcUid: nfcUid ?? null,
      qrCode: qrCode ?? null,
      attendanceToken: qrToken ?? undefined
    }
  });
}

export async function assignOrUpdateActiveCard(
  tx: Tx,
  input: {
    instituteId: string;
    studentId: string;
    card: CardAssignmentInput;
    performedById?: string | null;
    requireCard?: boolean;
  }
) {
  const normalized = normalizeCardInput(input.card);
  await validatePolicy(tx, input.instituteId, normalized, input.requireCard ?? false);

  if (!hasCardCredential(normalized)) {
    return null;
  }

  const activeCard = await tx.studentCard.findFirst({
    where: { instituteId: input.instituteId, studentId: input.studentId, status: "ACTIVE" }
  });

  await assertUniqueCardValues(tx, input.instituteId, normalized, activeCard?.id);

  if (activeCard) {
    const updated = await tx.studentCard.update({
      where: { id: activeCard.id },
      data: {
        cardNumber: normalized.cardNumber,
        nfcUid: normalized.nfcUid,
        qrCode: normalized.qrCode,
        qrToken: normalized.qrToken,
        notes: normalized.notes ?? activeCard.notes
      }
    });

    await logHistory(tx, {
      instituteId: input.instituteId,
      studentId: input.studentId,
      cardId: updated.id,
      action: "ASSIGNED",
      previousStatus: activeCard.status,
      newStatus: updated.status,
      previousNfcUid: activeCard.nfcUid,
      newNfcUid: updated.nfcUid,
      previousQrCode: activeCard.qrCode,
      newQrCode: updated.qrCode,
      notes: "Active card identifiers updated.",
      performedById: input.performedById
    });

    await syncLegacyStudentCardFields(tx, input.studentId, updated.nfcUid, updated.qrCode, updated.qrToken);
    return updated;
  }

  const now = new Date();
  const card = await tx.studentCard.create({
    data: {
      instituteId: input.instituteId,
      studentId: input.studentId,
      cardNumber: normalized.cardNumber,
      nfcUid: normalized.nfcUid,
      qrCode: normalized.qrCode,
      qrToken: normalized.qrToken,
      status: "ACTIVE",
      issuedAt: now,
      activatedAt: now,
      notes: normalized.notes,
      issuedById: input.performedById ?? null
    }
  });

  await logHistory(tx, {
    instituteId: input.instituteId,
    studentId: input.studentId,
    cardId: card.id,
    action: "ISSUED",
    newStatus: "ACTIVE",
    newNfcUid: card.nfcUid,
    newQrCode: card.qrCode,
    notes: "Card issued and activated.",
    performedById: input.performedById
  });

  await syncLegacyStudentCardFields(tx, input.studentId, card.nfcUid, card.qrCode, card.qrToken);
  return card;
}

export function statusForReplacementReason(reason: CardReplacementReason): StudentCardStatus {
  if (reason === "LOST") return "LOST";
  if (reason === "MISSING") return "MISSING";
  if (reason === "STOLEN") return "STOLEN";
  if (reason === "DAMAGED") return "DAMAGED";
  return "REPLACED";
}

function actionForStatus(status: StudentCardStatus): StudentCardHistoryAction {
  if (status === "LOST") return "MARKED_LOST";
  if (status === "MISSING") return "MARKED_MISSING";
  if (status === "STOLEN") return "MARKED_STOLEN";
  if (status === "DAMAGED") return "MARKED_DAMAGED";
  if (status === "BLOCKED") return "BLOCKED";
  if (status === "INACTIVE") return "DEACTIVATED";
  return "REPLACED";
}

export async function markCardStatus(
  tx: Tx,
  input: {
    instituteId: string;
    cardId: string;
    status: StudentCardStatus;
    reason?: string | null;
    notes?: string | null;
    performedById?: string | null;
  }
) {
  const previous = await tx.studentCard.findFirst({
    where: { id: input.cardId, instituteId: input.instituteId }
  });

  if (!previous) {
    throw new Error("Student card was not found.");
  }

  const now = new Date();
  const updated = await tx.studentCard.update({
    where: { id: previous.id },
    data: {
      status: input.status,
      deactivatedAt: input.status === "ACTIVE" ? null : now,
      replacedAt: input.status === "REPLACED" ? now : previous.replacedAt,
      lostReportedAt: input.status === "LOST" ? now : previous.lostReportedAt,
      missingReportedAt: input.status === "MISSING" ? now : previous.missingReportedAt,
      stolenReportedAt: input.status === "STOLEN" ? now : previous.stolenReportedAt,
      damagedReportedAt: input.status === "DAMAGED" ? now : previous.damagedReportedAt,
      notes: input.notes ?? previous.notes,
      replacedById: input.performedById ?? previous.replacedById
    }
  });

  await logHistory(tx, {
    instituteId: input.instituteId,
    studentId: previous.studentId,
    cardId: previous.id,
    action: actionForStatus(input.status),
    previousStatus: previous.status,
    newStatus: updated.status,
    previousNfcUid: previous.nfcUid,
    newNfcUid: updated.nfcUid,
    previousQrCode: previous.qrCode,
    newQrCode: updated.qrCode,
    reason: input.reason,
    notes: input.notes,
    performedById: input.performedById
  });

  if (previous.status === "ACTIVE" && input.status !== "ACTIVE") {
    await syncLegacyStudentCardFields(tx, previous.studentId, null, null, null);
  }

  return updated;
}

export async function issueReplacementCard(
  tx: Tx,
  input: {
    instituteId: string;
    studentId: string;
    reason: CardReplacementReason;
    card: CardAssignmentInput;
    notes?: string | null;
    performedById?: string | null;
    createReplacementFee?: boolean;
  }
) {
  const student = await tx.student.findFirst({
    where: { id: input.studentId, instituteId: input.instituteId },
    select: { id: true }
  });

  if (!student) {
    throw new Error("Student was not found.");
  }

  const previousActive = await tx.studentCard.findFirst({
    where: { instituteId: input.instituteId, studentId: input.studentId, status: "ACTIVE" }
  });
  const oldStatus = statusForReplacementReason(input.reason);

  if (previousActive) {
    await markCardStatus(tx, {
      instituteId: input.instituteId,
      cardId: previousActive.id,
      status: oldStatus,
      reason: input.reason,
      notes: input.notes,
      performedById: input.performedById
    });
  }

  const card = await assignOrUpdateActiveCard(tx, {
    instituteId: input.instituteId,
    studentId: input.studentId,
    card: { ...input.card, notes: input.notes },
    performedById: input.performedById,
    requireCard: true
  });

  if (!card) {
    throw new Error("New card details are required.");
  }

  await logHistory(tx, {
    instituteId: input.instituteId,
    studentId: input.studentId,
    cardId: card.id,
    action: "REPLACED",
    newStatus: "ACTIVE",
    newNfcUid: card.nfcUid,
    newQrCode: card.qrCode,
    reason: input.reason,
    notes: previousActive ? `Replaced card ${previousActive.cardNumber ?? previousActive.id}.` : "Issued replacement card.",
    performedById: input.performedById
  });

  if (input.createReplacementFee) {
    const settings = await settingsFor(tx, input.instituteId);
    const fee = Number(settings?.cardReplacementFee ?? 0);

    if (fee > 0) {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 7);
      await tx.payment.create({
        data: {
          invoiceNo: await nextInvoiceNo(input.instituteId),
          type: "OTHER",
          amount: fee,
          discount: 0,
          paidAmount: 0,
          balance: fee,
          dueDate,
          status: PaymentStatus.PENDING,
          note: `Student Card Replacement Fee - ${input.reason.toLowerCase().replaceAll("_", " ")}`,
          instituteId: input.instituteId,
          studentId: input.studentId
        }
      });
    }
  }

  return card;
}

export async function findActiveCardByCredential(input: {
  instituteId: string;
  scanType: CardScanType;
  value?: string | null;
}) {
  const value = input.scanType === "NFC" ? normalizeNfcUid(input.value) : clean(input.value);

  if (!value) {
    return null;
  }

  return prisma.studentCard.findFirst({
    where:
      input.scanType === "NFC"
        ? { instituteId: input.instituteId, nfcUid: value }
        : { instituteId: input.instituteId, OR: [{ qrToken: value }, { qrCode: value }] },
    include: {
      student: {
        select: { id: true, firstName: true, lastName: true, admissionNo: true, status: true }
      }
    }
  });
}

export function scanResultForCardStatus(status: StudentCardStatus): CardScanResult {
  if (status === "LOST") return "CARD_LOST";
  if (status === "STOLEN") return "CARD_STOLEN";
  if (status === "MISSING") return "CARD_MISSING";
  return "CARD_INACTIVE";
}

export async function logCardScan(input: {
  instituteId: string;
  cardId?: string | null;
  studentId?: string | null;
  scanType: CardScanType;
  scannedValue: string;
  result: CardScanResult;
  classGroupId?: string | null;
  attendanceSessionId?: string | null;
  scannedById?: string | null;
  deviceInfo?: string | null;
  notes?: string | null;
}) {
  await prisma.cardScanLog.create({
    data: {
      instituteId: input.instituteId,
      cardId: input.cardId ?? null,
      studentId: input.studentId ?? null,
      scanType: input.scanType,
      scannedValue: input.scannedValue,
      result: input.result,
      classGroupId: input.classGroupId ?? null,
      attendanceSessionId: input.attendanceSessionId ?? null,
      scannedById: input.scannedById ?? null,
      deviceInfo: input.deviceInfo ?? null,
      notes: input.notes ?? null
    }
  });
}
