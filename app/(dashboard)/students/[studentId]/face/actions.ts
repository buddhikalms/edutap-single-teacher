"use server";

import { revalidatePath } from "next/cache";
import { FaceProfileStatus } from "@prisma/client";
import { actionError, type ActionState, getTenantContext } from "@/lib/session";
import { prisma } from "@/lib/prisma";

async function assertStudentAccess(studentId: string) {
  const { instituteId, userId, role } = await getTenantContext();
  if (!["SUPER_ADMIN", "INSTITUTE_ADMIN", "BRANCH_ADMIN", "TEACHER", "STAFF"].includes(role)) {
    throw new Error("You do not have permission to manage student face profiles.");
  }

  const student = await prisma.student.findFirst({
    where: { id: studentId, instituteId },
    select: { id: true, firstName: true, lastName: true }
  });
  if (!student) throw new Error("Student was not found.");
  return { student, instituteId, userId };
}

export async function updateStudentFaceProfileStatus(studentId: string, status: FaceProfileStatus): Promise<ActionState> {
  try {
    const { userId } = await assertStudentAccess(studentId);
    const profile = await prisma.studentFaceProfile.findUnique({ where: { studentId }, select: { id: true } });
    if (!profile) return { ok: false, message: "This student has not enrolled a face profile yet." };

    await prisma.studentFaceProfile.update({
      where: { studentId },
      data: {
        status,
        revokedAt: status === "REVOKED" ? new Date() : undefined,
        deletionRequestedById: status === "DELETED" ? userId : undefined,
        deletionRequestedAt: status === "DELETED" ? new Date() : undefined,
        deletedAt: status === "DELETED" ? new Date() : undefined,
        encryptedEmbedding: status === "DELETED" ? null : undefined,
        embeddingIv: status === "DELETED" ? null : undefined,
        embeddingAuthTag: status === "DELETED" ? null : undefined
      }
    });

    revalidatePath(`/students/${studentId}`);
    revalidatePath(`/students/${studentId}/face`);
    return { ok: true, message: `Face profile updated to ${status.toLowerCase()}.` };
  } catch (error) {
    return actionError(error, "Could not update face profile.");
  }
}

export async function revokeStudentBiometricConsent(studentId: string): Promise<ActionState> {
  try {
    const { userId } = await assertStudentAccess(studentId);
    await prisma.biometricConsent.create({
      data: {
        studentId,
        consentType: "FACE_ATTENDANCE",
        consented: false,
        consentedById: userId,
        policyVersion: "2026-07-face-attendance-v1",
        revokedAt: new Date()
      }
    });
    await prisma.studentFaceProfile.updateMany({
      where: { studentId, status: { notIn: ["DELETED", "REVOKED"] } },
      data: { status: "REVOKED", revokedAt: new Date() }
    });

    revalidatePath(`/students/${studentId}/face`);
    return { ok: true, message: "Face consent was revoked and face attendance disabled for this student." };
  } catch (error) {
    return actionError(error, "Could not revoke biometric consent.");
  }
}
