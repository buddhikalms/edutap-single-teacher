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
import { requireOwnerTeacherId } from "@/lib/single-teacher";

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
    waitingRoom: formData.get("waitingRoom") === "on",
    passcode: formData.get("passcode") === "on",
    joinBeforeHost: formData.get("joinBeforeHost") === "on",
    muteOnEntry: formData.get("muteOnEntry") === "on",
    recording: formData.get("recording") ?? "none",
    hostVideo: formData.get("hostVideo") === "on",
    participantVideo: formData.get("participantVideo") === "on",
    alternativeHosts: formData.get("alternativeHosts"),
    recurring: formData.get("recurring") === "on",
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
  await assertCanManageClass({ instituteId, classGroupId: parsed.classGroupId, userId, role, branchId });
  const teacherId = await requireOwnerTeacherId(instituteId);
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
            userId,
            title: parsed.title,
            description: parsed.description,
            startTime,
            durationMinutes: parsed.durationMinutes,
            settings: {
              waitingRoom: parsed.waitingRoom,
              passcode: parsed.passcode,
              joinBeforeHost: parsed.joinBeforeHost,
              muteOnEntry: parsed.muteOnEntry,
              recording: parsed.recording,
              hostVideo: parsed.hostVideo,
              participantVideo: parsed.participantVideo,
              alternativeHosts: parsed.alternativeHosts,
              recurring: parsed.recurring
            }
          })
        : externalUrlForProvider(parsed.meetingProvider, parsed.externalUrl ?? "");

  return {
    instituteId,
    userId,
    data: {
      title: parsed.title,
      description: parsed.description ?? null,
      classGroupId: parsed.classGroupId,
      courseId: parsed.courseId ?? null,
      teacherId,
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
    },
    zoomMeetingData:
      parsed.meetingProvider === "ZOOM_AUTO" && meeting.meetingId
        ? {
            userId,
            classGroupId: parsed.classGroupId,
            zoomMeetingId: meeting.meetingId,
            topic: parsed.title,
            joinUrl: meeting.joinUrl ?? meeting.meetingUrl,
            startUrl: meeting.startUrl ?? null,
            password: meeting.meetingPassword ?? null,
            status: "scheduled",
            scheduledTime: startTime,
            durationMinutes: parsed.durationMinutes
          }
        : null
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
  if (input.zoomMeetingData) {
    const connection = await prisma.zoomConnection.findUnique({ where: { userId: input.userId }, select: { id: true } });
    await prisma.zoomMeeting.create({
      data: {
        ...input.zoomMeetingData,
        liveClassId: liveClass.id,
        zoomConnectionId: connection?.id
      }
    });
  }

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
  if (input.zoomMeetingData) {
    const connection = await prisma.zoomConnection.findUnique({ where: { userId: input.userId }, select: { id: true } });
    await prisma.zoomMeeting.upsert({
      where: { liveClassId },
      create: {
        ...input.zoomMeetingData,
        liveClassId,
        zoomConnectionId: connection?.id
      },
      update: {
        ...input.zoomMeetingData,
        zoomConnectionId: connection?.id
      }
    });
  }

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

export async function deleteLiveClassAction(liveClassId: string) {
  const { instituteId } = await getTenantContext();
  await assertLiveClass(instituteId, liveClassId);
  await prisma.liveClass.delete({ where: { id: liveClassId } });
  revalidatePath("/live-classes");
  redirect("/live-classes?deleted=live-class");
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

export async function publishImportedZoomRecordingAction(liveClassId: string) {
  const { instituteId, userId } = await getTenantContext();
  const liveClass = await prisma.liveClass.findFirst({
    where: { id: liveClassId, instituteId },
    include: { zoomMeeting: true }
  });

  if (!liveClass?.zoomMeeting?.recordingUrl) {
    throw new Error("No imported Zoom recording is available for this live class.");
  }
  const recordingUrl = liveClass.zoomMeeting.recordingUrl;

  await prisma.$transaction(async (tx) => {
    const material = await tx.courseMaterial.create({
      data: {
        title: `${liveClass.title} recording`,
        description: `Zoom recording for ${liveClass.title}`,
        type: "VIDEO",
        url: recordingUrl,
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
        title: `${liveClass.title} recording`,
        description: "Imported from Zoom.",
        recordingUrl,
        accessType: "FREE",
        price: 0,
        materialId: material.id
      }
    });

    await tx.liveClass.update({
      where: { id: liveClassId },
      data: {
        recordingUrl,
        status: "COMPLETED"
      }
    });
  });

  revalidatePath("/live-classes");
  revalidatePath(`/live-classes/${liveClassId}`);
  redirect(`/live-classes/${liveClassId}?recording=published`);
}

export async function deleteImportedZoomRecordingAction(liveClassId: string) {
  const { instituteId } = await getTenantContext();
  await assertLiveClass(instituteId, liveClassId);
  await prisma.zoomMeeting.updateMany({
    where: { liveClassId },
    data: {
      recordingImported: false,
      recordingUrl: null,
      recordingMetadata: Prisma.JsonNull
    }
  });

  revalidatePath(`/live-classes/${liveClassId}`);
  redirect(`/live-classes/${liveClassId}?recording=deleted`);
}
