"use server";

import { revalidatePath } from "next/cache";
import { StudentCardStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { actionError, type ActionState, getTenantContext } from "@/lib/session";
import {
  cardAssignmentSchema,
  cardDuplicateValidationSchema,
  cardReplacementSchema,
  cardStatusSchema,
  type CardAssignmentInput,
  type CardReplacementInput,
  type CardStatusInput
} from "@/lib/validations";
import {
  assignOrUpdateActiveCard,
  issueReplacementCard,
  markCardStatus,
  validateDuplicateCard
} from "@/lib/student-cards";

const cardRoles = ["SUPER_ADMIN", "INSTITUTE_ADMIN", "BRANCH_ADMIN", "TEACHER", "STAFF"];

function canManageCards(role: string) {
  return cardRoles.includes(role);
}

function revalidateCardPaths(studentId?: string, cardId?: string) {
  revalidatePath("/cards");
  revalidatePath("/students");
  if (studentId) {
    revalidatePath(`/students/${studentId}`);
    revalidatePath(`/students/${studentId}/cards`);
  }
  if (cardId) {
    revalidatePath(`/cards/${cardId}`);
  }
}

async function assertStudentAccess(instituteId: string, studentId: string) {
  const student = await prisma.student.findFirst({
    where: { id: studentId, instituteId },
    select: { id: true }
  });

  if (!student) {
    throw new Error("Student was not found.");
  }
}

export async function assignStudentCard(input: CardAssignmentInput): Promise<ActionState & { cardId?: string }> {
  try {
    const { instituteId, userId, role } = await getTenantContext();

    if (!canManageCards(role)) {
      return { ok: false, message: "You do not have access to assign student cards." };
    }

    const parsed = cardAssignmentSchema.parse(input);
    await assertStudentAccess(instituteId, parsed.studentId);

    const card = await prisma.$transaction((tx) =>
      assignOrUpdateActiveCard(tx, {
        instituteId,
        studentId: parsed.studentId,
        performedById: userId,
        card: parsed,
        requireCard: true
      })
    );

    revalidateCardPaths(parsed.studentId, card?.id);
    return { ok: true, message: "Student card assigned.", cardId: card?.id };
  } catch (error) {
    if (error instanceof Error) {
      return { ok: false, message: error.message };
    }

    return actionError(error, "Could not assign student card.");
  }
}

export async function issueNewCard(input: CardReplacementInput): Promise<ActionState & { cardId?: string }> {
  try {
    const { instituteId, userId, role } = await getTenantContext();

    if (!canManageCards(role)) {
      return { ok: false, message: "You do not have access to issue student cards." };
    }

    const parsed = cardReplacementSchema.parse(input);
    await assertStudentAccess(instituteId, parsed.studentId);

    const card = await prisma.$transaction((tx) =>
      issueReplacementCard(tx, {
        instituteId,
        studentId: parsed.studentId,
        reason: parsed.reason,
        card: parsed,
        notes: parsed.notes,
        performedById: userId,
        createReplacementFee: parsed.createReplacementFee
      })
    );

    revalidateCardPaths(parsed.studentId, card.id);
    return { ok: true, message: "New student card issued.", cardId: card.id };
  } catch (error) {
    if (error instanceof Error) {
      return { ok: false, message: error.message };
    }

    return actionError(error, "Could not issue new card.");
  }
}

export async function updateCardStatus(input: CardStatusInput): Promise<ActionState> {
  try {
    const { instituteId, userId, role } = await getTenantContext();

    if (!canManageCards(role)) {
      return { ok: false, message: "You do not have access to update student cards." };
    }

    const parsed = cardStatusSchema.parse(input);
    const card = await prisma.$transaction((tx) =>
      markCardStatus(tx, {
        instituteId,
        cardId: parsed.cardId,
        status: parsed.status as StudentCardStatus,
        reason: parsed.reason,
        notes: parsed.notes,
        performedById: userId
      })
    );

    revalidateCardPaths(card.studentId, card.id);
    return { ok: true, message: `Card marked ${card.status.toLowerCase()}.` };
  } catch (error) {
    if (error instanceof Error) {
      return { ok: false, message: error.message };
    }

    return actionError(error, "Could not update card status.");
  }
}

export async function validateCardIdentifiers(input: unknown): Promise<ActionState> {
  try {
    const { instituteId, role } = await getTenantContext();

    if (!canManageCards(role)) {
      return { ok: false, message: "You do not have access to validate cards." };
    }

    const parsed = cardDuplicateValidationSchema.parse(input);
    await validateDuplicateCard(instituteId, parsed, parsed.excludeCardId);
    return { ok: true, message: "No duplicate card identifiers found." };
  } catch (error) {
    if (error instanceof Error) {
      return { ok: false, message: error.message };
    }

    return actionError(error, "Could not validate card identifiers.");
  }
}
