"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { actionError, getTenantContext, type ActionState } from "@/lib/session";
import { gradeSchema, type GradeInput } from "@/lib/validations";

function duplicateMessage(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return "A grade with this name already exists.";
  }

  return null;
}

export async function createGrade(input: GradeInput): Promise<ActionState> {
  try {
    const { instituteId } = await getTenantContext();
    const parsed = gradeSchema.parse(input);

    await prisma.grade.create({
      data: {
        instituteId,
        name: parsed.name,
        order: parsed.order,
        isActive: parsed.isActive
      }
    });

    revalidatePath("/grades");
    revalidatePath("/classes");
    return { ok: true, message: "Grade added successfully." };
  } catch (error) {
    const duplicate = duplicateMessage(error);
    if (duplicate) return { ok: false, message: duplicate };
    return actionError(error, "Could not add grade.");
  }
}

export async function updateGrade(id: string, input: GradeInput): Promise<ActionState> {
  try {
    const { instituteId } = await getTenantContext();
    const parsed = gradeSchema.parse(input);
    const grade = await prisma.grade.findFirst({ where: { id, instituteId }, select: { id: true } });

    if (!grade) {
      return { ok: false, message: "Grade was not found." };
    }

    await prisma.grade.update({
      where: { id },
      data: {
        name: parsed.name,
        order: parsed.order,
        isActive: parsed.isActive
      }
    });

    revalidatePath("/grades");
    revalidatePath("/classes");
    return { ok: true, message: "Grade updated successfully." };
  } catch (error) {
    const duplicate = duplicateMessage(error);
    if (duplicate) return { ok: false, message: duplicate };
    return actionError(error, "Could not update grade.");
  }
}

export async function setGradeActive(id: string, isActive: boolean): Promise<ActionState> {
  try {
    const { instituteId } = await getTenantContext();
    const grade = await prisma.grade.findFirst({ where: { id, instituteId }, select: { id: true } });

    if (!grade) {
      return { ok: false, message: "Grade was not found." };
    }

    await prisma.grade.update({ where: { id }, data: { isActive } });
    revalidatePath("/grades");
    revalidatePath("/classes");
    return { ok: true, message: isActive ? "Grade enabled." : "Grade disabled." };
  } catch (error) {
    return actionError(error, "Could not update grade status.");
  }
}
