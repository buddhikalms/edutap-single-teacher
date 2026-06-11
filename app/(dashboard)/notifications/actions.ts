"use server";

import { revalidatePath } from "next/cache";
import { NotificationChannel, NotificationType, NoticeAudience } from "@prisma/client";
import { createNoticeWithNotifications } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { actionError, getTenantContext, type ActionState } from "@/lib/session";
import { noticeSchema, type NoticeInput } from "@/lib/validations";

export async function createNotice(input: NoticeInput): Promise<ActionState> {
  try {
    const { instituteId, userId } = await getTenantContext();
    const parsed = noticeSchema.parse(input);

    if (parsed.audience === "CLASS" && !parsed.classGroupId) {
      return { ok: false, message: "Select a class for class notices." };
    }

    if (parsed.audience === "STUDENTS" && parsed.studentIds.length === 0) {
      return { ok: false, message: "Select at least one student." };
    }

    if (parsed.classGroupId) {
      const classGroup = await prisma.classGroup.findFirst({
        where: { id: parsed.classGroupId, instituteId },
        select: { id: true }
      });

      if (!classGroup) {
        return { ok: false, message: "Selected class is invalid." };
      }
    }

    if (parsed.studentIds.length > 0) {
      const count = await prisma.student.count({ where: { id: { in: parsed.studentIds }, instituteId } });
      if (count !== parsed.studentIds.length) {
        return { ok: false, message: "One or more students are outside this institute." };
      }
    }

    await createNoticeWithNotifications({
      instituteId,
      createdById: userId,
      title: parsed.title,
      body: parsed.body,
      audience: parsed.audience as NoticeAudience,
      type: parsed.type as NotificationType,
      channel: parsed.channel as NotificationChannel,
      classGroupId: parsed.classGroupId,
      studentIds: parsed.studentIds
    });

    revalidatePath("/notifications");
    revalidatePath("/portal");
    revalidatePath("/portal/notices");
    return { ok: true, message: "Notice and notification logs created." };
  } catch (error) {
    return actionError(error, "Could not create notice.");
  }
}
