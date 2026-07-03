import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { NotificationType } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWebPushConfig, sendWebPushMessages } from "@/lib/web-push";

export async function POST() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.instituteId || !["PARENT", "FAMILY", "STUDENT"].includes(session.user.role)) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const config = getWebPushConfig();
  if (!config.ok) {
    return NextResponse.json({ message: config.reason }, { status: 503 });
  }

  const isFamily = session.user.role === "PARENT" || session.user.role === "FAMILY";
  const [parent, student] = await Promise.all([
    isFamily
      ? prisma.parent.findFirst({
          where: { userId: session.user.id, instituteId: session.user.instituteId },
          select: { id: true }
        })
      : null,
    session.user.role === "STUDENT"
      ? prisma.student.findFirst({
          where: { userId: session.user.id, instituteId: session.user.instituteId },
          select: { id: true }
        })
      : null
  ]);

  if (isFamily && !parent) {
    return NextResponse.json({ message: "This account is not linked to a guardian profile." }, { status: 403 });
  }

  if (session.user.role === "STUDENT" && !student) {
    return NextResponse.json({ message: "This account is not linked to a student profile." }, { status: 403 });
  }

  const subscriptionCount = await prisma.webPushSubscription.count({
    where: {
      instituteId: session.user.instituteId,
      userId: session.user.id,
      isActive: true,
      ...(parent ? { parentId: parent.id } : {}),
      ...(student ? { studentId: student.id } : {})
    }
  });

  if (subscriptionCount === 0) {
    return NextResponse.json({ ok: false, sent: 0, failed: 0, message: "No active web push subscription found for this browser/account." }, { status: 404 });
  }

  const result = await sendWebPushMessages({
    instituteId: session.user.instituteId,
    userId: session.user.id,
    parentId: parent?.id ?? null,
    studentId: student?.id ?? null,
    type: NotificationType.NOTICE,
    title: "EduTap test notification",
    body: "Web push is working on this device.",
    data: {
      actionUrl: student ? "/student/notifications" : "/portal/notifications",
      test: true
    }
  });

  return NextResponse.json({ ok: result.sent > 0, subscriptions: subscriptionCount, ...result });
}
