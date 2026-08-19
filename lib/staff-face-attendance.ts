import { getServerSession } from "next-auth";
import crypto from "node:crypto";
import { AttendanceSource, FaceVerificationResult, Prisma, StudentStatus } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { decryptEmbedding, encryptEmbedding, hashSafe } from "@/lib/biometric-encryption";
import { identifyFaceTemplate, enrolFaceTemplate } from "@/lib/face-recognition-client";
import { clientIp } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { canAccess } from "@/lib/rbac";
import { statusFromTiming } from "@/lib/face-attendance";
import { faceErrorMessage } from "@/lib/face-error-messages";

export class StaffFaceError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode = 400
  ) {
    super(message);
  }
}

type StaffContext = {
  userId: string;
  role: string;
  instituteId: string;
  userName: string;
};

function cryptoRandomId() {
  return `rec_${crypto.randomBytes(16).toString("hex")}`;
}

export async function requireStaffFaceAccess(area: "attendance" | "students" = "attendance"): Promise<StaffContext> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.instituteId) {
    throw new StaffFaceError("UNAUTHENTICATED", "Sign in to continue.", 401);
  }

  if (!canAccess(session.user.role, area)) {
    throw new StaffFaceError("FORBIDDEN", "You do not have permission to use face attendance.", 403);
  }

  return {
    userId: session.user.id,
    role: session.user.role,
    instituteId: session.user.instituteId,
    userName: session.user.name ?? "EduTap User"
  };
}

export async function staffEnrollFaceProfile(input: {
  request: Request;
  studentId: string;
  frames: string[];
  policyVersion: string;
  deviceInfo?: string;
}) {
  const context = await requireStaffFaceAccess("students");
  const [student, settings] = await Promise.all([
    prisma.student.findFirst({
      where: { id: input.studentId, instituteId: context.instituteId },
      select: { id: true, status: true }
    }),
    prisma.instituteSettings.findUnique({ where: { instituteId: context.instituteId } })
  ]);

  if (!student) throw new StaffFaceError("STUDENT_NOT_FOUND", "Student was not found.", 404);
  if (student.status !== StudentStatus.ACTIVE) throw new StaffFaceError("STUDENT_INACTIVE", "Only active students can be enrolled.", 409);
  if (!settings?.faceAttendanceEnabled) throw new StaffFaceError("FACE_DISABLED", "Face attendance is disabled for this institute.", 409);

  const serviceResult = await enrolFaceTemplate(input.frames);
  if (!serviceResult.success || !serviceResult.embedding) {
    const code = serviceResult.reasonCode ?? "QUALITY_FAILED";
    throw new StaffFaceError(code, serviceResult.message ?? faceErrorMessage(code), 422);
  }

  const encrypted = encryptEmbedding(serviceResult.embedding);
  await prisma.$transaction(async (tx) => {
    await tx.biometricConsent.create({
      data: {
        studentId: student.id,
        consentType: "FACE_ATTENDANCE",
        consented: true,
        consentedById: context.userId,
        policyVersion: input.policyVersion,
        consentedAt: new Date(),
        ipHash: hashSafe(clientIp(input.request)),
        userAgent: input.request.headers.get("user-agent"),
        deviceInfo: input.deviceInfo
      }
    });

    await tx.studentFaceProfile.upsert({
      where: { studentId: student.id },
      create: {
        studentId: student.id,
        status: "ACTIVE",
        ...encrypted,
        recognitionModel: serviceResult.model ?? settings.faceRecognitionModel,
        modelVersion: serviceResult.modelVersion ?? settings.faceRecognitionModelVersion,
        sampleCount: input.frames.length,
        qualityScore: serviceResult.qualityScore,
        enrolledById: context.userId
      },
      update: {
        status: "ACTIVE",
        ...encrypted,
        recognitionModel: serviceResult.model ?? settings.faceRecognitionModel,
        modelVersion: serviceResult.modelVersion ?? settings.faceRecognitionModelVersion,
        sampleCount: input.frames.length,
        qualityScore: serviceResult.qualityScore,
        enrolledById: context.userId,
        enrolledAt: new Date(),
        revokedAt: null,
        deletedAt: null,
        deletionRequestedAt: null,
        deletionRequestedById: null
      }
    });

    await tx.securityAuditLog.create({
      data: {
        instituteId: context.instituteId,
        actorUserId: context.userId,
        actorRole: context.role,
        action: "FACE_PROFILE_ENROLLED",
        resourceType: "StudentFaceProfile",
        resourceId: student.id,
        success: true,
        message: "Student face profile enrolled by staff.",
        ipAddress: clientIp(input.request),
        userAgent: input.request.headers.get("user-agent"),
        metadata: {
          sampleCount: input.frames.length,
          qualityScore: serviceResult.qualityScore,
          model: serviceResult.model,
          modelVersion: serviceResult.modelVersion
        } as Prisma.InputJsonObject
      }
    });
  });

  return {
    ok: true,
    message: "Face profile enrolled successfully.",
    qualityScore: serviceResult.qualityScore,
    model: serviceResult.model,
    modelVersion: serviceResult.modelVersion
  };
}

