"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { actionError, getTenantContext, type ActionState } from "@/lib/session";
import { branchSchema, type BranchInput } from "@/lib/validations";

function duplicateMessage(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return "A branch with this code already exists.";
  }

  return null;
}

export async function createBranch(input: BranchInput): Promise<ActionState> {
  try {
    const { instituteId } = await getTenantContext();
    const parsed = branchSchema.parse(input);

    await prisma.branch.create({
      data: {
        instituteId,
        name: parsed.name,
        code: parsed.code,
        location: parsed.location ?? null,
        address: parsed.address ?? null,
        phone: parsed.phone ?? null,
        isActive: parsed.isActive
      }
    });

    revalidatePath("/settings");
    revalidatePath("/classes");
    revalidatePath("/students");
    return { ok: true, message: "Branch added successfully." };
  } catch (error) {
    const duplicate = duplicateMessage(error);
    if (duplicate) return { ok: false, message: duplicate };
    return actionError(error, "Could not add branch.");
  }
}

export async function updateBranch(id: string, input: BranchInput): Promise<ActionState> {
  try {
    const { instituteId } = await getTenantContext();
    const parsed = branchSchema.parse(input);
    const branch = await prisma.branch.findFirst({ where: { id, instituteId }, select: { id: true } });

    if (!branch) {
      return { ok: false, message: "Branch was not found." };
    }

    await prisma.branch.update({
      where: { id },
      data: {
        name: parsed.name,
        code: parsed.code,
        location: parsed.location ?? null,
        address: parsed.address ?? null,
        phone: parsed.phone ?? null,
        isActive: parsed.isActive
      }
    });

    revalidatePath("/settings");
    revalidatePath("/classes");
    revalidatePath("/students");
    return { ok: true, message: "Branch updated successfully." };
  } catch (error) {
    const duplicate = duplicateMessage(error);
    if (duplicate) return { ok: false, message: duplicate };
    return actionError(error, "Could not update branch.");
  }
}

export async function setBranchActive(id: string, isActive: boolean): Promise<ActionState> {
  try {
    const { instituteId } = await getTenantContext();
    const branch = await prisma.branch.findFirst({ where: { id, instituteId }, select: { id: true } });

    if (!branch) {
      return { ok: false, message: "Branch was not found." };
    }

    await prisma.branch.update({ where: { id }, data: { isActive } });
    revalidatePath("/settings");
    revalidatePath("/classes");
    revalidatePath("/students");
    return { ok: true, message: isActive ? "Branch enabled." : "Branch disabled." };
  } catch (error) {
    return actionError(error, "Could not update branch status.");
  }
}
