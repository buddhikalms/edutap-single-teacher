import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  faceAttendanceEnabled: z.boolean().optional(),
  faceAllowStudentSelfEnrollment: z.boolean().optional(),
  faceRequireParentConsent: z.boolean().optional(),
  faceConsentAge: z.number().int().min(5).max(21).optional(),
  faceMatchThreshold: z.number().min(0).max(1).optional(),
  faceManualReviewThreshold: z.number().min(0).max(1).optional(),
  faceLivenessThreshold: z.number().min(0).max(1).optional(),
  faceMaximumAttempts: z.number().int().min(1).max(10).optional(),
  faceAttemptCooldownSeconds: z.number().int().min(5).max(900).optional(),
  faceRequireClassroomQrChallenge: z.boolean().optional(),
  faceRequireRegisteredDevice: z.boolean().optional(),
  faceRequireLocation: z.boolean().optional(),
  faceLocationRadiusMeters: z.number().int().min(10).max(5000).optional(),
  faceRecognitionModel: z.string().min(2).max(80).optional(),
  faceRecognitionModelVersion: z.string().min(1).max(80).optional(),
  faceDuplicateReviewEnabled: z.boolean().optional()
});

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.instituteId || !["SUPER_ADMIN", "INSTITUTE_ADMIN", "BRANCH_ADMIN"].includes(session.user.role)) {
    throw new Error("FORBIDDEN");
  }
  return session.user;
}

export async function GET() {
  try {
    const user = await requireAdmin();
    const settings = await prisma.instituteSettings.findUnique({ where: { instituteId: user.instituteId! } });
    return NextResponse.json({ ok: true, settings });
  } catch {
    return NextResponse.json({ ok: false, message: "Admin access is required." }, { status: 403 });
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireAdmin();
    const data = schema.parse(await request.json());
    const settings = await prisma.instituteSettings.update({
      where: { instituteId: user.instituteId! },
      data
    });
    return NextResponse.json({ ok: true, settings });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ ok: false, message: "Invalid face settings." }, { status: 400 });
    return NextResponse.json({ ok: false, message: "Admin access is required." }, { status: 403 });
  }
}
