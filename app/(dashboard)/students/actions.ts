"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { Prisma, StudentStatus } from "@prisma/client";
import { actionError, type ActionState, getTenantContext } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { studentSchema, type StudentInput } from "@/lib/validations";
import { normalizeNfcUid } from "@/lib/nfc";
import { findOrCreateParent } from "@/lib/parent-registration";
import { assignOrUpdateActiveCard, hasCardCredential } from "@/lib/student-cards";

function toDate(value?: string) {
  return value ? new Date(value) : null;
}

function studentData(input: StudentInput, instituteId: string) {
  const normalizedNfcUid = normalizeNfcUid(input.nfcUid);

  return {
    admissionNo: input.admissionNo,
    firstName: input.firstName,
    lastName: input.lastName,
    email: input.email ?? null,
    phone: input.phone ?? null,
    dateOfBirth: toDate(input.dateOfBirth),
    status: input.status as StudentStatus,
    avatarUrl: input.avatarUrl ?? null,
    nfcUid: normalizedNfcUid || null,
    qrCode: input.qrCode ?? null,
    branchId: input.branchId,
    instituteId
  };
}

async function assertUniqueNfcUid(instituteId: string, nfcUid: string | undefined, currentStudentId?: string) {
  const normalizedNfcUid = normalizeNfcUid(nfcUid);

  if (!normalizedNfcUid) {
    return;
  }

  const existingStudents = await prisma.student.findMany({
    where: {
      instituteId,
      nfcUid: { not: null },
      ...(currentStudentId ? { id: { not: currentStudentId } } : {})
    },
    select: { id: true, firstName: true, lastName: true, admissionNo: true, nfcUid: true }
  });
  const existing = existingStudents.find((student) => normalizeNfcUid(student.nfcUid) === normalizedNfcUid);

  if (existing) {
    throw new Error(`This NFC card is already assigned to ${existing.firstName} ${existing.lastName} (${existing.admissionNo}).`);
  }
}

async function assertBranch(instituteId: string, branchId: string) {
  const branch = await prisma.branch.findFirst({
    where: { id: branchId, instituteId },
    select: { id: true }
  });

  if (!branch) {
    throw new Error("Invalid branch.");
  }
}

function uniqueMessage(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return "Admission number, NFC UID, or QR code already exists in this institute.";
  }

  return null;
}

export async function createStudent(input: StudentInput): Promise<ActionState> {
  try {
    const { instituteId, userId } = await getTenantContext();
    const parsed = studentSchema.parse(input);
    await assertBranch(instituteId, parsed.branchId);
    await assertUniqueNfcUid(instituteId, parsed.nfcUid);

    const qrToken = parsed.qrToken ?? `edutap_qr_${randomUUID()}`;
    await prisma.$transaction(async (tx) => {
      const parent = await findOrCreateParent(tx, instituteId, {
        name: parsed.parentName,
        relationship: parsed.parentRelationship,
        email: parsed.parentEmail,
        phone: parsed.parentPhone,
        nic: parsed.parentNic,
        address: parsed.parentAddress,
        appLogin: parsed.parentAppLogin,
        emergencyContactNumber: parsed.emergencyContactNumber,
        occupation: parsed.parentOccupation
      });

      const student = await tx.student.create({
        data: {
          ...studentData(parsed, instituteId),
          attendanceToken: randomUUID(),
          parents: {
            connect: { id: parent.id }
          }
        }
      });

      const loginEmail = parsed.email?.toLowerCase() ?? `${parsed.admissionNo.toLowerCase().replace(/[^a-z0-9]/g, "")}@student.edutap.local`;
      const user = await tx.user.create({
        data: {
          name: `${parsed.firstName} ${parsed.lastName}`,
          email: loginEmail,
          passwordHash: null,
          passwordStatus: "NOT_SETUP",
          role: "STUDENT",
          mustChangePassword: false,
          accountStatus: parsed.status === "PENDING_APPROVAL" ? "PENDING_APPROVAL" : parsed.status === "REJECTED" ? "REJECTED" : "ACTIVE",
          instituteId,
          branchId: parsed.branchId,
          image: parsed.avatarUrl ?? null
        }
      });
      await tx.student.update({ where: { id: student.id }, data: { userId: user.id } });

      await tx.parentStudent.upsert({
        where: { parentId_studentId: { parentId: parent.id, studentId: student.id } },
        create: { parentId: parent.id, studentId: student.id, relation: parsed.parentRelationship },
        update: { relation: parsed.parentRelationship }
      });

      await assignOrUpdateActiveCard(tx, {
        instituteId,
        studentId: student.id,
        performedById: userId,
        card: {
          cardNumber: parsed.cardNumber,
          nfcUid: parsed.nfcUid,
          qrCode: parsed.qrCode,
          qrToken
        },
        requireCard: false
      });
    });

    revalidatePath("/students");
    return { ok: true, message: "Student added. First login must be activated with the assigned QR or NFC card." };
  } catch (error) {
    const duplicate = uniqueMessage(error);
    if (duplicate) {
      return { ok: false, message: duplicate };
    }

    if (error instanceof Error && (error.message.includes("NFC card is already assigned") || error.message.includes("card identifier") || error.message.includes("student card"))) {
      return { ok: false, message: error.message };
    }

    return actionError(error, "Could not add student.");
  }
}