export async function staffDeleteFaceProfile(input: { request: Request; studentId: string }) {
  const context = await requireStaffFaceAccess("students");
  const profile = await prisma.studentFaceProfile.findFirst({
    where: { studentId: input.studentId, student: { instituteId: context.instituteId } },
    select: { id: true, studentId: true }
  });
  if (!profile) throw new StaffFaceError("FACE_PROFILE_NOT_FOUND", "This student has no face profile.", 404);

  await prisma.$transaction([
    prisma.studentFaceProfile.update({
      where: { id: profile.id },
      data: {
        status: "DELETED",
        encryptedEmbedding: null,
        embeddingIv: null,
        embeddingAuthTag: null,
        deletedAt: new Date(),
        deletionRequestedAt: new Date(),
        deletionRequestedById: context.userId
      }
    }),
    prisma.biometricConsent.create({
      data: {
        studentId: profile.studentId,
        consentType: "FACE_ATTENDANCE",
        consented: false,
        consentedById: context.userId,
        policyVersion: "staff-delete",
        revokedAt: new Date(),
        ipHash: hashSafe(clientIp(input.request)),
        userAgent: input.request.headers.get("user-agent")
      }
    }),
    prisma.securityAuditLog.create({
      data: {
        instituteId: context.instituteId,
        actorUserId: context.userId,
        actorRole: context.role,
        action: "FACE_PROFILE_DELETED",
        resourceType: "StudentFaceProfile",
        resourceId: profile.studentId,
        success: true,
        message: "Student face profile deleted by staff.",
        ipAddress: clientIp(input.request),
        userAgent: input.request.headers.get("user-agent")
      }
    })
  ]);

  return { ok: true, message: "Face profile deleted permanently." };
}

