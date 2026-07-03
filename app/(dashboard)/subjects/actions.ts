"use server";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { actionError, getTenantContext, type ActionState } from "@/lib/session";
import { subjectSchema, type SubjectInput } from "@/lib/validations";

export async function saveSubject(id: string | null, input: SubjectInput): Promise<ActionState> {
  try {
    const { instituteId } = await getTenantContext();
    const data = subjectSchema.parse(input);
    if (id) {
      const found = await prisma.subject.findFirst({ where: { id, instituteId }, select: { id: true } });
      if (!found) return { ok: false, message: "Subject was not found." };
      await prisma.subject.update({ where: { id }, data });
    } else {
      await prisma.subject.create({ data: { ...data, instituteId } });
    }
    revalidatePath("/subjects"); revalidatePath("/classes"); revalidatePath("/courses");
    return { ok: true, message: id ? "Subject updated." : "Subject added." };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return { ok: false, message: "This subject already exists." };
    return actionError(error, "Could not save subject.");
  }
}
export async function setSubjectActive(id: string, isActive: boolean): Promise<ActionState> {
  try {
    const { instituteId } = await getTenantContext();
    const result = await prisma.subject.updateMany({ where: { id, instituteId }, data: { isActive } });
    if (!result.count) return { ok: false, message: "Subject was not found." };
    revalidatePath("/subjects"); revalidatePath("/classes"); revalidatePath("/courses");
    return { ok: true, message: isActive ? "Subject enabled." : "Subject disabled." };
  } catch (error) { return actionError(error, "Could not update subject."); }
}
