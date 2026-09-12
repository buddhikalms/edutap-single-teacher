"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { Prisma, StudentStatus } from "@prisma/client";
import { actionError, type ActionState, getTenantContext } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { studentSchema, type StudentInput } from "@/lib/validations";
import { findOrCreateParent } from "@/lib/parent-registration";

function toDate(value?: string) {
  return value ? new Date(value) : null;
}

function splitFullName(fullName: string) {
  const parts = fullName.trim().replace(/\s+/g, " ").split(" ");
  const firstName = parts.shift() ?? fullName.trim();
  const lastName = parts.join(" ");

  return { firstName, lastName };
}

function studentData(input: StudentInput, instituteId: string, admissionNo: string, branchId: string) {
  const { firstName, lastName } = splitFullName(input.fullName);
  return {
    admissionNo,
    firstName,
    lastName,
    email: null,
    phone: null,
    dateOfBirth: toDate(input.dateOfBirth),
    status: input.status as StudentStatus,
    avatarUrl: input.avatarUrl ?? null,
    branchId,
    instituteId
  };
}

async function getClassGroup(instituteId: string, classGroupId: string) {
  const classGroup = await prisma.classGroup.findFirst({
    where: { id: classGroupId, instituteId },
    select: {
      id: true,
      branchId: true,
      paymentStartDate: true,
      defaultFreePeriodType: true,
      defaultFreeDays: true
    }
  });

  if (!classGroup) {
    throw new Error("Invalid class.");
  }

  return classGroup;
}

async function generateAdmissionNo(tx: Prisma.TransactionClient, instituteId: string) {
  const prefix = `STU-${new Date().getFullYear().toString().slice(-2)}-`;
  const existing = await tx.student.findMany({
    where: { instituteId, admissionNo: { startsWith: prefix } },
    select: { admissionNo: true },
    orderBy: { createdAt: "desc" },
    take: 200
  });
  const max = existing.reduce((highest, student) => {
    const sequence = Number(student.admissionNo.slice(prefix.length));
    return Number.isFinite(sequence) ? Math.max(highest, sequence) : highest;
  }, 0);

  return `${prefix}${String(max + 1).padStart(4, "0")}`;
}

function uniqueMessage(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return "Admission number already exists in this institute.";
  }

  return null;
}

export async function createStudent(input: StudentInput): Promise<ActionState> {
  try {
    const { instituteId } = await getTenantContext();
    const parsed = studentSchema.parse(input);
    const classGroup = await getClassGroup(instituteId, parsed.classGroupId);

    await prisma.$transaction(async (tx) => {
      const admissionNo = parsed.admissionNo ?? await generateAdmissionNo(tx, instituteId);
      const parent = await findOrCreateParent(tx, instituteId, {
        name: parsed.parentName,
        relationship: parsed.parentRelationship,
        email: parsed.parentEmail,
        phone: parsed.parentPhone,
        address: parsed.parentAddress,
        appLogin: parsed.parentPhone,
        emergencyContactNumber: parsed.emergencyContactNumber ?? parsed.parentPhone
      });
      const { firstName, lastName } = splitFullName(parsed.fullName);

      const student = await tx.student.create({
        data: {
          ...studentData(parsed, instituteId, admissionNo, classGroup.branchId),
          attendanceToken: randomUUID(),
          parents: {
            connect: { id: parent.id }
          }
        }
      });

      await tx.enrollment.create({
        data: {
          studentId: student.id,
          classGroupId: classGroup.id,
          active: true,
          status: "ACTIVE",
          paymentStartDate: classGroup.paymentStartDate ?? new Date(),
          freePeriodType: classGroup.defaultFreePeriodType,
          freeDays: classGroup.defaultFreeDays
        }
      });

      const loginEmail = `${admissionNo.toLowerCase().replace(/[^a-z0-9]/g, "")}@student.edutap.local`;
      const user = await tx.user.create({
        data: {
          name: `${firstName} ${lastName}`.trim(),
          email: loginEmail,
          passwordHash: null,
          passwordStatus: "NOT_SETUP",
          role: "STUDENT",
          mustChangePassword: false,
          accountStatus: parsed.status === "PENDING_APPROVAL" ? "PENDING_APPROVAL" : parsed.status === "REJECTED" ? "REJECTED" : "ACTIVE",
          instituteId,
          branchId: classGroup.branchId,
          image: parsed.avatarUrl ?? null
        }
      });
      await tx.student.update({ where: { id: student.id }, data: { userId: user.id } });

      await tx.parentStudent.upsert({
        where: { parentId_studentId: { parentId: parent.id, studentId: student.id } },
        create: { parentId: parent.id, studentId: student.id, relation: parsed.parentRelationship },
        update: { relation: parsed.parentRelationship }
      });
    });

    revalidatePath("/students");
    return { ok: true, message: "Student added and assigned to class." };
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
    const classGroup = await getClassGroup(instituteId, parsed.classGroupId);

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
        address: parsed.parentAddress,
        appLogin: parsed.parentPhone,
        emergencyContactNumber: parsed.emergencyContactNumber ?? parsed.parentPhone
      });
      const admissionNo = parsed.admissionNo ?? existing.admissionNo;
      const { firstName, lastName } = splitFullName(parsed.fullName);

      await tx.student.update({
        where: { id },
        data: {
          ...studentData(parsed, instituteId, admissionNo, classGroup.branchId),
          parents: {
            connect: { id: parent.id }
          }
        }
      });

      if (existing.userId) {
        await tx.user.update({
          where: { id: existing.userId },
          data: {
            name: `${firstName} ${lastName}`.trim(),
            image: parsed.avatarUrl ?? null,
            branchId: classGroup.branchId,
            accountStatus: parsed.status === "PENDING_APPROVAL" ? "PENDING_APPROVAL" : parsed.status === "REJECTED" ? "REJECTED" : "ACTIVE"
          }
        });
      }

      await tx.parentStudent.upsert({
        where: { parentId_studentId: { parentId: parent.id, studentId: id } },
        create: { parentId: parent.id, studentId: id, relation: parsed.parentRelationship },
        update: { relation: parsed.parentRelationship }
      });

      await tx.enrollment.upsert({
        where: { studentId_classGroupId: { studentId: id, classGroupId: classGroup.id } },
        create: {
          studentId: id,
          classGroupId: classGroup.id,
          active: true,
          status: "ACTIVE",
          paymentStartDate: classGroup.paymentStartDate ?? new Date(),
          freePeriodType: classGroup.defaultFreePeriodType,
          freeDays: classGroup.defaultFreeDays
        },
        update: { active: true, status: "ACTIVE" }
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
