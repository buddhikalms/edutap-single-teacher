import { NextResponse } from "next/server";
import { requireStudentMobileUser, StudentMobileAuthError } from "@/lib/student-mobile-auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { studentId, instituteId } = await requireStudentMobileUser(request);
    const notifications = await prisma.notification.findMany({
      where: { instituteId, OR: [{ studentId }, { studentId: null }] },
      orderBy: { createdAt: "desc" },
      take: 100
    });

    return NextResponse.json({
      ok: true,
      notifications: notifications.map((notification) => ({
        id: notification.id,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        status: notification.status,
        actionUrl: notification.actionUrl,
        createdAt: notification.createdAt.toISOString()
      }))
    });
  } catch (error) {
    if (error instanceof StudentMobileAuthError) return NextResponse.json({ ok: false, message: error.message }, { status: error.statusCode });
    console.error(error);
    return NextResponse.json({ ok: false, message: "Could not load notifications." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { studentId, instituteId } = await requireStudentMobileUser(request);
    const body = await request.json();
    await prisma.notification.updateMany({
      where: { id: String(body.id), instituteId, OR: [{ studentId }, { studentId: null }] },
      data: { status: "READ", readAt: new Date() }
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof StudentMobileAuthError) return NextResponse.json({ ok: false, message: error.message }, { status: error.statusCode });
    console.error(error);
    return NextResponse.json({ ok: false, message: "Could not update notification." }, { status: 500 });
  }
}
