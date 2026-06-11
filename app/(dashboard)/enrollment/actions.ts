"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { actionError, getTenantContext, type ActionState } from "@/lib/session";
import { bulkEnrollmentSchema, enrollmentSchema, type BulkEnrollmentInput, type EnrollmentInput } from "@/lib/validations";

async function assertStudentAndClass(instituteId: string, studentIds: string[], classGroupId: string) {
  const [students, classGroup] = await Promise.all([
    prisma.student.count({ where: { id: { in: studentIds }, instituteId } }),
    prisma.classGroup.findFirst({ where: { id: classGroupId, instituteId }, select: { id: true } })
  ]);

  if (students !== studentIds.length || !classGroup) {
    throw new Error("Invalid enrollment relationship.");
  }
}

export async function assignEnrollment(input: EnrollmentInput): Promise<ActionState> {
  try {
    const { instituteId } = await getTenantContext();
    const parsed = enrollmentSchema.parse(input);
    await assertStudentAndClass(instituteId, [parsed.studentId], parsed.classGroupId);

    await prisma.enrollment.upsert({
      where: {
        studentId_classGroupId: {
          studentId: parsed.studentId,
          classGroupId: parsed.classGroupId
        }
      },
      create: {
        studentId: parsed.studentId,
        classGroupId: parsed.classGroupId,
        active: parsed.active
      },
      update: {
        active: parsed.active
      }
    });

    revalidatePath("/enrollment");
    revalidatePath("/students");
    revalidatePath("/classes");
    return { ok: true, message: "Enrollment saved." };
  } catch (error) {
    return actionError(error, "Could not save enrollment.");
  }
}

export async function bulkAssignEnrollment(input: BulkEnrollmentInput): Promise<ActionState> {
  try {
    const { instituteId } = await getTenantContext();
    const parsed = bulkEnrollmentSchema.parse(input);
    await assertStudentAndClass(instituteId, parsed.studentIds, parsed.classGroupId);

    await prisma.$transaction(
      parsed.studentIds.map((studentId) =>
        prisma.enrollment.upsert({
          where: {
            studentId_classGroupId: {
              studentId,
              classGroupId: parsed.classGroupId
            }
          },
          create: {
            studentId,
            classGroupId: parsed.classGroupId,
            active: parsed.active
          },
          update: {
            active: parsed.active
          }
        })
      )
    );

    revalidatePath("/enrollment");
    revalidatePath("/students");
    revalidatePath("/classes");
    return { ok: true, message: "Bulk enrollment completed." };
  } catch (error) {
    return actionError(error, "Could not bulk assign students.");
  }
}

export async function setEnrollmentStatus(id: string, active: boolean): Promise<ActionState> {
  try {
    const { instituteId } = await getTenantContext();
    const enrollment = await prisma.enrollment.findFirst({
      where: { id, classGroup: { instituteId } },
      select: { id: true }
    });

    if (!enrollment) {
      return { ok: false, message: "Enrollment was not found." };
    }

    await prisma.enrollment.update({ where: { id }, data: { active } });
    revalidatePath("/enrollment");
    revalidatePath("/students");
    revalidatePath("/classes");
    return { ok: true, message: active ? "Enrollment activated." : "Enrollment marked inactive." };
  } catch (error) {
    return actionError(error, "Could not update enrollment.");
  }
}

export async function removeEnrollment(id: string): Promise<ActionState> {
  try {
    const { instituteId } = await getTenantContext();
    const enrollment = await prisma.enrollment.findFirst({
      where: { id, classGroup: { instituteId } },
      select: { id: true }
    });

    if (!enrollment) {
      return { ok: false, message: "Enrollment was not found." };
    }

    await prisma.enrollment.delete({ where: { id } });
    revalidatePath("/enrollment");
    revalidatePath("/students");
    revalidatePath("/classes");
    return { ok: true, message: "Student removed from class." };
  } catch (error) {
    return actionError(error, "Could not remove enrollment.");
  }
}
