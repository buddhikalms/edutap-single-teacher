"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { actionError, getTenantContext, type ActionState } from "@/lib/session";
import { teacherSchema, type TeacherInput } from "@/lib/validations";

async function assertTeacherRelations(instituteId: string, input: TeacherInput) {
  const branch = await prisma.branch.findFirst({
    where: { id: input.branchId, instituteId },
    select: { id: true }
  });

  if (!branch) {
    throw new Error("Invalid branch.");
  }

  if (input.classGroupIds.length) {
    const count = await prisma.classGroup.count({
      where: { id: { in: input.classGroupIds }, instituteId }
    });

    if (count !== input.classGroupIds.length) {
      throw new Error("Invalid class assignment.");
    }
  }
}

function duplicateMessage(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return "A teacher with this email already exists in this institute.";
  }

  return null;
}

export async function createTeacher(input: TeacherInput): Promise<ActionState> {
  try {
    const { instituteId } = await getTenantContext();
    const parsed = teacherSchema.parse(input);
    await assertTeacherRelations(instituteId, parsed);

    const teacher = await prisma.teacher.create({
      data: {
        name: parsed.name,
        email: parsed.email.toLowerCase(),
        phone: parsed.phone ?? null,
        specialty: parsed.specialty ?? null,
        instituteId,
        branchId: parsed.branchId
      }
    });

    if (parsed.classGroupIds.length) {
      await prisma.classGroup.updateMany({
        where: { id: { in: parsed.classGroupIds }, instituteId },
        data: { teacherId: teacher.id }
      });
    }

    revalidatePath("/teachers");
    revalidatePath("/classes");
    return { ok: true, message: "Teacher added successfully." };
  } catch (error) {
    const duplicate = duplicateMessage(error);
    if (duplicate) {
      return { ok: false, message: duplicate };
    }

    return actionError(error, "Could not add teacher.");
  }
}

export async function updateTeacher(id: string, input: TeacherInput): Promise<ActionState> {
  try {
    const { instituteId } = await getTenantContext();
    const parsed = teacherSchema.parse(input);
    await assertTeacherRelations(instituteId, parsed);

    const teacher = await prisma.teacher.findFirst({
      where: { id, instituteId },
      select: { id: true }
    });

    if (!teacher) {
      return { ok: false, message: "Teacher was not found." };
    }

    await prisma.$transaction(async (tx) => {
      await tx.teacher.update({
        where: { id },
        data: {
          name: parsed.name,
          email: parsed.email.toLowerCase(),
          phone: parsed.phone ?? null,
          specialty: parsed.specialty ?? null,
          branchId: parsed.branchId
        }
      });

      await tx.classGroup.updateMany({
        where: { instituteId, teacherId: id, id: { notIn: parsed.classGroupIds } },
        data: { teacherId: null }
      });

      if (parsed.classGroupIds.length) {
        await tx.classGroup.updateMany({
          where: { instituteId, id: { in: parsed.classGroupIds } },
          data: { teacherId: id }
        });
      }
    });

    revalidatePath("/teachers");
    revalidatePath(`/teachers/${id}`);
    revalidatePath("/classes");
    return { ok: true, message: "Teacher updated successfully." };
  } catch (error) {
    const duplicate = duplicateMessage(error);
    if (duplicate) {
      return { ok: false, message: duplicate };
    }

    return actionError(error, "Could not update teacher.");
  }
}

export async function deleteTeacher(id: string): Promise<ActionState> {
  try {
    const { instituteId } = await getTenantContext();
    const teacher = await prisma.teacher.findFirst({
      where: { id, instituteId },
      select: { id: true }
    });

    if (!teacher) {
      return { ok: false, message: "Teacher was not found." };
    }

    await prisma.teacher.delete({ where: { id } });
    revalidatePath("/teachers");
    revalidatePath("/classes");
    return { ok: true, message: "Teacher removed." };
  } catch (error) {
    return actionError(error, "Could not delete teacher.");
  }
}
