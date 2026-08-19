import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashSafe } from "@/lib/biometric-encryption";
import { clientIp } from "@/lib/rate-limit";
import { requireFaceStudent, studentFaceAuthResponse } from "@/lib/student-face-auth";

const schema = z.object({
  consentAccepted: z.literal(true),
  policyVersion: z.string().min(3).max(80),
  deviceInfo: z.string().max(1000).optional()
});

export async function POST(request: Request) {
  try {
    const { student, studentId, instituteId } = await requireFaceStudent(request);
    const body = schema.parse(await request.json());
    const settings = await prisma.instituteSettings.findUnique({ where: { instituteId } });
    if (!settings?.faceAttendanceEnabled || !settings.faceAllowStudentSelfEnrollment) {
      return NextResponse.json({ ok: false, code: "CONSENT_REQUIRED", message: "Face self-enrolment is not enabled." }, { status: 403 });
    }

    await prisma.biometricConsent.create({
      data: {
        studentId,
        consentType: "FACE_ATTENDANCE",
        consented: true,
        consentedById: student.userId ?? studentId,
        policyVersion: body.policyVersion,
        consentedAt: new Date(),
        ipHash: hashSafe(clientIp(request)),
        userAgent: request.headers.get("user-agent"),
        deviceInfo: body.deviceInfo
      }
    });

    return NextResponse.json({
      ok: true,
      policyVersion: body.policyVersion,
      sampleTargets: ["straight", "left", "right", "up", "down", "blink"]
    });
  } catch (error) {
    const auth = studentFaceAuthResponse(error);
    if (auth) return auth;
    if (error instanceof z.ZodError) return NextResponse.json({ ok: false, message: "Invalid consent request." }, { status: 400 });
    console.error(error);
    return NextResponse.json({ ok: false, message: "Could not start face enrolment." }, { status: 500 });
  }
}
