import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MobileAuthError, requireOperationalMobileUser } from "@/lib/mobile-auth";
import { attendanceSessionSchema } from "@/lib/validations";
import { sessionDate } from "@/lib/mobile-data";

export async function POST(request: Request) {
  try {
    const user = await requireOperationalMobileUser(request);
    const body = await request.json();
    const parsed = attendanceSessionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, message: "Invalid attendance session payload.", errors: parsed.error.flatten().fieldErrors },
        { status: 422 }
      );
    }

    const classGroup = await prisma.classGroup.findFirst({
      where: { id: parsed.data.classGroupId, instituteId: user.instituteId },
      select: { id: true, name: true, branchId: true }
    });

    if (!classGroup) {
      return NextResponse.json({ ok: false, message: "Class was not found." }, { status: 404 });
    }

    if (user.role !== "SUPER_ADMIN" && user.role !== "INSTITUTE_ADMIN" && user.branchId && classGroup.branchId !== user.branchId) {
      return NextResponse.json({ ok: false, message: "You do not have access to this branch." }, { status: 403 });
    }

    const date = sessionDate(parsed.data.sessionDate);
    const existing = await prisma.attendanceSession.findUnique({
      where: {
        classGroupId_sessionDate: {
          classGroupId: parsed.data.classGroupId,
          sessionDate: date
        }
      },
      include: { records: { select: { id: true } } }
    });

    const session = existing
      ? await prisma.attendanceSession.update({
          where: { id: existing.id },
          data: { status: "ACTIVE", startsAt: existing.startsAt ?? new Date(), endsAt: null, notes: parsed.data.notes },
          include: { records: { select: { id: true } } }
        })
      : await prisma.attendanceSession.create({
          data: {
            classGroupId: parsed.data.classGroupId,
            sessionDate: date,
            startsAt: new Date(),
            status: "ACTIVE",
            notes: parsed.data.notes ?? null
          },
          include: { records: { select: { id: true } } }
        });

    return NextResponse.json({
      ok: true,
      message: existing ? "Attendance session continued." : "Attendance session started.",
      session: {
        id: session.id,
        classGroupId: session.classGroupId,
        sessionDate: session.sessionDate.toISOString(),
        startsAt: session.startsAt?.toISOString() ?? null,
        status: session.status,
        markedCount: session.records.length
      }
    });
  } catch (error) {
    if (error instanceof MobileAuthError) {
      return NextResponse.json({ ok: false, message: error.message }, { status: error.statusCode });
    }

    console.error(error);
    return NextResponse.json({ ok: false, message: "Could not start attendance session." }, { status: 500 });
  }
}

