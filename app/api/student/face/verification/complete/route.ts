import { NextResponse } from "next/server";
import { FaceVerificationResult } from "@prisma/client";
import { z } from "zod";
import { decryptEmbedding } from "@/lib/biometric-encryption";
import { verifyFaceTemplate } from "@/lib/face-recognition-client";
import { auditFace, FaceAttendanceError, validateFaceVerificationCompletion } from "@/lib/face-attendance";
import { faceErrorMessage } from "@/lib/face-error-messages";
import { prisma } from "@/lib/prisma";
import { createVerificationToken } from "@/lib/verification-token";
import { requireFaceStudent, studentFaceAuthResponse } from "@/lib/student-face-auth";

const schema = z.object({
  attendanceSessionId: z.string().min(1),
  attemptId: z.string().min(1),
  deviceId: z.string().max(120).optional(),
  challengeActions: z.array(z.string()).min(2).max(3),
  frames: z.array(z.string().startsWith("data:image/")).min(3).max(12)
});

function resultFromScores(input: {
  success: boolean;
  reasonCode?: string | null;
  livenessPassed?: boolean | null;
  livenessScore?: number | null;
  matchPassed?: boolean | null;
  similarityScore?: number | null;
  manualReview: number;
}) {
  if (!input.success) return FaceVerificationResult.ERROR;
  if (!input.livenessPassed) return FaceVerificationResult.LIVENESS_FAILED;
  if (input.matchPassed) return FaceVerificationResult.VERIFIED;
  if ((input.similarityScore ?? 0) >= input.manualReview) return FaceVerificationResult.UNCERTAIN;
  return input.reasonCode === "QUALITY_FAILED" ? FaceVerificationResult.QUALITY_FAILED : FaceVerificationResult.REJECTED;
}

export async function POST(request: Request) {
  try {
    const { studentId } = await requireFaceStudent(request);
    const body = schema.parse(await request.json());
    const { session, settings, profile } = await validateFaceVerificationCompletion({
      studentId,
      attendanceSessionId: body.attendanceSessionId,
      attemptId: body.attemptId
    });

    if (!profile.encryptedEmbedding || !profile.embeddingIv || !profile.embeddingAuthTag) {
      throw new FaceAttendanceError("FACE_PROFILE_NOT_FOUND", 404);
    }

    const registeredEmbedding = decryptEmbedding({
      encryptedEmbedding: Buffer.from(profile.encryptedEmbedding),
      embeddingIv: Buffer.from(profile.embeddingIv),
      embeddingAuthTag: Buffer.from(profile.embeddingAuthTag)
    });
    const serviceResult = await verifyFaceTemplate({
      frames: body.frames,
      registeredEmbedding,
      challengeActions: body.challengeActions,
      thresholds: {
        match: settings.faceMatchThreshold,
        manualReview: settings.faceManualReviewThreshold,
        liveness: settings.faceLivenessThreshold
      }
    });

    const result = resultFromScores({
      success: serviceResult.success,
      reasonCode: serviceResult.reasonCode,
      livenessPassed: serviceResult.livenessPassed,
      livenessScore: serviceResult.livenessScore,
      matchPassed: serviceResult.matchPassed,
      similarityScore: serviceResult.similarityScore,
      manualReview: settings.faceManualReviewThreshold
    });
    const failureCode =
      result === FaceVerificationResult.VERIFIED ? null : result === FaceVerificationResult.UNCERTAIN ? "FACE_MATCH_UNCERTAIN" : serviceResult.reasonCode ?? "FACE_NOT_MATCHED";

    const attempt = await prisma.faceVerificationAttempt.update({
      where: { id: body.attemptId },
      data: {
        result,
        faceSimilarity: serviceResult.similarityScore ?? null,
        livenessScore: serviceResult.livenessScore ?? null,
        qualityScore: serviceResult.qualityScore ?? null,
        recognitionModel: serviceResult.model ?? settings.faceRecognitionModel,
        modelVersion: serviceResult.modelVersion ?? settings.faceRecognitionModelVersion,
        thresholdUsed: settings.faceMatchThreshold,
        failureCode,
        failureMessage: failureCode ? faceErrorMessage(failureCode) : null,
        completedAt: new Date()
      }
    });

    await auditFace({
      instituteId: session.classGroup.instituteId,
      sessionId: session.id,
      studentId,
      success: result === FaceVerificationResult.VERIFIED,
      message: result === FaceVerificationResult.VERIFIED ? "Face verification completed." : faceErrorMessage(failureCode),
      metadata: {
        attemptId: attempt.id,
        result,
        reasonCode: failureCode,
        model: serviceResult.model ?? null,
        modelVersion: serviceResult.modelVersion ?? null
      }
    });

    if (result !== FaceVerificationResult.VERIFIED) {
      return NextResponse.json({
        ok: false,
        result,
        code: failureCode,
        message: faceErrorMessage(failureCode),
        manualReview: result === FaceVerificationResult.UNCERTAIN
      }, { status: result === FaceVerificationResult.UNCERTAIN ? 202 : 422 });
    }

    const token = await createVerificationToken({
      studentId,
      attendanceSessionId: session.id,
      attemptId: attempt.id,
      deviceId: body.deviceId,
      result,
      ttlSeconds: settings.faceVerificationTokenTtlSeconds
    });

    return NextResponse.json({
      ok: true,
      result,
      verificationToken: token,
      expiresInSeconds: settings.faceVerificationTokenTtlSeconds,
      similarityScore: serviceResult.similarityScore
    });
  } catch (error) {
    const auth = studentFaceAuthResponse(error);
    if (auth) return auth;
    if (error instanceof z.ZodError) return NextResponse.json({ ok: false, message: "Invalid verification payload." }, { status: 400 });
    if (error instanceof FaceAttendanceError) return NextResponse.json({ ok: false, code: error.code, message: error.message }, { status: error.statusCode });
    console.error(error);
    return NextResponse.json({ ok: false, code: "RECOGNITION_SERVICE_UNAVAILABLE", message: "Could not complete verification." }, { status: 500 });
  }
}
