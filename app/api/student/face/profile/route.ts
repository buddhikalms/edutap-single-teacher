import { NextResponse } from "next/server";
import { requireFaceStudent, studentFaceAuthResponse } from "@/lib/student-face-auth";
import { prisma } from "@/lib/prisma";
import { hashSafe } from "@/lib/biometric-encryption";
import { clientIp } from "@/lib/rate-limit";

export async function GET(request: Request) {
  try {
    const { studentId, instituteId } = await requireFaceStudent(request);
    const [profile, consent, settings] = await Promise.all([
      prisma.studentFaceProfile.findUnique({ where: { studentId } }),
      prisma.biometricConsent.findFirst({ where: { studentId, consentType: "FACE_ATTENDANCE" }, orderBy: { createdAt: "desc" } }),
      prisma.instituteSettings.findUnique({ where: { instituteId } })
    ]);

    return NextResponse.json({
      ok: true,
      enabled: Boolean(settings?.faceAttendanceEnabled),
      selfEnrollmentAllowed: Boolean(settings?.faceAllowStudentSelfEnrollment),
      requireParentConsent: Boolean(settings?.faceRequireParentConsent),
      profile: profile
        ? {
            exists: profile.status !== "DELETED",
            status: profile.status,
            enrolledAt: profile.enrolledAt.toISOString(),
            lastVerifiedAt: profile.lastVerifiedAt?.toISOString() ?? null,
            model: profile.recognitionModel,
            modelVersion: profile.modelVersion
          }
        : null,
      consent: consent
        ? {
            consented: consent.consented,
            policyVersion: consent.policyVersion,
            consentedAt: consent.consentedAt?.toISOString() ?? null,
            revokedAt: consent.revokedAt?.toISOString() ?? null
          }
        : null,
      fallbackMethods: settings?.faceFallbackMethods ?? ["QR", "NFC", "MANUAL"]
    });
  } catch (error) {
    const auth = studentFaceAuthResponse(error);
    if (auth) return auth;
    console.error(error);
    return NextResponse.json({ ok: false, message: "Could not load face profile." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { studentId, student } = await requireFaceStudent(request);
    await prisma.$transaction(async (tx) => {
      await tx.studentFaceProfile.updateMany({
        where: { studentId, status: { not: "DELETED" } },
        data: {
          status: "DELETED",
          encryptedEmbedding: null,
          embeddingIv: null,
          embeddingAuthTag: null,
          deletedAt: new Date(),
          deletionRequestedAt: new Date(),
          deletionRequestedById: student.userId
        }
      });
      await tx.biometricConsent.create({
        data: {
          studentId,
          consentType: "FACE_ATTENDANCE",
          consented: false,
          consentedById: student.userId ?? studentId,
          policyVersion: "2026-07-face-attendance-v1",
          revokedAt: new Date(),
          ipHash: hashSafe(clientIp(request)),
          userAgent: request.headers.get("user-agent")
        }
      });
    });

    return NextResponse.json({ ok: true, message: "Face profile deletion has been recorded." });
  } catch (error) {
    const auth = studentFaceAuthResponse(error);
    if (auth) return auth;
    console.error(error);
    return NextResponse.json({ ok: false, message: "Could not delete face profile." }, { status: 500 });
  }
}
