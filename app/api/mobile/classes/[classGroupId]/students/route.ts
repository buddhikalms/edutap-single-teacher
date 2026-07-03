import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MobileAuthError, requireOperationalMobileUser } from "@/lib/mobile-auth";
import { getStudentPaymentSummary, summarizeAttendance, todayRange } from "@/lib/mobile-data";

type RouteContext = {
  params: Promise<{ classGroupId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  try {
    const user = await requireOperationalMobileUser(request);
    const { classGroupId } = await context.params;
    const { start, end } = todayRange();

    const classGroup = await prisma.classGroup.findFirst({
      where: { id: classGroupId, instituteId: user.instituteId },
      select: {
        id: true,
        name: true,
        code: true,
        schedule: true,
        branchId: true,
        subject: { select: { name: true } },
        gradeLevel: { select: { name: true } },
        monthlyFee: true,
        teacher: { select: { name: true } }
      }
    });

    if (!classGroup) {
      return NextResponse.json({ ok: false, message: "Class was not found." }, { status: 404 });
    }

    if (user.role !== "SUPER_ADMIN" && user.role !== "INSTITUTE_ADMIN" && user.branchId && classGroup.branchId !== user.branchId) {
      return NextResponse.json({ ok: false, message: "You do not have access to this class." }, { status: 403 });
    }

    const [session, enrollments] = await Promise.all([
      prisma.attendanceSession.findFirst({
        where: {
          classGroupId,
          status: "ACTIVE",
          sessionDate: { gte: start, lt: end }
        },
        include: { records: { select: { studentId: true, status: true, markedAt: true, source: true } } }
      }),
      prisma.enrollment.findMany({
        where: { classGroupId, active: true, student: { instituteId: user.instituteId } },
        orderBy: { student: { firstName: "asc" } },
        include: {
          student: {
            select: {
              id: true,
              admissionNo: true,
              firstName: true,
              lastName: true,
              avatarUrl: true,
              nfcUid: true,
              attendanceToken: true,
              phone: true,
              status: true,
              attendance: {
                orderBy: { markedAt: "desc" },
                take: 20,
                select: { status: true }
              }
            }
          }
        }
      })
    ]);

    const recordsByStudent = new Map(session?.records.map((record) => [record.studentId, record]) ?? []);
    const students = await Promise.all(
      enrollments.map(async (enrollment) => {
        const payment = await getStudentPaymentSummary(enrollment.student.id, classGroupId);
        const record = recordsByStudent.get(enrollment.student.id);

        return {
          id: enrollment.student.id,
          admissionNo: enrollment.student.admissionNo,
          name: `${enrollment.student.firstName} ${enrollment.student.lastName}`,
          avatarUrl: enrollment.student.avatarUrl,
          phone: enrollment.student.phone,
          status: enrollment.student.status,
          nfcUid: enrollment.student.nfcUid,
          attendanceToken: enrollment.student.attendanceToken,
          payment,
          attendanceSummary: summarizeAttendance(enrollment.student.attendance),
          todayAttendance: record
            ? {
                status: record.status,
                source: record.source,
                markedAt: record.markedAt.toISOString()
              }
            : null
        };
      })
    );

    return NextResponse.json({
      ok: true,
      classGroup: {
        ...classGroup,
        monthlyFee: Number(classGroup.monthlyFee)
      },
      session: session
        ? {
            id: session.id,
            classGroupId: session.classGroupId,
            sessionDate: session.sessionDate.toISOString(),
            startsAt: session.startsAt?.toISOString() ?? null,
            markedCount: session.records.length
          }
        : null,
      students
    });
  } catch (error) {
    if (error instanceof MobileAuthError) {
      return NextResponse.json({ ok: false, message: error.message }, { status: error.statusCode });
    }

    console.error(error);
    return NextResponse.json({ ok: false, message: "Could not load class roster." }, { status: 500 });
  }
}

