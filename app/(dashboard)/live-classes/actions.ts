"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { LiveClassStatus, Prisma } from "@prisma/client";
import { assertCanManageClass, parseDateTime } from "@/lib/learning";
import { createAutoMeeting, externalUrlForProvider, isAutoMeetingProvider, providerFromMeetingProvider } from "@/lib/live-meeting-providers";
import { liveClassWindow } from "@/lib/live-classes";
import { prisma } from "@/lib/prisma";
import { actionError, getTenantContext, type ActionState } from "@/lib/session";
import { liveClassRecordingSchema, liveClassSchema } from "@/lib/validations";

function liveClassInput(formData: FormData) {
  return liveClassSchema.parse({
    title: formData.get("title"),
    description: formData.get("description"),
    classGroupId: formData.get("classGroupId"),
    courseId: formData.get("courseId"),
    teacherId: formData.get("teacherId"),
    meetingProvider: formData.get("meetingProvider"),
    externalUrl: formData.get("externalUrl"),
    startTime: formData.get("startTime"),
    durationMinutes: formData.get("durationMinutes"),
    accessType: formData.get("accessType"),
    price: formData.get("price"),
    status: formData.get("status"),
    recordingEnabled: formData.get("recordingEnabled") === "on",
    studentIds: formData.getAll("studentIds").map(String)
  });
}

async function assertLiveClass(instituteId: string, liveClassId: string) {
  const liveClass = await prisma.liveClass.findFirst({
    where: { id: liveClassId, instituteId },
    include: { classGroup: { include: { teacher: true } } }
  });

  if (!liveClass) {
    throw new Error("Live class was not found.");
  }

  return liveClass;
}

async function assertStudents(instituteId: string, classGroupId: string, studentIds: string[]) {
  if (!studentIds.length) return;

  const count = await prisma.student.count({
    where: {
      id: { in: studentIds },
      instituteId,
      enrollments: { some: { classGroupId, active: true } }
    }
  });

  if (count !== studentIds.length) {
    throw new Error("Selected students must be active members of the selected class.");
  }
}

type ExistingMeeting = Awaited<ReturnType<typeof assertLiveClass>>;

async function liveClassData(formData: FormData, existing?: ExistingMeeting) {
  const { instituteId, userId, role, branchId } = await getTenantContext();
  const parsed = liveClassInput(formData);
  const classGroup = await assertCanManageClass({ instituteId, classGroupId: parsed.classGroupId, userId, role, branchId });
  await assertStudents(instituteId, parsed.classGroupId, parsed.studentIds);

  if (parsed.teacherId) {
    const teacher = await prisma.teacher.findFirst({ where: { id: parsed.teacherId, instituteId }, select: { id: true } });
    if (!teacher) throw new Error("Teacher was not found.");
  }

  if (parsed.courseId) {
    const course = await prisma.course.findFirst({ where: { id: parsed.courseId, instituteId }, select: { id: true } });
    if (!course) throw new Error("Course was not found.");
  }

  const startTime = parseDateTime(parsed.startTime);
  const endTime = liveClassWindow({ startTime, durationMinutes: parsed.durationMinutes });
  const meeting =
    isAutoMeetingProvider(parsed.meetingProvider) && existing?.meetingProvider === parsed.meetingProvider && (existing.joinUrl ?? existing.meetingUrl)
      ? {
          provider: providerFromMeetingProvider(parsed.meetingProvider),
          meetingUrl: existing.meetingUrl,
          externalUrl: existing.externalUrl,
          meetingId: existing.meetingId,
          joinUrl: existing.joinUrl,
          startUrl: existing.startUrl,
          meetingPassword: existing.meetingPassword,
          calendarEventId: existing.calendarEventId,
          providerResponse: existing.providerResponse as Prisma.InputJsonValue | undefined
        }
      : isAutoMeetingProvider(parsed.meetingProvider)
        ? await createAutoMeeting(parsed.meetingProvider, {
            instituteId,
            title: parsed.title,
            description: parsed.description,
            startTime,
            durationMinutes: parsed.durationMinutes
          })
        : externalUrlForProvider(parsed.meetingProvider, parsed.externalUrl ?? "");

  return {
    instituteId,
    userId,
    data: {
      title: parsed.title,
      description: parsed.description ?? null,
      classGroupId: parsed.classGroupId,
      courseId: parsed.courseId ?? classGroup.courseId,
      teacherId: parsed.teacherId ?? classGroup.teacherId,
      provider: meeting.provider,
      meetingProvider: parsed.meetingProvider,
      meetingUrl: meeting.meetingUrl,
      externalUrl: meeting.externalUrl ?? null,
      meetingId: meeting.meetingId ?? null,
      joinUrl: meeting.joinUrl ?? meeting.meetingUrl,
      startUrl: meeting.startUrl ?? null,
      meetingPassword: meeting.meetingPassword ?? null,
      calendarEventId: meeting.calendarEventId ?? null,
      providerResponse: (meeting.providerResponse ?? {}) as Prisma.InputJsonValue,
      startTime,
      endTime,
      durationMinutes: parsed.durationMinutes,
      accessType: parsed.accessType,
      price: parsed.accessType === "PAID" ? parsed.price : 0,
      status: parsed.status,
      recordingEnabled: parsed.recordingEnabled,
      targetStudentIds: parsed.studentIds
    }
  };
}

