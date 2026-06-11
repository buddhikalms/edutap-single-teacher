"use server";

import { revalidatePath } from "next/cache";
import { AttendanceSource, AttendanceStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { actionError, getTenantContext, type ActionState } from "@/lib/session";
import {
  attendanceSessionSchema,
  manualAttendanceSchema,
  type AttendanceSessionInput,
  type ManualAttendanceInput
} from "@/lib/validations";

function sessionDate(value: string) {
  return new Date(`${value}T00:00:00.000`);
}

async function assertClass(instituteId: string, classGroupId: string) {
  const classGroup = await prisma.classGroup.findFirst({
    where: { id: classGroupId, instituteId },
    select: { id: true }
  });

  if (!classGroup) {
    throw new Error("Invalid class.");
  }
}

export async function startAttendanceSession(input: AttendanceSessionInput): Promise<ActionState> {
  try {
    const { instituteId } = await getTenantContext();
    const parsed = attendanceSessionSchema.parse(input);
    await assertClass(instituteId, parsed.classGroupId);

    const date = sessionDate(parsed.sessionDate);
    const existing = await prisma.attendanceSession.findUnique({
      where: {
        classGroupId_sessionDate: {
          classGroupId: parsed.classGroupId,
          sessionDate: date
        }
      }
    });

    if (existing?.status === "ACTIVE") {
      return { ok: false, message: "This class already has an active session for the selected date." };
    }

    if (existing) {
      await prisma.attendanceSession.update({
        where: { id: existing.id },
        data: {
          status: "ACTIVE",
          startsAt: new Date(),
          endsAt: null,
          notes: parsed.notes ?? existing.notes
        }
      });
    } else {
      await prisma.attendanceSession.create({
        data: {
          classGroupId: parsed.classGroupId,
          sessionDate: date,
          startsAt: new Date(),
          status: "ACTIVE",
          notes: parsed.notes ?? null
        }
      });
    }

    revalidatePath("/attendance");
    revalidatePath("/dashboard");
    return { ok: true, message: "Attendance session started." };
  } catch (error) {
    return actionError(error, "Could not start attendance session.");
  }
}

export async function endAttendanceSession(sessionId: string): Promise<ActionState> {
  try {
    const { instituteId } = await getTenantContext();
    const session = await prisma.attendanceSession.findFirst({
      where: { id: sessionId, classGroup: { instituteId } },
      select: { id: true }
    });

    if (!session) {
      return { ok: false, message: "Attendance session was not found." };
    }

    await prisma.attendanceSession.update({
      where: { id: sessionId },
      data: {
        status: "ENDED",
        endsAt: new Date()
      }
    });

    revalidatePath("/attendance");
    revalidatePath("/dashboard");
    return { ok: true, message: "Attendance session ended." };
  } catch (error) {
    return actionError(error, "Could not end attendance session.");
  }
}

export async function saveManualAttendance(input: ManualAttendanceInput): Promise<ActionState> {
  try {
    const { instituteId } = await getTenantContext();
    const parsed = manualAttendanceSchema.parse(input);

    const session = await prisma.attendanceSession.findFirst({
      where: { id: parsed.sessionId, classGroup: { instituteId } },
      include: {
        classGroup: {
          select: { id: true, instituteId: true }
        }
      }
    });

    if (!session) {
      return { ok: false, message: "Attendance session was not found." };
    }

    const studentIds = parsed.records.map((record) => record.studentId);
    const activeEnrollments = await prisma.enrollment.findMany({
      where: {
        studentId: { in: studentIds },
        classGroupId: session.classGroupId,
        active: true,
        student: { instituteId }
      },
      select: { studentId: true }
    });
    const allowed = new Set(activeEnrollments.map((enrollment) => enrollment.studentId));

    if (allowed.size !== studentIds.length) {
      return { ok: false, message: "One or more students are not actively enrolled in this class." };
    }

    await prisma.$transaction(async (tx) => {
      for (const record of parsed.records) {
        const saved = await tx.attendanceRecord.upsert({
          where: {
            sessionId_studentId: {
              sessionId: parsed.sessionId,
              studentId: record.studentId
            }
          },
          create: {
            sessionId: parsed.sessionId,
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
            instituteId,
            sessionId: parsed.sessionId,
            studentId: record.studentId,
            recordId: saved.id,
            source: AttendanceSource.MANUAL,
            status: record.status as AttendanceStatus,
            success: true,
            message: "Manual attendance saved."
          }
        });
      }
    });

    revalidatePath("/attendance");
    revalidatePath("/students");
    revalidatePath("/dashboard");
    return { ok: true, message: "Manual attendance saved." };
  } catch (error) {
    return actionError(error, "Could not save manual attendance.");
  }
}