export async function updateStudent(id: string, input: StudentInput): Promise<ActionState> {
  try {
    const { instituteId, userId } = await getTenantContext();
    const parsed = studentSchema.parse(input);
    await assertBranch(instituteId, parsed.branchId);
    await assertUniqueNfcUid(instituteId, parsed.nfcUid, id);

    const existing = await prisma.student.findFirst({
      where: { id, instituteId },
      include: { parents: { take: 1 } }
    });

    if (!existing) {
      return { ok: false, message: "Student was not found." };
    }

    await prisma.$transaction(async (tx) => {
      const parent = await findOrCreateParent(tx, instituteId, {
        name: parsed.parentName,
        relationship: parsed.parentRelationship,
        email: parsed.parentEmail,
        phone: parsed.parentPhone,
        nic: parsed.parentNic,
        address: parsed.parentAddress,
        appLogin: parsed.parentAppLogin,
        emergencyContactNumber: parsed.emergencyContactNumber,
        occupation: parsed.parentOccupation
      });

      await tx.student.update({
        where: { id },
        data: {
          ...studentData(parsed, instituteId),
          parents: {
            connect: { id: parent.id }
          }
        }
      });

      if (existing.userId) {
        await tx.user.update({
          where: { id: existing.userId },
          data: {
            name: `${parsed.firstName} ${parsed.lastName}`,
            image: parsed.avatarUrl ?? null,
            branchId: parsed.branchId,
            accountStatus: parsed.status === "PENDING_APPROVAL" ? "PENDING_APPROVAL" : parsed.status === "REJECTED" ? "REJECTED" : "ACTIVE"
          }
        });
      }

      await tx.parentStudent.upsert({
        where: { parentId_studentId: { parentId: parent.id, studentId: id } },
        create: { parentId: parent.id, studentId: id, relation: parsed.parentRelationship },
        update: { relation: parsed.parentRelationship }
      });

      if (hasCardCredential({ cardNumber: parsed.cardNumber, nfcUid: parsed.nfcUid, qrCode: parsed.qrCode, qrToken: parsed.qrToken })) {
        await assignOrUpdateActiveCard(tx, {
          instituteId,
          studentId: id,
          performedById: userId,
          card: {
            cardNumber: parsed.cardNumber,
            nfcUid: parsed.nfcUid,
            qrCode: parsed.qrCode,
            qrToken: parsed.qrToken
          }
        });
      }
    });

    revalidatePath("/students");
    revalidatePath(`/students/${id}`);
    return { ok: true, message: "Student updated successfully." };
  } catch (error) {
    const duplicate = uniqueMessage(error);
    if (duplicate) {
      return { ok: false, message: duplicate };
    }

    if (error instanceof Error && (error.message.includes("NFC card is already assigned") || error.message.includes("card identifier") || error.message.includes("student card"))) {
      return { ok: false, message: error.message };
    }

    return actionError(error, "Could not update student.");
  }
}

export async function deleteStudent(id: string): Promise<ActionState> {
  try {
    const { instituteId } = await getTenantContext();
    const student = await prisma.student.findFirst({
      where: { id, instituteId },
      select: { id: true }
    });

    if (!student) {
      return { ok: false, message: "Student was not found." };
    }

    await prisma.student.delete({ where: { id } });
    revalidatePath("/students");
    return { ok: true, message: "Student deleted." };
  } catch (error) {
    return actionError(error, "Could not delete student.");
  }
}
