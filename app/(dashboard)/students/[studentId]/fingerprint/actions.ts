"use server";

import { revalidatePath } from "next/cache";
import { actionError, type ActionState, getTenantContext } from "@/lib/session";
import { prisma } from "@/lib/prisma";

async function assertStudent(studentId: string) {
  const { instituteId, userId, role } = await getTenantContext();
  if (!["SUPER_ADMIN", "INSTITUTE_ADMIN", "BRANCH_ADMIN", "TEACHER", "STAFF"].includes(role)) {
    throw new Error("You do not have permission to manage fingerprint credentials.");
  }
  const student = await prisma.student.findFirst({ where: { id: studentId, instituteId }, select: { id: true } });
  if (!student) throw new Error("Student was not found.");
  return { instituteId, userId };
}

export async function saveFingerprintCredential(studentId: string, formData: FormData): Promise<ActionState> {
  try {
    const { instituteId, userId } = await assertStudent(studentId);
    const externalFingerprintId = String(formData.get("externalFingerprintId") ?? "").trim();
    const deviceUserId = String(formData.get("deviceUserId") ?? "").trim() || null;
    if (!externalFingerprintId) return { ok: false, message: "Fingerprint user ID is required." };

    await prisma.studentFingerprintCredential.upsert({
      where: { instituteId_externalFingerprintId: { instituteId, externalFingerprintId } },
      create: {
        instituteId,
        studentId,
        externalFingerprintId,
        deviceUserId,
        enrolledById: userId
      },
      update: {
        studentId,
        deviceUserId,
        status: "ACTIVE",
        deletedAt: null
      }
    });

    revalidatePath(`/students/${studentId}/fingerprint`);
    revalidatePath(`/students/${studentId}`);
    return { ok: true, message: "Fingerprint credential saved." };
  } catch (error) {
    return actionError(error, "Could not save fingerprint credential.");
  }
}

export async function suspendFingerprintCredential(credentialId: string, studentId: string): Promise<ActionState> {
  try {
    const { instituteId } = await assertStudent(studentId);
    await prisma.studentFingerprintCredential.update({
      where: { id: credentialId, instituteId },
      data: { status: "SUSPENDED" }
    });
    revalidatePath(`/students/${studentId}/fingerprint`);
    return { ok: true, message: "Fingerprint credential suspended." };
  } catch (error) {
    return actionError(error, "Could not suspend fingerprint credential.");
  }
}

export async function deleteFingerprintCredential(credentialId: string, studentId: string): Promise<ActionState> {
  try {
    const { instituteId } = await assertStudent(studentId);
    await prisma.studentFingerprintCredential.update({
      where: { id: credentialId, instituteId },
      data: { status: "DELETED", deletedAt: new Date() }
    });
    revalidatePath(`/students/${studentId}/fingerprint`);
    return { ok: true, message: "Fingerprint credential deleted." };
  } catch (error) {
    return actionError(error, "Could not delete fingerprint credential.");
  }
}