export async function recognizeFaceForSession(input: {
  request: Request;
  attendanceSessionId: string;
  frames: string[];
  challengeActions: string[];
  deviceId?: string | null;
  deviceLabel?: string | null;
}) {
  const context = await requireStaffFaceAccess("attendance");
  const [session, settings] = await Promise.all([
    prisma.attendanceSession.findFirst({
      where: { id: input.attendanceSessionId, classGroup: { instituteId: context.instituteId } },
      include: {
        classGroup: {
          include: {
            enrollments: {
              where: { active: true, status: "ACTIVE", student: { status: "ACTIVE" } },
              include: {
                student: {
                  include: { faceProfile: true }
                }
              }
            }
          }
        },
        records: {
          select: { id: true, studentId: true, status: true, source: true, markedAt: true }
        }
      }
    }),
    prisma.instituteSettings.findUnique({ where: { instituteId: context.instituteId } })
  ]);

  if (!session) throw new StaffFaceError("SESSION_NOT_FOUND", "Attendance session was not found.", 404);
  if (session.status !== "ACTIVE") throw new StaffFaceError("SESSION_NOT_ACTIVE", "Start an active attendance session first.", 409);
  if (!settings?.faceAttendanceEnabled) throw new StaffFaceError("FACE_DISABLED", "Face attendance is disabled for this institute.", 409);

  if (input.deviceId) {
    await prisma.$executeRaw`
      INSERT INTO RecognitionDevice (id, instituteId, deviceId, label, lastSeenAt, lastUserAgent, createdById, createdAt, updatedAt)
      VALUES (${cryptoRandomId()}, ${context.instituteId}, ${input.deviceId}, ${input.deviceLabel ?? null}, ${new Date()}, ${input.request.headers.get("user-agent")}, ${context.userId}, ${new Date()}, ${new Date()})
      ON DUPLICATE KEY UPDATE label = VALUES(label), lastSeenAt = VALUES(lastSeenAt), lastUserAgent = VALUES(lastUserAgent), isActive = true, updatedAt = VALUES(updatedAt)
    `;
  }

  const alreadyMarked = new Map(session.records.map((record) => [record.studentId, record]));
  const candidateRows = session.classGroup.enrollments
    .map((enrollment) => enrollment.student)
    .filter((student) => {
      const profile = student.faceProfile;
      return profile?.status === "ACTIVE" && profile.encryptedEmbedding && profile.embeddingIv && profile.embeddingAuthTag;
    });

  const candidates = candidateRows.map((student) => ({
    id: student.id,
    embedding: decryptEmbedding({
      encryptedEmbedding: Buffer.from(student.faceProfile!.encryptedEmbedding!),
      embeddingIv: Buffer.from(student.faceProfile!.embeddingIv!),
      embeddingAuthTag: Buffer.from(student.faceProfile!.embeddingAuthTag!)
    })
  }));

  if (candidates.length === 0) {
    throw new StaffFaceError("NO_ENROLLED_FACES", "No enrolled face profiles are available for this class.", 409);
  }

  const serviceResult = await identifyFaceTemplate({
    frames: input.frames,
    candidates,
    challengeActions: input.challengeActions,
    thresholds: {
      match: Number(process.env.FACE_MATCH_THRESHOLD ?? settings.faceMatchThreshold),
      manualReview: Number(process.env.FACE_MANUAL_REVIEW_THRESHOLD ?? settings.faceManualReviewThreshold),
      liveness: Number(process.env.FACE_LIVENESS_THRESHOLD ?? settings.faceLivenessThreshold)
    }
  });

  if (!serviceResult.success) {
    const code = serviceResult.reasonCode ?? "QUALITY_FAILED";
    await auditFaceScanFailure(context, session.id, input.request, input.deviceId, code);
    return { ok: false, result: "failed" as const, code, message: serviceResult.message ?? faceErrorMessage(code) };
  }

  if (!serviceResult.livenessPassed) {
    await auditFaceScanFailure(context, session.id, input.request, input.deviceId, "LIVENESS_FAILED");
    return { ok: false, result: "failed-liveness" as const, code: "LIVENESS_FAILED", message: "Liveness challenge failed. Attendance was not marked." };
  }

  if (!serviceResult.matchPassed || !serviceResult.candidateId) {
    const result = serviceResult.reasonCode === "FACE_MATCH_AMBIGUOUS" ? "ambiguous" : "unknown";
    await auditFaceScanFailure(context, session.id, input.request, input.deviceId, serviceResult.reasonCode ?? "FACE_NOT_MATCHED");
    return {
      ok: false,
      result,
      code: serviceResult.reasonCode ?? "FACE_NOT_MATCHED",
      message: result === "ambiguous" ? "Face match is ambiguous. Confirm manually." : "No eligible enrolled student matched confidently.",
      similarityScore: serviceResult.similarityScore ?? null,
      secondSimilarityScore: serviceResult.secondSimilarityScore ?? null
    };
  }

  const student = candidateRows.find((row) => row.id === serviceResult.candidateId);
  if (!student) throw new StaffFaceError("FACE_NOT_MATCHED", "Matched student is no longer eligible.", 409);

  const existing = alreadyMarked.get(student.id);
  if (existing) {
    return {
      ok: true,
      result: "duplicate" as const,
      message: existing.source === "MANUAL" ? "Attendance was already corrected manually and was not changed." : "Attendance already marked.",
      student: { id: student.id, name: `${student.firstName} ${student.lastName}`.trim(), admissionNo: student.admissionNo },
      status: existing.status,
      source: existing.source,
      markedAt: existing.markedAt.toISOString(),
      similarityScore: serviceResult.similarityScore ?? null
    };
  }

  const markedAt = new Date();
  const lateAfter = new Date((session.startsAt ?? session.sessionDate).getTime() + (settings.attendanceLateAfterMins ?? 15) * 60_000);
  const status = statusFromTiming(markedAt, lateAfter);
  const studentName = `${student.firstName} ${student.lastName}`.trim();

  const saved = await prisma.$transaction(async (tx) => {
    const attempt = await tx.faceVerificationAttempt.create({
      data: {
        studentId: student.id,
        attendanceSessionId: session.id,
        deviceId: input.deviceId ?? null,
        result: FaceVerificationResult.VERIFIED,
        faceSimilarity: serviceResult.similarityScore ?? null,
        livenessScore: serviceResult.livenessScore ?? null,
        qualityScore: serviceResult.qualityScore ?? null,
        recognitionModel: serviceResult.model ?? settings.faceRecognitionModel,
        modelVersion: serviceResult.modelVersion ?? settings.faceRecognitionModelVersion,
        thresholdUsed: Number(process.env.FACE_MATCH_THRESHOLD ?? settings.faceMatchThreshold),
        ipHash: hashSafe(clientIp(input.request)),
        userAgent: input.request.headers.get("user-agent"),
        completedAt: markedAt
      }
    });

    try {
      const record = await tx.attendanceRecord.create({
        data: {
          sessionId: session.id,
          studentId: student.id,
          status,
          source: AttendanceSource.FACE,
          searchMethod: "FACE",
          faceAttemptId: attempt.id,
          confidenceScore: serviceResult.similarityScore ?? null,
          deviceId: input.deviceId ?? null,
          markedById: context.userId,
          markedAt
        },
        select: { id: true, status: true, markedAt: true }
      });

      await tx.studentFaceProfile.updateMany({
        where: { studentId: student.id, status: "ACTIVE" },
        data: { lastVerifiedAt: record.markedAt }
      });

      await tx.attendanceAuditLog.create({
        data: {
          instituteId: context.instituteId,
          sessionId: session.id,
          studentId: student.id,
          recordId: record.id,
          source: AttendanceSource.FACE,
          status: record.status,
          success: true,
          message: "Attendance marked by supervised face kiosk.",
          metadata: {
            deviceId: input.deviceId,
            deviceLabel: input.deviceLabel,
            attemptId: attempt.id,
            similarityScore: serviceResult.similarityScore,
            livenessScore: serviceResult.livenessScore
          } as Prisma.InputJsonObject
        }
      });

      return record;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        const record = await tx.attendanceRecord.findUniqueOrThrow({
          where: { sessionId_studentId: { sessionId: session.id, studentId: student.id } },
          select: { id: true, status: true, source: true, markedAt: true }
        });
        return record;
      }
      throw error;
    }
  });

  return {
    ok: true,
    result: "recognized" as const,
    message: "Attendance marked successfully.",
    student: { id: student.id, name: studentName, admissionNo: student.admissionNo },
    status: saved.status,
    source: "source" in saved ? saved.source : AttendanceSource.FACE,
    markedAt: saved.markedAt.toISOString(),
    similarityScore: serviceResult.similarityScore ?? null,
    livenessScore: serviceResult.livenessScore ?? null
  };
}

async function auditFaceScanFailure(
  context: StaffContext,
  sessionId: string,
  request: Request,
  deviceId: string | null | undefined,
  code: string
) {
  await prisma.attendanceAuditLog.create({
    data: {
      instituteId: context.instituteId,
      sessionId,
      source: AttendanceSource.FACE,
      success: false,
      message: `Face kiosk scan rejected: ${code}.`,
      metadata: {
        deviceId,
        code,
        ipHash: hashSafe(clientIp(request))
      } as Prisma.InputJsonObject
    }
  });
}
