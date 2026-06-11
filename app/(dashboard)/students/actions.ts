"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { Prisma, StudentStatus } from "@prisma/client";
import { actionError, type ActionState, getTenantContext } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { studentSchema, type StudentInput } from "@/lib/validations";

function toDate(value?: string) {
  return value ? new Date(value) : null;
}

function studentData(input: StudentInput, instituteId: string) {
  return {
    admissionNo: input.admissionNo,
    firstName: input.firstName,
    lastName: input.lastName,
    email: input.email ?? null,
    phone: input.phone ?? null,
    dateOfBirth: toDate(input.dateOfBirth),
    status: input.status as StudentStatus,
    avatarUrl: input.avatarUrl ?? null,
    nfcUid: input.nfcUid ?? null,
    qrCode: input.qrCode ?? null,
    branchId: input.branchId,
    instituteId
  };
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
    const { instituteId } = await getTenantContext();
    const parsed = studentSchema.parse(input);
    await assertBranch(instituteId, parsed.branchId);

    await prisma.$transaction(async (tx) => {
      const parent = await tx.parent.create({
        data: {
          name: parsed.parentName,
          email: parsed.parentEmail ?? null,
          phone: parsed.parentPhone,
          occupation: parsed.parentOccupation ?? null,
          instituteId
        }
      });

      await tx.student.create({
        data: {
          ...studentData(parsed, instituteId),
          attendanceToken: randomUUID(),
          parents: {
            connect: { id: parent.id }
          }
        }
      });
    });

    revalidatePath("/students");
    return { ok: true, message: "Student added successfully." };
  } catch (error) {
    const duplicate = uniqueMessage(error);
    if (duplicate) {
      return { ok: false, message: duplicate };
    }

    return actionError(error, "Could not add student.");
  }
}

export async function updateStudent(id: string, input: StudentInput): Promise<ActionState> {
  try {
    const { instituteId } = await getTenantContext();
    const parsed = studentSchema.parse(input);
    await assertBranch(instituteId, parsed.branchId);

    const existing = await prisma.student.findFirst({
      where: { id, instituteId },
      include: { parents: { take: 1 } }
    });

    if (!existing) {
      return { ok: false, message: "Student was not found." };
    }

    await prisma.$transaction(async (tx) => {
      const parentId = existing.parents[0]?.id;

      if (parentId) {
        await tx.parent.update({
          where: { id: parentId },
          data: {
            name: parsed.parentName,
            email: parsed.parentEmail ?? null,
            phone: parsed.parentPhone,
            occupation: parsed.parentOccupation ?? null
          }
        });
      } else {
        const parent = await tx.parent.create({
          data: {
            name: parsed.parentName,
            email: parsed.parentEmail ?? null,
            phone: parsed.parentPhone,
            occupation: parsed.parentOccupation ?? null,
            instituteId
          }
        });

        await tx.student.update({
          where: { id },
          data: {
            parents: {
              connect: { id: parent.id }
            }
          }
        });
      }

      await tx.student.update({
        where: { id },
        data: studentData(parsed, instituteId)
      });
    });

    revalidatePath("/students");
    revalidatePath(`/students/${id}`);
    return { ok: true, message: "Student updated successfully." };
  } catch (error) {
    const duplicate = uniqueMessage(error);
    if (duplicate) {
      return { ok: false, message: duplicate };
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
