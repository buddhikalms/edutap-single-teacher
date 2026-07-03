import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createStudentDevice } from "@/lib/student-mobile-auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  identifier: z.string().trim().min(2),
  password: z.string().min(8),
  deviceName: z.string().optional(),
  platform: z.string().optional(),
  pushToken: z.string().optional()
});

export async function POST(request: Request) {
  try {
    const parsed = schema.parse(await request.json());
    const normalized = parsed.identifier.toLowerCase();
    const student = await prisma.student.findFirst({
      where: {
        OR: [
          { email: normalized },
          { phone: parsed.identifier },
          { admissionNo: parsed.identifier }
        ],
        userId: { not: null }
      },
      include: {
        user: true,
        institute: { select: { id: true, name: true, logoUrl: true } },
        branch: { select: { id: true, name: true } }
      }
    });

    if (!student?.user?.passwordHash || student.user.role !== "STUDENT" || !(await bcrypt.compare(parsed.password, student.user.passwordHash))) {
      return NextResponse.json({ ok: false, message: "Invalid student credentials." }, { status: 401 });
    }
    if (student.user.passwordStatus !== "ACTIVE") {
      return NextResponse.json({ ok: false, message: "Activate your account with QR or NFC before using password login." }, { status: 403 });
    }
    if (student.user.accountStatus === "PENDING_APPROVAL") {
      return NextResponse.json({ ok: false, message: "Your enrollment request is pending teacher approval." }, { status: 403 });
    }
    if (student.user.accountStatus === "REJECTED") {
      return NextResponse.json({ ok: false, message: "Your enrollment request was not approved. Please contact the teacher." }, { status: 403 });
    }

    const device = await createStudentDevice({
      studentId: student.id,
      instituteId: student.instituteId,
      deviceName: parsed.deviceName,
      platform: parsed.platform,
      pushToken: parsed.pushToken
    });

    await prisma.user.update({
      where: { id: student.user.id },
      data: { lastLoginAt: new Date(), lastLoginDevice: parsed.deviceName ?? parsed.platform ?? "Student mobile app" }
    });

    return NextResponse.json({
      ok: true,
      token: device.token,
      expiresAt: device.expiresAt.toISOString(),
      student: {
        id: student.id,
        admissionNo: student.admissionNo,
        name: `${student.firstName} ${student.lastName}`,
        email: student.email,
        phone: student.phone,
        institute: student.institute,
        branch: student.branch
      }
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ ok: false, message: "Could not sign in to the student app." }, { status: 500 });
  }
}
