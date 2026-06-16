import { NextResponse } from "next/server";
import { AttendanceAccessError, requireAttendanceScannerAccess } from "@/lib/attendance-access";
import { normalizeNfcUid } from "@/lib/nfc";
import { prisma } from "@/lib/prisma";
import { attendanceSearchSchema } from "@/lib/validations";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = attendanceSearchSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, message: "Invalid attendance search payload.", errors: parsed.error.flatten().fieldErrors },
        { status: 422 }
      );
    }

    const { user } = await requireAttendanceScannerAccess(request, parsed.data.classGroupId);

    if (!user.instituteId) {
      return NextResponse.json({ ok: false, message: "This account is not linked to an institute." }, { status: 403 });
    }

    const query = parsed.data.query.trim();
    const normalized = normalizeNfcUid(query);
    const credentialFilters = normalized ? [{ nfcUid: { contains: normalized } }] : [];

    const enrollments = await prisma.enrollment.findMany({
      where: {
        classGroupId: parsed.data.classGroupId,
        active: true,
        status: "ACTIVE",
        student: {
          instituteId: user.instituteId,
          status: "ACTIVE",
          OR: [
            { admissionNo: { contains: query } },
            { firstName: { contains: query } },
            { lastName: { contains: query } },
            { phone: { contains: query } },
            { nfcUid: { contains: query } },
            ...credentialFilters
          ]
        }
      },
      take: 8,
      select: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            admissionNo: true,
            phone: true,
            nfcUid: true,
            status: true
          }
        }
      },
      orderBy: { student: { firstName: "asc" } }
    });

    return NextResponse.json({
      ok: true,
      students: enrollments.map((enrollment) => ({
        id: enrollment.student.id,
        name: `${enrollment.student.firstName} ${enrollment.student.lastName}`,
        admissionNo: enrollment.student.admissionNo,
        phone: enrollment.student.phone,
        nfcUid: enrollment.student.nfcUid,
        status: enrollment.student.status
      }))
    });
  } catch (error) {
    if (error instanceof AttendanceAccessError) {
      return NextResponse.json({ ok: false, message: error.message }, { status: error.statusCode });
    }

    console.error(error);
    return NextResponse.json({ ok: false, message: "Could not search enrolled students." }, { status: 500 });
  }
}
