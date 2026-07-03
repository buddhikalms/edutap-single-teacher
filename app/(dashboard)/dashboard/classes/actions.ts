"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { actionError, getTenantContext, type ActionState } from "@/lib/session";
import { classGroupSchema, type ClassGroupInput } from "@/lib/validations";
import { requireOwnerTeacherId } from "@/lib/single-teacher";

function duplicateMessage(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002"
    ? "A class with this code already exists."
    : null;
}

async function assertRelations(instituteId: string, input: ClassGroupInput) {
  const [branch, grade, subject] = await Promise.all([
    prisma.branch.findFirst({ where: { id: input.branchId, instituteId, isActive: true }, select: { id: true } }),
    prisma.grade.findFirst({ where: { id: input.gradeId, instituteId, isActive: true }, select: { id: true } }),
    prisma.subject.findFirst({ where: { id: input.subjectId, instituteId, isActive: true }, select: { id: true } })
  ]);
  if (!branch || !grade || !subject) throw new Error("Select a valid grade, subject, and teaching location.");
}

function dataFor(input: ClassGroupInput, teacherId: string) {
  return {
    name: input.name,
    code: input.code,
    schedule: input.schedule,
    room: input.room ?? null,
    capacity: input.capacity,
    branchId: input.branchId,
    gradeId: input.gradeId,
    subjectId: input.subjectId,
    teacherId,
    classType: input.classType,
    monthlyFee: input.fee,
    admissionFee: input.admissionFee ?? null,
    paymentStartDate: input.paymentStartDate ? new Date(input.paymentStartDate) : null,
    defaultFreePeriodType: input.defaultFreePeriodType,
    defaultFreeDays: input.defaultFreeDays,
    defaultPaymentDueDay: input.defaultPaymentDueDay,
    status: input.status
  };
}

export async function createClassGroup(input: ClassGroupInput): Promise<ActionState> {
  try {
    const { instituteId } = await getTenantContext();
    const parsed = classGroupSchema.parse(input);
    await assertRelations(instituteId, parsed);
    const teacherId = await requireOwnerTeacherId(instituteId);
    await prisma.classGroup.create({ data: { ...dataFor(parsed, teacherId), instituteId } });
    revalidatePath("/dashboard/classes");
    return { ok: true, message: "Class added successfully." };
  } catch (error) {
    const duplicate = duplicateMessage(error);
    return duplicate ? { ok: false, message: duplicate } : actionError(error, "Could not add class.");
  }
}

export async function updateClassGroup(id: string, input: ClassGroupInput): Promise<ActionState> {
  try {
    const { instituteId } = await getTenantContext();
    const parsed = classGroupSchema.parse(input);
    await assertRelations(instituteId, parsed);
    const existing = await prisma.classGroup.findFirst({ where: { id, instituteId }, select: { id: true } });
    if (!existing) return { ok: false, message: "Class was not found." };
    const teacherId = await requireOwnerTeacherId(instituteId);
    await prisma.classGroup.update({ where: { id }, data: dataFor(parsed, teacherId) });
    revalidatePath("/dashboard/classes");
    revalidatePath(`/dashboard/classes/${id}`);
    return { ok: true, message: "Class updated successfully." };
  } catch (error) {
    const duplicate = duplicateMessage(error);
    return duplicate ? { ok: false, message: duplicate } : actionError(error, "Could not update class.");
  }
}

export async function deleteClassGroup(id: string): Promise<ActionState> {
  try {
    const { instituteId } = await getTenantContext();
    const existing = await prisma.classGroup.findFirst({ where: { id, instituteId }, select: { id: true } });
    if (!existing) return { ok: false, message: "Class was not found." };
    await prisma.classGroup.delete({ where: { id } });
    revalidatePath("/dashboard/classes");
    return { ok: true, message: "Class removed." };
  } catch (error) {
    return actionError(error, "Could not remove class.");
  }
}
