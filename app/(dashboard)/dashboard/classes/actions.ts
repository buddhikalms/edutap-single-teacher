"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { actionError, type ActionState } from "@/lib/session";
import { resolveAssignableTeacherId } from "@/lib/teacher-tenancy";
import { classGroupSchema, type ClassGroupInput } from "@/lib/validations";

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

function dataFor(input: ClassGroupInput, teacherId: string | null) {
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

const classTypeOptionsSchema = z
  .array(z.string().trim().min(1).max(60))
  .min(1, "Add at least one class type.")
  .max(20, "Keep class types to 20 or fewer.")
  .transform((values) => Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))));

function cleanClassTypeOptions(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];
}

async function classTypeOptionsForTeacher(instituteId: string, teacherId: string | null) {
  const [teacher, settings] = await Promise.all([
    teacherId ? prisma.teacher.findFirst({ where: { id: teacherId, instituteId }, select: { classTypeOptions: true } }) : null,
    prisma.instituteSettings.findUnique({ where: { instituteId }, select: { classTypeOptions: true } })
  ]);

  const teacherOptions = cleanClassTypeOptions(teacher?.classTypeOptions);
  if (teacherOptions.length) return teacherOptions;

  const instituteOptions = cleanClassTypeOptions(settings?.classTypeOptions);
  return instituteOptions.length ? instituteOptions : ["Individual", "Group", "Spoken"];
}

async function assertTeacherClassType(instituteId: string, teacherId: string | null, classType: string) {
  if (!teacherId) return;
  const options = await classTypeOptionsForTeacher(instituteId, teacherId);
  if (!options.includes(classType)) {
    throw new Error("Select a valid class type for this teacher.");
  }
}

export async function createClassGroup(input: ClassGroupInput): Promise<ActionState> {
  try {
    const { instituteId, teacherId } = await resolveAssignableTeacherId(input.teacherId, "canCreateClasses");
    const parsed = classGroupSchema.parse(input);
    await assertRelations(instituteId, parsed);
    await assertTeacherClassType(instituteId, teacherId, parsed.classType);
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
    const { instituteId, role, teacherId } = await resolveAssignableTeacherId(input.teacherId, "canEditClasses");
    const parsed = classGroupSchema.parse(input);
    await assertRelations(instituteId, parsed);
    await assertTeacherClassType(instituteId, teacherId, parsed.classType);
    const existing = await prisma.classGroup.findFirst({ where: { id, instituteId, ...(role === "TEACHER" ? { teacherId } : {}) }, select: { id: true } });
    if (!existing) return { ok: false, message: "Class was not found." };
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
    const { instituteId, role, teacherId } = await resolveAssignableTeacherId(null, "canEditClasses");
    const existing = await prisma.classGroup.findFirst({ where: { id, instituteId, ...(role === "TEACHER" ? { teacherId } : {}) }, select: { id: true } });
    if (!existing) return { ok: false, message: "Class was not found." };
    await prisma.classGroup.delete({ where: { id } });
    revalidatePath("/dashboard/classes");
    return { ok: true, message: "Class removed." };
  } catch (error) {
    return actionError(error, "Could not remove class.");
  }
}

export async function saveClassTypeOptions(input: string[], inputTeacherId?: string | null): Promise<ActionState> {
  try {
    const { teacherId } = await resolveAssignableTeacherId(inputTeacherId, "canEditClasses");
    const options = classTypeOptionsSchema.parse(input);

    if (!teacherId) {
      return { ok: false, message: "Select a teacher before saving class types." };
    }

    await prisma.teacher.update({
      where: { id: teacherId },
      data: { classTypeOptions: options }
    });

    revalidatePath("/dashboard/classes");
    revalidatePath("/teachers");
    revalidatePath(`/teachers/${teacherId}`);
    return { ok: true, message: "Class types updated." };
  } catch (error) {
    return actionError(error, "Could not update class types.");
  }
}
