import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MobileAuthError, requireOperationalMobileUser } from "@/lib/mobile-auth";
import { getStudentPaymentSummary, summarizeAttendance } from "@/lib/mobile-data";

type RouteContext = {
  params: Promise<{ studentId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  try {
    const user = await requireOperationalMobileUser(request);
    const { studentId } = await context.params;

    const student = await prisma.student.findFirst({
      where: { id: studentId, instituteId: user.instituteId },
      include: {
        branch: { select: { name: true } },
        parents: { select: { name: true, phone: true, email: true, occupation: true } },
        enrollments: {
          include: {
            classGroup: {
              select: {
                id: true,
                name: true,
                code: true,
                schedule: true,
                branchId: true,
                course: { select: { name: true, fee: true, subject: true, grade: true } },
                teacher: { select: { name: true } }
              }
            }
          }
        },
        attendance: {
          orderBy: { markedAt: "desc" },
          take: 30,
          include: { session: { select: { sessionDate: true, classGroup: { select: { id: true, name: true } } } } }
        },
        payments: {
          orderBy: { createdAt: "desc" },
          take: 12,
          select: {
            id: true,
            invoiceNo: true,
            month: true,
            type: true,
            amount: true,
            paidAmount: true,
            balance: true,
            status: true,
            dueDate: true,
            paidAt: true
          }
        }
      }
    });

    if (!student) {
      return NextResponse.json({ ok: false, message: "Student was not found." }, { status: 404 });
    }

    if (
      user.role !== "SUPER_ADMIN" &&
      user.role !== "INSTITUTE_ADMIN" &&
      user.branchId &&
      student.branchId !== user.branchId
    ) {
      return NextResponse.json({ ok: false, message: "You do not have access to this student." }, { status: 403 });
    }

    const payment = await getStudentPaymentSummary(student.id);

    return NextResponse.json({
      ok: true,
      student: {
        id: student.id,
        admissionNo: student.admissionNo,
        name: `${student.firstName} ${student.lastName}`,
        email: student.email,
        phone: student.phone,
        status: student.status,
        avatarUrl: student.avatarUrl,
        nfcUid: student.nfcUid,
        attendanceToken: student.attendanceToken,
        branchName: student.branch.name,
        guardians: student.parents,
        payment,
        attendanceSummary: summarizeAttendance(student.attendance),
        classes: student.enrollments.map((enrollment) => ({
          id: enrollment.classGroup.id,
          name: enrollment.classGroup.name,
          code: enrollment.classGroup.code,
          schedule: enrollment.classGroup.schedule,
          active: enrollment.active,
          teacherName: enrollment.classGroup.teacher?.name ?? "Unassigned",
          courseName: enrollment.classGroup.course.name,
          monthlyFee: Number(enrollment.classGroup.course.fee)
        })),
        attendanceHistory: student.attendance.map((record) => ({
          id: record.id,
          status: record.status,
          source: record.source,
          markedAt: record.markedAt.toISOString(),
          classGroup: record.session.classGroup,
          sessionDate: record.session.sessionDate.toISOString()
        })),
        payments: student.payments.map((paymentRecord) => ({
          ...paymentRecord,
          amount: Number(paymentRecord.amount),
          paidAmount: Number(paymentRecord.paidAmount),
          balance: Number(paymentRecord.balance),
          dueDate: paymentRecord.dueDate.toISOString(),
          paidAt: paymentRecord.paidAt?.toISOString() ?? null
        }))
      }
    });
  } catch (error) {
    if (error instanceof MobileAuthError) {
      return NextResponse.json({ ok: false, message: error.message }, { status: error.statusCode });
    }

    console.error(error);
    return NextResponse.json({ ok: false, message: "Could not load student profile." }, { status: 500 });
  }
}

