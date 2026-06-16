import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MobileAuthError, requireOperationalMobileUser } from "@/lib/mobile-auth";
import { normalizeNfcUid } from "@/lib/nfc";
import { assignStudentNfcSchema } from "@/lib/validations";

type RouteContext = {
  params: Promise<{ studentId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const user = await requireOperationalMobileUser(request);
    const { studentId } = await context.params;
    const body = await request.json();
    const parsed = assignStudentNfcSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, message: "Invalid NFC assignment payload.", errors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const normalizedNfcUid = normalizeNfcUid(parsed.data.nfcUid);

    if (!normalizedNfcUid) {
      return NextResponse.json({ ok: false, message: "NFC UID is required." }, { status: 400 });
    }

    const student = await prisma.student.findFirst({
      where: { id: studentId, instituteId: user.instituteId },
      select: { id: true, firstName: true, lastName: true, admissionNo: true, branchId: true }
    });

    if (!student) {
      return NextResponse.json({ ok: false, message: "Student was not found." }, { status: 404 });
    }

    if (user.role !== "SUPER_ADMIN" && user.role !== "INSTITUTE_ADMIN" && user.branchId && student.branchId !== user.branchId) {
      return NextResponse.json({ ok: false, message: "You do not have access to this student." }, { status: 403 });
    }

    const existingStudents = await prisma.student.findMany({
      where: {
        instituteId: user.instituteId,
        nfcUid: { not: null },
        id: { not: student.id }
      },
      select: { firstName: true, lastName: true, admissionNo: true, nfcUid: true }
    });
    const existing = existingStudents.find((savedStudent) => normalizeNfcUid(savedStudent.nfcUid) === normalizedNfcUid);

    if (existing) {
      return NextResponse.json(
        {
          ok: false,
          message: `This NFC card is already assigned to ${existing.firstName} ${existing.lastName} (${existing.admissionNo}).`
        },
        { status: 409 }
      );
    }

    await prisma.student.update({
      where: { id: student.id },
      data: { nfcUid: normalizedNfcUid }
    });

    return NextResponse.json({
      ok: true,
      message:
        parsed.data.writeMode === "NDEF_WRITTEN"
          ? "NFC card linked and ClassCard payload written."
          : "NFC card linked to student.",
      student: {
        id: student.id,
        admissionNo: student.admissionNo,
        name: `${student.firstName} ${student.lastName}`,
        nfcUid: normalizedNfcUid
      }
    });
  } catch (error) {
    if (error instanceof MobileAuthError) {
      return NextResponse.json({ ok: false, message: error.message }, { status: error.statusCode });
    }

    console.error(error);
    return NextResponse.json({ ok: false, message: "Could not assign NFC card." }, { status: 500 });
  }
}