export async function createLiveClassAction(formData: FormData) {
  const input = await liveClassData(formData);
  const liveClass = await prisma.liveClass.create({
    data: {
      ...input.data,
      instituteId: input.instituteId,
      createdById: input.userId
    }
  });

  revalidatePath("/live-classes");
  redirect(`/live-classes/${liveClass.id}`);
}

export async function updateLiveClassAction(liveClassId: string, formData: FormData) {
  const { instituteId } = await getTenantContext();
  const existing = await assertLiveClass(instituteId, liveClassId);
  const input = await liveClassData(formData, existing);
  await prisma.liveClass.update({
    where: { id: liveClassId },
    data: input.data
  });

  revalidatePath("/live-classes");
  revalidatePath(`/live-classes/${liveClassId}`);
  redirect(`/live-classes/${liveClassId}`);
}

export async function setLiveClassStatus(liveClassId: string, status: LiveClassStatus): Promise<ActionState> {
  try {
    const { instituteId } = await getTenantContext();
    await assertLiveClass(instituteId, liveClassId);
    await prisma.liveClass.update({ where: { id: liveClassId }, data: { status } });
    revalidatePath("/live-classes");
    revalidatePath(`/live-classes/${liveClassId}`);
    return { ok: true, message: "Live class updated." };
  } catch (error) {
    return actionError(error, "Could not update live class.");
  }
}

export async function addLiveClassRecording(liveClassId: string, formData: FormData) {
  const { instituteId, userId } = await getTenantContext();
  const parsed = liveClassRecordingSchema.parse({
    title: formData.get("title"),
    description: formData.get("description"),
    recordingUrl: formData.get("recordingUrl"),
    accessType: formData.get("accessType"),
    price: formData.get("price")
  });
  const liveClass = await assertLiveClass(instituteId, liveClassId);

  await prisma.$transaction(async (tx) => {
    const material = await tx.courseMaterial.create({
      data: {
        title: parsed.title,
        description: parsed.description ?? `Recording for ${liveClass.title}`,
        type: "VIDEO",
        url: parsed.recordingUrl,
        instituteId,
        classGroupId: liveClass.classGroupId,
        courseId: liveClass.courseId,
        createdById: userId
      }
    });

    await tx.liveClassRecording.create({
      data: {
        instituteId,
        liveClassId,
        courseId: liveClass.courseId,
        classGroupId: liveClass.classGroupId,
        title: parsed.title,
        description: parsed.description ?? null,
        recordingUrl: parsed.recordingUrl,
        accessType: parsed.accessType,
        price: parsed.accessType === "PAID" ? parsed.price : 0,
        materialId: material.id
      }
    });

    await tx.liveClass.update({
      where: { id: liveClassId },
      data: {
        recordingUrl: parsed.recordingUrl,
        status: "COMPLETED"
      }
    });
  });

  revalidatePath("/live-classes");
  revalidatePath(`/live-classes/${liveClassId}`);
  redirect(`/live-classes/${liveClassId}`);
}
