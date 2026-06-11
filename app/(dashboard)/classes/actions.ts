"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { actionError, getTenantContext, type ActionState } from "@/lib/session";
import { classGroupSchema, courseSchema, type ClassGroupInput, type CourseInput } from "@/lib/validations";

function duplicateMessage(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return "A code with this value already exists in this institute.";
  }

  return null;
}

async function assertClassRelations(instituteId: string, input: ClassGroupInput) {
  const [branch, course, teacher] = await Promise.all([
    prisma.branch.findFirst({ where: { id: input.branchId, instituteId }, select: { id: true } }),
    prisma.course.findFirst({ where: { id: input.courseId, instituteId }, select: { id: true } }),
    input.teacherId ? prisma.teacher.findFirst({ where: { id: input.teacherId, instituteId }, select: { id: true } }) : null
  ]);

  if (!branch || !course || (input.teacherId && !teacher)) {
    throw new Error("Invalid class relationship.");
  }
}

export async function createCourse(input: CourseInput): Promise<ActionState> {
  try {
    const { instituteId } = await getTenantContext();
    const parsed = courseSchema.parse(input);

    await prisma.course.create({
      data: {
        name: parsed.name,
        code: parsed.code,
        subject: parsed.subject ?? null,
        grade: parsed.grade ?? null,
        description: parsed.description ?? null,
        fee: parsed.fee,
        instituteId
      }
    });

    revalidatePath("/classes");
    return { ok: true, message: "Course added successfully." };
  } catch (error) {
    const duplicate = duplicateMessage(error);
    if (duplicate) {
      return { ok: false, message: duplicate };
    }

    return actionError(error, "Could not add course.");
  }
}

export async function updateCourse(id: string, input: CourseInput): Promise<ActionState> {
  try {
    const { instituteId } = await getTenantContext();
    const parsed = courseSchema.parse(input);
    const course = await prisma.course.findFirst({ where: { id, instituteId }, select: { id: true } });

    if (!course) {
      return { ok: false, message: "Course was not found." };
    }

    await prisma.course.update({
      where: { id },
      data: {
        name: parsed.name,
        code: parsed.code,
        subject: parsed.subject ?? null,
        grade: parsed.grade ?? null,
        description: parsed.description ?? null,
        fee: parsed.fee
      }
    });

    revalidatePath("/classes");
    return { ok: true, message: "Course updated successfully." };
  } catch (error) {
    const duplicate = duplicateMessage(error);
    if (duplicate) {
      return { ok: false, message: duplicate };
    }

    return actionError(error, "Could not update course.");
  }
}

export async function createClassGroup(input: ClassGroupInput): Promise<ActionState> {
  try {
    const { instituteId } = await getTenantContext();
    const parsed = classGroupSchema.parse(input);
    await assertClassRelations(instituteId, parsed);

    await prisma.classGroup.create({
      data: {
        name: parsed.name,
        code: parsed.code,
        schedule: parsed.schedule,
        room: parsed.room ?? null,
        capacity: parsed.capacity,
        branchId: parsed.branchId,
        courseId: parsed.courseId,
        teacherId: parsed.teacherId ?? null,
        instituteId
      }
    });

    revalidatePath("/classes");
    revalidatePath("/teachers");
    return { ok: true, message: "Class added successfully." };
  } catch (error) {
    const duplicate = duplicateMessage(error);
    if (duplicate) {
      return { ok: false, message: duplicate };
    }

    return actionError(error, "Could not add class.");
  }
}

export async function updateClassGroup(id: string, input: ClassGroupInput): Promise<ActionState> {
  try {
    const { instituteId } = await getTenantContext();
    const parsed = classGroupSchema.parse(input);
    await assertClassRelations(instituteId, parsed);

    const classGroup = await prisma.classGroup.findFirst({ where: { id, instituteId }, select: { id: true } });

    if (!classGroup) {
      return { ok: false, message: "Class was not found." };
    }

    await prisma.classGroup.update({
      where: { id },
      data: {
        name: parsed.name,
        code: parsed.code,
        schedule: parsed.schedule,
        room: parsed.room ?? null,
        capacity: parsed.capacity,
        branchId: parsed.branchId,
        courseId: parsed.courseId,
        teacherId: parsed.teacherId ?? null
      }
    });

    revalidatePath("/classes");
    revalidatePath(`/classes/${id}`);
    revalidatePath("/teachers");
    return { ok: true, message: "Class updated successfully." };
  } catch (error) {
    const duplicate = duplicateMessage(error);
    if (duplicate) {
      return { ok: false, message: duplicate };
    }

    return actionError(error, "Could not update class.");
  }
}

export async function deleteClassGroup(id: string): Promise<ActionState> {
  try {
    const { instituteId } = await getTenantContext();
    const classGroup = await prisma.classGroup.findFirst({ where: { id, instituteId }, select: { id: true } });

    if (!classGroup) {
      return { ok: false, message: "Class was not found." };
    }

    await prisma.classGroup.delete({ where: { id } });
    revalidatePath("/classes");
    return { ok: true, message: "Class removed." };
  } catch (error) {
    return actionError(error, "Could not remove class.");
  }
}
