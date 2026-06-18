import { NextResponse } from "next/server";
import { MobileAuthError } from "@/lib/mobile-auth";
import { requireParentMobileUser } from "@/lib/parent-mobile-auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { instituteId, parentId, studentIds } = await requireParentMobileUser(request);

    const notifications = await prisma.notification.findMany({
      where: {
        instituteId,
        parentId,
        OR: [{ studentId: null }, { studentId: { in: studentIds } }]
      },
      include: {
        student: { select: { id: true, firstName: true, lastName: true, admissionNo: true } }
      },
      orderBy: { createdAt: "desc" },
      take: 100
    });

    return NextResponse.json({
      ok: true,
      notifications: notifications.map((notification) => ({
        id: notification.id,
        title: notification.title,
        body: notification.body ?? notification.message,
        message: notification.message,
        type: notification.type,
        status: notification.status,
        readAt: notification.readAt?.toISOString() ?? null,
        createdAt: notification.createdAt.toISOString(),
        actionUrl: notification.actionUrl,
        data: notification.dataJson,
        student: notification.student
          ? {
              id: notification.student.id,
              admissionNo: notification.student.admissionNo,
              name: `${notification.student.firstName} ${notification.student.lastName}`.trim()
            }
          : null
      }))
    });
  } catch (error) {
    if (error instanceof MobileAuthError) {
      return NextResponse.json({ ok: false, message: error.message }, { status: error.statusCode });
    }

    console.error(error);
    return NextResponse.json({ ok: false, message: "Could not load parent notifications." }, { status: 500 });
  }
}
