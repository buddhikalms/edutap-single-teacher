import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { encryptEmbedding } from "@/lib/biometric-encryption";
import { enrolFaceTemplate } from "@/lib/face-recognition-client";
import { faceErrorMessage } from "@/lib/face-error-messages";
import { requireFaceStudent, studentFaceAuthResponse } from "@/lib/student-face-auth";

const schema = z.object({
  frames: z.array(z.string().startsWith("data:image/")).min(5).max(10)
});

export async function POST(request: Request) {
  try {
    const { studentId, instituteId, student } = await requireFaceStudent(request);
    const body = schema.parse(await request.json());
    const [settings, consent] = await Promise.all([
      prisma.instituteSettings.findUnique({ where: { instituteId } }),
      prisma.biometricConsent.findFirst({ where: { studentId, consentType: "FACE_ATTENDANCE" }, orderBy: { createdAt: "desc" } })
    ]);
    if (!settings?.faceAttendanceEnabled || !settings.faceAllowStudentSelfEnrollment) {
      return NextResponse.json({ ok: false, code: "CONSENT_REQUIRED", message: "Face self-enrolment is not enabled." }, { status: 403 });
    }
    if (!consent?.consented || consent.revokedAt) {
      return NextResponse.json({ ok: false, code: "CONSENT_REQUIRED", message: "Consent is required before enrolment." }, { status: 403 });
    }

    const serviceResult = await enrolFaceTemplate(body.frames);
    if (!serviceResult.success || !serviceResult.embedding) {
      const code = serviceResult.reasonCode ?? "QUALITY_FAILED";
      return NextResponse.json(
        { ok: false, code, message: serviceResult.message ?? faceErrorMessage(code) },
        { status: 422 }
      );
    }

    const encrypted = encryptEmbedding(serviceResult.embedding);
    await prisma.studentFaceProfile.upsert({
      where: { studentId },
      create: {
        studentId,
        status: "ACTIVE",
        ...encrypted,
        recognitionModel: serviceResult.model ?? settings.faceRecognitionModel,
        modelVersion: serviceResult.modelVersion ?? settings.faceRecognitionModelVersion,
        sampleCount: body.frames.length,
        qualityScore: serviceResult.qualityScore,
        enrolledById: student.userId
      },
      update: {
        status: "ACTIVE",
        ...encrypted,
        recognitionModel: serviceResult.model ?? settings.faceRecognitionModel,
        modelVersion: serviceResult.modelVersion ?? settings.faceRecognitionModelVersion,
        sampleCount: body.frames.length,
        qualityScore: serviceResult.qualityScore,
        enrolledById: student.userId,
        enrolledAt: new Date(),
        revokedAt: null,
        deletedAt: null
      }
    });

    return NextResponse.json({ ok: true, message: "Face profile enrolled successfully." });
  } catch (error) {
    const auth = studentFaceAuthResponse(error);
    if (auth) return auth;
    if (error instanceof z.ZodError) return NextResponse.json({ ok: false, message: "Invalid enrolment samples." }, { status: 400 });
    console.error(error);
    return NextResponse.json({ ok: false, code: "RECOGNITION_SERVICE_UNAVAILABLE", message: "Could not complete face enrolment." }, { status: 500 });
  }
}
