import { AttendanceSource, AttendanceStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MobileAuthError, requireOperationalMobileUser } from "@/lib/mobile-auth";
import { sendParentAttendanceNotification } from "@/lib/parent-attendance-notifications";
import { manualAttendanceSchema } from "@/lib/validations";

export async function POST(request: Request) {
  try {
    const user = await requireOperationalMobileUser(request);
    const body = await request.json();
    const parsed = manualAttendanceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, message: "Invalid manual attendance payload.", errors: parsed.error.flatten().fieldErrors },
        { status: 422 }
      );
    }

    const session = await prisma.attendanceSession.findFirst({
      where: { id: parsed.data.sessionId, status: "ACTIVE", classGroup: { instituteId: user.instituteId } },
      include: { classGroup: { select: { id: true, branchId: true } } }
    });

    if (!session) {
      return NextResponse.json({ ok: false, message: "Active attendance session was not found." }, { status: 404 });
    }

    if (user.role !== "SUPER_ADMIN" && user.role !== "INSTITUTE_ADMIN" && user.branchId && session.classGroup.branchId !== user.branchId) {
      return NextResponse.json({ ok: false, message: "You do not have access to this branch." }, { status: 403 });
    }

    const studentIds = parsed.data.records.map((record) => record.studentId);
    const activeEnrollments = await prisma.enrollment.findMany({
      where: {
        classGroupId: session.classGroupId,
        active: true,
        studentId: { in: studentIds },
        student: { instituteId: user.instituteId }
      },
      select: { studentId: true }
    });
    const allowed = new Set(activeEnrollments.map((enrollment) => enrollment.studentId));

    if (allowed.size !== studentIds.length) {
      return NextResponse.json({ ok: false, message: "One or more students are not enrolled in this class." }, { status: 403 });
    }

    const notificationJobs: Array<{ attendanceRecordId: string; studentId: string; status: AttendanceStatus; markedAt: Date }> = [];

    await prisma.$transaction(async (tx) => {
      for (const record of parsed.data.records) {
        const existing = await tx.attendanceRecord.findUnique({
          where: {
            sessionId_studentId: {
              sessionId: session.id,
              studentId: record.studentId
            }
          },
          select: { id: true }
        });

        const saved = await tx.attendanceRecord.upsert({
          where: {
            sessionId_studentId: {
              sessionId: session.id,
              studentId: record.studentId
            }
          },
          create: {
            sessionId: session.id,
            studentId: record.studentId,
            status: record.status as AttendanceStatus,
            source: AttendanceSource.MANUAL,
            notes: record.notes ?? null
          },
          update: {
            status: record.status as AttendanceStatus,
            source: AttendanceSource.MANUAL,
            notes: record.notes ?? null,
            markedAt: new Date()
          }
        });

        await tx.attendanceAuditLog.create({
          data: {
            instituteId: user.instituteId,
            sessionId: session.id,
            studentId: record.studentId,
            recordId: saved.id,
            source: AttendanceSource.MANUAL,
            status: record.status as AttendanceStatus,
            success: true,
            message: "Manual attendance saved from mobile."
          }
        });

        if (!existing) {
          notificationJobs.push({ attendanceRecordId: saved.id, studentId: record.studentId, status: saved.status, markedAt: saved.markedAt });
        }
      }
    });

    await Promise.all(
      notificationJobs
        .filter((job) => job.status === AttendanceStatus.PRESENT || job.status === AttendanceStatus.LATE)
        .map((job) =>
          sendParentAttendanceNotification({
            instituteId: user.instituteId,
            attendanceRecordId: job.attendanceRecordId,
            studentId: job.studentId,
            classGroupId: session.classGroupId,
            branchId: session.classGroup.branchId,
            markedAt: job.markedAt
          }).catch((error) => {
            console.error("Parent attendance notification failed", error);
          })
        )
    );

    return NextResponse.json({ ok: true, message: "Manual attendance saved." });
  } catch (error) {
    if (error instanceof MobileAuthError) {
      return NextResponse.json({ ok: false, message: error.message }, { status: error.statusCode });
    }

    console.error(error);
    return NextResponse.json({ ok: false, message: "Could not save manual attendance." }, { status: 500 });
  }
}

