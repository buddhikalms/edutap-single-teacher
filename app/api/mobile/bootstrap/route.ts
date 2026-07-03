import { NextResponse } from "next/server";
import { PaymentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { branchScopedWhere, MobileAuthError, requireOperationalMobileUser } from "@/lib/mobile-auth";
import { todayRange } from "@/lib/mobile-data";

export async function GET(request: Request) {
  try {
    const user = await requireOperationalMobileUser(request);
    const { start, end } = todayRange();
    const branchScope = branchScopedWhere(user);
    const teacherScope = user.role === "TEACHER" ? { teacher: { userId: user.id } } : {};

    const [branches, classes, activeSessions, recentScans, pendingPayments] = await Promise.all([
      prisma.branch.findMany({
        where: { instituteId: user.instituteId, ...branchScope },
        orderBy: { name: "asc" },
        select: { id: true, name: true, code: true }
      }),
      prisma.classGroup.findMany({
        where: { instituteId: user.instituteId, ...branchScope, ...teacherScope },
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          code: true,
          schedule: true,
          branchId: true,
          subject: { select: { name: true } },
          gradeLevel: { select: { name: true } },
          monthlyFee: true,
          teacher: { select: { name: true } },
          _count: { select: { enrollments: true } }
        }
      }),
      prisma.attendanceSession.findMany({
        where: {
          status: "ACTIVE",
          sessionDate: { gte: start, lt: end },
          classGroup: { instituteId: user.instituteId, ...branchScope, ...teacherScope }
        },
        select: {
          id: true,
          classGroupId: true,
          startsAt: true,
          sessionDate: true,
          records: { select: { status: true } }
        }
      }),
      prisma.attendanceAuditLog.findMany({
        where: { instituteId: user.instituteId, success: true, studentId: { not: null } },
        orderBy: { createdAt: "desc" },
        take: 8,
        select: {
          id: true,
          source: true,
          status: true,
          message: true,
          createdAt: true,
          student: { select: { id: true, firstName: true, lastName: true, admissionNo: true } },
          session: { select: { classGroup: { select: { id: true, name: true } } } }
        }
      }),
      prisma.payment.aggregate({
        where: {
          instituteId: user.instituteId,
          status: { in: [PaymentStatus.PENDING, PaymentStatus.PARTIAL, PaymentStatus.OVERDUE] }
        },
        _sum: { balance: true },
        _count: true
      })
    ]);

    const sessionsByClass = new Map(activeSessions.map((session) => [session.classGroupId, session]));

    return NextResponse.json({
      ok: true,
      user,
      branches,
      classes: classes.map((classGroup) => {
        const activeSession = sessionsByClass.get(classGroup.id);
        return {
          id: classGroup.id,
          name: classGroup.name,
          code: classGroup.code,
          schedule: classGroup.schedule,
          branchId: classGroup.branchId,
          courseName: classGroup.subject.name,
          subject: classGroup.subject.name,
          grade: classGroup.gradeLevel?.name,
          monthlyFee: Number(classGroup.monthlyFee),
          teacherName: classGroup.teacher?.name ?? "Unassigned",
          enrolledCount: classGroup._count.enrollments,
          activeSession: activeSession
            ? {
                id: activeSession.id,
                startsAt: activeSession.startsAt?.toISOString() ?? null,
                sessionDate: activeSession.sessionDate.toISOString(),
                markedCount: activeSession.records.length
              }
            : null
        };
      }),
      pendingPayments: {
        amount: Number(pendingPayments._sum.balance ?? 0),
        count: pendingPayments._count
      },
      recentScans: recentScans.map((scan) => ({
        id: scan.id,
        source: scan.source,
        status: scan.status,
        message: scan.message,
        createdAt: scan.createdAt.toISOString(),
        student: scan.student
          ? {
              id: scan.student.id,
              name: `${scan.student.firstName} ${scan.student.lastName}`,
              admissionNo: scan.student.admissionNo
            }
          : null,
        classGroup: scan.session.classGroup
      }))
    });
  } catch (error) {
    if (error instanceof MobileAuthError) {
      return NextResponse.json({ ok: false, message: error.message }, { status: error.statusCode });
    }

    console.error(error);
    return NextResponse.json({ ok: false, message: "Could not load mobile dashboard." }, { status: 500 });
  }
}

